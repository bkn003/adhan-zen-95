import { useState, useEffect } from 'react';
import { getWeather, describeWeather, contextualTip } from '@/utils/weather';
import { inQuietHours } from '@/utils/quietHours';
import { showWebNotification } from '@/utils/webNotify';

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
    const timeUntilPre = timeUntilAdhan - 15 * 60 * 1000;

    const weatherEnabled = localStorage.getItem('weatherReminders') === 'true';
    const buildBody = async (base: string) => {
      if (!weatherEnabled) return base;
      try {
        const locData = localStorage.getItem('selectedLocationData');
        if (!locData) return base;
        const loc = JSON.parse(locData);
        if (!loc?.latitude || !loc?.longitude) return base;
        const snap = await getWeather(loc.latitude, loc.longitude);
        if (!snap) return base;
        const tip = contextualTip(snap, prayerName);
        return `${base}\n${describeWeather(snap)}${tip ? '\n' + tip : ''}`;
      } catch {
        return base;
      }
    };

    // 15-minute pre-prayer reminder with weather context
    if (timeUntilPre > 0) {
      setTimeout(async () => {
        if (inQuietHours()) return;
        const body = await buildBody(`Prayer in 15 minutes — Adhan at ${adhanTime}`);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) =>
            reg.showNotification(`${prayerName} soon`, {
              body,
              icon: '/app-icon-192.png',
              badge: '/app-icon-192.png',
              tag: `pre-${prayerName}`,
            })
          );
        } else {
          void showWebNotification(`${prayerName} soon`, { body, icon: '/app-icon-192.png' });
        }
      }, timeUntilPre);
    }

    // Schedule main adhan notification
    setTimeout(async () => {
      if (inQuietHours()) return;
      const body = await buildBody(`Adhan: ${adhanTime} | Iqamah: ${iqamahTime}`);
      if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(`${prayerName} Prayer Time`, {
            body,
            icon: '/app-icon-192.png',
            badge: '/app-icon-192.png',
            tag: `adhan-${prayerName}`,
            requireInteraction: true,
            data: { prayerName, adhanTime, iqamahTime }
          });
        });
        playAdhanSound();
      } else {
        void showWebNotification(`${prayerName} Prayer Time`, { body, icon: '/app-icon-192.png' });
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