import { format } from 'date-fns';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  progress: number;
  earned: boolean;
  category: 'streak' | 'recovery' | 'consistency';
  color: string;
}

const FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export function getRecoveredCount(): number {
  return parseInt(localStorage.getItem('qazaRecovered') || '0', 10) || 0;
}

export function bumpRecovered(delta: number) {
  const v = Math.max(0, getRecoveredCount() + delta);
  localStorage.setItem('qazaRecovered', String(v));
}

export function computeBadges(
  streak: number,
  history: Record<string, Record<string, boolean>>
): Badge[] {
  // Total perfect days ever
  let perfectDays = 0;
  Object.values(history).forEach((day) => {
    if (FARD.every((p) => day?.[p])) perfectDays++;
  });
  const recovered = getRecoveredCount();

  const defs: Omit<Badge, 'earned' | 'progress'>[] = [
    { id: 'first-step', title: 'First Step', description: '1-day streak', icon: '🌱', threshold: 1, category: 'streak', color: 'from-emerald-400 to-teal-500' },
    { id: 'steady', title: 'Steady', description: '3-day streak', icon: '🔥', threshold: 3, category: 'streak', color: 'from-orange-400 to-rose-500' },
    { id: 'weekly-warrior', title: 'Weekly Warrior', description: '7-day streak', icon: '⚡', threshold: 7, category: 'streak', color: 'from-amber-400 to-orange-500' },
    { id: 'fortnight', title: 'Fortnight', description: '14-day streak', icon: '🏆', threshold: 14, category: 'streak', color: 'from-yellow-400 to-amber-600' },
    { id: 'lunar', title: 'Lunar Cycle', description: '30-day streak', icon: '🌙', threshold: 30, category: 'streak', color: 'from-indigo-400 to-purple-600' },
    { id: 'centurion', title: 'Centurion', description: '100-day streak', icon: '💎', threshold: 100, category: 'streak', color: 'from-cyan-400 to-blue-600' },
    { id: 'year-devotee', title: 'Year Devotee', description: '365-day streak', icon: '👑', threshold: 365, category: 'streak', color: 'from-fuchsia-500 to-pink-600' },

    { id: 'recover-10', title: 'Rebuilder', description: 'Recovered 10 qaza', icon: '🛠️', threshold: 10, category: 'recovery', color: 'from-sky-400 to-indigo-500' },
    { id: 'recover-50', title: 'Restorer', description: 'Recovered 50 qaza', icon: '🧭', threshold: 50, category: 'recovery', color: 'from-teal-400 to-cyan-600' },
    { id: 'recover-100', title: 'Redemption', description: 'Recovered 100 qaza', icon: '🕊️', threshold: 100, category: 'recovery', color: 'from-emerald-500 to-green-700' },

    { id: 'perfect-7', title: 'Perfect Week', description: '7 perfect days logged', icon: '✨', threshold: 7, category: 'consistency', color: 'from-violet-400 to-purple-600' },
    { id: 'perfect-30', title: 'Perfect Month', description: '30 perfect days logged', icon: '🌟', threshold: 30, category: 'consistency', color: 'from-pink-400 to-rose-600' },
  ];

  return defs.map((d) => {
    const actual =
      d.category === 'streak' ? streak :
      d.category === 'recovery' ? recovered :
      perfectDays;
    return {
      ...d,
      progress: Math.min(1, actual / d.threshold),
      earned: actual >= d.threshold,
    };
  });
}

export function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}
