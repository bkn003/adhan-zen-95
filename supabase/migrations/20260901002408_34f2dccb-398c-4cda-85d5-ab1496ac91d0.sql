CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other',
  subject text NOT NULL,
  description text NOT NULL,
  screenshot_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users create their own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners and super admins update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users upload their own support screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read their own support screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-screenshots' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Users delete their own support screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'support-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);