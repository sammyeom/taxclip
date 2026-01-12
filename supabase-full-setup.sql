-- ============================================================================
-- TaxClip Full Database Setup
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================================

-- ============================================================================
-- 1. RECEIPTS TABLE (Main receipts storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  merchant TEXT NOT NULL,
  date DATE NOT NULL,
  total NUMERIC NOT NULL,
  category TEXT DEFAULT 'other',
  items JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  evidence_items JSONB DEFAULT '[]'::jsonb,
  email_text TEXT,
  parsed_email_data JSONB,
  business_purpose TEXT,
  payment_method TEXT,
  notes TEXT,
  tax_year INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipts indexes
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS receipts_date_idx ON public.receipts(date);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON public.receipts(created_at);
CREATE INDEX IF NOT EXISTS receipts_tax_year_idx ON public.receipts(tax_year);
CREATE INDEX IF NOT EXISTS receipts_category_idx ON public.receipts(category);
CREATE INDEX IF NOT EXISTS idx_receipts_user_email ON public.receipts(user_email);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Receipts policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON public.receipts;

CREATE POLICY "Users can view their own receipts"
  ON public.receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts"
  ON public.receipts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts"
  ON public.receipts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. EXPENSES TABLE (IRS Audit-Ready Structure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  merchant TEXT NOT NULL,
  date DATE NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  irs_category TEXT NOT NULL DEFAULT 'other',
  file_urls TEXT[] DEFAULT '{}',
  document_types TEXT[] DEFAULT '{}',
  raw_text TEXT,
  business_purpose TEXT,
  payment_method TEXT,
  notes TEXT,
  tax_year INTEGER,
  email_text TEXT,
  parsed_email_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_irs_category ON public.expenses(irs_category);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_year ON public.expenses(tax_year);
CREATE INDEX IF NOT EXISTS idx_expenses_user_email ON public.expenses(user_email);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. USER_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,

  -- General Settings
  currency TEXT NOT NULL DEFAULT 'USD',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  default_category TEXT NOT NULL DEFAULT 'other',
  auto_categorize BOOLEAN NOT NULL DEFAULT false,

  -- Notifications
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  monthly_summary BOOLEAN NOT NULL DEFAULT true,
  receipt_reminders BOOLEAN NOT NULL DEFAULT false,
  tax_deadline_reminders BOOLEAN NOT NULL DEFAULT true,

  -- Tax Settings
  business_type TEXT NOT NULL DEFAULT 'sole_proprietor',
  tax_year_type TEXT NOT NULL DEFAULT 'calendar',
  meals_deduction_rate NUMERIC NOT NULL DEFAULT 0.50,
  mileage_tracking BOOLEAN NOT NULL DEFAULT false,
  mileage_rate NUMERIC NOT NULL DEFAULT 0.67,

  -- Data & Privacy
  data_retention_years INTEGER NOT NULL DEFAULT 7,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings indexes
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_email ON public.user_settings(user_email);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- User settings policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. SUBSCRIPTIONS TABLE (Lemon Squeezy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,

  -- Lemon Squeezy IDs
  lemon_squeezy_customer_id TEXT,
  lemon_squeezy_subscription_id TEXT UNIQUE,
  lemon_squeezy_order_id TEXT,
  lemon_squeezy_product_id TEXT,
  lemon_squeezy_variant_id TEXT,

  -- Subscription details
  status TEXT NOT NULL DEFAULT 'inactive', -- active, cancelled, expired, paused, past_due, inactive
  plan_type TEXT NOT NULL DEFAULT 'free', -- free, pro, annual

  -- Billing info
  billing_anchor INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- URLs for customer portal
  update_payment_method_url TEXT,
  customer_portal_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions indexes
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_ls_subscription_id_idx ON public.subscriptions(lemon_squeezy_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON public.subscriptions(user_email);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 5. TRIGGERS - Auto-update updated_at
-- ============================================================================

-- Generic updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Receipts trigger
DROP TRIGGER IF EXISTS update_receipts_updated_at ON public.receipts;
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Expenses trigger
DROP TRIGGER IF EXISTS expenses_updated_at_trigger ON public.expenses;
CREATE TRIGGER expenses_updated_at_trigger
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- User settings trigger
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Subscriptions trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. AUTO-CREATE USER SETTINGS ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (
    user_id,
    user_email,
    currency,
    date_format,
    default_category,
    auto_categorize,
    email_notifications,
    monthly_summary,
    receipt_reminders,
    tax_deadline_reminders,
    business_type,
    tax_year_type,
    meals_deduction_rate,
    mileage_tracking,
    mileage_rate,
    data_retention_years
  ) VALUES (
    NEW.id,
    NEW.email,
    'USD',
    'MM/DD/YYYY',
    'other',
    false,
    true,
    true,
    false,
    true,
    'sole_proprietor',
    'calendar',
    0.50,
    false,
    0.67,
    7
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. STORAGE BUCKET FOR RECEIPTS
-- ============================================================================

-- Create storage bucket (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies (run after bucket is created)
-- DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;

-- CREATE POLICY "Users can upload their own receipts"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own receipts"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own receipts"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Public can view receipts"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'receipts');

-- ============================================================================
-- 8. CREATE SETTINGS FOR EXISTING USERS (if any)
-- ============================================================================

INSERT INTO public.user_settings (
  user_id,
  user_email,
  currency,
  date_format,
  default_category,
  auto_categorize,
  email_notifications,
  monthly_summary,
  receipt_reminders,
  tax_deadline_reminders,
  business_type,
  tax_year_type,
  meals_deduction_rate,
  mileage_tracking,
  mileage_rate,
  data_retention_years
)
SELECT
  id,
  email,
  'USD',
  'MM/DD/YYYY',
  'other',
  false,
  true,
  true,
  false,
  true,
  'sole_proprietor',
  'calendar',
  0.50,
  false,
  0.67,
  7
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.receipts TO authenticated;
GRANT SELECT ON public.receipts TO anon;

GRANT ALL ON public.expenses TO authenticated;
GRANT SELECT ON public.expenses TO anon;

GRANT ALL ON public.user_settings TO authenticated;
GRANT SELECT ON public.user_settings TO anon;

GRANT ALL ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscriptions TO anon;

-- ============================================================================
-- DONE! All tables created successfully.
-- ============================================================================
