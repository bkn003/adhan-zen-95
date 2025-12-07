import { useState } from 'react';
import { MapPin, Clock, Navigation, Search, Utensils, Users, ChevronDown, Sparkles } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRamadanContext } from '@/contexts/RamadanContext';
import { tamilText } from '@/utils/tamilText';
import { Button } from '@/components/ui/button';
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
  const [filterSaharFood, setFilterSaharFood] = useState(false);
  const [filterWomenHall, setFilterWomenHall] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  const { data: locations, isLoading } = useLocations();
  const { latitude, longitude, calculateDistance, error: locationError } = useGeolocation();
  const { isRamadan } = useRamadanContext();

  // Require location access
  if (!latitude || !longitude || locationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 pb-28 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 text-center border border-blue-100 max-w-sm shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Location Access Required</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Please enable location access to discover nearby mosques and their prayer timings.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
            <Sparkles className="w-3 h-3" />
            Enable in browser settings
          </div>
        </div>
      </div>
    );
  }

  const filteredLocations = locations?.filter(location => {
    if (searchQuery.trim()) {
      const matchesSearch = location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.district.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }
    if (filterSaharFood && !location.sahar_food_availability) return false;
    if (filterWomenHall && !location.women_prayer_hall) return false;
    return true;
  }) || [];

  const sortedLocations = filteredLocations?.map(location => ({
    ...location,
    distance: calculateDistance(latitude, longitude, location.latitude, location.longitude)
  })).sort((a, b) => a.distance - b.distance);

  const displayedLocations = sortedLocations?.slice(0, displayCount);
  const hasMore = sortedLocations && sortedLocations.length > displayCount;

  const handleLoadMore = () => setDisplayCount(prev => prev + 10);

  const handleGetDirections = (location: Location) => {
    const destination = `${location.latitude},${location.longitude}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank');
  };

  const handleViewPrayerTimings = (location: Location) => {
    onLocationSelect?.(location.id);
    onNavigateToHome?.();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 pb-28">
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-36 bg-white rounded-3xl border border-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 pb-28 space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-blue-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {tamilText.general.nearbyMosques.english}
            </h2>
          </div>
          <p className="text-center text-white/70 text-sm">
            {tamilText.general.nearbyMosques.tamil}
          </p>
          <p className="text-center text-blue-200 text-xs mt-2">
            {sortedLocations?.length || 0} mosques found near you
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search mosques by name or district..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setIsSearching(true);
              setTimeout(() => setIsSearching(false), 300);
            }}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterSaharFood(!filterSaharFood)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterSaharFood
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Utensils className="w-4 h-4" />
            Sahar Food
          </button>
          <button
            onClick={() => setFilterWomenHall(!filterWomenHall)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterWomenHall
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Users className="w-4 h-4" />
            Women Hall
          </button>
        </div>
      </div>

      {/* Locations List */}
      <div className="space-y-3">
        {isSearching ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-36 bg-white rounded-3xl border border-gray-100" />
            </div>
          ))
        ) : displayedLocations && displayedLocations.length > 0 ? (
          displayedLocations.map((location, index) => (
            <div
              key={location.id}
              className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 mb-1 leading-snug">
                    {location.mosque_name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{location.district}, Tamil Nadu</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl">
                    <span className="text-lg font-bold">{location.distance.toFixed(1)}</span>
                    <span className="text-xs ml-1">km</span>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isRamadan && location.sahar_food_availability && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                    <Utensils className="w-3 h-3" />
                    Sahar Food
                    {location.sahar_food_time && (
                      <span className="text-emerald-600 ml-1">• {location.sahar_food_time}</span>
                    )}
                  </div>
                )}
                {location.women_prayer_hall && (
                  <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                    <Users className="w-3 h-3" />
                    Women Hall
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleViewPrayerTimings(location)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-sm py-3 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-98"
                >
                  <Clock className="w-4 h-4" />
                  Prayer Times
                </button>
                <button
                  onClick={() => handleGetDirections(location)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm py-3 hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              {searchQuery || filterSaharFood || filterWomenHall
                ? 'No mosques match your filters'
                : 'No mosques found nearby'}
            </p>
          </div>
        )}

        {/* Load More */}
        {hasMore && !isSearching && (
          <div className="pt-4 pb-2">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              size="lg"
              className="w-full bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-semibold rounded-2xl py-4"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Load More Mosques
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};