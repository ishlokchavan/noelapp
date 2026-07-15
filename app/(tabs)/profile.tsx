import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Heart, Eye, Plus, ChevronRight, RotateCcw, LogOut, Trash2, Building2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useSaved } from '@/store/saved';
import { useSignals } from '@/store/signals';
import { usePullRefresh } from '@/lib/use-refresh';
import { GlassBg } from '@/components/Glass';
import { AuthScreen } from '@/components/AuthScreen';
import { colors } from '@/theme/tokens';
import type { Session } from '@supabase/supabase-js';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { decisions, savedRefs, reset } = useSaved();
  const { reset: resetSignals } = useSignals();
  const { refreshing, onRefresh } = usePullRefresh();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const seen = Object.keys(decisions).length;
  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email?.split('@')[0] || 'Guest';

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

  // Logged-out: the whole tab is the sign-in flow.
  if (!session) {
    return (
      <View className="flex-1">
        <GlassBg />
        <AuthScreen />
      </View>
    );
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
            <Text className="text-sm text-graphite" numberOfLines={1}>{session.user.email}</Text>
          </View>
        </View>

        {/* List your property */}
        <Pressable onPress={() => router.push('/sell')} className="mb-4 flex-row items-center gap-3 rounded-apple bg-ink p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-white/15"><Plus size={24} color="#fff" /></View>
          <View className="flex-1"><Text className="text-[15px] font-semibold text-white">List your property</Text><Text className="text-[13px] text-white/65">Sell direct · list in minutes</Text></View>
          <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* My listings */}
        <Pressable onPress={() => router.push('/my-listings')} className="mb-4 flex-row items-center gap-3 rounded-apple border border-white/60 bg-white/70 p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/10"><Building2 size={22} color={colors.accent} /></View>
          <View className="flex-1"><Text className="text-[15px] font-semibold text-ink">My listings</Text><Text className="text-[13px] text-graphite">Track your submitted properties</Text></View>
          <ChevronRight size={20} color={colors.graphiteLight} />
        </Pressable>

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

        <Pressable onPress={() => supabase.auth.signOut()} className="mt-4 flex-row items-center justify-center gap-2 rounded-apple border border-hairline py-4">
          <LogOut size={18} color={colors.ink} /><Text className="font-semibold text-ink">Sign out</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} className="mt-3 flex-row items-center justify-center gap-2 py-3">
          <Trash2 size={16} color="#e11d48" /><Text className="font-semibold" style={{ color: '#e11d48' }}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
