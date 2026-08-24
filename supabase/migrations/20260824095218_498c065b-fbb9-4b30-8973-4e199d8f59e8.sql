CREATE TABLE IF NOT EXISTS public.location_donation_details (
  location_id uuid PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  donation_enabled boolean NOT NULL DEFAULT false,
  donation_upi_id text,
  donation_account_holder text,
  donation_bank_name text,
  donation_account_number text,
  donation_ifsc text,
  donation_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.location_donation_details TO service_role;

ALTER TABLE public.location_donation_details ENABLE ROW LEVEL SECURITY;

INSERT INTO public.location_donation_details (
  location_id, donation_enabled, donation_upi_id, donation_account_holder,
  donation_bank_name, donation_account_number, donation_ifsc, donation_notes
)
SELECT id, donation_enabled, donation_upi_id, donation_account_holder,
       donation_bank_name, donation_account_number, donation_ifsc, donation_notes
FROM public.locations
WHERE donation_enabled = true
   OR donation_upi_id IS NOT NULL
   OR donation_account_holder IS NOT NULL
   OR donation_bank_name IS NOT NULL
   OR donation_account_number IS NOT NULL
   OR donation_ifsc IS NOT NULL
   OR donation_notes IS NOT NULL
ON CONFLICT (location_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_mosque_donation_details(p_location_id uuid)
 RETURNS TABLE(donation_enabled boolean, donation_upi_id text, donation_account_holder text, donation_bank_name text, donation_account_number text, donation_ifsc text, donation_notes text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.donation_enabled,
         d.donation_upi_id,
         d.donation_account_holder,
         d.donation_bank_name,
         d.donation_account_number,
         d.donation_ifsc,
         d.donation_notes
  FROM public.location_donation_details d
  JOIN public.locations l ON l.id = d.location_id
  WHERE d.location_id = p_location_id
    AND d.donation_enabled = true
    AND COALESCE(l.is_visible, true) = true
    AND COALESCE((SELECT s.value FROM public.app_settings s WHERE s.key = 'mosque_donations_enabled'), 'true') = 'true';
$function$;

ALTER TABLE public.locations
  DROP COLUMN IF EXISTS donation_enabled,
  DROP COLUMN IF EXISTS donation_upi_id,
  DROP COLUMN IF EXISTS donation_account_holder,
  DROP COLUMN IF EXISTS donation_bank_name,
  DROP COLUMN IF EXISTS donation_account_number,
  DROP COLUMN IF EXISTS donation_ifsc,
  DROP COLUMN IF EXISTS donation_notes;