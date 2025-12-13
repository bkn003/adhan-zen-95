import React, { useState, useEffect } from 'react';
import { Minus, Plus, CalendarCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

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

const PRAYERS = [
    { key: 'fajr', label: 'Fajr', tamil: 'ஃபஜ்ர்', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { key: 'dhuhr', label: 'Dhuhr', tamil: 'லுஹர்', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { key: 'asr', label: 'Asr', tamil: 'அஸர்', color: 'text-orange-600 bg-orange-50 border-orange-100' },
    { key: 'maghrib', label: 'Maghrib', tamil: 'மஃரிப்', color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { key: 'isha', label: 'Isha', tamil: 'இஷா', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { key: 'witr', label: 'Witr', tamil: 'வித்ர்', color: 'text-purple-600 bg-purple-50 border-purple-100' },
] as const;

export const QazaScreen = () => {
    const [counts, setCounts] = useState<QazaCounts>(INITIAL_COUNTS);
    const [history, setHistory] = useState<HistoryData>({});
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const { toast } = useToast();

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
        if (!dayData) return 0; // 0%
        // Only count 5 obligatory prayers (exclude Witr for completion stats if desired, but let's include all 6)
        const prayedCount = PRAYERS.filter(p => dayData[p.key]).length;
        return prayedCount;
    };

    // Custom visual for calendar days (green dot if all prayed?)
    // modifiers={{ booked: bookedDays }} modifiersStyles...

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30 p-4 pb-28 space-y-4">

            <Tabs defaultValue="qaza" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="qaza" className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        <span>Missed (Qaza)</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4" />
                        <span>History</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="qaza" className="space-y-4">
                    {/* Qaza Header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-center shadow-xl shadow-indigo-500/20">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-3xl" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-white mb-1">Total Missed</h2>
                            <div className="mt-2">
                                <span className="text-4xl font-bold text-white">{getTotalMissed()}</span>
                                <span className="text-white/80 text-sm ml-2">prayers</span>
                            </div>
                        </div>
                    </div>

                    {/* Qaza Counts */}
                    <div className="grid grid-cols-1 gap-3">
                        {PRAYERS.map((prayer) => (
                            <Card key={prayer.key} className={`p-4 border shadow-sm ${prayer.color}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">{prayer.label}</h3>
                                        <p className="text-xs opacity-70 font-medium">{prayer.tamil}</p>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white/60 p-1.5 rounded-xl backdrop-blur-sm">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-black/5 text-slate-700"
                                            onClick={() => updateCount(prayer.key as keyof QazaCounts, -1)}
                                            disabled={counts[prayer.key as keyof QazaCounts] === 0}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>

                                        <span className="w-12 text-center font-bold text-xl tabular-nums">
                                            {counts[prayer.key as keyof QazaCounts]}
                                        </span>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-black/5 text-slate-700"
                                            onClick={() => updateCount(prayer.key as keyof QazaCounts, 1)}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
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
                                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select Date'}
                            </span>
                            <span className="text-gray-500 text-sm font-normal ml-auto">
                                Mark performed prayers
                            </span>
                        </h3>

                        {selectedDate ? (
                            <div className="space-y-3">
                                {PRAYERS.map((prayer) => {
                                    const dateKey = format(selectedDate, 'yyyy-MM-dd');
                                    const isChecked = history[dateKey]?.[prayer.key] || false;

                                    return (
                                        <div
                                            key={prayer.key}
                                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${isChecked ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-transparent'
                                                }`}
                                            onClick={() => togglePrayerStatus(prayer.key)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-8 rounded-full ${isChecked ? 'bg-emerald-500' : 'bg-gray-200'
                                                    }`} />
                                                <div>
                                                    <p className={`font-semibold ${isChecked ? 'text-emerald-900' : 'text-gray-700'}`}>
                                                        {prayer.label}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{prayer.tamil}</p>
                                                </div>
                                            </div>

                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() => togglePrayerStatus(prayer.key)}
                                                className="h-6 w-6 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 py-8">Select a date to view history</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
