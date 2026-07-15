import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShieldCheck, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useShares } from '@/store/shares';
import { GlassBg } from '@/components/Glass';
import { completeKyc } from '@/lib/shares';
import { colors } from '@/theme/tokens';

export default function KycModal() {
  const s = useShares();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(s.wallet?.kycName ?? '');
  const [eid, setEid] = useState('');
  const [accredited, setAccredited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && eid.trim().length >= 6 && accredited;

  async function submit() {
    if (!valid) return;
    setBusy(true); setError(null);
    try {
      await completeKyc(name.trim(), eid.trim());
      await s.refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!s.signedIn) {
    return (
      <View className="flex-1">
        <GlassBg />
        <View style={{ paddingTop: insets.top + 8 }} className="flex-row justify-end px-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-black/5">
            <X size={20} color={colors.ink} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[15px] text-graphite">Please sign in first to verify your account.</Text>
          <Pressable onPress={() => { router.back(); router.push('/(tabs)/profile'); }} className="mt-4 rounded-full bg-accent px-5 py-3">
            <Text className="font-semibold text-white">Go to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <GlassBg />
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-4">
        <Text className="text-[18px] font-semibold text-ink">Verify your account</Text>
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-black/5">
          <X size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start gap-2.5 rounded-2xl border border-white/60 bg-white/75 p-4">
          <ShieldCheck size={20} color={colors.accent} />
          <Text className="flex-1 text-[12.5px] leading-4 text-graphite">
            A quick verification (KYC) is required before investing, as required for any VARA-regulated platform.
            Your details are kept private and used only to set up your account.
          </Text>
        </View>

        <Text className="mb-1.5 mt-5 text-[12px] font-medium text-ink700">Full legal name</Text>
        <TextInput
          value={name} onChangeText={setName} placeholder="As on your Emirates ID" placeholderTextColor={colors.graphiteLight}
          className="rounded-2xl border border-hairline bg-white/80 px-4 py-3.5 text-[15px] text-ink"
        />

        <Text className="mb-1.5 mt-4 text-[12px] font-medium text-ink700">Emirates ID number</Text>
        <TextInput
          value={eid} onChangeText={setEid} placeholder="784-XXXX-XXXXXXX-X" placeholderTextColor={colors.graphiteLight}
          keyboardType="numbers-and-punctuation"
          className="rounded-2xl border border-hairline bg-white/80 px-4 py-3.5 text-[15px] text-ink"
        />

        <Pressable onPress={() => setAccredited((v) => !v)} className="mt-5 flex-row items-start gap-3">
          <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${accredited ? 'border-accent bg-accent' : 'border-hairline bg-white'}`}>
            {accredited ? <Check size={14} color="#fff" /> : null}
          </View>
          <Text className="flex-1 text-[12.5px] leading-4 text-graphite">
            I confirm the details above are mine and I agree to the Noel Shares terms.
          </Text>
        </Pressable>

        {error ? <Text className="mt-3 text-center text-[13px] text-rose-600">{error}</Text> : null}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12 }} className="border-t border-hairline/50 bg-white/90 px-4 pt-3">
        <Pressable disabled={!valid || busy} onPress={submit}
          className={`items-center rounded-full py-4 ${valid && !busy ? 'bg-accent' : 'bg-black/15'}`}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-[15px] font-semibold text-white">Verify & continue</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
