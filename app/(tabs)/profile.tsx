import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { Heart, Eye, Coins, Plus, ChevronRight, RotateCcw, LogIn, LogOut, Trash2, Building2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useSaved } from '@/store/saved';
import { useSignals } from '@/store/signals';
import { useExperience } from '@/store/experience';
import { usePullRefresh } from '@/lib/use-refresh';
import { GlassBg } from '@/components/Glass';
import { formatCredits } from '@/data/experience-data';
import { colors } from '@/theme/tokens';
import type { Session } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { listings } = useExperience();
  const { decisions, savedRefs, reset } = useSaved();
  const { reset: resetSignals } = useSignals();
  const { refreshing, onRefresh } = usePullRefresh();
  const [session, setSession] = useState<Session | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) setShowAuth(false); });
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    return () => sub.subscription.unsubscribe();
  }, []);

  async function apple() {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) return Alert.alert('Apple sign-in', 'No identity token returned.');
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
      if (error) Alert.alert('Apple sign-in', error.message);
    } catch (e) {
      // User cancelled the native sheet — not an error.
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple sign-in', (e as Error)?.message ?? 'Failed');
    }
  }

  const seen = Object.keys(decisions).length;
  const pendingCredits = listings
    .filter((l) => decisions[l.reference] === 'saved')
    .reduce((sum, l) => sum + l.credit.credits, 0);
  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email?.split('@')[0] || 'Guest';

  async function submitEmail() {
    setBusy(true);
    try {
      const { error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('Auth', error.message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    // Deep link back into THIS app (iclose://auth-callback in a build,
    // exp://…/auth-callback in Expo Go). This must be in Supabase →
    // Authentication → URL Configuration → Redirect URLs, or Supabase falls
    // back to the project's Site URL (academy.iclose.ae).
    const redirectTo = Linking.createURL('auth-callback');
    console.log('[auth] OAuth redirectTo =', redirectTo); // must be allow-listed in Supabase Redirect URLs
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data?.url) return Alert.alert('Google sign-in', error?.message ?? 'Could not start sign-in.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return; // user cancelled / dismissed

    // Implicit flow returns tokens in the URL fragment (#access_token=…&refresh_token=…).
    // (Also handle ?code=… in case a build uses PKCE.)
    const frag = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] ?? '';
    const params = new URLSearchParams(frag);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const code = params.get('code');

    if (access_token && refresh_token) {
      const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
      if (e) Alert.alert('Google sign-in', e.message);
    } else if (code) {
      const { error: e } = await supabase.auth.exchangeCodeForSession(result.url);
      if (e) Alert.alert('Google sign-in', e.message);
    } else {
      Alert.alert(
        'Add this redirect URL in Supabase',
        `Authentication → URL Configuration → Redirect URLs:\n\n${redirectTo}\n\n(or the wildcard ${redirectTo.split('://')[0]}://** )`,
      );
    }
  }

  function confirmReset() {
    Alert.alert('Reset activity', 'Clear your saved homes and personalised feed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { reset(); resetSignals(); } },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your Noel account and your saved data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
      ],
    );
  }

  async function deleteAccount() {
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) return Alert.alert('Delete account', error.message);
      reset();
      resetSignals();
      await supabase.auth.signOut();
      Alert.alert('Account deleted', 'Your account and data have been permanently removed.');
    } catch (e) {
      Alert.alert('Delete account', (e as Error)?.message ?? 'Could not delete the account.');
    }
  }

  return (
    <View className="flex-1">
      <GlassBg />
      <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Identity */}
      <View className="mb-5 mt-2 flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-ink"><Text className="text-[22px] font-semibold text-white">{name.charAt(0).toUpperCase()}</Text></View>
        <View className="flex-1">
          <Text className="text-[22px] font-semibold text-ink" numberOfLines={1}>{name}</Text>
          <Text className="text-sm text-graphite" numberOfLines={1}>{session ? session.user.email : 'Sign in to sync your shortlist & credits'}</Text>
        </View>
      </View>

      {!session ? (
        <Pressable onPress={() => setShowAuth((s) => !s)} className="mb-4 flex-row items-center justify-center gap-2 rounded-full bg-ink py-3.5">
          <LogIn size={18} color="#fff" /><Text className="text-[15px] font-semibold text-white">Sign in or create account</Text>
        </Pressable>
      ) : null}

      {/* Inline auth */}
      {!session && showAuth ? (
        <View className="mb-4 gap-3 rounded-apple border border-white/60 bg-white/70 p-4">
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.graphiteLight} className="rounded-2xl border border-white/50 bg-white/60 px-4 py-3.5 text-base text-ink" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry placeholderTextColor={colors.graphiteLight} className="rounded-2xl border border-white/50 bg-white/60 px-4 py-3.5 text-base text-ink" />
          <Pressable disabled={busy} onPress={submitEmail} className="rounded-full bg-accent py-3.5"><Text className="text-center font-semibold text-white">{mode === 'login' ? 'Sign in' : 'Sign up'}</Text></Pressable>
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={999}
              style={{ height: 48, width: '100%' }}
              onPress={apple}
            />
          ) : null}
          <Pressable onPress={google} className="rounded-full border border-hairline py-3.5"><Text className="text-center font-semibold text-ink">Continue with Google</Text></Pressable>
          <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}><Text className="text-center text-accent">{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text></Pressable>
        </View>
      ) : null}

      {/* List your property */}
      <Pressable onPress={() => router.push('/sell')} className="mb-4 flex-row items-center gap-3 rounded-apple bg-ink p-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white/15"><Plus size={24} color="#fff" /></View>
        <View className="flex-1"><Text className="text-[15px] font-semibold text-white">List your property</Text><Text className="text-[13px] text-white/65">Sell direct · commission-free</Text></View>
        <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>

      {/* My listings — signed-in only */}
      {session ? (
        <Pressable onPress={() => router.push('/my-listings')} className="mb-4 flex-row items-center gap-3 rounded-apple border border-white/60 bg-white/70 p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/10"><Building2 size={22} color={colors.accent} /></View>
          <View className="flex-1"><Text className="text-[15px] font-semibold text-ink">My listings</Text><Text className="text-[13px] text-graphite">Track your submitted properties</Text></View>
          <ChevronRight size={20} color={colors.graphiteLight} />
        </Pressable>
      ) : null}

      {/* Credits balance */}
      <View className="mb-4 rounded-apple border border-white/60 bg-white/70 p-5">
        <View className="flex-row items-center gap-2"><Coins size={16} color={colors.accent} /><Text className="text-[13px] text-graphite">Noel credits balance</Text></View>
        <Text className="mt-1.5 text-[34px] font-semibold text-ink">0</Text>
        {pendingCredits > 0 ? <Text className="mt-1 text-[13px] text-graphite">{formatCredits(pendingCredits)} credits waiting across your shortlist</Text> : null}
      </View>

      {/* Stats */}
      <View className="mb-4 flex-row gap-3">
        <Pressable onPress={() => router.push('/saved')} className="flex-1 items-start gap-1 rounded-apple border border-white/60 bg-white/70 p-4">
          <Heart size={20} color={colors.accent} />
          <Text className="text-[22px] font-semibold text-ink">{savedRefs.length}</Text>
          <Text className="text-[13px] text-graphite">Saved homes</Text>
        </Pressable>
        <View className="flex-1 items-start gap-1 rounded-apple border border-white/60 bg-white/70 p-4">
          <Eye size={20} color={colors.accent} />
          <Text className="text-[22px] font-semibold text-ink">{seen}</Text>
          <Text className="text-[13px] text-graphite">Homes explored</Text>
        </View>
      </View>

      {/* Reset activity */}
      <Pressable onPress={confirmReset} className="flex-row items-center gap-3 rounded-apple border border-white/60 bg-white/70 p-4">
        <RotateCcw size={20} color={colors.graphite} />
        <Text className="flex-1 text-base text-ink">Reset activity</Text>
        <ChevronRight size={18} color={colors.graphiteLight} />
      </Pressable>

      {session ? (
        <>
          <Pressable onPress={() => supabase.auth.signOut()} className="mt-4 flex-row items-center justify-center gap-2 rounded-apple border border-hairline py-4">
            <LogOut size={18} color={colors.ink} /><Text className="font-semibold text-ink">Sign out</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} className="mt-3 flex-row items-center justify-center gap-2 py-3">
            <Trash2 size={16} color="#e11d48" /><Text className="font-semibold" style={{ color: '#e11d48' }}>Delete account</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
    </View>
  );
}
