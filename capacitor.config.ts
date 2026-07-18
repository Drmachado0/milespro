import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // D-T01 — bundle ID locked to reverse-DNS of milespro.net.br
  appId: 'br.com.milespro.app',
  // D-T02 — display name (1 word, 8 chars, no truncation)
  appName: 'MilesPro',
  webDir: 'dist',
  // server.url REMOVED — Path C requires bundled assets, not remote URL.
  // For local dev, run `npm run dev` separately and use Safari/Chrome web preview,
  // NOT Capacitor live-reload (which requires server.url + cleartext = unsafe for prod).
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 2000,
      backgroundColor: '#171717',
      // D-T04 — dark variant for iOS 18 / Android dark mode
      backgroundColorDark: '#0a0a0a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#171717',
    },
    // D-T05 — Push notifications presentation when app is foregrounded
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
  android: {
    // Was true for Lovable dev — now false because production assets are bundled
    // and Apple/Google review flag cleartext.
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
