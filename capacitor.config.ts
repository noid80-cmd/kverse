import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kpick.ios',
  appName: 'Krookie',
  webDir: 'out',
  server: {
    url: 'https://kpick.app',
    cleartext: false
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          // FirebaseMessaging을 SPM으로 링크할 때 패키지 식별자가 충돌한다.
          // 플러그인 문서가 지정한 우회책(capawesome-team/capacitor-firebase#959).
          '@capacitor-firebase/messaging': {
            symlink: true
          }
        }
      }
    }
  }
};

export default config;
