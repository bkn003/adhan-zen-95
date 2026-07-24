import { useEffect, useRef, useState } from 'react';
import { X, Navigation, AlertCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QiblaAROverlayProps {
  relativeQiblaDirection: number;
  qiblaDirection: number;
  deviceHeading: number;
  isPointingToQibla: boolean;
  onClose: () => void;
}

export const QiblaAROverlay = ({
  relativeQiblaDirection,
  qiblaDirection,
  deviceHeading,
  isPointingToQibla,
  onClose,
}: QiblaAROverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not supported on this device.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStarting(false);
      } catch (e: any) {
        setError(e?.message || 'Unable to access camera. Please grant camera permission.');
        setStarting(false);
      }
    };
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Clamp relative direction to -180..180 for smooth off-screen indicator
  const relSigned = ((relativeQiblaDirection + 540) % 360) - 180;
  const offScreen = Math.abs(relSigned) > 45;
  // Horizontal offset for the arrow when Qibla is roughly in front (-45..45deg → -1..1)
  const clamped = Math.max(-45, Math.min(45, relSigned));
  const xPercent = 50 + (clamped / 45) * 40; // 10%..90%

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
          <div className={`w-2 h-2 rounded-full ${isPointingToQibla ? 'bg-green-400' : 'bg-emerald-400'} animate-pulse`} />
          <span className="text-white text-xs font-medium">
            AR Qibla · {Math.round(qiblaDirection)}°
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AR view"
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {starting && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/80 text-sm bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
            Starting camera…
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-xs text-center bg-black/60 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-white text-sm mb-4">{error}</p>
            <Button onClick={onClose} className="bg-white/10 text-white border border-white/20">Close</Button>
          </div>
        </div>
      )}

      {/* AR indicator */}
      {!error && !starting && (
        <>
          {/* Center reticle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className={`w-24 h-24 rounded-full border-2 ${isPointingToQibla ? 'border-green-400' : 'border-white/40'} transition-colors`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-1 h-1 rounded-full ${isPointingToQibla ? 'bg-green-400' : 'bg-white/60'}`} />
              </div>
            </div>
          </div>

          {/* Qibla marker: floats horizontally when in front, pinned to left/right edge when off-screen */}
          <div
            className="absolute pointer-events-none transition-all duration-200"
            style={{
              top: '50%',
              left: offScreen ? (relSigned > 0 ? '92%' : '8%') : `${xPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`flex flex-col items-center ${isPointingToQibla ? 'scale-110' : ''} transition-transform`}>
              <div
                className={`p-3 rounded-full ${isPointingToQibla ? 'bg-green-500/80' : 'bg-emerald-600/70'} backdrop-blur-sm border-2 border-white/60 shadow-2xl`}
                style={{ transform: offScreen ? `rotate(${relSigned > 0 ? 90 : -90}deg)` : 'rotate(0deg)' }}
              >
                <Navigation className="w-8 h-8 text-white" fill="currentColor" />
              </div>
              <div className="mt-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full border border-amber-500/40">
                <Star className="w-3 h-3 text-amber-300" />
                <span className="text-white text-[10px] font-semibold">Kaaba</span>
              </div>
            </div>
          </div>

          {/* Bottom instruction bar */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-black/80 to-transparent">
            <div className="text-center">
              {isPointingToQibla ? (
                <p className="text-green-300 font-semibold">You are facing the Qibla ✓</p>
              ) : offScreen ? (
                <p className="text-white/90 text-sm">
                  Turn {relSigned > 0 ? 'right' : 'left'} — {Math.round(Math.abs(relSigned))}° to Qibla
                </p>
              ) : (
                <p className="text-white/90 text-sm">
                  Almost there — {Math.round(Math.abs(relSigned))}° {relSigned > 0 ? 'right' : 'left'}
                </p>
              )}
              <p className="text-white/50 text-[11px] mt-1">
                Heading {Math.round(deviceHeading)}° · Qibla {Math.round(qiblaDirection)}°
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
