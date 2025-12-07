import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { getDndSettings, saveDndSettings, checkDndPermission, requestDndPermission, DndSettings } from '@/native/dndService';

/**
 * Hook for managing DND (Do Not Disturb) settings
 * Provides UI-ready state and functions for the settings page
 */
export function useDndSettings() {
    const [settings, setSettings] = useState<DndSettings>({
        enabled: true,
        beforeMinutes: 5,
        afterMinutes: 15,
        enabledPrayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
    });
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isNativePlatform, setIsNativePlatform] = useState<boolean>(false);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            setIsNativePlatform(Capacitor.isNativePlatform());

            if (!Capacitor.isNativePlatform()) {
                setIsLoading(false);
                return;
            }

            try {
                const [savedSettings, permission] = await Promise.all([
                    getDndSettings(),
                    checkDndPermission()
                ]);

                setSettings(savedSettings);
                setHasPermission(permission);
            } catch (error) {
                console.error('Error loading DND settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Update enabled state
    const setEnabled = useCallback(async (enabled: boolean) => {
        const newSettings = { ...settings, enabled };
        setSettings(newSettings);
        await saveDndSettings(newSettings);
    }, [settings]);

    // Update before minutes
    const setBeforeMinutes = useCallback(async (minutes: number) => {
        const newSettings = { ...settings, beforeMinutes: minutes };
        setSettings(newSettings);
        await saveDndSettings(newSettings);
    }, [settings]);

    // Update after minutes
    const setAfterMinutes = useCallback(async (minutes: number) => {
        const newSettings = { ...settings, afterMinutes: minutes };
        setSettings(newSettings);
        await saveDndSettings(newSettings);
    }, [settings]);

    // Toggle a prayer for DND
    const togglePrayer = useCallback(async (prayerType: string) => {
        const enabledPrayers = settings.enabledPrayers.includes(prayerType)
            ? settings.enabledPrayers.filter(p => p !== prayerType)
            : [...settings.enabledPrayers, prayerType];

        const newSettings = { ...settings, enabledPrayers };
        setSettings(newSettings);
        await saveDndSettings(newSettings);
    }, [settings]);

    // Request DND permission
    const requestPermission = useCallback(async () => {
        await requestDndPermission();
        // Check again after a short delay (user returns from settings)
        setTimeout(async () => {
            const permission = await checkDndPermission();
            setHasPermission(permission);
        }, 1000);
    }, []);

    return {
        settings,
        hasPermission,
        isLoading,
        isNativePlatform,
        setEnabled,
        setBeforeMinutes,
        setAfterMinutes,
        togglePrayer,
        requestPermission
    };
}

export type { DndSettings };
