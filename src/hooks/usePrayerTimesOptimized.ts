import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Location } from '@/types/prayer.types';
interface PrayerTimesResponse {
  location: {
    id: string;
    name: string;
    district: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  range: string;
  month: string;
  times: any[];
}

export const usePrayerTimesOptimized = (locationId: string, date: Date) => {
  const getDateRange = (day: number): string => {
    if (day <= 5) return '1-5';
    if (day <= 11) return '6-11';
    if (day <= 17) return '12-17';
    if (day <= 24) return '18-24';
    return '25-31';
  };

  const range = getDateRange(date.getDate());
  const monthName = format(date, 'LLLL'); // e.g., "September"
  const monthAbbrev = format(date, 'LLL'); // e.g., "Sep"
  const compositeRange = `${range} ${monthAbbrev}`;
  return useQuery({
    queryKey: ['prayer-times-optimized', locationId, range, monthName],
    queryFn: async (): Promise<PrayerTimesResponse> => {
      // First get the location name
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('mosque_name')
        .eq('id', locationId)
        .single();

      if (locationError || !location) {
        throw new Error('Location not found');
      }

      // Check if we're running locally or in production
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('lovable.app');
      
      if (isLocal) {
        // Use direct Supabase query for development
        const { data: prayerTimes, error } = await supabase
          .from('prayer_times')
          .select('*')
          .eq('location_id', locationId)
          .eq('month', monthName)
          .ilike('date_range', `${range}%`);

        if (error) {
          throw error;
        }

        return {
          location: {
            id: locationId,
            name: location.mosque_name,
            district: '',
            coordinates: { latitude: 0, longitude: 0 }
          },
          range,
          month: monthName,
          times: prayerTimes || []
        };
      } else {
        // Use Edge Function for production
        const response = await supabase.functions.invoke('prayer-times', {
          body: {
            location: location.mosque_name,
            range,
            month: monthName,
          }
        });

        if (response.error) {
          throw response.error;
        }

        return response.data;
      }
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    enabled: !!locationId,
  });
};