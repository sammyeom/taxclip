import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSubscriptionEvent } from '@/lib/subscriptionHistory';

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const PRODUCT_MONTHLY = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_MONTHLY;

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/subscription/downgrade
 * Schedule a downgrade from Annual to Monthly
 *
 * Policy:
 * - Annual plan continues until the end of the current period
 * - No refund or credit for unused time
 * - Monthly billing ($9.99/mo) starts automatically after Annual period ends
 *
 * Implementation:
 * - We track the scheduled downgrade in Supabase
 * - At the end of the Annual period, LemonSqueezy webhook or cron job
 *   will switch the subscription to Monthly variant
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current subscription from Supabase
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Check if user is on annual plan
    const isAnnual = subscription.plan_type === 'annual' || subscription.plan_type === 'pro_annual';
    if (!isAnnual) {
      return NextResponse.json(
        { error: 'Not on annual plan' },
        { status: 400 }
      );
    }

    // Check if user has a LemonSqueezy subscription ID
    const lemonSqueezySubscriptionId = subscription.lemon_squeezy_subscription_id;
    if (!lemonSqueezySubscriptionId) {
      return NextResponse.json(
        { error: 'Mobile subscription - please manage through the App Store or Google Play' },
        { status: 400 }
      );
    }

    // Check if already scheduled for downgrade
    if (subscription.scheduled_downgrade_to === 'monthly') {
      return NextResponse.json(
        { error: 'Downgrade to Monthly already scheduled' },
        { status: 400 }
      );
    }

    const periodEnd = subscription.current_period_end || subscription.ends_at;
    if (!periodEnd) {
      return NextResponse.json(
        { error: 'Cannot determine subscription period end date' },
        { status: 400 }
      );
    }

    console.log(`[Downgrade] Scheduling Annual → Monthly downgrade for user ${user.id}`);
    console.log(`[Downgrade] Annual period ends: ${periodEnd}`);

    // Update subscription to track scheduled downgrade
    // The actual variant change will happen via webhook when the period ends
    // Or via a scheduled job that checks for pending downgrades
    await supabase
      .from('subscriptions')
      .update({
        scheduled_downgrade_to: 'monthly',
        scheduled_downgrade_date: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Log to subscription history
    await logSubscriptionEvent({
      userId: user.id,
      eventType: 'downgrade_scheduled',
      description: `Scheduled downgrade from Annual to Monthly. Annual access continues until ${new Date(periodEnd).toLocaleDateString()}. Monthly billing ($9.99/mo) starts after.`,
      fromPlan: subscription.plan_type,
      toPlan: 'monthly_scheduled',
      metadata: {
        annual_ends_at: periodEnd,
        monthly_starts_at: periodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Downgrade to Monthly scheduled successfully',
      downgrade: {
        from: subscription.plan_type,
        to: 'monthly',
        annualEndsAt: periodEnd,
        monthlyStartsAt: periodEnd,
        noRefund: true,
        noCredit: true,
      },
    });
  } catch (error) {
    console.error('[Downgrade] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscription/downgrade
 * Cancel a scheduled downgrade (stay on Annual)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (!subscription.scheduled_downgrade_to) {
      return NextResponse.json(
        { error: 'No scheduled downgrade to cancel' },
        { status: 400 }
      );
    }

    // Clear the scheduled downgrade
    await supabase
      .from('subscriptions')
      .update({
        scheduled_downgrade_to: null,
        scheduled_downgrade_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Log to subscription history
    await logSubscriptionEvent({
      userId: user.id,
      eventType: 'downgrade_cancelled',
      description: 'Cancelled scheduled downgrade. Staying on Annual plan.',
      fromPlan: 'monthly_scheduled',
      toPlan: subscription.plan_type,
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled downgrade cancelled. You will remain on the Annual plan.',
    });
  } catch (error) {
    console.error('[Downgrade Cancel] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * This function should be called by a cron job or webhook
 * to actually perform the variant change when the Annual period ends
 */
export async function processScheduledDowngrades() {
  const now = new Date();

  // Find subscriptions with scheduled downgrades that should be processed
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('scheduled_downgrade_to', 'monthly')
    .lte('scheduled_downgrade_date', now.toISOString());

  if (error || !subscriptions) {
    console.error('[Downgrade Process] Error fetching subscriptions:', error);
    return;
  }

  for (const subscription of subscriptions) {
    if (!subscription.lemon_squeezy_subscription_id || !PRODUCT_MONTHLY) {
      continue;
    }

    try {
      // Call LemonSqueezy API to change variant to Monthly
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemon_squeezy_subscription_id}`,
        {
          method: 'PATCH',
          headers: {
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
          },
          body: JSON.stringify({
            data: {
              type: 'subscriptions',
              id: subscription.lemon_squeezy_subscription_id,
              attributes: {
                variant_id: parseInt(PRODUCT_MONTHLY),
                invoice_immediately: false, // Bill at end of period
              },
            },
          }),
        }
      );

      if (response.ok) {
        // Update Supabase
        await supabase
          .from('subscriptions')
          .update({
            plan_type: 'pro_monthly',
            interval: 'month',
            scheduled_downgrade_to: null,
            scheduled_downgrade_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', subscription.user_id);

        // Log event
        await logSubscriptionEvent({
          userId: subscription.user_id,
          eventType: 'downgraded',
          description: 'Downgrade from Annual to Monthly completed. Now billing $9.99/month.',
          fromPlan: subscription.plan_type,
          toPlan: 'pro_monthly',
          amount: 9.99,
        });

        console.log(`[Downgrade Process] Successfully downgraded user ${subscription.user_id}`);
      }
    } catch (err) {
      console.error(`[Downgrade Process] Error processing user ${subscription.user_id}:`, err);
    }
  }
}
