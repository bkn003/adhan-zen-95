
import React, { useState } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { HomeScreen } from '@/screens/HomeScreen';
import { NearbyScreen } from '@/screens/NearbyScreen';
import { QiblaScreen } from '@/screens/QiblaScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import type { Screen } from '@/types/navigation.types';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const handleNavigateToHome = () => {
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
