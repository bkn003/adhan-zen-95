import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RamadanProvider } from "@/contexts/RamadanContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MandatoryPermissionsScreen } from "./components/MandatoryPermissionsScreen";
import { Capacitor } from '@capacitor/core';

const queryClient = new QueryClient();

const AppContent = () => {
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip permissions check on non-native platforms (web)
    if (!Capacitor.isNativePlatform()) {
      setPermissionsGranted(true);
      return;
    }

    // Check if all permissions were previously granted
    const alreadyGranted = localStorage.getItem('all_permissions_granted') === 'true';
    setPermissionsGranted(alreadyGranted);
  }, []);

  const handlePermissionsGranted = () => {
    setPermissionsGranted(true);
  };

  // Loading state
  if (permissionsGranted === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show permissions screen if not all permissions are granted
  if (!permissionsGranted) {
    return <MandatoryPermissionsScreen onAllPermissionsGranted={handlePermissionsGranted} />;
  }

  // Main app content
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RamadanProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </RamadanProvider>
  </QueryClientProvider>
);

export default App;
