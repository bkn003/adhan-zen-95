
import { Compass, Navigation } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { tamilText } from '@/utils/tamilText';

export const QiblaScreen = () => {
  const { 
    latitude, 
    longitude, 
    error, 
    loading, 
    heading,
    magneticHeading,
    calculateDistance,
    calculateQiblaDirection, 
    getCompassDirection,
    getRelativeQiblaDirection 
  } = useGeolocation();
  
  const qiblaDirection = calculateQiblaDirection();
  const relativeQiblaDirection = getRelativeQiblaDirection();
  const deviceHeading = magneticHeading || heading || 0;
  const compassDirection = getCompassDirection(deviceHeading);

  if (loading) {
    return (
      <div className="p-4 pb-20">
        <div className="bg-white rounded-xl p-6 border border-green-100">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Compass className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">
              {tamilText.general.qiblaDirection.english}
            </h2>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 pb-20">
        <div className="bg-white rounded-xl p-6 border border-green-100">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Compass className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">
              {tamilText.general.qiblaDirection.english}
            </h2>
          </div>
          <div className="text-center text-gray-500">
            <p>Unable to determine location</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Header with Kaaba Image */}
      <div className="bg-white rounded-xl p-4 border border-green-100">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Compass className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">
            {tamilText.general.qiblaDirection.english}
          </h2>
        </div>
        <p className="text-center text-sm text-gray-600 mb-4">
          Find the direction to Masjid Al-Haram, Mecca
        </p>
        
        {/* Kaaba Image Placeholder */}
        <div className="w-full h-32 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-lg mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Kaaba, Mecca</p>
          </div>
        </div>
      </div>

      {/* Compass */}
      <div className="bg-white rounded-xl p-6 border border-green-100">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 mb-6">
            {/* Compass Circle */}
            <div 
              className="absolute inset-0 rounded-full border-4 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 transition-transform duration-300"
              style={{ transform: `rotate(${-deviceHeading}deg)` }}
            >
              {/* Direction markers */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-red-600">N</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-600">E</div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-600">S</div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-600">W</div>
            </div>
            
            {/* Qibla Arrow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Navigation 
                className="w-16 h-16 text-green-600 transition-transform duration-300"
                style={{ transform: `rotate(${relativeQiblaDirection}deg)` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600 mb-2">
              Qibla: {Math.round(qiblaDirection)}°
            </p>
            <p className="text-sm text-gray-500 mb-2">Direction: {getCompassDirection(qiblaDirection)}</p>
            <p className="text-sm text-gray-500 mb-4">Distance: {latitude && longitude ? Math.round(calculateDistance(latitude, longitude, 21.4225, 39.8262)) : 4153} km to Mecca</p>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Device Heading: {Math.round(deviceHeading)}° ({compassDirection})</span>
              <span>Relative Qibla: {Math.round(relativeQiblaDirection)}°</span>
            </div>
            {heading !== null && (
              <p className="text-xs text-green-600">
                ✓ Live compass active
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Your Location */}
      <div className="bg-white rounded-xl p-4 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Your Location</h3>
        {latitude && longitude && (
          <p className="text-sm text-gray-500 text-center">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
};
