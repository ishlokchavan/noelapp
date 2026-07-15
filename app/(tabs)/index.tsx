import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, Pressable, RefreshControl, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useExperience } from '@/store/experience';
import { useSignals } from '@/store/signals';
import { PropertyFeedCard } from '@/components/PropertyFeedCard';
import { Loading } from '@/components/Loading';
import { usePullRefresh } from '@/lib/use-refresh';
import { colors } from '@/theme/tokens';
import type { ExperienceListing } from '@/types/listing';

const { height } = Dimensions.get('window');
const QUICK_SKIP_MS = 2500;
/** Soft shadow so white overlay text stays legible over any photo. */
const TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } as const;
const END = { __end: true } as const;
type Row = ExperienceListing | typeof END;

/** Home — instant, recommender-ranked discovery feed with first-run onboarding. */
export default function FeedScreen() {
  const { listings, loading } = useExperience();
  const { rank, track, seedVersion } = useSignals();
  const { refreshing, onRefresh } = usePullRefresh();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const listRef = useRef<FlatList<Row>>(null);

  const [ranked, setRanked] = useState<ExperienceListing[]>([]);
  const [activeRefStr, setActiveRefStr] = useState<string | null>(null);
  const dwellRef = useRef<{ listing: ExperienceListing; since: number } | null>(null);

  useEffect(() => {
    if (listings.length) setRanked(rank(listings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, seedVersion]);

  // Long look = positive signal; quick flick = a skip (rejection engine).
  const flushDwell = useCallback((nextRef: string | null) => {
    const prev = dwellRef.current;
    if (prev && prev.listing.reference !== nextRef) {
      const ms = Date.now() - prev.since;
      if (ms < QUICK_SKIP_MS) track('skip', prev.listing);
      else track('dwell', prev.listing, ms);
    }
  }, [track]);
  const flushRef = useRef(flushDwell);
  useEffect(() => { flushRef.current = flushDwell; }, [flushDwell]);
  useEffect(() => () => flushRef.current(null), []);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.item as Row | undefined;
    if (!first || '__end' in first) return;
    flushRef.current(first.reference);
    dwellRef.current = { listing: first, since: Date.now() };
    setActiveRefStr(first.reference);
  }).current;

  const goNext = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, []);

  const restart = useCallback(() => {
    setRanked(rank(listings));
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  const [tab, setTab] = useState<'ready' | 'off_plan'>('ready');
  const feed = useMemo(
    () => ranked.filter((l) => (tab === 'ready' ? l.completion === 'ready' : l.completion === 'off_plan')),
    [ranked, tab],
  );
  const data: Row[] = useMemo(() => [...feed, END], [feed]);

  const switchTab = useCallback((t: 'ready' | 'off_plan') => {
    setTab(t);
    Haptics.selectionAsync();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  if (!listings.length && loading) return <Loading />;

  return (
    <View className="flex-1 bg-ink">
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, i) => ('__end' in item ? 'end' : item.reference) + i}
        renderItem={({ item, index }) =>
          '__end' in item ? (
            <EndCap onReview={() => router.push('/saved')} onRestart={restart} tabBarSpace={insets.bottom + 96} />
          ) : (
            <PropertyFeedCard
              listing={item}
              active={item.reference === activeRefStr && focused}
              tabBarSpace={insets.bottom + 96}
              topInset={insets.top}
              onPass={() => goNext(index)}
            />
          )
        }
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
      />

      {/* Top scrim — keeps the brand + control legible over any photo */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 76 }} />

      {/* Brand — secondary; recedes behind the feed control */}
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 13, left: 20 }}>
        <Text style={TEXT_SHADOW} className="text-[15px] font-semibold tracking-tight text-white/80">Noel</Text>
      </View>

      {/* Center control — Ready / Off-plan (primary; active gets an underline) */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0 }} className="flex-row items-start justify-center gap-7">
        {(['ready', 'off_plan'] as const).map((t) => {
          const active = tab === t;
          return (
            <Pressable key={t} onPress={() => switchTab(t)} hitSlop={12} className="items-center">
              <Text style={TEXT_SHADOW} className={`text-[16px] ${active ? 'font-bold text-white' : 'font-semibold text-white/55'}`}>
                {t === 'ready' ? 'Ready' : 'Off-plan'}
              </Text>
              <View style={{ height: 2.5, width: 22, borderRadius: 2, marginTop: 5, backgroundColor: active ? '#ffffff' : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>

      {/* Swipe-up hint on the first card */}
      {feed[0] && activeRefStr === feed[0].reference ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 110 }} className="items-center">
          <View className="rounded-full bg-black/40 px-3.5 py-1.5"><Text className="text-xs font-medium text-white">Swipe up for the next home</Text></View>
        </View>
      ) : null}
    </View>
  );
}

function EndCap({ onReview, onRestart, tabBarSpace }: { onReview: () => void; onRestart: () => void; tabBarSpace: number }) {
  return (
    <View style={{ height, paddingBottom: tabBarSpace }} className="items-center justify-center gap-3 bg-paper px-8">
      <Text className="text-[22px] font-semibold text-ink">That's everything for now</Text>
      <Text className="max-w-xs text-center text-sm text-graphite">Your feed reorders as you save, skip and explore. Come back for fresh matches.</Text>
      <Pressable onPress={onReview} className="mt-2 rounded-full bg-ink px-6 py-3"><Text className="text-[15px] font-medium text-white">Review saved</Text></Pressable>
      <Pressable onPress={onRestart}><Text className="text-sm font-medium" style={{ color: colors.accent }}>Start over</Text></Pressable>
    </View>
  );
}
