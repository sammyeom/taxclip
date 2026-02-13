import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type SubscriptionEventType =
  | 'subscribed'
  | 'upgraded'
  | 'downgraded'
  | 'paused'
  | 'resumed'
  | 'discount_applied'
  | 'discount_ended'
  | 'cancelled'
  | 'reactivated'
  | 'plan_changed';

interface LogSubscriptionEventParams {
  userId: string;
  eventType: SubscriptionEventType;
  description: string;
  fromPlan?: string | null;
  toPlan?: string | null;
  amount?: number | null;
  currency?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a subscription event to the history table
 */
export async function logSubscriptionEvent({
  userId,
  eventType,
  description,
  fromPlan,
  toPlan,
  amount,
  currency = 'USD',
  metadata,
}: LogSubscriptionEventParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('subscription_history').insert({
      user_id: userId,
      event_type: eventType,
      description,
      from_plan: fromPlan,
      to_plan: toPlan,
      amount,
      currency,
      metadata,
    });

    if (error) {
      console.error('[SubscriptionHistory] Error logging event:', error);
      return { success: false, error: error.message };
    }

    console.log(`[SubscriptionHistory] Logged ${eventType} for user ${userId}`);
    return { success: true };
  } catch (err) {
    console.error('[SubscriptionHistory] Exception:', err);
    return { success: false, error: 'Failed to log subscription event' };
  }
}

/**
 * Get subscription history for a user
 */
export async function getSubscriptionHistory(userId: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SubscriptionHistory] Error fetching history:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[SubscriptionHistory] Exception:', err);
    return { data: null, error: 'Failed to fetch subscription history' };
  }
}
