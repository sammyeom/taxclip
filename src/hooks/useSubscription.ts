'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Subscription {
  id: string;
  user_id: string;
  user_email: string | null;
  lemon_squeezy_customer_id: string | null;
  lemon_squeezy_subscription_id: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'paused' | 'past_due' | 'inactive';
  plan_type: 'free' | 'pro' | 'annual';
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  update_payment_method_url: string | null;
  customer_portal_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is okay
        throw fetchError;
      }

      setSubscription(data || null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if user has an active subscription
  const isActive = subscription?.status === 'active';

  // Check if user is on a paid plan
  const isPro = isActive && (subscription?.plan_type === 'pro' || subscription?.plan_type === 'annual');

  // Check if subscription is cancelled but still active until period end
  const isCancelled = subscription?.status === 'cancelled' && subscription?.ends_at;

  // Get days remaining until subscription ends
  const getDaysRemaining = (): number | null => {
    if (!subscription?.current_period_end && !subscription?.ends_at) return null;
    const endDate = new Date(subscription.ends_at || subscription.current_period_end!);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Create checkout session
  const createCheckout = async (plan: 'monthly' | 'yearly'): Promise<string | null> => {
    if (!user) {
      setError('Please sign in to subscribe');
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Please sign in to subscribe');
        return null;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const { checkoutUrl } = await response.json();
      return checkoutUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout');
      return null;
    }
  };

  // Open customer portal
  const openCustomerPortal = () => {
    if (subscription?.customer_portal_url) {
      window.open(subscription.customer_portal_url, '_blank');
    }
  };

  // Open update payment method
  const openUpdatePayment = () => {
    if (subscription?.update_payment_method_url) {
      window.open(subscription.update_payment_method_url, '_blank');
    }
  };

  return {
    subscription,
    loading,
    error,
    isActive,
    isPro,
    isCancelled,
    getDaysRemaining,
    createCheckout,
    openCustomerPortal,
    openUpdatePayment,
    refetch: fetchSubscription,
  };
}
