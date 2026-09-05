import { WifiOff, CalendarRange } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLanguage } from '@/i18n/LanguageContext';
import { getPrayerCacheMeta } from '@/utils/prayerCache';
import { rangeLabel, rangeDays } from '@/utils/prayerExport';

interface OfflineBannerProps {
    /** Selected mosque — enables the detailed "last updated" line. */
    locationId?: string;
    mosqueName?: string;
    /** Date the schedule is shown for (defaults to today). */
    date?: Date;
}

const stamp = (ms: number) =>
    new Date(ms).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

export const OfflineBanner = ({ locationId, mosqueName, date }: OfflineBannerProps) => {
    const { isOnline, lastSyncedText } = useOnlineStatus();
    const { t } = useLanguage();

    if (isOnline) return null;

    const day = date ?? new Date();
    const month = day.toLocaleString('en-US', { month: 'long' });
    const meta = locationId ? getPrayerCacheMeta(locationId, month) : null;

    // Which date-range row covers the day we are displaying?
    const covering = meta?.rows?.find((r: any) => {
        const days = rangeDays(String(r?.date_range || ''), day.getMonth(), day.getFullYear());
        if (!days) return false;
        return day.getDate() >= days.from && day.getDate() <= days.to;
    });
    const range = covering
        ? `${rangeLabel(covering.date_range, day.getMonth(), day.getFullYear())} ${month}`
        : null;

    return (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs animate-in slide-in-from-top space-y-1">
            <div className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-700 font-semibold">
                    {t('offline')}
                    <span className="font-normal text-amber-600 ml-1">
                        — showing saved prayer times
                    </span>
                </span>
            </div>

            {meta ? (
                <div className="flex items-start gap-1.5 pl-5 text-amber-700">
                    <CalendarRange className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                    <span>
                        {mosqueName ? <span className="font-medium">{mosqueName}</span> : null}
                        {range ? <span className="text-amber-600"> • {range}</span> : null}
                        <span className="block text-[11px] text-amber-500">
                            {t('lastSynced')} {stamp(meta.timestamp)}
                        </span>
                    </span>
                </div>
            ) : lastSyncedText ? (
                <p className="pl-5 text-[11px] text-amber-500">
                    {t('lastSynced')} {lastSyncedText}
                </p>
            ) : null}
        </div>
    );
};
