import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Adaptive timezone watcher.
 * Detects OS-level timezone changes (travel, DST) and significant GPS drift,
 * then invalidates prayer caches and notifies the app to re-schedule.
 */
export function useAdaptiveTimezone() {
  const { toast } = useToast();

  useEffect(() => {
    const currentTz = () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const stored = localStorage.getItem('lastKnownTimezone');
    const tz = currentTz();
    if (!stored) localStorage.setItem('lastKnownTimezone', tz);

    const check = () => {
      const nowTz = currentTz();
      const prev = localStorage.getItem('lastKnownTimezone');
      if (prev && prev !== nowTz) {
        localStorage.setItem('lastKnownTimezone', nowTz);
        // Invalidate caches so prayer times recompute
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('prayer-cache-') || k.startsWith('static-prayer-'))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
        window.dispatchEvent(
          new CustomEvent('timezone-changed', { detail: { from: prev, to: nowTz } })
        );
        toast({
          title: 'Timezone updated',
          description: `Prayer schedule recalculated for ${nowTz.replace(/_/g, ' ')}.`,
        });
      }
    };

    // Poll on visibility change + every 5 minutes
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    const iv = window.setInterval(check, 5 * 60 * 1000);

    // GPS drift check (>50km) on visibility resume
    const onLocation = async () => {
      if (!('geolocation' in navigator)) return;
      const last = localStorage.getItem('lastKnownCoords');
      if (!last) return;
      try {
        const { lat: pLat, lon: pLon } = JSON.parse(last);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const km = haversine(pLat, pLon, latitude, longitude);
            if (km > 50) {
              localStorage.setItem(
                'lastKnownCoords',
                JSON.stringify({ lat: latitude, lon: longitude })
              );
              window.dispatchEvent(
                new CustomEvent('location-drifted', { detail: { km } })
              );
              toast({
                title: 'New location detected',
                description: `You've moved ~${Math.round(km)}km. Refreshing prayer times.`,
              });
            }
          },
          () => {},
          { maximumAge: 60_000, timeout: 8000 }
        );
      } catch {}
    };
    document.addEventListener('visibilitychange', onLocation);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('visibilitychange', onLocation);
      clearInterval(iv);
    };
  }, [toast]);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
