CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prayer-reminders-minute') THEN
    PERFORM cron.unschedule('prayer-reminders-minute');
  END IF;
END
$guard$;

SELECT cron.schedule(
  'prayer-reminders-minute',
  '* * * * *',
  $cmd$SELECT net.http_post(
    url := 'https://lhufqnokmdqkvzcxqwkl.supabase.co/functions/v1/prayer-reminders',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );$cmd$
);