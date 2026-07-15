import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  X, Home, CheckCircle2, ImagePlus, FileText, Trash2, LogIn, ShieldCheck, Plus, Play,
  ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import {
  getSellerIdentity, submitListing,
  type SellerIdentity, type PickedDoc,
} from '@/lib/listing-submit';
import { GlassBg } from '@/components/Glass';
import { colors } from '@/theme/tokens';

const PROPERTY_TYPES = ['apartment', 'villa', 'townhouse', 'penthouse', 'plot', 'office', 'retail'];
const fmtSize = (b?: number | null) => (b == null ? '' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

const MAX_MEDIA = 10;
const FRAME_W = Dimensions.get('window').width - 40;
const FRAME_H = Math.round(FRAME_W * 5 / 4); // portrait 4:5
const STEPS = ['media', 'details', 'documents'] as const;
type Step = (typeof STEPS)[number];
type Media = { uri: string; mimeType: string; kind: 'image' | 'video'; posterUri?: string };

/** List-your-property — a 3-step, Instagram-style flow: media → details → docs. */
export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const [identity, setIdentity] = useState<SellerIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<Step>('media');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [purpose, setPurpose] = useState<'sale' | 'rent'>('sale');
  const [completion, setCompletion] = useState<'ready' | 'off_plan'>('ready');
  const [category, setCategory] = useState<'residential' | 'commercial'>('residential');
  const [community, setCommunity] = useState('');
  const [city, setCity] = useState('Dubai');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [docs, setDocs] = useState<PickedDoc[]>([]);

  useEffect(() => {
    getSellerIdentity().then((id) => {
      if (id) {
        setIdentity(id);
        setContactName(id.name); setContactEmail(id.email); setContactPhone(id.phone);
      }
      setReady(true);
    });
  }, []);

  async function pickMedia() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Allow access', 'Enable photo & video access to add media of your property.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: MAX_MEDIA, quality: 0.7,
    });
    if (res.canceled) return;
    // Accept everything — the portrait frame below crops to a 4:5 section, so we
    // never reject a landscape photo/video; it's just shown cropped to portrait.
    // Videos get a generated poster frame so they never render blank.
    const picked: Media[] = [];
    for (const a of res.assets) {
      const isVideo = a.type === 'video';
      let posterUri: string | undefined;
      if (isVideo) {
        try { posterUri = (await VideoThumbnails.getThumbnailAsync(a.uri, { time: 1000, quality: 0.7 })).uri; }
        catch { /* poster is best-effort */ }
      }
      picked.push({
        uri: a.uri,
        mimeType: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        kind: isVideo ? 'video' : 'image',
        posterUri,
      });
    }
    setMedia((prev) => [...prev, ...picked].slice(0, MAX_MEDIA));
  }
  function removeMedia(i: number) { setMedia((prev) => prev.filter((_, j) => j !== i)); setMediaIdx(0); }

  async function pickDocs() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    setDocs((prev) => [...prev, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size }))].slice(0, 10));
  }

  function next() {
    if (step === 'media') {
      if (media.length === 0) { Alert.alert('Add media', 'Add at least one photo or video.'); return; }
      setStep('details'); return;
    }
    if (step === 'details') {
      if (!title.trim() || !community.trim() || !price.trim()) { Alert.alert('Missing details', 'Add at least a title, community and price.'); return; }
      setStep('documents'); return;
    }
  }
  function back() {
    if (step === 'details') setStep('media');
    else if (step === 'documents') setStep('details');
  }

  async function submit() {
    if (!identity) { router.push('/(tabs)/profile'); return; }
    setBusy(true); setProgress({ done: 0, total: media.length + docs.length });
    try {
      await submitListing(
        {
          title: title.trim(), propertyType, purpose, completion, category,
          community: community.trim(), city: city.trim() || 'Dubai',
          priceAed: Number(price.replace(/[^0-9]/g, '')) || 0,
          bedrooms: bedrooms ? Number(bedrooms) : null, bathrooms: bathrooms ? Number(bathrooms) : null,
          areaSqft: area ? Number(area.replace(/[^0-9]/g, '')) : null, description: description.trim(),
          contactName: contactName.trim(), contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim(),
        },
        media, docs, (d, t) => setProgress({ done: d, total: t }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); setProgress(null); }
  }

  /* ---------- success ---------- */
  if (done) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ paddingTop: insets.top }}><GlassBg />
        <View className="h-20 w-20 items-center justify-center rounded-full bg-journey-listing/30"><CheckCircle2 size={40} color={colors.accent} /></View>
        <Text className="mt-5 text-center text-2xl font-bold text-ink">Submitted for approval</Text>
        <Text className="mt-2 text-center text-base text-graphite">
          Our team verifies your details and documents, then publishes your home. We’ll be in touch on {contactPhone || 'your contact'}.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-8 w-full rounded-apple bg-ink py-4"><Text className="text-center font-semibold text-white">Done</Text></Pressable>
      </View>
    );
  }

  /* ---------- intro ---------- */
  if (!started) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}><GlassBg />
        <View className="flex-row justify-end px-5">
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70"><X size={20} color={colors.ink} /></Pressable>
        </View>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-journey-listing/30"><Home size={30} color={colors.ink} /></View>
          <Text className="text-center text-2xl font-bold text-ink">Post your home like a story</Text>
          <Text className="text-center text-base text-graphite">Add a carousel of portrait photos and videos, then a few details. Our team verifies and publishes it.</Text>
          {ready && !identity ? (
            <Pressable onPress={() => { router.back(); router.push('/(tabs)/profile'); }} className="mt-2 w-full flex-row items-center justify-center gap-2 rounded-apple bg-ink py-4">
              <LogIn size={18} color="#fff" /><Text className="text-center font-semibold text-white">Sign in to list</Text>
            </Pressable>
          ) : (
            <Pressable disabled={!ready} onPress={() => setStarted(true)} className="mt-2 w-full rounded-apple bg-ink py-4">
              <Text className="text-center font-semibold text-white">{ready ? 'Create a listing' : 'Loading…'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  /* ---------- wizard ---------- */
  const stepIndex = STEPS.indexOf(step);
  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}><GlassBg />
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => (step === 'media' ? router.back() : back())} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70">
          {step === 'media' ? <X size={20} color={colors.ink} /> : <ChevronLeft size={22} color={colors.ink} />}
        </Pressable>
        <Text className="text-[17px] font-bold text-ink">{step === 'media' ? 'New listing' : step === 'details' ? 'Details' : 'Documents'}</Text>
        {step === 'documents' ? (
          <View className="h-9 w-9" />
        ) : (
          <Pressable onPress={next} hitSlop={8} className="h-9 flex-row items-center justify-center rounded-full bg-ink px-3.5">
            <Text className="text-[14px] font-semibold text-white">Next</Text><ChevronRight size={16} color="#fff" />
          </Pressable>
        )}
      </View>
      {/* Step progress */}
      <View className="flex-row gap-1.5 px-4 pb-2">
        {STEPS.map((_, i) => (
          <View key={i} style={{ height: 3, flex: 1, borderRadius: 2 }} className={i <= stepIndex ? 'bg-ink' : 'bg-hairline'} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {step === 'media' ? (
          <>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-graphite">Photos & videos</Text>
              <Text className="text-xs text-graphiteLight">{media.length}/{MAX_MEDIA} · portrait</Text>
            </View>
            {media.length === 0 ? (
              <Pressable onPress={pickMedia} style={{ width: FRAME_W, height: FRAME_H }} className="items-center justify-center gap-2 self-center rounded-3xl border border-dashed border-graphiteLight/60 bg-white/60">
                <ImagePlus size={30} color={colors.accent} />
                <Text className="text-[15px] font-semibold text-ink">Add photos & videos</Text>
                <Text className="text-[12px] text-graphiteLight">Any photo or video — shown cropped to portrait</Text>
              </Pressable>
            ) : (
              <View>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setMediaIdx(Math.round(e.nativeEvent.contentOffset.x / FRAME_W))}
                  style={{ width: FRAME_W, height: FRAME_H, borderRadius: 24 }} className="self-center overflow-hidden">
                  {media.map((m, i) => (
                    <View key={m.uri + i} style={{ width: FRAME_W, height: FRAME_H }} className="bg-ink">
                      {m.kind === 'image' ? (
                        <Image source={{ uri: m.uri }} style={{ width: FRAME_W, height: FRAME_H }} contentFit="cover" />
                      ) : (
                        <>
                          {m.posterUri ? <Image source={{ uri: m.posterUri }} style={{ width: FRAME_W, height: FRAME_H }} contentFit="cover" /> : null}
                          <View className="absolute inset-0 items-center justify-center">
                            <View className="h-16 w-16 items-center justify-center rounded-full bg-black/45"><Play size={30} color="#fff" fill="#fff" /></View>
                          </View>
                        </>
                      )}
                      <View className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1"><Text className="text-[11px] font-semibold text-white">{i + 1}/{media.length}</Text></View>
                      <Pressable onPress={() => removeMedia(i)} className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/55"><X size={16} color="#fff" /></Pressable>
                    </View>
                  ))}
                </ScrollView>
                <View className="mt-3 flex-row items-center justify-center gap-1.5">
                  {media.map((_, i) => (<View key={i} style={{ height: 6, width: i === mediaIdx ? 16 : 6, borderRadius: 3 }} className={i === mediaIdx ? 'bg-ink' : 'bg-hairline'} />))}
                </View>
                {media.length < MAX_MEDIA ? (
                  <Pressable onPress={pickMedia} className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-graphiteLight/60 bg-white/60 py-3">
                    <Plus size={16} color={colors.accent} /><Text className="text-[13.5px] font-medium text-ink">Add more</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </>
        ) : step === 'details' ? (
          <>
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Bright 2BR with Marina view" />

            <Selector label="Listing for" value={purpose} onChange={setPurpose} options={[['sale', 'For sale'], ['rent', 'For rent']]} />
            <Selector label="Completion" value={completion} onChange={setCompletion} options={[['ready', 'Ready'], ['off_plan', 'Off-plan']]} />
            <Selector label="Use" value={category} onChange={setCategory} options={[['residential', 'Residential'], ['commercial', 'Commercial']]} />

            <Text className="mb-1.5 text-sm font-medium text-graphite">Property type</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => (<Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={propertyType === t} onPress={() => setPropertyType(t)} />))}
            </View>

            <Field label="Community" value={community} onChangeText={setCommunity} placeholder="e.g. Dubai Marina" />
            <Field label="City" value={city} onChangeText={setCity} placeholder="Dubai" />
            <Field label="Asking price (AED)" value={price} onChangeText={setPrice} placeholder="2650000" keyboardType="number-pad" />
            <View className="flex-row gap-3">
              <View className="flex-1"><Field label="Bedrooms" value={bedrooms} onChangeText={setBedrooms} placeholder="2" keyboardType="number-pad" /></View>
              <View className="flex-1"><Field label="Bathrooms" value={bathrooms} onChangeText={setBathrooms} placeholder="2" keyboardType="number-pad" /></View>
            </View>
            <Field label="Area (sqft)" value={area} onChangeText={setArea} placeholder="1180" keyboardType="number-pad" />

            <Text className="mb-1.5 text-sm font-medium text-graphite">Description</Text>
            <TextInput value={description} onChangeText={setDescription} multiline placeholder="Tell buyers what makes it special"
              placeholderTextColor={colors.graphiteLight}
              className="mb-5 min-h-[96px] rounded-apple border border-white/60 bg-white/70 px-4 py-3 text-base text-ink" style={{ textAlignVertical: 'top' }} />

            <Text className="mb-1 mt-1 text-sm font-semibold text-ink">Your contact</Text>
            <Text className="mb-2 text-[12px] text-graphiteLight">Pulled from your account — edit if needed.</Text>
            <Field label="Name" value={contactName} onChangeText={setContactName} placeholder="Full name" />
            <Field label="Email" value={contactEmail} onChangeText={setContactEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone" value={contactPhone} onChangeText={setContactPhone} placeholder="+971 50 000 0000" keyboardType="phone-pad" />
          </>
        ) : (
          <>
            <View className="mb-1 flex-row items-center gap-1.5">
              <ShieldCheck size={15} color={colors.accent} /><Text className="text-sm font-medium text-graphite">Ownership documents (optional)</Text>
            </View>
            <Text className="mb-3 text-[12px] leading-4 text-graphiteLight">Title deed, Oqood, sale & purchase agreement, or your Emirates ID. Stored securely and shared only with our verification team.</Text>
            <View className="gap-2">
              {docs.map((d, i) => (
                <View key={d.uri + i} className="flex-row items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-3.5 py-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/10"><FileText size={17} color={colors.accent} /></View>
                  <View className="flex-1"><Text className="text-[13.5px] font-medium text-ink" numberOfLines={1}>{d.name ?? 'Document'}</Text>
                    {d.size ? <Text className="text-[11px] text-graphiteLight">{fmtSize(d.size)}</Text> : null}</View>
                  <Pressable onPress={() => setDocs((prev) => prev.filter((_, j) => j !== i))} hitSlop={8}><Trash2 size={16} color={colors.graphite} /></Pressable>
                </View>
              ))}
              <Pressable onPress={pickDocs} className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-graphiteLight/60 bg-white/60 py-3">
                <Plus size={16} color={colors.accent} /><Text className="text-[13.5px] font-medium text-ink">Add documents</Text>
              </Pressable>
            </View>

            <Pressable disabled={busy} onPress={submit} className="mt-6 flex-row items-center justify-center gap-2 rounded-apple bg-accent py-4">
              {busy ? <ActivityIndicator color="#fff" /> : null}
              <Text className="text-center text-base font-semibold text-white">
                {busy ? (progress && progress.total ? `Uploading ${progress.done}/${progress.total}…` : 'Submitting…') : 'Submit for approval'}
              </Text>
            </Pressable>
            <Text className="mt-2 text-center text-[11px] text-graphiteLight">By submitting you confirm you’re the owner or authorised to list this property.</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-graphite">{label}</Text>
      <TextInput placeholderTextColor={colors.graphiteLight} className="rounded-apple border border-white/60 bg-white/70 px-4 py-3.5 text-base text-ink" {...props} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full border px-4 py-2 ${active ? 'border-ink bg-ink' : 'border-white/60 bg-white/70'}`}>
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

function Selector<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-graphite">{label}</Text>
      <View className="flex-row gap-2">
        {options.map(([v, l]) => (
          <Pressable key={v} onPress={() => onChange(v)} className={`flex-1 items-center rounded-2xl border py-3 ${value === v ? 'border-ink bg-ink' : 'border-white/60 bg-white/70'}`}>
            <Text className={`text-[14px] font-medium ${value === v ? 'text-white' : 'text-ink'}`}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
