import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Map as MapIcon, Navigation, Search, Crosshair } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMosquePrayerStatus } from '@/hooks/useMosquePrayerStatus';
import { matchesSearch } from '@/utils/searchUtils';
import { formatTo12Hour } from '@/utils/timeFormat';

// Leaflet's default marker assets don't resolve through the bundler — use an inline pin.
const pin = (color: string) =>
  L.divIcon({
    className: 'adhan-map-pin',
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });

const mosquePin = pin('#059669');
const mePin = pin('#2563eb');

/** Map of mosques with next jamaat time, city filter and one-tap directions. */
export const MosqueMapScreen: React.FC<{ onBack: () => void; onOpenMosque?: (id: string) => void }> = ({
  onBack,
  onOpenMosque,
}) => {
  const { data: locations } = useLocations();
  const { latitude, longitude, calculateDistance } = useGeolocation();
  const [city, setCity] = useState('all');
  const [query, setQuery] = useState('');

  const cities = useMemo(
    () => Array.from(new Set((locations ?? []).map((l) => l.district).filter(Boolean))).sort(),
    [locations],
  );

  const visible = useMemo(
    () =>
      (locations ?? [])
        .filter((l) => (city === 'all' || l.district === city) && (!query || matchesSearch(l.mosque_name, query)))
        .map((l) => ({
          ...l,
          distance:
            latitude && longitude && calculateDistance
              ? calculateDistance(latitude, longitude, Number(l.latitude), Number(l.longitude))
              : null,
        }))
        .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9)),
    [locations, city, query, latitude, longitude, calculateDistance],
  );

  const status = useMosquePrayerStatus(visible.map((l) => l.id));

  const center: [number, number] = latitude && longitude
    ? [latitude, longitude]
    : visible[0]
      ? [Number(visible[0].latitude), Number(visible[0].longitude)]
      : [11.0168, 76.9558];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-3 shadow-md">
        <button onClick={onBack} className="p-1.5 bg-white/15 rounded-lg" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <MapIcon className="w-4 h-4 text-white" />
        <h2 className="text-base font-bold text-white">Mosque Map</h2>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-2.5 shadow-sm space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mosque"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setCity('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap ${
                city === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              All cities
            </button>
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap ${
                  city === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <MapContainer center={center} zoom={12} style={{ height: 340, width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {latitude && longitude && (
              <>
                <Marker position={[latitude, longitude]} icon={mePin}>
                  <Popup>You are here</Popup>
                </Marker>
                <Circle center={[latitude, longitude]} radius={300} pathOptions={{ color: '#2563eb', weight: 1 }} />
              </>
            )}
            {visible.map((l) => {
              const s = status.data?.[l.id];
              return (
                <Marker key={l.id} position={[Number(l.latitude), Number(l.longitude)]} icon={mosquePin}>
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{l.mosque_name}</p>
                      <p className="text-xs text-gray-500">{l.district}</p>
                      <p className="text-xs">
                        {s?.nextPrayerName
                          ? `Next: ${s.nextPrayerName} ${formatTo12Hour((s.nextIqamahTime ?? '').slice(0, 5))}`
                          : 'Times not published'}
                      </p>
                      {l.distance != null && <p className="text-xs text-gray-500">{l.distance.toFixed(1)} km away</p>}
                      <div className="flex gap-2 pt-1">
                        <a
                          className="text-xs font-semibold text-emerald-700 underline"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Directions
                        </a>
                        {onOpenMosque && (
                          <button className="text-xs font-semibold text-sky-700 underline" onClick={() => onOpenMosque(l.id)}>
                            Open page
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="space-y-2">
          {visible.slice(0, 20).map((l) => {
            const s = status.data?.[l.id];
            return (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">{l.mosque_name}</p>
                  <p className="text-[11px] text-gray-500">
                    {l.district}
                    {l.distance != null ? ` • ${l.distance.toFixed(1)} km` : ''}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    {s?.nextPrayerName
                      ? `${s.nextPrayerName} • ${formatTo12Hour((s.nextIqamahTime ?? '').slice(0, 5))}`
                      : 'Times not published'}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 p-2 rounded-xl bg-emerald-50 text-emerald-700"
                  aria-label={`Directions to ${l.mosque_name}`}
                >
                  <Navigation className="w-4 h-4" />
                </a>
                {onOpenMosque && (
                  <button
                    onClick={() => onOpenMosque(l.id)}
                    className="shrink-0 p-2 rounded-xl bg-sky-50 text-sky-700"
                    aria-label={`Open ${l.mosque_name}`}
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
