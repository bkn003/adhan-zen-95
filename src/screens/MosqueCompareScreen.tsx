import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, ArrowRightLeft, Check } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import {
  createLocationSlug,
  getMonthString,
  fetchStaticPrayerTimes,
  getPrayerTimesForDate,
  type StaticPrayerTime,
} from '@/utils/staticPrayerTimes';
import { formatTo12Hour } from '@/utils/timeFormat';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MosqueCompareScreenProps {
  onBack: () => void;
}

const PRAYERS: { key: keyof StaticPrayerTime; iqamah: keyof StaticPrayerTime; label: string }[] = [
  { key: 'fajr', iqamah: 'fajr_iqamah', label: 'Fajr' },
  { key: 'dhuhr', iqamah: 'dhuhr_iqamah', label: 'Zuhr' },
  { key: 'asr', iqamah: 'asr_iqamah', label: 'Asr' },
  { key: 'maghrib', iqamah: 'maghrib_iqamah', label: 'Maghrib' },
  { key: 'isha', iqamah: 'isha_iqamah', label: 'Isha' },
];

const toMinutes = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const fmt = (t?: string) => (t ? formatTo12Hour(t) : '—');

const dbRange = (day: number) => {
  if (day <= 5) return '1-5';
  if (day <= 11) return '6-11';
  if (day <= 17) return '12-17';
  if (day <= 24) return '18-24';
  return '25-31';
};

const trim = (t?: string | null) => (t ? String(t).slice(0, 5) : undefined);

/** Fallback for mosques whose CDN JSON isn't generated yet. */
async function fetchFromSupabase(locationId: string, date: Date): Promise<StaticPrayerTime | null> {
  try {
    const { data } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('location_id', locationId)
      .eq('month', format(date, 'LLLL'))
      .ilike('date_range', `${dbRange(date.getDate())}%`)
      .limit(1);
    const r = data?.[0];
    if (!r) return null;
    return {
      date: format(date, 'yyyy-MM-dd'),
      fajr: trim(r.fajr_adhan),
      fajr_iqamah: trim(r.fajr_iqamah),
      dhuhr: trim(r.dhuhr_adhan),
      dhuhr_iqamah: trim(r.dhuhr_iqamah),
      asr: trim(r.asr_adhan),
      asr_iqamah: trim(r.asr_iqamah),
      maghrib: trim(r.maghrib_adhan),
      maghrib_iqamah: trim(r.maghrib_iqamah),
      isha: trim(r.isha_adhan),
      isha_iqamah: trim(r.isha_iqamah),
    } as unknown as StaticPrayerTime;
  } catch {
    return null;
  }
}

export const MosqueCompareScreen: React.FC<MosqueCompareScreenProps> = ({ onBack }) => {
  const { data: locations = [], isLoading } = useLocations();
  const [selected, setSelected] = useState<string[]>(() => {
    const mine = localStorage.getItem('selectedLocationId');
    return mine ? [mine] : [];
  });
  const [times, setTimes] = useState<Record<string, StaticPrayerTime | null>>({});
  const [loadingTimes, setLoadingTimes] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;
    const known = new Set(locations.map((l) => l.id));
    if (locations.length > 0 && selected.some((id) => !known.has(id))) {
      setSelected((prev) => prev.filter((id) => known.has(id)));
      return;
    }
    const missing = selected.filter((id) => !(id in times));
    if (missing.length === 0) return;
    setLoadingTimes(true);
    (async () => {
      const next: Record<string, StaticPrayerTime | null> = {};
      await Promise.all(
        missing.map(async (id) => {
          const loc = locations.find((l) => l.id === id);
          if (!loc) {
            next[id] = null;
            return;
          }
          const slug = createLocationSlug(loc.mosque_name);
          const month = getMonthString(today);
          let row: StaticPrayerTime | null = null;
          try {
            const all = await fetchStaticPrayerTimes(slug, month);
            row = getPrayerTimesForDate(all, today);
          } catch {
            row = null;
          }
          if (!row) {
            // CDN miss: reuse the app's localStorage cache, then Supabase
            try {
              const raw = localStorage.getItem(`pt:${slug}:${month}`);
              const cached = raw ? (JSON.parse(raw).times as StaticPrayerTime[]) : null;
              row = cached ? getPrayerTimesForDate(cached, today) : null;
            } catch {
              row = null;
            }
          }
          if (!row) row = await fetchFromSupabase(id, today);
          next[id] = row;
        })
      );
      if (!cancelled) {
        setTimes((prev) => ({ ...prev, ...next }));
        setLoadingTimes(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, locations, times, today]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const chosen = selected.map((id) => locations.find((l) => l.id === id)).filter(Boolean) as typeof locations;
  const baseId = selected[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-white pb-24">
      <div className="sticky top-0 z-20 bg-gradient-to-r from-indigo-700 to-sky-700 text-primary-foreground px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:scale-95" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Compare Mosques
            </h1>
            <p className="text-[11px] opacity-80">Today&apos;s prayer-time differences · up to 4 mosques</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Picker */}
        <div className="rounded-2xl bg-card border border-border p-3 shadow-sm">
          <h2 className="text-sm font-bold mb-2">Select mosques</h2>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {locations.map((l) => {
                const on = selected.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggle(l.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left active:scale-[0.99] ${
                      on ? 'bg-indigo-50 border-indigo-300' : 'bg-muted border-transparent'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold truncate">{l.mosque_name}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">{l.district}</span>
                    </span>
                    {on && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            The first mosque you pick is the baseline; differences are shown against it.
          </p>
        </div>

        {/* Comparison */}
        {chosen.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Pick at least one mosque to compare.</p>
        ) : loadingTimes ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-sky-600 text-primary-foreground">
                  <th className="text-left px-3 py-2 font-semibold">Prayer</th>
                  {chosen.map((l) => (
                    <th key={l.id} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                      {l.mosque_name}
                      {l.id === baseId && <span className="ml-1 opacity-80">(base)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRAYERS.map((p, idx) => {
                  const baseAdhan = toMinutes(times[baseId]?.[p.key] as string | undefined);
                  return (
                    <tr key={p.label} className={idx % 2 ? 'bg-muted/40' : ''}>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{p.label}</td>
                      {chosen.map((l) => {
                        const row = times[l.id];
                        const adhan = row?.[p.key] as string | undefined;
                        const iqamah = row?.[p.iqamah] as string | undefined;
                        const mins = toMinutes(adhan);
                        const diff = baseAdhan !== null && mins !== null ? mins - baseAdhan : null;
                        return (
                          <td key={l.id} className="px-3 py-2 whitespace-nowrap">
                            <span className="block font-medium">{fmt(adhan)}</span>
                            <span className="block text-[10px] text-muted-foreground">Iqamah {fmt(iqamah)}</span>
                            {l.id !== baseId && diff !== null && (
                              <span
                                className={`inline-block mt-0.5 text-[10px] font-bold ${
                                  diff === 0
                                    ? 'text-muted-foreground'
                                    : diff > 0
                                    ? 'text-orange-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {diff === 0 ? 'same' : `${diff > 0 ? '+' : ''}${diff} min`}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
