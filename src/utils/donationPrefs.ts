const KEY = 'showMosqueDonations';

/** User-level switch for showing mosque donation options in the app. */
export function loadShowMosqueDonations(): boolean {
  return (localStorage.getItem(KEY) ?? 'true') === 'true';
}

export function saveShowMosqueDonations(on: boolean) {
  localStorage.setItem(KEY, String(on));
  window.dispatchEvent(new CustomEvent('mosque-donations-pref-changed'));
}

/** Subscribe to changes of the user-level donation visibility switch. */
export function onShowMosqueDonationsChange(cb: () => void) {
  window.addEventListener('mosque-donations-pref-changed', cb);
  return () => window.removeEventListener('mosque-donations-pref-changed', cb);
}
