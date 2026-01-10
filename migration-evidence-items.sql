-- Migration: Add IRS audit-ready evidence management
-- Description: Add image_urls, evidence_items, email_text, and parsed_email_data columns to receipts table
-- Run this migration in Supabase SQL Editor

-- Step 1: Add image_urls JSONB array column for multi-image support
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Step 2: Add evidence_items JSONB column for storing evidence files with tags
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS evidence_items JSONB DEFAULT '[]'::jsonb;

-- Step 3: Add email text storage for pasted email confirmations
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS email_text TEXT;

-- Step 4: Add parsed email data for structured extraction results
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS parsed_email_data JSONB;

-- Step 5: Add GIN index for efficient evidence search
CREATE INDEX IF NOT EXISTS receipts_evidence_items_idx
ON receipts USING GIN (evidence_items);

-- Step 6: Migrate single image_url to image_urls array (only if image_urls is empty)
UPDATE receipts
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND (image_urls IS NULL OR image_urls = '[]'::jsonb);

-- Step 7: Create evidence_items from image_url for receipts that have it
UPDATE receipts
SET evidence_items = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'file_url', image_url,
    'file_name', COALESCE(
      NULLIF(split_part(image_url, '/', -1), ''),
      'receipt-image'
    ),
    'file_type', CASE
      WHEN image_url ILIKE '%.pdf' THEN 'application/pdf'
      WHEN image_url ILIKE '%.png' THEN 'image/png'
      WHEN image_url ILIKE '%.heic' THEN 'image/heic'
      ELSE 'image/jpeg'
    END,
    'file_size', 0,
    'evidence_type', 'receipt',
    'upload_date', created_at,
    'order', 0
  )
)
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND (evidence_items IS NULL OR evidence_items = '[]'::jsonb);

-- Verification query (run this to check migration results)
-- SELECT
--   id,
--   merchant,
--   image_url,
--   image_urls,
--   evidence_items,
--   jsonb_array_length(COALESCE(evidence_items, '[]'::jsonb)) as evidence_count
-- FROM receipts
-- LIMIT 10;
