/**
 * FCM device-token lifecycle: registration, refresh and cleanup.
 *
 * Tokens live in `public.push_tokens` and are owned by the verified (anonymous)
 * Supabase session, so RLS keeps every row scoped to its own device/user.
 *
 * Native (Android/iOS) uses @capacitor/push-notifications, which yields a real
 * FCM registration token once `google-services.json` / APNs are configured.
 * On the web we simply no-op (browser push uses the local notification path).
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/utils/deviceId';

const LS_TOKEN = 'fcmPushToken';
export const PUSH_ENABLED_KEY = 'mosqueAnnouncementsEnabled';

export const pushSupported = () => Capacitor.isNativePlatform();

export const isPushEnabled = () => localStorage.getItem(PUSH_ENABLED_KEY) !== 'false';

async function upsertToken(token: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return;

  const deviceId = getDeviceId();
  const previous = localStorage.getItem(LS_TOKEN);

  // Refresh: drop the stale row for this device before writing the new token
  if (previous && previous !== token) {
    await supabase.from('push_tokens').delete().eq('expo_push_token', previous);
  }

  const payload = {
    user_id: userId,
    device_id: deviceId,
    expo_push_token: token,
    provider: 'fcm',
    platform: Capacitor.getPlatform(),
    disabled: false,
    last_seen_at: new Date().toISOString(),
    location_id: localStorage.getItem('selectedLocationId') || null,
    mohalla_location_id: localStorage.getItem('myMohallaId') || null,

    updated_at: new Date().toISOString(),
  } as never;

  const { error } = await supabase
    .from('push_tokens')
    .upsert(payload, { onConflict: 'expo_push_token' });

  if (error) {
    console.warn('push token upsert failed:', error.message);
    return;
  }
  localStorage.setItem(LS_TOKEN, token);
}

/** Mark this device's token disabled (used when the user turns pushes off). */
export async function disablePushToken() {
  const token = localStorage.getItem(LS_TOKEN);
  if (!token) return;
  await supabase
    .from('push_tokens')
    .update({ disabled: true, updated_at: new Date().toISOString() } as never)
    .eq('expo_push_token', token);
}

/** Delete this device's token entirely (sign-out / privacy reset). */
export async function cleanupPushTokens() {
  const token = localStorage.getItem(LS_TOKEN);
  if (token) {
    await supabase.from('push_tokens').delete().eq('expo_push_token', token);
  }
  localStorage.removeItem(LS_TOKEN);
}

/** Keep the stored mosque in sync so the sender can target followers. */
export async function syncPushLocation(locationId?: string | null) {
  const token = localStorage.getItem(LS_TOKEN);
  if (!token || !locationId) return;
  await supabase
    .from('push_tokens')
    .update({ location_id: locationId, last_seen_at: new Date().toISOString() } as never)
    .eq('expo_push_token', token);
}

let initialised = false;

/**
 * Registers for FCM and wires refresh handling. Safe to call on every app boot.
 */
export async function initPushNotifications() {
  if (initialised || !pushSupported() || !isPushEnabled()) return;
  initialised = true;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      console.log('push permission denied');
      return;
    }

    PushNotifications.addListener('registration', (t) => {
      // Fires on first registration AND whenever FCM rotates the token
      upsertToken(t.value).catch(console.warn);
    });

    PushNotifications.addListener('registrationError', (e) => {
      console.warn('push registration error', e);
    });

    PushNotifications.addListener('pushNotificationReceived', (n) => {
      console.log('📣 announcement received', n.title);
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn('push init failed', e);
    initialised = false;
  }
}

/** Called from the notification settings screen. */
export async function setPushEnabled(enabled: boolean) {
  localStorage.setItem(PUSH_ENABLED_KEY, String(enabled));
  if (enabled) {
    initialised = false;
    await initPushNotifications();
  } else {
    await disablePushToken();
  }
}
