-- Enable pgcrypto extension for gen_salt and crypt functions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the functions to use extensions schema explicitly
CREATE OR REPLACE FUNCTION public.set_mosque_admin_credentials(p_location_id uuid, p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.locations
  SET admin_username = p_username,
      admin_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  WHERE id = p_location_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_mosque_admin(p_username text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE admin_username = p_username
    AND admin_password_hash = extensions.crypt(p_password, admin_password_hash);
  
  RETURN v_location_id;
END;
$$;