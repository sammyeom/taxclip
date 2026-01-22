-- ============================================================================
-- Add subscription fields to user_settings table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add subscription columns to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_id TEXT,
ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_id TEXT;

-- Fix subscriptions table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Create new policies that work properly
-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Allow INSERT for all (webhook will use service role which bypasses RLS)
CREATE POLICY "Allow insert for service role"
  ON public.subscriptions FOR INSERT
  WITH CHECK (true);

-- Allow UPDATE for all (webhook will use service role which bypasses RLS)
CREATE POLICY "Allow update for service role"
  ON public.subscriptions FOR UPDATE
  USING (true);

-- Also allow users to update their own subscription via user_settings
CREATE POLICY "Users can update own user_settings subscription"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.user_settings TO service_role;

-- ============================================================================
-- DONE!
-- Now redeploy your app and test the webhook again.
-- ============================================================================
