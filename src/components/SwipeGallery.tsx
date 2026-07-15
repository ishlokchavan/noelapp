import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';

type Slide = { type: 'image' | 'video'; uri: string; poster: string };

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Optional inline-video module (expo-video). Loaded defensively because it isn't
 * present in some runtimes (e.g. Expo Go); when missing, video slides show the
 * poster.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let VideoMod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VideoMod = require('expo-video');
} catch {
  VideoMod = null;
}
const HAS_VIDEO = Boolean(VideoMod?.useVideoPlayer && VideoMod?.VideoView);

/** Horizontal photo/video gallery. Single tap = onTap, double tap = onDoubleTap. */
export function SwipeGallery({
  images,
  videos,
  width = SCREEN_W,
  height,
  indicator = 'bars',
  onDoubleTap,
  onTap,
  contentFit = 'cover',
  playing = true,
  indicatorTop = 14,
}: {
  images: string[];
  videos?: string[];
  width?: number;
  height: number;
  indicator?: 'bars' | 'dots' | 'count';
  onDoubleTap?: () => void;
  onTap?: (index: number) => void;
  contentFit?: 'cover' | 'contain';
  playing?: boolean;
  indicatorTop?: number;
}) {
  const poster = images[0];
  const slides: Slide[] = [
    ...(videos ?? []).map((uri) => ({ type: 'video' as const, uri, poster })),
    ...images.map((uri) => ({ type: 'image' as const, uri, poster: uri })),
  ];
  const [index, setIndex] = useState(0);

  // Shared single/double-tap discrimination for every slide.
  const lastTap = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handlePress() {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      lastTap.current = 0;
      onDoubleTap?.();
    } else {
      lastTap.current = now;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { onTap?.(index); timer.current = null; }, 280);
    }
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <View style={{ width, height }}>
      <FlatList
        data={slides}
        keyExtractor={(s, i) => `${s.type}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) =>
          item.type === 'video' && HAS_VIDEO ? (
            <VideoSlide uri={item.uri} poster={item.poster} width={width} height={height} contentFit={contentFit} active={i === index && playing} onPress={handlePress} />
          ) : item.type === 'video' ? (
            <Pressable onPress={handlePress} style={{ width, height }}>
              <Image source={{ uri: item.poster }} style={{ width, height }} contentFit={contentFit} />
              <View pointerEvents="none" style={StyleAbsCenter}><PlayBadge /></View>
            </Pressable>
          ) : (
            <Pressable onPress={handlePress} style={{ width, height }}>
              <Image source={{ uri: item.poster }} style={{ width, height }} contentFit={contentFit} transition={200} />
            </Pressable>
          )
        }
      />

      {slides.length > 1 ? (
        <>
          {indicator !== 'count' ? (
            <View pointerEvents="none" className="absolute left-0 right-0 flex-row items-center justify-center gap-1.5" style={{ top: indicatorTop }}>
              {slides.map((_, i) =>
                indicator === 'bars' ? (
                  <View key={i} style={{ height: 3.5, width: 24, borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2 }} className={i === index ? 'bg-white' : 'bg-white/45'} />
                ) : (
                  <View key={i} style={{ height: 6, width: 6, borderRadius: 3 }} className={i === index ? 'bg-white' : 'bg-white/45'} />
                ),
              )}
            </View>
          ) : null}
          {/* Visible "x / N" counter so people know there's more to swipe */}
          <View pointerEvents="none" className="absolute right-3 rounded-full bg-black/45 px-2 py-0.5" style={{ top: indicatorTop - 3 }}>
            <Text className="text-[11px] font-semibold text-white">{index + 1} / {slides.length}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Inline player. Autoplays with sound while it's the active slide of the active card. */
function VideoSlide({
  uri, poster, width, height, contentFit, active, onPress,
}: {
  uri: string; poster: string; width: number; height: number;
  contentFit: 'cover' | 'contain'; active: boolean; onPress: () => void;
}) {
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const player = VideoMod.useVideoPlayer(uri, (p: any) => { p.loop = true; p.muted = false; });
  const VideoView = VideoMod.VideoView;

  useEffect(() => {
    if (active) { player.muted = false; player.play(); } else { player.pause(); }
  }, [active, player]);
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') setReady(true);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <Pressable onPress={onPress} style={{ width, height }}>
      {!ready ? <Image source={{ uri: poster }} style={{ position: 'absolute', width, height }} contentFit={contentFit} /> : null}
      <VideoView player={player} style={{ width, height }} contentFit={contentFit} nativeControls={false} />
      {!ready ? <View pointerEvents="none" style={StyleAbsCenter}><PlayBadge /></View> : null}
    </Pressable>
  );
}

const StyleAbsCenter = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' } as const;

function PlayBadge() {
  return (
    <View className="h-16 w-16 items-center justify-center rounded-full bg-black/45">
      <Play size={28} color="#fff" fill="#fff" />
    </View>
  );
}
