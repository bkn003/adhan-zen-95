
import { Moon, Sun, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface RamadanToggleProps {
  isRamadan: boolean;
  onToggle: () => void;
  onResetAuto?: () => void;
  autoOverride?: boolean;
  isRamadanMonth?: boolean;
}

export const RamadanToggle = ({
  isRamadan,
  onToggle,
  onResetAuto,
  autoOverride,
  isRamadanMonth
}: RamadanToggleProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
          ${isRamadan
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-800'
            : 'bg-card border-border text-muted-foreground hover:border-indigo-200'
          }
        `}
      >
        <div className={`p-2 rounded-full ${isRamadan ? 'bg-indigo-100' : 'bg-muted'}`}>
          {isRamadan ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </div>
        <div className="text-left flex-1">
          <p className="font-medium">
            {t('ramadanMode')}
            {isRamadanMonth && !autoOverride && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Auto-detected
              </span>
            )}
          </p>
          <p className="text-sm opacity-75">
            {isRamadan ? t('specialTimingsActive') : t('tapEnableRamadan')}
          </p>
        </div>
        <div className={`
          w-12 h-6 rounded-full transition-colors relative
          ${isRamadan ? 'bg-indigo-600' : 'bg-gray-300'}
        `}>
          <div className={`
            absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
            ${isRamadan ? 'translate-x-6' : 'translate-x-0.5'}
          `} />
        </div>
      </button>

      {autoOverride && onResetAuto && (
        <button
          onClick={onResetAuto}
          className="w-full flex items-center justify-center gap-2 p-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('resetAutoDetect')}
        </button>
      )}
    </div>
  );
};
