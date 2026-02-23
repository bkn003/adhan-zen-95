import { Sunrise, Moon, Sparkles } from 'lucide-react';
import { formatTo12Hour } from '@/utils/timeFormat';
import { useLanguage } from '@/i18n/LanguageContext';

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
  const { t, language } = useLanguage();

  const ishraqTime = ishraqTimeOverride
    || (sunriseTime ? addMinutesToTime(sunriseTime, 20) : null);

  const tahajjudStart = tahajjudStartOverride || '01:30';
  const tahajjudEnd = tahajjudEndOverride
    || (fajrTime ? subtractMinutesFromTime(fajrTime, 20) : '04:30');

  if (!ishraqTime && !fajrTime) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-indigo-700">
            {t('specialPrayers')}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Tahajjud - Left */}
        <div className="rounded-xl border border-violet-100 bg-white/80 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-violet-600 mb-1">
            <Moon className="w-4 h-4" />
            <span className="text-[11px] font-medium">{t('tahajjud')}</span>
          </div>
          <div className="mt-1.5 text-sm font-bold text-violet-700">
            {formatTo12Hour(tahajjudStart)} - {formatTo12Hour(tahajjudEnd)}
          </div>
        </div>

        {/* Ishraq - Right */}
        {ishraqTime && (
          <div className="rounded-xl border border-amber-100 bg-white/80 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <Sunrise className="w-4 h-4" />
              <span className="text-[11px] font-medium">{t('ishraq')}</span>
            </div>
            <div className="mt-1.5 text-sm font-bold text-amber-700">
              {formatTo12Hour(ishraqTime)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
