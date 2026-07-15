import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight, BadgePercent, Coins, ShieldCheck, Building2, Home, Tag, Handshake,
} from 'lucide-react-native';
import { colors } from '@/theme/tokens';

const INTRO_KEY = 'iclose.glass.intro.v1';
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_373qi3JTSvYmXjqMPJT9idOjFt7';
const { width } = Dimensions.get('window');

const DO_CARDS = [
  { img: `${CDN}/hf_20260616_222225_d0f4e2b8-36a6-46aa-9625-324f1714414c.png`, Icon: Home, label: 'Buy', badge: '0% commission', line: 'Earn credits worth real money on every home.' },
  { img: `${CDN}/hf_20260616_222230_e9003974-fd28-47cb-9667-44b1485ce165.png`, Icon: Tag, label: 'Sell', badge: 'List free', line: 'Sell direct to buyers, without paying commission.' },
  { img: `${CDN}/hf_20260616_222236_b69f84e1-cbcb-452d-841d-63c07a0ada81.png`, Icon: Handshake, label: 'Close', badge: 'Keep 100%', line: 'List or close a deal and keep the full commission.' },
];

const USPS = [
  { Icon: BadgePercent, title: 'Zero commission', line: 'Buy, sell or close — you never pay a cut.' },
  { Icon: Coins, title: 'Cashback credits', line: 'Earn noelapp credits worth real money on every deal.' },
  { Icon: ShieldCheck, title: 'Verified listings', line: 'Real, RERA-checked homes. No fake leads.' },
  { Icon: Building2, title: 'Off-plan launches', line: 'Early access and special pricing on new launches.' },
];

const STEPS = 3;

/** First-run brand intro — three slides shown once before the taste picker. */
export function IntroStory({ onDone }: { onDone?: () => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<boolean | null>(null);
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY).then((v) => setOpen(!v)).catch(() => setOpen(false));
  }, []);

  if (!open) return null;

  function finish() {
    AsyncStorage.setItem(INTRO_KEY, '1').catch(() => {});
    setOpen(false);
    onDone?.();
  }
  function go(n: number) {
    listRef.current?.scrollToOffset({ offset: n * width, animated: true });
    setIdx(n);
  }

  const last = idx === STEPS - 1;
  const slides = ['hero', 'ways', 'why'] as const;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80 }} className="bg-paper">
      {/* progress + skip */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, zIndex: 10 }} className="flex-row items-center gap-3">
        <View className="flex-1 flex-row gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={{ height: 3, flex: 1, borderRadius: 2 }} className={i <= idx ? 'bg-ink' : 'bg-ink/10'} />
          ))}
        </View>
        <Pressable onPress={finish}><Text className="text-[13px] font-medium text-ink/40">Skip</Text></Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 px-7" >
            <View style={{ paddingTop: insets.top + 72 }}>
              {item === 'hero' ? (
                <>
                  <Text className="text-[17px] font-medium text-ink/40">noelapp</Text>
                  <Text className="mt-8 text-[38px] font-normal leading-tight text-ink">
                    Never pay commission to <Text className="font-bold">buy</Text>, <Text className="font-bold">sell</Text>, or <Text className="font-bold">close</Text> ever again.
                  </Text>
                  <Text className="mt-5 text-[14px] text-ink/50">Investing in off-plan? Get special pricing & credits.</Text>
                </>
              ) : item === 'ways' ? (
                <>
                  <Text className="text-[28px] font-semibold leading-tight text-ink">One app. Three ways to win.</Text>
                  <Text className="mt-2 text-[15px] text-ink/50">Whichever side you're on, the cut stays yours.</Text>
                  <View className="mt-6 gap-3.5">
                    {DO_CARDS.map(({ img, Icon, label, badge, line }) => (
                      <View key={label} style={{ height: 118 }} className="overflow-hidden rounded-[22px]">
                        <Image source={{ uri: img }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
                        <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                        <View className="flex-1 flex-row items-center gap-4 px-5">
                          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Icon size={24} color="#fff" /></View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-xl font-semibold text-white">{label}</Text>
                              <View className="rounded-full bg-white/90 px-2 py-0.5"><Text className="text-[11px] font-semibold text-ink">{badge}</Text></View>
                            </View>
                            <Text className="mt-0.5 text-[13px] text-white/75">{line}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-[28px] font-semibold leading-tight text-ink">Why noelapp?</Text>
                  <Text className="mt-2 text-[15px] text-ink/50">Built to put money back in your pocket.</Text>
                  <View className="mt-6 gap-3">
                    {USPS.map(({ Icon, title, line }) => (
                      <View key={title} className="flex-row items-center gap-4 rounded-2xl border border-ink/5 bg-paper p-4">
                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent/10"><Icon size={22} color={colors.accent} /></View>
                        <View className="flex-1">
                          <Text className="text-[15px] font-semibold text-ink">{title}</Text>
                          <Text className="mt-0.5 text-[13px] text-ink/50">{line}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      />

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 24 }}>
        <Pressable onPress={() => (last ? finish() : go(idx + 1))} className="flex-row items-center justify-center gap-2 rounded-full bg-ink py-4">
          <Text className="text-base font-semibold text-white">{last ? 'Start exploring' : 'Next'}</Text>
          <ArrowRight size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
