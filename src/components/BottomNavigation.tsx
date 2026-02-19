import { Home, MapPin, Compass, Settings, CalendarCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Screen } from '@/types/navigation.types';

interface BottomNavigationProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

export const BottomNavigation = ({
  currentScreen,
  onScreenChange
}: BottomNavigationProps) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home' as Screen, icon: Home, label: t('home'), activeColor: 'bg-emerald-500' },
    { id: 'nearby' as Screen, icon: MapPin, label: t('nearby'), activeColor: 'bg-blue-500' },
    { id: 'qibla' as Screen, icon: Compass, label: t('qibla'), activeColor: 'bg-amber-500' },
    { id: 'qaza' as Screen, icon: CalendarCheck, label: t('tracker'), activeColor: 'bg-indigo-500' },
    { id: 'settings' as Screen, icon: Settings, label: t('settings'), activeColor: 'bg-violet-500' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center h-14 px-2 max-w-md mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 py-1 rounded-xl transition-all duration-200 ${isActive
                ? `${item.activeColor} text-white mx-1 shadow-lg`
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              style={{ minWidth: '56px', maxWidth: '80px' }}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? 'text-white' : ''}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-semibold mt-0.5 leading-tight truncate w-full text-center ${isActive ? 'text-white' : 'text-gray-600'
                }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};