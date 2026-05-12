import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.kverse.cover',
  appName: 'Kverse',
  webDir: 'out',
  server: {
    // 프로덕션 Vercel URL로 교체하세요 (예: https://kverse.vercel.app)
    url: 'https://YOUR_VERCEL_URL.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
}

export default config
