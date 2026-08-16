import { useEffect, useRef, useState } from 'react';
import { Compass, Navigation, RotateCcw, AlertCircle, MapPin, Star, Camera, WifiOff, Share2, Info, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useGeolocation } from '@/hooks/useGeolocation';
import { tamilText } from '@/utils/tamilText';
import { QiblaAROverlay } from '@/components/QiblaAROverlay';
import { toast } from 'sonner';

export const QiblaScreen = () => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const alignedRef = useRef(false);

  const geo = useGeolocation() as any;
  const {
    latitude,
    longitude,
    error,
    loading,
    heading,
    magneticHeading,
    accuracy,
    isCalibrated,
    calculateDistance,
    calculateQiblaDirection,
    getCompassDirection,
    getRelativeQiblaDirection,
  } = geo;
  const cachedFallback: boolean = !!geo.cachedFallback;

  const qiblaDirection = calculateQiblaDirection();
  const relativeQiblaDirection = getRelativeQiblaDirection();
  const deviceHeading = magneticHeading || heading || 0;
  const compassDirection = getCompassDirection(deviceHeading);
  /** Signed shortest turn to face Qibla: negative = turn left, positive = turn right. */
  const turnOffset = ((relativeQiblaDirection + 180) % 360) - 180;
  const offAxis = Math.abs(turnOffset);
  const isPointingToQibla = offAxis < 5;
  const alignment = Math.max(0, Math.round(100 - (offAxis / 180) * 100));

  // Short haptic buzz the moment the phone lines up with the Qibla.
  useEffect(() => {
    if (isPointingToQibla && !alignedRef.current) {
      alignedRef.current = true;
      navigator.vibrate?.([40, 60, 40]);
    } else if (!isPointingToQibla && offAxis > 12) {
      alignedRef.current = false;
    }
  }, [isPointingToQibla, offAxis]);

  const handleCalibrate = () => {
    setIsCalibrating(true);
    navigator.vibrate?.(30);
    setTimeout(() => setIsCalibrating(false), 2000);
  };

  const handleShare = async () => {
    const text = `Qibla direction here: ${Math.round(qiblaDirection)}° (${getCompassDirection(qiblaDirection)})${
      latitude && longitude ? ` at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : ''
    }`;
    try {
      if (navigator.share) await navigator.share({ title: 'Qibla direction', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Qibla details copied');
      }
    } catch {
      /* cancelled */
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-4 pb-28 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping" />
            <Compass className="absolute inset-2 w-16 h-16 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Finding Location...</h3>
        </div>
      </div>
    );
  }

  // Show hard error only if we have no coordinates at all (no cache either).
  if (error && (latitude == null || longitude == null)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-4 pb-28 flex items-center justify-center">
        <div className="text-center max-w-xs px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Location Needed</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <p className="text-gray-500 text-xs">Enable location once to use Qibla offline afterwards.</p>
        </div>
      </div>
    );
  }

  const accuracyLabel = accuracy == null
    ? null
    : accuracy < 30 ? 'High accuracy'
    : accuracy < 100 ? 'Medium accuracy'
    : 'Low accuracy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-4 pb-28">
      {arOpen && (
        <QiblaAROverlay
          relativeQiblaDirection={relativeQiblaDirection}
          qiblaDirection={qiblaDirection}
          deviceHeading={deviceHeading}
          isPointingToQibla={isPointingToQibla}
          onClose={() => setArOpen(false)}
        />
      )}

      {/* Header - Compact */}
      <div className="text-center pt-2 mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full mb-2">
          <div className={`w-2 h-2 rounded-full ${isPointingToQibla ? 'bg-green-400' : 'bg-emerald-400'} animate-pulse`} />
          <span className="text-emerald-300 text-xs font-medium">
            {isPointingToQibla ? 'Facing Qibla ✓' : 'Active'}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">{tamilText.general.qiblaDirection.english}</h1>

        {/* Status chips */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {cachedFallback && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px]">
              <WifiOff className="w-3 h-3" /> Offline · last-known
            </span>
          )}
          {accuracyLabel && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
              accuracy! < 30 ? 'bg-green-500/15 border-green-400/40 text-green-200'
              : accuracy! < 100 ? 'bg-yellow-500/15 border-yellow-400/40 text-yellow-200'
              : 'bg-red-500/15 border-red-400/40 text-red-200'
            }`}>
              ±{Math.round(accuracy!)}m · {accuracyLabel}
            </span>
          )}
          {!isCalibrated && (magneticHeading != null || heading != null) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-400/40 text-orange-200 text-[10px]">
              <AlertCircle className="w-3 h-3" /> Compass needs calibration
            </span>
          )}
        </div>
      </div>

      {/* Compass - Responsive size */}
      <div className="relative flex items-center justify-center py-4">
        <div className={`absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full ${isPointingToQibla ? 'bg-green-500/20' : 'bg-emerald-500/10'
          } transition-all duration-500`} />

        <div
          className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border-2 border-emerald-500/20 transition-transform duration-300"
          style={{ transform: `rotate(${-deviceHeading}deg)` }}
        >
          {/* Degree markers */}
          {Array.from({ length: 36 }, (_, i) => i * 10).map((degree) => (
            <div
              key={degree}
              className={`absolute left-1/2 ${degree % 30 === 0 ? 'h-2 w-0.5 bg-emerald-400' : 'h-1.5 w-px bg-emerald-600/50'}`}
              style={{
                top: '6px',
                transform: `translateX(-50%) rotate(${degree}deg)`,
                transformOrigin: '50% 90px'
              }}
            />
          ))}

          {/* Cardinal directions */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-sm font-bold text-red-400 bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center border border-red-400/30">N</div>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-bold text-emerald-400/70">E</div>
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 text-xs font-bold text-emerald-400/70">S</div>
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-bold text-emerald-400/70">W</div>

          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-emerald-500/10" />
        </div>

        {/* Qibla Arrow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="transition-transform duration-300"
            style={{ transform: `rotate(${relativeQiblaDirection}deg)` }}
          >
            <Navigation
              className={`w-12 h-12 sm:w-14 sm:h-14 ${isPointingToQibla ? 'text-green-400' : 'text-emerald-400'} drop-shadow-lg`}
              fill="currentColor"
            />
          </div>
        </div>

        {/* Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 bg-gradient-to-br from-amber-600 to-amber-800 rounded flex items-center justify-center shadow-lg border border-amber-500/50">
            <Star className="w-3 h-3 text-amber-200" />
          </div>
        </div>
      </div>

      {/* Info Cards - Stack on mobile */}
      <div className="space-y-3 mt-4">
        {/* Live turn guidance */}
        <div className={`rounded-xl p-3 border backdrop-blur-sm ${
          isPointingToQibla ? 'bg-green-500/20 border-green-400/40' : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white">
              {isPointingToQibla
                ? 'Facing the Qibla — you can pray'
                : `Turn ${turnOffset > 0 ? 'right' : 'left'} ${Math.round(offAxis)}°`}
            </p>
            <span className={`text-xs font-bold ${isPointingToQibla ? 'text-green-300' : 'text-emerald-300/80'}`}>
              {alignment}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isPointingToQibla ? 'bg-green-400' : offAxis < 20 ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${alignment}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">

          <div className={`p-3 rounded-xl ${isPointingToQibla ? 'bg-green-500/20 border-green-500/30' : 'bg-white/5 border-white/10'
            } border backdrop-blur-sm`}>
            <p className="text-emerald-300/70 text-[10px] uppercase tracking-wider">Qibla</p>
            <p className={`text-xl font-bold ${isPointingToQibla ? 'text-green-400' : 'text-white'}`}>
              {Math.round(qiblaDirection)}°
            </p>
            <p className="text-emerald-400/60 text-xs">{getCompassDirection(qiblaDirection)}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <p className="text-emerald-300/70 text-[10px] uppercase tracking-wider">Heading</p>
            <p className="text-xl font-bold text-white">{Math.round(deviceHeading)}°</p>
            <p className="text-emerald-400/60 text-xs">{compassDirection}</p>
          </div>
        </div>

        {/* Distance */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="text-white text-sm font-medium">Distance to Mecca</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-white">
                {latitude && longitude ? Math.round(calculateDistance(latitude, longitude, 21.4225, 39.8262)).toLocaleString() : '4,153'}
              </span>
              <span className="text-emerald-400/60 text-xs ml-1">km</span>
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-emerald-300/70 text-xs">Coordinates</span>
            {latitude && longitude && (
              <span className="text-white text-xs font-mono">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <Button
            onClick={() => setArOpen(true)}
            size="sm"
            className="bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-xl text-xs border border-emerald-300/40"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            AR View
          </Button>

          <Button
            onClick={handleCalibrate}
            disabled={isCalibrating}
            size="sm"
            className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-xl text-xs"
          >
            {isCalibrating ? (
              <>
                <RotateCcw className="w-3 h-3 mr-1.5 animate-spin" />
                Calibrating...
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Calibrate
              </>
            )}
          </Button>

          <Button
            onClick={handleShare}
            size="sm"
            className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-xl text-xs"
          >
            <Share2 className="w-3 h-3 mr-1.5" />
            Share
          </Button>

          <Button
            onClick={() => setShowTips(v => !v)}
            size="sm"
            className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-xl text-xs"
          >
            <Info className="w-3 h-3 mr-1.5" />
            Accuracy tips
          </Button>

          {magneticHeading === null && heading === null && (
            <span className="text-amber-400 text-xs flex items-center gap-1 w-full justify-center mt-1">
              <AlertCircle className="w-3 h-3" />
              Move phone in a figure-8 to calibrate
            </span>
          )}
        </div>

        {showTips && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 space-y-2">
            <p className="text-white text-sm font-semibold flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" /> Get the most accurate Qibla
            </p>
            <ul className="text-emerald-100/80 text-xs space-y-1 list-disc pl-4">
              <li>Hold the phone flat, screen up, at chest height.</li>
              <li>Stay away from metal, magnets, speakers and car dashboards.</li>
              <li>Wave the phone in a figure-8 twice, then tap Calibrate.</li>
              <li>Cross-check outdoors: the compass reading should match landmarks you know.</li>
              <li>Qibla here is {Math.round(qiblaDirection)}° from true north ({getCompassDirection(qiblaDirection)}) — great-circle bearing to the Kaaba.</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
};
