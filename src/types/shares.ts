/**
 * Noel Shares — tokenized real-estate (showcase) domain types. These mirror the
 * `shares_*` Supabase tables 1:1 (snake_case → camelCase happens in lib/shares.ts).
 */

export type ShareStatus = 'funding' | 'funded' | 'closed';
export type LedgerType = 'buy' | 'sell' | 'dividend' | 'transfer' | 'deposit';

export interface ShareAsset {
  id: string;
  symbol: string;
  listingReference: string | null;
  name: string;
  city: string | null;
  community: string | null;
  propertyType: string | null;
  completion: 'ready' | 'off_plan' | null;
  coverImageUrl: string | null;
  propertyValueAed: number;
  tokenPriceAed: number;
  totalTokens: number;
  tokensSold: number;
  grossYieldPct: number;
  netYieldPct: number;
  appreciationPct: number;
  fundingDeadline: string | null;
  status: ShareStatus;
  dldDeedRef: string | null;
  minTokens: number;
  highlights: string[];
  marketValueAed: number | null;
  discountPct: number;
  investorCount: number;
}

export interface ShareWallet {
  walletAddress: string;
  cashBalanceAed: number;
  kycStatus: 'unverified' | 'verified';
  kycName: string | null;
}

export interface ShareHolding {
  id: string;
  assetId: string;
  tokens: number;
  avgCostAed: number;
}

export interface ShareLedgerEntry {
  blockNumber: number;
  txHash: string;
  prevHash: string | null;
  assetId: string | null;
  actorAddress: string | null;
  type: LedgerType;
  tokens: number;
  pricePerTokenAed: number | null;
  totalAed: number;
  status: string;
  createdAt: string;
}

export interface ShareDistribution {
  id: string;
  assetId: string;
  period: string;
  perTokenAed: number;
  paidAt: string;
}

export interface ShareOrder {
  id: string;
  assetId: string;
  userId: string;
  side: 'buy' | 'sell';
  tokens: number;
  tokensRemaining: number;
  pricePerTokenAed: number;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  createdAt: string;
}

/** Derived helpers (kept here so screens stay declarative). */
export const availableTokens = (a: ShareAsset) => Math.max(0, a.totalTokens - a.tokensSold);
export const fundedPct = (a: ShareAsset) =>
  a.totalTokens > 0 ? Math.min(100, (a.tokensSold / a.totalTokens) * 100) : 0;
export const minInvestmentAed = (a: ShareAsset) => a.tokenPriceAed * a.minTokens;
/** Promo price per share after the marketing discount (display only). */
export const discountedTokenPrice = (a: ShareAsset) =>
  a.discountPct > 0 ? a.tokenPriceAed * (1 - a.discountPct / 100) : a.tokenPriceAed;
/** Current market value premium over the tokenized (entry) value, as a %. */
export const marketUpliftPct = (a: ShareAsset) =>
  a.marketValueAed && a.propertyValueAed > 0
    ? ((a.marketValueAed - a.propertyValueAed) / a.propertyValueAed) * 100
    : 0;
