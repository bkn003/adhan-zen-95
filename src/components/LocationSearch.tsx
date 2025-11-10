import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Location } from '@/types/prayer.types';
interface LocationSearchProps {
  selectedLocation: Location | null;
  onLocationChange: (location: Location) => void;
  placeholder?: string;
}
export const LocationSearch = ({
  selectedLocation,
  onLocationChange,
  placeholder = "Search for mosques..."
}: LocationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: locations,
    isLoading
  } = useLocations();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.location-search-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  const {
    latitude,
    longitude,
    calculateDistance
  } = useGeolocation();
  const filteredAndSortedLocations = locations
    ?.filter(location => 
      location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.district.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map(location => ({
      ...location,
      distance: latitude && longitude ? calculateDistance(latitude, longitude, location.latitude, location.longitude) : null
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return a.mosque_name.localeCompare(b.mosque_name);
    });
  const handleGetDirections = (location: Location) => {
    const destination = `${location.latitude},${location.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  };
  if (isLoading) {
    return <div className="animate-pulse">
        <div className="h-12 bg-muted rounded-lg"></div>
      </div>;
  }
  return <div className="relative location-search-container">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-2 bg-card border border-border rounded-lg hover:border-green-200 transition-colors">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          <div className="text-left">
            <p className="text-foreground text-xs font-medium text-left">
              {selectedLocation?.mosque_name || 'Select a mosque'}
            </p>
            {selectedLocation && <p className="text-xs text-muted-foreground">
                {selectedLocation.district}
              </p>}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
          <div className="p-2 border-b border-border bg-card sticky top-0">
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredAndSortedLocations?.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No mosques found
              </div>
            ) : (
              filteredAndSortedLocations?.map(location => (
                <div key={location.id} className="flex items-center justify-between p-2 hover:bg-muted transition-colors border-b border-border last:border-b-0">
                  <button onClick={() => {
                    onLocationChange(location);
                    setIsOpen(false);
                    setSearchQuery('');
                  }} className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{location.mosque_name}</p>
                        <p className="text-xs text-muted-foreground">{location.district}</p>
                      </div>
                      {location.distance && <span className="text-xs text-green-600 font-medium">
                        {location.distance.toFixed(1)} km
                      </span>}
                    </div>
                  </button>
                  <button onClick={e => {
                    e.stopPropagation();
                    handleGetDirections(location);
                  }} className="ml-2 p-1 text-green-600 hover:bg-green-50 rounded transition-colors" title="Get Directions">
                    <Navigation className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>}
    </div>;
};