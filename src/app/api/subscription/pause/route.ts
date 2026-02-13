import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSubscriptionEvent } from '@/lib/subscriptionHistory';

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/subscription/pause
 * Pause subscription for 3 months
 *
 * LemonSqueezy supports pausing subscriptions with a resume date
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

    // Check if already paused
    if (subscription.is_paused || subscription.status === 'paused') {
      return NextResponse.json(
        { error: 'Subscription is already paused' },
        { status: 400 }
      );
    }

    // Calculate resume date (3 months from now)
    const resumeDate = new Date();
    resumeDate.setMonth(resumeDate.getMonth() + 3);

    console.log(`[Pause] Pausing subscription ${lemonSqueezySubscriptionId} for user ${user.id} until ${resumeDate.toISOString()}`);

    // Call LemonSqueezy API to pause subscription
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
              pause: {
                mode: 'free',
                resumes_at: resumeDate.toISOString(),
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Pause] LemonSqueezy API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to pause subscription', details: errorData },
        { status: 500 }
      );
    }

    const updatedSubscription = await response.json();
    console.log('[Pause] Subscription paused successfully:', updatedSubscription.data.id);

    // Update Supabase
    const attrs = updatedSubscription.data.attributes;

    await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        is_paused: true,
        pause_start_date: new Date().toISOString(),
        pause_end_date: resumeDate.toISOString(),
        pause_duration_days: 90,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Log to subscription history
    await logSubscriptionEvent({
      userId: user.id,
      eventType: 'paused',
      description: `Subscription paused for 3 months. Resumes on ${resumeDate.toLocaleDateString()}.`,
      fromPlan: subscription.plan_type,
      toPlan: 'paused',
      metadata: {
        pause_start: new Date().toISOString(),
        pause_end: resumeDate.toISOString(),
        duration_days: 90,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription paused for 3 months',
      resumeDate: resumeDate.toISOString(),
      subscription: {
        id: updatedSubscription.data.id,
        status: attrs.status,
        pause: attrs.pause,
      },
    });
  } catch (error) {
    console.error('[Pause] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscription/pause
 * Resume a paused subscription immediately
 */
export async function DELETE(request: NextRequest) {
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
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const lemonSqueezySubscriptionId = subscription.lemon_squeezy_subscription_id;
    if (!lemonSqueezySubscriptionId) {
      return NextResponse.json(
        { error: 'No LemonSqueezy subscription found' },
        { status: 400 }
      );
    }

    console.log(`[Resume] Resuming subscription ${lemonSqueezySubscriptionId} for user ${user.id}`);

    // Call LemonSqueezy API to unpause subscription
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
              pause: null, // Remove pause to resume
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Resume] LemonSqueezy API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to resume subscription', details: errorData },
        { status: 500 }
      );
    }

    const updatedSubscription = await response.json();
    const attrs = updatedSubscription.data.attributes;

    // Update Supabase
    await supabase
      .from('subscriptions')
      .update({
        status: attrs.status || 'active',
        is_paused: false,
        pause_start_date: null,
        pause_end_date: null,
        pause_duration_days: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Log to subscription history
    await logSubscriptionEvent({
      userId: user.id,
      eventType: 'resumed',
      description: 'Subscription resumed. Billing will continue at $9.99/month.',
      fromPlan: 'paused',
      toPlan: subscription.plan_type,
      amount: 9.99,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
    });
  } catch (error) {
    console.error('[Resume] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
