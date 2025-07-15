// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pmdstudy.app',
  appName: 'SmartStudy Village',
  webDir: 'out',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
