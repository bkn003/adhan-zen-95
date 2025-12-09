
import { useQuery } from '@tanstack/react-query';
import type { HijriDate } from '@/types/prayer.types';

const HIJRI_CACHE_PREFIX = 'hijri_date_cache_';
const HIJRI_CACHE_VERSION = 'v1';

interface CachedHijriDate {
  data: HijriDate;
  timestamp: number;
  version: string;
}

/**
 * Get cached Hijri date from localStorage
 */
function getCachedHijriDate(dateKey: string): HijriDate | null {
  try {
    const cacheKey = `${HIJRI_CACHE_PREFIX}${dateKey}_${HIJRI_CACHE_VERSION}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: CachedHijriDate = JSON.parse(cached);
      // Cache is valid for 30 days (Hijri date for a Gregorian date rarely changes)
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp < maxAge && parsed.version === HIJRI_CACHE_VERSION) {
        console.log('📦 Hijri date cache HIT:', dateKey);
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('Failed to read Hijri cache:', e);
  }
  return null;
}

/**
 * Store Hijri date in localStorage cache
 */
function setCachedHijriDate(dateKey: string, data: HijriDate): void {
  try {
    const cacheKey = `${HIJRI_CACHE_PREFIX}${dateKey}_${HIJRI_CACHE_VERSION}`;
    const cacheEntry: CachedHijriDate = {
      data,
      timestamp: Date.now(),
      version: HIJRI_CACHE_VERSION,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    console.log('💾 Hijri date cached:', dateKey);
  } catch (e) {
    console.warn('Failed to cache Hijri date:', e);
  }
}

export const useHijriDate = (selectedDate?: Date) => {
  // Get user's Hijri adjustment setting (default -1)
  const getHijriAdjustment = () => {
    const saved = localStorage.getItem('hijriAdjustment');
    return saved !== null ? parseInt(saved) : -1;
  };

  return useQuery({
    queryKey: ['hijriDate', selectedDate?.toISOString(), getHijriAdjustment()],
    queryFn: async (): Promise<HijriDate> => {
      const baseDate = selectedDate || new Date();
      const adj = getHijriAdjustment();
      const adjustedGregorian = new Date(baseDate);
      adjustedGregorian.setDate(adjustedGregorian.getDate() + adj);

      const dd = String(adjustedGregorian.getDate()).padStart(2, '0');
      const mm = String(adjustedGregorian.getMonth() + 1).padStart(2, '0');
      const yyyy = adjustedGregorian.getFullYear();
      const dateStr = `${dd}-${mm}-${yyyy}`; // DD-MM-YYYY
      const cacheKey = `${dateStr}_adj${adj}`;

      // Check cache first (for offline support)
      const cached = getCachedHijriDate(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        let response = await fetch(`https://api.aladhan.com/v1/gToH/${dateStr}`);
        let data = await response.json();

        // Fallback: try query param format if path param fails
        if (data.code !== 200) {
          response = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
          data = await response.json();
        }

        if (data.code === 200 && data.data) {
          const hijri = data.data.hijri;

          const result: HijriDate = {
            date: hijri.day,
            month: hijri.month.en,
            year: hijri.year,
            designation: hijri.designation.abbreviated,
            adjustedDate: `${hijri.day} ${hijri.month.en} ${hijri.year}`,
            monthNumber: hijri.month.number
          };

          // Cache successful response for offline use
          setCachedHijriDate(cacheKey, result);

          return result;
        }

        throw new Error('Failed to fetch Hijri date');
      } catch (error) {
        console.error('Error fetching Hijri date:', error);

        // Try to use any cached data (even if expired) when offline
        const anyCache = getCachedHijriDate(cacheKey);
        if (anyCache) {
          console.log('📦 Using expired Hijri cache for offline fallback');
          return anyCache;
        }

        // Fallback to static date as last resort
        const fallbackDay = adjustedGregorian.getDate();
        return {
          date: fallbackDay.toString(),
          month: 'Rabi al-Awwal',
          year: '1447',
          designation: 'AH',
          adjustedDate: `${fallbackDay} Rabi al-Awwal 1447`,
          monthNumber: 3
        };
      }
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    networkMode: 'offlineFirst', // Try cache first when offline
  });
};
