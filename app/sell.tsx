import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  X, Home, CheckCircle2, ImagePlus, FileText, Trash2, LogIn, ShieldCheck, Plus,
} from 'lucide-react-native';
import {
  getSellerIdentity, submitListing,
  type SellerIdentity, type PickedPhoto, type PickedDoc,
} from '@/lib/listing-submit';
import { GlassBg } from '@/components/Glass';
import { colors } from '@/theme/tokens';

const PROPERTY_TYPES = ['apartment', 'villa', 'townhouse', 'penthouse', 'plot', 'office'];
const fmtSize = (b?: number | null) => (b == null ? '' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** List-your-property flow (modal, sale only) — uploads photos + documents on-platform. */
export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const [identity, setIdentity] = useState<SellerIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
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
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [docs, setDocs] = useState<PickedDoc[]>([]);

  useEffect(() => {
    getSellerIdentity().then((id) => {
      if (id) {
        setIdentity(id);
        setContactName(id.name);
        setContactEmail(id.email);
        setContactPhone(id.phone);
      }
      setReady(true);
    });
  }, []);

  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Allow photos', 'Enable photo access to add images of your property.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 12, quality: 0.7, base64: true,
    });
    if (res.canceled) return;
    setPhotos((prev) => [...prev, ...res.assets.map((a) => ({ uri: a.uri, base64: a.base64, mimeType: a.mimeType }))].slice(0, 15));
  }

  async function pickDocs() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    setDocs((prev) => [...prev, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size }))].slice(0, 10));
  }

  async function submit() {
    if (!identity) { router.push('/(tabs)/profile'); return; }
    if (!title.trim() || !community.trim() || !price.trim()) {
      Alert.alert('Missing details', 'Add at least a title, community and price.'); return;
    }
    if (photos.length === 0) { Alert.alert('Add photos', 'Please add at least one photo of the property.'); return; }
    setBusy(true); setProgress({ done: 0, total: photos.length + docs.length });
    try {
      await submitListing(
        {
          title: title.trim(), propertyType, community: community.trim(), city: city.trim() || 'Dubai',
          priceAed: Number(price.replace(/[^0-9]/g, '')) || 0,
          bedrooms: bedrooms ? Number(bedrooms) : null, bathrooms: bathrooms ? Number(bathrooms) : null,
          areaSqft: area ? Number(area.replace(/[^0-9]/g, '')) : null, description: description.trim(),
          contactName: contactName.trim(), contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim(),
        },
        photos, docs, (d, t) => setProgress({ done: d, total: t }),
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
        <Text className="mt-5 text-center text-2xl font-bold text-ink">Listing submitted</Text>
        <Text className="mt-2 text-center text-base text-graphite">
          Our team will verify your details and documents, then publish your home. We’ll be in touch on {contactPhone || 'your contact'}.
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
          <Text className="text-center text-2xl font-bold text-ink">List your home in minutes</Text>
          <Text className="text-center text-base text-graphite">
            Add your photos and ownership documents securely — it all happens through Noel. Our team verifies and publishes your home.
          </Text>
          {ready && !identity ? (
            <Pressable onPress={() => { router.back(); router.push('/(tabs)/profile'); }} className="mt-2 w-full flex-row items-center justify-center gap-2 rounded-apple bg-ink py-4">
              <LogIn size={18} color="#fff" /><Text className="text-center font-semibold text-white">Sign in to list</Text>
            </Pressable>
          ) : (
            <Pressable disabled={!ready} onPress={() => setStarted(true)} className="mt-2 w-full rounded-apple bg-ink py-4">
              <Text className="text-center font-semibold text-white">{ready ? 'Start a listing' : 'Loading…'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  /* ---------- form ---------- */
  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}><GlassBg />
      <View className="flex-row items-center justify-between px-5 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-2xl font-bold text-ink">New listing</Text>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70"><X size={20} color={colors.ink} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Bright 2BR with Marina view" />

        <Text className="mb-1.5 text-sm font-medium text-graphite">Property type</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={propertyType === t} onPress={() => setPropertyType(t)} />
          ))}
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

        {/* Photos */}
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-graphite">Photos</Text>
          <Text className="text-xs text-graphiteLight">{photos.length}/15</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
          <Pressable onPress={pickPhotos} className="h-24 w-24 items-center justify-center gap-1 rounded-2xl border border-dashed border-graphiteLight/60 bg-white/60">
            <ImagePlus size={22} color={colors.accent} /><Text className="text-[11px] text-graphite">Add</Text>
          </Pressable>
          {photos.map((p, i) => (
            <View key={p.uri + i} className="relative h-24 w-24 overflow-hidden rounded-2xl">
              <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              <Pressable onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/55">
                <X size={13} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* Ownership documents */}
        <View className="mb-1 mt-4 flex-row items-center gap-1.5">
          <ShieldCheck size={15} color={colors.accent} />
          <Text className="text-sm font-medium text-graphite">Ownership documents</Text>
        </View>
        <Text className="mb-2 text-[12px] leading-4 text-graphiteLight">
          Title deed, Oqood, sale & purchase agreement, or your Emirates ID. Stored securely and shared only with our verification team.
        </Text>
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

        {/* Contact (auto-filled) */}
        <Text className="mb-1 mt-6 text-sm font-semibold text-ink">Your contact</Text>
        <Text className="mb-2 text-[12px] text-graphiteLight">Pulled from your account — edit if needed.</Text>
        <Field label="Name" value={contactName} onChangeText={setContactName} placeholder="Full name" />
        <Field label="Email" value={contactEmail} onChangeText={setContactEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={contactPhone} onChangeText={setContactPhone} placeholder="+971 50 000 0000" keyboardType="phone-pad" />

        <Pressable disabled={busy} onPress={submit} className="mt-4 flex-row items-center justify-center gap-2 rounded-apple bg-accent py-4">
          {busy ? <ActivityIndicator color="#fff" /> : null}
          <Text className="text-center text-base font-semibold text-white">
            {busy ? (progress && progress.total ? `Uploading ${progress.done}/${progress.total}…` : 'Submitting…') : 'Submit listing'}
          </Text>
        </Pressable>
        <Text className="mt-2 text-center text-[11px] text-graphiteLight">By submitting you confirm you’re the owner or authorised to list this property.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-graphite">{label}</Text>
      <TextInput placeholderTextColor={colors.graphiteLight}
        className="rounded-apple border border-white/60 bg-white/70 px-4 py-3.5 text-base text-ink" {...props} />
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
