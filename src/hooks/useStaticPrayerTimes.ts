import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { Location, Prayer, ForbiddenTime } from '@/types/prayer.types'
import { 
  createLocationSlug, 
  getMonthString, 
  fetchStaticPrayerTimes, 
  getPrayerTimesForDate,
  type StaticPrayerTime 
} from '@/utils/staticPrayerTimes'

interface StaticPrayerTimesResponse {
  location: {
    id: string
    name: string
    district: string
    coordinates: {
      latitude: number
      longitude: number
    }
  }
  range: string
  month: string
  times: StaticPrayerTime[]
}

export const useStaticPrayerTimes = (locationId: string, date: Date, locationData?: Location) => {
  const getDateRange = (day: number): string => {
    if (day <= 5) return '1-5'
    if (day <= 11) return '6-11'
    if (day <= 17) return '12-17'
    if (day <= 24) return '18-24'
    return '25-31'
  }

  const range = getDateRange(date.getDate())
  const monthString = getMonthString(date)
  const locationSlug = locationData ? createLocationSlug(locationData.mosque_name) : ''

  return useQuery({
    queryKey: ['static-prayer-times', locationId, monthString, locationSlug],
    queryFn: async (): Promise<StaticPrayerTimesResponse> => {
      if (!locationData) {
        throw new Error('Location data not available')
      }

      // Fetch static prayer times from JSON file
      const prayerTimes = await fetchStaticPrayerTimes(locationSlug, monthString)

      return {
        location: {
          id: locationId,
          name: locationData.mosque_name,
          district: locationData.district,
          coordinates: {
            latitude: Number(locationData.latitude),
            longitude: Number(locationData.longitude)
          }
        },
        range,
        month: format(date, 'LLLL'),
        times: prayerTimes
      }
    },
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - much longer cache
    gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days - keep in memory longer
    enabled: !!locationId && !!locationData && !!locationSlug,
    retry: (failureCount, error) => {
      // If static file fails, we could fallback to the original optimized hook
      console.error('Static prayer times fetch failed:', error)
      return failureCount < 2
    }
  })
}

// Convert static prayer time to Prayer object for compatibility
export function convertToPrayerObject(
  staticPrayerTime: StaticPrayerTime,
  isRamadan: boolean = false,
  showSahar: boolean = false
): Prayer[] {
  const prayers: Prayer[] = []

  // Fajr
  prayers.push({
    name: 'Fajr',
    adhan: staticPrayerTime.fajr,
    iqamah: isRamadan && staticPrayerTime.fajr_ramadan_iqamah 
      ? staticPrayerTime.fajr_ramadan_iqamah 
      : staticPrayerTime.fajr_iqamah || staticPrayerTime.fajr,
    type: 'fajr'
  })

  // Dhuhr (or Jummah on Friday)
  const today = new Date(staticPrayerTime.date)
  const isFriday = today.getDay() === 5

  if (isFriday && staticPrayerTime.jummah_adhan) {
    prayers.push({
      name: 'Jummah',
      adhan: staticPrayerTime.jummah_adhan,
      iqamah: staticPrayerTime.jummah_iqamah || staticPrayerTime.jummah_adhan,
      type: 'jummah'
    })
  } else {
    prayers.push({
      name: 'Dhuhr',
      adhan: staticPrayerTime.dhuhr,
      iqamah: staticPrayerTime.dhuhr_iqamah || staticPrayerTime.dhuhr,
      type: 'dhuhr'
    })
  }

  // Asr
  prayers.push({
    name: 'Asr',
    adhan: staticPrayerTime.asr,
    iqamah: staticPrayerTime.asr_iqamah || staticPrayerTime.asr,
    type: 'asr'
  })

  // Maghrib
  prayers.push({
    name: 'Maghrib',
    adhan: isRamadan && staticPrayerTime.maghrib_ramadan_adhan 
      ? staticPrayerTime.maghrib_ramadan_adhan 
      : staticPrayerTime.maghrib,
    iqamah: staticPrayerTime.maghrib_iqamah || staticPrayerTime.maghrib,
    type: 'maghrib'
  })

  // Isha
  prayers.push({
    name: 'Isha',
    adhan: staticPrayerTime.isha,
    iqamah: isRamadan && staticPrayerTime.isha_ramadan_iqamah 
      ? staticPrayerTime.isha_ramadan_iqamah 
      : staticPrayerTime.isha_iqamah || staticPrayerTime.isha,
    type: 'isha'
  })

  // Tarawih during Ramadan
  if (isRamadan && staticPrayerTime.tharaweeh) {
    prayers.push({
      name: 'Tharaweeh',
      adhan: staticPrayerTime.tharaweeh,
      iqamah: staticPrayerTime.tharaweeh,
      type: 'tarawih'
    })
  }

  // Sahar End during Ramadan if enabled
  if (isRamadan && showSahar && staticPrayerTime.sahar_end) {
    prayers.unshift({
      name: 'Sahar End',
      adhan: staticPrayerTime.sahar_end,
      iqamah: staticPrayerTime.sahar_end,
      type: 'fajr' // Using fajr type for timing logic
    })
  }

  // Iftar during Ramadan
  if (isRamadan && staticPrayerTime.ifthar_time) {
    const iftarIndex = prayers.findIndex(p => p.type === 'maghrib')
    if (iftarIndex > -1) {
      prayers.splice(iftarIndex, 0, {
        name: 'Iftar',
        adhan: staticPrayerTime.ifthar_time,
        iqamah: staticPrayerTime.ifthar_time,
        type: 'maghrib'
      })
    }
  }

  return prayers
}

// Create forbidden times from static data
export function createForbiddenTimes(staticPrayerTime: StaticPrayerTime): ForbiddenTime[] {
  const forbiddenTimes: ForbiddenTime[] = []

  if (staticPrayerTime.sun_rise) {
    forbiddenTimes.push({
      name: 'Sunrise',
      time: staticPrayerTime.sun_rise,
      type: 'sunrise'
    })
  }

  if (staticPrayerTime.mid_noon) {
    forbiddenTimes.push({
      name: 'Noon',
      time: staticPrayerTime.mid_noon,
      type: 'noon'
    })
  }

  if (staticPrayerTime.sun_set) {
    forbiddenTimes.push({
      name: 'Sunset',
      time: staticPrayerTime.sun_set,
      type: 'sunset'
    })
  }

  return forbiddenTimes
}