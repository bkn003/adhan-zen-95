CREATE TABLE public.recitation_audio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'quran',
  lang_code text NOT NULL,
  ref1 integer NOT NULL,
  ref2 integer NOT NULL,
  storage_path text NOT NULL,
  reciter_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recitation_audio_kind_check CHECK (kind IN ('quran','hadith')),
  CONSTRAINT recitation_audio_unique UNIQUE (kind, lang_code, ref1, ref2)
);

GRANT SELECT ON public.recitation_audio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recitation_audio TO authenticated;
GRANT ALL ON public.recitation_audio TO service_role;

ALTER TABLE public.recitation_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recitations are readable by everyone"
  ON public.recitation_audio FOR SELECT USING (true);

CREATE POLICY "Super admins manage recitations"
  ON public.recitation_audio FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_recitation_audio_updated
  BEFORE UPDATE ON public.recitation_audio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recitation_audio_lookup
  ON public.recitation_audio (kind, lang_code, ref1);

CREATE POLICY "Reciter audio readable by app users"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reciter-audio');

CREATE POLICY "Super admins upload reciter audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reciter-audio' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update reciter audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reciter-audio' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins delete reciter audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reciter-audio' AND public.has_role(auth.uid(), 'super_admin'));