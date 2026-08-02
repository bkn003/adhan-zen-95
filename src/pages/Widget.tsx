import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useLocations } from '@/hooks/useLocations';
import { Compass, ArrowRight, Loader2 } from 'lucide-react';
import { formatTo12Hour } from '@/utils/timeFormat';

const pad = (n: number) => String(n).padStart(2, '0');

const Widget: React.FC = () => {
  const navigate = useNavigate();
  const { data: locations } = useLocations();

  // Resolve a usable mosque: the saved one, else the first available.
  const savedLocationId = localStorage.getItem('selectedLocationId') || undefined;
  const locationId = useMemo(() => {
    if (!locations?.length) return savedLocationId;
    const exists = savedLocationId && locations.some((l) => l.id === savedLocationId);
    return exists ? savedLocationId : locations[0].id;
  }, [locations, savedLocationId]);

  const { prayerTimes: prayers, isLoading } = usePrayerTimes(locationId);
  const mosqueName = locations?.find((l) => l.id === locationId)?.mosque_name;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => {
    if (!prayers?.length) return null;
    const withTimes = prayers
      .filter((p) => !!p.adhan)
      .map((p) => {
        const [h, m] = (p.adhan || '00:00').split(':').map(Number);
        const d = new Date();
        d.setHours(h || 0, m || 0, 0, 0);
        return { ...p, at: d.getTime() };
      })
      .sort((a, b) => a.at - b.at);

    if (!withTimes.length) return null;
    const upcoming = withTimes.find((p) => p.at > now);
    if (upcoming) return upcoming;

    // All of today's prayers are done — roll over to tomorrow's first prayer.
    const first = withTimes[0];
    return { ...first, at: first.at + 24 * 60 * 60 * 1000 };
  }, [prayers, now]);

  const remaining = next ? Math.max(0, next.at - now) : 0;
  const hh = Math.floor(remaining / 3600000);
  const mm = Math.floor((remaining % 3600000) / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm bg-white/5 backdrop-blur rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl">
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-emerald-300/80 text-center">
          Next Prayer
        </p>

        {isLoading && !next ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
            <p className="text-xs text-white/60">Loading prayer times…</p>
          </div>
        ) : !next ? (
          <div className="py-6 text-center">
            <p className="text-sm text-white/80">No prayer times available yet</p>
            <p className="text-[11px] text-white/50 mt-1">Open the app once to sync your mosque.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-center mt-1 truncate">
              {next.name}
            </h1>
            <p className="text-center text-emerald-200/80 mt-1 text-sm">
              {formatTo12Hour(next.adhan)}
            </p>
            {mosqueName && (
              <p className="text-center text-[11px] text-white/50 mt-0.5 truncate">{mosqueName}</p>
            )}

            <div className="mt-5 text-center">
              <div className="font-mono text-[2.25rem] sm:text-5xl font-bold tabular-nums leading-none">
                {pad(hh)}:{pad(mm)}:{pad(ss)}
              </div>
              <p className="text-[10px] sm:text-xs text-white/60 mt-1.5">until Adhan</p>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            Open App <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          <button
            onClick={() => {
              localStorage.setItem('currentScreen', 'qibla');
              navigate('/');
            }}
            className="rounded-xl bg-white/10 hover:bg-white/20 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Compass className="w-4 h-4 shrink-0" /> Qibla
          </button>
        </div>
      </div>
      <p className="text-[10px] text-white/40 mt-5 text-center px-4">
        Tip: Add this page to your home screen for a widget-style shortcut.
      </p>
    </div>
  );
};

export default Widget;
