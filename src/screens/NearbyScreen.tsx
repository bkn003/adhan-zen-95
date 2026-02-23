import { useState, useMemo } from 'react';
import { MapPin, Clock, Navigation, Search, ChevronDown, Sparkles, Timer } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRamadanContext } from '@/contexts/RamadanContext';
import { useMosquePrayerStatus } from '@/hooks/useMosquePrayerStatus';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCustomFilters, useAllLocationFilters } from '@/hooks/useCustomFilters';
import { matchesSearch } from '@/utils/searchUtils';
import { Button } from '@/components/ui/button';
import type { Location } from '@/types/prayer.types';

interface NearbyScreenProps {
  onLocationSelect?: (locationId: string) => void;
  onNavigateToHome?: () => void;
  onMosqueDetails?: (locationId: string) => void;
}

// Color mapping for filter chips
const filterColorMap: Record<string, { active: string; badge: string }> = {
  emerald: { active: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25', badge: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  purple: { active: 'bg-purple-500 text-white shadow-lg shadow-purple-500/25', badge: 'bg-purple-50 border-purple-100 text-purple-700' },
  amber: { active: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25', badge: 'bg-amber-50 border-amber-100 text-amber-700' },
  cyan: { active: 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25', badge: 'bg-cyan-50 border-cyan-100 text-cyan-700' },
  blue: { active: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25', badge: 'bg-blue-50 border-blue-100 text-blue-700' },
  rose: { active: 'bg-rose-500 text-white shadow-lg shadow-rose-500/25', badge: 'bg-rose-50 border-rose-100 text-rose-700' },
  orange: { active: 'bg-orange-500 text-white shadow-lg shadow-orange-500/25', badge: 'bg-orange-50 border-orange-100 text-orange-700' },
  teal: { active: 'bg-teal-500 text-white shadow-lg shadow-teal-500/25', badge: 'bg-teal-50 border-teal-100 text-teal-700' },
  indigo: { active: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25', badge: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
  pink: { active: 'bg-pink-500 text-white shadow-lg shadow-pink-500/25', badge: 'bg-pink-50 border-pink-100 text-pink-700' },
  gray: { active: 'bg-gray-500 text-white shadow-lg shadow-gray-500/25', badge: 'bg-gray-50 border-gray-100 text-gray-700' },
};

export const NearbyScreen = ({
  onLocationSelect,
  onNavigateToHome,
  onMosqueDetails
}: NearbyScreenProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [sortByTime, setSortByTime] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  const { data: locations, isLoading } = useLocations();
  const { latitude, longitude, calculateDistance, error: locationError } = useGeolocation();
  const { isRamadan } = useRamadanContext();
  const { t } = useLanguage();

  // Dynamic filters from DB
  const { data: customFilters } = useCustomFilters();
  const { data: allLocationFilters } = useAllLocationFilters();

  const locationIds = useMemo(() => locations?.map(l => l.id) || [], [locations]);
  const { data: prayerStatusMap } = useMosquePrayerStatus(locationIds);

  // Build a map: locationId -> Set of filterIds
  const locationFilterMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allLocationFilters?.forEach(({ location_id, filter_id }) => {
      if (!map.has(location_id)) map.set(location_id, new Set());
      map.get(location_id)!.add(filter_id);
    });
    return map;
  }, [allLocationFilters]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
      return next;
    });
  };

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
      const matchesName = matchesSearch(location.mosque_name, searchQuery);
      const matchesDistrict = matchesSearch(location.district, searchQuery);
      if (!matchesName && !matchesDistrict) return false;
    }
    // Dynamic filter: location must have ALL active filters
    if (activeFilters.size > 0) {
      const locFilters = locationFilterMap.get(location.id);
      for (const filterId of activeFilters) {
        if (!locFilters?.has(filterId)) return false;
      }
    }
    return true;
  }) || [];

  const sortedLocations = filteredLocations.map(location => {
    const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
    const prayerStatus = prayerStatusMap?.[location.id];
    return {
      ...location,
      distance,
      nextIqamahTime: prayerStatus?.nextIqamahTime || null,
      nextPrayerName: prayerStatus?.nextPrayerName || null,
      prayerStatus: prayerStatus?.status || 'unknown' as const,
    };
  }).sort((a, b) => {
    if (sortByTime) {
      // Not started first, then completed
      if (a.prayerStatus !== b.prayerStatus) {
        if (a.prayerStatus === 'not_started') return -1;
        if (b.prayerStatus === 'not_started') return 1;
      }
      // Within same status, sort by iqamah time ascending
      if (a.nextIqamahTime && b.nextIqamahTime) {
        return a.nextIqamahTime.localeCompare(b.nextIqamahTime);
      }
      if (a.nextIqamahTime) return -1;
      if (b.nextIqamahTime) return 1;
      return a.distance - b.distance;
    }
    return a.distance - b.distance;
  });

  const displayedLocations = sortedLocations.slice(0, displayCount);
  const hasMore = sortedLocations.length > displayCount;

  const handleLoadMore = () => setDisplayCount(prev => prev + 10);

  const handleGetDirections = (location: Location) => {
    const destination = `${location.latitude},${location.longitude}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank');
  };

  const handleViewPrayerTimings = (location: Location) => {
    onLocationSelect?.(location.id);
    onNavigateToHome?.();
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Get the filter badges for a location
  const getLocationFilterBadges = (locationId: string) => {
    const locFilterIds = locationFilterMap.get(locationId);
    if (!locFilterIds || !customFilters) return [];
    return customFilters.filter(f => locFilterIds.has(f.id));
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
              {t('nearbyMosques')}
            </h2>
          </div>
          <p className="text-center text-blue-200 text-xs mt-2">
            {sortedLocations.length} {t('mosquesFound')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchMosques')}
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setIsSearching(true);
              setTimeout(() => setIsSearching(false), 300);
            }}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Sort by time - always shown */}
          <button
            onClick={() => setSortByTime(!sortByTime)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${sortByTime
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Timer className="w-4 h-4" />
            {t('sortByTime')}
          </button>

          {/* Dynamic filter chips from DB */}
          {customFilters?.map(filter => {
            const isActive = activeFilters.has(filter.id);
            const colors = filterColorMap[filter.color] || filterColorMap.gray;
            return (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${isActive
                  ? colors.active
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <span className="text-base">{filter.icon}</span>
                {filter.name}
              </button>
            );
          })}
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
        ) : displayedLocations.length > 0 ? (
          displayedLocations.map((location, index) => {
            const badges = getLocationFilterBadges(location.id);
            return (
              <div
                key={location.id}
                onClick={() => onMosqueDetails?.(location.id)}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-800 mb-1 leading-snug truncate">
                      {location.mosque_name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{location.district}, Tamil Nadu</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl">
                      <span className="text-lg font-bold">{location.distance.toFixed(1)}</span>
                      <span className="text-xs ml-1">km</span>
                    </div>
                  </div>
                </div>

                {/* Next Iqamah Time Badge */}
                {location.nextIqamahTime && (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl mb-3 ${location.prayerStatus === 'not_started'
                    ? 'bg-orange-50 border border-orange-100 text-orange-700'
                    : 'bg-gray-50 border border-gray-100 text-gray-500'
                    }`}>
                    <Clock className="w-3 h-3" />
                    {location.nextPrayerName} Iqamah: {formatTime(location.nextIqamahTime)}
                    {location.prayerStatus === 'completed' && (
                      <span className="ml-1 text-gray-400">• Done</span>
                    )}
                  </div>
                )}

                {/* Dynamic Filter Badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {badges.map(filter => {
                      const colors = filterColorMap[filter.color] || filterColorMap.gray;
                      return (
                        <div
                          key={filter.id}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border ${colors.badge}`}
                        >
                          <span>{filter.icon}</span>
                          {filter.name}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewPrayerTimings(location); }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-sm py-3 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-98"
                  >
                    <Clock className="w-4 h-4" />
                    {t('prayerTimes')}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleGetDirections(location); }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm py-3 hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-98"
                  >
                    <Navigation className="w-4 h-4" />
                    {t('directions')}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              {searchQuery || activeFilters.size > 0
                ? t('noMosquesMatch')
                : t('noMosquesFound')}
            </p>
          </div>
        )}

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
