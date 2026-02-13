-- Subscription History Table
-- Tracks all subscription changes for billing history display

CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'subscribed', 'upgraded', 'downgraded', 'paused', 'resumed', 'discount_applied', 'discount_ended', 'cancelled', 'reactivated'
  description TEXT NOT NULL,  -- Human readable description
  from_plan TEXT,  -- Previous plan (null for new subscriptions)
  to_plan TEXT,    -- New plan
  amount DECIMAL(10,2),  -- Amount charged (if applicable)
  currency TEXT DEFAULT 'USD',
  metadata JSONB,  -- Additional data (proration, discount info, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- RLS Policies
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own history
CREATE POLICY "Users can view own subscription history"
  ON subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (from API)
CREATE POLICY "Service role can insert subscription history"
  ON subscription_history
  FOR INSERT
  WITH CHECK (true);
