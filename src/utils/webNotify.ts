/**
 * Chrome on Android forbids `new Notification()` in page context
 * ("Illegal constructor"). Always go through the service worker registration
 * and only fall back to the constructor on desktop browsers without a SW.
 */
export async function showWebNotification(
  title: string,
  options: NotificationOptions = {},
): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      let reg =
        (await navigator.serviceWorker.getRegistration('/')) ??
        (await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(() => r(null), 3000)),
        ]));
      // No active worker yet — register one ourselves instead of asking the
      // user to reload. Await the registering worker becoming active.
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }
      if (reg && !reg.active && (reg.installing || reg.waiting)) {
        const worker = reg.installing ?? reg.waiting;
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 5000);
          worker!.addEventListener('statechange', () => {
            if (worker!.state === 'activated') {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
      }
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/** Requests permission if needed and returns whether we may notify. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}
