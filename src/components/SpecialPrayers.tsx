import { Sunrise, Moon, Sparkles } from 'lucide-react';
import { formatTo12Hour } from '@/utils/timeFormat';

interface SpecialPrayersProps {
  sunriseTime?: string;
  fajrTime?: string;
  ishraqTimeOverride?: string;
  tahajjudStartOverride?: string;
  tahajjudEndOverride?: string;
}

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function subtractMinutesFromTime(time: string, minutes: number): string {
  return addMinutesToTime(time, -minutes);
}

export const SpecialPrayers = ({
  sunriseTime,
  fajrTime,
  ishraqTimeOverride,
  tahajjudStartOverride,
  tahajjudEndOverride,
}: SpecialPrayersProps) => {
  // Calculate Ishraq: override or sunrise + 20 min
  const ishraqTime = ishraqTimeOverride
    || (sunriseTime ? addMinutesToTime(sunriseTime, 20) : null);

  // Calculate Tahajjud: override or default 01:30 - (fajr - 20 min)
  const tahajjudStart = tahajjudStartOverride || '01:30';
  const tahajjudEnd = tahajjudEndOverride
    || (fajrTime ? subtractMinutesFromTime(fajrTime, 20) : '04:30');

  if (!ishraqTime && !fajrTime) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-indigo-700">
            Special Prayers / சிறப்பு தொழுகைகள்
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        {/* Ishraq */}
        {ishraqTime && (
          <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-amber-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <Sunrise className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Ishraq / இஷ்ராக்</p>
                <p className="text-[10px] text-gray-500">+20 min after sunrise</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-700">{formatTo12Hour(ishraqTime)}</span>
          </div>
        )}

        {/* Tahajjud */}
        <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-violet-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-50 rounded-lg">
              <Moon className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tahajjud / தஹஜ்ஜுத்</p>
              <p className="text-[10px] text-gray-500">Late night prayer</p>
            </div>
          </div>
          <span className="text-sm font-bold text-violet-700">
            {formatTo12Hour(tahajjudStart)} - {formatTo12Hour(tahajjudEnd)}
          </span>
        </div>
      </div>
    </div>
  );
};
