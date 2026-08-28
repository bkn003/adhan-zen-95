import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { showWebNotification } from '@/utils/webNotify';
import { inQuietHours } from '@/utils/quietHours';
import {
  loadPrayerNotificationPrefs,
  isEnabled,
  isPeriodEnabled,
} from '@/native/prayerNotificationPrefs';
import type { Prayer } from '@/types/prayer.types';

const FIRED_KEY = 'nextPrayerReminderFired';

const todayKey = () => new Date().toISOString().slice(0, 10);

const loadFired = (): Record<string, true> => {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
    return raw.day === todayKey() ? raw.keys || {} : {};
  } catch {
    return {};
  }
};

const saveFired = (keys: Record<string, true>) => {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ day: todayKey(), keys }));
  } catch {
    /* ignore */
  }
};

/** "05:30" / "05:30:00" → minutes since midnight (null when unparsable). */
const toMinutes = (t?: string | null): number | null => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/**
 * In-app / PWA reminders driven by the same countdown the home screen shows.
 * Fires a heads-up notification `preMinutes` before adhan (user-configurable in
 * Settings → Reminders), plus alerts at adhan and iqamah. Native builds are
 * skipped — Android schedules exact alarms itself.
 */
export const useNextPrayerReminder = (nextPrayer?: Prayer | null, mosqueName?: string) => {
  const fired = useRef<Record<string, true>>(loadFired());

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!nextPrayer) return;

    const check = () => {
      const prefs = loadPrayerNotificationPrefs();
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (inQuietHours(now)) return;

      const adhanMin = toMinutes(nextPrayer.adhan);
      const iqamahMin = toMinutes(nextPrayer.iqamah);
      const lead = Math.max(0, Number(prefs.preMinutes) || 0);
      const suffix = mosqueName ? ` • ${mosqueName}` : '';

      const fire = async (key: string, title: string, body: string) => {
        if (fired.current[key]) return;
        fired.current[key] = true;
        saveFired(fired.current);
        await showWebNotification(title, { body, icon: '/app-icon-192.png', tag: key });
      };

      // Heads-up before adhan
      if (
        adhanMin !== null &&
        lead > 0 &&
        isPeriodEnabled(prefs, 'preReminder') &&
        isEnabled(prefs, nextPrayer.type, 'adhan')
      ) {
        const diff = adhanMin - nowMin;
        if (diff <= lead && diff >= 0) {
          void fire(
            `pre-${todayKey()}-${nextPrayer.type}`,
            `${nextPrayer.name} in ${diff === 0 ? 'a moment' : `${diff} min`}`,
            `Adhan at ${nextPrayer.adhan}${suffix}`,
          );
        }
      }

      // At adhan
      if (adhanMin !== null && isEnabled(prefs, nextPrayer.type, 'adhan') && nowMin === adhanMin) {
        void fire(
          `adhan-${todayKey()}-${nextPrayer.type}`,
          `${nextPrayer.name} adhan`,
          `It's time for ${nextPrayer.name}${suffix}`,
        );
      }

      // At iqamah (jamaat)
      if (iqamahMin !== null && isEnabled(prefs, nextPrayer.type, 'iqamah') && nowMin === iqamahMin) {
        void fire(
          `iqamah-${todayKey()}-${nextPrayer.type}`,
          `${nextPrayer.name} jamaat`,
          `Jamaat starting now${suffix}`,
        );
      }
    };

    check();
    const id = window.setInterval(check, 20_000);
    return () => window.clearInterval(id);
  }, [nextPrayer?.type, nextPrayer?.adhan, nextPrayer?.iqamah, mosqueName]);
};
