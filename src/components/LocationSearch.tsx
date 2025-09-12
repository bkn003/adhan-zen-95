import { useState, useEffect } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
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
  placeholder = "Search mosques..."
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
  const filteredLocations = locations?.filter(location => location.mosque_name.toLowerCase().includes(searchQuery.toLowerCase()) || location.district.toLowerCase().includes(searchQuery.toLowerCase())).map(location => ({
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
  if (isLoading) {
    return <div className="animate-pulse">
        <div className="h-12 bg-muted rounded-lg"></div>
      </div>;
  }
  return <div className="relative location-search-container">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder={placeholder} value={searchQuery} onChange={e => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
      }} onFocus={() => setIsOpen(true)} className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
      </div>

      {isOpen && searchQuery && <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {filteredLocations && filteredLocations.length > 0 ? filteredLocations.map(location => <div key={location.id} className="flex items-center justify-between p-2 hover:bg-muted transition-colors border-b border-border last:border-b-0">
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
                </div>) : <div className="p-2 text-center text-muted-foreground text-sm">
                No mosques found matching your search
              </div>}
          </div>}
    </div>;
};