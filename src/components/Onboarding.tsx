import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronUp, Images, Sparkles, Check,
  Building2, Home, Building, Crown, Briefcase, Store, Trees, MoreHorizontal,
} from 'lucide-react-native';
import { useSignals } from '@/store/signals';
import { colors } from '@/theme/tokens';

const ONB_KEY = 'iclose.glass.onboarding.v2';
const { height, width } = Dimensions.get('window');
const PAGES = ['hero', 'permissions', 'taste'] as const;

/** Property-type pills. `facet` maps to the recommender's `type:<propertyType>` key
 * (null = a soft "Other" choice that isn't seeded). */
const GROUPS: { group: string; items: { id: string; label: string; facet: string | null; Icon: typeof Home }[] }[] = [
  {
    group: 'Residential',
    items: [
      { id: 'apartment', label: 'Apartment', facet: 'apartment', Icon: Building2 },
      { id: 'villa', label: 'Villa', facet: 'villa', Icon: Home },
      { id: 'townhouse', label: 'Townhouse', facet: 'townhouse', Icon: Building },
      { id: 'penthouse', label: 'Penthouse', facet: 'penthouse', Icon: Crown },
      { id: 'res_other', label: 'Other', facet: null, Icon: MoreHorizontal },
    ],
  },
  {
    group: 'Commercial',
    items: [
      { id: 'office', label: 'Offices', facet: 'office', Icon: Briefcase },
      { id: 'retail', label: 'Retail', facet: 'retail', Icon: Store },
      { id: 'plot', label: 'Land', facet: 'plot', Icon: Trees },
      { id: 'com_other', label: 'Other', facet: null, Icon: MoreHorizontal },
    ],
  },
];

/**
 * First-run onboarding — a vertical pager (which itself teaches the swipe-up
 * gesture): hero → photo permission → feed-preference pills. Replaces the old
 * IntroStory + TastePicker.
 */
export function Onboarding({ onDone }: { onDone?: () => void }) {
  const insets = useSafeAreaInsets();
  const { seed } = useSignals();
  const listRef = useRef<FlatList>(null);
  const [open, setOpen] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(ONB_KEY).then((v) => setOpen(!v)).catch(() => setOpen(false));
  }, []);

  // Bouncing swipe-up hint.
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(withSequence(withTiming(-8, { duration: 650 }), withTiming(0, { duration: 650 })), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  if (!open) return null;

  function goTo(i: number) {
    listRef.current?.scrollToOffset({ offset: i * height, animated: true });
  }
  async function askPhotos() {
    try { await ImagePicker.requestMediaLibraryPermissionsAsync(); } catch { /* non-blocking */ }
    goTo(2);
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function finish(skip = false) {
    if (!skip && selected.size) {
      const facets: Record<string, number> = {};
      for (const g of GROUPS) for (const it of g.items) {
        if (it.facet && selected.has(it.id)) facets[`type:${it.facet}`] = 50;
      }
      if (Object.keys(facets).length) seed(facets);
    }
    AsyncStorage.setItem(ONB_KEY, '1').catch(() => {});
    setOpen(false);
    onDone?.();
  }

  function renderPage(page: (typeof PAGES)[number]) {
    if (page === 'hero') {
      return (
        <View style={{ width, height }} className="bg-ink">
          <LinearGradient colors={['#111114', '#000000']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28, paddingHorizontal: 28 }}>
            <Text className="text-[17px] font-medium text-white/45">Noel</Text>
            <View className="flex-1 justify-center">
              <Text className="text-[52px] font-bold leading-[1.05] text-white">Swipe.{'\n'}Save.{'\n'}Move in.</Text>
              <Text className="mt-5 text-[16px] leading-6 text-white/60">The addictive way to find your next home — a full-screen feed that learns your taste.</Text>
            </View>
            <Animated.View style={bounceStyle} className="mb-4 items-center">
              <ChevronUp size={22} color="rgba(255,255,255,0.55)" />
              <Text className="mt-0.5 text-[12.5px] text-white/45">Swipe up to explore</Text>
            </Animated.View>
            <Pressable onPress={() => goTo(1)} className="items-center rounded-full bg-white py-4">
              <Text className="text-[16px] font-semibold text-ink">Accept & continue</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (page === 'permissions') {
      return (
        <View style={{ width, height }} className="bg-paper">
          <View style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, paddingHorizontal: 28 }}>
            <View className="flex-1 justify-center">
              <View className="mb-8 h-20 w-20 items-center justify-center self-center rounded-3xl bg-accent/10">
                <Images size={38} color={colors.accent} />
              </View>
              <Text className="text-center text-[26px] font-bold leading-tight text-ink">Post homes from your camera roll</Text>
              <Text className="mt-3 text-center text-[15px] leading-6 text-graphite">
                Noel needs access to your photos and videos so you can list your own home — a carousel of portrait photos and clips, just like a post.
              </Text>
              <View className="mt-8 gap-4">
                <Row Icon={Images} title="How you'll use this" body="Add portrait photos and videos from your camera roll to a listing." />
                <Row Icon={Sparkles} title="You're in control" body="Only what you pick is uploaded. Change access anytime in Settings." />
              </View>
            </View>
            <Pressable onPress={askPhotos} className="items-center rounded-full bg-ink py-4">
              <Text className="text-[16px] font-semibold text-white">Allow access</Text>
            </Pressable>
            <Pressable onPress={() => goTo(2)} className="mt-2 items-center py-3">
              <Text className="text-[15px] font-medium text-graphite">Not now</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    // taste
    return (
      <View style={{ width, height }} className="bg-paper">
        <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-accent/10 px-2.5 py-1">
              <Sparkles size={13} color={colors.accent} /><Text className="text-xs font-semibold text-accent">Tune your feed</Text>
            </View>
            <Pressable onPress={() => finish(true)} hitSlop={8}><Text className="text-sm font-medium text-graphite">Skip</Text></Pressable>
          </View>
          <Text className="mt-4 text-[26px] font-semibold leading-tight text-ink">What are you into?</Text>
          <Text className="mt-1 text-sm text-graphite">Pick a few — we'll show more of what you love. You can change this anytime.</Text>

          <View className="mt-6 flex-1">
            {GROUPS.map((g) => (
              <View key={g.group} className="mb-5">
                <Text className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-graphite">{g.group}</Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {g.items.map(({ id, label, Icon }) => {
                    const active = selected.has(id);
                    return (
                      <Pressable
                        key={id}
                        onPress={() => toggle(id)}
                        className={`flex-row items-center gap-2 rounded-full border py-2.5 pl-3 pr-3.5 ${active ? 'border-ink bg-ink' : 'border-hairline bg-paper'}`}
                      >
                        <Icon size={16} color={active ? '#fff' : colors.ink} strokeWidth={2} />
                        <Text className={`text-[14px] font-medium ${active ? 'text-white' : 'text-ink'}`}>{label}</Text>
                        {active ? <Check size={14} color="#fff" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={() => finish(false)} className="items-center rounded-full bg-ink py-4">
            <Text className="text-[16px] font-semibold text-white">
              {selected.size ? `Start exploring (${selected.size})` : 'Start exploring'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80 }}>
      <FlatList
        ref={listRef}
        data={PAGES as unknown as string[]}
        keyExtractor={(p) => p}
        renderItem={({ item }) => renderPage(item as (typeof PAGES)[number])}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        bounces={false}
      />
    </View>
  );
}

function Row({ Icon, title, body }: { Icon: typeof Home; title: string; body: string }) {
  return (
    <View className="flex-row gap-3.5">
      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-mist"><Icon size={18} color={colors.ink} /></View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[13.5px] leading-5 text-graphite">{body}</Text>
      </View>
    </View>
  );
}
