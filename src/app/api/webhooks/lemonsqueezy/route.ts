import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for webhook endpoint
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

// Create Supabase client with service role for server-side operations
// Note: You should use SUPABASE_SERVICE_ROLE_KEY for webhook handlers
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error('Webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Map Lemon Squeezy status to our status
function mapStatus(lsStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'on_trial': 'active',
    'paused': 'paused',
    'past_due': 'past_due',
    'unpaid': 'past_due',
    'cancelled': 'cancelled',
    'expired': 'expired',
  };
  return statusMap[lsStatus] || 'inactive';
}

// Map product ID to plan type
function mapPlanType(productId: string): string {
  const monthlyProductId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_MONTHLY;
  const yearlyProductId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_YEARLY;

  if (productId === monthlyProductId) return 'pro';
  if (productId === yearlyProductId) return 'annual';
  return 'pro';
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');

    // Verify signature
    if (!signature || !verifySignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const data = payload.data;
    const customData = payload.meta.custom_data || {};
    const userId = customData.user_id;

    console.log(`Processing Lemon Squeezy webhook: ${eventName}`);

    // Handle different event types
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated': {
        const attrs = data.attributes;

        const subscriptionData = {
          user_id: userId,
          user_email: attrs.user_email || customData.user_email,
          lemon_squeezy_customer_id: attrs.customer_id?.toString(),
          lemon_squeezy_subscription_id: data.id,
          lemon_squeezy_order_id: attrs.order_id?.toString(),
          lemon_squeezy_product_id: attrs.product_id?.toString(),
          lemon_squeezy_variant_id: attrs.variant_id?.toString(),
          status: mapStatus(attrs.status),
          plan_type: mapPlanType(attrs.product_id?.toString()),
          billing_anchor: attrs.billing_anchor,
          current_period_start: attrs.current_period_start,
          current_period_end: attrs.current_period_end,
          trial_ends_at: attrs.trial_ends_at,
          renews_at: attrs.renews_at,
          ends_at: attrs.ends_at,
          update_payment_method_url: attrs.urls?.update_payment_method,
          customer_portal_url: attrs.urls?.customer_portal,
        };

        if (userId) {
          // Upsert subscription
          const { error } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'user_id',
            });

          if (error) {
            console.error('Error upserting subscription:', error);
          } else {
            console.log(`Subscription ${eventName} for user ${userId}`);
          }
        } else {
          // If no user_id in custom data, try to find by subscription ID
          const { error } = await supabase
            .from('subscriptions')
            .update(subscriptionData)
            .eq('lemon_squeezy_subscription_id', data.id);

          if (error) {
            console.error('Error updating subscription:', error);
          }
        }
        break;
      }

      case 'subscription_cancelled': {
        const attrs = data.attributes;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            ends_at: attrs.ends_at,
          })
          .eq('lemon_squeezy_subscription_id', data.id);

        if (error) {
          console.error('Error cancelling subscription:', error);
        } else {
          console.log(`Subscription cancelled: ${data.id}`);
        }
        break;
      }

      case 'subscription_resumed': {
        const attrs = data.attributes;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: mapStatus(attrs.status),
            ends_at: null,
            renews_at: attrs.renews_at,
          })
          .eq('lemon_squeezy_subscription_id', data.id);

        if (error) {
          console.error('Error resuming subscription:', error);
        } else {
          console.log(`Subscription resumed: ${data.id}`);
        }
        break;
      }

      case 'subscription_expired': {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            plan_type: 'free',
          })
          .eq('lemon_squeezy_subscription_id', data.id);

        if (error) {
          console.error('Error expiring subscription:', error);
        } else {
          console.log(`Subscription expired: ${data.id}`);
        }
        break;
      }

      case 'subscription_payment_success': {
        console.log(`Payment successful for subscription: ${data.id}`);
        // Payment success - subscription should already be active
        break;
      }

      case 'subscription_payment_failed': {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('lemon_squeezy_subscription_id', data.id);

        if (error) {
          console.error('Error updating failed payment:', error);
        } else {
          console.log(`Payment failed for subscription: ${data.id}`);
        }
        break;
      }

      case 'order_created': {
        // One-time order (if you have any)
        console.log('Order created:', data.id);
        break;
      }

      default:
        console.log(`Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
