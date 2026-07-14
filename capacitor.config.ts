import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.reva.mobile",
  appName: "REVA",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      // Toont het REVA app-icoon in de notificatie op Android
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
