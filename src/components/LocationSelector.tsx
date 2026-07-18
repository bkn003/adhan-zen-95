import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation, Search } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { matchesSearch } from '@/utils/searchUtils';
import type { Location } from '@/types/prayer.types';

interface LocationSelectorProps {
  selectedLocation: Location | null;
  onLocationChange: (location: Location) => void;
}

export const LocationSelector = ({
  selectedLocation,
  onLocationChange
}: LocationSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: locations, isLoading } = useLocations();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.location-selector-container')) {
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

  const { latitude, longitude, calculateDistance } = useGeolocation();

  const filteredAndSortedLocations = locations
    ?.filter(location =>
      matchesSearch(location.mosque_name, searchQuery) ||
      matchesSearch(location.district, searchQuery)
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
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="relative location-selector-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {selectedLocation?.mosque_name || 'Select a mosque'}
            </p>
            {selectedLocation && (
              <p className="text-xs text-gray-500 truncate">{selectedLocation.district}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search for mosques..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredAndSortedLocations?.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No mosques found
              </div>
            ) : (
              filteredAndSortedLocations?.map(location => (
                <div
                  key={location.id}
                  className={`flex items-center justify-between rounded-xl mx-1 mb-0.5 transition-colors ${selectedLocation?.id === location.id
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'hover:bg-gray-50 border border-transparent'
                    }`}
                >
                  <button
                    onClick={() => {
                      onLocationChange(location);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex-1 text-left p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedLocation?.id === location.id ? 'text-emerald-800' : 'text-gray-800'
                          }`}>
                          {location.mosque_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{location.district}</p>
                      </div>
                      {location.distance && (
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                          {location.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleGetDirections(location);
                    }}
                    className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shrink-0 mr-1"
                    title="Get Directions"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
