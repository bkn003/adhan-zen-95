import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Compass, Users } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <div className="mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Prayer Guide
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Your personal prayer companion. Let's set up your location so we can show accurate prayer times and help you find nearby mosques.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-gray-700">Find nearby mosques</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-gray-700">Accurate prayer times</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <Compass className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-gray-700">Precise Qibla direction</span>
          </div>
        </div>

        <Button 
          onClick={onGetStarted}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-medium"
          size="lg"
        >
          Get Started
        </Button>
      </Card>
    </div>
  );
};