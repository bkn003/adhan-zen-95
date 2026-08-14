/**
 * Firebase Web Push (PWA) token lifecycle.
 *
 * Native Android keeps using @capacitor/push-notifications (see
 * pushRegistration.ts) and schedules its own exact alarms. Browsers/PWAs cannot
 * schedule anything reliably while closed, so they register an FCM *web* token
 * here and the backend pushes:
 *   - prayer-time change alerts (prayer-change-watch)
 *   - adhan + pre-prayer reminders (prayer-reminders, runs every minute)
 *
 * Tokens are stored in public.push_tokens with provider 'fcm-web' and require a
 * signed-in Supabase session (RLS scopes each row to its owner).
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/utils/deviceId';
import { loadPrayerNotificationPrefs } from '@/native/prayerNotificationPrefs';
import { loadQuietHours } from '@/utils/quietHours';

const LS_WEB_TOKEN = 'fcmWebPushToken';

const env = import.meta.env as Record<string, string | undefined>;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};
const vapidKey = env.VITE_FIREBASE_VAPID_KEY ?? '';

/** True when the Firebase web config + VAPID key have been provided. */
export const webPushConfigured = () =>
  !!firebaseConfig.projectId && !!firebaseConfig.messagingSenderId && !!firebaseConfig.appId && !!vapidKey;

export const webPushSupported = () =>
  !Capacitor.isNativePlatform() &&
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'Notification' in window &&
  'PushManager' in window;

/** Everything the backend needs to decide *when* to push this device. */
function reminderPayload() {
  return {
    prefs: loadPrayerNotificationPrefs(),
    quietHours: loadQuietHours(),
    weather: localStorage.getItem('weatherReminders') === 'true',
    alarm: localStorage.getItem('prayerAlarmEnabled') === 'true',
  };
}

const tokenRow = (token: string) => ({
  device_id: getDeviceId(),
  expo_push_token: token,
  provider: 'fcm-web',
  platform: 'web',
  disabled: false,
  self_scheduled: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  reminder_prefs: reminderPayload(),
  last_seen_at: new Date().toISOString(),
  location_id: localStorage.getItem('selectedLocationId') || null,
  mohalla_location_id: localStorage.getItem('myMohallaId') || null,
  updated_at: new Date().toISOString(),
});

async function upsertWebToken(token: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return;

  const previous = localStorage.getItem(LS_WEB_TOKEN);
  if (previous && previous !== token) {
    await supabase.from('push_tokens').delete().eq('expo_push_token', previous);
  }

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ ...tokenRow(token), user_id: userId } as never, { onConflict: 'expo_push_token' });

  if (error) {
    console.warn('web push token upsert failed:', error.message);
    return;
  }
  localStorage.setItem(LS_WEB_TOKEN, token);
}

let initialised = false;

/**
 * Registers the messaging service worker and stores the FCM web token.
 * Safe to call repeatedly; no-ops on native, when unconfigured, or unsupported.
 */
export async function initWebPush(): Promise<'ok' | 'unsupported' | 'unconfigured' | 'denied' | 'error'> {
  if (!webPushSupported()) return 'unsupported';
  if (!webPushConfigured()) return 'unconfigured';
  if (initialised) return 'ok';

  try {
    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return 'denied';
    } else if (Notification.permission !== 'granted') {
      return 'denied';
    }

    const [{ initializeApp, getApps }, { getMessaging, getToken, onMessage, isSupported }] = await Promise.all([
      import('firebase/app'),
      import('firebase/messaging'),
    ]);
    if (!(await isSupported())) return 'unsupported';

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

    // Config travels in the query string so the worker can init Firebase too.
    const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    }).toString()}`;
    const registration = await navigator.serviceWorker.register(swUrl, { scope: '/firebase-cloud-messaging-push-scope' });

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return 'error';

    await upsertWebToken(token);
    initialised = true;

    // Foreground messages: show them ourselves (FCM stays silent while focused).
    onMessage(messaging, (payload) => {
      const n = payload.notification;
      if (!n?.title) return;
      void registration.showNotification(n.title, {
        body: n.body ?? '',
        icon: '/app-icon-192.png',
        tag: payload.data?.type,
      });
    });

    return 'ok';
  } catch (e) {
    console.warn('web push init failed', e);
    return 'error';
  }
}

/** Pushes the latest reminder preferences / mosque selection to the backend. */
export async function syncWebPushPrefs() {
  const token = localStorage.getItem(LS_WEB_TOKEN);
  if (!token) return;
  await supabase
    .from('push_tokens')
    .update({
      reminder_prefs: reminderPayload(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      location_id: localStorage.getItem('selectedLocationId') || null,
      mohalla_location_id: localStorage.getItem('myMohallaId') || null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('expo_push_token', token);
}

/** Removes this browser's token (sign-out / reminders turned off). */
export async function cleanupWebPush() {
  const token = localStorage.getItem(LS_WEB_TOKEN);
  if (token) {
    await supabase.from('push_tokens').delete().eq('expo_push_token', token);
  }
  localStorage.removeItem(LS_WEB_TOKEN);
  initialised = false;
}
