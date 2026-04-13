import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "nl.revaapp.app",
  appName: "REVA",
  webDir: "out",
  server: {
    // Gebruik altijd HTTPS voor cookies en Supabase auth
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
