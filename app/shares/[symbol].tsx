import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, FileText, ShieldCheck, Landmark, Boxes, Bed, Bath, Maximize2,
  Sparkles, ArrowLeftRight, Coins, ExternalLink, ShoppingCart,
  FileCheck2, CalendarCheck,
} from 'lucide-react-native';
import { useShares } from '@/store/shares';
import { getListingByReference } from '@/lib/listings';
import type { Listing } from '@/types/listing';
import { GlassBg } from '@/components/Glass';
import { FundingBar, Metric, RegulatedNote, DiscountBadge } from '@/components/SharesUI';
import { OutcomeSimulator } from '@/components/OutcomeSimulator';
import { Term } from '@/components/Term';
import { getAssetLedger, formatAed, shortHash, shortAddr, feeBreakdown, outcomeFor } from '@/lib/shares';
import { discountedTokenPrice, marketUpliftPct } from '@/types/shares';
import type { ShareLedgerEntry } from '@/types/shares';
import { colors } from '@/theme/tokens';

type Tab = 'overview' | 'property' | 'financials' | 'ledger';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'property', label: 'Property' },
  { key: 'financials', label: 'Financials' },
  { key: 'ledger', label: 'Ledger' },
];

export default function ShareDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const s = useShares();
  const insets = useSafeAreaInsets();
  const asset = s.bySymbol(String(symbol));
  const holding = asset ? s.holdingFor(asset.id) : undefined;
  const dists = asset ? s.distributionsFor(asset.id) : [];

  const [tab, setTab] = useState<Tab>('overview');
  const [amount, setAmount] = useState(5000);
  const [ledger, setLedger] = useState<ShareLedgerEntry[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await s.refresh();
      if (asset && /^[0-9a-f-]{36}$/i.test(asset.id)) setLedger(await getAssetLedger(asset.id, 12));
    } finally { setRefreshing(false); }
  }, [s, asset]);

  useEffect(() => {
    if (asset && /^[0-9a-f-]{36}$/i.test(asset.id)) getAssetLedger(asset.id, 12).then(setLedger);
  }, [asset]);
  useEffect(() => {
    if (asset?.listingReference) getListingByReference(asset.listingReference).then(setListing);
  }, [asset?.listingReference]);

  if (!asset) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-graphite">Offering not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-3 rounded-full bg-accent px-4 py-2">
          <Text className="font-semibold text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const funded = asset.status !== 'funding';
  const price = discountedTokenPrice(asset);
  const uplift = marketUpliftPct(asset);
  const sim = outcomeFor(asset, amount);
  const fees = feeBreakdown(asset, sim.tokens);

  const startInvest = () => {
    if (!s.signedIn) { router.push('/(tabs)/profile'); return; }
    if (s.wallet?.kycStatus !== 'verified') { router.push('/shares/kyc'); return; }
    router.push(`/shares/invest?symbol=${asset.symbol}&mode=buy&tokens=${Math.max(1, sim.tokens)}`);
  };

  const docRows = [
    { icon: Landmark, title: 'Tokenized title deed', sub: asset.dldDeedRef ?? 'DLD-registered' },
    { icon: FileText, title: 'Offering prospectus', sub: 'PDF · 24 pages' },
    { icon: ShieldCheck, title: 'Custodian & SPV agreement', sub: 'Licensed custodian' },
    { icon: Boxes, title: 'Independent valuation report', sub: 'RICS-aligned' },
  ];
  const steps = [
    { icon: ShoppingCart, title: 'Buy your shares', sub: 'Pick how much to put in — from AED 500. You get that share of the home.' },
    { icon: FileCheck2, title: 'Ownership recorded', sub: 'Your shares land in your wallet; the title is safely held by a licensed custodian.' },
    { icon: CalendarCheck, title: 'Earn monthly rent', sub: 'Collect your share of the rent each month, plus any growth in value.' },
  ];
  const amenities = listing?.amenities ?? [];

  return (
    <View className="flex-1">
      <GlassBg />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        {/* Cover */}
        <View className="relative">
          <Pressable onPress={() => { if (asset.listingReference) router.push(`/gallery/${asset.listingReference}`); }}>
            <Image source={{ uri: asset.coverImageUrl ?? undefined }} style={{ width: '100%', height: 260 }} contentFit="cover" />
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ top: insets.top + 8 }}
            className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-black/40">
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
          <View className="absolute bottom-3 left-4 flex-row items-center gap-2">
            <View className="rounded-full bg-black/45 px-2.5 py-1"><Text className="text-[11px] font-semibold tracking-wide text-white">{asset.symbol}</Text></View>
            {asset.discountPct > 0 ? <DiscountBadge pct={asset.discountPct} /> : null}
          </View>
        </View>

        <View className="px-4 pt-4">
          <Text className="text-[21px] font-semibold text-ink">{asset.name}</Text>
          <Text className="text-[13.5px] text-graphite">{asset.community}, {asset.city}</Text>
        </View>

        {/* HERO — outcome simulator (or funded note) */}
        <View className="mx-4 mt-3">
          {!funded ? (
            <OutcomeSimulator asset={asset} amount={amount} onAmountChange={setAmount} />
          ) : (
            <View className="rounded-apple border border-white/60 bg-white/80 p-4">
              <Text className="text-[15px] font-semibold text-ink">This home is fully funded 🎉</Text>
              <Text className="mt-1 text-[13px] leading-5 text-graphite">
                All shares have been bought. You can still pick some up from other investors on the{' '}
                <Term k="secondary">secondary market</Term>.
              </Text>
            </View>
          )}
        </View>

        {/* Funding snapshot */}
        <View className="mx-4 mt-3 rounded-apple border border-white/60 bg-white/75 p-4">
          <FundingBar asset={asset} />
          <View className="mt-3 flex-row gap-3 border-t border-hairline/60 pt-3">
            <Metric label="Property value" value={formatAed(asset.propertyValueAed, { compact: true })} />
            <Metric label="Investors" value={asset.investorCount.toLocaleString()} />
            <Metric label="Closes" value={asset.fundingDeadline ?? '—'} />
          </View>
        </View>

        {/* Your position */}
        {holding && holding.tokens > 0 ? (
          <View className="mx-4 mt-3 rounded-apple border border-accent/30 bg-accent/5 p-4">
            <Text className="text-[12px] font-semibold uppercase tracking-wide text-accent">You own</Text>
            <View className="mt-2 flex-row gap-3">
              <Metric label="Shares" value={holding.tokens.toLocaleString()} />
              <Metric label="Value" value={formatAed(holding.tokens * asset.tokenPriceAed)} />
              <Metric label="Avg cost" value={formatAed(holding.avgCostAed)} />
            </View>
          </View>
        ) : null}

        {/* Tabs */}
        <View className="mx-4 mt-4 flex-row rounded-full bg-black/5 p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} className={`flex-1 items-center rounded-full py-2 ${active ? 'bg-white' : ''}`}
                style={active ? styles.segActive : undefined}>
                <Text className={`text-[12.5px] font-semibold ${active ? 'text-ink' : 'text-graphite'}`}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="px-4 pt-4">
          {/* OVERVIEW */}
          {tab === 'overview' ? (
            <View className="gap-3">
              <View className="flex-row gap-3 rounded-apple border border-white/60 bg-white/75 p-4">
                <View className="flex-1">
                  <Text className="text-[11px] uppercase tracking-wide text-graphiteLight">You buy in at</Text>
                  <Text className="mt-0.5 text-[16px] font-semibold text-ink">{formatAed(asset.propertyValueAed, { compact: true })}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] uppercase tracking-wide text-graphiteLight">Today’s market value</Text>
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className="mt-0.5 text-[16px] font-semibold text-ink">{formatAed(asset.marketValueAed ?? asset.propertyValueAed, { compact: true })}</Text>
                    {uplift > 0 ? <Text className="text-[12px] font-semibold text-emerald-700">+{uplift.toFixed(0)}%</Text> : null}
                  </View>
                </View>
              </View>

              <View className="gap-2">
                {asset.highlights.map((h) => (
                  <View key={h} className="flex-row items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-3.5 py-3">
                    <View className="h-1.5 w-1.5 rounded-full bg-accent" /><Text className="text-[14px] text-ink700">{h}</Text>
                  </View>
                ))}
              </View>

              <Text className="text-[13.5px] leading-5 text-graphite">
                This home is split into {asset.totalTokens.toLocaleString()} equal <Term k="shares">shares</Term>. Buy as many as you like —
                you’ll earn your slice of the <Term k="rent">rent</Term> each month and benefit from any <Term k="appreciation">growth</Term> in value.
              </Text>

              <Text className="pt-2 text-[15px] font-semibold text-ink">How it works</Text>
              <View className="rounded-apple border border-white/60 bg-white/75 p-4">
                {steps.map((st, i) => (
                  <View key={st.title} className="flex-row gap-3">
                    <View className="items-center">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/10"><st.icon size={16} color={colors.accent} /></View>
                      {i < steps.length - 1 ? <View className="my-1 w-px flex-1 bg-hairline" /> : null}
                    </View>
                    <View className={`flex-1 ${i < steps.length - 1 ? 'pb-4' : ''}`}>
                      <Text className="text-[14px] font-semibold text-ink">{st.title}</Text>
                      <Text className="mt-0.5 text-[12.5px] leading-4 text-graphite">{st.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text className="pt-2 text-[15px] font-semibold text-ink">Documents</Text>
              <View className="gap-2.5">
                {docRows.map((d) => (
                  <Pressable key={d.title} onPress={() => Alert.alert(d.title, 'This document will open here.')}
                    className="flex-row items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-3.5 py-3.5">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/10"><d.icon size={17} color={colors.accent} /></View>
                    <View className="flex-1"><Text className="text-[14px] font-medium text-ink">{d.title}</Text><Text className="text-[12px] text-graphite">{d.sub}</Text></View>
                    <ExternalLink size={16} color={colors.graphiteLight} />
                  </Pressable>
                ))}
              </View>
              <RegulatedNote />
            </View>
          ) : null}

          {/* PROPERTY */}
          {tab === 'property' ? (
            <View className="gap-4">
              <View>
                <Text className="mb-2 text-[15px] font-semibold text-ink">About the property</Text>
                <View className="flex-row flex-wrap gap-y-3 rounded-apple border border-white/60 bg-white/75 p-4">
                  <Spec icon={Bed} label={`${listing?.bedrooms ?? '—'} Bed`} />
                  <Spec icon={Bath} label={`${listing?.bathrooms ?? '—'} Bath`} />
                  <Spec icon={Maximize2} label={listing?.areaSqft ? `${listing.areaSqft.toLocaleString()} sqft` : '—'} />
                  <Spec icon={Landmark} label={(listing?.propertyType ?? asset.propertyType ?? 'Property')} cap />
                </View>
              </View>

              {listing?.description ? (
                <View>
                  <Text className="mb-1.5 text-[15px] font-semibold text-ink">Description</Text>
                  <Text className="text-[13.5px] leading-5 text-graphite" numberOfLines={descOpen ? undefined : 4}>{listing.description}</Text>
                  {listing.description.length > 180 ? (
                    <Pressable onPress={() => setDescOpen((v) => !v)}><Text className="mt-1 text-[13px] font-medium text-accent">{descOpen ? 'Read less' : 'Read more'}</Text></Pressable>
                  ) : null}
                </View>
              ) : null}

              {amenities.length ? (
                <View>
                  <Text className="mb-2 text-[15px] font-semibold text-ink">Amenities</Text>
                  <View className="flex-row flex-wrap">
                    {amenities.map((a) => (
                      <View key={a} className="mb-2.5 w-1/2 flex-row items-center gap-2 pr-2">
                        <Sparkles size={15} color={colors.accent} /><Text className="flex-1 text-[13.5px] text-ink700" numberOfLines={1}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {!listing ? <Text className="py-6 text-center text-[13px] text-graphite">Loading property details…</Text> : null}
            </View>
          ) : null}

          {/* FINANCIALS */}
          {tab === 'financials' ? (
            <View>
              <Text className="text-[13px] text-graphite">Based on <Text className="font-semibold text-ink">{formatAed(sim.amount)}</Text> from the slider above.</Text>

              <Text className="pt-3 text-[15px] font-semibold text-ink">What it costs (real-world)</Text>
              <View className="mt-2 rounded-apple border border-white/60 bg-white/75 p-4">
                <FeeRow label="Share amount" value={formatAed(fees.amount)} />
                <FeeRow label="Purchase costs (3%)" value={formatAed(fees.purchaseCosts)} />
                <FeeRow label="noelapp platform fee (1.5%)" value={formatAed(fees.platformFee)} />
                <FeeRow label="DLD transfer fee (2%)" value={formatAed(fees.dldDiscounted)} strike={formatAed(fees.dldFull)} />
                <View className="my-2 h-px bg-hairline/60" />
                <FeeRow label="Total" value={formatAed(fees.total)} bold />
                <Text className="mt-2 text-[11px] leading-4 text-graphiteLight">These are the costs on a real purchase. The DLD’s 2% is the tokenization rate (normally 4%).</Text>
              </View>

              <Text className="pt-4 text-[15px] font-semibold text-ink">Your <Term k="distribution">rent payouts</Term></Text>
              {dists.length ? (
                <View className="mt-2 rounded-apple border border-white/60 bg-white/75 p-4">
                  {dists.slice(0, 4).map((d) => (
                    <View key={d.id} className="flex-row items-center justify-between py-1.5">
                      <View className="flex-row items-center gap-2"><Coins size={14} color={colors.accent} /><Text className="text-[13px] text-ink700">{d.period}</Text></View>
                      <Text className="text-[13px] font-medium text-ink">{formatAed(Math.round(d.perTokenAed * sim.tokens))}</Text>
                    </View>
                  ))}
                  <Text className="mt-1.5 text-[11px] text-graphiteLight">What you’d have received on {sim.tokens.toLocaleString()} shares.</Text>
                </View>
              ) : (
                <Text className="mt-2 text-[12.5px] text-graphite">Off-plan — rent starts after the home is handed over.</Text>
              )}
            </View>
          ) : null}

          {/* LEDGER */}
          {tab === 'ledger' ? (
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[13px] font-semibold text-ink">On-chain activity</Text>
                <Pressable onPress={() => router.push('/shares/ledger')} className="flex-row items-center gap-1"><Text className="text-[12.5px] font-medium text-accent">Full ledger</Text><ExternalLink size={13} color={colors.accent} /></Pressable>
              </View>
              <Text className="mb-3 text-[12px] leading-4 text-graphite">Every purchase and rent payout is recorded as a tamper-proof entry — like a public receipt book anyone can check.</Text>
              {ledger.length ? ledger.map((e) => <LedgerRow key={e.txHash} e={e} />) : (
                <View className="items-center rounded-apple border border-white/60 bg-white/70 py-8">
                  <Text className="text-[13px] text-graphite">No activity yet.</Text>
                  <Text className="text-[12px] text-graphiteLight">Be the first to invest in this home.</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={{ paddingBottom: insets.bottom + 10 }} className="absolute inset-x-0 bottom-0 border-t border-hairline/50 bg-white/90 px-4 pt-2.5">
        <View className="flex-row gap-3">
          {funded ? (
            <Pressable onPress={() => router.push(`/shares/market?symbol=${asset.symbol}`)} className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-accent py-3.5">
              <ArrowLeftRight size={17} color="#fff" /><Text className="text-[15px] font-semibold text-white">Buy from investors</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => router.push(`/shares/market?symbol=${asset.symbol}`)} className="flex-row items-center justify-center gap-1.5 rounded-full border border-hairline bg-white px-5 py-3.5">
                <ArrowLeftRight size={16} color={colors.ink} /><Text className="text-[14px] font-semibold text-ink">Trade</Text>
              </Pressable>
              <Pressable onPress={startInvest} className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-accent py-3.5">
                <Coins size={17} color="#fff" /><Text className="text-[15px] font-semibold text-white">Invest {formatAed(sim.amount, { compact: true })}</Text>
              </Pressable>
            </>
          )}
        </View>
        <Text className="mt-1.5 text-center text-[10.5px] text-graphiteLight">{formatAed(price)} per share</Text>
      </View>
    </View>
  );
}

function Spec({ icon: Icon, label, cap }: { icon: typeof Bed; label: string; cap?: boolean }) {
  return (
    <View className="w-1/2 flex-row items-center gap-2">
      <Icon size={17} color={colors.accent} />
      <Text className={`text-[14px] text-ink700 ${cap ? 'capitalize' : ''}`}>{label}</Text>
    </View>
  );
}

function FeeRow({ label, value, strike, bold }: { label: string; value: string; strike?: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-[13px] ${bold ? 'font-semibold text-ink' : 'text-graphite'}`}>{label}</Text>
      <View className="flex-row items-baseline gap-1.5">
        {strike ? <Text className="text-[11px] text-graphiteLight line-through">{strike}</Text> : null}
        <Text className={`text-[13.5px] ${bold ? 'font-semibold' : 'font-medium'} text-ink`}>{value}</Text>
      </View>
    </View>
  );
}

function LedgerRow({ e }: { e: ShareLedgerEntry }) {
  const tint: Record<string, string> = { buy: '#0071e3', sell: '#b45309', dividend: '#059669', transfer: '#7c3aed', deposit: '#6e6e73' };
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-3.5 py-3">
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <View style={{ backgroundColor: `${tint[e.type]}1A` }} className="rounded-full px-2 py-0.5"><Text style={{ color: tint[e.type] }} className="text-[10.5px] font-semibold uppercase">{e.type}</Text></View>
          <Text className="text-[12px] text-graphite">#{e.blockNumber}</Text>
        </View>
        <Text className="mt-1 text-[11.5px] text-graphiteLight">{shortHash(e.txHash)} · {shortAddr(e.actorAddress)}</Text>
      </View>
      <View className="items-end">
        {e.tokens > 0 ? <Text className="text-[13px] font-semibold text-ink">{e.tokens.toLocaleString()} shares</Text> : null}
        <Text className="text-[12px] text-graphite">{formatAed(e.totalAed)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segActive: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
});
