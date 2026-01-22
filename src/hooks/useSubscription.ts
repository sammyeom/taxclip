'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // Check subscription status
  // Include 'on_trial' as active since trial users should have pro features
  const isActive = subscription?.status === 'active' || subscription?.status === 'on_trial';
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

  return {
    subscription,
    loading,
    error,
    isActive,
    isPro,
    isCancelled,
    isOnTrial,
    hasUsedTrial,
    getDaysRemaining,
    createCheckout,
    openCustomerPortal,
    openUpdatePayment,
    refetch: fetchSubscription,
  };
}
