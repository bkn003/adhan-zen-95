const KEY = 'adhan_zen_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}
