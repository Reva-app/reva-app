import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.reva.mobile",
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
