import { AlertTriangle, Sun, Sunset, Sunrise } from 'lucide-react';
import type { ForbiddenTime } from '@/types/prayer.types';
import { tamilText } from '@/utils/tamilText';
import { formatTo12Hour } from '@/utils/timeFormat';
interface ForbiddenTimesProps {
  forbiddenTimes: ForbiddenTime[];
}
export const ForbiddenTimes = ({
  forbiddenTimes
}: ForbiddenTimesProps) => {
  if (forbiddenTimes.length === 0) return null;
  const getIcon = (type: string) => {
    switch (type) {
      case 'sunrise':
        return <Sunrise className="w-4 h-4" />;
      case 'noon':
        return <Sun className="w-4 h-4" />;
      case 'sunset':
        return <Sunset className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };
  const getTamilName = (type: string) => {
    switch (type) {
      case 'sunrise':
        return tamilText.general.sunrise.tamil;
      case 'noon':
        return tamilText.general.midNoon.tamil;
      case 'sunset':
        return tamilText.general.sunset.tamil;
      default:
        return '';
    }
  };
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <div>
          <h3 className="text-sm font-semibold text-red-700">
            {tamilText.general.forbiddenTimes.english}
          </h3>
          <p className="text-xs text-red-600 -mt-0.5">
            {tamilText.general.forbiddenTimes.tamil}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {forbiddenTimes.map((time, index) => (
          <div
            key={index}
            className="rounded-lg border border-red-100 bg-white/60 p-2 text-center shadow-[0_1px_0_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-center gap-1 text-red-600">
              {getIcon(time.type)}
              <span className="text-[11px] font-medium">{time.name}</span>
            </div>
            <div className="text-[11px] text-red-500">{getTamilName(time.type)}</div>
            <div className="mt-1 text-sm font-bold text-red-700">
              {formatTo12Hour(time.time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};