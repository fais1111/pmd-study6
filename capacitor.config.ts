// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pmdstudy.app',
  appName: 'SmartStudy Village',
  webDir: 'out', // Point this to the Next.js export directory
  bundledWebRuntime: false,
};

export default config;
