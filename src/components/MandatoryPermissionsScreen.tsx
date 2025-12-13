import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Moon, Battery, Zap, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import {
  checkDndPermission,
  requestDndPermission,
  checkBatteryOptimization,
  requestBatteryOptimization,
  openManufacturerBatterySettings
} from '@/native/dndService';

interface PermissionStatus {
  dnd: boolean;
  batteryOptimization: boolean;
  autostart: boolean; // We can't directly check this, so we track if user clicked the button
}

interface MandatoryPermissionsScreenProps {
  onAllPermissionsGranted: () => void;
}

export const MandatoryPermissionsScreen: React.FC<MandatoryPermissionsScreenProps> = ({
  onAllPermissionsGranted
}) => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    dnd: false,
    batteryOptimization: false,
    autostart: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAggressiveDevice, setIsAggressiveDevice] = useState(false);
  const [manufacturer, setManufacturer] = useState('');

  const checkAllPermissions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      onAllPermissionsGranted();
      return;
    }

    try {
      // Check DND permission
      const hasDnd = await checkDndPermission();

      // Check battery optimization
      const batteryStatus = await checkBatteryOptimization();
      const hasBatteryOptimization = batteryStatus?.isIgnoring ?? false;
      setIsAggressiveDevice(batteryStatus?.isAggressiveDevice ?? false);
      setManufacturer(batteryStatus?.manufacturer ?? '');

      // Autostart - check if user has acknowledged it
      const autostartAcknowledged = localStorage.getItem('autostart_permission_granted') === 'true';

      setPermissions({
        dnd: hasDnd,
        batteryOptimization: hasBatteryOptimization,
        autostart: autostartAcknowledged
      });

      // Check if all permissions are granted
      if (hasDnd && hasBatteryOptimization && autostartAcknowledged) {
        localStorage.setItem('all_permissions_granted', 'true');
        onAllPermissionsGranted();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onAllPermissionsGranted]);

  useEffect(() => {
    // Check if already granted previously
    const alreadyGranted = localStorage.getItem('all_permissions_granted') === 'true';
    if (alreadyGranted) {
      // Re-verify permissions are still valid
      checkAllPermissions();
    } else {
      checkAllPermissions();
    }

    // Re-check when app becomes visible (user returns from settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAllPermissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAllPermissions]);

  const handleDndPermission = async () => {
    await requestDndPermission();
    // Will re-check when user returns from settings
  };

  const handleBatteryOptimization = async () => {
    await requestBatteryOptimization();
    // Will re-check when user returns from settings
  };

  const handleAutostartPermission = async () => {
    // Open manufacturer-specific settings
    await openManufacturerBatterySettings();
    // Mark as acknowledged since we can't detect autostart status
    localStorage.setItem('autostart_permission_granted', 'true');
    checkAllPermissions();
  };

  const handleRefresh = () => {
    checkAllPermissions();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const allGranted = permissions.dnd && permissions.batteryOptimization && permissions.autostart;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-600/20 mb-4">
          <Shield className="w-10 h-10 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Required Permissions</h1>
        <p className="text-gray-400 text-sm px-4">
          Adhan Zen needs these permissions to work reliably, even when the app is closed.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-200 text-sm">
            Without these permissions, Adhan alarms and Auto-DND <strong>will not work</strong> when the app is closed.
          </p>
        </div>
      </div>

      {/* Permission Cards */}
      <div className="space-y-4 flex-1">
        {/* DND Permission */}
        <div
          className={`rounded-xl p-4 border transition-all ${permissions.dnd
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-white/5 border-white/10'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${permissions.dnd ? 'bg-green-500/20' : 'bg-purple-500/20'
              }`}>
              {permissions.dnd ? (
                <Check className="w-6 h-6 text-green-400" />
              ) : (
                <Moon className="w-6 h-6 text-purple-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Do Not Disturb</h3>
              <p className="text-gray-400 text-xs">Auto-silence during prayer times</p>
            </div>
            {!permissions.dnd && (
              <Button
                onClick={handleDndPermission}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Enable
              </Button>
            )}
          </div>
        </div>

        {/* Battery Optimization */}
        <div
          className={`rounded-xl p-4 border transition-all ${permissions.batteryOptimization
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-white/5 border-white/10'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${permissions.batteryOptimization ? 'bg-green-500/20' : 'bg-amber-500/20'
              }`}>
              {permissions.batteryOptimization ? (
                <Check className="w-6 h-6 text-green-400" />
              ) : (
                <Battery className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Battery Optimization</h3>
              <p className="text-gray-400 text-xs">Keep alarms running in background</p>
            </div>
            {!permissions.batteryOptimization && (
              <Button
                onClick={handleBatteryOptimization}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Disable
              </Button>
            )}
          </div>
        </div>

        {/* Autostart Permission */}
        <div
          className={`rounded-xl p-4 border transition-all ${permissions.autostart
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-white/5 border-white/10'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${permissions.autostart ? 'bg-green-500/20' : 'bg-blue-500/20'
              }`}>
              {permissions.autostart ? (
                <Check className="w-6 h-6 text-green-400" />
              ) : (
                <Zap className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Autostart Permission</h3>
              <p className="text-gray-400 text-xs">
                {isAggressiveDevice
                  ? `Required for ${manufacturer} devices`
                  : 'Allow app to start automatically'}
              </p>
            </div>
            {!permissions.autostart && (
              <Button
                onClick={handleAutostartPermission}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Enable
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-6 space-y-3">
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="w-full border-purple-400/50 text-purple-300 hover:bg-purple-500/20 hover:text-white bg-purple-500/10"
        >
          Refresh Permission Status
        </Button>

        {allGranted && (
          <Button
            onClick={onAllPermissionsGranted}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6"
          >
            Continue to App
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        )}

        {!allGranted && (
          <p className="text-center text-gray-500 text-xs">
            Please grant all permissions to continue
          </p>
        )}
      </div>
    </div>
  );
};
