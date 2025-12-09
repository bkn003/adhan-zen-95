/**
 * Prayer Times Cache Manager
 * Provides aggressive caching with localStorage + memory to minimize Supabase hits
 * Designed to serve millions of users while staying within free tier limits
 */

const CACHE_VERSION = 'v1';
const CACHE_TTL_HOURS = 168; // 7 days cache for better offline support
const CACHE_PREFIX = 'prayer_cache_';

interface CachedPrayerData {
    data: any[];
    timestamp: number;
    locationId: string;
    month: string;
    version: string;
}

// In-memory cache for even faster access
const memoryCache = new Map<string, CachedPrayerData>();

/**
 * Generate cache key for prayer data
 */
export function getCacheKey(locationId: string, month: string): string {
    return `${CACHE_PREFIX}${locationId}_${month}_${CACHE_VERSION}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached: CachedPrayerData): boolean {
    if (cached.version !== CACHE_VERSION) return false;

    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000;

    return cacheAge < maxAge;
}

/**
 * Get prayer data from cache (memory first, then localStorage)
 * @param allowExpired - If true, return expired cache data for offline fallback
 */
export function getPrayerDataFromCache(locationId: string, month: string, allowExpired: boolean = false): any[] | null {
    const key = getCacheKey(locationId, month);

    // Try memory cache first (fastest)
    const memCached = memoryCache.get(key);
    if (memCached && isCacheValid(memCached)) {
        console.log('📦 Cache HIT (memory):', key);
        return memCached.data;
    }

    // Try localStorage
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const cached: CachedPrayerData = JSON.parse(stored);
            if (isCacheValid(cached)) {
                console.log('📦 Cache HIT (localStorage):', key);
                // Restore to memory cache
                memoryCache.set(key, cached);
                return cached.data;
            } else if (allowExpired && cached.data && cached.data.length > 0) {
                // Return expired data for offline fallback - don't delete it
                console.log('📦 Cache EXPIRED but using for offline fallback:', key);
                return cached.data;
            } else {
                console.log('📦 Cache EXPIRED:', key);
                // Don't remove expired data anymore - keep for offline fallback
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }

    console.log('📦 Cache MISS:', key);
    return null;
}

/**
 * Store prayer data in cache (both memory and localStorage)
 */
export function setPrayerDataInCache(locationId: string, month: string, data: any[]): void {
    const key = getCacheKey(locationId, month);

    const cacheEntry: CachedPrayerData = {
        data,
        timestamp: Date.now(),
        locationId,
        month,
        version: CACHE_VERSION,
    };

    // Store in memory cache
    memoryCache.set(key, cacheEntry);

    // Store in localStorage
    try {
        localStorage.setItem(key, JSON.stringify(cacheEntry));
        console.log('📦 Cache SET:', key, `(${data.length} records)`);
    } catch (e) {
        console.warn('Cache write error (storage full?):', e);
        // Try cleaning old entries
        cleanOldCache();
        try {
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch { }
    }
}

/**
 * Cache all prayer data for a location (entire year)
 * This allows complete offline functionality
 */
export function cacheYearData(locationId: string, allMonthsData: Record<string, any[]>): void {
    Object.entries(allMonthsData).forEach(([month, data]) => {
        setPrayerDataInCache(locationId, month, data);
    });
    console.log('📦 Cached entire year data for location:', locationId);
}

/**
 * Get all cached data for offline mode
 */
export function getAllCachedData(): Map<string, any[]> {
    const result = new Map<string, any[]>();

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const cached: CachedPrayerData = JSON.parse(stored);
                    if (isCacheValid(cached)) {
                        result.set(key, cached.data);
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Error reading all cache:', e);
    }

    return result;
}

/**
 * Clean old cache entries to free up space
 */
export function cleanOldCache(): void {
    const keysToRemove: string[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                try {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const cached: CachedPrayerData = JSON.parse(stored);
                        if (!isCacheValid(cached)) {
                            keysToRemove.push(key);
                        }
                    }
                } catch {
                    keysToRemove.push(key!);
                }
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            memoryCache.delete(key);
        });

        if (keysToRemove.length > 0) {
            console.log('📦 Cleaned', keysToRemove.length, 'old cache entries');
        }
    } catch (e) {
        console.warn('Cache cleanup error:', e);
    }
}

/**
 * Preload prayer data for current and next month
 */
export async function preloadPrayerData(
    locationId: string,
    fetchFn: (month: string) => Promise<any[]>
): Promise<void> {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });

    // Get next month
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextMonth = nextDate.toLocaleString('en-US', { month: 'long' });

    // Check if we need to fetch
    const monthsToFetch: string[] = [];

    if (!getPrayerDataFromCache(locationId, currentMonth)) {
        monthsToFetch.push(currentMonth);
    }
    if (!getPrayerDataFromCache(locationId, nextMonth)) {
        monthsToFetch.push(nextMonth);
    }

    // Fetch missing data
    for (const month of monthsToFetch) {
        try {
            const data = await fetchFn(month);
            if (data && data.length > 0) {
                setPrayerDataInCache(locationId, month, data);
            }
        } catch (e) {
            console.warn('Preload failed for', month, e);
        }
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; size: number; hitRate: string } {
    let entries = 0;
    let size = 0;

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                entries++;
                size += localStorage.getItem(key)?.length || 0;
            }
        }
    } catch { }

    return {
        entries,
        size: Math.round(size / 1024), // KB
        hitRate: 'N/A'
    };
}

// Clean old cache on module load
cleanOldCache();
