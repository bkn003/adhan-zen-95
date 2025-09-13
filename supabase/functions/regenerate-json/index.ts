import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create location slug from mosque name
function createLocationSlug(mosqueName: string): string {
  return mosqueName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
}

// Get current and next month in YYYY-MM format
function getCurrentAndNextMonth(): string[] {
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const next = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  
  return [current, next]
}

// Convert date range to actual dates
function getDateRangeFromString(range: string, month: string, year: number): string[] {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase())
  if (monthIndex === -1) return []
  
  const [start, end] = range.split('-').map(n => parseInt(n))
  const dates = []
  
  for (let day = start; day <= end; day++) {
    const date = new Date(year, monthIndex, day)
    if (date.getMonth() === monthIndex) { // Valid date
      dates.push(date.toISOString().split('T')[0]) // YYYY-MM-DD format
    }
  }
  
  return dates
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { location_id, date } = await req.json()
    
    console.log(`Processing regeneration for location_id: ${location_id}, date: ${date}`)
    
    // Get location details
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', location_id)
      .single()
    
    if (locationError || !location) {
      console.error('Location not found:', locationError)
      return new Response(JSON.stringify({ error: 'Location not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const locationSlug = createLocationSlug(location.mosque_name)
    const [currentMonth, nextMonth] = getCurrentAndNextMonth()
    
    console.log(`Processing location: ${location.mosque_name} -> ${locationSlug}`)
    console.log(`Target months: ${currentMonth}, ${nextMonth}`)
    
    // Process current and next month
    for (const targetMonth of [currentMonth, nextMonth]) {
      const [year, month] = targetMonth.split('-')
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      const monthName = monthNames[parseInt(month) - 1]
      
      console.log(`Fetching prayer times for ${monthName} ${year}`)
      
      // Get all prayer times for this location and month
      const { data: prayerTimes, error: prayerError } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('location_id', location_id)
        .eq('month', monthName)
      
      if (prayerError) {
        console.error('Error fetching prayer times:', prayerError)
        continue
      }
      
      if (!prayerTimes || prayerTimes.length === 0) {
        console.log(`No prayer times found for ${monthName} ${year}`)
        continue
      }
      
      // Convert to JSON format
      const jsonData = []
      
      for (const prayerTime of prayerTimes) {
        const dates = getDateRangeFromString(prayerTime.date_range, monthName, parseInt(year))
        
        for (const date of dates) {
          jsonData.push({
            date,
            fajr: prayerTime.fajr_adhan,
            dhuhr: prayerTime.dhuhr_adhan,
            asr: prayerTime.asr_adhan,
            maghrib: prayerTime.maghrib_adhan,
            isha: prayerTime.isha_adhan,
            location: location.mosque_name,
            // Optional additional fields
            fajr_iqamah: prayerTime.fajr_iqamah,
            dhuhr_iqamah: prayerTime.dhuhr_iqamah,
            asr_iqamah: prayerTime.asr_iqamah,
            maghrib_iqamah: prayerTime.maghrib_iqamah,
            isha_iqamah: prayerTime.isha_iqamah,
            jummah_adhan: prayerTime.jummah_adhan,
            jummah_iqamah: prayerTime.jummah_iqamah,
            sun_rise: prayerTime.sun_rise,
            sun_set: prayerTime.sun_set,
            mid_noon: prayerTime.mid_noon,
            sahar_end: prayerTime.sahar_end,
            tharaweeh: prayerTime.tharaweeh,
            isha_ramadan_iqamah: prayerTime.isha_ramadan_iqamah,
            fajr_ramadan_iqamah: prayerTime.fajr_ramadan_iqamah,
            maghrib_ramadan_adhan: prayerTime.maghrib_ramadan_adhan,
            ifthar_time: prayerTime.ifthar_time
          })
        }
      }
      
      // Sort by date
      jsonData.sort((a, b) => a.date.localeCompare(b.date))
      
      console.log(`Generated ${jsonData.length} prayer time entries for ${targetMonth}`)
      
      // Save to file (in production, this would write to storage)
      // For now, we'll just log the structure since we can't write to /public in edge functions
      console.log(`Would save to: /public/prayer_times/${locationSlug}/${targetMonth}.json`)
      console.log(`Sample data:`, jsonData.slice(0, 3))
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      location: location.mosque_name,
      locationSlug,
      processedMonths: [currentMonth, nextMonth]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error in regenerate-json function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})