import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatTo12Hour } from '@/utils/timeFormat';
import { showWebNotification } from '@/utils/webNotify';

const STORED_KEY = 'myMohalla_lastPrayerTimes';

export const usePrayerChangeNotifier = (prayers: any[], mohallaId: string | null) => {
  const notifiedRef = useRef(false);

  // Fetch mosque name
  const { data: mosqueName } = useQuery({
    queryKey: ['mohalla-name', mohallaId],
    queryFn: async () => {
      if (!mohallaId) return null;
      const { data } = await supabase
        .from('locations')
        .select('mosque_name')
        .eq('id', mohallaId)
        .single();
      return data?.mosque_name || null;
    },
    enabled: !!mohallaId,
    staleTime: Infinity,
  });

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
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!mohallaId || !mohallaPrayerData || notifiedRef.current) return;

    // Build current prayer times from mohalla data including Ramadan fields
    const currentPrayers = [
      { name: 'Fajr', adhan: mohallaPrayerData.fajr_adhan, iqamah: mohallaPrayerData.fajr_iqamah },
      { name: 'Zuhr', adhan: mohallaPrayerData.dhuhr_adhan, iqamah: mohallaPrayerData.dhuhr_iqamah },
      { name: 'Asr', adhan: mohallaPrayerData.asr_adhan, iqamah: mohallaPrayerData.asr_iqamah },
      { name: 'Maghrib', adhan: mohallaPrayerData.maghrib_adhan, iqamah: mohallaPrayerData.maghrib_iqamah },
      { name: 'Isha', adhan: mohallaPrayerData.isha_adhan, iqamah: mohallaPrayerData.isha_iqamah },
    ];

    // Add Ramadan-specific fields if present
    const ramadanFields: { name: string; value: string | null }[] = [
      { name: 'Tharaweeh', value: mohallaPrayerData.tharaweeh },
      { name: 'Sahar End', value: mohallaPrayerData.sahar_end },
      { name: 'Iftar', value: (mohallaPrayerData as any).ifthar_time },
    ];

    const stored = localStorage.getItem(STORED_KEY);
    if (!stored) {
      localStorage.setItem(STORED_KEY, JSON.stringify({ prayers: currentPrayers, ramadan: ramadanFields }));
      return;
    }

    try {
      const oldData = JSON.parse(stored);
      const oldPrayers = oldData.prayers || oldData; // backward compat
      const oldRamadan = oldData.ramadan || [];
      const changes: string[] = [];

      for (const prayer of currentPrayers) {
        const old = (oldPrayers as any[]).find((p: any) => p.name === prayer.name);
        if (old) {
          if (old.adhan !== prayer.adhan || old.iqamah !== prayer.iqamah) {
            changes.push(
              `${prayer.name}: Azaan ${formatTo12Hour(old.adhan)} → ${formatTo12Hour(prayer.adhan)}, Iqamah ${formatTo12Hour(old.iqamah)} → ${formatTo12Hour(prayer.iqamah)}`
            );
          }
        }
      }

      // Check Ramadan field changes
      for (const field of ramadanFields) {
        if (!field.value) continue;
        const oldField = (oldRamadan as any[]).find((f: any) => f.name === field.name);
        if (oldField && oldField.value && oldField.value !== field.value) {
          changes.push(
            `${field.name}: ${formatTo12Hour(oldField.value)} → ${formatTo12Hour(field.value)}`
          );
        }
      }

      if (changes.length > 0) {
        notifiedRef.current = true;

        const title = `🕌 Prayer Times Changed!`;
        const mosqueLabel = mosqueName ? `At ${mosqueName}:\n` : '';
        const body = mosqueLabel + changes.join('\n');

        // Send notification
        if ('Notification' in window && Notification.permission === 'granted') {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(title, {
                body,
                icon: '/app-icon-192.png',
                badge: '/app-icon-192.png',
                tag: 'prayer-time-change',
                requireInteraction: true,
                ...(('vibrate' in Notification.prototype) ? { vibrate: [300, 100, 300] } : {}),
              });
            }).catch(console.error);
          } else {
            void showWebNotification(title, { body, icon: '/app-icon-192.png' });
          }
        }

        // Save updated times
        localStorage.setItem(STORED_KEY, JSON.stringify({ prayers: currentPrayers, ramadan: ramadanFields }));
      }
    } catch {}
  }, [mohallaPrayerData, mohallaId, mosqueName]);
};
