-- Make milhas bucket public and add RLS policies for secure uploads
UPDATE storage.buckets 
SET public = true 
WHERE id = 'milhas';

-- Add RLS policies for milhas bucket
CREATE POLICY "Authenticated users can upload to milhas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'milhas' 
  AND (storage.foldername(name))[1] = 'agency'
);

CREATE POLICY "Users can update their own milhas files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'milhas'
  AND (storage.foldername(name))[1] = 'agency'
);

CREATE POLICY "Anyone can view milhas files"
ON storage.objects FOR SELECT
USING (bucket_id = 'milhas');

CREATE POLICY "Users can delete their own milhas files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'milhas'
  AND (storage.foldername(name))[1] = 'agency'
);