import { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ScrollView, RefreshControl, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search as SearchIcon, X, Sparkles, Heart, SlidersHorizontal,
  BedDouble, Bath, Maximize, MapPin, ShieldCheck,
} from 'lucide-react-native';
import { useExperience } from '@/store/experience';
import { useSaved } from '@/store/saved';
import { usePullRefresh } from '@/lib/use-refresh';
import { Glass, GlassBg } from '@/components/Glass';
import { parseSearch, type ParsedFilters } from '@/lib/search-parse';
import { formatAed } from '@/data/experience-data';
import { bedLabel } from '@/lib/format';
import { colors } from '@/theme/tokens';
import type { ExperienceListing } from '@/types/listing';

const EXAMPLE = '2-bed near the marina under 2M with a pool';
const BED_CHIPS = ['Studio', '1', '2', '3', '4+'];
const TYPES = ['apartment', 'villa', 'townhouse', 'penthouse', 'plot', 'office', 'retail'];
const PRICE_BANDS = [
  { label: '≤ 1M', value: 1_000_000 },
  { label: '≤ 2M', value: 2_000_000 },
  { label: '≤ 5M', value: 5_000_000 },
  { label: '≤ 10M', value: 10_000_000 },
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Purpose = '' | 'sale' | 'rent';
type Category = '' | 'residential' | 'commercial';
type Completion = '' | 'ready' | 'off_plan';

/** Search — instant substring filtering + natural-language parsing, with a
 *  platform-wide filter bar and a filters sheet. */
export default function SearchScreen() {
  const { listings } = useExperience();
  const { isSaved, toggle } = useSaved();
  const { refreshing, onRefresh } = usePullRefresh();
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState('');
  const [smart, setSmart] = useState<ParsedFilters | null>(null);
  const [purpose, setPurpose] = useState<Purpose>('');
  const [category, setCategory] = useState<Category>('');
  const [completion, setCompletion] = useState<Completion>('');
  const [beds, setBeds] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);

  const communityOptions = useMemo(
    () => Array.from(new Set(listings.map((l) => l.community).filter(Boolean))) as string[],
    [listings],
  );

  function runSmart(text: string) {
    const query = text.trim();
    if (!query) return;
    const f = parseSearch(query, communityOptions);
    setSmart(f);
    setCompletion(f.completion ?? '');
    setBeds('');
  }
  function clearAll() {
    setSmart(null); setQ(''); setCompletion(''); setBeds('');
    setPurpose(''); setCategory(''); setTypes([]); setMaxPrice(null);
  }
  const toggleType = (t: string) => setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const f = smart;
    return listings.filter((l) => {
      if (!f && query) {
        const hay = [l.title, l.community, l.building, l.city, l.developerName].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (purpose && l.purpose !== purpose) return false;
      if (category && l.category !== category) return false;
      if (completion && l.completion !== completion) return false;
      if (types.length && !types.includes(l.propertyType)) return false;
      if (maxPrice && l.priceAed > maxPrice) return false;
      if (beds) {
        if (beds === 'Studio' && l.bedrooms !== 0) return false;
        else if (beds === '4+' && (l.bedrooms ?? 0) < 4) return false;
        else if (!['Studio', '4+'].includes(beds) && l.bedrooms !== Number(beds)) return false;
      }
      if (f?.community && !(l.community ?? '').toLowerCase().includes(f.community.toLowerCase())) return false;
      if (f?.minBeds != null && (l.bedrooms ?? -1) < f.minBeds) return false;
      if (f?.maxBeds != null && (l.bedrooms ?? 99) > f.maxBeds) return false;
      if (f?.types.length && !f.types.includes(l.propertyType)) return false;
      if (f?.minPrice && l.priceAed < f.minPrice) return false;
      if (f?.maxPrice && l.priceAed > f.maxPrice) return false;
      if (f?.amenities.length) {
        const hay = [...(l.amenities ?? []), l.title, l.community ?? ''].join(' ').toLowerCase();
        if (!f.amenities.every((a) => hay.includes(a))) return false;
      }
      return true;
    });
  }, [listings, q, smart, purpose, category, completion, beds, types, maxPrice]);

  const activeCount = [purpose, category, completion, beds, maxPrice ? '1' : '', types.length ? '1' : ''].filter(Boolean).length;

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <GlassBg />
      <View className="px-4 pb-2 pt-2">
        <Text className="mb-3 text-2xl font-bold text-ink">Search</Text>
        <Glass rounded={999} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          {smart ? <Sparkles size={18} color={colors.accent} /> : <SearchIcon size={18} color={colors.graphite} />}
          <TextInput
            value={q}
            onChangeText={(t) => { setQ(t); if (smart) setSmart(null); }}
            onSubmitEditing={() => runSmart(q)}
            returnKeyType="search"
            placeholder="Describe your ideal home…"
            placeholderTextColor={colors.graphiteLight}
            className="flex-1 text-base text-ink"
          />
          {q ? <Pressable onPress={clearAll} hitSlop={8}><X size={18} color={colors.graphite} /></Pressable> : null}
        </Glass>

        {/* Filter bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          <Pressable onPress={() => setSheet(true)} className="flex-row items-center gap-1.5 rounded-full border border-ink bg-ink px-3.5 py-1.5">
            <SlidersHorizontal size={14} color="#fff" />
            <Text className="text-[13px] font-semibold text-white">Filters{activeCount ? ` · ${activeCount}` : ''}</Text>
          </Pressable>
          <Seg options={[['', 'Buy/Rent'], ['sale', 'Buy'], ['rent', 'Rent']]} value={purpose} onChange={(v) => setPurpose(v as Purpose)} />
          {(['', 'ready', 'off_plan'] as const).map((c) => (
            <Chip key={c || 'all'} active={completion === c} onPress={() => setCompletion(c)}>
              {c === '' ? 'All' : c === 'ready' ? 'Ready' : 'Off-plan'}
            </Chip>
          ))}
          <Seg options={[['', 'Any use'], ['residential', 'Residential'], ['commercial', 'Commercial']]} value={category} onChange={(v) => setCategory(v as Category)} />
        </ScrollView>

        {smart ? (
          <View className="mb-1 flex-row items-center justify-between rounded-2xl border border-accent/20 bg-accent/5 px-3.5 py-2.5">
            <View className="flex-row items-center gap-1.5"><Sparkles size={13} color={colors.accent} /><Text className="text-xs font-semibold text-accent">Smart search on</Text></View>
            <Pressable onPress={clearAll} className="flex-row items-center gap-1"><Text className="text-xs text-graphite">Clear</Text><X size={13} color={colors.graphite} /></Pressable>
          </View>
        ) : !q ? (
          <Pressable onPress={() => { setQ(EXAMPLE); runSmart(EXAMPLE); }} className="mb-1 flex-row items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 px-3.5 py-2.5">
            <Sparkles size={15} color={colors.accent} /><Text className="text-[13px] text-graphite">Try: <Text className="text-ink">“{EXAMPLE}”</Text></Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(l) => l.reference}
        contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: insets.bottom + 110, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={<Text className="pb-1 text-[13px] text-graphite">{results.length} {results.length === 1 ? 'home' : 'homes'}</Text>}
        renderItem={({ item }) => (
          <RichCard listing={item} saved={isSaved(item.reference)} onToggle={() => toggle(item.reference)} />
        )}
        ListEmptyComponent={<Text className="mt-16 text-center text-graphite">No homes match. Try clearing a filter.</Text>}
      />

      {/* Filters sheet */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable onPress={() => setSheet(false)} className="flex-1 bg-black/40" />
        <View style={{ paddingBottom: insets.bottom + 16 }} className="rounded-t-3xl bg-paper px-5 pt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink">Filters</Text>
            <Pressable onPress={() => setSheet(false)} hitSlop={8}><X size={22} color={colors.ink} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <Section title="Purpose">
              {(['', 'sale', 'rent'] as const).map((p) => <Chip key={p || 'any'} active={purpose === p} onPress={() => setPurpose(p)}>{p === '' ? 'Any' : p === 'sale' ? 'Buy' : 'Rent'}</Chip>)}
            </Section>
            <Section title="Use">
              {(['', 'residential', 'commercial'] as const).map((c) => <Chip key={c || 'any'} active={category === c} onPress={() => setCategory(c)}>{c === '' ? 'Any' : cap(c)}</Chip>)}
            </Section>
            <Section title="Completion">
              {(['', 'ready', 'off_plan'] as const).map((c) => <Chip key={c || 'any'} active={completion === c} onPress={() => setCompletion(c)}>{c === '' ? 'Any' : c === 'ready' ? 'Ready' : 'Off-plan'}</Chip>)}
            </Section>
            <Section title="Property type">
              {TYPES.map((t) => <Chip key={t} active={types.includes(t)} onPress={() => toggleType(t)}>{cap(t)}</Chip>)}
            </Section>
            <Section title="Bedrooms">
              {BED_CHIPS.map((b) => <Chip key={b} active={beds === b} onPress={() => setBeds(beds === b ? '' : b)}>{b === 'Studio' ? b : `${b} bed`}</Chip>)}
            </Section>
            <Section title="Max price">
              {PRICE_BANDS.map((p) => <Chip key={p.label} active={maxPrice === p.value} onPress={() => setMaxPrice(maxPrice === p.value ? null : p.value)}>{p.label}</Chip>)}
            </Section>
          </ScrollView>
          <View className="mt-3 flex-row gap-3">
            <Pressable onPress={() => { setPurpose(''); setCategory(''); setCompletion(''); setBeds(''); setTypes([]); setMaxPrice(null); }} className="flex-1 items-center rounded-full border border-hairline py-3.5">
              <Text className="text-[15px] font-semibold text-ink">Reset</Text>
            </Pressable>
            <Pressable onPress={() => setSheet(false)} className="flex-[2] items-center rounded-full bg-ink py-3.5">
              <Text className="text-[15px] font-semibold text-white">Show {results.length} {results.length === 1 ? 'home' : 'homes'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RichCard({ listing, saved, onToggle }: { listing: ExperienceListing; saved: boolean; onToggle: () => void }) {
  const offPlan = listing.completion === 'off_plan';
  return (
    <Pressable onPress={() => router.push(`/property/${listing.reference}`)} className="overflow-hidden rounded-3xl border border-white/60 bg-white/75">
      <View className="relative">
        <Image source={{ uri: listing.cover }} style={{ width: '100%', aspectRatio: 1.6 }} contentFit="cover" transition={150} />
        <View className="absolute left-3 top-3 flex-row gap-1.5">
          <Tag>{listing.purpose === 'rent' ? 'For Rent' : 'For Sale'}</Tag>
          <Tag>{offPlan ? 'Off-Plan' : 'Ready'}</Tag>
          {listing.isVerified ? <Tag icon>Verified</Tag> : null}
        </View>
        <Pressable onPress={onToggle} hitSlop={8} className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white/85">
          <Heart size={17} color={saved ? '#f43f5e' : colors.ink} fill={saved ? '#f43f5e' : 'transparent'} />
        </Pressable>
      </View>
      <View className="p-3.5">
        <Text className="text-[19px] font-bold text-ink">{formatAed(listing.priceAed)}</Text>
        <View className="mt-2 flex-row items-center gap-4">
          <Fact icon={<BedDouble size={15} color={colors.graphite} />} text={listing.bedrooms != null ? bedLabel(listing.bedrooms) : '—'} />
          <Fact icon={<Bath size={15} color={colors.graphite} />} text={`${listing.bathrooms ?? '—'}`} />
          <Fact icon={<Maximize size={15} color={colors.graphite} />} text={listing.areaSqft ? `${listing.areaSqft.toLocaleString()} sqft` : '—'} />
        </View>
        <Text className="mt-2 text-[14px] font-medium text-ink" numberOfLines={1}>{listing.title}</Text>
        <View className="mt-1 flex-row items-center gap-1">
          <MapPin size={13} color={colors.graphite} />
          <Text className="flex-1 text-[12.5px] text-graphite" numberOfLines={1}>{listing.community}, {listing.city}</Text>
          <Text className="text-[12px] text-graphiteLight">{cap(listing.propertyType)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <View className="flex-row items-center gap-1">{icon}<Text className="text-[12.5px] text-graphite">{text}</Text></View>;
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-black/55 px-2 py-0.5">
      {icon ? <ShieldCheck size={11} color="#fff" /> : null}
      <Text className="text-[11px] font-semibold text-white">{children}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-[13px] font-semibold text-graphite">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function Chip({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full px-3.5 py-1.5 ${active ? 'bg-ink' : 'border border-white/60 bg-white/55'}`}>
      <Text className={`text-[13px] font-medium ${active ? 'text-white' : 'text-graphite'}`}>{children}</Text>
    </Pressable>
  );
}

function Seg({ options, value, onChange }: { options: string[][]; value: string; onChange: (v: string) => void }) {
  const current = options.find((o) => o[0] === value) ?? options[0];
  const idx = options.findIndex((o) => o[0] === value);
  return (
    <Pressable
      onPress={() => onChange(options[(Math.max(0, idx) + 1) % options.length][0])}
      className={`rounded-full px-3.5 py-1.5 ${value ? 'bg-ink' : 'border border-white/60 bg-white/55'}`}
    >
      <Text className={`text-[13px] font-medium ${value ? 'text-white' : 'text-graphite'}`}>{current[1]}</Text>
    </Pressable>
  );
}
