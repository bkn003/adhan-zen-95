import { useState, useMemo } from 'react';
import { ArrowLeft, MapPin, Clock, Navigation, Users, Utensils, Phone, ExternalLink } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface MosqueDetailsScreenProps {
  locationId: string;
  onBack: () => void;
  onSelectForPrayer: (locationId: string) => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MosqueDetailsScreen = ({ locationId, onBack, onSelectForPrayer }: MosqueDetailsScreenProps) => {
  const { data: locations } = useLocations();
  const { latitude, longitude, calculateDistance } = useGeolocation();

  const location = useMemo(() => locations?.find(l => l.id === locationId), [locations, locationId]);

  const currentMonth = monthNames[new Date().getMonth()];

  const { data: prayerTimes, isLoading: timesLoading } = useQuery({
    queryKey: ['mosque-prayer-times', locationId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('location_id', locationId)
        .eq('month', currentMonth)
        .order('date_range');
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId,
  });

  if (!location) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 pb-28 flex items-center justify-center">
        <p className="text-gray-500">Mosque not found</p>
      </div>
    );
  }

  const distance = latitude && longitude
    ? calculateDistance(latitude, longitude, location.latitude, location.longitude)
    : null;

  const handleGetDirections = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=driving`, '_blank');
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '-';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Find current date range
  const day = new Date().getDate();
  let currentRange: string;
  if (day <= 5) currentRange = '1-5';
  else if (day <= 11) currentRange = '6-11';
  else if (day <= 17) currentRange = '12-17';
  else if (day <= 23) currentRange = '18-23';
  else currentRange = '24-31';

  const currentPrayerTime = prayerTimes?.find(pt => pt.date_range.startsWith(currentRange));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-28">
      {/* Map Header */}
      <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-4 pt-6">
        <button
          onClick={onBack}
          className="absolute top-6 left-4 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-xl"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Embedded Map */}
        <div className="mt-10 rounded-2xl overflow-hidden shadow-lg" style={{ height: '200px' }}>
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${location.latitude},${location.longitude}&zoom=15`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mosque location"
          />
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Mosque Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h1 className="text-lg font-bold text-gray-800 mb-1 leading-snug">
            {location.mosque_name}
          </h1>
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin className="w-3 h-3" />
            <span>{location.district}, Tamil Nadu</span>
            {distance !== null && (
              <span className="ml-2 text-blue-600 font-semibold">{distance.toFixed(1)} km</span>
            )}
          </div>

          {/* Facilities */}
          <div className="flex flex-wrap gap-2 mb-4">
            {location.women_prayer_hall && (
              <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <Users className="w-3 h-3" />
                Women Prayer Hall
              </div>
            )}
            {location.sahar_food_availability && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <Utensils className="w-3 h-3" />
                Sahar Food Available
              </div>
            )}
          </div>

          {/* Contact Info */}
          {location.sahar_food_contact_number && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${location.sahar_food_contact_number}`} className="text-blue-600 underline">
                {location.sahar_food_contact_number}
              </a>
            </div>
          )}

          {location.sahar_food_time && (
            <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl mb-4">
              🍽️ Sahar Food Time: {location.sahar_food_time}
            </p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onSelectForPrayer(location.id)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-sm py-3 h-auto"
            >
              <Clock className="w-4 h-4 mr-2" />
              Use Times
            </Button>
            <Button
              onClick={handleGetDirections}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm py-3 h-auto"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Directions
            </Button>
          </div>
        </div>

        {/* Prayer Times Schedule */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Today's Prayer Times
          </h2>

          {timesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : currentPrayerTime ? (
            <div className="space-y-2">
              {[
                { name: 'Fajr', adhan: currentPrayerTime.fajr_adhan, iqamah: currentPrayerTime.fajr_iqamah },
                { name: 'Zuhr', adhan: currentPrayerTime.dhuhr_adhan, iqamah: currentPrayerTime.dhuhr_iqamah },
                { name: 'Asr', adhan: currentPrayerTime.asr_adhan, iqamah: currentPrayerTime.asr_iqamah },
                { name: 'Maghrib', adhan: currentPrayerTime.maghrib_adhan, iqamah: currentPrayerTime.maghrib_iqamah },
                { name: 'Isha', adhan: currentPrayerTime.isha_adhan, iqamah: currentPrayerTime.isha_iqamah },
              ].map(prayer => (
                <div key={prayer.name} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50">
                  <span className="font-semibold text-sm text-gray-700 w-20">{prayer.name}</span>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase">Azaan</p>
                      <p className="font-medium text-gray-700">{formatTime(prayer.adhan)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase">Iqamah</p>
                      <p className="font-medium text-gray-700">{formatTime(prayer.iqamah)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Jummah */}
              {currentPrayerTime.jummah_adhan && (
                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="font-semibold text-sm text-amber-700 w-20">Jummah</span>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-amber-500 uppercase">Azaan</p>
                      <p className="font-medium text-amber-700">{formatTime(currentPrayerTime.jummah_adhan)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-amber-500 uppercase">Khutbah</p>
                      <p className="font-medium text-amber-700">{formatTime(currentPrayerTime.jummah_iqamah)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Times */}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {currentPrayerTime.sun_rise && (
                  <div className="flex justify-between text-xs text-gray-500 px-3">
                    <span>Sunrise</span>
                    <span className="font-medium">{formatTime(currentPrayerTime.sun_rise)}</span>
                  </div>
                )}
                {currentPrayerTime.mid_noon && (
                  <div className="flex justify-between text-xs text-gray-500 px-3">
                    <span>Mid Noon</span>
                    <span className="font-medium">{formatTime(currentPrayerTime.mid_noon)}</span>
                  </div>
                )}
                {currentPrayerTime.sun_set && (
                  <div className="flex justify-between text-xs text-gray-500 px-3">
                    <span>Sunset</span>
                    <span className="font-medium">{formatTime(currentPrayerTime.sun_set)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No prayer times available for this period</p>
          )}
        </div>

        {/* Full Month Schedule */}
        {prayerTimes && prayerTimes.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 mb-4">
              {currentMonth} Schedule
            </h2>
            <div className="space-y-2">
              {prayerTimes.map(pt => (
                <div
                  key={pt.id}
                  className={`p-3 rounded-xl text-xs ${
                    pt.date_range.startsWith(currentRange)
                      ? 'bg-blue-50 border border-blue-100'
                      : 'bg-gray-50'
                  }`}
                >
                  <p className="font-semibold text-gray-700 mb-1">{pt.date_range} {currentMonth}</p>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div><p className="text-gray-400">Fajr</p><p className="font-medium">{formatTime(pt.fajr_iqamah)}</p></div>
                    <div><p className="text-gray-400">Zuhr</p><p className="font-medium">{formatTime(pt.dhuhr_iqamah)}</p></div>
                    <div><p className="text-gray-400">Asr</p><p className="font-medium">{formatTime(pt.asr_iqamah)}</p></div>
                    <div><p className="text-gray-400">Magh</p><p className="font-medium">{formatTime(pt.maghrib_iqamah)}</p></div>
                    <div><p className="text-gray-400">Isha</p><p className="font-medium">{formatTime(pt.isha_iqamah)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
