import { useEffect, useState } from 'react';
import { Moon, Sunset } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTo12Hour } from '@/utils/timeFormat';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Location } from '@/types/prayer.types';

interface SaharIftar {
  sahar: string | null;
  iftar: string | null;
  range: string | null;
}

/**
 * Read-only Sahar (Sehri end) and Iftar times for the currently selected
 * mosque, shown to every user in Settings. Values come straight from the
 * mosque's prayer_times row for today's date range — only mosque admins can
 * change them, regular users just view.
 */
export const SaharTimeSettings = ({ location }: { location: Location | null }) => {
  const { t } = useLanguage();
  const [times, setTimes] = useState<SaharIftar | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!location) {
      setTimes(null);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);

    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('en-US', { month: 'long' });

    supabase
      .from('prayer_times')
      .select('sahar_end, maghrib_adhan, date_range')
      .eq('location_id', location.id)
      .eq('month', month)
      .then(({ data }) => {
        if (cancelled) return;
        const rec = (data ?? []).find((r: any) => {
          const m = String(r.date_range ?? '').match(/(\d+)-(\d+)/);
          return !!m && day >= parseInt(m[1]) && day <= parseInt(m[2]);
        });
        setTimes(
          rec
            ? { sahar: (rec as any).sahar_end, iftar: (rec as any).maghrib_adhan, range: (rec as any).date_range }
            : null
        );
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [location?.id]);

  if (!location) {
    return <p className="text-xs text-gray-500">Select a mosque above to see its Sahar and Iftar times.</p>;
  }

  if (!loaded) {
    return <div className="h-14 animate-pulse bg-gray-100 rounded-xl" />;
  }

  if (!times || (!times.sahar && !times.iftar)) {
    return (
      <p className="text-xs text-gray-500">
        No Sahar/Iftar time is set for {location.mosque_name} in this period. The mosque admin can add it from
        the admin panel.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        For <span className="font-semibold text-gray-700">{location.mosque_name}</span>
        {times.range ? ` · ${times.range}` : ''} — set by the mosque admin.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {times.sahar && (
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 text-center">
            <Moon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-[11px] font-medium text-indigo-600">{t('saharEndTime')}</p>
            <p className="text-base font-mono font-bold text-indigo-800">{formatTo12Hour(times.sahar)}</p>
          </div>
        )}
        {times.iftar && (
          <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 text-center">
            <Sunset className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className="text-[11px] font-medium text-orange-600">Iftar (Maghrib)</p>
            <p className="text-base font-mono font-bold text-orange-800">{formatTo12Hour(times.iftar)}</p>
          </div>
        )}
      </div>
    </div>
  );
};
