-- Roles enum + table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'mosque_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Mosque admin assignments (which signed-in account manages which mosque)
CREATE TABLE IF NOT EXISTS public.mosque_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);

GRANT SELECT ON public.mosque_admin_users TO authenticated;
GRANT ALL ON public.mosque_admin_users TO service_role;

ALTER TABLE public.mosque_admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own assignment" ON public.mosque_admin_users;
CREATE POLICY "Admins read own assignment"
ON public.mosque_admin_users FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS trg_mosque_admin_users_updated ON public.mosque_admin_users;
CREATE TRIGGER trg_mosque_admin_users_updated
BEFORE UPDATE ON public.mosque_admin_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-grant super admin to the designated address
CREATE OR REPLACE FUNCTION public.grant_super_admin_for_known_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) = 'bknqwe19@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_super ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_super
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_for_known_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_super ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_super
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_super_admin_for_known_email();

-- Backfill if the account already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE lower(email) = 'bknqwe19@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;