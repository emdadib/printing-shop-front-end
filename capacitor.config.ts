import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sbprinters.staff',
  appName: 'SB Printers',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  }
};

export default config;
