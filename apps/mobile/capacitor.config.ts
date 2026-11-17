import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.mirusync.app',
  appName: 'MiruSync',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
