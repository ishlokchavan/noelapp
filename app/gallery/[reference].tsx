import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useExperience } from '@/store/experience';
import { fetchCarouselImages } from '@/lib/listings';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Full-screen photo lightbox — opens straight to the tapped image (no interstitial
 * grid). Swipe to move between photos, tap ✕ to close.
 */
export default function GalleryScreen() {
  const { reference, index } = useLocalSearchParams<{ reference: string; index?: string }>();
  const insets = useSafeAreaInsets();
  const { byRef } = useExperience();
  const listing = byRef(String(reference));
  const [extra, setExtra] = useState<string[]>([]);

  useEffect(() => {
    if (!listing?.images?.length && reference) {
      fetchCarouselImages(String(reference)).then((m) => setExtra(m[String(reference)] ?? []));
    }
  }, [listing, reference]);

  const images = listing?.images?.length ? listing.images : extra;
  const start = Math.min(Math.max(0, Number(index ?? 0) || 0), Math.max(0, images.length - 1));
  const [cur, setCur] = useState(start);

  return (
    <View className="flex-1 bg-black">
      {images.length ? (
        <FlatList
          data={images}
          keyExtractor={(u, i) => `${u}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onMomentumScrollEnd={(e) => setCur(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W }} className="items-center justify-center">
              <Image source={{ uri: item }} style={{ width: SCREEN_W, height: '100%' }} contentFit="contain" transition={150} />
            </View>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center"><Text className="text-white/60">No photos to show.</Text></View>
      )}

      {/* Close */}
      <Pressable onPress={() => router.back()} style={{ top: insets.top + 8 }} className="absolute right-4 h-10 w-10 items-center justify-center rounded-full bg-white/15">
        <X size={22} color="#fff" />
      </Pressable>

      {/* Counter */}
      {images.length > 1 ? (
        <View pointerEvents="none" style={{ top: insets.top + 12 }} className="absolute left-0 right-0 items-center">
          <View className="rounded-full bg-white/15 px-3 py-1"><Text className="text-[13px] font-semibold text-white">{cur + 1} / {images.length}</Text></View>
        </View>
      ) : null}
    </View>
  );
}
