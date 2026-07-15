import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Heart, CalendarClock, Wallet, ArrowUpRight } from 'lucide-react-native';
import { useExperience } from '@/store/experience';
import { useSaved } from '@/store/saved';
import { formatAed } from '@/data/experience-data';
import { colors } from '@/theme/tokens';

const STORY_MS = 6000;
const TICK = 50;
const { width } = Dimensions.get('window');

/** New off-plan launches — an auto-advancing Instagram-style stories viewer. */
export default function LaunchesScreen() {
  const insets = useSafeAreaInsets();
  const { launches } = useExperience();
  const { isSaved, toggle } = useSaved();
  const { start } = useLocalSearchParams<{ start?: string }>();

  const [index, setIndex] = useState(() => {
    const i = start ? launches.findIndex((l) => l.reference === start) : 0;
    return i >= 0 ? i : 0;
  });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);

  const next = useCallback(() => {
    setProgress(0); elapsed.current = 0;
    setIndex((i) => { if (i + 1 >= launches.length) { router.back(); return i; } return i + 1; });
  }, [launches.length]);
  const prev = useCallback(() => { setProgress(0); elapsed.current = 0; setIndex((i) => Math.max(0, i - 1)); }, []);

  useEffect(() => {
    if (paused || !launches.length) return;
    const id = setInterval(() => {
      elapsed.current += TICK;
      const pct = Math.min(100, (elapsed.current / STORY_MS) * 100);
      setProgress(pct);
      if (pct >= 100) next();
    }, TICK);
    return () => clearInterval(id);
  }, [index, paused, next, launches.length]);

  if (!launches.length) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-8">
        <Text className="text-center text-white/70">No new launches right now — check back soon.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-full bg-white/15 px-5 py-2.5"><Text className="text-white">Close</Text></Pressable>
      </View>
    );
  }

  const launch = launches[index];
  const saved = isSaved(launch.reference);

  return (
    <View className="flex-1 bg-black">
      <Image source={{ uri: launch.cover }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} locations={[0, 0.2, 0.5, 1]} style={{ position: 'absolute', width: '100%', height: '100%' }} />

      {/* Progress segments */}
      <View style={{ position: 'absolute', top: insets.top + 10, left: 12, right: 12 }} className="flex-row gap-1.5">
        {launches.map((l, i) => (
          <View key={l.reference} style={{ height: 3, flex: 1, borderRadius: 2 }} className="overflow-hidden bg-white/30">
            <View style={{ height: '100%', borderRadius: 2, width: `${i < index ? 100 : i === index ? progress : 0}%`, backgroundColor: '#fff' }} />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={{ position: 'absolute', top: insets.top + 26, left: 16, right: 16 }} className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/20">
            <Text className="text-[13px] font-semibold text-white">{(launch.developerName ?? 'iC').slice(0, 2)}</Text>
          </View>
          <View>
            <Text className="text-sm font-semibold text-white">{launch.developerName ?? 'New release'}</Text>
            <Text className="text-xs text-white/65">{launch.community}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-black/30"><X size={20} color="#fff" /></Pressable>
      </View>

      {/* Tap zones (hold to pause) */}
      <Pressable
        onPress={prev}
        onPressIn={() => setPaused(true)} onPressOut={() => setPaused(false)}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: width / 3 }}
      />
      <Pressable
        onPress={next}
        onPressIn={() => setPaused(true)} onPressOut={() => setPaused(false)}
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: (width * 2) / 3 }}
      />

      {/* Content */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 28 }} className="px-5">
        <View className="self-start rounded-full bg-black/45 px-3 py-1"><Text className="text-xs font-medium text-white">Off-plan launch</Text></View>
        <Text className="mt-3 text-[26px] font-semibold leading-tight text-white">{launch.title}</Text>
        <Text className="mt-1.5 text-lg font-medium text-white/90">from {formatAed(launch.priceAed)}</Text>

        <View className="mt-4 flex-row gap-2.5">
          {launch.paymentPlan ? <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-2"><Wallet size={15} color={colors.journey.offplan} /><Text className="text-[13px] text-white">{launch.paymentPlan} plan</Text></View> : null}
          {launch.handoverBy ? <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-2"><CalendarClock size={15} color={colors.journey.offplan} /><Text className="text-[13px] text-white">{launch.handoverBy}</Text></View> : null}
        </View>

        <View className="mt-5 flex-row items-center gap-2.5">
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(launch.reference); }}
            className={`h-12 w-12 items-center justify-center rounded-full ${saved ? 'bg-journey-buyer' : 'bg-white/20'}`}
          >
            <Heart size={20} color={saved ? colors.ink : '#fff'} fill={saved ? colors.ink : 'transparent'} />
          </Pressable>
          <Pressable onPress={() => router.push(`/property/${launch.reference}`)} className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-white">
            <Text className="text-[15px] font-semibold text-ink">View home</Text><ArrowUpRight size={18} color={colors.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
