import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Navigation, Loader2 } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Location } from "@/types/prayer.types";
import { useInfiniteReveal } from "@/hooks/useInfiniteReveal";

interface MosqueSearchScreenProps {
  onMosqueSelected: (location: Location) => void;
}

export const MosqueSearchScreen = ({ onMosqueSelected }: MosqueSearchScreenProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const { data: locations, isLoading } = useLocations();
  const { latitude, longitude, calculateDistance } = useGeolocation();

  // Filter and sort locations
  const filteredLocations = locations?.filter(location =>
    location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.district.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const hasGps = !!(latitude && longitude);
  const sortedLocations = filteredLocations
    .map(location => ({
      ...location,
      distance: latitude && longitude 
        ? calculateDistance(latitude, longitude, location.latitude, location.longitude)
        : null
    }))
    .filter(l => searchQuery || radiusKm >= 100 || l.distance === null || l.distance <= radiusKm)
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return a.mosque_name.localeCompare(b.mosque_name);
    });

  const { count, hasMore, sentinelRef } = useInfiniteReveal(sortedLocations.length, 15, 15, `${searchQuery}|${radiusKm}`);
  const displayedLocations = sortedLocations.slice(0, count);

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
          {hasGps && !searchQuery && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Show mosques within</span>
                <span className="font-semibold text-emerald-700">{radiusKm >= 100 ? 'Any distance' : `${radiusKm} km`}</span>
              </div>
              <input
                type="range" min={2} max={100} step={1}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-emerald-600"
                aria-label="Search radius"
              />
            </div>
          )}
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
                    {searchQuery ? 'No mosques found' : hasGps && radiusKm < 100 ? `No mosques within ${radiusKm} km — move the slider to widen` : 'No mosques available'}
                  </p>
                </div>
              )}

              {hasMore && (
                <div ref={sentinelRef} className="py-3 flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};