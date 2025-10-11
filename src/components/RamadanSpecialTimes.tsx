import { Moon, Sun } from 'lucide-react';
import type { Prayer } from '@/types/prayer.types';
import { formatTo12Hour } from '@/utils/timeFormat';
interface RamadanSpecialTimesProps {
  prayers: Prayer[];
  isRamadan: boolean;
}
export const RamadanSpecialTimes = ({
  prayers,
  isRamadan
}: RamadanSpecialTimesProps) => {
  if (!isRamadan) return null;

  // Filter special Ramadan timings
  const saharEnd = prayers.find(p => p.name === 'Sahar End');
  const iftar = prayers.find(p => p.name === 'Iftar');
  const tharaweeh = prayers.find(p => p.name === 'Tharaweeh');
  const specialTimes = [saharEnd && {
    ...saharEnd,
    tamilName: 'ஸஹர் முடிவு',
    icon: <Moon className="w-5 h-5" />,
    bgColor: 'bg-purple-100',
    iconBg: 'bg-purple-200',
    textColor: 'text-purple-800',
    timeColor: 'text-purple-900'
  }, iftar && {
    ...iftar,
    tamilName: 'இஃப்தார்',
    icon: <Sun className="w-5 h-5" />,
    bgColor: 'bg-yellow-100',
    iconBg: 'bg-yellow-200',
    textColor: 'text-yellow-800',
    timeColor: 'text-yellow-900'
  }, tharaweeh && {
    ...tharaweeh,
    tamilName: 'தராவீஹ்',
    icon: <Moon className="w-5 h-5" />,
    bgColor: 'bg-purple-100',
    iconBg: 'bg-purple-200',
    textColor: 'text-purple-800',
    timeColor: 'text-purple-900'
  }].filter(Boolean);
  if (specialTimes.length === 0) return null;
  return <div className="grid grid-cols-3 gap-2 mb-4">
      {specialTimes.map((time, index) => <div key={index} className={`${time.bgColor} rounded-lg p-3 text-center`}>
          <div className="flex items-center justify-center mb-2">
            <div className={`p-1.5 rounded-full ${time.iconBg}`}>
              <div className={time.textColor}>{time.icon}</div>
            </div>
          </div>
          <div className="space-y-0.5">
            <h4 className={`text-xs font-semibold ${time.textColor}`}>
              {time.name}
            </h4>
            <p className={`text-xs ${time.textColor}`}>{time.tamilName}</p>
            <p className={`text-sm font-bold ${time.timeColor} mt-1`}>
              {formatTo12Hour(time.adhan)}
            </p>
          </div>
        </div>)}
    </div>;
};