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
  return <div className="bg-white border border-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <div>
          <h3 className="text-xs font-medium text-gray-800">
            {tamilText.general.forbiddenTimes.english}/{tamilText.general.forbiddenTimes.tamil}
          </h3>
        </div>
      </div>
      <div className="flex justify-between gap-2 text-center">
        {forbiddenTimes.map((time, index) => <div key={index} className="flex-1">
            <div className="flex items-center justify-center gap-1 mb-1">
              {getIcon(time.type)}
              <div>
                <span className="text-xs font-medium text-gray-700 block">{time.name}</span>
                <span className="text-xs text-gray-500">{getTamilName(time.type)}</span>
              </div>
            </div>
            <p className="text-xs font-mono font-semibold text-red-600">{formatTo12Hour(time.time)}</p>
          </div>)}
      </div>
    </div>;
};