/**
 * UPI deep-link builder and launcher.
 *
 * Causes of the generic "Something went wrong" screen this file guards against:
 *  1. Form-encoded params (`+` for spaces) or raw `&`, `#`, `/` in the payee
 *     name / note — everything is percent-encoded and sanitised.
 *  2. Google Pay's `tez://` and PhonePe's `phonepe://` handlers reject a request
 *     with no transaction reference — a `tr` (and `tid`) is always attached for
 *     app-specific schemes.
 *  3. Custom schemes (`upi://`, `tez://`) are refused by the Android WebView the
 *     packaged app runs in (ERR_UNKNOWN_URL_SCHEME). On Android we hand over an
 *     `intent://` URL targeting the app's package instead, which the WebView and
 *     Chrome both resolve, with a plain `upi://` chooser as the fallback.
 *  4. `location.href` assignment is silently blocked in some WebViews — the
 *     launch goes through a synthetic anchor click inside the user gesture.
 */

const clean = (s: string, max = 50) =>
  (s || '')
    .replace(/[^\w .-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** UPI IDs look like `name@bank`; anything else makes every app error out. */
export const isValidVpa = (vpa: string) =>
  /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test((vpa || '').trim());

export interface UpiParams {
  /** Payee VPA (UPI ID). */
  pa: string;
  /** Payee name. */
  pn: string;
  /** Amount in INR. */
  amount?: number | '' | null;
  /** Transaction note. */
  note?: string;
}

interface UpiTarget {
  scheme: string;
  /** Android package, used to build a reliable intent:// handover. */
  pkg?: string;
  /** These handlers reject requests without a transaction reference. */
  needsRef?: boolean;
}

const TARGETS: Record<string, UpiTarget> = {
  'tez://upi/pay': { scheme: 'tez://upi/pay', pkg: 'com.google.android.apps.nbu.paisa.user', needsRef: true },
  'phonepe://pay': { scheme: 'phonepe://pay', pkg: 'com.phonepe.app', needsRef: true },
  'paytmmp://pay': { scheme: 'paytmmp://pay', pkg: 'net.one97.paytm', needsRef: true },
  'upi://pay': { scheme: 'upi://pay' },
};

const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** Short alphanumeric reference; UPI rejects symbols here. */
const txnRef = () => `AZ${Date.now().toString(36).toUpperCase()}`;

const buildQuery = ({ pa, pn, amount, note }: UpiParams, needsRef: boolean) => {
  const vpa = (pa || '').trim();
  const parts = [
    `pa=${encodeURIComponent(vpa)}`,
    `pn=${encodeURIComponent(clean(pn) || 'Donation')}`,
    'cu=INR',
  ];
  const amt = Number(amount);
  if (Number.isFinite(amt) && amt > 0) parts.push(`am=${amt.toFixed(2)}`);
  const tn = clean(note || '', 40);
  if (tn) parts.push(`tn=${encodeURIComponent(tn)}`);
  if (needsRef) {
    const ref = txnRef();
    parts.push(`tr=${ref}`, `tid=${ref}`);
  }
  return parts.join('&');
};

/**
 * Builds the URL to open. Returns '' when the UPI ID is missing or malformed so
 * callers can show the QR / copy fallback instead of a broken app screen.
 */
export function buildUpiUrl(scheme: string, params: UpiParams): string {
  if (!isValidVpa(params.pa)) return '';
  const target = TARGETS[scheme] ?? { scheme };
  const query = buildQuery(params, !!target.needsRef);

  if (isAndroid() && target.pkg) {
    // intent:// survives the WebView, targets the app, and falls back to the
    // Play Store listing rather than a dead-end error page.
    return `intent://pay?${query}#Intent;scheme=upi;package=${target.pkg};S.browser_fallback_url=${encodeURIComponent(
      `upi://pay?${query}`,
    )};end`;
  }
  return `${target.scheme}?${query}`;
}

/** A plain `upi://pay` link — the only form a QR code should ever encode. */
export const buildUpiQrUrl = (params: UpiParams): string => {
  if (!isValidVpa(params.pa)) return '';
  return `upi://pay?${buildQuery(params, false)}`;
};

/** True when a UPI app scheme can realistically be handled. */
export const isUpiCapableDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Launch a UPI app. Returns false when the link could not be built or the device
 * cannot handle app schemes, so the caller can show the QR / copy fallback.
 * `onNoApp` fires when we are still on this page shortly after the attempt,
 * meaning nothing took the handover.
 */
export function openUpiApp(url: string, onNoApp?: () => void): boolean {
  if (!url) return false;
  if (!isUpiCapableDevice()) return false;
  const start = Date.now();
  let handed = false;

  try {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    handed = true;
  } catch {
    handed = false;
  }

  if (!handed) {
    try {
      window.location.href = url;
    } catch {
      return false;
    }
  }

  window.setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - start < 4000) onNoApp?.();
  }, 2500);
  return true;
}

export const upiQrSrc = (url: string, size = 220) =>
  url ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}` : '';
