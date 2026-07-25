import React, { useState, useEffect, useMemo } from 'react';
import { Minus, Plus, CalendarCheck, RotateCcw, Flame, AlertTriangle, Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';
import { computeBadges, bumpRecovered } from '@/utils/badges';

// --- Types ---
interface QazaCounts {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    witr: number;
}

type PrayerStatus = Record<string, boolean>; // prayerKey -> isPrayed
type HistoryData = Record<string, PrayerStatus>; // dateString -> PrayerStatus

// --- Constants ---
const INITIAL_COUNTS: QazaCounts = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
};

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'] as const;

const PRAYER_COLORS: Record<string, string> = {
    fajr: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    dhuhr: 'text-amber-600 bg-amber-50 border-amber-100',
    asr: 'text-orange-600 bg-orange-50 border-orange-100',
    maghrib: 'text-rose-600 bg-rose-50 border-rose-100',
    isha: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    witr: 'text-purple-600 bg-purple-50 border-purple-100',
};

export const QazaScreen = () => {
    const [counts, setCounts] = useState<QazaCounts>(INITIAL_COUNTS);
    const [history, setHistory] = useState<HistoryData>({});
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const { toast } = useToast();
    const { t } = useLanguage();

    // --- Qaza Logic ---
    useEffect(() => {
        const savedCounts = localStorage.getItem('qazaCounts');
        if (savedCounts) {
            try {
                setCounts(JSON.parse(savedCounts));
            } catch (e) {
                console.error('Failed to parse qaza counts', e);
            }
        }

        const savedHistory = localStorage.getItem('prayerHistory');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('Failed to parse prayer history', e);
            }
        }
    }, []);

    const saveCounts = (newCounts: QazaCounts) => {
        setCounts(newCounts);
        localStorage.setItem('qazaCounts', JSON.stringify(newCounts));
    };

    const updateCount = (prayer: keyof QazaCounts, delta: number) => {
        const current = counts[prayer];
        const newValue = Math.max(0, current + delta);
        if (navigator.vibrate) navigator.vibrate(delta > 0 ? 50 : 30);
        saveCounts({ ...counts, [prayer]: newValue });
    };

    const getTotalMissed = () => Object.values(counts).reduce((a, b) => a + b, 0);

    // Streak: consecutive days ending yesterday with all 5 fard prayers marked prayed
    const FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    const streak = useMemo(() => {
        let count = 0;
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        // Include today if all 5 already marked
        for (let i = 0; i < 365; i++) {
            const check = new Date(d);
            check.setDate(d.getDate() - i);
            const key = format(check, 'yyyy-MM-dd');
            const day = history[key];
            const allPrayed = day && FARD.every((p) => day[p]);
            if (allPrayed) count++;
            else if (i > 0) break; // today may be incomplete — allow starting from yesterday
        }
        return count;
    }, [history]);

    // Missed log: last 30 days where any fard prayer is unmarked
    const missedLog = useMemo(() => {
        const entries: { date: string; missed: string[] }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 1; i <= 30; i++) {
            const check = new Date(today);
            check.setDate(today.getDate() - i);
            const key = format(check, 'yyyy-MM-dd');
            const day = history[key] || {};
            const missed = FARD.filter((p) => !day[p]);
            if (missed.length) entries.push({ date: key, missed });
        }
        return entries;
    }, [history]);


    // --- History Logic ---
    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
    };

    const togglePrayerStatus = (prayerKey: string) => {
        if (!selectedDate) return;

        // Format date as YYYY-MM-DD
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const currentStatus = history[dateKey]?.[prayerKey] || false;

        const newHistory = {
            ...history,
            [dateKey]: {
                ...(history[dateKey] || {}),
                [prayerKey]: !currentStatus
            }
        };

        setHistory(newHistory);
        localStorage.setItem('prayerHistory', JSON.stringify(newHistory));

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(20);
    };

    const getDayStatus = (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayData = history[dateKey];
        if (!dayData) return 0;
        const prayedCount = PRAYER_KEYS.filter(p => dayData[p]).length;
        return prayedCount;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30 p-4 pb-28 space-y-4">

            <Tabs defaultValue="qaza" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="qaza" className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        <span>{t('missedQaza')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4" />
                        <span>{t('history')}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="qaza" className="space-y-4">
                    {/* Streak Card */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-4 text-white shadow-lg">
                            <div className="flex items-center gap-2 opacity-90">
                                <Flame className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wide">Streak</span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold">{streak}</span>
                                <span className="text-xs opacity-90">day{streak === 1 ? '' : 's'}</span>
                            </div>
                            <p className="text-[10px] opacity-80 mt-1">All 5 fard prayed</p>
                        </div>
                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
                            <div className="flex items-center gap-2 opacity-90">
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wide">{t('totalMissed')}</span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold">{getTotalMissed()}</span>
                                <span className="text-xs opacity-90">{t('prayers')}</span>
                            </div>
                            <p className="text-[10px] opacity-80 mt-1">Qaza remaining</p>
                        </div>
                    </div>


                    {/* Qaza Counts */}
                    <div className="grid grid-cols-1 gap-3">
                        {PRAYER_KEYS.map((key) => (
                            <Card key={key} className={`p-4 border shadow-sm ${PRAYER_COLORS[key]}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">{t(key)}</h3>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white/60 p-1.5 rounded-xl backdrop-blur-sm">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-black/5 text-slate-700"
                                            onClick={() => updateCount(key as keyof QazaCounts, -1)}
                                            disabled={counts[key as keyof QazaCounts] === 0}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>

                                        <span className="w-12 text-center font-bold text-xl tabular-nums">
                                            {counts[key as keyof QazaCounts]}
                                        </span>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-black/5 text-slate-700"
                                            onClick={() => updateCount(key as keyof QazaCounts, 1)}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Missed Prayer Log (last 30 days) */}
                    <Card className="p-4 border-none shadow-sm bg-white/80">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <h3 className="text-sm font-bold text-gray-800">Missed Log (last 30 days)</h3>
                        </div>
                        {missedLog.length === 0 ? (
                            <p className="text-xs text-emerald-600 text-center py-4">
                                🎉 No missed prayers logged in the last 30 days.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {missedLog.map((row) => (
                                    <div
                                        key={row.date}
                                        className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100"
                                    >
                                        <span className="text-xs font-medium text-gray-700">
                                            {format(new Date(row.date), 'MMM d, yyyy')}
                                        </span>
                                        <div className="flex gap-1 flex-wrap justify-end">
                                            {row.missed.map((m) => (
                                                <span
                                                    key={m}
                                                    className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white text-amber-700 border border-amber-200"
                                                >
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </TabsContent>


                <TabsContent value="history" className="space-y-4">
                    <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-sm">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            className="rounded-md border"
                            modifiers={{
                                completed: (date) => getDayStatus(date) === 6,
                                partial: (date) => {
                                    const s = getDayStatus(date);
                                    return s > 0 && s < 6;
                                }
                            }}
                            modifiersStyles={{
                                completed: { backgroundColor: '#10b981', color: 'white', borderRadius: '100%' },
                                partial: { border: '2px solid #10b981', borderRadius: '100%' }
                            }}
                        />
                    </Card>

                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg text-sm">
                                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : t('selectDate')}
                            </span>
                            <span className="text-gray-500 text-sm font-normal ml-auto">
                                {t('markPerformedPrayers')}
                            </span>
                        </h3>

                        {selectedDate ? (
                            <div className="space-y-3">
                                {PRAYER_KEYS.map((key) => {
                                    const dateKey = format(selectedDate, 'yyyy-MM-dd');
                                    const isChecked = history[dateKey]?.[key] || false;

                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${isChecked ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-transparent'
                                                }`}
                                            onClick={() => togglePrayerStatus(key)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-8 rounded-full ${isChecked ? 'bg-emerald-500' : 'bg-gray-200'
                                                    }`} />
                                                <div>
                                                    <p className={`font-semibold ${isChecked ? 'text-emerald-900' : 'text-gray-700'}`}>
                                                        {t(key)}
                                                    </p>
                                                </div>
                                            </div>

                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() => togglePrayerStatus(key)}
                                                className="h-6 w-6 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 py-8">{t('selectDateHistory')}</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
