import { useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';

/**
 * Micro-interaction: pops (scale bounce) its children whenever `trigger` changes.
 * Style-only Animated.View wrapper — safe with NativeWind (no className on the
 * animated node). Great for like/save buttons, counters, badges.
 */
export function Pop({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: ViewStyle }) {
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; } // don't pop on mount
    scale.value = withSequence(
      withTiming(1.28, { duration: 110 }),
      withSpring(1, { damping: 9, stiffness: 320 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[aStyle, style]}>{children}</Animated.View>;
}
