-- 1) Per-mosque announcement follow preferences
CREATE TABLE IF NOT EXISTS public.mosque_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  announcements boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosque_follows TO authenticated;
GRANT ALL ON public.mosque_follows TO service_role;
ALTER TABLE public.mosque_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_manage_own ON public.mosque_follows;
CREATE POLICY follows_manage_own ON public.mosque_follows
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER mosque_follows_touch BEFORE UPDATE ON public.mosque_follows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Push token lifecycle columns
ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'fcm',
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_key ON public.push_tokens (expo_push_token);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);

-- 3) Review moderation
ALTER TABLE public.mosque_reviews
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Public can read review content" ON public.mosque_reviews;
CREATE POLICY "Public can read visible review content" ON public.mosque_reviews
  FOR SELECT TO anon, authenticated
  USING (is_hidden = false);

CREATE TABLE IF NOT EXISTS public.mosque_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.mosque_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

GRANT ALL ON public.mosque_review_reports TO service_role;
ALTER TABLE public.mosque_review_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.report_mosque_review(p_review_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.mosque_review_reports (review_id, user_id, reason)
  VALUES (p_review_id, v_uid, left(coalesce(p_reason, ''), 300))
  ON CONFLICT (review_id, user_id) DO NOTHING;

  SELECT count(*) INTO v_count FROM public.mosque_review_reports WHERE review_id = p_review_id;

  UPDATE public.mosque_reviews
     SET report_count = v_count,
         is_hidden = (v_count >= 3)
   WHERE id = p_review_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.report_mosque_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_mosque_review(uuid, text) TO authenticated;