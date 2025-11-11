import { useState } from 'react';
import { MapPin, Clock, Navigation, Search, Utensils, Users } from 'lucide-react';
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
  const [sortByTime, setSortByTime] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const {
    data: locations,
    isLoading
  } = useLocations();
  const {
    latitude,
    longitude,
    calculateDistance,
    error: locationError
  } = useGeolocation();
  const { isRamadan } = useRamadanContext();

  // Require location access for this screen
  if (!latitude || !longitude || locationError) {
    return <div className="p-4 pb-20 min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 text-center border border-green-100 max-w-md">
        <MapPin className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Location Access Required</h2>
        <p className="text-sm text-gray-600 mb-4">
          Please enable location access to view nearby mosques and their prayer timings.
        </p>
        <p className="text-xs text-gray-500">
          Go to your browser settings and allow location access for this app.
        </p>
      </div>
    </div>;
  }

  // Filter locations based on search query and filters
  const filteredLocations = locations?.filter(location => {
    // Text search filter
    if (searchQuery.trim()) {
      const matchesSearch = location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) || location.district.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Sahar food filter
    if (filterSaharFood && !location.sahar_food_availability) {
      return false;
    }

    // Women prayer hall filter
    if (filterWomenHall && !location.women_prayer_hall) {
      return false;
    }
    return true;
  }) || [];
  const sortedLocations = filteredLocations?.map(location => ({
    ...location,
    distance: calculateDistance(latitude, longitude, location.latitude, location.longitude)
  })).sort((a, b) => {
    // Sort by distance (nearest first)
    return a.distance - b.distance;
  });

  // Paginated locations - show only displayCount items
  const displayedLocations = sortedLocations?.slice(0, displayCount);
  const hasMore = sortedLocations && sortedLocations.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10);
  };
  const handleGetDirections = (location: Location) => {
    const destination = `${location.latitude},${location.longitude}`;
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
  return <div className="p-4 pb-20 space-y-4 bg-gradient-to-br from-green-50 via-emerald-50 to-white min-h-screen px-[8px] py-[8px]">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 text-center border border-green-100">
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

      {/* Search Bar and Filters */}
      <div className="bg-white rounded-xl p-4 border border-green-100 space-y-3 px-[8px] py-[8px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search mosques..." value={searchQuery} onChange={e => {
          setSearchQuery(e.target.value);
          setIsSearching(true);
          setTimeout(() => setIsSearching(false), 300);
        }} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        
        {/* Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={filterSaharFood ? "default" : "outline"} size="sm" onClick={() => setFilterSaharFood(!filterSaharFood)} className="gap-2">
            <Utensils className="w-4 h-4" />
            Sahar Food
          </Button>
          <Button variant={filterWomenHall ? "default" : "outline"} size="sm" onClick={() => setFilterWomenHall(!filterWomenHall)} className="gap-2">
            <Users className="w-4 h-4" />
            Women Hall
          </Button>
          <Button variant={sortByTime ? "default" : "outline"} size="sm" onClick={() => setSortByTime(!sortByTime)} className="gap-2">
            <Clock className="w-4 h-4" />
            Sort by Time
          </Button>
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
            </div>) : displayedLocations && displayedLocations.length > 0 ? displayedLocations.map(location => <div key={location.id} className="bg-white rounded-xl p-4 border border-green-100 space-y-3 px-[8px] py-[8px]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-gray-800 mb-1 text-base font-bold">
                    {location.mosque_name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <MapPin className="w-3 h-3" />
                    <span>{location.district}, Tamil Nadu</span>
                  </div>
                   <p className="text-sm text-green-600 font-semibold">
                      Distance: {location.distance.toFixed(1)} km
                    </p>
                </div>
              </div>
              
              {/* Sahar Food Info - Only show during Ramadan */}
              {isRamadan && location.sahar_food_availability && <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <Utensils className="w-4 h-4" />
                    <span>Sahar Food Available</span>
                  </div>
                  {location.sahar_food_time && <div className="text-green-600 text-xs ml-6">
                      Time: {location.sahar_food_time}
                    </div>}
                  {location.sahar_food_contact_number && <div className="text-green-600 text-xs ml-6">
                      Contact: <a href={`tel:${location.sahar_food_contact_number}`} className="underline hover:text-green-700">
                        {location.sahar_food_contact_number}
                      </a>
                    </div>}
                </div>}
              
              {/* Women Prayer Hall */}
              {location.women_prayer_hall && <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                  <div className="flex items-center gap-2 text-purple-700 font-medium text-sm">
                    <Users className="w-4 h-4" />
                    <span>Women Prayer Hall Available</span>
                  </div>
                </div>}
              
              <div className="flex gap-2">
                <button onClick={() => handleViewPrayerTimings(location)} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium py-[2px] px-[8px]">
                  <Clock className="w-4 h-4" />
                  View Prayer Timings
                </button>
                <button onClick={() => handleGetDirections(location)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors py-2.5 px-4 text-xs">
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            </div>) : <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery || filterSaharFood || filterWomenHall ? 'No mosques found matching your search criteria.' : 'No mosques found nearby.'}
            </p>
          </div>}

        {/* Load More Button */}
        {hasMore && !isLoading && !isSearching && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleLoadMore}
              variant="outline"
              size="lg"
              className="w-full max-w-xs bg-white hover:bg-green-50 border-green-200 text-green-700 font-semibold"
            >
              Load More Mosques
            </Button>
          </div>
        )}
      </div>
    </div>;
};