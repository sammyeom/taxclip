import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for webhook endpoint
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

// Create Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log environment variable status on initialization
console.log('[Webhook Init] SUPABASE_URL exists:', !!supabaseUrl);
console.log('[Webhook Init] SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);
console.log('[Webhook Init] WEBHOOK_SECRET exists:', !!WEBHOOK_SECRET);

if (!supabaseServiceKey) {
  console.error('[Webhook Init] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set! Using anon key instead.');
}

// Use service role key for bypassing RLS
const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error('[Webhook] Webhook secret not configured');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');

    console.log('[Webhook] Signature verification:');
    console.log('[Webhook] - Received signature:', signature);
    console.log('[Webhook] - Computed digest:', digest);

    // Handle different length signatures gracefully
    if (signature.length !== digest.length) {
      console.error('[Webhook] Signature length mismatch');
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
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

  console.log('[Webhook] Product ID mapping:');
  console.log('[Webhook] - Received product_id:', productId);
  console.log('[Webhook] - Monthly product_id:', monthlyProductId);
  console.log('[Webhook] - Yearly product_id:', yearlyProductId);

  if (productId === monthlyProductId) return 'pro';
  if (productId === yearlyProductId) return 'annual';
  return 'pro';
}

// Helper function to update user_settings with subscription info
async function updateUserSettings(userId: string, subscriptionData: {
  status: string;
  plan_type: string;
  ends_at?: string | null;
  lemon_squeezy_customer_id?: string | null;
  lemon_squeezy_subscription_id?: string | null;
}) {
  console.log('[Webhook] Updating user_settings for user:', userId);

  const { data, error } = await supabase
    .from('user_settings')
    .update({
      subscription_status: subscriptionData.status,
      subscription_plan: subscriptionData.plan_type,
      subscription_ends_at: subscriptionData.ends_at,
      lemon_squeezy_customer_id: subscriptionData.lemon_squeezy_customer_id,
      lemon_squeezy_subscription_id: subscriptionData.lemon_squeezy_subscription_id,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('[Webhook] Error updating user_settings:', error);
  } else {
    console.log('[Webhook] Successfully updated user_settings:', data);
  }

  return { data, error };
}

// GET handler for testing the route is accessible
export async function GET() {
  console.log('[Webhook] GET request received - route is accessible');
  return NextResponse.json({
    status: 'ok',
    message: 'Lemon Squeezy webhook endpoint is active',
    timestamp: new Date().toISOString(),
    config: {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      webhookSecret: !!WEBHOOK_SECRET,
    }
  });
}

export async function POST(request: NextRequest) {
  console.log('[Webhook] ========== POST request received ==========');
  console.log('[Webhook] Time:', new Date().toISOString());

  try {
    const rawBody = await request.text();
    console.log('[Webhook] Raw body length:', rawBody.length);
    console.log('[Webhook] Raw body preview:', rawBody.substring(0, 1000));

    const signature = request.headers.get('x-signature');
    console.log('[Webhook] X-Signature header:', signature);

    // Verify signature
    if (!signature) {
      console.error('[Webhook] ERROR: No signature header provided');
      return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
    }

    if (!verifySignature(rawBody, signature)) {
      console.error('[Webhook] ERROR: Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('[Webhook] Signature verified successfully');

    const payload = JSON.parse(rawBody);

    const eventName = payload.meta?.event_name;
    const data = payload.data;

    // Lemon Squeezy sends custom_data in meta.custom_data
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;
    const userEmail = customData.user_email || data?.attributes?.user_email;

    console.log('[Webhook] ===== PARSED DATA =====');
    console.log('[Webhook] Event name:', eventName);
    console.log('[Webhook] Full meta object:', JSON.stringify(payload.meta, null, 2));
    console.log('[Webhook] Custom data:', JSON.stringify(customData));
    console.log('[Webhook] User ID from custom_data:', userId);
    console.log('[Webhook] User email:', userEmail);
    console.log('[Webhook] Data ID:', data?.id);

    if (!eventName) {
      console.error('[Webhook] ERROR: No event_name in payload');
      return NextResponse.json({ error: 'Invalid payload: missing event_name' }, { status: 400 });
    }

    // Handle different event types
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated': {
        const attrs = data.attributes;

        console.log('[Webhook] Processing subscription_created/updated');
        console.log('[Webhook] Attributes:', JSON.stringify(attrs, null, 2));

        const status = mapStatus(attrs?.status || 'inactive');
        const planType = mapPlanType(attrs?.product_id?.toString() || '');

        const subscriptionData = {
          user_id: userId,
          user_email: attrs?.user_email || userEmail,
          lemon_squeezy_customer_id: attrs?.customer_id?.toString(),
          lemon_squeezy_subscription_id: data.id?.toString(),
          lemon_squeezy_order_id: attrs?.order_id?.toString(),
          lemon_squeezy_product_id: attrs?.product_id?.toString(),
          lemon_squeezy_variant_id: attrs?.variant_id?.toString(),
          status: status,
          plan_type: planType,
          billing_anchor: attrs?.billing_anchor,
          current_period_start: attrs?.current_period_start,
          current_period_end: attrs?.current_period_end,
          trial_ends_at: attrs?.trial_ends_at,
          renews_at: attrs?.renews_at,
          ends_at: attrs?.ends_at,
          update_payment_method_url: attrs?.urls?.update_payment_method,
          customer_portal_url: attrs?.urls?.customer_portal,
        };

        console.log('[Webhook] Subscription data to save:', JSON.stringify(subscriptionData, null, 2));

        if (!userId) {
          console.error('[Webhook] ERROR: No user_id in custom_data!');
          console.log('[Webhook] This means the checkout URL did not include user_id parameter.');
          console.log('[Webhook] Make sure checkout URL includes: ?checkout[custom][user_id]=USER_ID');

          // Still return 200 to prevent retries, but log the issue
          return NextResponse.json({
            received: true,
            warning: 'No user_id provided in custom_data. Subscription not saved.',
            event: eventName
          });
        }

        // 1. Upsert to subscriptions table
        console.log('[Webhook] Upserting to subscriptions table...');
        const { data: upsertData, error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'user_id',
          })
          .select();

        if (upsertError) {
          console.error('[Webhook] ERROR upserting to subscriptions:', upsertError);
          console.error('[Webhook] Error code:', upsertError.code);
          console.error('[Webhook] Error message:', upsertError.message);
          console.error('[Webhook] Error details:', upsertError.details);
          console.error('[Webhook] Error hint:', upsertError.hint);
        } else {
          console.log('[Webhook] Successfully upserted to subscriptions:', upsertData);
        }

        // 2. Also update user_settings table
        await updateUserSettings(userId, {
          status: status,
          plan_type: planType,
          ends_at: attrs?.ends_at,
          lemon_squeezy_customer_id: attrs?.customer_id?.toString(),
          lemon_squeezy_subscription_id: data.id?.toString(),
        });

        break;
      }

      case 'subscription_cancelled': {
        const attrs = data.attributes;
        console.log('[Webhook] Processing subscription_cancelled');

        // Update subscriptions table
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            ends_at: attrs?.ends_at,
          })
          .eq('lemon_squeezy_subscription_id', data.id?.toString());

        if (error) {
          console.error('[Webhook] ERROR cancelling subscription:', error);
        } else {
          console.log('[Webhook] Subscription cancelled:', data.id);
        }

        // Also update user_settings if we can find the user
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('lemon_squeezy_subscription_id', data.id?.toString())
          .single();

        if (subData?.user_id) {
          await updateUserSettings(subData.user_id, {
            status: 'cancelled',
            plan_type: 'free',
            ends_at: attrs?.ends_at,
          });
        }

        break;
      }

      case 'subscription_resumed': {
        const attrs = data.attributes;
        console.log('[Webhook] Processing subscription_resumed');

        const status = mapStatus(attrs?.status || 'active');

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: status,
            ends_at: null,
            renews_at: attrs?.renews_at,
          })
          .eq('lemon_squeezy_subscription_id', data.id?.toString());

        if (error) {
          console.error('[Webhook] ERROR resuming subscription:', error);
        } else {
          console.log('[Webhook] Subscription resumed:', data.id);
        }

        // Also update user_settings
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_type')
          .eq('lemon_squeezy_subscription_id', data.id?.toString())
          .single();

        if (subData?.user_id) {
          await updateUserSettings(subData.user_id, {
            status: status,
            plan_type: subData.plan_type || 'pro',
            ends_at: null,
          });
        }

        break;
      }

      case 'subscription_expired': {
        console.log('[Webhook] Processing subscription_expired');

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            plan_type: 'free',
          })
          .eq('lemon_squeezy_subscription_id', data.id?.toString());

        if (error) {
          console.error('[Webhook] ERROR expiring subscription:', error);
        } else {
          console.log('[Webhook] Subscription expired:', data.id);
        }

        // Also update user_settings
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('lemon_squeezy_subscription_id', data.id?.toString())
          .single();

        if (subData?.user_id) {
          await updateUserSettings(subData.user_id, {
            status: 'expired',
            plan_type: 'free',
          });
        }

        break;
      }

      case 'subscription_payment_success': {
        console.log('[Webhook] Payment successful for subscription:', data.id);
        break;
      }

      case 'subscription_payment_failed': {
        console.log('[Webhook] Processing subscription_payment_failed');

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('lemon_squeezy_subscription_id', data.id?.toString());

        if (error) {
          console.error('[Webhook] ERROR updating failed payment:', error);
        } else {
          console.log('[Webhook] Payment failed for subscription:', data.id);
        }

        // Also update user_settings
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_type')
          .eq('lemon_squeezy_subscription_id', data.id?.toString())
          .single();

        if (subData?.user_id) {
          await updateUserSettings(subData.user_id, {
            status: 'past_due',
            plan_type: subData.plan_type || 'pro',
          });
        }

        break;
      }

      case 'order_created': {
        console.log('[Webhook] Order created:', data.id);
        break;
      }

      default:
        console.log('[Webhook] Unhandled event:', eventName);
    }

    console.log('[Webhook] ========== Webhook processed successfully ==========');
    return NextResponse.json({ received: true, event: eventName });
  } catch (error) {
    console.error('[Webhook] ========== FATAL ERROR ==========');
    console.error('[Webhook] Error:', error);
    console.error('[Webhook] Error message:', (error as Error).message);
    console.error('[Webhook] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
