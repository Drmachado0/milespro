-- Drop any existing policies with similar names to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own milhas files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own milhas files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own milhas files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own milhas folder" ON storage.objects;

-- Create secure user-specific folder policies with unique names
CREATE POLICY "milhas_user_upload_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'milhas' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "milhas_user_update_own_files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'milhas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "milhas_user_select_own_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'milhas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "milhas_user_delete_own_files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'milhas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Make milhas bucket private for sensitive data (if not already)
UPDATE storage.buckets SET public = false WHERE id = 'milhas';