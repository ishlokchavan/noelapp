import { useMemo } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, BadgeCheck, Building2, MapPin } from 'lucide-react-native';
import { useExperience } from '@/store/experience';
import { usePullRefresh } from '@/lib/use-refresh';
import { GlassBg } from '@/components/Glass';
import { slugifyDeveloper } from '@/lib/slug';
import { formatAed } from '@/data/experience-data';
import { colors } from '@/theme/tokens';
import type { ExperienceListing } from '@/types/listing';

/** Developer profile — all of a developer's projects (mirrors the web). */
export default function DeveloperScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { listings } = useExperience();
  const { refreshing, onRefresh } = usePullRefresh();

  const devListings = useMemo(
    () => listings.filter((l) => l.developerName && slugifyDeveloper(l.developerName) === slug),
    [listings, slug],
  );

  const name = devListings[0]?.developerName ?? 'Developer';
  const logo = devListings.find((l) => l.developerLogo)?.developerLogo ?? null;
  const communities = Array.from(new Set(devListings.map((l) => l.community).filter(Boolean)));
  const offPlan = devListings.filter((l) => l.completion === 'off_plan').length;
  const priceFrom = devListings.length ? Math.min(...devListings.map((l) => l.priceAed)) : 0;

  return (
    <View className="flex-1">
      <GlassBg />
      <FlatList
        data={devListings}
        keyExtractor={(l) => l.reference}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View className="mb-1 px-4 pb-5" style={{ paddingTop: insets.top + 8 }}>
            <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-mist"><ChevronLeft size={24} color={colors.ink} /></Pressable>
            <View className="mt-4 flex-row items-center gap-4">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-mist" style={{ borderWidth: 1, borderColor: colors.hairline }}>
                {logo ? <Image source={{ uri: logo }} style={{ height: 56, width: 56 }} contentFit="contain" /> : <Building2 size={32} color={colors.graphite} />}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[22px] font-semibold text-ink" numberOfLines={1}>{name}</Text>
                  <BadgeCheck size={20} color={colors.journey.listing} />
                </View>
                <Text className="text-[13.5px] text-graphite">Developer · Dubai, UAE</Text>
              </View>
            </View>
            <View className="mt-4 flex-row rounded-2xl bg-mist py-3">
              <Stat value={String(devListings.length)} label="Projects" />
              <Divider />
              <Stat value={String(communities.length)} label="Communities" />
              <Divider />
              <Stat value={priceFrom ? formatAed(priceFrom) : '—'} label="From" />
            </View>
            <Text className="mt-4 px-1 text-[13px] font-semibold uppercase tracking-wide text-graphite">
              {offPlan > 0 ? `${offPlan} active launches` : 'Projects'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProjectCard l={item} />}
        ListEmptyComponent={<Text className="mt-16 text-center text-graphite">No projects found.</Text>}
      />
    </View>
  );
}

function ProjectCard({ l }: { l: ExperienceListing }) {
  return (
    <Pressable onPress={() => router.push(`/property/${l.reference}`)} className="flex-1 overflow-hidden rounded-2xl border border-white/60 bg-white/70">
      <Image source={{ uri: l.cover }} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
      <View className="p-2.5">
        <Text className="text-[15px] font-semibold text-ink">{formatAed(l.priceAed)}</Text>
        <View className="mt-1.5 flex-row items-center gap-1"><MapPin size={11} color={colors.graphite} /><Text className="text-xs text-graphite" numberOfLines={1}>{l.community}</Text></View>
      </View>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center px-1">
      <Text className="text-base font-semibold text-ink">{value}</Text>
      <Text className="text-[11.5px] text-graphite">{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1 }} className="bg-hairline" />;
}
