import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to Supabase Realtime channels for `locations` and `prayer_times`.
 * Any INSERT / UPDATE / DELETE event automatically invalidates the relevant
 * React Query caches so every open tab picks up changes instantly.
 */
export const useRealtimeSync = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        // ---- locations channel ----
        const locationsChannel = supabase
            .channel('realtime-locations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'locations' },
                () => {
                    console.log('🔄 Realtime: locations changed — invalidating caches');
                    queryClient.invalidateQueries({ queryKey: ['locations'] });
                    queryClient.invalidateQueries({ queryKey: ['mosque-prayer-status'] });
                }
            )
            .subscribe();

        // ---- prayer_times channel ----
        const prayerTimesChannel = supabase
            .channel('realtime-prayer-times')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'prayer_times' },
                () => {
                    console.log('🔄 Realtime: prayer_times changed — invalidating caches');
                    queryClient.invalidateQueries({ queryKey: ['prayer-times'] });
                    queryClient.invalidateQueries({ queryKey: ['static-prayer-times'] });
                    queryClient.invalidateQueries({ queryKey: ['prayer-times-optimized'] });
                    queryClient.invalidateQueries({ queryKey: ['mosque-prayer-status'] });
                    queryClient.invalidateQueries({ queryKey: ['mohalla-prayer-times'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(locationsChannel);
            supabase.removeChannel(prayerTimesChannel);
        };
    }, [queryClient]);
};
