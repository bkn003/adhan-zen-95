INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('mosque_donations_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_mosque_donation_details(p_location_id uuid)
 RETURNS TABLE(donation_enabled boolean, donation_upi_id text, donation_account_holder text, donation_bank_name text, donation_account_number text, donation_ifsc text, donation_notes text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.donation_enabled,
         l.donation_upi_id,
         l.donation_account_holder,
         l.donation_bank_name,
         l.donation_account_number,
         l.donation_ifsc,
         l.donation_notes
  FROM public.locations l
  WHERE l.id = p_location_id
    AND l.donation_enabled = true
    AND COALESCE(l.is_visible, true) = true
    AND COALESCE((SELECT s.value FROM public.app_settings s WHERE s.key = 'mosque_donations_enabled'), 'true') = 'true';
$function$;