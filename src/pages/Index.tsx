
import React, { useState, useEffect } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SplashScreen } from '@/components/SplashScreen';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { HomeScreen } from '@/screens/HomeScreen';
import { NearbyScreen } from '@/screens/NearbyScreen';
import { QiblaScreen } from '@/screens/QiblaScreen';
import { QazaScreen } from '@/screens/QazaScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { MosqueDetailsScreen } from '@/screens/MosqueDetailsScreen';
import type { Screen } from '@/types/navigation.types';
import type { Location } from '@/types/prayer.types';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [mosqueDetailsId, setMosqueDetailsId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
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
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem('selectedLocationId', selectedLocation.id);
    localStorage.setItem('selectedLocationData', JSON.stringify(selectedLocation));
    setSelectedLocationId(selectedLocation.id);
    setIsFirstTime(false);
    setCurrentScreen('home');
  };

  const handleMosqueDetails = (locationId: string) => {
    setMosqueDetailsId(locationId);
  };

  const handleMosqueDetailsBack = () => {
    setMosqueDetailsId(null);
  };

  const handleSelectForPrayer = (locationId: string) => {
    handleLocationSelect(locationId);
    localStorage.setItem('selectedLocationId', locationId);
    setMosqueDetailsId(null);
    setCurrentScreen('home');
  };

  const renderScreen = () => {
    if (mosqueDetailsId && currentScreen === 'nearby') {
      return (
        <MosqueDetailsScreen
          locationId={mosqueDetailsId}
          onBack={handleMosqueDetailsBack}
          onSelectForPrayer={handleSelectForPrayer}
        />
      );
    }

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
            onMosqueDetails={handleMosqueDetails}
          />
        );
      case 'qibla':
        return <QiblaScreen />;
      case 'qaza':
        return <QazaScreen />;
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
        onScreenChange={(screen) => {
          setMosqueDetailsId(null);
          setCurrentScreen(screen);
        }}
      />
    </div>
  );
};

export default Index;
