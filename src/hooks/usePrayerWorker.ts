import { useEffect } from 'react';
import type { Prayer } from '@/types/prayer.types';

export const usePrayerWorker = (prayerTimes: Prayer[], locationId?: string) => {
  useEffect(() => {
    // Register service worker and setup communication
    const initializeWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration);
          
          // Request notification permission
          if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
          }
          
          // Send prayer times to service worker
          if (registration.active && prayerTimes.length > 0 && locationId) {
            registration.active.postMessage({
              type: 'UPDATE_PRAYER_TIMES',
              data: { prayerTimes, locationId }
            });
          }
          
          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  // Send updated prayer times to new worker
                  newWorker.postMessage({
                    type: 'UPDATE_PRAYER_TIMES',
                    data: { prayerTimes, locationId }
                  });
                }
              });
            }
          });
          
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    initializeWorker();
  }, [prayerTimes, locationId]);

  useEffect(() => {
    // Update service worker when prayer times change
    if ('serviceWorker' in navigator && prayerTimes.length > 0 && locationId) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'UPDATE_PRAYER_TIMES',
            data: { prayerTimes, locationId }
          });
        }
      });
    }
  }, [prayerTimes, locationId]);

  useEffect(() => {
    // Sync location changes
    if ('serviceWorker' in navigator && locationId) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'SYNC_LOCATION',
            data: { locationId }
          });
        }
      });
    }
  }, [locationId]);

  // Request notification permission explicitly
  const requestNotificationPermission = async () => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'REQUEST_PERMISSION'
            });
          }
        });
      }
      return permission;
    }
    return 'denied';
  };

  return { requestNotificationPermission };
};