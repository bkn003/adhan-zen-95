import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Moon, BellRing } from 'lucide-react';
import { checkDndPermission, requestDndPermission } from '@/native/dndService';
import { Capacitor } from '@capacitor/core';

export const DndPermissionDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only check on native Android platform
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'ios') return;

    const checkPermission = async () => {
      // Check if we already have permission
      const hasPermission = await checkDndPermission();
      
      // Check if we've already asked gracefully (don't spam on every launch if they refused)
      const hasAsked = localStorage.getItem('dnd_permission_asked');
      
      if (!hasPermission && !hasAsked) {
        // Delay slightly to let app load
        setTimeout(() => setOpen(true), 1500);
      }
    };

    checkPermission();
  }, []);

  const handleGrant = async () => {
    setOpen(false);
    localStorage.setItem('dnd_permission_asked', 'true');
    await requestDndPermission();
  };

  const handleCancel = () => {
    setOpen(false);
    localStorage.setItem('dnd_permission_asked', 'true');
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="w-[90%] max-w-sm rounded-xl">
        <AlertDialogHeader>
          <div className="mx-auto bg-indigo-100 p-3 rounded-full mb-2">
            <Moon className="w-8 h-8 text-indigo-600" />
          </div>
          <AlertDialogTitle className="text-center text-xl">Auto-Silent Mode</AlertDialogTitle>
          <AlertDialogDescription className="text-center pt-2">
            Adhan Zen needs <b>"Do Not Disturb"</b> access to automatically silence your phone 5 minutes before Iqamah.
            <br /><br />
            Please tap <b>Grant Permission</b> and find "Adhan Zen" in the list to enable it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:gap-0">
          <AlertDialogAction 
            onClick={handleGrant}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
          >
            Grant Permission
          </AlertDialogAction>
          <AlertDialogCancel onClick={handleCancel} className="w-full border-0 text-gray-500 hover:bg-gray-50 mt-2">
            Not Now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
