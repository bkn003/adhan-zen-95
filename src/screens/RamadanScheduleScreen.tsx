import React, { useMemo, useState } from 'react';
import { ArrowLeft, Moon, FileDown, CalendarPlus, Sunrise, Sunset, Sparkles, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LocationSelector } from '@/components/LocationSelector';
import { useLocations } from '@/hooks/useLocations';
import { useHijriDate } from '@/hooks/useHijriDate';
import { exportRamadanPdf, exportRamadanIcs, rangeLabel, type EidTiming } from '@/utils/prayerExport';
import { formatTime12h } from '@/utils/timeFormat';
import type { Location } from '@/types/prayer.types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const rangeStart = (dr: string) => Number(dr.split('-')[0]) || 0;
const t12 = (v?: string | null) => (v ? formatTime12h(v.slice(0, 5)) : '—');

/**
 * Ramadan-only view for one mosque: fasting window (sahar/iftar), taraweeh and
 * Eid jamaat times, exportable as PDF or a calendar file.
 */
export const RamadanScheduleScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { data: locations } = useLocations();
  const [location, setLocation] = useState<Location | null>(null);
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());

  const selected = location ?? locations?.find((l) => l.id === localStorage.getItem('selectedLocationId')) ?? null;
  const month = MONTHS[monthIndex];
  const year = new Date().getFullYear();
  const { data: hijri } = useHijriDate();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['ramadan-schedule', selected?.id, month],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_times')
        .select('date_range, fajr_iqamah, fajr_ramadan_iqamah, maghrib_adhan, maghrib_ramadan_adhan, maghrib_ramadan_iqamah, isha_iqamah, isha_ramadan_iqamah, sahar_end, ifthar_time, tharaweeh')
        .eq('location_id', selected!.id)
        .eq('month', month);
      if (error) throw error;
      return (data ?? []).slice().sort((a, b) => rangeStart(a.date_range) - rangeStart(b.date_range));
    },
  });

  // Eid timings are published by the mosque admin as announcements.
  const { data: eid } = useQuery({
    queryKey: ['eid-timings', selected?.id],
    enabled: !!selected?.id,
    queryFn: async (): Promise<EidTiming[]> => {
      const { data, error } = await supabase
        .from('mosque_announcements')
        .select('title, body, event_at, category')
        .eq('location_id', selected!.id)
        .order('event_at', { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((a) => /eid|id-?ul|idul/i.test(`${a.title} ${a.category}`))
        .map((a) => {
          const at = a.event_at ? new Date(a.event_at) : null;
          return {
            label: a.title,
            date: at ? at.toISOString().slice(0, 10) : null,
            time: at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : null,
            note: a.body?.slice(0, 120) ?? null,
          };
        });
    },
  });

  const meta = useMemo(
    () => ({
      mosqueName: selected?.mosque_name ?? 'Mosque',
      district: selected?.district,
      month,
      monthIndex,
      year,
      isRamadan: true,
      hijriLabel: hijri ? `${hijri.day} ${hijri.monthName} ${hijri.year}` : undefined,
      eid: eid ?? [],
    }),
    [selected, month, monthIndex, year, hijri, eid],
  );

  const doExport = (kind: 'pdf' | 'ics') => {
    if (!rows?.length) { toast.error('No Ramadan timings published for this month yet'); return; }
    try {
      if (kind === 'pdf') exportRamadanPdf(rows as any, meta);
      else exportRamadanIcs(rows as any, meta);
      toast.success(kind === 'pdf' ? 'Ramadan PDF downloaded' : 'Ramadan calendar downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 pb-28">
      <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-3 shadow-md">
        <button onClick={onBack} className="p-1.5 bg-white/15 rounded-lg" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <Moon className="w-4 h-4 text-white" />
        <h2 className="text-base font-bold text-white">Ramadan Schedule</h2>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm space-y-2">
          <p className="text-xs font-bold text-gray-700">Mosque</p>
          <LocationSelector selectedLocation={selected} onLocationChange={setLocation} />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => setMonthIndex(i)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  i === monthIndex ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => doExport('pdf')}
            className="py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => doExport('ics')}
            className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" /> Calendar (.ics)
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading timings…
          </div>
        )}

        {!isLoading && !rows?.length && selected && (
          <p className="text-xs text-gray-500 px-1">
            {selected.mosque_name} has not published Ramadan timings for {month} yet.
          </p>
        )}

        {!!rows?.length && (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.date_range} className="bg-white rounded-2xl border border-violet-100 p-3 shadow-sm">
                <p className="text-sm font-bold text-violet-700 mb-2">
                  {rangeLabel(r.date_range, monthIndex, year)} {month}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50/70">
                    <p className="text-[10px] uppercase tracking-wide text-indigo-500 font-bold flex items-center gap-1">
                      <Sunrise className="w-3 h-3" /> Sahar ends
                    </p>
                    <p className="text-sm font-bold text-gray-800">{t12(r.sahar_end)}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-orange-50/70">
                    <p className="text-[10px] uppercase tracking-wide text-orange-500 font-bold flex items-center gap-1">
                      <Sunset className="w-3 h-3" /> Iftar
                    </p>
                    <p className="text-sm font-bold text-gray-800">{t12(r.ifthar_time || r.maghrib_ramadan_adhan || r.maghrib_adhan)}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/70">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-bold">Fajr Jamaat</p>
                    <p className="text-sm font-bold text-gray-800">{t12(r.fajr_ramadan_iqamah || r.fajr_iqamah)}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50/70">
                    <p className="text-[10px] uppercase tracking-wide text-sky-600 font-bold">Isha Jamaat</p>
                    <p className="text-sm font-bold text-gray-800">{t12(r.isha_ramadan_iqamah || r.isha_iqamah)}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-violet-50/70 col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-violet-600 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Taraweeh
                    </p>
                    <p className="text-sm font-bold text-gray-800">{t12(r.tharaweeh)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
          <p className="text-sm font-bold text-gray-800 mb-2">Eid timings</p>
          {eid?.length ? (
            <div className="space-y-2">
              {eid.map((e, i) => (
                <div key={`${e.label}-${i}`} className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <p className="text-sm font-bold text-emerald-800">{e.label}</p>
                  <p className="text-xs text-emerald-700">
                    {e.date ?? 'Date to be announced'}{e.time ? ` • ${formatTime12h(e.time)}` : ''}
                  </p>
                  {e.note && <p className="text-[11px] text-emerald-700/80 mt-0.5">{e.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              No Eid jamaat announced yet — it appears here as soon as the mosque admin posts it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
