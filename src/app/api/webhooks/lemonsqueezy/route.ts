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

// Use service role key for bypassing RLS, fallback to anon key
const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  console.log('[Webhook] Headers:', Object.fromEntries(request.headers.entries()));

  try {
    const rawBody = await request.text();
    console.log('[Webhook] Raw body length:', rawBody.length);
    console.log('[Webhook] Raw body preview:', rawBody.substring(0, 500));

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
    console.log('[Webhook] Parsed payload:', JSON.stringify(payload, null, 2));

    const eventName = payload.meta?.event_name;
    const data = payload.data;

    // Lemon Squeezy sends custom_data in meta.custom_data
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;
    const userEmail = customData.user_email;

    console.log('[Webhook] Event name:', eventName);
    console.log('[Webhook] Custom data:', JSON.stringify(customData));
    console.log('[Webhook] User ID from custom_data:', userId);
    console.log('[Webhook] User email from custom_data:', userEmail);
    console.log('[Webhook] Data ID:', data?.id);
    console.log('[Webhook] Data attributes:', JSON.stringify(data?.attributes, null, 2));

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
        console.log('[Webhook] Attributes status:', attrs?.status);
        console.log('[Webhook] Attributes user_email:', attrs?.user_email);
        console.log('[Webhook] Attributes customer_id:', attrs?.customer_id);
        console.log('[Webhook] Attributes product_id:', attrs?.product_id);

        const subscriptionData = {
          user_id: userId,
          user_email: attrs?.user_email || userEmail,
          lemon_squeezy_customer_id: attrs?.customer_id?.toString(),
          lemon_squeezy_subscription_id: data.id?.toString(),
          lemon_squeezy_order_id: attrs?.order_id?.toString(),
          lemon_squeezy_product_id: attrs?.product_id?.toString(),
          lemon_squeezy_variant_id: attrs?.variant_id?.toString(),
          status: mapStatus(attrs?.status || 'inactive'),
          plan_type: mapPlanType(attrs?.product_id?.toString() || ''),
          billing_anchor: attrs?.billing_anchor,
          current_period_start: attrs?.current_period_start,
          current_period_end: attrs?.current_period_end,
          trial_ends_at: attrs?.trial_ends_at,
          renews_at: attrs?.renews_at,
          ends_at: attrs?.ends_at,
          update_payment_method_url: attrs?.urls?.update_payment_method,
          customer_portal_url: attrs?.urls?.customer_portal,
        };

        console.log('[Webhook] Subscription data to upsert:', JSON.stringify(subscriptionData, null, 2));

        if (!userId) {
          console.error('[Webhook] ERROR: No user_id in custom_data');
          console.log('[Webhook] Attempting to update by subscription_id instead');

          // Try to find existing subscription by lemon_squeezy_subscription_id
          const { data: existingData, error: existingError } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('lemon_squeezy_subscription_id', data.id?.toString())
            .single();

          if (existingError) {
            console.error('[Webhook] No existing subscription found:', existingError);
            // Cannot create without user_id
            return NextResponse.json({
              error: 'No user_id provided and no existing subscription found',
              received: true
            });
          }

          // Update existing subscription
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              ...subscriptionData,
              user_id: existingData.user_id, // Keep existing user_id
            })
            .eq('lemon_squeezy_subscription_id', data.id?.toString());

          if (updateError) {
            console.error('[Webhook] ERROR updating subscription:', updateError);
            return NextResponse.json({ error: 'Database update failed', details: updateError }, { status: 500 });
          }

          console.log('[Webhook] Successfully updated existing subscription');
        } else {
          // Upsert subscription with user_id
          console.log('[Webhook] Upserting subscription for user:', userId);

          const { data: upsertData, error: upsertError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'user_id',
            })
            .select();

          if (upsertError) {
            console.error('[Webhook] ERROR upserting subscription:', upsertError);
            console.error('[Webhook] Error code:', upsertError.code);
            console.error('[Webhook] Error message:', upsertError.message);
            console.error('[Webhook] Error details:', upsertError.details);
            return NextResponse.json({ error: 'Database upsert failed', details: upsertError }, { status: 500 });
          }

          console.log('[Webhook] Successfully upserted subscription:', upsertData);
        }
        break;
      }

      case 'subscription_cancelled': {
        const attrs = data.attributes;
        console.log('[Webhook] Processing subscription_cancelled');

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            ends_at: attrs?.ends_at,
          })
          .eq('lemon_squeezy_subscription_id', data.id?.toString());

        if (error) {
          console.error('[Webhook] ERROR cancelling subscription:', error);
          return NextResponse.json({ error: 'Database update failed', details: error }, { status: 500 });
        }
        console.log('[Webhook] Subscription cancelled:', data.id);
        break;
      }

      case 'subscription_resumed': {
        const attrs = data.attributes;
        console.log('[Webhook] Processing subscription_resumed');

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: mapStatus(attrs?.status || 'active'),
            ends_at: null,
            renews_at: attrs?.renews_at,
          })
          .eq('lemon_squeezy_subscription_id', data.id?.toString());

        if (error) {
          console.error('[Webhook] ERROR resuming subscription:', error);
          return NextResponse.json({ error: 'Database update failed', details: error }, { status: 500 });
        }
        console.log('[Webhook] Subscription resumed:', data.id);
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
          return NextResponse.json({ error: 'Database update failed', details: error }, { status: 500 });
        }
        console.log('[Webhook] Subscription expired:', data.id);
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
          return NextResponse.json({ error: 'Database update failed', details: error }, { status: 500 });
        }
        console.log('[Webhook] Payment failed for subscription:', data.id);
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
    console.error('[Webhook] Error name:', (error as Error).name);
    console.error('[Webhook] Error message:', (error as Error).message);
    console.error('[Webhook] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
