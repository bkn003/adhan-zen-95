const CACHE_NAME = 'adhan-zen-v2';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/app-icon-192.png',
  '/app-icon-512.png',
  '/adhan.mp3'
];

// Store prayer times and location data
let prayerTimesCache = null;
let currentLocationId = null;
let scheduledAlarms = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Start background prayer time monitoring
      initializePrayerTimeMonitoring();
    })
  );
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'UPDATE_PRAYER_TIMES':
      updatePrayerTimes(data.prayerTimes, data.locationId);
      break;
    case 'REQUEST_PERMISSION':
      requestNotificationPermission();
      break;
    case 'SYNC_LOCATION':
      currentLocationId = data.locationId;
      break;
  }
});

// Initialize prayer time monitoring
async function initializePrayerTimeMonitoring() {
  try {
    // Load cached data from IndexedDB
    const cachedData = await loadCachedPrayerData();
    if (cachedData) {
      prayerTimesCache = cachedData.prayerTimes;
      currentLocationId = cachedData.locationId;
      scheduleNextPrayerAlarm();
    }
    
    // Set up periodic sync for prayer times
    setInterval(checkAndUpdatePrayerTimes, 60000); // Check every minute
  } catch (error) {
    console.error('Failed to initialize prayer monitoring:', error);
  }
}

// Update prayer times and schedule alarms
function updatePrayerTimes(prayerTimes, locationId) {
  prayerTimesCache = prayerTimes;
  currentLocationId = locationId;
  
  // Save to IndexedDB for offline access
  savePrayerDataToCache(prayerTimes, locationId);
  
  // Schedule next prayer alarm
  scheduleNextPrayerAlarm();
}

// Schedule alarm for next prayer
function scheduleNextPrayerAlarm() {
  if (!prayerTimesCache || prayerTimesCache.length === 0) return;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Clear existing alarms
  scheduledAlarms.clear();
  
  // Schedule alarms for each prayer today
  prayerTimesCache.forEach(prayer => {
    const prayerTime = parseTimeString(prayer.adhan);
    const prayerDateTime = new Date(today);
    prayerDateTime.setHours(prayerTime.hours, prayerTime.minutes, 0, 0);
    
    // Only schedule if prayer time is in the future
    if (prayerDateTime > now) {
      const timeUntilPrayer = prayerDateTime.getTime() - now.getTime();
      
      const alarmId = setTimeout(() => {
        triggerAdhanNotification(prayer);
      }, timeUntilPrayer);
      
      scheduledAlarms.set(prayer.name, alarmId);
      console.log(`Scheduled ${prayer.name} adhan for ${prayerDateTime.toLocaleTimeString()}`);
    }
  });
  
  // Schedule alarms for tomorrow's first prayer
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (prayerTimesCache.length > 0) {
    const firstPrayer = prayerTimesCache[0];
    const firstPrayerTime = parseTimeString(firstPrayer.adhan);
    const firstPrayerTomorrow = new Date(tomorrow);
    firstPrayerTomorrow.setHours(firstPrayerTime.hours, firstPrayerTime.minutes, 0, 0);
    
    const timeUntilFirstPrayer = firstPrayerTomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      // Refresh prayer times for tomorrow and reschedule
      scheduleNextPrayerAlarm();
    }, timeUntilFirstPrayer);
  }
}

// Trigger adhan notification and audio
async function triggerAdhanNotification(prayer) {
  try {
    // Show notification
    await self.registration.showNotification(`${prayer.name} Adhan`, {
      body: `It's time for ${prayer.name} prayer at ${prayer.adhan}`,
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: 'adhan-notification',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'stop', title: 'Stop Adhan' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
    
    // Play adhan audio for 15 seconds
    await playAdhanAudio();
    
    console.log(`Adhan triggered for ${prayer.name} at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('Failed to trigger adhan:', error);
  }
}

// Play adhan audio for 15 seconds
async function playAdhanAudio() {
  try {
    // Use the cached audio file
    const audioResponse = await caches.match('/adhan.mp3');
    if (audioResponse) {
      const audioBlob = await audioResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio context for background playback
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      
      // Play for 15 seconds
      audio.play();
      
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        URL.revokeObjectURL(audioUrl);
      }, 15000); // Stop after 15 seconds
    }
  } catch (error) {
    console.error('Failed to play adhan audio:', error);
  }
}

// Parse time string (HH:MM or HH:MM:SS) to hours and minutes
function parseTimeString(timeStr) {
  const parts = timeStr.split(':');
  return {
    hours: parseInt(parts[0], 10),
    minutes: parseInt(parts[1], 10)
  };
}

// Check and update prayer times periodically
async function checkAndUpdatePrayerTimes() {
  if (!currentLocationId) return;
  
  try {
    // Try to fetch fresh prayer times
    const response = await fetch(`/api/prayer-times?locationId=${currentLocationId}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.prayerTimes) {
        updatePrayerTimes(data.prayerTimes, currentLocationId);
      }
    }
  } catch (error) {
    // Fallback to cached data during offline
    console.log('Using cached prayer times (offline mode)');
  }
}

// Save prayer data to IndexedDB
async function savePrayerDataToCache(prayerTimes, locationId) {
  try {
    const request = indexedDB.open('AdhanZenDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('prayerData')) {
        db.createObjectStore('prayerData', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['prayerData'], 'readwrite');
      const store = transaction.objectStore('prayerData');
      
      store.put({
        id: 'current',
        prayerTimes,
        locationId,
        timestamp: Date.now()
      });
    };
  } catch (error) {
    console.error('Failed to save prayer data:', error);
  }
}

// Load prayer data from IndexedDB
async function loadCachedPrayerData() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('AdhanZenDB', 1);
      
      request.onerror = () => resolve(null);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['prayerData'], 'readonly');
        const store = transaction.objectStore('prayerData');
        const getRequest = store.get('current');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result && (Date.now() - result.timestamp) < 24 * 60 * 60 * 1000) {
            // Data is less than 24 hours old
            resolve(result);
          } else {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => resolve(null);
      };
    } catch (error) {
      resolve(null);
    }
  });
}

// Request notification permission
async function requestNotificationPermission() {
  try {
    const permission = await self.registration.showNotification('Test', {
      body: 'Adhan notifications are now enabled',
      icon: '/app-icon-192.png',
      tag: 'permission-test'
    });
    console.log('Notification permission granted');
  } catch (error) {
    console.error('Notification permission denied:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'stop') {
    // Stop any playing audio
    // Audio will be stopped automatically after 15 seconds
    console.log('Adhan stopped by user');
  } else {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for prayer times
self.addEventListener('sync', (event) => {
  if (event.tag === 'prayer-times-sync') {
    event.waitUntil(checkAndUpdatePrayerTimes());
  }
});