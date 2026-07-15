import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LayoutGrid, Heart, Eye, Settings, Plus, Home } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useSaved } from '@/store/saved';
import { useSignals } from '@/store/signals';
import { useExperience } from '@/store/experience';
import { usePullRefresh } from '@/lib/use-refresh';
import { getMyListings, type MyListing } from '@/lib/listing-submit';
import { GlassBg } from '@/components/Glass';
import { AuthScreen } from '@/components/AuthScreen';
import { colors } from '@/theme/tokens';
import type { Session } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');
const CELL = Math.floor(width / 3);

type Tab = 'listings' | 'saved' | 'explored';
type Cell = { key: string; uri: string | null; onPress?: () => void };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { decisions, savedRefs, reset } = useSaved();
  const { reset: resetSignals } = useSignals();
  const { listings } = useExperience();
  const { refreshing, onRefresh } = usePullRefresh();
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>('listings');
  const [myListings, setMyListings] = useState<MyListing[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) getMyListings().then(setMyListings).catch(() => {});
    else setMyListings([]);
  }, [session]);

  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email?.split('@')[0] || 'Guest';
  const handle = session?.user.email?.split('@')[0] ?? 'you';
  const savedItems = savedRefs.map((r) => listings.find((l) => l.reference === r)).filter(Boolean) as typeof listings;
  const exploredItems = Object.keys(decisions).map((r) => listings.find((l) => l.reference === r)).filter(Boolean) as typeof listings;

  function confirmDelete() {
    Alert.alert('Delete account', 'This permanently deletes your Noel account and your saved data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
    ]);
  }
  async function deleteAccount() {
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) return Alert.alert('Delete account', error.message);
      reset(); resetSignals();
      await supabase.auth.signOut();
      Alert.alert('Account deleted', 'Your account and data have been permanently removed.');
    } catch (e) {
      Alert.alert('Delete account', (e as Error)?.message ?? 'Could not delete the account.');
    }
  }
  function openSettings() {
    Alert.alert('Account', session?.user.email ?? undefined, [
      { text: 'Sign out', onPress: () => supabase.auth.signOut() },
      { text: 'Delete account', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Logged-out: the whole tab is the sign-in flow.
  if (!session) {
    return (
      <View className="flex-1">
        <GlassBg />
        <AuthScreen />
      </View>
    );
  }

  const cells: Cell[] =
    tab === 'listings'
      ? myListings.map((l) => ({ key: l.id, uri: l.thumbUrl, onPress: () => router.push('/my-listings') }))
      : (tab === 'saved' ? savedItems : exploredItems).map((l) => ({
          key: l.reference, uri: l.cover, onPress: () => router.push(`/property/${l.reference}`),
        }));

  const TABS: { id: Tab; Icon: typeof LayoutGrid }[] = [
    { id: 'listings', Icon: LayoutGrid },
    { id: 'saved', Icon: Heart },
    { id: 'explored', Icon: Eye },
  ];

  return (
    <View className="flex-1">
      <GlassBg />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-4 pb-3">
          <Text className="text-[19px] font-bold text-ink" numberOfLines={1}>@{handle}</Text>
          <Pressable onPress={openSettings} hitSlop={8}><Settings size={22} color={colors.ink} /></Pressable>
        </View>

        {/* Identity + stats */}
        <View className="flex-row items-center gap-5 px-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-ink">
            <Text className="text-[28px] font-semibold text-white">{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1 flex-row justify-around">
            <Stat n={myListings.length} label="Listings" onPress={() => setTab('listings')} />
            <Stat n={savedItems.length} label="Saved" onPress={() => setTab('saved')} />
            <Stat n={exploredItems.length} label="Explored" onPress={() => setTab('explored')} />
          </View>
        </View>

        <View className="px-4 pt-3">
          <Text className="text-[15px] font-semibold text-ink">{name}</Text>
          <Text className="text-[13px] text-graphite">{session.user.email}</Text>
        </View>

        {/* Primary action */}
        <View className="px-4 pt-4">
          <Pressable onPress={() => router.push('/sell')} className="flex-row items-center justify-center gap-2 rounded-xl bg-ink py-3">
            <Plus size={18} color="#fff" /><Text className="text-[15px] font-semibold text-white">List a property</Text>
          </Pressable>
        </View>

        {/* Segmented tabs */}
        <View className="mt-5 flex-row border-b border-hairline">
          {TABS.map(({ id, Icon }) => {
            const active = tab === id;
            return (
              <Pressable key={id} onPress={() => setTab(id)} className="flex-1 items-center py-2.5" style={active ? { borderBottomWidth: 2, borderBottomColor: colors.ink } : undefined}>
                <Icon size={22} color={active ? colors.ink : colors.graphiteLight} fill={active && id !== 'listings' ? colors.ink : 'transparent'} strokeWidth={active ? 2.1 : 1.8} />
              </Pressable>
            );
          })}
        </View>

        {/* Grid */}
        {cells.length === 0 ? (
          <EmptyGrid tab={tab} />
        ) : (
          <View className="flex-row flex-wrap">
            {cells.map((c) => (
              <Pressable key={c.key} onPress={c.onPress} style={{ width: CELL, height: CELL, padding: 1 }}>
                {c.uri ? (
                  <Image source={{ uri: c.uri }} style={{ flex: 1 }} contentFit="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center bg-mist"><Home size={22} color={colors.graphiteLight} /></View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ n, label, onPress }: { n: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center">
      <Text className="text-[19px] font-bold text-ink">{n}</Text>
      <Text className="text-[12.5px] text-graphite">{label}</Text>
    </Pressable>
  );
}

function EmptyGrid({ tab }: { tab: Tab }) {
  const copy = tab === 'listings'
    ? { title: 'No listings yet', sub: 'List your home — it only takes a minute.', cta: 'List a property', onPress: () => router.push('/sell') }
    : tab === 'saved'
      ? { title: 'No saved homes yet', sub: 'Tap the heart on a home you love and it’ll appear here.', cta: 'Start exploring', onPress: () => router.push('/') }
      : { title: 'Nothing explored yet', sub: 'Swipe through the feed and your history shows up here.', cta: 'Open the feed', onPress: () => router.push('/') };
  return (
    <View className="mt-16 items-center gap-3 px-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/10"><Home size={26} color={colors.accent} /></View>
      <Text className="text-center text-[16px] font-semibold text-ink">{copy.title}</Text>
      <Text className="max-w-[260px] text-center text-[13.5px] text-graphite">{copy.sub}</Text>
      <Pressable onPress={copy.onPress} className="mt-1 rounded-full bg-ink px-6 py-3"><Text className="text-[15px] font-semibold text-white">{copy.cta}</Text></Pressable>
    </View>
  );
}
