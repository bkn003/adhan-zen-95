-- =============================================
-- PRAYER TIMES JSON REGENERATION TRIGGER SETUP
-- =============================================

-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to notify prayer times changes
CREATE OR REPLACE FUNCTION notify_prayer_times_change()
RETURNS TRIGGER AS $$
DECLARE
  target_url text;
  location_id_val uuid;
  month_val text;
  request_body json;
BEGIN
  -- Determine the URL based on environment
  -- Replace YOUR_APP_DOMAIN with your actual deployed app domain
  target_url := 'https://YOUR_APP_DOMAIN.vercel.app/functions/v1/regenerate-json';
  
  -- If this is a local development, use localhost
  -- target_url := 'http://localhost:5173/functions/v1/regenerate-json';
  
  -- Get location_id and month from the affected row
  IF TG_OP = 'DELETE' THEN
    location_id_val := OLD.location_id;
    month_val := OLD.month;
  ELSE
    location_id_val := NEW.location_id;
    month_val := NEW.month;
  END IF;
  
  -- Build request body
  request_body := json_build_object(
    'location_id', location_id_val,
    'month', month_val,
    'operation', TG_OP,
    'table', TG_TABLE_NAME,
    'timestamp', extract(epoch from now())
  );
  
  -- Make HTTP request to regenerate JSON
  PERFORM net.http_post(
    url := target_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := request_body::text
  );
  
  -- Log the trigger execution
  RAISE NOTICE 'Prayer times change triggered: % for location % in month %', 
    TG_OP, location_id_val, month_val;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on prayer_times table
DROP TRIGGER IF EXISTS prayer_times_change_trigger ON prayer_times;

CREATE TRIGGER prayer_times_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON prayer_times
  FOR EACH ROW
  EXECUTE FUNCTION notify_prayer_times_change();

-- =============================================
-- INSTRUCTIONS FOR DEPLOYMENT
-- =============================================

/*
1. Copy and paste this SQL into your Supabase SQL Editor
2. Replace 'YOUR_APP_DOMAIN' with your actual app domain
3. Run the SQL to create the trigger
4. Test by inserting/updating/deleting a prayer_times record
5. Check the edge function logs to verify triggers are working

IMPORTANT NOTES:
- The trigger will call your deployed app's regenerate-json endpoint
- For local development, uncomment and use the localhost URL
- Make sure pg_net extension is enabled in your Supabase project
- The trigger fires on INSERT, UPDATE, and DELETE operations
- Each operation will regenerate JSON for the affected location and month

TESTING:
-- Test the trigger with this sample update:
UPDATE prayer_times 
SET fajr_adhan = '05:30:00' 
WHERE location_id = (SELECT id FROM locations LIMIT 1)
AND month = 'September'
LIMIT 1;

-- Check if the HTTP request was made by looking at edge function logs
*/