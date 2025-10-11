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
  return <div className="bg-red-50 border border-red-100 rounded-xl p-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="text-sm font-semibold text-red-600">
          {tamilText.general.forbiddenTimes.english}
        </h3>
      </div>
      <div className="text-center text-xs text-red-500 mb-3">
        {tamilText.general.forbiddenTimes.tamil}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {forbiddenTimes.map((time, index) => <div key={index} className="flex flex-col items-center gap-2">
            <div className="text-red-600">
              {getIcon(time.type)}
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-red-600">{time.name}</div>
              <div className="text-xs text-red-500">{getTamilName(time.type)}</div>
            </div>
            <div className="text-sm font-bold text-red-700">{formatTo12Hour(time.time)}</div>
          </div>)}
      </div>
    </div>;
};