import { useState } from 'react';
import { MapPin, Clock, Navigation, Search } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { tamilText } from '@/utils/tamilText';
import type { Location } from '@/types/prayer.types';
interface NearbyScreenProps {
  onLocationSelect?: (locationId: string) => void;
  onNavigateToHome?: () => void;
}
export const NearbyScreen = ({
  onLocationSelect,
  onNavigateToHome
}: NearbyScreenProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const {
    data: locations,
    isLoading
  } = useLocations();
  const {
    latitude,
    longitude,
    calculateDistance
  } = useGeolocation();
  // Filter locations based on search query
  const filteredLocations = locations?.filter(location => {
    if (!searchQuery.trim()) return true;
    return location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) || location.district.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];
  const sortedLocations = filteredLocations?.map(location => ({
    ...location,
    distance: latitude && longitude ? calculateDistance(latitude, longitude, location.latitude, location.longitude) : null
  })).sort((a, b) => {
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    return a.mosque_name.localeCompare(b.mosque_name);
  });
  const handleGetDirections = (location: Location) => {
    const destination = `${location.latitude},${location.longitude}`;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  };
  const handleViewPrayerTimings = (location: Location) => {
    onLocationSelect?.(location.id);
    onNavigateToHome?.();
  };
  if (isLoading) {
    return <div className="p-4 pb-20 space-y-4 bg-gradient-to-br from-green-50 via-emerald-50 to-white min-h-screen">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>)}
        </div>
      </div>;
  }
  return <div className="p-4 pb-20 space-y-4 bg-gradient-to-br from-green-50 via-emerald-50 to-white min-h-screen py-[4px] px-[8px]">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 text-center border border-green-100 py-0 px-[16px]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-gray-800">
            {tamilText.general.nearbyMosques.english}
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          {tamilText.general.nearbyMosques.tamil}
        </p>
        <p className="text-xs text-green-600 mt-1">Find mosques near your location</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-green-100 px-[4px] py-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search mosques..." value={searchQuery} onChange={e => {
          setSearchQuery(e.target.value);
          setIsSearching(true);
          // Reset searching state after a delay
          setTimeout(() => setIsSearching(false), 300);
        }} className="w-full pl-10 pr-4 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent py-[2px]" />
        </div>
      </div>

      {/* Locations List */}
      <div className="space-y-3">
        {isLoading || isSearching ?
      // Loading skeleton
      Array.from({
        length: 5
      }).map((_, index) => <div key={index} className="animate-pulse">
              <div className="h-20 bg-gray-100 rounded-xl"></div>
            </div>) : sortedLocations && sortedLocations.length > 0 ? sortedLocations.map(location => <div key={location.id} className="bg-white rounded-xl p-4 border border-green-100 py-[4px]">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-gray-800 mb-1 text-xs font-bold">
                    {location.mosque_name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{location.district}, Tamil Nadu</span>
                  </div>
                  {location.distance && <p className="text-sm text-green-600 font-medium">
                      Distance: {location.distance.toFixed(1)} km
                    </p>}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => handleViewPrayerTimings(location)} className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors text-xs text-left px-[4px] py-[2px]">
                  <Clock className="w-4 h-4" />
                  View Prayer Timings
                </button>
                <button onClick={() => handleGetDirections(location)} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors py-[4px] px-[4px] text-xs font-bold">
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            </div>) : <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery ? 'No mosques found matching your search.' : 'No mosques found nearby.'}
            </p>
          </div>}
      </div>
    </div>;
};