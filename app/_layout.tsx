import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ExperienceProvider } from '@/store/experience';
import { SavedProvider } from '@/store/saved';
import { SignalStoreProvider } from '@/store/signals';
import { SharesProvider } from '@/store/shares';
import { GlossaryProvider } from '@/components/Term';
import { FEATURES } from '@/lib/features';
import { IntroStory } from '@/components/IntroStory';
import { TastePicker } from '@/components/TastePicker';

/** Mount the Shares store + glossary only when the module is enabled. */
function WithShares({ children }: { children: React.ReactNode }) {
  return FEATURES.shares
    ? <SharesProvider><GlossaryProvider>{children}</GlossaryProvider></SharesProvider>
    : <>{children}</>;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ExperienceProvider>
          <SavedProvider>
            <SignalStoreProvider>
              <WithShares>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="property/[reference]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="gallery/[reference]" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="developer/[slug]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="launches" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="sell" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="my-listings" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="saved" options={{ presentation: 'modal' }} />
                  {/* noelapp Shares (tokenized real estate) */}
                  <Stack.Screen name="shares/[symbol]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="shares/market" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="shares/portfolio" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="shares/ledger" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                  <Stack.Screen name="shares/invest" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="shares/kyc" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="shares/wallet" options={{ presentation: 'modal' }} />
                </Stack>
                {/* First-run onboarding — cover the whole app incl. the tab bar */}
                <TastePicker />
                <IntroStory />
              </WithShares>
            </SignalStoreProvider>
          </SavedProvider>
        </ExperienceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
