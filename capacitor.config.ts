import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skilllinkr.app',
  appName: 'SkillLinkr',
  webDir: 'out',

  server: {
    // Hotspot IP (Most reliable if you are sharing internet to phone)
    url: 'http://192.168.137.1:3000',
    cleartext: true,
  }
  // server: {
  //   // For local development on Android Emulator (10.0.2.2 = host localhost)
  //   url: 'http://10.0.2.2:3000',
  //   cleartext: true,

  //   // For Production (Uncomment and replace when deployed)
  //   // url: 'https://your-domain.com',
  // }
};

export default config;
