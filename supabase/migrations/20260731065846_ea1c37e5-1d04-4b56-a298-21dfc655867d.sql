-- 1. Lock down SECURITY DEFINER credential functions (edge functions use service_role)
REVOKE ALL ON FUNCTION public.verify_mosque_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_mosque_admin_credentials(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mosque_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_mosque_admin_credentials(uuid, text, text) TO service_role;

-- 2. Verified ownership columns
ALTER TABLE public.mosque_reviews ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.mosque_event_rsvps ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS mosque_reviews_user_id_idx ON public.mosque_reviews(user_id);
CREATE INDEX IF NOT EXISTS mosque_event_rsvps_user_id_idx ON public.mosque_event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens(user_id);

-- 3. mosque_reviews: replace spoofable header policies
DROP POLICY IF EXISTS "Submitter can delete own review" ON public.mosque_reviews;
DROP POLICY IF EXISTS "Submitter can update own review" ON public.mosque_reviews;
DROP POLICY IF EXISTS "Users can submit reviews" ON public.mosque_reviews;

REVOKE INSERT, UPDATE, DELETE ON public.mosque_reviews FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.mosque_reviews TO authenticated;

CREATE POLICY "Authenticated users can submit own review"
  ON public.mosque_reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND rating >= 1 AND rating <= 5
    AND (comment IS NULL OR length(comment) < 1000)
  );

CREATE POLICY "Owner can update own review"
  ON public.mosque_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND rating >= 1 AND rating <= 5);

CREATE POLICY "Owner can delete own review"
  ON public.mosque_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. mosque_event_rsvps
DROP POLICY IF EXISTS "rsvps_delete_self" ON public.mosque_event_rsvps;
DROP POLICY IF EXISTS "rsvps_insert_self" ON public.mosque_event_rsvps;
DROP POLICY IF EXISTS "rsvps_update_self" ON public.mosque_event_rsvps;
DROP POLICY IF EXISTS "rsvps_select_all" ON public.mosque_event_rsvps;
DROP POLICY IF EXISTS "rsvps_select_own" ON public.mosque_event_rsvps;

REVOKE ALL ON public.mosque_event_rsvps FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosque_event_rsvps TO authenticated;
GRANT ALL ON public.mosque_event_rsvps TO service_role;

CREATE POLICY "rsvps_select_own"
  ON public.mosque_event_rsvps FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rsvps_insert_own"
  ON public.mosque_event_rsvps FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status IN ('yes','maybe','no'));

CREATE POLICY "rsvps_update_own"
  ON public.mosque_event_rsvps FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('yes','maybe','no'));

CREATE POLICY "rsvps_delete_own"
  ON public.mosque_event_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- upsert target for the client
CREATE UNIQUE INDEX IF NOT EXISTS mosque_event_rsvps_event_user_uidx
  ON public.mosque_event_rsvps(event_id, user_id);

-- 5. push_tokens
DROP POLICY IF EXISTS "Anyone can insert push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Device can delete own push token" ON public.push_tokens;
DROP POLICY IF EXISTS "Device can update own push token" ON public.push_tokens;
DROP POLICY IF EXISTS "Device can read own push token" ON public.push_tokens;

REVOKE ALL ON public.push_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;

CREATE POLICY "push_tokens_select_own"
  ON public.push_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert_own"
  ON public.push_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND length(expo_push_token) > 20);

CREATE POLICY "push_tokens_update_own"
  ON public.push_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_delete_own"
  ON public.push_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());