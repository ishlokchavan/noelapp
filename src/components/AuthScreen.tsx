import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { GoogleIcon } from '@/components/icons/Google';
import { colors } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const BTN_H = 52;
const BTN_RADIUS = 14;

/**
 * Full sign-in experience — a proper flow (not an accordion). Rendered as the
 * logged-out state of the Profile tab. Providers are consistent, full-width
 * buttons with correct brand logos: native "Sign in with Apple" (iOS), Google
 * "G", then email/password with a login ⇄ create-account toggle.
 */
export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
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
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple sign-in', (e as Error)?.message ?? 'Failed');
    }
  }

  async function google() {
    // Deep link back into THIS app (noelapp://auth-callback in a build,
    // exp://…/auth-callback in Expo Go). Must be in Supabase → Authentication →
    // URL Configuration → Redirect URLs, or Supabase falls back to the Site URL.
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data?.url) return Alert.alert('Google sign-in', error?.message ?? 'Could not start sign-in.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return;

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
        `Authentication → URL Configuration → Redirect URLs:\n\n${redirectTo}`,
      );
    }
  }

  async function submitEmail() {
    if (!email || !password) return Alert.alert('Auth', 'Enter your email and password.');
    setBusy(true);
    try {
      const { error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      if (error) Alert.alert('Auth', error.message);
      else if (mode === 'signup') Alert.alert('Check your inbox', 'Confirm your email to finish creating your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32, paddingHorizontal: 28, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View className="mb-9 items-center">
          <View className="flex-row items-end">
            <Text className="text-[34px] font-bold text-ink">Noel</Text>
            <View className="mb-2 ml-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
          </View>
          <Text className="mt-2 text-center text-[15px] leading-6 text-graphite">
            Sign in to save homes you love and pick up right where you left off.
          </Text>
        </View>

        {/* Providers */}
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={BTN_RADIUS}
            style={{ height: BTN_H, width: '100%', marginBottom: 12 }}
            onPress={apple}
          />
        ) : null}

        <Pressable
          onPress={google}
          style={{ height: BTN_H, borderRadius: BTN_RADIUS }}
          className="mb-3 flex-row items-center justify-center gap-2.5 border border-hairline bg-white"
        >
          <GoogleIcon size={20} />
          <Text className="text-[16px] font-semibold text-ink">Continue with Google</Text>
        </Pressable>

        {/* Divider */}
        <View className="my-4 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-hairline" />
          <Text className="text-[13px] text-graphite">or</Text>
          <View className="h-px flex-1 bg-hairline" />
        </View>

        {/* Email */}
        <TextInput
          value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" placeholderTextColor={colors.graphiteLight}
          className="mb-3 rounded-2xl border border-hairline bg-white/70 px-4 py-4 text-base text-ink"
        />
        <TextInput
          value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholderTextColor={colors.graphiteLight}
          className="mb-4 rounded-2xl border border-hairline bg-white/70 px-4 py-4 text-base text-ink"
        />

        <Pressable
          disabled={busy} onPress={submitEmail}
          style={{ height: BTN_H, borderRadius: BTN_RADIUS, opacity: busy ? 0.6 : 1 }}
          className="items-center justify-center bg-ink"
        >
          <Text className="text-[16px] font-semibold text-white">{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-5 items-center py-1">
          <Text className="text-[14px] text-graphite">
            {mode === 'login' ? 'New to Noel? ' : 'Already have an account? '}
            <Text className="font-semibold text-accent">{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
