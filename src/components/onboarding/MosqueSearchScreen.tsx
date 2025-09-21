import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Navigation, Loader2 } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Location } from "@/types/prayer.types";

interface MosqueSearchScreenProps {
  onMosqueSelected: (location: Location) => void;
}

export const MosqueSearchScreen = ({ onMosqueSelected }: MosqueSearchScreenProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const { data: locations, isLoading } = useLocations();
  const { latitude, longitude, calculateDistance } = useGeolocation();

  // Filter and sort locations
  const filteredLocations = locations?.filter(location =>
    location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.district.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedLocations = filteredLocations
    .map(location => ({
      ...location,
      distance: latitude && longitude 
        ? calculateDistance(latitude, longitude, location.latitude, location.longitude)
        : null
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return a.mosque_name.localeCompare(b.mosque_name);
    });

  const displayedLocations = sortedLocations.slice(0, displayCount);
  const hasMore = sortedLocations.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  const handleGetDirections = (location: Location) => {
    const destination = `${location.latitude},${location.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
          <p className="text-gray-600">Loading mosques...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6 mb-4 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Find Your Mosque
            </h1>
            <p className="text-gray-600">
              Search for nearby mosques to get accurate prayer times
            </p>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search mosque or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-3 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              {searchQuery ? 'Search Results' : 'Nearby Mosques'}
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayedLocations.map((location) => (
                <div 
                  key={location.id}
                  className="flex items-center justify-between p-3 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-100"
                >
                  <button
                    onClick={() => onMosqueSelected(location)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {location.mosque_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {location.district}
                        </p>
                      </div>
                      {location.distance && (
                        <span className="text-xs text-emerald-600 font-medium">
                          {location.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGetDirections(location);
                    }}
                    className="ml-2 p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"
                    title="Get Directions"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {displayedLocations.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {searchQuery ? 'No mosques found' : 'No mosques available'}
                  </p>
                </div>
              )}
            </div>
            
            {hasMore && (
              <div className="mt-4 text-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Load More ({sortedLocations.length - displayCount} remaining)
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};