import { useState, useEffect, useRef, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  heading: number | null;
  magneticHeading: number | null;
  accuracy: number | null;
  isCalibrated: boolean;
}

// Low-pass filter for smooth compass movement
const smoothAngle = (currentAngle: number, targetAngle: number, alpha: number = 0.15): number => {
  // Handle the 360/0 degree wrap-around
  let diff = targetAngle - currentAngle;

  // Normalize difference to -180 to 180
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  let result = currentAngle + alpha * diff;

  // Normalize result to 0-360
  while (result < 0) result += 360;
  while (result >= 360) result -= 360;

  return result;
};

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    heading: null,
    magneticHeading: null,
    accuracy: null,
    isCalibrated: false,
  });

  // Use refs for smooth heading updates
  const smoothedHeadingRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const headingHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported by this browser.', loading: false }));
      return;
    }

    let retryIntervalId: number | undefined;
    let watchId: number | undefined;
    let animationFrameId: number | undefined;

    const success = (position: GeolocationPosition) => {
      setState(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
      }));
    };

    const onGeoError = (err: GeolocationPositionError) => {
      setState(prev => ({ ...prev, error: err.message, loading: false }));
      if (err.code === 1) {
        if (!retryIntervalId) {
          retryIntervalId = window.setInterval(() => requestOnce(), 15000);
        }
      }
    };

    const requestOnce = () => {
      navigator.geolocation.getCurrentPosition(success, onGeoError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    };

    const anyNavigator: any = navigator as any;
    if (anyNavigator.permissions?.query) {
      anyNavigator.permissions
        .query({ name: 'geolocation' as any })
        .then((perm: any) => {
          if (perm.state === 'granted' || perm.state === 'prompt') {
            requestOnce();
          } else if (perm.state === 'denied') {
            retryIntervalId = window.setInterval(() => requestOnce(), 15000);
          }
          perm.onchange = () => {
            if (perm.state === 'granted') {
              requestOnce();
              if (retryIntervalId) window.clearInterval(retryIntervalId);
              retryIntervalId = undefined;
            }
          };
        })
        .catch(() => requestOnce());
    } else {
      requestOnce();
    }

    try {
      watchId = navigator.geolocation.watchPosition(success, () => { }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      });
    } catch { }

    // Enhanced device orientation handler with smoothing
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const now = Date.now();

      let rawHeading: number | null = null;

      // iOS devices - webkitCompassHeading is most accurate
      if ((event as any).webkitCompassHeading !== undefined && (event as any).webkitCompassHeading !== null) {
        rawHeading = (event as any).webkitCompassHeading;
      }
      // Android and other devices
      else if (event.alpha !== null) {
        // Check if absolute orientation
        if (event.absolute || (event as any).webkitCompassAccuracy !== undefined) {
          rawHeading = (360 - event.alpha) % 360;
        } else {
          rawHeading = (360 - event.alpha) % 360;
        }
      }

      if (rawHeading !== null) {
        // Add to history for median filtering (reduces noise)
        headingHistoryRef.current.push(rawHeading);
        if (headingHistoryRef.current.length > 5) {
          headingHistoryRef.current.shift();
        }

        // Calculate median of recent readings
        const sortedHistory = [...headingHistoryRef.current].sort((a, b) => a - b);
        const medianHeading = sortedHistory[Math.floor(sortedHistory.length / 2)];

        // Apply smooth interpolation
        const timeDelta = now - lastUpdateTimeRef.current;
        const smoothingFactor = Math.min(0.3, timeDelta / 100 * 0.1); // Adaptive smoothing

        const smoothedHeading = smoothAngle(
          smoothedHeadingRef.current || medianHeading,
          medianHeading,
          smoothingFactor
        );

        smoothedHeadingRef.current = smoothedHeading;
        lastUpdateTimeRef.current = now;

        // Check calibration based on accuracy
        const accuracy = (event as any).webkitCompassAccuracy;
        const isCalibrated = accuracy === undefined || accuracy < 25;

        setState(prev => ({
          ...prev,
          heading: Math.round(smoothedHeading * 10) / 10, // Round to 1 decimal
          magneticHeading: Math.round(smoothedHeading * 10) / 10,
          isCalibrated,
        }));
      }
    };

    // Absolute orientation is preferred when available
    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      if (event.absolute && event.alpha !== null) {
        const rawHeading = (360 - event.alpha) % 360;

        // Smooth the absolute heading
        const smoothedHeading = smoothAngle(
          smoothedHeadingRef.current || rawHeading,
          rawHeading,
          0.2
        );

        smoothedHeadingRef.current = smoothedHeading;

        setState(prev => ({
          ...prev,
          heading: Math.round(smoothedHeading * 10) / 10,
          magneticHeading: Math.round(smoothedHeading * 10) / 10,
          isCalibrated: true,
        }));
      }
    };

    // Request orientation permissions for iOS 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
            window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
          }
        })
        .catch(() => {
          console.log('Device orientation permission denied');
        });
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
    }

    return () => {
      if (retryIntervalId) window.clearInterval(retryIntervalId);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation);
    };
  }, []);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const calculateQiblaDirection = useCallback((): number => {
    if (!state.latitude || !state.longitude) return 0;

    // Coordinates for Kaaba  (precise)
    const meccaLat = 21.422487;
    const meccaLon = 39.826206;

    const lat1 = state.latitude * (Math.PI / 180);
    const lat2 = meccaLat * (Math.PI / 180);
    const deltaLon = (meccaLon - state.longitude) * (Math.PI / 180);

    // Forward azimuth formula
    const y = Math.sin(deltaLon);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltaLon);

    const bearing = Math.atan2(y, x);
    const qiblaDirection = ((bearing * (180 / Math.PI)) + 360) % 360;

    return Math.round(qiblaDirection * 10) / 10;
  }, [state.latitude, state.longitude]);

  const getCompassDirection = useCallback((degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }, []);

  const getRelativeQiblaDirection = useCallback((): number => {
    const qiblaDirection = calculateQiblaDirection();
    const deviceHeading = state.magneticHeading || state.heading || 0;
    let relative = (qiblaDirection - deviceHeading + 360) % 360;
    return Math.round(relative * 10) / 10;
  }, [calculateQiblaDirection, state.magneticHeading, state.heading]);

  return {
    ...state,
    calculateDistance,
    calculateQiblaDirection,
    getCompassDirection,
    getRelativeQiblaDirection,
  };
};
