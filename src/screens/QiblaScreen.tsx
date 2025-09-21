
import { useState, useEffect } from 'react';
import { Compass, Navigation, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGeolocation } from '@/hooks/useGeolocation';
import { tamilText } from '@/utils/tamilText';

export const QiblaScreen = () => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
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

  // Update timestamp when heading changes for real-time indication
  useEffect(() => {
    setLastUpdate(Date.now());
  }, [deviceHeading]);

  const handleCalibrate = () => {
    setIsCalibrating(true);
    // Simulate calibration process
    setTimeout(() => {
      setIsCalibrating(false);
    }, 2000);
  };

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
      <Card className="p-6 border border-green-100">
        <div className="flex flex-col items-center">
          {/* Compass accuracy indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${heading !== null ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-sm text-gray-600">
              {heading !== null ? 'Compass Active' : 'Compass Inactive'}
            </span>
            {deviceHeading && (
              <span className="text-xs text-gray-400 ml-2">
                Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
              </span>
            )}
          </div>

          <div className="relative w-56 h-56 mb-6">
            {/* Compass Circle with enhanced visuals */}
            <div 
              className="absolute inset-0 rounded-full border-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${-deviceHeading}deg)` }}
            >
              {/* Enhanced direction markers */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-lg font-bold text-red-600 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">N</div>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-600 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">E</div>
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-600 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">S</div>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-600 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">W</div>
              
              {/* Degree markings */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((degree) => (
                <div
                  key={degree}
                  className="absolute w-0.5 h-4 bg-gray-400 origin-bottom"
                  style={{
                    top: '8px',
                    left: '50%',
                    transform: `translateX(-50%) rotate(${degree}deg)`,
                    transformOrigin: '50% 104px'
                  }}
                />
              ))}
            </div>
            
            {/* Enhanced Qibla Arrow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Navigation 
                  className="w-20 h-20 text-emerald-600 transition-transform duration-500 ease-out drop-shadow-lg filter"
                  style={{ transform: `rotate(${relativeQiblaDirection}deg)` }}
                  fill="currentColor"
                />
                {/* Qibla direction indicator ring */}
                <div 
                  className="absolute inset-0 rounded-full border-2 border-emerald-400 border-dashed animate-pulse"
                  style={{ transform: `rotate(${relativeQiblaDirection}deg)` }}
                />
              </div>
            </div>
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-600 rounded-full shadow-lg"></div>
          </div>
          
          <div className="text-center space-y-3">
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <p className="text-3xl font-bold text-emerald-700 mb-1">
                {Math.round(qiblaDirection)}°
              </p>
              <p className="text-sm text-emerald-600 font-medium">Qibla Direction</p>
              <p className="text-xs text-gray-600 mt-1">{getCompassDirection(qiblaDirection)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">Distance to Mecca</p>
                <p className="font-semibold text-gray-800">
                  {latitude && longitude ? Math.round(calculateDistance(latitude, longitude, 21.4225, 39.8262)) : 4153} km
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">Device Heading</p>
                <p className="font-semibold text-gray-800">
                  {Math.round(deviceHeading)}° {compassDirection}
                </p>
              </div>
            </div>
            
            {/* Calibration and status */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={handleCalibrate}
                disabled={isCalibrating}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {isCalibrating ? (
                  <>
                    <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                    Calibrating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Calibrate
                  </>
                )}
              </Button>
              
              {magneticHeading === null && heading === null && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-xs">Move device in figure-8</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

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
