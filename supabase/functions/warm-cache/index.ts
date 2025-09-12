import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    const warmCacheKey = Deno.env.get('WARM_CACHE_KEY');

    if (!key || key !== warmCacheKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`Starting cache warming for month: ${currentMonth}`);

    // Get all locations
    const { data: locations, error: locationError } = await supabase
      .from('locations')
      .select('mosque_name');

    if (locationError) {
      console.error('Failed to fetch locations:', locationError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch locations' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const ranges = ['1-5', '6-11', '12-17', '18-24', '25-31'];
    const baseUrl = Deno.env.get('SUPABASE_URL')!.replace('/rest/v1', '');
    
    let successCount = 0;
    let errorCount = 0;

    // Warm cache for each location and range
    for (const location of locations || []) {
      for (const range of ranges) {
        try {
          const warmUrl = `${baseUrl}/functions/v1/prayer-times?location=${encodeURIComponent(location.mosque_name)}&range=${range}&month=${currentMonth}`;
          
          const response = await fetch(warmUrl, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
          });

          if (response.ok) {
            successCount++;
            console.log(`✓ Warmed cache for ${location.mosque_name} - ${range}`);
          } else {
            errorCount++;
            console.error(`✗ Failed to warm cache for ${location.mosque_name} - ${range}: ${response.status}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`✗ Error warming cache for ${location.mosque_name} - ${range}:`, error);
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Cache warming completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache warming completed',
        stats: {
          locationsProcessed: locations?.length || 0,
          successfulWarmups: successCount,
          errors: errorCount,
          month: currentMonth
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in warm-cache function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});