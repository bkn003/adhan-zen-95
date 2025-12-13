import React, { useEffect, useState } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Capacitor } from '@capacitor/core';
import {
    checkBatteryOptimization,
    requestBatteryOptimization,
    openManufacturerBatterySettings,
    ignoreBatteryOptimizationPrompt,
    BatteryOptimizationStatus
} from '@/native/dndService';
import { Battery, Shield, Settings, X } from 'lucide-react';

/**
 * Dialog that prompts users to disable battery optimization
 * for reliable prayer alarms
 */
export function BatteryOptimizationDialog() {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<BatteryOptimizationStatus | null>(null);

    useEffect(() => {
        // Only check on native platform
        if (!Capacitor.isNativePlatform()) return;

        const checkStatus = async () => {
            const result = await checkBatteryOptimization();
            if (result && result.shouldShowPrompt) {
                setStatus(result);
                setOpen(true);
            }
        };

        // Check after a short delay to let app initialize
        const timer = setTimeout(checkStatus, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleOptimize = async () => {
        await requestBatteryOptimization();
        setOpen(false);
    };

    const handleManufacturerSettings = async () => {
        await openManufacturerBatterySettings();
        setOpen(false);
    };

    const handleIgnore = async () => {
        await ignoreBatteryOptimizationPrompt();
        setOpen(false);
    };

    if (!status) return null;

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent className="max-w-md bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-amber-100 rounded-full">
                            <Battery className="w-6 h-6 text-amber-600" />
                        </div>
                        <AlertDialogTitle className="text-xl text-amber-900">
                            Battery Optimization
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-amber-800 space-y-3">
                        <p>
                            To ensure your <strong>prayer alarms work reliably</strong>, please disable battery optimization for Adhan Zen.
                        </p>

                        {status.isAggressiveDevice && (
                            <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                                <p className="text-sm font-medium text-orange-800">
                                    ⚠️ Your {status.manufacturer.charAt(0).toUpperCase() + status.manufacturer.slice(1)} device may kill background apps.
                                    We recommend also enabling <strong>AutoStart</strong>.
                                </p>
                            </div>
                        )}

                        <p className="text-sm text-amber-700">
                            Without this, prayer alarms may not trigger when the phone is sleeping or the app is closed.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex flex-col gap-2 mt-4">
                    <Button
                        onClick={handleOptimize}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        <Shield className="w-4 h-4 mr-2" />
                        Disable Battery Optimization
                    </Button>

                    {status.isAggressiveDevice && (
                        <Button
                            onClick={handleManufacturerSettings}
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Open AutoStart Settings
                        </Button>
                    )}

                    <Button
                        onClick={handleIgnore}
                        variant="ghost"
                        className="text-amber-600 hover:text-amber-700"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Remind Me Later
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
