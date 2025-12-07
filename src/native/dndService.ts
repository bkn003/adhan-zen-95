import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * TypeScript bridge to native Android DND and alarm functionality
 * Uses the AdhanNativePlugin Capacitor plugin
 */

// Define the plugin interface
interface AdhanNativePlugin {
    checkDndPermission(): Promise<{ granted: boolean }>;
    requestDndPermission(): Promise<void>;
    enableDnd(options: { prayerName: string }): Promise<{ success: boolean }>;
    disableDnd(): Promise<{ success: boolean }>;
    scheduleDndForPrayers(options: {
        prayers: Array<{
            name: string;
            adhan: string;
            iqamah: string;
            type: string;
        }>;
        date: string;
        dndBeforeMinutes?: number;
        dndAfterMinutes?: number;
    }): Promise<{ scheduledCount: number }>;
    scheduleReliableAlarms(options: {
        prayers: Array<{
            name: string;
            adhan: string;
            iqamah: string;
            type: string;
        }>;
        date: string;
    }): Promise<{ scheduledCount: number }>;
    cancelAllAlarms(): Promise<{ success: boolean }>;
    getDndSettings(): Promise<DndSettings>;
    saveDndSettings(settings: Partial<DndSettings>): Promise<void>;
    updateCountdownPrayers(options: {
        prayers: Array<{
            name: string;
            adhan: string;
        }>;
    }): Promise<{ success: boolean }>;
}

export interface DndSettings {
    enabled: boolean;
    beforeMinutes: number;
    afterMinutes: number;
    enabledPrayers: string[];
}

// Register the plugin
const AdhanNative = registerPlugin<AdhanNativePlugin>('AdhanNative');

/**
 * Check if app has DND permission
 */
export async function checkDndPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ DND permission check - not on native platform');
        return false;
    }

    try {
        const result = await AdhanNative.checkDndPermission();
        console.log('🔇 DND permission:', result.granted ? 'granted' : 'not granted');
        return result.granted;
    } catch (error) {
        console.error('❌ Error checking DND permission:', error);
        return false;
    }
}

/**
 * Request DND permission (opens system settings)
 */
export async function requestDndPermission(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Cannot request DND permission - not on native platform');
        return;
    }

    try {
        await AdhanNative.requestDndPermission();
        console.log('📱 Opened DND permission settings');
    } catch (error) {
        console.error('❌ Error requesting DND permission:', error);
    }
}

/**
 * Enable DND immediately
 */
export async function enableDnd(prayerName: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        const result = await AdhanNative.enableDnd({ prayerName });
        return result.success;
    } catch (error) {
        console.error('❌ Error enabling DND:', error);
        return false;
    }
}

/**
 * Disable DND immediately
 */
export async function disableDnd(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        const result = await AdhanNative.disableDnd();
        return result.success;
    } catch (error) {
        console.error('❌ Error disabling DND:', error);
        return false;
    }
}

/**
 * Schedule DND for all prayers today
 * DND activates 5 mins before Iqamah, deactivates 15 mins after (configurable)
 */
export async function scheduleDndForPrayers(
    prayers: Array<{ name: string; adhan: string; iqamah: string; type: string }>,
    date: Date,
    beforeMinutes: number = 5,
    afterMinutes: number = 15
): Promise<number> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ DND scheduling - not on native platform');
        return 0;
    }

    try {
        const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

        const result = await AdhanNative.scheduleDndForPrayers({
            prayers: prayers.map(p => ({
                name: p.name,
                adhan: p.adhan,
                iqamah: p.iqamah,
                type: p.type
            })),
            date: dateStr,
            dndBeforeMinutes: beforeMinutes,
            dndAfterMinutes: afterMinutes
        });

        console.log(`🔇 Scheduled DND for ${result.scheduledCount} prayers`);
        return result.scheduledCount;
    } catch (error) {
        console.error('❌ Error scheduling DND:', error);
        return 0;
    }
}

/**
 * Schedule reliable alarms using AlarmManager (works when app is killed)
 * This replaces Capacitor LocalNotifications for maximum reliability
 */
export async function scheduleReliableAlarms(
    prayers: Array<{ name: string; adhan: string; iqamah: string; type: string }>,
    date: Date
): Promise<number> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Reliable alarm scheduling - not on native platform');
        return 0;
    }

    try {
        const dateStr = date.toISOString().slice(0, 10);

        const result = await AdhanNative.scheduleReliableAlarms({
            prayers: prayers.map(p => ({
                name: p.name,
                adhan: p.adhan,
                iqamah: p.iqamah,
                type: p.type
            })),
            date: dateStr
        });

        console.log(`⏰ Scheduled ${result.scheduledCount} reliable alarms`);
        return result.scheduledCount;
    } catch (error) {
        console.error('❌ Error scheduling reliable alarms:', error);
        return 0;
    }
}

/**
 * Cancel all scheduled alarms and DND
 */
export async function cancelAllNativeAlarms(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;

    try {
        await AdhanNative.cancelAllAlarms();
        console.log('🚫 Cancelled all native alarms');
        return true;
    } catch (error) {
        console.error('❌ Error cancelling alarms:', error);
        return false;
    }
}

/**
 * Get DND settings - reads from localStorage (web settings) first, falls back to native
 */
export async function getDndSettings(): Promise<DndSettings> {
    const defaults: DndSettings = {
        enabled: true,
        beforeMinutes: 5,
        afterMinutes: 15,
        enabledPrayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
    };

    // First try to read from localStorage (where Settings screen saves)
    try {
        const savedEnabled = localStorage.getItem('dndEnabled');
        const savedBefore = localStorage.getItem('dndBeforeIqamah');
        const savedAfter = localStorage.getItem('dndAfterIqamah');
        const savedPerPrayer = localStorage.getItem('dndPerPrayer');

        let settings = { ...defaults };

        if (savedEnabled !== null) {
            settings.enabled = savedEnabled === 'true';
        }
        if (savedBefore) {
            settings.beforeMinutes = parseInt(savedBefore) || defaults.beforeMinutes;
        }
        if (savedAfter) {
            settings.afterMinutes = parseInt(savedAfter) || defaults.afterMinutes;
        }
        if (savedPerPrayer) {
            try {
                const perPrayer = JSON.parse(savedPerPrayer);
                settings.enabledPrayers = Object.entries(perPrayer)
                    .filter(([_, enabled]) => enabled)
                    .map(([prayer]) => prayer);
            } catch (e) { }
        }

        console.log('🔇 DND Settings from localStorage:', settings);
        return settings;
    } catch (e) {
        console.warn('Failed to read DND settings from localStorage:', e);
    }

    // Fallback to native settings
    if (!Capacitor.isNativePlatform()) return defaults;

    try {
        const settings = await AdhanNative.getDndSettings();
        return {
            enabled: settings.enabled ?? defaults.enabled,
            beforeMinutes: settings.beforeMinutes ?? defaults.beforeMinutes,
            afterMinutes: settings.afterMinutes ?? defaults.afterMinutes,
            enabledPrayers: settings.enabledPrayers ?? defaults.enabledPrayers
        };
    } catch (error) {
        console.error('❌ Error getting DND settings:', error);
        return defaults;
    }
}

/**
 * Save DND settings to native storage
 */
export async function saveDndSettings(settings: Partial<DndSettings>): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Saving DND settings - not on native platform');
        return;
    }

    try {
        await AdhanNative.saveDndSettings(settings);
        console.log('💾 Saved DND settings');
    } catch (error) {
        console.error('❌ Error saving DND settings:', error);
    }
}

/**
 * Initialize DND service - call on app start
 * Checks permission and sets up scheduling
 */
export async function initializeDndService(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    console.log('🚀 Initializing DND service...');

    const hasPermission = await checkDndPermission();
    if (!hasPermission) {
        console.log('⚠️ DND permission not granted - will prompt user in settings');
    }
}

/**
 * Update the countdown notification service with current prayer times
 * This should be called whenever prayer times are loaded/updated
 */
export async function updateCountdownPrayers(
    prayers: Array<{ name: string; adhan: string }>
): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Countdown prayers update - not on native platform');
        return false;
    }

    try {
        const result = await AdhanNative.updateCountdownPrayers({
            prayers: prayers.map(p => ({
                name: p.name,
                adhan: p.adhan
            }))
        });
        console.log(`🕌 Updated countdown notification with ${prayers.length} prayers`);
        return result.success;
    } catch (error) {
        console.error('❌ Error updating countdown prayers:', error);
        return false;
    }
}
