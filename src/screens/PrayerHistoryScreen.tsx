import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, History, ChevronLeft, ChevronRight, Moon, Loader2, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LocationSelector } from '@/components/LocationSelector';
import { useLocations } from '@/hooks/useLocations';
import { getHijriMonthLabel } from '@/utils/hijriMonth';
import { rangeLabel } from '@/utils/prayerExport';
import { formatTo12Hour } from '@/utils/timeFormat';
import type { Location } from '@/types/prayer.types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const t12 = (v?: string | null) => (v ? formatTo12Hour(v.slice(0, 5)) : '—');
const rangeStart = (dr: string) => Number(dr.split('-')[0]) || 0;

/** Past prayer times for the selected mosque, with Hijri labels and a Ramadan filter. */
export const PrayerHistoryScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { data: locations } = useLocations();
  const [location, setLocation] = useState<Location | null>(null);
  const now = new Date();
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [ramadanOnly, setRamadanOnly] = useState(false);
  const [hijriLabel, setHijriLabel] = useState('');
  const year = now.getFullYear();
  const month = MONTHS[monthIndex];

  useEffect(() => {
    if (location || !locations?.length) return;
    const saved = localStorage.getItem('selectedLocationId');
    setLocation(locations.find((l) => l.id === saved) ?? locations[0]);
  }, [locations, location]);

  useEffect(() => {
    let cancelled = false;
    getHijriMonthLabel(monthIndex, year).then((l) => { if (!cancelled) setHijriLabel(l); });
    return () => { cancelled = true; };
  }, [monthIndex, year]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['prayer-history', location?.id, month],
    enabled: !!location?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('location_id', location!.id)
        .eq('month', month);
      if (error) throw error;
      return (data ?? []).sort((a, b) => rangeStart(a.date_range) - rangeStart(b.date_range));
    },
  });

  const visible = useMemo(() => {
    if (!rows) return [];
    if (!ramadanOnly) return rows;
    return rows.filter((r: any) => r.sahar_end || r.ifthar_time || r.tharaweeh || r.fajr_ramadan_iqamah);
  }, [rows, ramadanOnly]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 pb-28">
      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-indigo-700 px-3.5 py-3 shadow-md">
        <button onClick={onBack} className="p-1.5 bg-white/15 rounded-lg" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <History className="w-4 h-4 text-white" />
        <h2 className="text-base font-bold text-white">Prayer Time History</h2>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm space-y-2">
          <LocationSelector selectedLocation={location} onLocationChange={setLocation} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthIndex((m) => (m + 11) % 12)}
              className="p-1.5 rounded-lg bg-gray-50 border border-gray-200"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-800">{month} {year}</p>
              <p className="text-[10px] text-gray-500 truncate">{hijriLabel || 'Hijri dates loading…'}</p>
            </div>
            <button
              onClick={() => setMonthIndex((m) => (m + 1) % 12)}
              className="p-1.5 rounded-lg bg-gray-50 border border-gray-200"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <button
            onClick={() => setRamadanOnly((v) => !v)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition ${
              ramadanOnly
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            {ramadanOnly ? 'Showing Ramadan ranges only' : 'Filter Ramadan ranges'}
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <div className="text-center py-14">
            <CalendarDays className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No timings stored for {month}</p>
            <p className="text-xs text-gray-500 mt-1 px-8">
              {ramadanOnly
                ? 'This month has no Ramadan-specific timings published.'
                : 'The mosque admin has not published this month yet.'}
            </p>
          </div>
        )}

        {visible.map((r: any) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100 flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">
                {rangeLabel(r.date_range, monthIndex, year)} {month}
              </span>
              {(r.sahar_end || r.ifthar_time) && (
                <span className="ml-auto text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                  Ramadan
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3">
              {([
                ['Fajr', r.fajr_adhan, r.fajr_iqamah],
                ['Zuhr', r.dhuhr_adhan, r.dhuhr_iqamah],
                ['Asr', r.asr_adhan, r.asr_iqamah],
                ['Maghrib', r.maghrib_adhan, r.maghrib_iqamah],
                ['Isha', r.isha_adhan, r.isha_iqamah],
                ['Jummah', r.jummah_adhan, r.jummah_iqamah],
              ] as [string, string | null, string | null][]).map(([name, adhan, iqamah]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">{name}</span>
                  <span className="text-gray-500">
                    {t12(adhan)} <span className="text-gray-300">/</span>{' '}
                    <span className="text-emerald-600 font-semibold">{t12(iqamah)}</span>
                  </span>
                </div>
              ))}
            </div>
            {(r.sahar_end || r.ifthar_time || r.tharaweeh) && (
              <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                {([
                  ['Sahar ends', r.sahar_end],
                  ['Iftar', r.ifthar_time],
                  ['Taraweeh', r.tharaweeh],
                ] as [string, string | null][]).map(([label, v]) => (
                  <div key={label} className="bg-violet-50 rounded-xl px-2 py-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-violet-500 font-bold">{label}</p>
                    <p className="text-[11px] font-bold text-violet-800">{t12(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <p className="text-[10px] text-gray-400 text-center px-6">
          Adhan / Jamaat times as published by the mosque admin. Hijri dates use your saved adjustment.
        </p>
      </div>
    </div>
  );
};
