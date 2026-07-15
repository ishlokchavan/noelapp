import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Boxes, Link2, ShieldCheck } from 'lucide-react-native';
import { useShares } from '@/store/shares';
import { GlassBg } from '@/components/Glass';
import { getGlobalLedger, formatAed, shortHash, shortAddr } from '@/lib/shares';
import type { ShareLedgerEntry } from '@/types/shares';
import { colors } from '@/theme/tokens';

const TINT: Record<string, string> = {
  buy: '#0071e3', sell: '#b45309', dividend: '#059669', transfer: '#7c3aed', deposit: '#6e6e73',
};

export default function LedgerExplorer() {
  const s = useShares();
  const insets = useSafeAreaInsets();
  const [chain, setChain] = useState<ShareLedgerEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => setChain(await getGlobalLedger(50)), []);
  useEffect(() => { reload(); }, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await reload(); } finally { setRefreshing(false); }
  }, [reload]);

  const head = chain[0];
  const symFor = (assetId: string | null) => (assetId ? s.byId(assetId)?.symbol : null) ?? null;

  return (
    <View className="flex-1">
      <GlassBg />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between px-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-black/5">
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text className="text-[17px] font-semibold text-ink">Ledger explorer</Text>
          <View className="w-10" />
        </View>

        {/* Chain header */}
        <View className="mx-4 mt-2 rounded-apple border border-white/60 bg-white/80 p-4">
          <View className="flex-row items-center gap-2">
            <Boxes size={16} color={colors.accent} />
            <Text className="text-[13px] font-semibold text-ink">Noel Shares chain</Text>
            <View className="ml-auto flex-row items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5">
              <ShieldCheck size={12} color="#059669" /><Text className="text-[10.5px] font-semibold text-emerald-700">Hash-linked</Text>
            </View>
          </View>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-graphiteLight">Height</Text>
              <Text className="mt-0.5 text-[15px] font-semibold text-ink">{head ? `#${head.blockNumber}` : '—'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-graphiteLight">Latest hash</Text>
              <Text className="mt-0.5 text-[13px] font-medium text-ink">{head ? shortHash(head.txHash) : '—'}</Text>
            </View>
          </View>
          <Text className="mt-2 text-[11px] leading-4 text-graphiteLight">
            Every transaction is sealed with sha256(previous hash + payload), forming a tamper-evident chain.
          </Text>
        </View>

        {/* Blocks */}
        <View className="gap-2.5 px-4 pt-4">
          {chain.length ? chain.map((e) => (
            <View key={e.txHash} className="rounded-apple border border-white/60 bg-white/75 p-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View style={{ backgroundColor: `${TINT[e.type]}1A` }} className="rounded-full px-2 py-0.5">
                    <Text style={{ color: TINT[e.type] }} className="text-[10.5px] font-semibold uppercase">{e.type}</Text>
                  </View>
                  <Text className="text-[12.5px] font-semibold text-ink">Block #{e.blockNumber}</Text>
                  {symFor(e.assetId) ? <Text className="text-[11.5px] text-graphite">· {symFor(e.assetId)}</Text> : null}
                </View>
                <View className="items-end">
                  {e.tokens > 0 ? <Text className="text-[13px] font-semibold text-ink">{e.tokens.toLocaleString()} shares</Text> : null}
                  <Text className="text-[12px] text-graphite">{formatAed(e.totalAed)}</Text>
                </View>
              </View>
              <View className="mt-2 gap-0.5">
                <View className="flex-row items-center gap-1">
                  <Link2 size={11} color={colors.graphiteLight} />
                  <Text className="text-[11px] text-graphiteLight">tx {shortHash(e.txHash)}</Text>
                </View>
                <Text className="text-[11px] text-graphiteLight">prev {shortHash(e.prevHash) || 'genesis'} · by {shortAddr(e.actorAddress)}</Text>
              </View>
            </View>
          )) : (
            <View className="items-center rounded-apple border border-white/60 bg-white/70 py-10">
              <Text className="text-[13.5px] text-graphite">The chain is empty.</Text>
              <Text className="text-[12px] text-graphiteLight">Transactions will appear here as people invest.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
