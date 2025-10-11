import { useEffect, useState } from 'react';
import { Clock, Sun, Moon } from 'lucide-react';
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
  const [timeRemaining, setTimeRemaining] = useState('');
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
      const minutesLeft = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
      const secondsLeft = Math.floor(diff % (1000 * 60) / 1000);
      setTimeRemaining(`${String(hoursLeft).padStart(2, '0')}:${String(minutesLeft).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`);
    };
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer.adhan]);
  const getPrayerIcon = () => {
    if (nextPrayer.type === 'fajr') return <Sun className="w-8 h-8 text-white" />;
    if (nextPrayer.type === 'maghrib' || nextPrayer.type === 'isha') return <Moon className="w-8 h-8 text-white" />;
    return <Sun className="w-8 h-8 text-white" />;
  };
  const getTamilName = () => {
    return tamilText.prayers[nextPrayer.type as keyof typeof tamilText.prayers]?.tamil || '';
  };
  return <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-6 shadow-lg px-[8px] py-[4px] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        {getPrayerIcon()}
        <div className="text-center flex-1">
          <div className="text-white/80 text-sm mb-1">{tamilText.general.nextPrayer.english}</div>
          <div className="text-white text-2xl font-bold">
            {nextPrayer.name}/{getTamilName()}
          </div>
        </div>
        <Clock className="w-8 h-8 text-white/80" />
      </div>

      <div className="bg-white/10 backdrop-blur-sm p-4 border border-white/20 rounded-md px-[8px] py-[4px]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-white/70 text-xs mb-1">Time Remaining</div>
            <div className="text-white text-3xl font-mono font-bold tabular-nums">
              {timeRemaining}
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/70 text-xs mb-1">Prayer Time</div>
            <div className="text-white text-3xl font-bold">
              {formatTo12Hour(nextPrayer.adhan)}
            </div>
          </div>
        </div>
      </div>
    </div>;
};