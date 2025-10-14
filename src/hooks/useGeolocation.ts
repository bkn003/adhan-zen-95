
import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  heading: number | null;
  magneticHeading: number | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    heading: null,
    magneticHeading: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported by this browser.', loading: false }));
      return;
    }

    let retryIntervalId: number | undefined;
    let watchId: number | undefined;

    const success = (position: GeolocationPosition) => {
      setState(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
      }));
    };

    const onGeoError = (err: GeolocationPositionError) => {
      setState(prev => ({ ...prev, error: err.message, loading: false }));
      // Keep trying periodically until user grants permission
      if (err.code === 1 /* PERMISSION_DENIED */) {
        if (!retryIntervalId) {
          retryIntervalId = window.setInterval(() => requestOnce(), 15000);
        }
      }
    };

    const requestOnce = () => {
      navigator.geolocation.getCurrentPosition(success, onGeoError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      });
    };

    // Permissions API to re-attempt when user changes it in settings
    const anyNavigator: any = navigator as any;
    if (anyNavigator.permissions?.query) {
      anyNavigator.permissions
        .query({ name: 'geolocation' as any })
        .then((perm: any) => {
          if (perm.state === 'granted' || perm.state === 'prompt') {
            requestOnce();
          } else if (perm.state === 'denied') {
            // Poll until user flips it
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

    // Also start a passive watcher that updates instantly after permission is granted
    try {
      watchId = navigator.geolocation.watchPosition(success, () => {}, { enableHighAccuracy: true });
    } catch {}

    // Device orientation setup with enhanced accuracy
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let calculatedHeading = null;
      let magneticValue = null;

      // iOS devices provide webkitCompassHeading (true north)
      if ((event as any).webkitCompassHeading !== undefined && (event as any).webkitCompassHeading !== null) {
        magneticValue = (event as any).webkitCompassHeading;
        calculatedHeading = magneticValue;
      } 
      // Android and other devices use alpha (magnetic north)
      else if (event.alpha !== null) {
        // For Android, alpha represents the rotation around the Z-axis
        // We need to normalize it to compass heading
        calculatedHeading = 360 - event.alpha;
        magneticValue = calculatedHeading;
      }

      if (calculatedHeading !== null) {
        setState(prev => ({
          ...prev,
          heading: calculatedHeading,
          magneticHeading: magneticValue,
        }));
      }
    };

    // Also handle absolute orientation for better accuracy
    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      if (event.absolute && event.alpha !== null) {
        const heading = 360 - event.alpha;
        setState(prev => ({
          ...prev,
          heading: heading,
          magneticHeading: heading,
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
      // For Android and other devices
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
    }

    return () => {
      if (retryIntervalId) window.clearInterval(retryIntervalId);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation);
    };
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateQiblaDirection = (): number => {
    if (!state.latitude || !state.longitude) return 0;
    
    // Coordinates for Kaaba, Mecca (improved precision)
    const meccaLat = 21.422487;
    const meccaLon = 39.826206;
    
    // Convert to radians
    const lat1 = state.latitude * (Math.PI / 180);
    const lat2 = meccaLat * (Math.PI / 180);
    const deltaLon = (meccaLon - state.longitude) * (Math.PI / 180);
    
    // Calculate bearing using the forward azimuth formula
    const y = Math.sin(deltaLon);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltaLon);
    
    const bearing = Math.atan2(y, x);
    const qiblaDirection = ((bearing * (180 / Math.PI)) + 360) % 360;
    
    return qiblaDirection;
  };

  const getCompassDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getRelativeQiblaDirection = (): number => {
    const qiblaDirection = calculateQiblaDirection();
    const deviceHeading = state.magneticHeading || state.heading || 0;
    return (qiblaDirection - deviceHeading + 360) % 360;
  };

  return {
    ...state,
    calculateDistance,
    calculateQiblaDirection,
    getCompassDirection,
    getRelativeQiblaDirection,
  };
};
