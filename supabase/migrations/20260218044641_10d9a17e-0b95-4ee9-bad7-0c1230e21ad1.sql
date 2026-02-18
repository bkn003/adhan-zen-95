-- Create mosque_photos table to store photo URLs
CREATE TABLE public.mosque_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mosque_photos ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view mosque photos"
ON public.mosque_photos FOR SELECT
USING (true);

-- Create storage bucket for mosque photos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mosque-photos', 'mosque-photos', true, 524288);

-- Storage policies
CREATE POLICY "Anyone can view mosque photos storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'mosque-photos');

CREATE POLICY "Service role can upload mosque photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mosque-photos');

CREATE POLICY "Service role can delete mosque photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'mosque-photos');