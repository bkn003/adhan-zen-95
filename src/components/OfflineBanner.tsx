import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLanguage } from '@/i18n/LanguageContext';

export const OfflineBanner = () => {
    const { isOnline, lastSyncedText } = useOnlineStatus();
    const { t } = useLanguage();

    if (isOnline) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs animate-in slide-in-from-top">
            <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-amber-700 font-medium">
                {t('offline')}
                {lastSyncedText && (
                    <span className="text-amber-500 ml-1">• {t('lastSynced')} {lastSyncedText}</span>
                )}
            </span>
        </div>
    );
};
