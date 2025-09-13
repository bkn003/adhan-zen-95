import { useState, useEffect } from 'react';

interface NotificationState {
  permission: NotificationPermission;
  supported: boolean;
  enabled: boolean;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    supported: 'Notification' in window,
    enabled: false,
  });

  useEffect(() => {
    if ('Notification' in window) {
      setState(prev => ({
        ...prev,
        permission: Notification.permission,
        enabled: localStorage.getItem('adhanNotifications') === 'true',
      }));
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    }

    return false;
  };

  const scheduleAdhanNotification = (prayerName: string, adhanTime: string, iqamahTime: string) => {
    if (!state.enabled || state.permission !== 'granted') return;

    const now = new Date();
    const [hours, minutes] = adhanTime.split(':').map(Number);
    const adhanDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    // If the time has passed today, schedule for tomorrow
    if (adhanDate <= now) {
      adhanDate.setDate(adhanDate.getDate() + 1);
    }

    const timeUntilAdhan = adhanDate.getTime() - now.getTime();

    // Schedule notification
    setTimeout(() => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        // Use service worker for background notifications
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(`${prayerName} Prayer Time`, {
            body: `Adhan: ${adhanTime} | Iqamah: ${iqamahTime}`,
            icon: '/app-icon-192.png',
            badge: '/app-icon-192.png',
            tag: `adhan-${prayerName}`,
            requireInteraction: true,
            data: {
              prayerName,
              adhanTime,
              iqamahTime
            }
          });
        });

        // Play adhan sound
        playAdhanSound();
      } else {
        // Fallback to regular notification
        new Notification(`${prayerName} Prayer Time`, {
          body: `Adhan: ${adhanTime} | Iqamah: ${iqamahTime}`,
          icon: '/app-icon-192.png',
        });
        playAdhanSound();
      }
    }, timeUntilAdhan);
  };

  const playAdhanSound = () => {
    const volume = parseFloat(localStorage.getItem('adhanVolume') || '50') / 100;
    const audio = new Audio('/adhan.mp3');
    audio.volume = volume;
    audio.play().catch(error => {
      console.log('Could not play adhan sound:', error);
    });
  };

  const enableNotifications = async (): Promise<boolean> => {
    const granted = await requestPermission();
    if (granted) {
      setState(prev => ({ ...prev, enabled: true }));
      localStorage.setItem('adhanNotifications', 'true');
    }
    return granted;
  };

  const disableNotifications = () => {
    setState(prev => ({ ...prev, enabled: false }));
    localStorage.setItem('adhanNotifications', 'false');
  };

  return {
    ...state,
    requestPermission,
    enableNotifications,
    disableNotifications,
    scheduleAdhanNotification,
    playAdhanSound,
  };
};