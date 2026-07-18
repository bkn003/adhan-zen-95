import { useEffect, useState } from 'react';
import { Clock, Sun, Moon, Sunrise, Sunset, Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatTo12Hour } from '@/utils/timeFormat';
import type { Prayer } from '@/types/prayer.types';

interface NextPrayerCardProps {
  nextPrayer: Prayer;
  selectedLocation?: {
    mosque_name: string;
    district: string;
  };
}

export const NextPrayerCard = ({
  nextPrayer,
  selectedLocation
}: NextPrayerCardProps) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isUrgent, setIsUrgent] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const [hours, minutes] = nextPrayer.adhan.split(':').map(Number);
      const prayerTime = new Date();
      prayerTime.setHours(hours, minutes, 0, 0);

      // If prayer time has passed today, show next day's time
      if (prayerTime < now) {
        prayerTime.setDate(prayerTime.getDate() + 1);
      }

      const diff = prayerTime.getTime() - now.getTime();
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft });
      setIsUrgent(hoursLeft === 0 && minutesLeft < 15);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer.adhan]);

  const getPrayerIcon = () => {
    switch (nextPrayer.type) {
      case 'fajr':
        return <Sunrise className="w-7 h-7 text-amber-300" />;
      case 'maghrib':
        return <Sunset className="w-7 h-7 text-orange-300" />;
      case 'isha':
        return <Moon className="w-7 h-7 text-blue-300" />;
      default:
        return <Sun className="w-7 h-7 text-yellow-300" />;
    }
  };

  const getGradient = () => {
    switch (nextPrayer.type) {
      case 'fajr':
        return 'from-indigo-600 via-purple-600 to-pink-500';
      case 'dhuhr':
      case 'jummah':
        return 'from-amber-500 via-orange-500 to-red-500';
      case 'asr':
        return 'from-sky-500 via-blue-500 to-indigo-500';
      case 'maghrib':
        return 'from-orange-500 via-pink-500 to-purple-600';
      case 'isha':
        return 'from-slate-700 via-purple-800 to-indigo-900';
      default:
        return 'from-emerald-500 via-green-500 to-teal-500';
    }
  };

  // Prayer names are kept untranslated per requirement

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center leading-none">
      <div className={`text-base font-bold font-mono tabular-nums ${isUrgent ? 'text-red-300 animate-pulse' : 'text-white'}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-white/60 text-[8px] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getGradient()} px-3 py-2.5 shadow-lg`}>
      <div className="absolute inset-0 opacity-5">
        <Star className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-white/15 backdrop-blur-sm rounded-lg shrink-0">
            {getPrayerIcon()}
          </div>
          <div className="min-w-0">
            <div className="text-white/70 text-[10px] font-medium leading-tight">{t('nextPrayer')}</div>
            <div className="text-white text-base font-bold leading-tight truncate">
              {nextPrayer.name}
            </div>
            {selectedLocation && (
              <div className="flex items-center gap-1 text-white/60 text-[10px] mt-0.5">
                <div className="w-1 h-1 bg-green-300 rounded-full animate-pulse" />
                <span className="truncate max-w-[140px]">{selectedLocation.mosque_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-white text-sm font-bold leading-none">
            {formatTo12Hour(nextPrayer.adhan)}
          </div>
          <div className="flex items-center gap-1 bg-black/25 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10">
            <TimeBlock value={timeRemaining.hours} label="H" />
            <span className="text-white/50 text-xs -mt-1">:</span>
            <TimeBlock value={timeRemaining.minutes} label="M" />
            <span className="text-white/50 text-xs -mt-1">:</span>
            <TimeBlock value={timeRemaining.seconds} label="S" />
          </div>
        </div>
      </div>
    </div>
  );
};
