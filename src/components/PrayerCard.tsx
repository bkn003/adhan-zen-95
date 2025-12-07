import { Clock, Moon, Sun, Sunrise, Sunset, Star } from 'lucide-react';
import type { Prayer } from '@/types/prayer.types';
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
    const iconClass = `w-5 h-5 ${isNext ? 'text-white' : ''}`;
    switch (prayer.type) {
      case 'fajr':
        return <Sunrise className={`${iconClass} ${!isNext ? 'text-indigo-500' : ''}`} />;
      case 'dhuhr':
      case 'jummah':
        return <Sun className={`${iconClass} ${!isNext ? 'text-amber-500' : ''}`} />;
      case 'asr':
        return <Sun className={`${iconClass} ${!isNext ? 'text-sky-500' : ''}`} />;
      case 'maghrib':
        return <Sunset className={`${iconClass} ${!isNext ? 'text-orange-500' : ''}`} />;
      case 'isha':
        return <Moon className={`${iconClass} ${!isNext ? 'text-indigo-500' : ''}`} />;
      case 'tarawih':
        return <Star className={`${iconClass} ${!isNext ? 'text-purple-500' : ''}`} />;
      default:
        return <Clock className={iconClass} />;
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

  // Special handling for Tharaweeh
  if (prayer.name === 'Tharaweeh') {
    return (
      <div className={`
        flex items-center justify-center p-4 rounded-2xl transition-all duration-300
        ${isNext
          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-xl shadow-purple-500/20'
          : 'bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100'
        }
      `}>
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${isNext ? 'bg-white/20' : 'bg-purple-100'}`}>
            <Star className={`w-5 h-5 ${isNext ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <div className="text-center">
            <h3 className={`font-bold text-base ${isNext ? 'text-white' : 'text-purple-800'}`}>
              {prayer.name}
            </h3>
            <p className={`text-xs ${isNext ? 'text-white/70' : 'text-purple-600'}`}>
              {getTamilName()}
            </p>
          </div>
          <div className={`font-mono font-bold text-xl ${isNext ? 'text-white' : 'text-purple-800'}`}>
            {formatTo12Hour(prayer.adhan)}
          </div>
        </div>
      </div>
    );
  }

  // Special handling for Iftar and Sahar End
  if (prayer.name === 'Iftar' || prayer.name === 'Sahar End') {
    return (
      <div className={`
        flex items-center justify-between p-4 rounded-2xl transition-all duration-300
        ${isNext
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/20'
          : 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100'
        }
      `}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isNext ? 'bg-white/20' : 'bg-orange-100'}`}>
            <Sun className={`w-5 h-5 ${isNext ? 'text-white' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${isNext ? 'text-white' : 'text-orange-800'}`}>
              {prayer.name === 'Sahar End' ? 'Sahar End' : 'Iftar'}
            </h3>
            <p className={`text-xs ${isNext ? 'text-white/70' : 'text-orange-600'}`}>
              {prayer.name === 'Sahar End' ? 'ஸஹர் முடிவு' : 'இஃப்தார்'}
            </p>
          </div>
        </div>
        <div className={`font-mono font-bold text-xl ${isNext ? 'text-white' : 'text-orange-800'}`}>
          {formatTo12Hour(prayer.adhan)}
        </div>
      </div>
    );
  }

  // Regular prayer card - Clean design without Adhan/Iqamah labels
  return (
    <div className={`
      rounded-2xl transition-all duration-300 
      ${isNext
        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/20 scale-[1.02]'
        : 'bg-white hover:shadow-md border border-gray-100'
      }
    `}>
      <div className="grid grid-cols-3 items-center p-4">
        {/* Prayer Name */}
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isNext ? 'bg-white/20' : 'bg-gray-50'}`}>
            {getIcon()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-bold truncate ${isNext ? 'text-white' : 'text-gray-800'}`}>
              {prayer.name}
            </span>
            <span className={`text-xs truncate ${isNext ? 'text-white/70' : 'text-gray-500'}`}>
              {getTamilName()}
            </span>
          </div>
        </div>

        {/* Adhan Time */}
        <div className="text-center">
          <div className={`font-mono font-bold text-lg ${isNext ? 'text-white' : 'text-gray-800'}`}>
            {formatTo12Hour(prayer.adhan)}
          </div>
        </div>

        {/* Iqamah Time */}
        <div className="text-center">
          <div className={`font-mono font-bold text-lg ${isNext ? 'text-white' : 'text-gray-800'}`}>
            {formatTo12Hour(prayer.iqamah)}
          </div>
        </div>
      </div>
    </div>
  );
};