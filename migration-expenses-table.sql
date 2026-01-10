-- Migration: Create/Update expenses table for IRS Audit-Ready structure
-- Run this in your Supabase SQL Editor

-- Option 1: If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Option 2: If table exists, add missing columns
DO $$
BEGIN
  -- Add irs_category if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'irs_category') THEN
    ALTER TABLE expenses ADD COLUMN irs_category TEXT NOT NULL DEFAULT 'other';
  END IF;

  -- Add file_urls if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'file_urls') THEN
    ALTER TABLE expenses ADD COLUMN file_urls TEXT[] DEFAULT '{}';
  END IF;

  -- Add document_types if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'document_types') THEN
    ALTER TABLE expenses ADD COLUMN document_types TEXT[] DEFAULT '{}';
  END IF;

  -- Add raw_text if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'raw_text') THEN
    ALTER TABLE expenses ADD COLUMN raw_text TEXT;
  END IF;

  -- Add business_purpose if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'business_purpose') THEN
    ALTER TABLE expenses ADD COLUMN business_purpose TEXT;
  END IF;

  -- Add payment_method if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'payment_method') THEN
    ALTER TABLE expenses ADD COLUMN payment_method TEXT;
  END IF;

  -- Add notes if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'notes') THEN
    ALTER TABLE expenses ADD COLUMN notes TEXT;
  END IF;

  -- Add tax_year if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'tax_year') THEN
    ALTER TABLE expenses ADD COLUMN tax_year INTEGER;
  END IF;

  -- Add email_text if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'email_text') THEN
    ALTER TABLE expenses ADD COLUMN email_text TEXT;
  END IF;

  -- Add parsed_email_data if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'parsed_email_data') THEN
    ALTER TABLE expenses ADD COLUMN parsed_email_data JSONB;
  END IF;

  -- Add created_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'created_at') THEN
    ALTER TABLE expenses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'updated_at') THEN
    ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_irs_category ON expenses(irs_category);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_year ON expenses(tax_year);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

-- Create RLS policies
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS expenses_updated_at_trigger ON expenses;
CREATE TRIGGER expenses_updated_at_trigger
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- Grant permissions
GRANT ALL ON expenses TO authenticated;
GRANT SELECT ON expenses TO anon;
