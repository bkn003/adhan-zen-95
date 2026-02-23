
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
import { MosqueAdminPanel } from '@/screens/MosqueAdminPanel';
import { SuperAdminPanel } from '@/screens/SuperAdminPanel';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import type { Screen } from '@/types/navigation.types';
import type { Location } from '@/types/prayer.types';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('currentScreen');
    return (saved as Screen) || 'home';
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [mosqueDetailsId, setMosqueDetailsId] = useState<string | null>(() => {
    return localStorage.getItem('mosqueDetailsId') || null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  // Enable realtime sync for locations & prayer_times
  useRealtimeSync();

  // Listen for admin panel navigation event
  useEffect(() => {
    const handler = () => setShowAdminPanel(true);
    const superHandler = () => setShowSuperAdmin(true);
    window.addEventListener('navigate-admin', handler);
    window.addEventListener('navigate-super-admin', superHandler);
    return () => {
      window.removeEventListener('navigate-admin', handler);
      window.removeEventListener('navigate-super-admin', superHandler);
    };
  }, []);

  // Handle hardware back button / browser back
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (showSuperAdmin) {
        setShowSuperAdmin(false);
      } else if (showAdminPanel) {
        setShowAdminPanel(false);
      } else if (mosqueDetailsId) {
        setMosqueDetailsId(null);
      } else if (currentScreen !== 'home') {
        setCurrentScreen('home');
      }
      // Push state again so back button keeps working
      window.history.pushState(null, '', window.location.href);
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSuperAdmin, showAdminPanel, mosqueDetailsId, currentScreen]);

  // Persist current screen
  useEffect(() => {
    localStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  // Persist mosque details id
  useEffect(() => {
    if (mosqueDetailsId) {
      localStorage.setItem('mosqueDetailsId', mosqueDetailsId);
    } else {
      localStorage.removeItem('mosqueDetailsId');
    }
  }, [mosqueDetailsId]);

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
    if (showSuperAdmin) {
      return <SuperAdminPanel onBack={() => setShowSuperAdmin(false)} />;
    }

    if (showAdminPanel) {
      return (
        <MosqueAdminPanel onBack={() => setShowAdminPanel(false)} />
      );
    }

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
