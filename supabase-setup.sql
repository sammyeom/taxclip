-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  date DATE NOT NULL,
  total NUMERIC NOT NULL,
  category TEXT DEFAULT 'other',
  items JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  business_purpose TEXT,
  payment_method TEXT,
  notes TEXT,
  tax_year INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON receipts(user_id);
CREATE INDEX IF NOT EXISTS receipts_date_idx ON receipts(date);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own receipts
CREATE POLICY "Users can view their own receipts"
  ON receipts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own receipts
CREATE POLICY "Users can insert their own receipts"
  ON receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own receipts
CREATE POLICY "Users can update their own receipts"
  ON receipts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts"
  ON receipts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== User Settings Table ====================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own settings
CREATE POLICY "Users can view their own settings"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete their own settings"
  ON user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
