
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
import { ZakatScreen } from '@/screens/ZakatScreen';
import { TasbeehScreen } from '@/screens/TasbeehScreen';
import { SyncChangesScreen } from '@/screens/SyncChangesScreen';
import { useEventReminders } from '@/components/MosqueEvents';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAdaptiveTimezone } from '@/hooks/useAdaptiveTimezone';
import { configureAndroidBackgroundSync } from '@/native/backgroundSync';
import { startAutoSync } from '@/native/syncEngine';
import { supabase } from '@/integrations/supabase/client';
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
  const [showZakat, setShowZakat] = useState(false);
  const [showTasbeeh, setShowTasbeeh] = useState(false);

  // Enable realtime sync for locations & prayer_times
  useRealtimeSync();
  // Watch for timezone / significant GPS drift and re-schedule
  useAdaptiveTimezone();
  // Background event reminder notifications
  useEventReminders();

  // Listen for admin panel navigation event
  useEffect(() => {
    const handler = () => setShowAdminPanel(true);
    const superHandler = () => setShowSuperAdmin(true);
    const zakatHandler = () => setShowZakat(true);
    const tasbeehHandler = () => setShowTasbeeh(true);
    window.addEventListener('navigate-admin', handler);
    window.addEventListener('navigate-super-admin', superHandler);
    window.addEventListener('navigate-zakat', zakatHandler);
    window.addEventListener('navigate-tasbeeh', tasbeehHandler);
    return () => {
      window.removeEventListener('navigate-admin', handler);
      window.removeEventListener('navigate-super-admin', superHandler);
      window.removeEventListener('navigate-zakat', zakatHandler);
      window.removeEventListener('navigate-tasbeeh', tasbeehHandler);
    };
  }, []);

  // Deep-link support: /?screen=qibla|qaza|settings from manifest shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('screen');
    if (s && ['home', 'nearby', 'qibla', 'qaza', 'settings'].includes(s)) {
      setCurrentScreen(s as Screen);
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Handle hardware back button / browser back
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (showTasbeeh) {
        setShowTasbeeh(false);
      } else if (showZakat) {
        setShowZakat(false);
      } else if (showSuperAdmin) {
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
  }, [showTasbeeh, showZakat, showSuperAdmin, showAdminPanel, mosqueDetailsId, currentScreen]);

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

  // Configure Android background sync whenever the selected mosque changes.
  // WorkManager needs to know which mosque's JSON to fetch daily even when
  // the app is closed. Safe no-op on web.
  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('locations')
          .select('mosque_name')
          .eq('id', selectedLocationId)
          .single();
        if (!cancelled && data?.mosque_name) {
          await configureAndroidBackgroundSync(data.mosque_name);
        }
      } catch (e) {
        console.warn('background sync configure failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLocationId]);

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
    if (showTasbeeh) {
      return <TasbeehScreen onBack={() => setShowTasbeeh(false)} />;
    }
    if (showZakat) {
      return <ZakatScreen onBack={() => setShowZakat(false)} />;
    }

    if (showSyncChanges) {
      return <SyncChangesScreen onBack={() => setShowSyncChanges(false)} />;
    }

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
