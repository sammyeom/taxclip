-- Migration: Add multi-image support for receipts
-- This migration changes image_url (TEXT) to image_urls (JSONB array)

-- Step 1: Add new image_urls column
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data from image_url to image_urls
UPDATE receipts
SET image_urls = CASE
  WHEN image_url IS NOT NULL AND image_url != ''
  THEN jsonb_build_array(image_url)
  ELSE '[]'::jsonb
END
WHERE image_urls = '[]'::jsonb OR image_urls IS NULL;

-- Step 3: (Optional) Drop old image_url column after verifying migration
-- Uncomment after testing:
-- ALTER TABLE receipts DROP COLUMN image_url;

-- Note: Keep both columns during transition period for backward compatibility
-- The application code will use image_urls going forward
