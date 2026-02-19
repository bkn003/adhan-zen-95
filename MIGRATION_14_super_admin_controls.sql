-- ============================================================================
-- MIGRATION 14: Super Admin Controls — Visibility + Admin Pause
-- Date: 2026-02-18
-- For: Phase 4 enhancements (Super Admin panel)
-- ============================================================================

-- Add is_visible column to control mosque visibility in the app
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Add admin_paused column to pause/resume mosque admins
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS admin_paused boolean DEFAULT false;

-- Update verify function to block paused admins from logging in
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
    AND admin_password_hash = extensions.crypt(p_password, admin_password_hash)
    AND (admin_paused IS NULL OR admin_paused = false);
  
  RETURN v_location_id;
END;
$$;
