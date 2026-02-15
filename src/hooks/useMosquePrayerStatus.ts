import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MosquePrayerStatus {
  locationId: string;
  nextIqamahTime: string | null; // HH:MM:SS format
  nextPrayerName: string | null;
  status: 'not_started' | 'completed' | 'unknown';
}

function getCurrentDateRange(): { month: string; dateRange: string } {
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[now.getMonth()];

  let dateRange: string;
  if (day <= 5) dateRange = '1-5';
  else if (day <= 11) dateRange = '6-11';
  else if (day <= 17) dateRange = '12-17';
  else if (day <= 23) dateRange = '18-23';  
  else dateRange = '24-31';

  return { month, dateRange };
}

function getNextIqamah(prayerTime: any): { time: string; name: string; status: 'not_started' | 'completed' } {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

  const prayers = [
    { name: 'Fajr', time: prayerTime.fajr_iqamah },
    { name: 'Zuhr', time: prayerTime.dhuhr_iqamah },
    { name: 'Asr', time: prayerTime.asr_iqamah },
    { name: 'Maghrib', time: prayerTime.maghrib_iqamah },
    { name: 'Isha', time: prayerTime.isha_iqamah },
  ];

  // Find first prayer that hasn't started yet
  for (const prayer of prayers) {
    if (prayer.time && prayer.time > currentTime) {
      return { time: prayer.time, name: prayer.name, status: 'not_started' };
    }
  }

  // All prayers completed for today
  return { time: prayers[prayers.length - 1]?.time || '23:59:00', name: 'Isha', status: 'completed' };
}

export const useMosquePrayerStatus = (locationIds: string[]) => {
  const { month, dateRange } = getCurrentDateRange();

  return useQuery({
    queryKey: ['mosque-prayer-status', month, dateRange, locationIds.join(',')],
    queryFn: async (): Promise<Record<string, MosquePrayerStatus>> => {
      if (locationIds.length === 0) return {};

      const { data, error } = await supabase
        .from('prayer_times')
        .select('location_id, fajr_iqamah, dhuhr_iqamah, asr_iqamah, maghrib_iqamah, isha_iqamah')
        .in('location_id', locationIds)
        .eq('month', month)
        .ilike('date_range', `${dateRange}%`);

      if (error) {
        console.error('Error fetching prayer status:', error);
        return {};
      }

      const statusMap: Record<string, MosquePrayerStatus> = {};

      for (const pt of data || []) {
        if (!pt.location_id) continue;
        const { time, name, status } = getNextIqamah(pt);
        statusMap[pt.location_id] = {
          locationId: pt.location_id,
          nextIqamahTime: time,
          nextPrayerName: name,
          status,
        };
      }

      return statusMap;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: locationIds.length > 0,
  });
};
