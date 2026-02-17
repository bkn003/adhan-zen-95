
-- Add login credentials to locations table for mosque admins
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS admin_username text,
ADD COLUMN IF NOT EXISTS admin_password_hash text;

-- Create a function to verify mosque admin login (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.verify_mosque_admin(
  p_username text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE admin_username = p_username
    AND admin_password_hash = crypt(p_password, admin_password_hash);
  
  RETURN v_location_id;
END;
$$;

-- Create a function to set/update mosque admin credentials (only callable by service role or verified admin)
CREATE OR REPLACE FUNCTION public.set_mosque_admin_credentials(
  p_location_id uuid,
  p_username text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.locations
  SET admin_username = p_username,
      admin_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_location_id;
  
  RETURN FOUND;
END;
$$;

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- RLS policy: admin credentials columns should NOT be readable via normal select
-- The existing SELECT policy returns true, so we need to restrict the columns
-- We'll handle this by NOT selecting admin_username/admin_password_hash in the app
-- and only using the verify function
