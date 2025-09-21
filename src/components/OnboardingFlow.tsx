import { useState } from "react";
import { WelcomeScreen } from "./onboarding/WelcomeScreen";
import { LocationPermissionScreen } from "./onboarding/LocationPermissionScreen";
import { MosqueSearchScreen } from "./onboarding/MosqueSearchScreen";
import { SetupCompleteScreen } from "./onboarding/SetupCompleteScreen";
import type { Location } from "@/types/prayer.types";

type OnboardingStep = 'welcome' | 'location' | 'mosque-search' | 'complete';

interface OnboardingFlowProps {
  onComplete: (selectedLocation: Location) => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedMosque, setSelectedMosque] = useState<Location | null>(null);

  const handleGetStarted = () => {
    setCurrentStep('location');
  };

  const handleLocationContinue = () => {
    setCurrentStep('mosque-search');
  };

  const handleLocationSkip = () => {
    setCurrentStep('mosque-search');
  };

  const handleMosqueSelected = (location: Location) => {
    setSelectedMosque(location);
    setCurrentStep('complete');
  };

  const handleSetupComplete = () => {
    if (selectedMosque) {
      onComplete(selectedMosque);
    }
  };

  switch (currentStep) {
    case 'welcome':
      return <WelcomeScreen onGetStarted={handleGetStarted} />;
    
    case 'location':
      return (
        <LocationPermissionScreen
          onContinue={handleLocationContinue}
          onSkip={handleLocationSkip}
        />
      );
    
    case 'mosque-search':
      return <MosqueSearchScreen onMosqueSelected={handleMosqueSelected} />;
    
    case 'complete':
      return selectedMosque ? (
        <SetupCompleteScreen
          selectedMosque={selectedMosque}
          onComplete={handleSetupComplete}
        />
      ) : null;
    
    default:
      return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }
};