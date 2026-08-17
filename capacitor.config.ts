import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kpick.ios',
  appName: 'Krookie',
  webDir: 'out',
  server: {
    url: 'https://kpick.app',
    cleartext: false
  }
};

export default config;
