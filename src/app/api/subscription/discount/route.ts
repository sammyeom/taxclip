import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;

// Discounted variant IDs (50% off for 3 months)
// You need to create these variants in LemonSqueezy with discounted pricing
const DISCOUNTED_MONTHLY_VARIANT = process.env.LEMON_SQUEEZY_DISCOUNTED_MONTHLY_VARIANT;
const ORIGINAL_MONTHLY_VARIANT = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_MONTHLY;

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/subscription/discount
 * Apply 50% discount for 3 months to retain customer
 *
 * Approach: Track discount in Supabase and optionally switch to discounted variant
 * After 3 months, webhook or cron job switches back to regular pricing
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

    // Check if already has active discount
    if (subscription.discount_percentage && subscription.discount_end_date) {
      const discountEndDate = new Date(subscription.discount_end_date);
      if (discountEndDate > new Date()) {
        return NextResponse.json(
          { error: 'You already have an active discount' },
          { status: 400 }
        );
      }
    }

    // Calculate discount end date (3 months from now)
    const discountEndDate = new Date();
    discountEndDate.setMonth(discountEndDate.getMonth() + 3);

    console.log(`[Discount] Applying 50% discount for user ${user.id} until ${discountEndDate.toISOString()}`);

    // If discounted variant exists, switch to it
    if (DISCOUNTED_MONTHLY_VARIANT && subscription.plan_type !== 'annual' && subscription.plan_type !== 'pro_annual') {
      try {
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
                  variant_id: parseInt(DISCOUNTED_MONTHLY_VARIANT),
                  invoice_immediately: false, // Apply from next billing
                },
              },
            }),
          }
        );

        if (!response.ok) {
          console.log('[Discount] Could not switch to discounted variant, tracking locally only');
        } else {
          console.log('[Discount] Switched to discounted variant');
        }
      } catch (error) {
        console.log('[Discount] Error switching variant, tracking locally:', error);
      }
    }

    // Always track the discount in Supabase
    // This allows us to display discount info and revert after 3 months
    const originalPrice = subscription.plan_type === 'annual' || subscription.plan_type === 'pro_annual'
      ? 99
      : 9.99;
    const discountedPrice = originalPrice * 0.5;

    await supabase
      .from('subscriptions')
      .update({
        discount_percentage: 50,
        discount_start_date: new Date().toISOString(),
        discount_end_date: discountEndDate.toISOString(),
        discount_reason: 'retention_offer',
        original_price: originalPrice,
        discounted_price: discountedPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: '50% discount applied for 3 months!',
      discount: {
        percentage: 50,
        originalPrice,
        discountedPrice,
        startDate: new Date().toISOString(),
        endDate: discountEndDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Discount] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscription/discount
 * Remove discount (revert to original pricing)
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

    const lemonSqueezySubscriptionId = subscription.lemon_squeezy_subscription_id;

    // If we switched to discounted variant, switch back to original
    if (lemonSqueezySubscriptionId && ORIGINAL_MONTHLY_VARIANT &&
        (subscription.plan_type === 'pro' || subscription.plan_type === 'pro_monthly')) {
      try {
        await fetch(
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
                  variant_id: parseInt(ORIGINAL_MONTHLY_VARIANT),
                  invoice_immediately: false,
                },
              },
            }),
          }
        );
      } catch (error) {
        console.log('[Discount Removal] Error reverting variant:', error);
      }
    }

    // Clear discount from Supabase
    await supabase
      .from('subscriptions')
      .update({
        discount_percentage: null,
        discount_start_date: null,
        discount_end_date: null,
        discount_reason: null,
        original_price: null,
        discounted_price: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Discount removed',
    });
  } catch (error) {
    console.error('[Discount Removal] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
