import React from 'react';
import { Users, Timer, Check, MapPin } from 'lucide-react';
import { ATTENDANCE_RADIUS_M } from '@/utils/geofence';
import { useNextJamaat, useAttendance, formatCountdown } from '@/hooks/useJamaatPresence';
import { formatTo12Hour } from '@/utils/timeFormat';
import type { Prayer } from '@/types/prayer.types';

interface JamaatCountdownProps {
  locationId?: string;
  mosqueName?: string;
  prayers: Prayer[];
  /** Mosque coordinates — enables the "must be at the mosque" presence check. */
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/** Live Jamaat countdown + "I'm attending" presence for a mosque. */
export const JamaatCountdown: React.FC<JamaatCountdownProps> = ({ locationId, mosqueName, prayers, latitude, longitude }) => {
  const next = useNextJamaat(prayers);
  const prayerKey = next?.prayer.type;
  const coords = React.useMemo(() => {
    const lat = latitude != null ? Number(latitude) : NaN;
    const lng = longitude != null ? Number(longitude) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [latitude, longitude]);
  const { count, isAttending, toggle, checkingLocation, requiresPresence } = useAttendance(locationId, prayerKey, coords);

  if (!next || !locationId) return null;

  return (
    <div className={`rounded-2xl border p-3 shadow-sm transition-colors ${next.isImminent ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-emerald-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold flex items-center gap-1">
            <Timer className="w-3 h-3" /> Next Jamaat
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {next.prayer.name} · {formatTo12Hour(next.prayer.iqamah || next.prayer.adhan)}
          </p>
          {mosqueName && <p className="text-[10px] text-gray-500 truncate">{mosqueName}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-extrabold tabular-nums ${next.isImminent ? 'text-emerald-700' : 'text-gray-800'}`}>
            {formatCountdown(next.msLeft)}
          </p>
          <p className="text-[10px] text-gray-500 flex items-center gap-1 justify-end">
            <Users className="w-3 h-3" /> {count} attending
          </p>
        </div>
      </div>

      <button
        onClick={toggle}
        disabled={checkingLocation}
        className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
          isAttending
            ? 'bg-emerald-600 text-white shadow'
            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
        }`}
      >
        {checkingLocation ? (
          <><MapPin className="w-4 h-4 animate-pulse" /> Checking you are at the mosque…</>
        ) : isAttending ? (
          <><Check className="w-4 h-4" /> You're attending</>
        ) : (
          <><Users className="w-4 h-4" /> I'm attending</>
        )}
      </button>
      <p className="mt-1 text-[9px] text-gray-400 text-center">
        {requiresPresence
          ? `Only markable within ${ATTENDANCE_RADIUS_M} m of the mosque. Only the total count is shared.`
          : 'Attendance is anonymous — only the total count is shared.'}
      </p>
    </div>
  );
};
