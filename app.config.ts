import type { ExpoConfig } from 'expo/config';

/**
 * Noel — native app config.
 * Bundle id com.noelapp.ios (reverse-DNS of noelapp.com). Custom scheme `noelapp`
 * powers OAuth deep links (noelapp://auth-callback).
 * Brand-new App Store app — distinct from the legacy iClose app (ae.iclose.app),
 * which stays live. Backend (iclose-academy-db Supabase + iclose.ae API) is shared.
 */
const config: ExpoConfig = {
  name: 'Noel',
  slug: 'noelapp',
  owner: 'shlokchavan.personal',
  scheme: 'noelapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.noelapp.ios',
    usesAppleSignIn: true,
    // Declared explicitly so EAS's capability sync registers Sign In with Apple
    // on the App ID + provisioning profile (usesAppleSignIn alone wasn't detected).
    entitlements: {
      'com.apple.developer.applesignin': ['Default'],
    },
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Noel uses your location to show nearby homes on the map.',
    },
  },
  android: {
    package: 'ae.iclose.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '' },
    },
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  web: { bundler: 'metro', output: 'static', favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-video',
    ['expo-image-picker', { photosPermission: 'Noel needs access to your photos so you can add them to your property listing.' }],
    ['expo-splash-screen', { backgroundColor: '#ffffff', image: './assets/splash.png', resizeMode: 'contain' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://iclose.ae',
    // Live Noel database (iclose-academy-db). The anon key is a publishable,
    // RLS-protected client key — safe to ship, same as the web app.
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://nnkicmfsdbfpucfcnutn.supabase.co',
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua2ljbWZzZGJmcHVjZmNudXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODkyMDcsImV4cCI6MjA5NDI2NTIwN30.liASHVfCZQsB4OFwhY6uBYuv99IWXaMBbGGgbuFiKTs',
    // EAS project for the new Noel app (@shlokchavan.personal/noelapp).
    eas: { projectId: '681d6f23-d39d-4407-b850-d7fafe484335' },
    // Feature flags. `shares` gates the tokenized real-estate module (6th tab +
    // /shares routes). Off => the module is fully hidden; the build under App
    // Store review ships with it off and is never affected.
    features: {
      shares: process.env.EXPO_PUBLIC_FEATURE_SHARES !== 'false',
    },
  },
};

export default config;
