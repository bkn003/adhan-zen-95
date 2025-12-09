
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadCachedLocations, cacheLocations } from '@/storage/prayerStore';
import type { Location } from '@/types/prayer.types';

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('mosque_name');

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
