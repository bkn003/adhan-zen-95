
import { useGeolocation } from '@/hooks/useGeolocation';
import { Compass, Navigation } from 'lucide-react';

export const QiblaCompass = () => {
  const { latitude, longitude, error, loading, calculateQiblaDirection } = useGeolocation();
  
  const qiblaDirection = calculateQiblaDirection();

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Compass className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold">Qibla Direction</h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Compass className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold">Qibla Direction</h2>
        </div>
        <div className="text-center text-muted-foreground">
          <p>Unable to determine location</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold">Qibla Direction</h2>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48 mb-4">
          {/* Compass Circle */}
          <div className="absolute inset-0 rounded-full border-4 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Direction markers */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-green-800">N</div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm font-semibold text-green-800">E</div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-green-800">S</div>
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-semibold text-green-800">W</div>
          </div>
          
          {/* Qibla Arrow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Navigation 
              className="w-16 h-16 text-green-600 transition-transform duration-1000"
              style={{ transform: `rotate(${qiblaDirection}deg)` }}
            />
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 mb-1">
            {Math.round(qiblaDirection)}°
          </p>
          <p className="text-sm text-muted-foreground mb-2">Direction to Mecca</p>
          {latitude && longitude && (
            <p className="text-xs text-muted-foreground">
              Your location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
