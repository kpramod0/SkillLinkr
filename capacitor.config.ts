import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skilllinkr.app',
  appName: 'SkillLinkr',
  webDir: 'out',

  server: {
    // Determine the URL based on environment
    // For Production Build:
    url: 'https://skilllinkr.com',
    cleartext: true,
  }
};

export default config;
