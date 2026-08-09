import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { inQuietHours } from '@/utils/quietHours';
import { showWebNotification, ensureNotificationPermission } from '@/utils/webNotify';

export interface TestNotificationResult {
  ok: boolean;
  channel: 'android' | 'web' | 'none';
  message: string;
}

/**
 * Fires one real reminder right now so the user can verify the whole chain
 * (permission -> channel -> sound) on both Android and PWA.
 */
export async function sendTestNotification(
  title = 'Test reminder',
  body = 'Reminders are working — this is how a prayer alert will look.',
): Promise<TestNotificationResult> {
  const quiet = inQuietHours();

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      let granted = perm.display === 'granted';
      if (!granted) {
        const req = await LocalNotifications.requestPermissions();
        granted = req.display === 'granted';
      }
      if (!granted) {
        return { ok: false, channel: 'android', message: 'Notification permission is blocked in Android settings.' };
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 100000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 2000) },
            smallIcon: 'ic_launcher',
          },
        ],
      });
      return {
        ok: true,
        channel: 'android',
        message: quiet
          ? 'Test sent — note you are inside quiet hours, so real reminders would be silenced now.'
          : 'Test sent — it should appear in your notification tray in ~2 seconds.',
      };
    } catch (e) {
      return { ok: false, channel: 'android', message: (e as Error)?.message || 'Could not schedule the test.' };
    }
  }

  // PWA / browser
  if (typeof Notification === 'undefined') {
    return { ok: false, channel: 'none', message: 'This browser does not support notifications.' };
  }
  if (!(await ensureNotificationPermission())) {
    return { ok: false, channel: 'web', message: 'Allow notifications for this site, then run the test again.' };
  }
  try {
    const shown = await showWebNotification(title, {
      body,
      icon: '/app-icon-192.png',
      tag: 'prayer-test',
    });
    if (!shown) {
      return { ok: false, channel: 'web', message: 'Could not show the test notification. Reload the app so the service worker registers, then try again.' };
    }
    return {
      ok: true,
      channel: 'web',
      message: quiet
        ? 'Test sent — you are inside quiet hours, so real reminders would be silenced now.'
        : 'Test sent — check your notifications.',
    };
  } catch (e) {
    return { ok: false, channel: 'web', message: (e as Error)?.message || 'Could not show the test notification.' };
  }
}
