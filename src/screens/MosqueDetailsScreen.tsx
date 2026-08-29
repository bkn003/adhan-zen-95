import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Clock, Navigation, Users, Utensils, Phone, Share2, ChevronLeft, ChevronRight, Car, Wind, Accessibility, Camera, ImageIcon } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useRamadanContext } from '@/contexts/RamadanContext';
import { useSignedPhotoUrls } from '@/utils/signedPhotoUrls';
import { MosqueEvents } from '@/components/MosqueEvents';
import { MosqueDonate } from '@/components/MosqueDonate';
import { AppSupportCard } from '@/components/AppSupportCard';

import { MosqueReviews } from '@/components/MosqueReviews';
import { JamaatCountdown } from '@/components/JamaatCountdown';
import { MosqueTrustBadge } from '@/components/MosqueTrustBadge';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';

interface MosqueDetailsScreenProps {
  locationId: string;
  onBack: () => void;
  onSelectForPrayer: (locationId: string) => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthColors = [
  { bg: 'from-blue-500 to-cyan-500', light: 'bg-blue-50 border-blue-200 text-blue-700', accent: 'text-blue-600' },
  { bg: 'from-indigo-500 to-purple-500', light: 'bg-indigo-50 border-indigo-200 text-indigo-700', accent: 'text-indigo-600' },
  { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', accent: 'text-emerald-600' },
  { bg: 'from-pink-500 to-rose-500', light: 'bg-pink-50 border-pink-200 text-pink-700', accent: 'text-pink-600' },
  { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50 border-amber-200 text-amber-700', accent: 'text-amber-600' },
  { bg: 'from-violet-500 to-fuchsia-500', light: 'bg-violet-50 border-violet-200 text-violet-700', accent: 'text-violet-600' },
  { bg: 'from-sky-500 to-blue-500', light: 'bg-sky-50 border-sky-200 text-sky-700', accent: 'text-sky-600' },
  { bg: 'from-lime-500 to-green-500', light: 'bg-lime-50 border-lime-200 text-lime-700', accent: 'text-lime-600' },
  { bg: 'from-orange-500 to-red-500', light: 'bg-orange-50 border-orange-200 text-orange-700', accent: 'text-orange-600' },
  { bg: 'from-teal-500 to-cyan-500', light: 'bg-teal-50 border-teal-200 text-teal-700', accent: 'text-teal-600' },
  { bg: 'from-rose-500 to-pink-500', light: 'bg-rose-50 border-rose-200 text-rose-700', accent: 'text-rose-600' },
  { bg: 'from-cyan-500 to-blue-500', light: 'bg-cyan-50 border-cyan-200 text-cyan-700', accent: 'text-cyan-600' },
];

const parseDateRangeStart = (dateRange: string): number => {
  const match = dateRange.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 999;
};

const getMonthEndDay = (monthIndex: number): number => {
  const year = new Date().getFullYear();
  return new Date(year, monthIndex + 1, 0).getDate();
};

const formatDateRange = (dateRange: string, monthIndex: number): string => {
  const endDay = getMonthEndDay(monthIndex);
  if (dateRange.startsWith('24-') || dateRange.startsWith('24 ')) {
    return `24-${endDay}`;
  }
  return dateRange;
};

// Image carousel component
const ImageCarousel = ({ photos }: { photos: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentIndex(prev => (prev + 1) % photos.length);
      else setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => setCurrentIndex(prev => (prev + 1) % photos.length), 4000);
    }
  };

  const signedUrls = useSignedPhotoUrls(photos.map((p: any) => p.id));

  return (
    <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {photos.map((photo, i) => {
        const src = signedUrls[photo.id] || photo.photo_url || '';
        if (!src) return null;
        return (
          <img
            key={photo.id}
            src={src}
            alt={photo.caption || 'Mosque'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === currentIndex ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
          />
        );
      })}
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export const MosqueDetailsScreen = ({ locationId, onBack, onSelectForPrayer }: MosqueDetailsScreenProps) => {
  const { data: locations } = useLocations();
  const { latitude, longitude, calculateDistance } = useGeolocation();
  const { isRamadan } = useRamadanContext();

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const today = useMemo(() => new Date(), []);
  const { prayerTimes: todayPrayers } = usePrayerTimes(locationId, today);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonthIndex);

  const location = useMemo(() => locations?.find(l => l.id === locationId), [locations, locationId]);

  const selectedMonth = monthNames[selectedMonthIndex];

  // Fetch photos
  const { data: photos } = useQuery({
    queryKey: ['mosque-photos', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_photos')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId,
  });

  const { data: prayerTimes, isLoading: timesLoading } = useQuery({
    queryKey: ['mosque-prayer-times', locationId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('location_id', locationId)
        .eq('month', selectedMonth)
        .order('date_range');
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId,
  });

  const sortedPrayerTimes = useMemo(() => {
    if (!prayerTimes) return [];
    return [...prayerTimes].sort((a, b) => parseDateRangeStart(a.date_range) - parseDateRangeStart(b.date_range));
  }, [prayerTimes]);

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

  const handleShare = () => {
    const currentRange = getCurrentRange();
    const currentPT = sortedPrayerTimes.find(pt => pt.date_range.startsWith(currentRange));
    let shareText = `🕌 ${location.mosque_name}\n📍 ${location.district}, Tamil Nadu\n`;
    if (currentPT) {
      shareText += `\n🕐 Today's Prayer Times:\n`;
      shareText += `Fajr: ${formatTime(currentPT.fajr_iqamah)}\n`;
      shareText += `Zuhr: ${formatTime(currentPT.dhuhr_iqamah)}\n`;
      shareText += `Asr: ${formatTime(currentPT.asr_iqamah)}\n`;
      shareText += `Maghrib: ${formatTime(currentPT.maghrib_iqamah)}\n`;
      shareText += `Isha: ${formatTime(currentPT.isha_iqamah)}\n`;
    }
    shareText += `\n📌 https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    if (navigator.share) {
      navigator.share({ title: location.mosque_name, text: shareText }).catch(() => {});
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '-';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const getCurrentRange = () => {
    const day = now.getDate();
    if (day <= 5) return '1-5';
    if (day <= 11) return '6-11';
    if (day <= 17) return '12-17';
    if (day <= 23) return '18-23';
    return '24-';
  };

  const currentRange = getCurrentRange();
  const isCurrentMonth = selectedMonthIndex === currentMonthIndex;
  const currentPrayerTime = sortedPrayerTimes.find(pt => pt.date_range.startsWith(currentRange));
  const color = monthColors[selectedMonthIndex];

  const canGoBack = selectedMonthIndex > 0;
  const canGoForward = selectedMonthIndex < 11;

  const getIshraqTime = (sunriseTime: string | null | undefined) => {
    if (!sunriseTime) return null;
    const [h, m] = sunriseTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + 20;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  const getTahajjudTimes = (pt: any) => {
    if (pt?.tahajjud_start && pt?.tahajjud_end) {
      return { start: pt.tahajjud_start, end: pt.tahajjud_end };
    }
    const fajrTime = pt?.fajr_adhan;
    if (!fajrTime) return { start: '01:30', end: '04:40' };
    const [h, m] = fajrTime.split(':').map(Number);
    const totalMinutes = h * 60 + m - 20;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return { start: '01:30', end: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}` };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-28">
      {/* Header with back/share */}
      <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-4 pt-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={handleShare} className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Image carousel or placeholder */}
        <div className="mt-3">
          {photos && photos.length > 0 ? (
            <ImageCarousel photos={photos} />
          ) : (
            <div className="w-full aspect-[16/9] rounded-2xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <ImageIcon className="w-10 h-10 text-white/40" />
              <p className="text-xs text-white/50">No photos available</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Live Jamaat countdown + attendance presence */}
        <JamaatCountdown
          locationId={locationId}
          prayers={todayPrayers}
          latitude={location.latitude}
          longitude={location.longitude}
        />

        {/* Verified badge + admin SLA freshness score */}
        <MosqueTrustBadge locationId={locationId} variant="full" />

        {/* Mosque Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h1 className="text-lg font-bold text-gray-800 mb-1 leading-snug">{location.mosque_name}</h1>
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
                <Users className="w-3 h-3" /> Women Prayer Hall
              </div>
            )}
            {location.sahar_food_availability && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <Utensils className="w-3 h-3" /> Sahar Food Available
              </div>
            )}
            {location.parking_available && (
              <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <Car className="w-3 h-3" /> Parking
              </div>
            )}
            {location.ac_available && (
              <div className="inline-flex items-center gap-1.5 bg-cyan-50 border border-cyan-100 text-cyan-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <Wind className="w-3 h-3" /> AC
              </div>
            )}
            {location.wheelchair_accessible && (
              <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <Accessibility className="w-3 h-3" /> Wheelchair Access
              </div>
            )}
          </div>

          {location.mosque_capacity && (
            <p className="text-xs text-gray-500 mb-3">🏛️ Capacity: {location.mosque_capacity}</p>
          )}

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
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => onSelectForPrayer(location.id)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-xs py-2.5 px-2 h-auto flex flex-col items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Use Times</span>
            </Button>
            <Button onClick={handleGetDirections} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-xs py-2.5 px-2 h-auto flex flex-col items-center gap-1">
              <Navigation className="w-4 h-4" />
              <span>Directions</span>
            </Button>
            <Button onClick={handleShare} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-xs py-2.5 px-2 h-auto flex flex-col items-center gap-1">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>

          {/* Donate — kept directly under the action buttons so the UPI
              one-tap shortcut is visible without scrolling the page. */}
          <div className="mt-3">
            <MosqueDonate mosqueName={location.mosque_name} locationId={location.id} info={location as any} variant="compact" />
          </div>
        </div>

        {/* Today's Prayer Times */}
        {isCurrentMonth && (
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
                {/* Ramadan special times */}
                {isRamadan && currentPrayerTime.sahar_end && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-200">
                    <span className="font-bold text-sm text-purple-800 w-20">Sahar End</span>
                    <div className="text-sm text-center">
                      <p className="font-bold text-purple-700">{formatTime(currentPrayerTime.sahar_end)}</p>
                    </div>
                  </div>
                )}

                {[
                  { name: 'Fajr', adhan: isRamadan && currentPrayerTime.fajr_ramadan_iqamah ? currentPrayerTime.fajr_adhan : currentPrayerTime.fajr_adhan, iqamah: isRamadan && currentPrayerTime.fajr_ramadan_iqamah ? currentPrayerTime.fajr_ramadan_iqamah : currentPrayerTime.fajr_iqamah, color: 'from-blue-50 to-indigo-50', border: 'border-blue-100', text: 'text-blue-800', sub: 'text-blue-500' },
                  { name: 'Zuhr', adhan: currentPrayerTime.dhuhr_adhan, iqamah: currentPrayerTime.dhuhr_iqamah, color: 'from-amber-50 to-yellow-50', border: 'border-amber-100', text: 'text-amber-800', sub: 'text-amber-500' },
                  { name: 'Asr', adhan: currentPrayerTime.asr_adhan, iqamah: currentPrayerTime.asr_iqamah, color: 'from-orange-50 to-amber-50', border: 'border-orange-100', text: 'text-orange-800', sub: 'text-orange-500' },
                  { name: 'Maghrib', adhan: isRamadan && currentPrayerTime.maghrib_ramadan_adhan ? currentPrayerTime.maghrib_ramadan_adhan : currentPrayerTime.maghrib_adhan, iqamah: isRamadan && currentPrayerTime.maghrib_ramadan_iqamah ? currentPrayerTime.maghrib_ramadan_iqamah : currentPrayerTime.maghrib_iqamah, color: 'from-rose-50 to-pink-50', border: 'border-rose-100', text: 'text-rose-800', sub: 'text-rose-500' },
                  { name: 'Isha', adhan: currentPrayerTime.isha_adhan, iqamah: isRamadan && currentPrayerTime.isha_ramadan_iqamah ? currentPrayerTime.isha_ramadan_iqamah : currentPrayerTime.isha_iqamah, color: 'from-violet-50 to-purple-50', border: 'border-violet-100', text: 'text-violet-800', sub: 'text-violet-500' },
                ].map(prayer => (
                  <div key={prayer.name} className={`flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r ${prayer.color} border ${prayer.border}`}>
                    <span className={`font-bold text-sm ${prayer.text} w-20`}>{prayer.name}</span>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <p className={`text-[10px] ${prayer.sub} uppercase font-medium`}>Azaan</p>
                        <p className={`font-bold ${prayer.text}`}>{formatTime(prayer.adhan)}</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-[10px] ${prayer.sub} uppercase font-medium`}>Iqamah</p>
                        <p className={`font-bold ${prayer.text}`}>{formatTime(prayer.iqamah)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Iftar time */}
                {isRamadan && (currentPrayerTime as any).ifthar_time && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-200">
                    <span className="font-bold text-sm text-yellow-800 w-20">Iftar</span>
                    <div className="text-sm text-center">
                      <p className="font-bold text-yellow-700">{formatTime((currentPrayerTime as any).ifthar_time)}</p>
                    </div>
                  </div>
                )}

                {currentPrayerTime.jummah_adhan && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200">
                    <span className="font-bold text-sm text-amber-800 w-20">Jummah</span>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-[10px] text-amber-600 uppercase font-medium">Azaan</p>
                        <p className="font-bold text-amber-800">{formatTime(currentPrayerTime.jummah_adhan)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-amber-600 uppercase font-medium">Khutbah</p>
                        <p className="font-bold text-amber-800">{formatTime(currentPrayerTime.jummah_iqamah)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tharaweeh */}
                {isRamadan && currentPrayerTime.tharaweeh && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-200">
                    <span className="font-bold text-sm text-purple-800 w-20">Taraweeh</span>
                    <div className="text-sm text-center">
                      <p className="font-bold text-purple-700">{formatTime(currentPrayerTime.tharaweeh)}</p>
                    </div>
                  </div>
                )}

                {/* Special prayers */}
                {(() => {
                  const ishraq = (currentPrayerTime as any).ishraq_time || getIshraqTime(currentPrayerTime.sun_rise);
                  const tahajjud = getTahajjudTimes(currentPrayerTime);
                  return (
                    <>
                      {ishraq && (
                        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                          <span className="font-bold text-sm text-amber-800 w-20">Ishraq</span>
                          <div className="text-sm text-center">
                            <p className="text-[10px] text-amber-500 uppercase font-medium">+20m sunrise</p>
                            <p className="font-bold text-amber-700">{formatTime(ishraq)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                        <span className="font-bold text-sm text-indigo-800 w-20">Tahajjud</span>
                        <div className="text-sm text-center">
                          <p className="text-[10px] text-indigo-500 uppercase font-medium">Late night</p>
                          <p className="font-bold text-indigo-700">{formatTime(tahajjud.start)} - {formatTime(tahajjud.end)}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Sunrise/MidNoon/Sunset */}
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
        )}

        {/* Monthly Schedule with navigation */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => canGoBack && setSelectedMonthIndex(prev => prev - 1)}
              disabled={!canGoBack}
              className={`p-2 rounded-xl transition-all ${canGoBack ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'text-gray-300'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className={`text-base font-bold ${color.accent} flex items-center gap-2`}>
              📅 {selectedMonth} Schedule
            </h2>
            <button
              onClick={() => canGoForward && setSelectedMonthIndex(prev => prev + 1)}
              disabled={!canGoForward}
              className={`p-2 rounded-xl transition-all ${canGoForward ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'text-gray-300'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Export the visible month as a PDF or calendar file */}
          {sortedPrayerTimes.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => runExport('pdf')}>
                <FileDown className="w-3.5 h-3.5 mr-1.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => runExport('ics')}>
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" /> Calendar (.ics)
              </Button>
            </div>
          )}


          {timesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : sortedPrayerTimes.length > 0 ? (
            <div className="space-y-3">
              {sortedPrayerTimes.map(pt => {
                const isCurrentRange = isCurrentMonth && pt.date_range.startsWith(currentRange);
                return (
                  <div
                    key={pt.id}
                    className={`p-4 rounded-2xl text-xs transition-all ${
                      isCurrentRange
                        ? `bg-gradient-to-r ${color.bg} text-white shadow-lg`
                        : `${color.light} border`
                    }`}
                  >
                    <p className={`font-bold text-sm mb-2 ${isCurrentRange ? 'text-white' : ''}`}>
                      {formatDateRange(pt.date_range, selectedMonthIndex)} {selectedMonth}
                      {isCurrentRange && <span className="ml-2 text-xs opacity-80">• Today</span>}
                    </p>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      <div>
                        <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'}>Fajr</p>
                        <p className="font-bold">{formatTime(isRamadan && pt.fajr_ramadan_iqamah ? pt.fajr_ramadan_iqamah : pt.fajr_iqamah)}</p>
                      </div>
                      <div>
                        <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'}>Zuhr</p>
                        <p className="font-bold">{formatTime(pt.dhuhr_iqamah)}</p>
                      </div>
                      <div>
                        <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'}>Asr</p>
                        <p className="font-bold">{formatTime(pt.asr_iqamah)}</p>
                      </div>
                      <div>
                        <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'}>Magh</p>
                        <p className="font-bold">{formatTime(isRamadan && pt.maghrib_ramadan_iqamah ? pt.maghrib_ramadan_iqamah : pt.maghrib_iqamah)}</p>
                      </div>
                      <div>
                        <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'}>Isha</p>
                        <p className="font-bold">{formatTime(isRamadan && pt.isha_ramadan_iqamah ? pt.isha_ramadan_iqamah : pt.isha_iqamah)}</p>
                      </div>
                    </div>
                    {/* Ramadan extra times in monthly schedule - FIXED: no duplicate labels */}
                    {isRamadan && (pt.sahar_end || (pt as any).ifthar_time || pt.tharaweeh) && (
                      <div className="grid grid-cols-3 gap-1 text-center mt-2 pt-2 border-t border-dashed" style={{ borderColor: isCurrentRange ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }}>
                        {pt.sahar_end && (
                          <div>
                            <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'} style={{ fontSize: '9px' }}>Sahar</p>
                            <p className="font-bold" style={{ fontSize: '11px' }}>{formatTime(pt.sahar_end)}</p>
                          </div>
                        )}
                        {(pt as any).ifthar_time && (
                          <div>
                            <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'} style={{ fontSize: '9px' }}>Iftar</p>
                            <p className="font-bold" style={{ fontSize: '11px' }}>{formatTime((pt as any).ifthar_time)}</p>
                          </div>
                        )}
                        {pt.tharaweeh && (
                          <div>
                            <p className={isCurrentRange ? 'text-white/70' : 'text-gray-400'} style={{ fontSize: '9px' }}>Taraweeh</p>
                            <p className="font-bold" style={{ fontSize: '11px' }}>{formatTime(pt.tharaweeh)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No schedule available for {selectedMonth}</p>
          )}
        </div>

        {/* Donate */}
        <MosqueDonate mosqueName={location.mosque_name} locationId={location.id} info={location as any} />

        {/* Support app development — visually distinct from mosque donations */}
        <AppSupportCard variant="full" />


        {/* Events & Announcements */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
            📢 Events & Announcements
          </h2>
          <MosqueEvents locationId={location.id} />
        </div>

        {/* Reviews */}
        <MosqueReviews locationId={location.id} />



        {/* Map at bottom */}
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="p-4 pb-2">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Location
            </h2>
          </div>
          <div style={{ height: '200px' }}>
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
      </div>
    </div>
  );
};
