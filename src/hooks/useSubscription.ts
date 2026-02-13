'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

// Subscription features enabled
const SUBSCRIPTIONS_ENABLED = true;

export interface Subscription {
  id: string;
  user_id: string;
  user_email: string | null;
  lemon_squeezy_customer_id: string | null;
  lemon_squeezy_subscription_id: string | null;
  status: 'active' | 'on_trial' | 'cancelled' | 'expired' | 'paused' | 'past_due' | 'inactive';
  plan_type: 'free' | 'pro' | 'annual' | 'pro_monthly' | 'pro_annual';
  interval?: string | null;
  plan_interval?: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  update_payment_method_url: string | null;
  customer_portal_url: string | null;
  // 일시정지 관련
  is_paused?: boolean;
  pause_start_date?: string | null;
  pause_end_date?: string | null;
  pause_duration_days?: number | null;
  // 할인 관련
  discount_percentage?: number | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  discount_reason?: string | null;
  original_price?: number | null;
  discounted_price?: number | null;
  // 취소 관련
  will_renew?: boolean;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_feedback?: string | null;
  // 타임스탬프
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistoryItem {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  from_plan: string | null;
  to_plan: string | null;
  amount: number | null;
  currency: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState<boolean>(false);

  // Fetch subscription data and trial status
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setHasUsedTrial(false);
      setLoading(false);
      return;
    }

    // Subscriptions disabled - give everyone free access
    if (!SUBSCRIPTIONS_ENABLED) {
      setSubscription(null);
      setHasUsedTrial(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subscription data
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSubscription(data || null);

      // Fetch has_used_trial from user_settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('has_used_trial')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching user settings:', settingsError);
      }

      setHasUsedTrial(settingsData?.has_used_trial || false);
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

  // Auto-sync on page visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSubscription, user]);

  // Auto-sync on window focus (when user clicks back into browser)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchSubscription, user]);

  // Check subscription status
  // Include 'on_trial' as active since trial users should have pro features
  const isActive = subscription?.status === 'active' || subscription?.status === 'on_trial';
  const isPro = isActive && (
    subscription?.plan_type === 'pro' ||
    subscription?.plan_type === 'annual' ||
    subscription?.plan_type === 'pro_monthly' ||
    subscription?.plan_type === 'pro_annual'
  );

  // Check if subscription is cancelled but still active until period end
  const isCancelled = subscription?.status === 'cancelled' || subscription?.will_renew === false;

  // Check if subscription will renew
  const willRenew = subscription?.will_renew !== false && subscription?.status !== 'cancelled';

  // Check if subscription is paused
  const isPaused = subscription?.is_paused === true || subscription?.status === 'paused';

  // Check if discount is active
  const hasActiveDiscount = subscription?.discount_percentage != null &&
    subscription?.discount_end_date != null &&
    new Date(subscription.discount_end_date) > new Date();

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
  // If user has already used trial, use no-trial URLs
  const createCheckout = async (plan: 'monthly' | 'yearly'): Promise<string | null> => {
    // LemonSqueezy checkout URLs from environment variables
    // With trial (for first-time users)
    const checkoutUrlsWithTrial = {
      monthly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_MONTHLY || '',
      yearly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_YEARLY || '',
    };

    // Without trial (for users who already used trial)
    const checkoutUrlsNoTrial = {
      monthly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_MONTHLY_NO_TRIAL || checkoutUrlsWithTrial.monthly,
      yearly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_YEARLY_NO_TRIAL || checkoutUrlsWithTrial.yearly,
    };

    // Select URL based on whether user has used trial
    const checkoutUrls = hasUsedTrial ? checkoutUrlsNoTrial : checkoutUrlsWithTrial;

    // Add user email and user_id as prefill if logged in
    let checkoutUrl = checkoutUrls[plan];
    const params = new URLSearchParams();
    if (user?.email) {
      params.append('checkout[email]', user.email);
      params.append('checkout[custom][user_email]', user.email);
    }
    if (user?.id) {
      params.append('checkout[custom][user_id]', user.id);
    }

    if (params.toString()) {
      checkoutUrl += `?${params.toString()}`;
    }

    return checkoutUrl;
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

  // Check if user is on trial
  const isOnTrial = subscription?.status === 'on_trial';

  // Check if user is on monthly plan (can upgrade to annual)
  const isMonthlyPlan = subscription?.plan_type === 'pro' || subscription?.plan_type === 'pro_monthly';

  // Check if subscription is from LemonSqueezy (has lemon_squeezy_subscription_id)
  const isLemonSqueezySubscription = !!subscription?.lemon_squeezy_subscription_id;

  // Upgrade from monthly to annual with proration
  // This uses LemonSqueezy's subscription update API
  const upgradeToAnnual = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isMonthlyPlan) {
      return { success: false, error: 'Not on monthly plan' };
    }

    if (!isLemonSqueezySubscription) {
      return { success: false, error: 'Mobile subscription - please upgrade through the app' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No session found' };
      }

      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to upgrade' };
      }

      // Refresh subscription data
      await fetchSubscription();

      return { success: true };
    } catch (err) {
      console.error('Upgrade error:', err);
      return { success: false, error: 'Failed to upgrade subscription' };
    }
  };

  // Pause subscription for 3 months
  const pauseSubscription = async (): Promise<{ success: boolean; error?: string; resumeDate?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isLemonSqueezySubscription) {
      return { success: false, error: 'Mobile subscription - please manage through the app' };
    }

    if (isPaused) {
      return { success: false, error: 'Subscription is already paused' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No session found' };
      }

      const response = await fetch('/api/subscription/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to pause subscription' };
      }

      // Refresh subscription data
      await fetchSubscription();

      return { success: true, resumeDate: data.resumeDate };
    } catch (err) {
      console.error('Pause error:', err);
      return { success: false, error: 'Failed to pause subscription' };
    }
  };

  // Resume a paused subscription
  const resumeSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isPaused) {
      return { success: false, error: 'Subscription is not paused' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No session found' };
      }

      const response = await fetch('/api/subscription/pause', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to resume subscription' };
      }

      await fetchSubscription();
      return { success: true };
    } catch (err) {
      console.error('Resume error:', err);
      return { success: false, error: 'Failed to resume subscription' };
    }
  };

  // Apply 50% discount for 3 months
  const applyRetentionDiscount = async (): Promise<{ success: boolean; error?: string; discount?: { percentage: number; endDate: string } }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isLemonSqueezySubscription) {
      return { success: false, error: 'Mobile subscription - please contact support' };
    }

    if (hasActiveDiscount) {
      return { success: false, error: 'You already have an active discount' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No session found' };
      }

      const response = await fetch('/api/subscription/discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to apply discount' };
      }

      await fetchSubscription();

      return {
        success: true,
        discount: {
          percentage: data.discount.percentage,
          endDate: data.discount.endDate,
        },
      };
    } catch (err) {
      console.error('Discount error:', err);
      return { success: false, error: 'Failed to apply discount' };
    }
  };

  // Fetch subscription history
  const fetchSubscriptionHistory = async (limit = 20): Promise<{ success: boolean; history?: SubscriptionHistoryItem[]; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No session found' };
      }

      const response = await fetch(`/api/subscription/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch history' };
      }

      return { success: true, history: data.history };
    } catch (err) {
      console.error('History fetch error:', err);
      return { success: false, error: 'Failed to fetch history' };
    }
  };

  return {
    subscription,
    loading,
    error,
    isActive,
    isPro,
    isCancelled,
    isOnTrial,
    hasUsedTrial,
    willRenew,
    isPaused,
    hasActiveDiscount,
    isMonthlyPlan,
    isLemonSqueezySubscription,
    getDaysRemaining,
    createCheckout,
    upgradeToAnnual,
    pauseSubscription,
    resumeSubscription,
    applyRetentionDiscount,
    fetchSubscriptionHistory,
    openCustomerPortal,
    openUpdatePayment,
    refetch: fetchSubscription,
  };
}
