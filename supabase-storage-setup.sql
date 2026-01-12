-- ============================================================================
-- TaxClip Storage Setup
-- Run this AFTER creating the 'receipts' bucket in Supabase Storage
-- ============================================================================

-- Step 1: First, create the bucket in Supabase Dashboard
-- Go to Storage > Create a new bucket > Name: "receipts" > Public: ON

-- Step 2: Then run these policies:

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to all receipts (needed for image display)
CREATE POLICY "Anyone can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipts');

-- ============================================================================
-- DONE! Storage policies created successfully.
-- ============================================================================
