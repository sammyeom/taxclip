'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { getMonthlyReceiptCount } from '@/lib/supabase';

const FREE_MONTHLY_LIMIT = 10;

export interface UsageLimit {
  monthlyCount: number;
  monthlyLimit: number;
  canUpload: boolean;
  remainingUploads: number;
  isPro: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
}

export function useUsageLimit() {
  const { user } = useAuth();
  const { subscription, isActive, isPro, loading: subscriptionLoading } = useSubscription();

  const [monthlyCount, setMonthlyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyCount = useCallback(async () => {
    if (!user) {
      setMonthlyCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count } = await getMonthlyReceiptCount();
      setMonthlyCount(count);
    } catch (error) {
      console.error('Error fetching monthly count:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMonthlyCount();
  }, [fetchMonthlyCount]);

  // Check if user is in trial period
  const isTrialing = subscription?.status === 'active' &&
    subscription?.trial_ends_at &&
    new Date(subscription.trial_ends_at) > new Date();

  // Calculate trial days remaining
  const getTrialDaysRemaining = (): number | null => {
    if (!isTrialing || !subscription?.trial_ends_at) return null;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Determine limits based on subscription
  const monthlyLimit = isPro ? Infinity : FREE_MONTHLY_LIMIT;
  const remainingUploads = isPro ? Infinity : Math.max(0, FREE_MONTHLY_LIMIT - monthlyCount);
  const canUpload = isPro || monthlyCount < FREE_MONTHLY_LIMIT;

  return {
    monthlyCount,
    monthlyLimit,
    canUpload,
    remainingUploads,
    isPro: isPro || false,
    isTrialing: isTrialing || false,
    trialDaysRemaining: getTrialDaysRemaining(),
    loading: loading || subscriptionLoading,
    refetch: fetchMonthlyCount,
  };
}
