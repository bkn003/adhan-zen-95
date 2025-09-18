// Utility functions for static prayer times JSON files

export interface StaticPrayerTime {
  date?: string; // YYYY-MM-DD (legacy format)
  date_from?: string; // YYYY-MM-DD (new date range format)
  date_to?: string; // YYYY-MM-DD (new date range format)
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  location: string;
  fajr_iqamah?: string;
  dhuhr_iqamah?: string;
  asr_iqamah?: string;
  maghrib_iqamah?: string;
  isha_iqamah?: string;
  jummah_adhan?: string;
  jummah_iqamah?: string;
  sun_rise?: string;
  sun_set?: string;
  mid_noon?: string;
  sahar_end?: string;
  tharaweeh?: string;
  isha_ramadan_iqamah?: string;
  fajr_ramadan_iqamah?: string;
  maghrib_ramadan_adhan?: string;
  ifthar_time?: string;
}

// Create location slug from mosque name
export function createLocationSlug(mosqueName: string): string {
  return mosqueName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
}

// Get month in YYYY-MM format
export function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Fetch static prayer times for a location and month (CDN-first approach)
export async function fetchStaticPrayerTimes(
  locationSlug: string, 
  month: string,
  cdnUrl?: string
): Promise<StaticPrayerTime[]> {
  // Try CDN first for 1M+ users scale (Cloudflare Pages)
  const urls = [];
  
  if (cdnUrl) {
    urls.push(`${cdnUrl}/prayer_times/${locationSlug}/${month}.json`);
  }
  
  // Fallback to local static files
  urls.push(`/prayer_times/${locationSlug}/${month}.json`);
  
  for (const url of urls) {
    try {
      console.log(`🔄 Fetching prayer times from: ${url}`);
      const response = await fetch(url, {
        cache: 'force-cache',
        headers: {
          'Cache-Control': 'max-age=86400' // 24 hours cache
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Successfully fetched ${data.length} prayer time entries from ${url}`);
        return data as StaticPrayerTime[];
      }
      
      console.warn(`⚠️ Failed to fetch from ${url}: ${response.status}`);
    } catch (error) {
      console.warn(`⚠️ Error fetching from ${url}:`, error);
    }
  }
  
  throw new Error(`Failed to fetch prayer times from any source for ${locationSlug}/${month}`);
}

// Get prayer times for a specific date (supports both legacy and new date range format)
export function getPrayerTimesForDate(
  prayerTimes: StaticPrayerTime[], 
  targetDate: Date
): StaticPrayerTime | null {
  const dateString = targetDate.toISOString().split('T')[0] // YYYY-MM-DD
  
  // First try legacy format (exact date match)
  const exactMatch = prayerTimes.find(pt => pt.date === dateString);
  if (exactMatch) return exactMatch;
  
  // Try new date range format (date falls within range)
  return prayerTimes.find(pt => {
    if (pt.date_from && pt.date_to) {
      return dateString >= pt.date_from && dateString <= pt.date_to;
    }
    return false;
  }) || null;
}

// Get date range for current selection (1-5, 6-11, etc.)
export function getDateRangeForDay(day: number): string {
  if (day <= 5) return '1-5'
  if (day <= 11) return '6-11'
  if (day <= 17) return '12-17'
  if (day <= 24) return '18-24'
  return '25-31'
}

// Filter prayer times by date range
export function filterPrayerTimesByRange(
  prayerTimes: StaticPrayerTime[], 
  dateRange: string
): StaticPrayerTime[] {
  const [start, end] = dateRange.split('-').map(n => parseInt(n))
  
  return prayerTimes.filter(pt => {
    const day = parseInt(pt.date.split('-')[2])
    return day >= start && day <= end
  })
}