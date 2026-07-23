// Lightweight weather helper backed by Open-Meteo (no API key required).
// Cached in localStorage for 30 minutes to stay well under rate limits.

export interface WeatherSnapshot {
  temperature: number; // Celsius
  weatherCode: number; // WMO code
  isDay: boolean;
  fetchedAt: number;
}

const CACHE_KEY = 'weatherSnapshot';
const CACHE_TTL_MS = 30 * 60 * 1000;

const codeToLabel = (code: number): string => {
  if ([0].includes(code)) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Mainly clear';
  if ([3].includes(code)) return 'Overcast';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'Rain';
  if ([66, 67].includes(code)) return 'Freezing rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Weather';
};

export const describeWeather = (snap: WeatherSnapshot): string =>
  `${Math.round(snap.temperature)}°C · ${codeToLabel(snap.weatherCode)}`;

export const contextualTip = (
  snap: WeatherSnapshot,
  prayerName: string
): string | null => {
  const label = codeToLabel(snap.weatherCode).toLowerCase();
  const t = snap.temperature;
  const p = prayerName.toLowerCase();
  if (label.includes('rain') || label.includes('drizzle') || label.includes('thunder'))
    return '☔ Carry an umbrella on the way to the mosque.';
  if (label.includes('snow')) return '❄️ Roads may be slippery — leave a bit earlier.';
  if (label.includes('fog')) return '🌫️ Low visibility — drive carefully.';
  if (t >= 35 && (p.includes('zuhr') || p.includes('asr')))
    return '🥵 Stay hydrated — drink water before heading out.';
  if (t <= 10 && p.includes('fajr')) return '🧥 Cold morning — wear something warm.';
  if (!snap.isDay && p.includes('isha')) return '🌙 Clear night — perfect for a walk to Isha.';
  return null;
};

export const getWeather = async (
  lat: number,
  lng: number
): Promise<WeatherSnapshot | null> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: WeatherSnapshot & { lat?: number; lng?: number } = JSON.parse(cached);
      if (
        Date.now() - parsed.fetchedAt < CACHE_TTL_MS &&
        Math.abs((parsed.lat ?? lat) - lat) < 0.1 &&
        Math.abs((parsed.lng ?? lng) - lng) < 0.1
      ) {
        return parsed;
      }
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const snap: WeatherSnapshot = {
      temperature: data.current?.temperature_2m ?? 0,
      weatherCode: data.current?.weather_code ?? 0,
      isDay: (data.current?.is_day ?? 1) === 1,
      fetchedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...snap, lat, lng }));
    return snap;
  } catch (e) {
    console.warn('[weather] fetch failed', e);
    return null;
  }
};
