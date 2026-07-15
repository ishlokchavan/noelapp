import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { SHARES_SEED } from '@/data/shares-seed';
import type {
  ShareAsset, ShareWallet, ShareHolding, ShareLedgerEntry, ShareDistribution, ShareOrder,
} from '@/types/shares';

/**
 * Data access for Noel Shares — reads the live `shares_*` tables and invokes
 * the SECURITY DEFINER RPCs. Public reads fall back to seed data when Supabase
 * is unreachable; user/wallet reads + every mutation require an auth session.
 */

const configured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const ASSET_COLS =
  'id,symbol,listing_reference,name,city,community,property_type,completion,cover_image_url,property_value_aed,token_price_aed,total_tokens,tokens_sold,gross_yield_pct,net_yield_pct,appreciation_pct,funding_deadline,status,dld_deed_ref,min_tokens,highlights,market_value_aed,discount_pct,investor_count';
// user_id / counterparty_id are intentionally NOT granted to clients.
const LEDGER_COLS =
  'block_number,tx_hash,prev_hash,asset_id,actor_address,type,tokens,price_per_token_aed,total_aed,status,created_at';

/* eslint-disable @typescript-eslint/no-explicit-any */
function toAsset(r: any): ShareAsset {
  return {
    id: r.id, symbol: r.symbol, listingReference: r.listing_reference, name: r.name,
    city: r.city, community: r.community, propertyType: r.property_type, completion: r.completion,
    coverImageUrl: r.cover_image_url, propertyValueAed: Number(r.property_value_aed),
    tokenPriceAed: Number(r.token_price_aed), totalTokens: r.total_tokens, tokensSold: r.tokens_sold,
    grossYieldPct: Number(r.gross_yield_pct), netYieldPct: Number(r.net_yield_pct),
    appreciationPct: Number(r.appreciation_pct), fundingDeadline: r.funding_deadline,
    status: r.status, dldDeedRef: r.dld_deed_ref, minTokens: r.min_tokens, highlights: r.highlights ?? [],
    marketValueAed: r.market_value_aed == null ? null : Number(r.market_value_aed),
    discountPct: Number(r.discount_pct ?? 0), investorCount: r.investor_count ?? 0,
  };
}
const toLedger = (r: any): ShareLedgerEntry => ({
  blockNumber: Number(r.block_number), txHash: r.tx_hash, prevHash: r.prev_hash, assetId: r.asset_id,
  actorAddress: r.actor_address, type: r.type, tokens: r.tokens,
  pricePerTokenAed: r.price_per_token_aed == null ? null : Number(r.price_per_token_aed),
  totalAed: Number(r.total_aed), status: r.status, createdAt: r.created_at,
});
const toDistribution = (r: any): ShareDistribution => ({
  id: r.id, assetId: r.asset_id, period: r.period, perTokenAed: Number(r.per_token_aed), paidAt: r.paid_at,
});
const toHolding = (r: any): ShareHolding => ({
  id: r.id, assetId: r.asset_id, tokens: r.tokens, avgCostAed: Number(r.avg_cost_aed),
});
const toOrder = (r: any): ShareOrder => ({
  id: r.id, assetId: r.asset_id, userId: r.user_id, side: r.side, tokens: r.tokens,
  tokensRemaining: r.tokens_remaining, pricePerTokenAed: Number(r.price_per_token_aed),
  status: r.status, createdAt: r.created_at,
});
const toWallet = (r: any): ShareWallet => ({
  walletAddress: r.wallet_address, cashBalanceAed: Number(r.cash_balance_aed),
  kycStatus: r.kyc_status, kycName: r.kyc_name,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------- public reads (fall back to seed) ---------- */

export async function getShareAssets(): Promise<ShareAsset[]> {
  if (configured()) {
    try {
      const { data, error } = await supabase
        .from('shares_assets').select(ASSET_COLS).order('property_value_aed', { ascending: false });
      if (!error && data?.length) return data.map(toAsset);
    } catch { /* fall through */ }
  }
  return SHARES_SEED;
}

export async function getDistributions(): Promise<ShareDistribution[]> {
  if (!configured()) return [];
  try {
    const { data, error } = await supabase
      .from('shares_distributions').select('id,asset_id,period,per_token_aed,paid_at')
      .order('paid_at', { ascending: false });
    if (!error && data) return data.map(toDistribution);
  } catch { /* noop */ }
  return [];
}

export async function getAssetLedger(assetId: string, limit = 40): Promise<ShareLedgerEntry[]> {
  if (!configured()) return [];
  try {
    const { data, error } = await supabase
      .from('shares_ledger').select(LEDGER_COLS).eq('asset_id', assetId)
      .order('block_number', { ascending: false }).limit(limit);
    if (!error && data) return data.map(toLedger);
  } catch { /* noop */ }
  return [];
}

export async function getGlobalLedger(limit = 30): Promise<ShareLedgerEntry[]> {
  if (!configured()) return [];
  try {
    const { data, error } = await supabase
      .from('shares_ledger').select(LEDGER_COLS).order('block_number', { ascending: false }).limit(limit);
    if (!error && data) return data.map(toLedger);
  } catch { /* noop */ }
  return [];
}

export async function getOrderBook(assetId: string): Promise<ShareOrder[]> {
  if (!configured()) return [];
  try {
    const { data, error } = await supabase
      .from('shares_orders').select('*').eq('asset_id', assetId).in('status', ['open', 'partial'])
      .order('price_per_token_aed', { ascending: true });
    if (!error && data) return data.map(toOrder);
  } catch { /* noop */ }
  return [];
}

/* ---------- user-scoped reads (RLS-gated) ---------- */

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Fetch the caller's wallet, creating it on first access. Null if signed out. */
export async function ensureWallet(): Promise<ShareWallet | null> {
  if (!configured() || !(await uid())) return null;
  try {
    const { data, error } = await supabase.rpc('shares_ensure_wallet');
    if (!error && data) return toWallet(Array.isArray(data) ? data[0] : data);
  } catch { /* noop */ }
  return null;
}

export async function getMyHoldings(): Promise<ShareHolding[]> {
  if (!configured() || !(await uid())) return [];
  try {
    const { data, error } = await supabase
      .from('shares_holdings').select('id,asset_id,tokens,avg_cost_aed').gt('tokens', 0);
    if (!error && data) return data.map(toHolding);
  } catch { /* noop */ }
  return [];
}

export async function getMyLedger(walletAddress: string, limit = 60): Promise<ShareLedgerEntry[]> {
  if (!configured() || !walletAddress) return [];
  try {
    const { data, error } = await supabase
      .from('shares_ledger').select(LEDGER_COLS).eq('actor_address', walletAddress)
      .order('block_number', { ascending: false }).limit(limit);
    if (!error && data) return data.map(toLedger);
  } catch { /* noop */ }
  return [];
}

export async function getMyOrders(): Promise<ShareOrder[]> {
  if (!configured()) return [];
  const id = await uid();
  if (!id) return [];
  try {
    const { data, error } = await supabase
      .from('shares_orders').select('*').eq('user_id', id).order('created_at', { ascending: false });
    if (!error && data) return data.map(toOrder);
  } catch { /* noop */ }
  return [];
}

/* ---------- mutations (RPC) ---------- */

const FRIENDLY: Record<string, string> = {
  kyc_required: 'Please complete the quick verification first.',
  insufficient_funds: 'Not enough balance in your demo wallet. Add demo funds and try again.',
  insufficient_tokens: 'You don’t hold enough shares for that.',
  'auth required': 'Please sign in to continue.',
  'not enough tokens available': 'There aren’t that many shares left in this offering.',
  'order unavailable': 'That listing was just taken. Refresh and try another.',
  'cannot fill own order': 'You can’t buy your own listing.',
  'seller no longer holds tokens': 'The seller no longer holds these shares.',
};

function rpcError(error: { message?: string } | null): never {
  const raw = (error?.message ?? '').toLowerCase();
  const key = Object.keys(FRIENDLY).find((k) => raw.includes(k));
  throw new Error(key ? FRIENDLY[key] : (error?.message || 'Something went wrong. Please try again.'));
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) rpcError(error);
  return data as T;
}

export const completeKyc = (name: string, emiratesId: string) =>
  callRpc<unknown>('shares_complete_kyc', { p_name: name, p_emirates_id: emiratesId });
export const addDemoFunds = (amount: number) =>
  callRpc<unknown>('shares_add_demo_funds', { p_amount: amount });
export const buyShares = (assetId: string, tokens: number) =>
  callRpc<ShareLedgerEntry>('shares_buy', { p_asset_id: assetId, p_tokens: tokens });
export const sellShares = (assetId: string, tokens: number) =>
  callRpc<ShareLedgerEntry>('shares_sell', { p_asset_id: assetId, p_tokens: tokens });
export const claimDividends = (assetId?: string) =>
  callRpc<number>('shares_claim_dividends', { p_asset_id: assetId ?? null });
export const placeOrder = (assetId: string, tokens: number, price: number) =>
  callRpc<ShareOrder>('shares_place_order', { p_asset_id: assetId, p_tokens: tokens, p_price: price });
export const fillOrder = (orderId: string, tokens: number) =>
  callRpc<ShareLedgerEntry>('shares_fill_order', { p_order_id: orderId, p_tokens: tokens });
export const cancelOrder = (orderId: string) =>
  callRpc<void>('shares_cancel_order', { p_order_id: orderId });

/* ---------- formatting + math helpers ---------- */

export function formatAed(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (Math.abs(value) >= 1_000_000) {
      const m = value / 1_000_000; return `AED ${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) return `AED ${Math.round(value / 1_000)}K`;
  }
  return `AED ${value.toLocaleString('en-AE', { maximumFractionDigits: 2 })}`;
}

export const shortHash = (h?: string | null) =>
  !h ? '' : h.length <= 14 ? h : `${h.slice(0, 8)}…${h.slice(-4)}`;
export const shortAddr = (a?: string | null) =>
  !a ? '—' : a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Projected annual rental income (AED) for a token count at an asset's gross yield. */
export const projectedAnnualIncome = (a: ShareAsset, tokens: number) =>
  (a.tokenPriceAed * tokens * a.grossYieldPct) / 100;

/** Effective (post-discount) share price actually charged on a primary buy. */
export const effectivePrice = (a: ShareAsset) =>
  a.discountPct > 0 ? Math.round(a.tokenPriceAed * (1 - a.discountPct / 100) * 100) / 100 : a.tokenPriceAed;

export interface Outcome {
  tokens: number;
  amount: number;        // actual amount put in (tokens × effective price)
  monthly: number;       // net rent per month
  yearly: number;        // net rent per year
  fiveYearValue: number; // capital value after 5 years of appreciation
  fiveYearRent: number;  // total rent collected over 5 years
  stakePct: number;      // your share of the whole property
}

/**
 * Outcome-first math: turn "how much money" into the plain things people care
 * about — monthly rent, yearly rent, and what the slice could be worth later.
 */
export function outcomeFor(asset: ShareAsset, amount: number): Outcome {
  const unit = effectivePrice(asset);
  const tokens = Math.max(0, Math.floor(amount / unit));
  const actual = tokens * unit;
  const yearly = (actual * asset.netYieldPct) / 100;
  return {
    tokens,
    amount: actual,
    monthly: yearly / 12,
    yearly,
    fiveYearValue: actual * Math.pow(1 + asset.appreciationPct / 100, 5),
    fiveYearRent: yearly * 5,
    stakePct: asset.propertyValueAed > 0 ? (actual / asset.propertyValueAed) * 100 : 0,
  };
}

/**
 * Illustrative real-world cost breakdown for an investment (purchase costs,
 * platform fee, and the DLD transfer fee at the tokenization-pilot 2% vs the
 * usual 4%). Shown for education on the Financials tab; the demo only debits the
 * share amount itself.
 */
export function feeBreakdown(asset: ShareAsset, tokens: number) {
  const amount = effectivePrice(asset) * tokens;
  const purchaseCosts = amount * 0.03;
  const platformFee = amount * 0.015;
  const dldFull = amount * 0.04;
  const dldDiscounted = amount * 0.02;
  return {
    amount, purchaseCosts, platformFee, dldFull, dldDiscounted,
    total: amount + purchaseCosts + platformFee + dldDiscounted,
  };
}
