
import React, { useState, useEffect } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SplashScreen } from '@/components/SplashScreen';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { HomeScreen } from '@/screens/HomeScreen';
import { NearbyScreen } from '@/screens/NearbyScreen';
import { QiblaScreen } from '@/screens/QiblaScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import type { Screen } from '@/types/navigation.types';
import type { Location } from '@/types/prayer.types';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Check for first-time setup and show splash screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
      const savedLocationId = localStorage.getItem('selectedLocationId');
      
      if (!hasCompletedOnboarding || !savedLocationId) {
        setIsFirstTime(true);
      } else {
        setSelectedLocationId(savedLocationId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const handleNavigateToHome = () => {
    setCurrentScreen('home');
  };

  const handleOnboardingComplete = (selectedLocation: Location) => {
    // Save onboarding completion and selected location
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem('selectedLocationId', selectedLocation.id);
    localStorage.setItem('selectedLocationData', JSON.stringify(selectedLocation));
    
    setSelectedLocationId(selectedLocation.id);
    setIsFirstTime(false);
    setCurrentScreen('home');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen 
            selectedLocationId={selectedLocationId}
            onLocationSelect={handleLocationSelect}
          />
        );
      case 'nearby':
        return (
          <NearbyScreen 
            onLocationSelect={handleLocationSelect}
            onNavigateToHome={handleNavigateToHome}
          />
        );
      case 'qibla':
        return <QiblaScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return (
          <HomeScreen 
            selectedLocationId={selectedLocationId}
            onLocationSelect={handleLocationSelect}
          />
        );
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (isFirstTime) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white">
      {renderScreen()}
      <BottomNavigation 
        currentScreen={currentScreen} 
        onScreenChange={setCurrentScreen} 
      />
    </div>
  );
};

export default Index;
