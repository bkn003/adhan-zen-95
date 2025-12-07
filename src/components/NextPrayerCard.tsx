import { useEffect, useState } from 'react';
import { Clock, Sun, Moon, Sunrise, Sunset, Star } from 'lucide-react';
import { tamilText } from '@/utils/tamilText';
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
        return <Sunrise className="w-10 h-10 text-amber-300" />;
      case 'maghrib':
        return <Sunset className="w-10 h-10 text-orange-300" />;
      case 'isha':
        return <Moon className="w-10 h-10 text-blue-300" />;
      default:
        return <Sun className="w-10 h-10 text-yellow-300" />;
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

  const getTamilName = () => {
    return tamilText.prayers[nextPrayer.type as keyof typeof tamilText.prayers]?.tamil || '';
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className={`text-4xl font-bold font-mono tabular-nums ${isUrgent ? 'text-red-300 animate-pulse' : 'text-white'}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-white/60 text-xs uppercase tracking-wider mt-1">{label}</div>
    </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getGradient()} p-6 shadow-2xl shadow-black/20`}>
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Star className="w-64 h-64 opacity-5" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              {getPrayerIcon()}
            </div>
            <div>
              <div className="text-white/70 text-sm font-medium">{tamilText.general.nextPrayer.english}</div>
              <div className="text-white text-2xl font-bold tracking-tight">
                {nextPrayer.name}
              </div>
              <div className="text-white/60 text-sm">{getTamilName()}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Adhan</div>
            <div className="text-white text-2xl font-bold">
              {formatTo12Hour(nextPrayer.adhan)}
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-center gap-3">
            <TimeBlock value={timeRemaining.hours} label="Hours" />
            <div className="text-3xl text-white/50 font-light">:</div>
            <TimeBlock value={timeRemaining.minutes} label="Minutes" />
            <div className="text-3xl text-white/50 font-light">:</div>
            <TimeBlock value={timeRemaining.seconds} label="Seconds" />
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-400' : 'bg-white/50'}`}
              style={{
                width: `${Math.max(0, 100 - ((timeRemaining.hours * 60 + timeRemaining.minutes) / 60) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Location indicator */}
        {selectedLocation && (
          <div className="mt-4 flex items-center justify-center gap-2 text-white/50 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="truncate max-w-[200px]">{selectedLocation.mosque_name}</span>
          </div>
        )}
      </div>
    </div>
  );
};