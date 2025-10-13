import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.adhan_zen_95',
  appName: 'Adhan Zen',
  webDir: 'dist',
  bundledWebRuntime: false,
  // Remove server config for production APK build
  // For development with hot-reload, uncomment the server section below
  /*
  server: {
    url: 'https://86147f9e-50fb-489a-a685-0e1bedcaa3b4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  */
  android: {
    allowMixedContent: true,
    backgroundColor: '#FFFFFF',
  },
};

export default config;
