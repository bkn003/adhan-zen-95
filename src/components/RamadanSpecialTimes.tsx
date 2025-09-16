import { Moon, Sun } from 'lucide-react';
import type { Prayer } from '@/types/prayer.types';
import { formatTo12Hour } from '@/utils/timeFormat';

interface RamadanSpecialTimesProps {
  prayers: Prayer[];
  isRamadan: boolean;
}

export const RamadanSpecialTimes = ({ prayers, isRamadan }: RamadanSpecialTimesProps) => {
  if (!isRamadan) return null;

  // Filter special Ramadan timings
  const saharEnd = prayers.find(p => p.name === 'Sahar End');
  const iftar = prayers.find(p => p.name === 'Iftar');
  const tharaweeh = prayers.find(p => p.name === 'Tharaweeh');

  const specialTimes = [
    saharEnd && { ...saharEnd, tamilName: 'ஸஹர் முடிவு', icon: <Moon className="w-4 h-4" /> },
    iftar && { ...iftar, tamilName: 'இஃப்தார்', icon: <Sun className="w-4 h-4" /> },
    tharaweeh && { ...tharaweeh, tamilName: 'தராவீஹ்', icon: <Moon className="w-4 h-4" /> }
  ].filter(Boolean);

  if (specialTimes.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {specialTimes.map((time, index) => (
        <div
          key={index}
          className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="p-1 rounded-full bg-purple-100">
              <div className="text-purple-600">{time.icon}</div>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-purple-800">
              {time.name}
            </h4>
            <p className="text-xs text-purple-600">{time.tamilName}</p>
            <p className="text-sm font-mono font-bold text-purple-800">
              {formatTo12Hour(time.adhan)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};