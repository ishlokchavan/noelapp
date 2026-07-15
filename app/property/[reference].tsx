import { View, Text, ScrollView, Pressable, Dimensions, Linking, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft, ChevronRight, Heart, Share2, BedDouble, Bath, Maximize, MapPin, BadgeCheck,
  CalendarClock, Wallet, Building2, Navigation, Coins, Phone,
} from 'lucide-react-native';
import { Share } from 'react-native';
import { WhatsAppIcon } from '@/components/icons/WhatsApp';
import { useExperience } from '@/store/experience';
import { useSaved } from '@/store/saved';
import { useSignals } from '@/store/signals';
import { usePullRefresh } from '@/lib/use-refresh';
import { SwipeGallery } from '@/components/SwipeGallery';
import { Loading } from '@/components/Loading';
import { formatAed, formatCredits } from '@/data/experience-data';
import { facetsOf } from '@/lib/recommender';
import { slugifyDeveloper } from '@/lib/slug';
import { bedLabel } from '@/lib/format';
import { CONTACT_WHATSAPP, CONTACT_PHONE, listingUrl } from '@/lib/config';
import { Glass, GlassBg } from '@/components/Glass';
import { colors } from '@/theme/tokens';

const { width } = Dimensions.get('window');

export default function PropertyScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { byRef, listings } = useExperience();
  const { isSaved, toggle } = useSaved();
  const { track } = useSignals();
  const insets = useSafeAreaInsets();
  const { refreshing, onRefresh } = usePullRefresh();

  const listing = byRef(String(reference));
  if (!listing) return <Loading />;
  const saved = isSaved(listing.reference);

  // "More like this" — facet overlap with the current listing.
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

  function openWhatsApp() {
    track('whatsapp', listing!);
    const text = encodeURIComponent(
      `Hi, I'm interested in ${listing!.title} (${listing!.reference}) on Noel.\n${listingUrl(listing!.reference)}`,
    );
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

  return (
    <View className="flex-1 bg-paper">
      <GlassBg />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        {/* Hero gallery */}
        <View style={{ height: width * 1.05 }} className="bg-mist">
          <SwipeGallery
            images={listing.images}
            videos={listing.videos}
            height={width * 1.05}
            indicator="dots"
            onTap={() => router.push(`/gallery/${listing.reference}`)}
            onDoubleTap={() => { if (!saved) toggleSave(); }}
          />
          <Pressable onPress={() => router.back()} style={{ top: insets.top + 8 }}
            className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-black/35">
            <ChevronLeft size={26} color="#fff" />
          </Pressable>
          <View style={{ top: insets.top + 8 }} className="absolute right-4 flex-row gap-2">
            <Pressable
              onPress={() => { track('share', listing); Share.share({ message: `${listing.title} — ${formatAed(listing.priceAed)} on Noel\n${listingUrl(listing.reference)}` }).catch(() => {}); }}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/35">
              <Share2 size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={toggleSave} className={`h-11 w-11 items-center justify-center rounded-full ${saved ? 'bg-ink' : 'bg-black/35'}`}>
              <Heart size={20} color="#fff" fill={saved ? '#fff' : 'transparent'} />
            </Pressable>
          </View>
        </View>

        <View className="gap-4 px-5 pt-5">
          {/* Hook + verified */}
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-mist px-2.5 py-1"><Text className="text-xs font-medium text-graphite">{listing.hook}</Text></View>
            {listing.isVerified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-mist px-2.5 py-1">
                <BadgeCheck size={13} color={colors.journey.listing} /><Text className="text-xs font-medium text-graphite">Verified</Text>
              </View>
            ) : null}
          </View>

          <Text className="text-3xl font-bold text-ink">{formatAed(listing.priceAed)}</Text>
          <Text className="-mt-2 text-lg font-semibold text-ink">{listing.title}</Text>
          <View className="-mt-2 flex-row items-center gap-1.5">
            <MapPin size={15} color={colors.graphite} />
            <Text className="text-sm text-graphite">{listing.building ? `${listing.building}, ` : ''}{listing.community}, {listing.city}</Text>
          </View>

          {/* Credits panel */}
          <View className="overflow-hidden rounded-apple border border-accent/20 bg-accent/5">
            <View className="flex-row items-center gap-2.5 px-4 py-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15"><Coins size={20} color={colors.accent} /></View>
              <View className="flex-1">
                <Text className="text-xs text-graphite">Buy this home and get</Text>
                <Text className="text-xl font-bold text-accent">{formatCredits(listing.credit.credits)} Noel credits</Text>
              </View>
            </View>
            <Text className="border-t border-accent/15 px-4 py-2.5 text-xs text-graphite">
              Credits are yours to keep and spend on Noel — that's the commission you'd normally lose.
            </Text>
          </View>

          {/* Spec grid */}
          <View className="flex-row gap-2.5">
            <SpecTile icon={<BedDouble size={20} color={colors.ink} />} label="Bedrooms" value={bedLabel(listing.bedrooms)} />
            <SpecTile icon={<Bath size={20} color={colors.ink} />} label="Bathrooms" value={`${listing.bathrooms ?? '—'}`} />
            <SpecTile icon={<Maximize size={20} color={colors.ink} />} label="Area" value={listing.areaSqft ? `${(listing.areaSqft / 1000).toFixed(1)}k` : '—'} />
          </View>

          {/* Off-plan payment plan */}
          {listing.completion === 'off_plan' ? (
            <View className="gap-3 rounded-apple border border-white/60 bg-white/70 p-4">
              {listing.developerName ? (
                <Pressable onPress={() => router.push(`/developer/${slugifyDeveloper(listing.developerName!)}`)} className="flex-row items-center gap-2">
                  <Building2 size={18} color={colors.journey.offplan} />
                  <Text className="flex-1 text-base font-semibold text-ink">{listing.developerName}</Text>
                  <Text className="text-xs font-medium text-accent">View developer</Text>
                  <ChevronRight size={16} color={colors.graphiteLight} />
                </Pressable>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Building2 size={18} color={colors.journey.offplan} />
                  <Text className="text-base font-semibold text-ink">New release</Text>
                </View>
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
              <Text className="text-sm leading-relaxed text-graphite">{listing.description}</Text>
            </View>
          ) : null}

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

          {/* Map */}
          <Pressable onPress={openMaps} className="flex-row items-center justify-between rounded-apple border border-white/60 bg-white/70 p-4">
            <View className="flex-row items-center gap-2"><Navigation size={16} color={colors.accent} /><Text className="text-sm text-ink">{listing.community}, {listing.city}</Text></View>
            <Text className="text-[13px] text-accent">Open in Maps</Text>
          </Pressable>

          {/* Agent / source */}
          <View className="flex-row items-center gap-3 rounded-apple border border-white/60 bg-white/70 p-3.5">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-mist">
              <Text className="text-base font-semibold text-ink">
                {(listing.agentName ?? listing.developerName ?? 'iC').split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>{listing.agentName ?? listing.developerName ?? 'Noel listing'}</Text>
              <Text className="text-[13px] text-graphite" numberOfLines={1}>
                {listing.agencyName ?? (listing.source === 'owner' ? 'Listed by owner · commission-free' : 'Developer direct')}
              </Text>
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
                    <Image source={{ uri: l.cover }} style={{ width: '100%', height: 150 }} contentFit="cover" />
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
      </ScrollView>

      {/* Sticky action bar — talk to an agent */}
      <Glass rounded={0} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 10, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)' }}>
        <Pressable onPress={openWhatsApp} className="h-12 flex-[2] flex-row items-center justify-center gap-2 rounded-full" style={{ backgroundColor: '#25D366' }}>
          <WhatsAppIcon size={21} color="#fff" />
          <Text className="text-[15px] font-semibold text-white">WhatsApp</Text>
        </Pressable>
        <Pressable onPress={call} className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-ink">
          <Phone size={19} color="#fff" />
          <Text className="text-[15px] font-semibold text-white">Call</Text>
        </Pressable>
      </Glass>
    </View>
  );
}

function SpecTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-apple border border-white/60 bg-white/70 py-3.5">
      {icon}
      <Text className="text-lg font-semibold text-ink">{value}</Text>
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
