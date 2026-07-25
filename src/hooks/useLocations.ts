
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadCachedLocations, cacheLocations } from '@/storage/prayerStore';
import type { Location } from '@/types/prayer.types';

export const useLocations = (options?: { includePaused?: boolean }) => {
  return useQuery({
    queryKey: ['locations', options?.includePaused],
    queryFn: async (): Promise<Location[]> => {
      try {
        let query = supabase
          .from('locations')
          .select('id, mosque_name, district, latitude, longitude, sahar_food_availability, sahar_food_contact_number, sahar_food_time, women_prayer_hall, parking_available, ac_available, wheelchair_accessible, mosque_capacity, is_paused, created_at, updated_at')
          .order('mosque_name');

        if (!options?.includePaused) {
          query = query.not('is_paused', 'eq', true);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Cache locations for offline use
        if (data && data.length > 0) {
          cacheLocations(data).catch(console.error);
        }

        return data || [];
      } catch (error) {
        console.error('Error fetching locations from Supabase:', error);

        // Fallback to cached locations when offline
        console.log('📦 Attempting to load cached locations for offline use...');
        const cachedLocations = await loadCachedLocations();

        if (cachedLocations && cachedLocations.length > 0) {
          console.log('✅ Loaded', cachedLocations.length, 'cached locations');
          return cachedLocations as Location[];
        }

        // If no cache available, throw the original error
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1, // Only retry once before falling back
    networkMode: 'offlineFirst',
  });
};
