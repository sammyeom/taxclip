-- Migration to add new fields to receipts table
-- Run this in your Supabase SQL Editor

-- Add new columns to receipts table
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS business_purpose TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Change total column type from TEXT to NUMERIC
-- Note: This will fail if you have existing data that can't be converted
-- If you have existing data, you may need to modify this migration
ALTER TABLE receipts
  ALTER COLUMN total TYPE NUMERIC USING total::numeric;

-- Update default value for category if needed
ALTER TABLE receipts
  ALTER COLUMN category SET DEFAULT 'other';

-- Add index for tax_year for faster filtering
CREATE INDEX IF NOT EXISTS receipts_tax_year_idx ON receipts(tax_year);
