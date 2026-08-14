ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS reminder_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS self_scheduled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.reminder_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL,
  send_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (token, send_key)
);

GRANT ALL ON public.reminder_sends TO service_role;

ALTER TABLE public.reminder_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages reminder sends"
ON public.reminder_sends FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS reminder_sends_created_idx ON public.reminder_sends (created_at);