import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, MapPin } from "lucide-react";
import type { Location } from "@/types/prayer.types";

interface SetupCompleteScreenProps {
  selectedMosque: Location;
  onComplete: () => void;
}

export const SetupCompleteScreen = ({ selectedMosque, onComplete }: SetupCompleteScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <div className="mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Setup Complete!
          </h1>
          <p className="text-gray-600 mb-6">
            Your mosque has been set successfully
          </p>
        </div>

        <Card className="p-4 mb-8 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-left">
              <p className="font-medium text-emerald-900 text-sm">
                {selectedMosque.mosque_name}
              </p>
              <p className="text-xs text-emerald-700">
                {selectedMosque.district}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 mb-8">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            ✅ Prayer times will be calculated based on your selected mosque location
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            ✅ You can change your mosque anytime in settings
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            ✅ Qibla direction is calibrated for your location
          </div>
        </div>

        <Button 
          onClick={onComplete}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-medium"
          size="lg"
        >
          Start Using App
        </Button>
      </Card>
    </div>
  );
};