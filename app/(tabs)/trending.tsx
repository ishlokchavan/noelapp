import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, CalendarClock, Wallet, ArrowUpRight } from 'lucide-react-native';
import { useExperience } from '@/store/experience';
import { usePullRefresh } from '@/lib/use-refresh';
import { GlassBg } from '@/components/Glass';
import { formatAed } from '@/data/experience-data';
import { colors } from '@/theme/tokens';

/** Trending — latest off-plan launches, with a stories rail (mirrors the web). */
export default function TrendingScreen() {
  const { launches } = useExperience();
  const { refreshing, onRefresh } = usePullRefresh();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <GlassBg />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12 }} className="px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Flame size={22} color={colors.journey.offplan} />
          <Text className="text-[26px] font-semibold text-ink">Trending</Text>
        </View>
        <Text className="mt-1 text-sm text-graphite">Latest off-plan launches in the market</Text>
      </View>

      {/* Stories rail */}
      {launches.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
          {launches.map((l) => (
            <Pressable key={l.reference} onPress={() => router.push(`/launches?start=${l.reference}`)} className="w-[72px] items-center gap-1.5">
              <LinearGradient colors={[colors.accent, colors.journey.offplan]} style={{ borderRadius: 999, padding: 2.5 }}>
                <View style={{ borderRadius: 999, padding: 2.5, backgroundColor: '#fff' }}>
                  <Image source={{ uri: l.cover }} style={{ height: 60, width: 60, borderRadius: 999 }} contentFit="cover" />
                </View>
              </LinearGradient>
              <Text className="text-[11px] text-graphite" numberOfLines={1}>{l.developerName ?? l.community}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Project cards */}
      <View className="gap-3 px-4 pt-4">
        {launches.map((l) => (
          <Pressable key={l.reference} onPress={() => router.push(`/property/${l.reference}`)} className="overflow-hidden rounded-apple border border-white/60 bg-white/70"
            style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
            <View className="relative">
              <Image source={{ uri: l.cover }} style={{ width: '100%', aspectRatio: 1.6 }} contentFit="cover" />
              <View className="absolute left-3 top-3 flex-row items-center gap-1 rounded-full bg-black/45 px-2.5 py-1">
                <Flame size={13} color={colors.journey.offplan} /><Text className="text-[11.5px] font-medium text-white">Trending</Text>
              </View>
            </View>
            <View className="p-4">
              <Text className="text-lg font-semibold text-ink">from {formatAed(l.priceAed)}</Text>
              <Text className="mt-1 text-[15px] font-medium text-ink">{l.title}</Text>
              <Text className="text-[13px] text-graphite">{l.community}, {l.city}</Text>
              <View className="mt-3 flex-row flex-wrap items-center gap-3 border-t border-hairline/60 pt-3">
                {l.paymentPlan ? <View className="flex-row items-center gap-1.5"><Wallet size={15} color={colors.journey.offplan} /><Text className="text-[12.5px] text-graphite">{l.paymentPlan} plan</Text></View> : null}
                {l.handoverBy ? <View className="flex-row items-center gap-1.5"><CalendarClock size={15} color={colors.journey.offplan} /><Text className="text-[12.5px] text-graphite">{l.handoverBy}</Text></View> : null}
                <View className="ml-auto flex-row items-center gap-0.5"><Text className="text-[12.5px] font-medium text-accent">View</Text><ArrowUpRight size={13} color={colors.accent} /></View>
              </View>
            </View>
          </Pressable>
        ))}
        {!launches.length ? <Text className="py-16 text-center text-sm text-graphite">No trending launches right now — check back soon.</Text> : null}
      </View>
      </ScrollView>
    </View>
  );
}
