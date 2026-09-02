
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
import { TransparencyScreen } from '@/screens/TransparencyScreen';
import { QuranScreen } from '@/screens/QuranScreen';
import { MosqueCompareScreen } from '@/screens/MosqueCompareScreen';
import { NotificationSettingsScreen } from '@/screens/NotificationSettingsScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { FeedScreen } from '@/screens/FeedScreen';
import { SupportScreen } from '@/screens/SupportScreen';
import { RamadanScheduleScreen } from '@/screens/RamadanScheduleScreen';
import { MosqueMapScreen } from '@/screens/MosqueMapScreen';
import { useEventReminders } from '@/components/MosqueEvents';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAdaptiveTimezone } from '@/hooks/useAdaptiveTimezone';
import { configureAndroidBackgroundSync } from '@/native/backgroundSync';
import { startAutoSync } from '@/native/syncEngine';
import { initPushNotifications } from '@/native/pushRegistration';
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
  const [showSyncChanges, setShowSyncChanges] = useState(false);
  const [showQuran, setShowQuran] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTransparency, setShowTransparency] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showRamadanSchedule, setShowRamadanSchedule] = useState(false);
  const [showMap, setShowMap] = useState(false);


  // Enable realtime sync for locations & prayer_times
  useRealtimeSync();
  // Watch for timezone / significant GPS drift and re-schedule
  useAdaptiveTimezone();
  // Background event reminder notifications
  useEventReminders();
  // Register/refresh the FCM device token for mosque announcements
  useEffect(() => {
    initPushNotifications();
  }, []);

  // PWA/browser web push: register the FCM web token so prayer-time change
  // alerts and adhan reminders arrive while the app is closed. No-ops on
  // native, unsupported browsers, or until Firebase config is provided.
  useEffect(() => {
    let cancelled = false;
    const register = async () => {
      const { initWebPush, syncWebPushPrefs } = await import('@/native/webPush');
      if (cancelled) return;
      const result = await initWebPush();
      if (result === 'ok') await syncWebPushPrefs();
    };
    void register();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void register();
      if (event === 'SIGNED_OUT') {
        void import('@/native/webPush').then(({ cleanupWebPush }) => cleanupWebPush());
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Keep the backend's copy of reminder prefs / mosque selection fresh —
  // on mosque change and whenever the user edits lead times or quiet hours.
  useEffect(() => {
    const sync = () => {
      if (!selectedLocationId) return;
      void import('@/native/webPush').then(({ syncWebPushPrefs }) => syncWebPushPrefs());
    };
    sync();
    window.addEventListener('prayer-notification-prefs-changed', sync);
    window.addEventListener('quiet-hours-changed', sync);
    return () => {
      window.removeEventListener('prayer-notification-prefs-changed', sync);
      window.removeEventListener('quiet-hours-changed', sync);
    };
  }, [selectedLocationId]);

  // Listen for admin panel navigation event
  useEffect(() => {
    const handler = () => setShowAdminPanel(true);
    const superHandler = () => setShowSuperAdmin(true);
    const zakatHandler = () => setShowZakat(true);
    const tasbeehHandler = () => setShowTasbeeh(true);
    const syncHandler = () => setShowSyncChanges(true);
    const quranHandler = () => setShowQuran(true);
    const compareHandler = () => setShowCompare(true);
    const notifHandler = () => setShowNotifSettings(true);
    const privacyHandler = () => setShowPrivacy(true);
    const transparencyHandler = () => setShowTransparency(true);
    const feedHandler = () => setShowFeed(true);
    const supportHandler = () => setShowSupport(true);
    const ramadanScheduleHandler = () => setShowRamadanSchedule(true);
    const mapHandler = () => setShowMap(true);
    window.addEventListener('navigate-admin', handler);
    window.addEventListener('navigate-super-admin', superHandler);
    window.addEventListener('navigate-zakat', zakatHandler);
    window.addEventListener('navigate-tasbeeh', tasbeehHandler);
    window.addEventListener('navigate-sync-changes', syncHandler);
    window.addEventListener('navigate-quran', quranHandler);
    window.addEventListener('navigate-compare', compareHandler);
    window.addEventListener('navigate-notifications', notifHandler);
    window.addEventListener('navigate-privacy', privacyHandler);
    window.addEventListener('navigate-transparency', transparencyHandler);
    window.addEventListener('navigate-feed', feedHandler);
    window.addEventListener('navigate-support', supportHandler);
    window.addEventListener('navigate-ramadan-schedule', ramadanScheduleHandler);
    window.addEventListener('navigate-map', mapHandler);
    return () => {
      window.removeEventListener('navigate-admin', handler);
      window.removeEventListener('navigate-super-admin', superHandler);
      window.removeEventListener('navigate-zakat', zakatHandler);
      window.removeEventListener('navigate-tasbeeh', tasbeehHandler);
      window.removeEventListener('navigate-sync-changes', syncHandler);
      window.removeEventListener('navigate-quran', quranHandler);
      window.removeEventListener('navigate-compare', compareHandler);
      window.removeEventListener('navigate-notifications', notifHandler);
      window.removeEventListener('navigate-privacy', privacyHandler);
      window.removeEventListener('navigate-transparency', transparencyHandler);
      window.removeEventListener('navigate-feed', feedHandler);
      window.removeEventListener('navigate-support', supportHandler);
      window.removeEventListener('navigate-ramadan-schedule', ramadanScheduleHandler);
      window.removeEventListener('navigate-map', mapHandler);
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
      if (showSupport) {
        setShowSupport(false);
      } else if (showRamadanSchedule) {
        setShowRamadanSchedule(false);
      } else if (showMap) {
        setShowMap(false);
      } else if (showFeed) {
        setShowFeed(false);
      } else if (showTransparency) {
        setShowTransparency(false);
      } else if (showPrivacy) {
        setShowPrivacy(false);
      } else if (showNotifSettings) {
        setShowNotifSettings(false);
      } else if (showCompare) {
        setShowCompare(false);
      } else if (showQuran) {
        setShowQuran(false);
      } else if (showSyncChanges) {
        setShowSyncChanges(false);
      } else if (showTasbeeh) {
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
  }, [showSupport, showRamadanSchedule, showMap, showFeed, showTransparency, showPrivacy, showNotifSettings, showCompare, showQuran, showSyncChanges, showTasbeeh, showZakat, showSuperAdmin, showAdminPanel, mosqueDetailsId, currentScreen]);

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
    let stopAutoSync: (() => void) | undefined;
    (async () => {
      try {
        const { data } = await supabase
          .from('locations')
          .select('mosque_name')
          .eq('id', selectedLocationId)
          .single();
        if (!cancelled && data?.mosque_name) {
          await configureAndroidBackgroundSync(data.mosque_name);
          // Cross-platform (web + iOS) sync loop: fetch, diff, pre-schedule alerts
          stopAutoSync = startAutoSync(data.mosque_name, selectedLocationId);
        }
      } catch (e) {
        console.warn('background sync configure failed', e);
      }
    })();
    return () => { cancelled = true; stopAutoSync?.(); };
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
    if (showFeed) {
      return <FeedScreen onBack={() => setShowFeed(false)} />;
    }
    if (showQuran) {
      return <QuranScreen onBack={() => setShowQuran(false)} />;
    }
    if (showCompare) {
      return <MosqueCompareScreen onBack={() => setShowCompare(false)} />;
    }

    if (showNotifSettings) {
      return <NotificationSettingsScreen onBack={() => setShowNotifSettings(false)} />;
    }

    if (showTransparency) {
      return <TransparencyScreen onBack={() => setShowTransparency(false)} />;
    }
    if (showPrivacy) {
      return <PrivacyScreen onBack={() => setShowPrivacy(false)} />;
    }
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
