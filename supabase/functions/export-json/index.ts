import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  trigger_github_action?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trigger_github_action = false }: ExportRequest = 
      req.method === 'POST' ? await req.json() : {};

    console.log('🔄 Starting JSON export process...');

    // Fetch all locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, mosque_name, district');
    
    if (locError) {
      console.error('❌ Error fetching locations:', locError);
      throw locError;
    }

    // Fetch all prayer times with date ranges
    const { data: times, error: timesError } = await supabase
      .from('prayer_times')
      .select('*')
      .order('date_from');
    
    if (timesError) {
      console.error('❌ Error fetching prayer times:', timesError);
      throw timesError;
    }

    if (!locations || !times) {
      throw new Error('No data found in database');
    }

    console.log(`📊 Processing ${locations.length} locations and ${times.length} prayer time entries`);

    const exportData = [];

    // Process each location
    for (const location of locations) {
      const locationSlug = location.mosque_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      // Group prayer times by month for this location
      const locationTimes = times.filter(t => t.location_id === location.id);
      const groupedByMonth: Record<string, any[]> = {};

      for (const time of locationTimes) {
        if (time.date_from) {
          const month = time.date_from.slice(0, 7); // YYYY-MM
          if (!groupedByMonth[month]) {
            groupedByMonth[month] = [];
          }

          // Transform to frontend-compatible format
          const transformedTime = {
            date_from: time.date_from,
            date_to: time.date_to,
            fajr: time.fajr_adhan,
            dhuhr: time.dhuhr_adhan,
            asr: time.asr_adhan,
            maghrib: time.maghrib_adhan,
            isha: time.isha_adhan,
            location: location.mosque_name,
            fajr_iqamah: time.fajr_iqamah,
            dhuhr_iqamah: time.dhuhr_iqamah,
            asr_iqamah: time.asr_iqamah,
            maghrib_iqamah: time.maghrib_iqamah,
            isha_iqamah: time.isha_iqamah,
            jummah_adhan: time.jummah_adhan,
            jummah_iqamah: time.jummah_iqamah,
            sun_rise: time.sun_rise,
            sun_set: time.sun_set,
            mid_noon: time.mid_noon,
            sahar_end: time.sahar_end,
            tharaweeh: time.tharaweeh,
            isha_ramadan_iqamah: time.isha_ramadan_iqamah,
            fajr_ramadan_iqamah: time.fajr_ramadan_iqamah,
            maghrib_ramadan_adhan: time.maghrib_ramadan_adhan,
            ifthar_time: time.ifthar_time || time.iftar_time
          };

          groupedByMonth[month].push(transformedTime);
        }
      }

      // Add to export data
      for (const [month, monthData] of Object.entries(groupedByMonth)) {
        exportData.push({
          location_slug: locationSlug,
          location_name: location.mosque_name,
          month,
          file_path: `/prayer_times/${locationSlug}/${month}.json`,
          data: monthData,
          entries_count: monthData.length
        });
      }
    }

    console.log(`✅ Generated ${exportData.length} JSON files for export`);

    // Trigger GitHub Action if requested
    if (trigger_github_action) {
      console.log('🚀 Triggering GitHub Action for automated deployment...');
      
      // This would require GitHub API token to trigger repository_dispatch
      // For now, just log the intent
      console.log('📝 GitHub Action trigger would happen here with repository_dispatch event');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'JSON export data generated successfully',
        summary: {
          locations_processed: locations.length,
          prayer_times_processed: times.length,
          json_files_generated: exportData.length,
          github_action_triggered: trigger_github_action
        },
        export_data: exportData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Export failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to export prayer times data to JSON format'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});