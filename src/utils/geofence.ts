/** Geofencing helpers used to make sure attendance can only be marked at the mosque. */

export const ATTENDANCE_RADIUS_M = 300;

export interface Coords {
  lat: number;
  lng: number;
}

/** Great-circle distance between two points, in metres. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Reads one fresh GPS fix. Resolves null when unavailable or denied. */
export function getCurrentCoords(timeoutMs = 10000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

export interface ProximityResult {
  ok: boolean;
  distance?: number;
  reason?: 'no-location' | 'too-far';
}

/** Checks whether the device is currently inside the mosque's attendance radius. */
export async function checkAtMosque(
  mosque: Coords,
  radius = ATTENDANCE_RADIUS_M,
): Promise<ProximityResult> {
  const here = await getCurrentCoords();
  if (!here) return { ok: false, reason: 'no-location' };
  const distance = distanceMeters(here, mosque);
  return distance <= radius ? { ok: true, distance } : { ok: false, distance, reason: 'too-far' };
}

export const formatDistance = (m?: number) =>
  m == null ? '' : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
