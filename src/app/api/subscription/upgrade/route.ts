import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSubscriptionEvent } from '@/lib/subscriptionHistory';

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const PRODUCT_YEARLY = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_YEARLY;

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/subscription/upgrade
 * Upgrade from monthly to annual subscription with proration
 *
 * LemonSqueezy handles proration automatically:
 * - Calculates remaining credit from current monthly subscription
 * - Applies credit to annual subscription
 * - Charges the difference immediately
 * - Annual subscription starts immediately
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

    // Check if user has a LemonSqueezy subscription ID
    const lemonSqueezySubscriptionId = subscription.lemon_squeezy_subscription_id;
    if (!lemonSqueezySubscriptionId) {
      return NextResponse.json(
        { error: 'No LemonSqueezy subscription found. This may be a mobile subscription.' },
        { status: 400 }
      );
    }

    // Check if already on annual plan
    if (subscription.plan_type === 'annual' || subscription.plan_type === 'pro_annual') {
      return NextResponse.json(
        { error: 'Already on annual plan' },
        { status: 400 }
      );
    }

    // Verify we have the yearly variant ID
    if (!PRODUCT_YEARLY) {
      return NextResponse.json(
        { error: 'Yearly product not configured' },
        { status: 500 }
      );
    }

    console.log(`[Upgrade] Upgrading subscription ${lemonSqueezySubscriptionId} to annual for user ${user.id}`);

    // Call LemonSqueezy API to update subscription
    // This will change the variant (plan) with proration
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${lemonSqueezySubscriptionId}`,
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
            id: lemonSqueezySubscriptionId,
            attributes: {
              // Change to annual variant
              variant_id: parseInt(PRODUCT_YEARLY),
              // Invoice immediately with proration
              // LemonSqueezy will calculate remaining credit from monthly
              // and charge the difference for annual
              invoice_immediately: true,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Upgrade] LemonSqueezy API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to upgrade subscription', details: errorData },
        { status: 500 }
      );
    }

    const updatedSubscription = await response.json();
    console.log('[Upgrade] Subscription updated successfully:', updatedSubscription.data.id);

    // The webhook will handle updating Supabase with the new subscription details
    // But we can also update immediately for better UX
    const attrs = updatedSubscription.data.attributes;

    await supabase
      .from('subscriptions')
      .update({
        plan_type: 'annual',
        interval: 'year',
        status: attrs.status,
        current_period_start: attrs.current_period_start,
        current_period_end: attrs.current_period_end,
        renews_at: attrs.renews_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Also update user_settings
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        subscription_status: 'active',
        subscription_plan: 'pro_annual',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Log to subscription history
    await logSubscriptionEvent({
      userId: user.id,
      eventType: 'upgraded',
      description: 'Upgraded from Monthly to Annual plan. Remaining credit applied.',
      fromPlan: subscription.plan_type,
      toPlan: 'annual',
      amount: 99,
      metadata: {
        previous_plan: subscription.plan_type,
        new_period_end: attrs.current_period_end,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription upgraded to annual successfully',
      subscription: {
        id: updatedSubscription.data.id,
        status: attrs.status,
        plan_type: 'annual',
        current_period_end: attrs.current_period_end,
        renews_at: attrs.renews_at,
      },
    });
  } catch (error) {
    console.error('[Upgrade] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
