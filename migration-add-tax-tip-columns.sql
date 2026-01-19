-- ============================================================================
-- Migration: Add subtotal, tax, and tip columns to receipts table
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add subtotal column (amount before tax)
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS subtotal NUMERIC;

-- Add tax column (tax amount, separate from items)
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS tax NUMERIC;

-- Add tip column (tip amount, separate from items)
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS tip NUMERIC;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'receipts'
AND column_name IN ('subtotal', 'tax', 'tip');
