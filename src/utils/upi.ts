/**
 * UPI deep-link builder and launcher — deliberately minimal.
 *
 * App-specific schemes (`tez://`, `phonepe://`, `paytmmp://`) are the main cause
 * of "suspicious payment" and "something went wrong" screens: each app validates
 * its own extra fields (signatures, merchant refs, transaction ids) and rejects
 * anything it did not issue itself. The interoperable `upi://pay` request with
 * only the four fields every app accepts (payee, name, currency, amount) is what
 * banks and NPCI document for person-to-person collect links, and Android shows
 * the chooser with *every* installed UPI app.
 *
 * So: one link, one chooser, no per-app schemes, no transaction references.
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
  /** Transaction note (ignored — notes trip several apps' fraud checks). */
  note?: string;
}

const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** Only the fields every UPI app accepts without extra validation. */
const buildQuery = ({ pa, pn, amount }: UpiParams) => {
  const parts = [
    `pa=${encodeURIComponent((pa || '').trim())}`,
    `pn=${encodeURIComponent(clean(pn) || 'Donation')}`,
    'cu=INR',
  ];
  const amt = Number(amount);
  if (Number.isFinite(amt) && amt > 0) parts.push(`am=${amt.toFixed(2)}`);
  return parts.join('&');
};

/**
 * The link to open: always the interoperable UPI request. On Android it is handed
 * over as an `intent://` URL with no target package, so the system shows every
 * installed UPI app in the chooser (a plain `upi://pay` handler is refused by the
 * WebView the packaged app runs in). Returns '' for a missing/malformed UPI ID so
 * callers can show the QR / copy fallback instead of a broken app screen.
 *
 * The first argument is kept for call compatibility and is ignored.
 */
export function buildUpiUrl(_scheme: string, params: UpiParams): string {
  if (!isValidVpa(params.pa)) return '';
  const query = buildQuery(params);
  if (isAndroid()) {
    return `intent://pay?${query}#Intent;scheme=upi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(
      `upi://pay?${query}`,
    )};end`;
  }
  return `upi://pay?${query}`;
}

/** A plain `upi://pay` link — used for the QR code and for copy/share. */
export const buildUpiQrUrl = (params: UpiParams): string => {
  if (!isValidVpa(params.pa)) return '';
  return `upi://pay?${buildQuery(params)}`;
};

/** True when a UPI app scheme can realistically be handled. */
export const isUpiCapableDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Launch the UPI chooser. Returns false when the link could not be built or the
 * device cannot handle app schemes, so the caller can show the QR / copy
 * fallback. `onNoApp` fires when we are still on this page shortly afterwards,
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
