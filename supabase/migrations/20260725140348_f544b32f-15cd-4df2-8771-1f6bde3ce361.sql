
-- 1) Split admin credentials into a dedicated table
CREATE TABLE IF NOT EXISTS public.mosque_admins (
  location_id uuid PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No grants to anon/authenticated - only service_role and SECURITY DEFINER functions may read
GRANT ALL ON public.mosque_admins TO service_role;

ALTER TABLE public.mosque_admins ENABLE ROW LEVEL SECURITY;

-- Deny-by-default: no policies for anon/authenticated. SECURITY DEFINER functions still work.

-- Migrate existing credentials from locations
INSERT INTO public.mosque_admins (location_id, username, password_hash, is_paused)
SELECT id, admin_username, admin_password_hash, COALESCE(admin_paused, false)
FROM public.locations
WHERE admin_username IS NOT NULL AND admin_password_hash IS NOT NULL
ON CONFLICT (location_id) DO NOTHING;

-- Drop credential columns from locations
ALTER TABLE public.locations
  DROP COLUMN IF EXISTS admin_username,
  DROP COLUMN IF EXISTS admin_password_hash,
  DROP COLUMN IF EXISTS admin_paused;

-- Update verify function to use new table
CREATE OR REPLACE FUNCTION public.verify_mosque_admin(p_username text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT location_id INTO v_location_id
  FROM public.mosque_admins
  WHERE username = p_username
    AND password_hash = extensions.crypt(p_password, password_hash)
    AND is_paused = false;

  RETURN v_location_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_mosque_admin_credentials(p_location_id uuid, p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  INSERT INTO public.mosque_admins (location_id, username, password_hash)
  VALUES (p_location_id, p_username, extensions.crypt(p_password, extensions.gen_salt('bf')))
  ON CONFLICT (location_id) DO UPDATE
    SET username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        updated_at = now();
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_mosque_admin(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_mosque_admin_credentials(uuid, text, text) FROM anon, authenticated, PUBLIC;

-- 2) mosque_reviews: allow submitter (by x-device-id header) to update/delete own review
CREATE POLICY "Submitter can update own review"
ON public.mosque_reviews
FOR UPDATE
TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "Submitter can delete own review"
ON public.mosque_reviews
FOR DELETE
TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- 3) push_tokens: device-scoped SELECT/UPDATE/DELETE
CREATE POLICY "Device can read own push token"
ON public.push_tokens
FOR SELECT
TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "Device can update own push token"
ON public.push_tokens
FOR UPDATE
TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "Device can delete own push token"
ON public.push_tokens
FOR DELETE
TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');
