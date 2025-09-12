import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const contentType = req.headers.get('content-type') || '';
    let payload: any = null;
    if (contentType.includes('application/json')) {
      try { payload = await req.json(); } catch (_) {}
    }

    const locationName = payload?.location ?? url.searchParams.get('location');
    const range = payload?.range ?? url.searchParams.get('range');
    const month = payload?.month ?? url.searchParams.get('month');

    if (!locationName || !range || !month) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: location, range, month' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate range format
    const validRanges = ['1-5', '6-11', '12-17', '18-24', '25-31'];
    if (!validRanges.includes(range)) {
      return new Response(
        JSON.stringify({ error: 'Invalid range. Must be one of: 1-5, 6-11, 12-17, 18-24, 25-31' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find location by name
    const { data: locations, error: locationError } = await supabase
      .from('locations')
      .select('id, mosque_name, district, latitude, longitude')
      .ilike('mosque_name', `%${locationName}%`)
      .limit(1);

    if (locationError) {
      console.error('Location query error:', locationError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch location' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({ error: `Location '${locationName}' not found` }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const location = locations[0];

    // Query prayer times for the specific range and month
    const { data: prayerTimes, error: prayerError } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('location_id', location.id)
      .eq('month', month)
      .ilike('date_range', `${range}%`);

    if (prayerError) {
      console.error('Prayer times query error:', prayerError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch prayer times' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const response = {
      location: {
        id: location.id,
        name: location.mosque_name,
        district: location.district,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      },
      range,
      month,
      times: prayerTimes || []
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in prayer-times function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});