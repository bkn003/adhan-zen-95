import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatTo12Hour } from '@/utils/timeFormat';

const STORED_KEY = 'myMohalla_lastPrayerTimes';

export const usePrayerChangeNotifier = (prayers: any[], mohallaId: string | null) => {
  const notifiedRef = useRef(false);

  // Fetch prayer times for mohalla mosque independently
  const { data: mohallaPrayerData } = useQuery({
    queryKey: ['mohalla-prayer-times', mohallaId],
    queryFn: async () => {
      if (!mohallaId) return null;
      const now = new Date();
      const currentMonth = now.toLocaleString('en-US', { month: 'long' });
      const currentDay = now.getDate();

      const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('location_id', mohallaId)
        .eq('month', currentMonth);

      if (error || !data) return null;

      // Find matching date range
      return data.find(record => {
        const rangeMatch = record.date_range.match(/(\d+)-(\d+)/);
        if (rangeMatch) {
          const startDay = parseInt(rangeMatch[1]);
          const endDay = parseInt(rangeMatch[2]);
          return currentDay >= startDay && currentDay <= endDay;
        }
        return false;
      }) || null;
    },
    enabled: !!mohallaId,
    staleTime: 1000 * 60 * 5, // 5 min
    refetchInterval: 1000 * 60 * 5, // Check every 5 min
  });

  useEffect(() => {
    if (!mohallaId || !mohallaPrayerData || notifiedRef.current) return;

    // Build current prayer times from mohalla data
    const currentPrayers = [
      { name: 'Fajr', adhan: mohallaPrayerData.fajr_adhan, iqamah: mohallaPrayerData.fajr_iqamah },
      { name: 'Zuhr', adhan: mohallaPrayerData.dhuhr_adhan, iqamah: mohallaPrayerData.dhuhr_iqamah },
      { name: 'Asr', adhan: mohallaPrayerData.asr_adhan, iqamah: mohallaPrayerData.asr_iqamah },
      { name: 'Maghrib', adhan: mohallaPrayerData.maghrib_adhan, iqamah: mohallaPrayerData.maghrib_iqamah },
      { name: 'Isha', adhan: mohallaPrayerData.isha_adhan, iqamah: mohallaPrayerData.isha_iqamah },
    ];

    const stored = localStorage.getItem(STORED_KEY);
    if (!stored) {
      // First time - just save
      localStorage.setItem(STORED_KEY, JSON.stringify(currentPrayers));
      return;
    }

    try {
      const oldPrayers = JSON.parse(stored) as { name: string; adhan: string; iqamah: string }[];
      const changes: string[] = [];

      for (const prayer of currentPrayers) {
        const old = oldPrayers.find(p => p.name === prayer.name);
        if (old) {
          if (old.adhan !== prayer.adhan || old.iqamah !== prayer.iqamah) {
            changes.push(
              `${prayer.name}: Adhan ${formatTo12Hour(old.adhan)} → ${formatTo12Hour(prayer.adhan)}, Iqamah ${formatTo12Hour(old.iqamah)} → ${formatTo12Hour(prayer.iqamah)}`
            );
          }
        }
      }

      if (changes.length > 0) {
        notifiedRef.current = true;

        // Send notification
        if ('Notification' in window && Notification.permission === 'granted') {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('🕌 Prayer Times Changed!', {
                body: changes.join('\n'),
                icon: '/app-icon-192.png',
                badge: '/app-icon-192.png',
                tag: 'prayer-time-change',
                requireInteraction: true,
                ...(('vibrate' in Notification.prototype) ? { vibrate: [300, 100, 300] } : {}),
              });
            }).catch(console.error);
          } else {
            new Notification('🕌 Prayer Times Changed!', {
              body: changes.join('\n'),
              icon: '/app-icon-192.png',
            });
          }
        }

        // Save updated times
        localStorage.setItem(STORED_KEY, JSON.stringify(currentPrayers));
      }
    } catch {}
  }, [mohallaPrayerData, mohallaId]);
};