import { memo, useState } from 'react';
import { View, Text, Pressable, Share, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart, Share2, X, Info, MapPin, BedDouble, Bath, Maximize, BadgeCheck, Coins,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SwipeGallery } from './SwipeGallery';
import { LikeBurst } from './LikeBurst';
import { formatAed, formatCredits } from '@/data/experience-data';
import { listingUrl } from '@/lib/config';
import { useSaved } from '@/store/saved';
import { useSignals } from '@/store/signals';
import type { ExperienceListing } from '@/types/listing';

const { height } = Dimensions.get('window');

/**
 * Full-screen vertical feed card — a React-Native port of the web DiscoveryCard.
 * Swipeable photo/video gallery, hook + verified chips, a TikTok-style right
 * action rail (Save / Share / Pass / Info), and an instant "why this fits you".
 */
function PropertyFeedCardImpl({
  listing,
  active,
  tabBarSpace = 96,
  topInset = 0,
  onPass,
}: {
  listing: ExperienceListing;
  active: boolean;
  tabBarSpace?: number;
  topInset?: number;
  onPass?: () => void;
}) {
  const { isSaved, toggle, pass } = useSaved();
  const { track } = useSignals();
  const saved = isSaved(listing.reference);
  const [burst, setBurst] = useState(0);

  function toggleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!saved) track('save', listing);
    toggle(listing.reference);
  }

  // Double-tap: like (never un-likes) + heart pop, Instagram-style.
  function onDoubleTap() {
    if (!saved) toggleSave();
    setBurst((b) => b + 1);
  }

  function openDetails() {
    track('details', listing);
    router.push(`/property/${listing.reference}`);
  }

  function onShare() {
    track('share', listing);
    Share.share({
      message: `${listing.title} — ${formatAed(listing.priceAed)} on noelapp\n${listingUrl(listing.reference)}`,
    }).catch(() => {});
  }

  function onDislike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    track('dislike', listing);
    pass(listing.reference);
    onPass?.();
  }

  return (
    <View style={{ height }} className="relative w-full bg-ink">
      <SwipeGallery
        images={listing.images}
        videos={listing.videos}
        height={height}
        playing={active}
        indicator="count"
        indicatorTop={topInset + 52}
        onTap={openDetails}
        onDoubleTap={onDoubleTap}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.22, 0.5, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      <LikeBurst trigger={burst} />

      {/* Top chips */}
      <View pointerEvents="none" style={{ position: 'absolute', top: topInset + 44, left: 16, right: 16 }} className="flex-row items-center gap-2">
        <View className="rounded-full bg-black/45 px-2.5 py-1">
          <Text className="text-[11.5px] font-medium text-white">{listing.hook}</Text>
        </View>
        {listing.isVerified ? (
          <View className="flex-row items-center gap-1 rounded-full bg-black/45 px-2 py-1">
            <BadgeCheck size={13} color="#9effe0" />
            <Text className="text-[11.5px] font-medium text-white">Verified</Text>
          </View>
        ) : null}
      </View>

      {/* Right action rail */}
      <View style={{ position: 'absolute', right: 12, bottom: tabBarSpace + 24 }} className="items-center gap-4">
        <Rail label={saved ? 'Saved' : 'Save'} active={saved} onPress={toggleSave}>
          <Heart size={24} color="#fff" fill={saved ? '#fff' : 'transparent'} />
        </Rail>
        <Rail label="Share" onPress={onShare}><Share2 size={22} color="#fff" /></Rail>
        <Rail label="Pass" onPress={onDislike}><X size={24} color="#fff" /></Rail>
        <Rail label="Info" onPress={openDetails}><Info size={22} color="#fff" /></Rail>
      </View>

      {/* Info sheet */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: tabBarSpace }} className="gap-2 px-5">
        <Pressable onPress={openDetails}>
          <View className="flex-row items-center gap-2.5">
            <Text className="text-3xl font-bold text-white">{formatAed(listing.priceAed)}</Text>
            <View className="flex-row items-center gap-1 rounded-full bg-accent/90 px-2.5 py-1">
              <Coins size={13} color="#fff" />
              <Text className="text-xs font-semibold text-white">{formatCredits(listing.credit.credits)} credits</Text>
            </View>
          </View>
          <Text className="mt-1.5 text-[15px] font-medium text-white" numberOfLines={1}>{listing.title}</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <MapPin size={13} color="rgba(255,255,255,0.8)" />
            <Text className="text-[13px] text-white/80" numberOfLines={1}>
              {[listing.building, listing.community, listing.city].filter(Boolean).join(', ')}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center gap-5">
            {listing.bedrooms !== null ? (
              <Spec icon={<BedDouble size={15} color="#fff" />} label={listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms}`} />
            ) : null}
            {listing.bathrooms !== null ? (
              <Spec icon={<Bath size={15} color="#fff" />} label={`${listing.bathrooms}`} />
            ) : null}
            {listing.areaSqft !== null ? (
              <Spec icon={<Maximize size={15} color="#fff" />} label={`${listing.areaSqft.toLocaleString('en-US')} sqft`} />
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export const PropertyFeedCard = memo(PropertyFeedCardImpl);

function Rail({ label, active, onPress, children }: { label: string; active?: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} className="items-center gap-1">
      <View className={`h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-rose-500' : 'bg-black/40'}`}>
        {children}
      </View>
      <Text className="text-[11px] font-medium text-white">{label}</Text>
    </Pressable>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">{icon}<Text className="text-sm font-medium text-white">{label}</Text></View>
  );
}
