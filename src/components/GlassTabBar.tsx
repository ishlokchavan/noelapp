import { useEffect, useState } from 'react';
import { View, Image as RNImage, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Search, MapPin, User, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

/**
 * Optional iOS 26 Liquid Glass module — ships only in a dev/standalone build on
 * iOS 26+. Loaded defensively so Expo Go / Android / older iOS fall back to a
 * frosted BlurView pill.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GlassViewComp: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GlassContainerComp: any = null;
let liquid = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const g = require('expo-glass-effect');
  if (g?.isLiquidGlassAvailable?.()) {
    GlassViewComp = g.GlassView;
    GlassContainerComp = g.GlassContainer;
    liquid = Boolean(GlassViewComp && GlassContainerComp);
  }
} catch {
  liquid = false;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedGlass: any = GlassViewComp ? Animated.createAnimatedComponent(GlassViewComp) : null;

const TAB_ICON: Record<string, typeof House> = { index: House, map: MapPin, search: Search };
const FILLABLE: Record<string, boolean> = { index: true, map: true, search: false };
/** Tabs shown in the bar, left→right. Anything else (trending, shares) stays hidden. */
const VISIBLE = ['index', 'map', 'search', 'profile'];
/** The center ➕ Add-listing action is inserted at this slot (between Map and Search). */
const ACTION_AT = 2;

const ITEM = 60;
const CAP_W = 48;
const CAP_H = 44;
const PAD = 6;
const BAR_H = 56;
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

type Slot =
  | { kind: 'tab'; key: string; name: string }
  | { kind: 'action' };

/**
 * Apple liquid-glass tab bar: a floating frosted pill (genuine iOS 26 Liquid
 * Glass when available, BlurView otherwise) with a selection capsule that springs
 * to the active tab. Layout: Home · Map · ➕ · Search · Profile. The ➕ is a
 * center action that opens the Add-listing flow; Profile is a circular avatar.
 */
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Real tab routes, in the VISIBLE order (independent of declaration order).
  const tabRoutes = VISIBLE
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Build the visual slots, injecting the ➕ action at ACTION_AT.
  const slots: Slot[] = [];
  tabRoutes.forEach((r) => {
    if (slots.length === ACTION_AT) slots.push({ kind: 'action' });
    slots.push({ kind: 'tab', key: r.key, name: r.name });
  });
  if (slots.length <= ACTION_AT) slots.push({ kind: 'action' });

  const count = slots.length;
  const activeKey = state.routes[state.index]?.key;
  const activeSlot = Math.max(0, slots.findIndex((s) => s.kind === 'tab' && s.key === activeKey));
  const posFor = (i: number) => PAD + i * ITEM + (ITEM - CAP_W) / 2;

  const tx = useSharedValue(posFor(activeSlot));

  // Profile avatar (Instagram-style).
  const [avatar, setAvatar] = useState<string | null>(null);
  const [initial, setInitial] = useState<string | null>(null);
  useEffect(() => {
    const apply = (u: { email?: string | null; user_metadata?: Record<string, unknown> } | undefined | null) => {
      setAvatar(((u?.user_metadata?.avatar_url as string | undefined) ?? (u?.user_metadata?.picture as string | undefined)) ?? null);
      setInitial(u?.email ? u.email[0].toUpperCase() : null);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    tx.value = withSpring(posFor(activeSlot), SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot]);

  function goToTab(name: string, key: string) {
    Haptics.selectionAsync();
    const focused = state.routes[state.index]?.key === key;
    const e = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !e.defaultPrevented) navigation.navigate(name);
  }
  function openAdd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/sell');
  }

  const capStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const barWidth = count * ITEM + PAD * 2;

  const items = (
    <View style={{ flexDirection: 'row', height: BAR_H, paddingHorizontal: PAD }}>
      {slots.map((slot, i) => {
        if (slot.kind === 'action') {
          return (
            <Pressable
              key="action"
              onPress={openAdd}
              hitSlop={6}
              style={{ width: ITEM, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{
                height: 38, width: 38, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink,
              }}>
                <Plus size={22} color="#fff" strokeWidth={2.6} />
              </View>
            </Pressable>
          );
        }
        const active = slot.key === activeKey;
        if (slot.name === 'profile') {
          return (
            <Pressable
              key={slot.key}
              onPress={() => goToTab(slot.name, slot.key)}
              style={{ width: ITEM, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{
                height: 28, width: 28, borderRadius: 14, overflow: 'hidden',
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e5ea',
                borderWidth: active ? 2 : 1, borderColor: active ? colors.ink : '#bcbcc0',
              }}>
                {avatar ? (
                  <RNImage source={{ uri: avatar }} style={{ height: '100%', width: '100%' }} />
                ) : initial ? (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>{initial}</Text>
                ) : (
                  <User size={16} color={colors.ink} strokeWidth={2} />
                )}
              </View>
            </Pressable>
          );
        }
        const Icon = TAB_ICON[slot.name] ?? House;
        return (
          <Pressable
            key={slot.key}
            onPress={() => goToTab(slot.name, slot.key)}
            style={{ width: ITEM, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon
              size={active ? 27 : 25}
              color={active ? colors.ink : colors.graphiteLight}
              strokeWidth={active ? 2.2 : 1.9}
              fill={active && FILLABLE[slot.name] ? colors.ink : 'transparent'}
            />
          </Pressable>
        );
      })}
    </View>
  );

  const capsule = liquid && AnimatedGlass ? (
    <AnimatedGlass glassEffectStyle="clear" tintColor="rgba(255,255,255,0.5)" style={[styles.capsule, capStyle]} />
  ) : (
    <Animated.View style={[styles.capsule, styles.capsuleFallback, capStyle]} />
  );

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 14), alignItems: 'center' }}>
      <View style={[styles.shadow, { width: barWidth, height: BAR_H, borderRadius: BAR_H / 2 }]}>
        {liquid && GlassViewComp && GlassContainerComp ? (
          <GlassContainerComp spacing={22} style={[styles.fill, { borderRadius: BAR_H / 2 }]}>
            <GlassViewComp glassEffectStyle="regular" style={[styles.fill, { borderRadius: BAR_H / 2 }]} />
            {capsule}
            {items}
          </GlassContainerComp>
        ) : (
          <BlurView intensity={Platform.OS === 'android' ? 100 : 80} tint="systemChromeMaterialLight" style={[styles.fill, styles.glassBorder, { borderRadius: BAR_H / 2, overflow: 'hidden' }]}>
            {capsule}
            {items}
          </BlurView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  shadow: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  glassBorder: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.42)' },
  capsule: { position: 'absolute', top: (BAR_H - CAP_H) / 2, left: 0, width: CAP_W, height: CAP_H, borderRadius: CAP_H / 2 },
  capsuleFallback: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
});
