import { Tabs } from 'expo-router';
import { GlassTabBar } from '@/components/GlassTabBar';

/**
 * Tab bar layout: Home · Map · ➕ (Add listing) · Search · Profile.
 * The ➕ is a center action rendered by GlassTabBar (opens the /sell modal), not
 * a tab route. Trending and Shares/Invest exist as routes but are hidden from the
 * bar (href: null) — Invest is parked for now.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#ffffff' } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="trending" options={{ href: null }} />
      <Tabs.Screen name="shares" options={{ href: null }} />
    </Tabs>
  );
}
