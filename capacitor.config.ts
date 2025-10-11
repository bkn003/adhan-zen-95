import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.86147f9e50fb489aa6850e1bedcaa3b4',
  appName: 'adhan-zen-95',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://86147f9e-50fb-489a-a685-0e1bedcaa3b4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#FFFFFF',
  },
};

export default config;
