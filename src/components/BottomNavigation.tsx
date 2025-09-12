import { Home, MapPin, Compass, Settings } from 'lucide-react';
import { tamilText } from '@/utils/tamilText';
import type { Screen } from '@/types/navigation.types';
interface BottomNavigationProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}
export const BottomNavigation = ({
  currentScreen,
  onScreenChange
}: BottomNavigationProps) => {
  const navItems = [{
    id: 'home' as Screen,
    icon: Home,
    label: tamilText.general.home
  }, {
    id: 'nearby' as Screen,
    icon: MapPin,
    label: tamilText.general.nearby
  }, {
    id: 'qibla' as Screen,
    icon: Compass,
    label: tamilText.general.qibla
  }, {
    id: 'settings' as Screen,
    icon: Settings,
    label: tamilText.general.settings
  }];
  return <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-200 z-50 py-[2px] px-[16px]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;
        return <button key={item.id} onClick={() => onScreenChange(item.id)} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600'}`}>
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label.english}</span>
              <span className="text-xs text-gray-400">{item.label.tamil}</span>
            </button>;
      })}
      </div>
    </div>;
};