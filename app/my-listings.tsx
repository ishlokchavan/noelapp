import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Images as ImageIcon, FileText, Home } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getMyListings, type MyListing, type SubmissionStatus } from '@/lib/listing-submit';
import { GlassBg } from '@/components/Glass';
import { formatAed } from '@/data/experience-data';
import { colors } from '@/theme/tokens';

const STATUS: Record<SubmissionStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pending review', bg: 'rgba(245,158,11,0.14)', fg: '#b45309' },
  in_review: { label: 'In review', bg: 'rgba(0,113,227,0.12)', fg: '#0071e3' },
  approved: { label: 'Live', bg: 'rgba(16,185,129,0.14)', fg: '#059669' },
  rejected: { label: 'Not approved', bg: 'rgba(244,63,94,0.12)', fg: '#e11d48' },
};

export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSignedIn(Boolean(data.session));
    if (data.session) setItems(await getMyListings());
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  return (
    <View className="flex-1">
      <GlassBg />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between px-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-black/5"><ChevronLeft size={22} color={colors.ink} /></Pressable>
          <Text className="text-[17px] font-semibold text-ink">My listings</Text>
          <Pressable onPress={() => router.push('/sell')} className="h-10 w-10 items-center justify-center rounded-full bg-black/5"><Plus size={20} color={colors.ink} /></Pressable>
        </View>

        {loading ? (
          <ActivityIndicator className="mt-20" color={colors.accent} />
        ) : signedIn === false ? (
          <Empty title="Sign in to see your listings" cta="Go to sign in" onPress={() => { router.back(); router.push('/(tabs)/profile'); }} />
        ) : items.length === 0 ? (
          <Empty title="You haven’t listed a property yet" sub="List your home — it only takes a minute." cta="List a property" onPress={() => router.push('/sell')} />
        ) : (
          <View className="gap-3 px-4 pt-4">
            {items.map((l) => {
              const s = STATUS[l.status];
              return (
                <View key={l.id} className="flex-row gap-3 rounded-apple border border-white/60 bg-white/75 p-3">
                  {l.thumbUrl ? (
                    <Image source={{ uri: l.thumbUrl }} style={{ width: 92, height: 92, borderRadius: 14 }} contentFit="cover" />
                  ) : (
                    <View className="h-[92px] w-[92px] items-center justify-center rounded-[14px] bg-mist"><Home size={26} color={colors.graphiteLight} /></View>
                  )}
                  <View className="flex-1 py-0.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>{formatAed(l.priceAed)}</Text>
                      <View style={{ backgroundColor: s.bg }} className="rounded-full px-2.5 py-1">
                        <Text style={{ color: s.fg }} className="text-[11px] font-semibold">{s.label}</Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-[14px] font-medium text-ink" numberOfLines={1}>{l.title}</Text>
                    <Text className="text-[12.5px] text-graphite" numberOfLines={1}>{l.community}, {l.city}</Text>
                    <View className="mt-2 flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1"><ImageIcon size={13} color={colors.graphiteLight} /><Text className="text-[12px] text-graphite">{l.photoCount}</Text></View>
                      <View className="flex-row items-center gap-1"><FileText size={13} color={colors.graphiteLight} /><Text className="text-[12px] text-graphite">{l.docCount}</Text></View>
                      <Text className="ml-auto text-[11.5px] text-graphiteLight">{new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <Text className="px-1 pt-2 text-center text-[11.5px] text-graphiteLight">Our team verifies your details and documents before a listing goes live.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Empty({ title, sub, cta, onPress }: { title: string; sub?: string; cta: string; onPress: () => void }) {
  return (
    <View className="mt-20 items-center gap-4 px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/10"><Home size={28} color={colors.accent} /></View>
      <Text className="text-center text-[17px] font-semibold text-ink">{title}</Text>
      {sub ? <Text className="max-w-[260px] text-center text-sm text-graphite">{sub}</Text> : null}
      <Pressable onPress={onPress} className="mt-1 rounded-full bg-ink px-6 py-3"><Text className="text-[15px] font-semibold text-white">{cta}</Text></Pressable>
    </View>
  );
}
