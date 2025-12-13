import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getVibrationSettings, setVibrationEnabled, setVibrationPattern, type VibrationSettings } from '@/native/dndService';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

export const VibrationSelector = () => {
    const [settings, setSettings] = useState<VibrationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            getVibrationSettings()
                .then(data => {
                    setSettings(data);
                    setIsLoading(false);
                })
                .catch(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleToggle = (checked: boolean) => {
        setVibrationEnabled(checked);
        setSettings(prev => prev ? { ...prev, enabled: checked } : null);
    };

    const handlePatternSelect = (patternId: string) => {
        setVibrationPattern(patternId);
        setSettings(prev => prev ? { ...prev, patternId } : null);
        // Haptic feedback to demonstrate pattern would be nice, but we need native support for "test"
        if (navigator.vibrate) navigator.vibrate(20);
    };

    if (isLoading || !settings) return null;

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-4">
            {/* Main Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                        <Smartphone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-700 block">Vibrate with Adhan</span>
                        <p className="text-xs text-gray-500">Haptic feedback during prayer call</p>
                    </div>
                </div>
                <Switch
                    checked={settings.enabled}
                    onCheckedChange={handleToggle}
                    className="data-[state=checked]:bg-indigo-500"
                />
            </div>

            {/* Pattern Selection */}
            {settings.enabled && (
                <div className="pl-9 space-y-2">
                    <p className="text-xs text-gray-500 font-medium mb-1.5">Vibration Pattern</p>
                    <div className="grid grid-cols-2 gap-2">
                        {settings.patterns.map((pattern) => (
                            <Button
                                key={pattern.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handlePatternSelect(pattern.id)}
                                className={cn(
                                    "justify-start text-xs h-9",
                                    settings.patternId === pattern.id
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                                        : "border-gray-200 text-gray-600"
                                )}
                            >
                                {settings.patternId === pattern.id && (
                                    <Check className="w-3 h-3 mr-1.5 text-indigo-600" />
                                )}
                                {pattern.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
