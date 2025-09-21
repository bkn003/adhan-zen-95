import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, AlertCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface LocationPermissionScreenProps {
  onContinue: () => void;
  onSkip: () => void;
}

export const LocationPermissionScreen = ({ onContinue, onSkip }: LocationPermissionScreenProps) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const { latitude, longitude, error } = useGeolocation();

  const handleRequestLocation = () => {
    setIsRequesting(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsRequesting(false);
          onContinue();
        },
        (error) => {
          setIsRequesting(false);
          console.error('Location permission denied:', error);
        }
      );
    } else {
      setIsRequesting(false);
      console.error('Geolocation not supported');
    }
  };

  // If we already have location, proceed automatically
  if (latitude && longitude && !error) {
    setTimeout(onContinue, 100);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <div className="mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Location Access
          </h1>
          <p className="text-gray-600 leading-relaxed">
            We need access to your location to find nearby mosques and prayer times for your area. May we access your location?
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm text-amber-800 font-medium">Location access needed</p>
              <p className="text-xs text-amber-700 mt-1">
                You can enable location access in settings later for better results.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleRequestLocation}
            disabled={isRequesting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
            size="lg"
          >
            {isRequesting ? "Requesting..." : "Allow Location Access"}
          </Button>
          
          <Button 
            onClick={onSkip}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 py-3"
            size="lg"
          >
            Skip for Now
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Location data is used only to find nearby mosques and calculate prayer times.
        </p>
      </Card>
    </div>
  );
};