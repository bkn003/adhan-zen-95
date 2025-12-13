import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    getAvailableAdhans,
    getAdhanSettings,
    setSelectedAdhan,
    AdhanSound,
    AdhanSettings
} from '@/native/dndService';
import { Capacitor } from '@capacitor/core';
import { Music, Speaker } from 'lucide-react';

export function AdhanSoundSelector() {
    const [adhans, setAdhans] = useState<AdhanSound[]>([]);
    const [currentSettings, setCurrentSettings] = useState<AdhanSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const [available, settings] = await Promise.all([
                    getAvailableAdhans(),
                    getAdhanSettings()
                ]);
                setAdhans(available);
                setCurrentSettings(settings);
            } catch (error) {
                console.error("Failed to load adhan data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleAdhanChange = async (value: string) => {
        if (!currentSettings) return;

        // Optimistically update UI
        setCurrentSettings({ ...currentSettings, selectedAdhan: value });

        // Save to native
        await setSelectedAdhan(value, false);
    };

    const handleFajrAdhanChange = async (value: string) => {
        if (!currentSettings) return;

        // Optimistically update UI
        setCurrentSettings({ ...currentSettings, fajrAdhan: value });

        // Save to native
        await setSelectedAdhan(value, true);
    };

    if (loading || !Capacitor.isNativePlatform()) return null;
    if (!currentSettings) return null;

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Speaker className="w-4 h-4 text-rose-500" />
                    <Label className="text-sm font-medium text-gray-700">Regular Adhan Sound</Label>
                </div>
                <Select
                    value={currentSettings.selectedAdhan}
                    onValueChange={handleAdhanChange}
                >
                    <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-10">
                        <SelectValue placeholder="Select Adhan" />
                    </SelectTrigger>
                    <SelectContent>
                        {adhans.map(adhan => (
                            <SelectItem key={adhan.id} value={adhan.id}>
                                <span className="font-medium">{adhan.name}</span>
                                {adhan.description && (
                                    <span className="ml-2 text-xs text-gray-400">- {adhan.description}</span>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-indigo-500" />
                    <Label className="text-sm font-medium text-gray-700">Fajr Adhan Sound</Label>
                </div>
                <p className="text-xs text-gray-400 mb-1.5">Specifically for Fajr prayer (As-salatu Khayrun Minan-nawm)</p>
                <Select
                    value={currentSettings.fajrAdhan}
                    onValueChange={handleFajrAdhanChange}
                >
                    <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-10">
                        <SelectValue placeholder="Select Fajr Adhan" />
                    </SelectTrigger>
                    <SelectContent>
                        {adhans.map(adhan => (
                            <SelectItem key={adhan.id} value={adhan.id}>
                                <span className="font-medium">{adhan.name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
