import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RotateCcw, Vibrate, Target, Trophy, Sparkles } from 'lucide-react';

interface TasbeehScreenProps {
  onBack: () => void;
}

interface DhikrPreset {
  id: string;
  arabic: string;
  translit: string;
  meaning: string;
  target: number;
}

const PRESETS: DhikrPreset[] = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ ٱللَّٰه', translit: 'SubhanAllah', meaning: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰه', translit: 'Alhamdulillah', meaning: 'All praise is due to Allah', target: 33 },
  { id: 'allahuakbar', arabic: 'ٱللَّٰهُ أَكْبَر', translit: 'Allahu Akbar', meaning: 'Allah is the Greatest', target: 34 },
  { id: 'lailaha', arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰه', translit: 'La ilaha illa Allah', meaning: 'There is no god but Allah', target: 100 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ ٱللَّٰه', translit: 'Astaghfirullah', meaning: 'I seek forgiveness from Allah', target: 100 },
  { id: 'salawat', arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّد', translit: 'Salawat on the Prophet', meaning: 'O Allah, send blessings on Muhammad ﷺ', target: 99 },
];

type Store = {
  count: number;
  presetId: string;
  target: number;
  haptics: boolean;
  dailyGoal: number;
  daily: Record<string, number>; // yyyy-mm-dd -> count
  lifetime: number;
  perPreset: Record<string, number>; // preset id -> lifetime count
};

const KEY = 'tasbeeh_state_v1';
const todayKey = () => new Date().toISOString().slice(0, 10);

const load = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    count: 0,
    presetId: PRESETS[0].id,
    target: PRESETS[0].target,
    haptics: true,
    dailyGoal: 100,
    daily: {},
    lifetime: 0,
    perPreset: {},
  };
};

const save = (s: Store) => localStorage.setItem(KEY, JSON.stringify(s));

const vibrate = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch {}
};

export const TasbeehScreen: React.FC<TasbeehScreenProps> = ({ onBack }) => {
  const [state, setState] = useState<Store>(load);
  const [pulse, setPulse] = useState(false);

  useEffect(() => save(state), [state]);

  const preset = useMemo(() => PRESETS.find(p => p.id === state.presetId) ?? PRESETS[0], [state.presetId]);
  const today = state.daily[todayKey()] ?? 0;
  const goalPct = Math.min(100, Math.round((today / Math.max(1, state.dailyGoal)) * 100));
  const setPct = Math.min(100, Math.round((state.count / Math.max(1, state.target)) * 100));

  const increment = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 120);

    setState(s => {
      const next = s.count + 1;
      const reachedTarget = next >= s.target;
      if (s.haptics) {
        if (reachedTarget) vibrate([40, 60, 120]);
        else if (next % 33 === 0) vibrate([15, 25, 15]);
        else vibrate(10);
      }
      const day = todayKey();
      const daily = { ...s.daily, [day]: (s.daily[day] ?? 0) + 1 };
      const perPreset = { ...s.perPreset, [s.presetId]: (s.perPreset[s.presetId] ?? 0) + 1 };
      return {
        ...s,
        count: reachedTarget ? 0 : next,
        daily,
        perPreset,
        lifetime: s.lifetime + 1,
      };
    });
  };

  const reset = () => {
    if (state.haptics) vibrate(20);
    setState(s => ({ ...s, count: 0 }));
  };

  const selectPreset = (p: DhikrPreset) => {
    setState(s => ({ ...s, presetId: p.id, target: p.target, count: 0 }));
  };

  const setTarget = (t: number) => setState(s => ({ ...s, target: t, count: 0 }));
  const setGoal = (g: number) => setState(s => ({ ...s, dailyGoal: Math.max(1, g) }));

  // last 7 days
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().slice(0, 10);
    return { k, day: d.toLocaleDateString(undefined, { weekday: 'short' }), count: state.daily[k] ?? 0 };
  });
  const weekMax = Math.max(1, ...week.map(w => w.count));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-24">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-4 pt-6 pb-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/20 backdrop-blur rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Tasbeeh Counter</span>
          </div>
          <button
            onClick={() => setState(s => ({ ...s, haptics: !s.haptics }))}
            className={`p-2 rounded-xl backdrop-blur ${state.haptics ? 'bg-white/30' : 'bg-white/10 opacity-60'}`}
            aria-label="Toggle haptics"
          >
            <Vibrate className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mt-3 text-center">
          <p className="text-2xl font-bold" style={{ fontFamily: 'serif' }}>{preset.arabic}</p>
          <p className="text-xs opacity-90 mt-1">{preset.translit}</p>
          <p className="text-[11px] opacity-75">{preset.meaning}</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Big counter */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500">
              Set target · {state.target}
            </div>
            <div className="text-xs font-semibold text-emerald-600">
              {state.count} / {state.target}
            </div>
          </div>
          {/* Progress ring style bar */}
          <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${setPct}%` }}
            />
          </div>

          <button
            onClick={increment}
            className={`w-full aspect-square max-w-[280px] mx-auto rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-2xl flex items-center justify-center relative select-none transition-transform duration-100 ${pulse ? 'scale-95' : 'scale-100'} active:scale-95`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="absolute inset-2 rounded-full border-4 border-white/20" />
            <div className="text-center">
              <div className="text-6xl font-black tabular-nums">{state.count}</div>
              <div className="text-xs opacity-80 mt-1 tracking-widest">TAP TO COUNT</div>
            </div>
          </button>

          <div className="flex gap-2 mt-5">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            {[33, 99, 100].map(t => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`px-3 py-2.5 rounded-xl text-sm font-bold ${state.target === t ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Daily goal */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-800">Daily Goal</h3>
            <div className="ml-auto text-xs text-gray-500">{today} / {state.dailyGoal}</div>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 ${goalPct >= 100 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          {goalPct >= 100 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-2">
              <Trophy className="w-3.5 h-3.5" /> Daily goal reached · MashaAllah!
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Goal:</span>
            {[33, 100, 300, 500, 1000].map(g => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${state.dailyGoal === g ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Choose Dhikr</h3>
          <div className="grid grid-cols-1 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => selectPreset(p)}
                className={`text-left rounded-xl p-3 border transition-all ${state.presetId === p.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 bg-gray-50/50'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{p.translit}</p>
                    <p className="text-[11px] text-gray-500">{p.meaning}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600" style={{ fontFamily: 'serif' }}>{p.arabic}</p>
                    <p className="text-[10px] text-gray-400">Target {p.target}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 7-day chart */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Last 7 Days</h3>
          <div className="flex items-end justify-between gap-2 h-24">
            {week.map(w => (
              <div key={w.k} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-md" style={{ height: `${(w.count / weekMax) * 100}%`, minHeight: w.count ? 4 : 0 }} />
                <div className="text-[10px] text-gray-500">{w.day}</div>
                <div className="text-[10px] font-semibold text-gray-700">{w.count}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center text-xs text-gray-500">
            Lifetime dhikr: <span className="font-bold text-emerald-600">{state.lifetime.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasbeehScreen;
