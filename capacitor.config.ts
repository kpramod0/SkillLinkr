import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skilllinkr.app',
  appName: 'SkillLinkr',
  webDir: 'out',

  server: {
    // Remote URL: App loads the production website in a hardened WebView.
    // This guarantees 100% feature parity with skilllinkr.com.
    url: 'https://www.skilllinkr.com',
    // cleartext intentionally removed — HTTPS only (security requirement)
    allowNavigation: [
      'skilllinkr.com',
      '*.skilllinkr.com',
      '*.supabase.co',
    ],
  },

  android: {
    // Hardware acceleration for smooth WebView rendering
    allowMixedContent: false,
    // Append platform identifier to User-Agent for analytics
    appendUserAgent: 'SkillLinkr-Android/1.0',
    // Preserve cookies/sessions across app restarts
    webContentsDebuggingEnabled: false,

  },

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Prevent Capacitor from logging sensitive data in production
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
