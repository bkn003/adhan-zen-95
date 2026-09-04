/**
 * UPI deep-link builder.
 *
 * UPI apps (PhonePe/GPay/Paytm) reject links whose parameters are form-encoded
 * (`+` for spaces) or contain characters like `&`, `#`, `/` in the payee name or
 * note — that is what produces the generic "Something went wrong" dialog.
 * So we percent-encode with encodeURIComponent and strip unsafe characters.
 */

const clean = (s: string, max = 50) =>
  (s || '')
    .replace(/[^\w .-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

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

export function buildUpiUrl(scheme: string, { pa, pn, amount, note }: UpiParams): string {
  const vpa = (pa || '').trim();
  if (!vpa || !vpa.includes('@')) return '';

  const parts = [
    `pa=${encodeURIComponent(vpa)}`,
    `pn=${encodeURIComponent(clean(pn) || 'Donation')}`,
    'cu=INR',
  ];
  const amt = Number(amount);
  if (Number.isFinite(amt) && amt > 0) parts.push(`am=${amt.toFixed(2)}`);
  const tn = clean(note || '', 40);
  if (tn) parts.push(`tn=${encodeURIComponent(tn)}`);

  return `${scheme}?${parts.join('&')}`;
}

/** True when a UPI app scheme can realistically be handled. */
export const isUpiCapableDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Launch a UPI app. Returns false when the link could not be built or the device
 * cannot handle app schemes, so the caller can show the QR / copy fallback.
 */
export function openUpiApp(url: string, onNoApp?: () => void): boolean {
  if (!url) return false;
  if (!isUpiCapableDevice()) return false;
  const start = Date.now();
  try {
    window.location.href = url;
  } catch {
    return false;
  }
  window.setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - start < 4000) onNoApp?.();
  }, 2500);
  return true;
}

export const upiQrSrc = (url: string, size = 220) =>
  url ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}` : '';
