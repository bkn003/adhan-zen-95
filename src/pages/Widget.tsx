import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { Compass, ArrowRight } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');

const Widget: React.FC = () => {
  const navigate = useNavigate();
  const savedLocationId = localStorage.getItem('selectedLocationId') || undefined;
  const { prayers } = usePrayerTimes(savedLocationId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = React.useMemo(() => {
    if (!prayers?.length) return null;
    const today = new Date();
    const upcoming = prayers
      .map((p) => {
        const [h, m] = (p.adhan || '00:00').split(':').map(Number);
        const d = new Date(today);
        d.setHours(h || 0, m || 0, 0, 0);
        return { ...p, at: d.getTime() };
      })
      .find((p) => p.at > now);
    return upcoming ?? null;
  }, [prayers, now]);

  const remaining = next ? Math.max(0, next.at - now) : 0;
  const hh = Math.floor(remaining / 3600000);
  const mm = Math.floor((remaining % 3600000) / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white/5 backdrop-blur rounded-3xl p-6 border border-white/10 shadow-2xl">
        <p className="text-xs uppercase tracking-widest text-emerald-300/80 text-center">
          Next Prayer
        </p>
        <h1 className="text-4xl font-extrabold text-center mt-1">
          {next?.name ?? '—'}
        </h1>
        <p className="text-center text-emerald-200/80 mt-1">
          {next?.adhan ?? '--:--'}
        </p>

        <div className="mt-6 text-center">
          <div className="font-mono text-5xl font-bold tabular-nums">
            {pad(hh)}:{pad(mm)}:{pad(ss)}
          </div>
          <p className="text-xs text-white/60 mt-1">until Adhan</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            Open App <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              localStorage.setItem('currentScreen', 'qibla');
              navigate('/');
            }}
            className="rounded-xl bg-white/10 hover:bg-white/20 py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" /> Qibla
          </button>
        </div>
      </div>
      <p className="text-[10px] text-white/40 mt-6">
        Tip: Add this page to your home screen for a widget-style shortcut.
      </p>
    </div>
  );
};

export default Widget;
