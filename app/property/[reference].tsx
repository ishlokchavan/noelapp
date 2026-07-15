import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, Linking, RefreshControl, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation,
} from 'react-native-reanimated';
import {
  ChevronLeft, ChevronRight, Heart, Share2, BedDouble, Bath, Maximize, MapPin,
  CalendarClock, Wallet, Building2, Navigation, Phone, Images as ImagesIcon, Home, ShieldCheck,
} from 'lucide-react-native';
import { WhatsAppIcon } from '@/components/icons/WhatsApp';
import { useExperience } from '@/store/experience';
import { useSaved } from '@/store/saved';
import { useSignals } from '@/store/signals';
import { usePullRefresh } from '@/lib/use-refresh';
import { SwipeGallery } from '@/components/SwipeGallery';
import { Loading } from '@/components/Loading';
import { formatAed } from '@/data/experience-data';
import { facetsOf } from '@/lib/recommender';
import { slugifyDeveloper } from '@/lib/slug';
import { bedLabel } from '@/lib/format';
import { CONTACT_WHATSAPP, CONTACT_PHONE, listingUrl } from '@/lib/config';
import { Glass, GlassBg } from '@/components/Glass';
import { colors } from '@/theme/tokens';

const { width } = Dimensions.get('window');
const HERO_H = Math.round(width * 1.08);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function PropertyScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { byRef, listings } = useExperience();
  const { isSaved, toggle } = useSaved();
  const { track } = useSignals();
  const insets = useSafeAreaInsets();
  const { refreshing, onRefresh } = usePullRefresh();
  const [expanded, setExpanded] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_H - 120, HERO_H - 60], [0, 1], Extrapolation.CLAMP),
  }));

  const listing = byRef(String(reference));
  if (!listing) return <Loading />;
  const saved = isSaved(listing.reference);

  const currentFacets = new Set(facetsOf(listing));
  const similar = listings
    .filter((l) => l.reference !== listing.reference)
    .map((l) => ({ l, score: facetsOf(l).filter((f) => currentFacets.has(f)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.l);

  function toggleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!saved) track('save', listing!);
    toggle(listing!.reference);
  }
  function shareListing() {
    track('share', listing!);
    Share.share({ message: `${listing!.title} — ${formatAed(listing!.priceAed)} on Noel\n${listingUrl(listing!.reference)}` }).catch(() => {});
  }
  function openLightbox(slideIdx: number) {
    const imgIdx = Math.max(0, slideIdx - (listing!.videos?.length ?? 0));
    router.push(`/gallery/${listing!.reference}?index=${imgIdx}`);
  }
  function openWhatsApp() {
    track('whatsapp', listing!);
    const text = encodeURIComponent(`Hi, I'm interested in ${listing!.title} (${listing!.reference}) on Noel.\n${listingUrl(listing!.reference)}`);
    Linking.openURL(`https://wa.me/${CONTACT_WHATSAPP.replace(/[^0-9]/g, '')}?text=${text}`).catch(() => {});
  }
  function call() {
    track('call', listing!);
    Linking.openURL(`tel:${CONTACT_PHONE.replace(/\s/g, '')}`).catch(() => {});
  }
  function openMaps() {
    const q = listing!.latitude && listing!.longitude
      ? `${listing!.latitude},${listing!.longitude}`
      : encodeURIComponent(`${listing!.community}, ${listing!.city}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  }

  const offPlan = listing.completion === 'off_plan';
  const info: [string, string | null][] = [
    ['Type', cap(listing.propertyType)],
    ['Purpose', listing.purpose === 'rent' ? 'For Rent' : 'For Sale'],
    ['Completion', offPlan ? 'Off-plan' : 'Ready'],
    ['Bedrooms', listing.bedrooms != null ? bedLabel(listing.bedrooms) : null],
    ['Bathrooms', listing.bathrooms != null ? String(listing.bathrooms) : null],
    ['Area', listing.areaSqft ? `${listing.areaSqft.toLocaleString()} sqft` : null],
    ['Community', listing.community],
    ['City', listing.city],
    ['Developer', listing.developerName ?? null],
    ['Reference', listing.reference],
  ];
  const rows = info.filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <View className="flex-1 bg-paper">
      <GlassBg />

      {/* Animated sticky header (fades in on scroll) */}
      <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }, headerStyle]}>
        <Glass rounded={0} style={{ paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' }}>
          <Pressable onPress={() => router.back()} hitSlop={8}><ChevronLeft size={24} color={colors.ink} /></Pressable>
          <Text numberOfLines={1} className="flex-1 text-[15px] font-semibold text-ink">{formatAed(listing.priceAed)} · {listing.title}</Text>
          <Pressable onPress={toggleSave} hitSlop={8}><Heart size={22} color={colors.ink} fill={saved ? colors.ink : 'transparent'} /></Pressable>
        </Glass>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll} scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Hero gallery */}
        <View style={{ height: HERO_H }} className="bg-mist">
          <SwipeGallery
            images={listing.images}
            videos={listing.videos}
            height={HERO_H}
            indicator="dots"
            onTap={openLightbox}
            onDoubleTap={() => { if (!saved) toggleSave(); }}
          />
          {/* top scrim for button legibility */}
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.35)', 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120 }} />
          <Pressable onPress={() => router.back()} style={{ top: insets.top + 8 }} className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-black/35">
            <ChevronLeft size={26} color="#fff" />
          </Pressable>
          <View style={{ top: insets.top + 8 }} className="absolute right-4 flex-row gap-2">
            <Pressable onPress={shareListing} className="h-11 w-11 items-center justify-center rounded-full bg-black/35"><Share2 size={20} color="#fff" /></Pressable>
            <Pressable onPress={toggleSave} className={`h-11 w-11 items-center justify-center rounded-full ${saved ? 'bg-ink' : 'bg-black/35'}`}>
              <Heart size={20} color="#fff" fill={saved ? '#fff' : 'transparent'} />
            </Pressable>
          </View>
          {/* bottom overlay: badges + photo count */}
          <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0">
            <View pointerEvents="box-none" className="flex-row items-end justify-between px-4 pb-4">
              <View className="flex-row flex-wrap gap-2" style={{ maxWidth: width * 0.6 }}>
                <Badge label={listing.purpose === 'rent' ? 'For Rent' : 'For Sale'} />
                <Badge label={offPlan ? 'Off-Plan' : 'Ready'} />
                {listing.isVerified ? <Badge label="Verified" icon /> : null}
              </View>
              {listing.images.length ? (
                <Pressable onPress={() => openLightbox(listing.videos?.length ?? 0)} className="flex-row items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5">
                  <ImagesIcon size={14} color="#fff" /><Text className="text-[12px] font-semibold text-white">{listing.images.length}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <View className="gap-4 px-5 pt-5">
          {/* Price + title + location */}
          <View>
            <Text className="text-[30px] font-bold leading-tight text-ink">{formatAed(listing.priceAed)}</Text>
            <Text className="mt-1 text-lg font-semibold text-ink">{listing.title}</Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <MapPin size={15} color={colors.graphite} />
              <Text className="flex-1 text-sm text-graphite" numberOfLines={1}>{listing.building ? `${listing.building}, ` : ''}{listing.community}, {listing.city}</Text>
            </View>
          </View>

          {/* Key facts */}
          <View className="flex-row gap-2.5">
            <SpecTile icon={<BedDouble size={20} color={colors.ink} />} value={listing.bedrooms != null ? bedLabel(listing.bedrooms) : '—'} label="Beds" />
            <SpecTile icon={<Bath size={20} color={colors.ink} />} value={`${listing.bathrooms ?? '—'}`} label="Baths" />
            <SpecTile icon={<Maximize size={20} color={colors.ink} />} value={listing.areaSqft ? `${(listing.areaSqft / 1000).toFixed(1)}k` : '—'} label="Sqft" />
            <SpecTile icon={<Home size={20} color={colors.ink} />} value={cap(listing.propertyType)} label="Type" small />
          </View>

          {/* Off-plan payment plan */}
          {offPlan ? (
            <View className="gap-3 rounded-apple border border-white/60 bg-white/70 p-4">
              {listing.developerName ? (
                <Pressable onPress={() => router.push(`/developer/${slugifyDeveloper(listing.developerName!)}`)} className="flex-row items-center gap-2">
                  <Building2 size={18} color={colors.journey.offplan} />
                  <Text className="flex-1 text-base font-semibold text-ink">{listing.developerName}</Text>
                  <Text className="text-xs font-medium text-accent">View developer</Text>
                  <ChevronRight size={16} color={colors.graphiteLight} />
                </Pressable>
              ) : (
                <View className="flex-row items-center gap-2"><Building2 size={18} color={colors.journey.offplan} /><Text className="text-base font-semibold text-ink">New release</Text></View>
              )}
              <View className="flex-row gap-2.5">
                {listing.paymentPlan ? <InfoRow icon={<Wallet size={15} color={colors.graphite} />} label="Payment plan" value={listing.paymentPlan} /> : null}
                {listing.handoverBy ? <InfoRow icon={<CalendarClock size={15} color={colors.graphite} />} label="Handover" value={listing.handoverBy} /> : null}
              </View>
            </View>
          ) : null}

          {/* Description */}
          {listing.description ? (
            <View className="rounded-apple border border-white/60 bg-white/70 p-4">
              <Text className="mb-2 text-base font-semibold text-ink">About this home</Text>
              <Text className="text-sm leading-relaxed text-graphite" numberOfLines={expanded ? undefined : 5}>{listing.description}</Text>
              {listing.description.length > 220 ? (
                <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6}><Text className="mt-2 text-[13px] font-semibold text-accent">{expanded ? 'Show less' : 'Read more'}</Text></Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Property information (table) */}
          <View className="overflow-hidden rounded-apple border border-white/60 bg-white/70">
            <Text className="px-4 pt-4 text-base font-semibold text-ink">Property information</Text>
            <View className="mt-2">
              {rows.map(([k, v], i) => (
                <View key={k} className={`flex-row items-center px-4 py-2.5 ${i % 2 === 0 ? 'bg-white/40' : ''}`}>
                  <Text className="w-32 text-[13px] text-graphite">{k}</Text>
                  <Text className="flex-1 text-[13.5px] font-medium text-ink" numberOfLines={1}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Amenities */}
          {listing.amenities?.length ? (
            <View>
              <Text className="mb-2 text-base font-semibold text-ink">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <View key={a} className="rounded-full border border-white/60 bg-white/60 px-3 py-1.5"><Text className="text-[13px] text-graphite">{a}</Text></View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Location */}
          <View>
            <Text className="mb-2 text-base font-semibold text-ink">Location</Text>
            <Pressable onPress={openMaps} className="overflow-hidden rounded-apple border border-white/60 bg-white/70">
              <View className="h-28 items-center justify-center bg-mist">
                <MapPin size={26} color={colors.accent} />
              </View>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-2"><Navigation size={16} color={colors.accent} /><Text className="text-sm text-ink" numberOfLines={1}>{listing.community}, {listing.city}</Text></View>
                <Text className="text-[13px] font-medium text-accent">Open in Maps</Text>
              </View>
            </Pressable>
          </View>

          {/* Agent / source */}
          <View className="flex-row items-center gap-3 rounded-apple border border-white/60 bg-white/70 p-3.5">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-mist">
              <Text className="text-base font-semibold text-ink">{(listing.agentName ?? listing.developerName ?? 'No').split(' ').map((w) => w[0]).slice(0, 2).join('')}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>{listing.agentName ?? listing.developerName ?? 'Noel listing'}</Text>
              <Text className="text-[13px] text-graphite" numberOfLines={1}>{listing.agencyName ?? (listing.source === 'owner' ? 'Listed by owner' : 'Developer direct')}</Text>
            </View>
            <View className="rounded-full bg-mist px-3 py-1"><Text className="text-xs text-graphite">{listing.reference}</Text></View>
          </View>

          {/* More like this */}
          {similar.length ? (
            <View>
              <Text className="mb-2 text-base font-semibold text-ink">More like this</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {similar.map((l) => (
                  <Pressable key={l.reference} onPress={() => router.push(`/property/${l.reference}`)} className="w-36 overflow-hidden rounded-2xl border border-white/60 bg-white/70">
                    <Image source={{ uri: l.cover }} style={{ width: '100%', height: 150 }} contentFit="cover" transition={150} />
                    <View className="p-2.5">
                      <Text className="text-sm font-semibold text-ink">{formatAed(l.priceAed)}</Text>
                      <Text className="mt-1 text-xs text-graphite" numberOfLines={1}>{l.community}, {l.city}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Sticky action bar */}
      <Glass rounded={0} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 10, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)' }}>
        <Pressable onPress={openWhatsApp} className="h-12 flex-[2] flex-row items-center justify-center gap-2 rounded-full" style={{ backgroundColor: '#25D366' }}>
          <WhatsAppIcon size={21} color="#fff" /><Text className="text-[15px] font-semibold text-white">WhatsApp</Text>
        </Pressable>
        <Pressable onPress={call} className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-ink">
          <Phone size={19} color="#fff" /><Text className="text-[15px] font-semibold text-white">Call</Text>
        </Pressable>
      </Glass>
    </View>
  );
}

function Badge({ label, icon }: { label: string; icon?: boolean }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-black/55 px-2.5 py-1">
      {icon ? <ShieldCheck size={12} color="#fff" /> : null}
      <Text className="text-[11.5px] font-semibold text-white">{label}</Text>
    </View>
  );
}

function SpecTile({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-apple border border-white/60 bg-white/70 py-3.5">
      {icon}
      <Text className={`font-semibold text-ink ${small ? 'text-[13px]' : 'text-lg'}`} numberOfLines={1}>{value}</Text>
      <Text className="text-[11px] text-graphite">{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-white/60 bg-white/70 p-3">
      <View className="flex-row items-center gap-1.5">{icon}<Text className="text-xs text-graphite">{label}</Text></View>
      <Text className="mt-1 text-[15px] font-semibold text-ink">{value}</Text>
    </View>
  );
}
