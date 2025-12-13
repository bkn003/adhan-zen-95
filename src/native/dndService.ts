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
    // New methods for background prayer time fetching
    saveSelectedLocation(options: { locationId: string }): Promise<{ success: boolean }>;
    getSelectedLocation(): Promise<{ locationId: string | null }>;
    refreshPrayerTimes(): Promise<{ success: boolean }>;
    // Battery optimization methods
    checkBatteryOptimization(): Promise<BatteryOptimizationStatus>;
    requestBatteryOptimization(): Promise<void>;
    openManufacturerBatterySettings(): Promise<void>;
    ignoreBatteryOptimizationPrompt(): Promise<void>;
    // Adhan sound selection methods
    getAvailableAdhans(): Promise<{ adhans: AdhanSound[] }>;
    getAdhanSettings(): Promise<AdhanSettings>;
    setAdhanSelection(options: { adhanId?: string; isFajr?: boolean; volume?: number }): Promise<{ success: boolean }>;
    // Vibration methods
    getVibrationSettings(): Promise<VibrationSettings>;
    setVibrationSettings(options: { enabled?: boolean; patternId?: string }): Promise<void>;
}

export interface AdhanSound {
    id: string;
    name: string;
    description: string;
}

export interface AdhanSettings {
    selectedAdhan: string;
    fajrAdhan: string;
    volume: number;
}

export interface VibrationSettings {
    enabled: boolean;
    patternId: string;
    patterns: Array<{ id: string; name: string }>;
}

export interface BatteryOptimizationStatus {
    isIgnoring: boolean;
    isAggressiveDevice: boolean;
    manufacturer: string;
    shouldShowPrompt: boolean;
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

/**
 * Save the selected location ID for background prayer time fetching.
 * This MUST be called whenever the user selects a different location.
 * It enables the app to fetch correct prayer times even when closed for days.
 */
export async function saveSelectedLocation(locationId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Save selected location - not on native platform');
        return false;
    }

    try {
        const result = await AdhanNative.saveSelectedLocation({ locationId });
        console.log(`📍 Saved selected location: ${locationId}`);
        return result.success;
    } catch (error) {
        console.error('❌ Error saving selected location:', error);
        return false;
    }
}

/**
 * Get the currently selected location ID from native storage.
 */
export async function getSelectedLocation(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
        return null;
    }

    try {
        const result = await AdhanNative.getSelectedLocation();
        return result.locationId;
    } catch (error) {
        console.error('❌ Error getting selected location:', error);
        return null;
    }
}

/**
 * Manually trigger a background fetch of prayer times from Supabase.
 * Useful for testing or forcing an update.
 */
export async function refreshPrayerTimes(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Refresh prayer times - not on native platform');
        return false;
    }

    try {
        const result = await AdhanNative.refreshPrayerTimes();
        console.log('🔄 Refreshed prayer times from Supabase');
        return result.success;
    } catch (error) {
        console.error('❌ Error refreshing prayer times:', error);
        return false;
    }
}

// ========== Battery Optimization Functions ==========

/**
 * Check battery optimization status
 */
export async function checkBatteryOptimization(): Promise<BatteryOptimizationStatus | null> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Battery optimization check - not on native platform');
        return null;
    }

    try {
        const result = await AdhanNative.checkBatteryOptimization();
        console.log('🔋 Battery optimization status:', result);
        return result;
    } catch (error) {
        console.error('❌ Error checking battery optimization:', error);
        return null;
    }
}

/**
 * Request to disable battery optimization (shows system dialog)
 */
export async function requestBatteryOptimization(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Cannot request battery optimization - not on native platform');
        return;
    }

    try {
        await AdhanNative.requestBatteryOptimization();
        console.log('📱 Opened battery optimization settings');
    } catch (error) {
        console.error('❌ Error requesting battery optimization:', error);
    }
}

/**
 * Open manufacturer-specific battery/autostart settings
 * (Xiaomi, Oppo, Vivo, Huawei, Samsung, etc.)
 */
export async function openManufacturerBatterySettings(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Cannot open manufacturer settings - not on native platform');
        return;
    }

    try {
        await AdhanNative.openManufacturerBatterySettings();
        console.log('⚙️ Opened manufacturer battery settings');
    } catch (error) {
        console.error('❌ Error opening manufacturer settings:', error);
    }
}

/**
 * Mark battery optimization prompt as ignored by user
 */
export async function ignoreBatteryOptimizationPrompt(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
        await AdhanNative.ignoreBatteryOptimizationPrompt();
        console.log('✅ Battery optimization prompt ignored');
    } catch (error) {
        console.error('❌ Error ignoring battery optimization prompt:', error);
    }
}

// ========== Adhan Sound Managment Functions ==========

/**
 * Get available adhan sounds
 */
export async function getAvailableAdhans(): Promise<AdhanSound[]> {
    if (!Capacitor.isNativePlatform()) return [];

    try {
        const result = await AdhanNative.getAvailableAdhans();
        return result.adhans;
    } catch (error) {
        console.error('❌ Error getting available adhans:', error);
        return [];
    }
}

/**
 * Get current adhan settings (selected sound, volume)
 */
export async function getAdhanSettings(): Promise<AdhanSettings | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        const result = await AdhanNative.getAdhanSettings();
        return result;
    } catch (error) {
        console.error('❌ Error getting adhan settings:', error);
        return null;
    }
}

/**
 * Set selected adhan sound
 */
export async function setSelectedAdhan(adhanId: string, isFajr: boolean = false): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        await AdhanNative.setAdhanSelection({ adhanId, isFajr });
        console.log(`✅ Selected ${isFajr ? 'Fajr ' : ''}adhan: ${adhanId}`);
        return true;
    } catch (error) {
        console.error('❌ Error setting adhan:', error);
        return false;
    }
}

/**
 * Set adhan volume (0-100)
 */
export async function setAdhanVolume(volume: number): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        await AdhanNative.setAdhanSelection({ volume });
        console.log(`🔊 Set adhan volume: ${volume}%`);
        return true;
    } catch (error) {
        console.error('❌ Error setting adhan volume:', error);
        return false;
    }
}

// ========== Vibration Settings Functions ==========

export async function getVibrationSettings(): Promise<VibrationSettings | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        const result = await AdhanNative.getVibrationSettings();
        return result;
    } catch (error) {
        console.error('❌ Error getting vibration settings:', error);
        return null;
    }
}

export async function setVibrationEnabled(enabled: boolean): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        await AdhanNative.setVibrationSettings({ enabled });
        console.log(`📳 Vibration enabled: ${enabled}`);
        return true;
    } catch (error) {
        console.error('❌ Error setting vibration enabled:', error);
        return false;
    }
}

export async function setVibrationPattern(patternId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        await AdhanNative.setVibrationSettings({ patternId });
        console.log(`📳 Vibration pattern set: ${patternId}`);
        return true;
    } catch (error) {
        console.error('❌ Error setting vibration pattern:', error);
        return false;
    }
}
