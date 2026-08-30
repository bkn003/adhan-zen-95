import React, { useEffect, useState } from 'react';
import { Bell, BellRing, BellOff, ShieldCheck, Loader2 } from 'lucide-react';
import { ensureNotificationPermission } from '@/utils/webNotify';

/**
 * Explains why notification permission is needed, requests it, and — when it is
 * denied or unsupported — makes clear that in-app next-prayer reminders keep
 * working while the app is open.
 */
export const NotificationPermissionCard: React.FC = () => {
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported',
  );
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const id = window.setInterval(() => setPerm(Notification.permission), 3000);
    return () => window.clearInterval(id);
  }, [supported]);

  const ask = async () => {
    setAsking(true);
    await ensureNotificationPermission();
    setPerm(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
    setAsking(false);
  };

  if (perm === 'granted') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-gray-800">Reminders are allowed</p>
          <p className="text-[11px] text-gray-600">
            Prayer alerts can reach you even when the app is in the background.
          </p>
        </div>
      </div>
    );
  }

  if (perm === 'default') {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <BellRing className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-800">Allow prayer notifications</p>
            <p className="text-[11px] text-gray-600">
              Needed so adhan, jamaat and timing-change alerts appear even when the app is closed.
              You can change this any time.
            </p>
          </div>
        </div>
        <button
          onClick={ask}
          disabled={asking}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
        >
          {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Enable notifications
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <BellOff className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold text-gray-800">
          {perm === 'denied' ? 'Notifications are blocked' : 'Notifications unavailable here'}
        </p>
        <p className="text-[11px] text-gray-600">
          In-app next-prayer reminders still work while the app is open — you will see the countdown
          and an on-screen alert.
          {perm === 'denied' &&
            ' To get background alerts, allow notifications for this app in your browser or phone settings.'}
        </p>
      </div>
    </div>
  );
};
