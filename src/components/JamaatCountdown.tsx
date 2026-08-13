import React from 'react';
import { Users, Timer, Check, MapPin, RefreshCw } from 'lucide-react';
import { ATTENDANCE_RADIUS_M, formatDistance } from '@/utils/geofence';
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
  const { count, isAttending, toggle, checkingLocation, requiresPresence, proximity, blockedReason, retryLocation } =
    useAttendance(locationId, prayerKey, coords);


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
        disabled={checkingLocation || (requiresPresence && proximity.status === 'ready' && !proximity.inside && !isAttending)}
        className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
          isAttending
            ? 'bg-emerald-600 text-white shadow'
            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-60'
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
      {requiresPresence && (
        <div
          className={`mt-2 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold ${
            proximity.status === 'ready'
              ? proximity.inside
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
              : proximity.status === 'denied' || proximity.status === 'unsupported'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-50 text-gray-500'
          }`}
        >
          <MapPin className={`w-3 h-3 shrink-0 ${proximity.status === 'locating' ? 'animate-pulse' : ''}`} />
          <span className="leading-tight flex-1">
            {proximity.status === 'ready' && proximity.inside &&
              `At the mosque · ${formatDistance(proximity.distance ?? 0)} away — you can mark attendance`}
            {proximity.status === 'ready' && !proximity.inside &&
              `${formatDistance(proximity.distance ?? 0)} away · come within ${ATTENDANCE_RADIUS_M} m to mark attendance`}
            {proximity.status === 'locating' && 'Getting your location…'}
            {proximity.status === 'denied' && 'Location blocked — enable it in your phone settings to mark attendance'}
            {proximity.status === 'unsupported' && 'This device cannot share location, so attendance is unavailable'}
            {proximity.status === 'idle' && 'Waiting for location…'}
          </span>
          {(proximity.status === 'denied' || proximity.status === 'idle' || proximity.status === 'locating') && (
            <button
              onClick={retryLocation}
              disabled={checkingLocation}
              className="shrink-0 flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-gray-700 border border-gray-200 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${checkingLocation ? 'animate-spin' : ''}`} /> Retry
            </button>
          )}
        </div>
      )}


      {blockedReason && !isAttending && (
        <p className="mt-1 text-[10px] text-red-600 text-center leading-snug">
          Marked unattended: {blockedReason}
        </p>
      )}

      <p className="mt-1 text-[9px] text-gray-400 text-center">
        {requiresPresence
          ? `Only markable within ${ATTENDANCE_RADIUS_M} m of the mosque. Only the total count is shared.`
          : 'Attendance is anonymous — only the total count is shared.'}
      </p>
    </div>
  );
};
