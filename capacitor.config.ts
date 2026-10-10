import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beev.courier',
  appName: 'BEEV',
  webDir: 'out',
  server: {
    url: 'https://smart-dispatch-gzj7.onrender.com',
    cleartext: true
  }

};

export default config;
