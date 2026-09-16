REVOKE EXECUTE ON FUNCTION public.report_shop_product(uuid, text) FROM anon;

CREATE POLICY "Shop owners manage their own shop media"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'shop-media'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.owner_user_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
)
WITH CHECK (
  bucket_id = 'shop-media'
  AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.owner_user_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
);

CREATE POLICY "Applicants can upload their application media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-media'
  AND (storage.foldername(name))[1] = 'applications'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Applicants can view their application media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'shop-media'
  AND (storage.foldername(name))[1] = 'applications'
  AND (storage.foldername(name))[2] = auth.uid()::text
);