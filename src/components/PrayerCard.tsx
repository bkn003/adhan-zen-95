import { Clock, Moon, Sun } from 'lucide-react';
import type { Prayer } from '@/types/prayer.types';
import { tamilText } from '@/utils/tamilText';
import { formatTo12Hour } from '@/utils/timeFormat';
interface PrayerCardProps {
  prayer: Prayer;
  isNext?: boolean;
  timeUntilNext?: string;
}
export const PrayerCard = ({
  prayer,
  isNext,
  timeUntilNext
}: PrayerCardProps) => {
  const getIcon = () => {
    switch (prayer.type) {
      case 'fajr':
        return <Moon className="w-5 h-5 text-yellow-600" />;
      case 'dhuhr':
      case 'jummah':
        return <Sun className="w-5 h-5 text-yellow-600" />;
      case 'asr':
        return <Sun className="w-5 h-5 text-blue-600" />;
      case 'maghrib':
        return <Sun className="w-5 h-5 text-orange-600" />;
      case 'isha':
        return <Moon className="w-5 h-5 text-yellow-600" />;
      case 'tarawih':
        return <Moon className="w-5 h-5 text-purple-600" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };
  const getTamilName = () => {
    const prayerMap = {
      fajr: 'ஃபஜ்ர்',
      dhuhr: 'லுஹர்',
      jummah: 'ஜும்ஆ',
      asr: 'அஸர்',
      maghrib: 'மஃரிப்',
      isha: 'இஷா',
      tarawih: 'தராவீஹ்'
    };
    return prayerMap[prayer.type as keyof typeof prayerMap] || '';
  };

  // Special handling for Tharaweeh - only show adhan time centered
  if (prayer.name === 'Tharaweeh') {
    return <div className={`
          flex items-center justify-center p-4 rounded-xl transition-all duration-300
          ${isNext ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-50 border border-purple-100'}
        `}>
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${isNext ? 'bg-white/20' : 'bg-purple-100'}`}>
              <Moon className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-center">
              <h3 className={`font-semibold text-sm ${isNext ? 'text-white' : 'text-purple-800'}`}>
                {prayer.name}/{getTamilName()}
              </h3>
            <div className={`font-mono font-bold text-lg mt-1 ${isNext ? 'text-white' : 'text-purple-800'}`}>
              {formatTo12Hour(prayer.adhan)}
            </div>
          </div>
        </div>
      </div>;
  }

  // Special handling for single time prayers (Iftar, Sahar End)
  if (prayer.name === 'Iftar' || prayer.name === 'Sahar End') {
    return <div className={`
          flex items-center justify-between p-4 rounded-xl transition-all duration-300
          ${isNext ? 'bg-orange-600 text-white shadow-lg' : 'bg-orange-50 border border-orange-100'}
        `}>
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-1.5 rounded-full ${isNext ? 'bg-white/20' : 'bg-orange-100'}`}>
            <Sun className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-sm ${isNext ? 'text-white' : 'text-orange-800'}`}>
              {prayer.name === 'Sahar End' ? 'Sahar End/ஸஹர் முடிவு' : 'Iftar/இஃப்தார்'}
            </h3>
          </div>
        </div>
        
        <div className="text-center">
          <div className={`font-mono font-bold text-lg ${isNext ? 'text-white' : 'text-orange-800'}`}>
            {formatTo12Hour(prayer.adhan)}
          </div>
        </div>
        
        {isNext && timeUntilNext && <div className="absolute top-2 right-2">
            
          </div>}
      </div>;
  }
  return <div className={`
        relative flex items-center p-3 rounded-xl transition-all duration-300
        ${isNext ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-100'}
      `}>
      <div className="grid grid-cols-3 items-center gap-2 flex-1">
        <div className="flex items-center justify-end gap-2">
          <div className={`p-1.5 rounded-full ${isNext ? 'bg-white/20' : 'bg-gray-50'}`}>
            {getIcon()}
          </div>
          <span className={`text-sm font-semibold ${isNext ? 'text-white' : 'text-gray-800'}`}>
            {prayer.name}/{getTamilName()}
          </span>
        </div>
        
        <div className="text-center">
          <div className={`font-mono font-bold text-base ${isNext ? 'text-white' : 'text-gray-800'}`}>
            {formatTo12Hour(prayer.adhan)}
          </div>
        </div>
        
        <div className="text-center">
          <div className={`font-mono font-bold text-base ${isNext ? 'text-white' : 'text-gray-800'}`}>
            {formatTo12Hour(prayer.iqamah)}
          </div>
        </div>
      </div>
    </div>;
};