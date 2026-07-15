# Noel Shares — Tokenized Real Estate Module

> **Implemented ✅ (branch `claude/bold-maxwell-pdqlsb`).** Final user-facing name
> is **"Shares"** (tab) — chosen over "Mint"/"Tokens" to avoid confusion with
> Noel **credits**. The token/ledger mechanics described below run under the
> hood unchanged. What shipped:
> - DB: 6 `shares_*` tables + hash-linked ledger + 9 atomic RPCs + 8 seeded
>   offerings (live Supabase, additive, RLS + column-grant hardened, advisors clean).
> - App: 6th **Shares** tab + 7 screens (market, asset detail with
>   Overview/Financials/Documents/Ledger, invest/sell, KYC, wallet, portfolio,
>   secondary market, ledger explorer), all feature-flagged behind `FEATURES.shares`.
> - Verified: `tsc --noEmit` clean · `expo export` bundles · buy/dividend flow
>   tested green on live functions · anon blocked from PII columns + RPCs.
> - **The App-Store build (build 9) is untouched** — module ships later as v1.1.

**Original plan (for reference) follows.**

**Status:** Plan for approval — _no implementation yet._
**Type:** Compliant **showcase / demo** (no real money, no live securities).
**Isolation:** New code only. Feature-flagged. The build currently in Apple
review (build 9) is **not** touched and will **not** be rebuilt or resubmitted
as part of this work.

---

## 1. Concept & compliance framing

A fractional ("tokenized") real-estate investing module modeled on **PRYPCO
Mint** (the first DLD-/VARA-regulated tokenization platform in Dubai) and
**Stake**. Users browse tokenized properties, buy fractions, earn simulated
rental yield + capital appreciation, and trade on a secondary market.

Because this is a **demonstration**, it is built to *look and behave* like a
production, UAE-compliant product while moving **no real money**:

- Modeled on the real regulatory stack it would use in production:
  **DLD** (Dubai Land Department) tokenized title deeds, **VARA** virtual-asset
  regulation, **Central Bank UAE** / licensed custodian, KYC/AML.
- Every property shows compliance signals: "DLD-tokenized title", "VARA
  framework", "Licensed custodian", "KYC verified".
- A persistent, unmissable **"Demonstration — no real money or securities"**
  disclaimer in the module, on the invest confirmation, and in App Store review
  notes. We never claim to actually hold a license.
- **No In-App Purchase, no real payment rails** → avoids securities / IAP
  policy issues. A demo wallet is pre-funded with play money (e.g. AED 100,000).

Working product name: **Noel Mint** · tab label **"Invest"**.
(Alternatives if you prefer: tab "Mint" / "Tokens"; product "Noel Invest".)

---

## 2. The "blockchain" (simulated on-chain ledger)

Per your choice: a **simulated on-chain ledger in Supabase** — behaves like a
chain, no external crypto dependency, fully reliable in-app.

- Every trade appends to `mint_transactions` with a **simulated tx hash**.
- Hashes are **cryptographically hash-linked**: `tx_hash = sha256(prev_hash +
  payload)`, with an incrementing `block_number`. This makes the ledger a real
  tamper-evident hash chain (genuine crypto, no blockchain network) — great for
  the showcase.
- Each user gets a simulated `wallet_address` (`0x…`).
- An **"on-chain ledger" explorer** view per asset (Etherscan-lite) lists every
  transaction with hash, block, parties, tokens, price — visually proves the
  "on-chain" story.
- All money-moving writes go through **atomic Postgres RPC functions**
  (`SECURITY DEFINER`) so availability, wallet balance, holdings and ledger
  always update together and can't be desynced from the client.

---

## 3. Data model (new tables, all `mint_` prefixed, all RLS-protected)

| Table | Purpose | Read access |
|---|---|---|
| `mint_assets` | Tokenized offering: links a `listings` row (or standalone), token symbol, token price, total/available tokens, target raise, funding deadline, projected gross/net yield %, appreciation %, status (funding/funded/closed), mock DLD deed ref | Public |
| `mint_wallets` | Per-user demo wallet: cash balance, `wallet_address`, `kyc_status` | Owner only |
| `mint_holdings` | Per-user ownership: tokens owned, avg cost | Owner only |
| `mint_transactions` | The ledger: type (buy/sell/dividend/transfer), tokens, price, total, `tx_hash`, `block_number`, counterparty, status | Owner (+ asset ledger view: anonymized public) |
| `mint_distributions` | Rental-income events per asset (period, per-token amount) → drives yield | Public |
| `mint_orders` | Secondary-market order book: side, tokens, price, status | Public (book) / owner (own) |

RPC functions: `mint_buy`, `mint_sell`, `mint_place_order`, `mint_fill_order`,
`mint_cancel_order`, `mint_claim_dividends`, `mint_add_demo_funds`,
`mint_complete_kyc`. Migration applied via Supabase `apply_migration` (additive
only — existing tables untouched).

**Seeding:** derive `mint_assets` from the existing 16 `listings` (pick premium
ready/off-plan ones), computing token economics from `price_aed` (e.g. token =
AED 50–100, yield 7–9%, appreciation 5–12%). Seed a few `mint_distributions`.
A `src/data/mint-seed.ts` fallback mirrors `seed-listings.ts` so the UI renders
even before the tables exist or offline.

---

## 4. Screens (match existing Apple Liquid Glass UI + brand tokens)

New tab `app/(tabs)/invest.tsx` (6th, before Profile) + route group `app/mint/*`:

1. **Market** (`invest.tsx`) — hero + compliance badges, portfolio summary strip
   (if signed in), list of tokenized assets (image, token price, funding-progress
   bar, projected yield, min investment), filters, **pull-to-refresh**.
2. **Asset detail** (`mint/[symbol].tsx`) — gallery + metrics; tabs
   **Overview / Financials** (interactive returns calculator) **/ Documents**
   (mock DLD deed + prospectus) **/ Ledger** (on-chain explorer). "Invest" CTA.
3. **Invest flow** (modal sheet) — pick AED amount or token count → fee + projected
   annual income breakdown → confirm → `mint_buy` RPC → success with tx hash +
   "view on ledger".
4. **Portfolio** (`mint/portfolio.tsx`) — total value, invested, unrealized P/L,
   projected monthly income, holdings list, value sparkline, dividend history,
   "Claim dividends".
5. **Secondary market** (`mint/market/[symbol].tsx`) — order book; place sell
   order on owned tokens; instant-buy lowest ask.
6. **Wallet** (`mint/wallet.tsx`) — demo balance, wallet address, "Add demo funds",
   personal ledger history.
7. **KYC gate** (`mint/kyc.tsx`) — lightweight demo KYC before first invest (name,
   Emirates ID, accredited-investor + demo acknowledgement) → sets `kyc_status`.

All screens reuse `Glass`/`GlassBg`, `colors`/`radius` tokens, haptics, and the
pull-to-refresh hook already in the app.

---

## 5. Isolation & feature flag (protecting the live app)

- New `src/lib/features.ts` → `FEATURES.mint`, sourced from
  `extra.features.mint` / `EXPO_PUBLIC_FEATURE_MINT`.
- `(tabs)/_layout.tsx` registers the **Invest** tab only when the flag is on;
  `app/mint/*` routes are unreachable when off. Default **on** for the dev/branch
  build (for demos), documented how to turn off.
- **Only edits to existing files:** (a) add `invest` to `ICONS` in
  `GlassTabBar.tsx`; (b) one conditional `<Tabs.Screen name="invest" />` in
  `_layout.tsx`; (c) wrap app in `MintProvider` in `app/_layout.tsx`. Everything
  else is net-new files. No existing screen/data/logic is modified.
- New `MintProvider` store mirrors `ExperienceProvider` (seed-paint → live DB).
- Analytics reuse the existing `discovery_events` / `track-event` pattern.

---

## 6. Build phases

0. **DB:** migration (tables + RLS + RPC) + seed. _(Supabase, additive)_
1. **Data layer:** types, `src/lib/mint.ts`, `src/data/mint-seed.ts`, feature flag.
2. **Nav + store:** 6th tab, icon, `app/mint/*` group, `MintProvider`.
3. **Screens:** market → asset detail (+ledger) → invest → portfolio → wallet →
   secondary market → KYC.
4. **Polish:** Liquid Glass styling, pull-to-refresh, haptics, disclaimers,
   analytics.
5. **Verify:** `tsc --noEmit` clean + `expo export` bundles; commit & push to
   `claude/bold-maxwell-pdqlsb`. **No EAS build / no App Store action.**

---

## 7. Explicitly out of scope (this pass)

- Real money, real custody, real KYC vendor, real securities issuance.
- Real public blockchain / smart contracts (chosen: simulated ledger).
- Any rebuild or resubmission of the app under Apple review.
- In-App Purchase wiring.

When you later want this in a shipped version, it goes in **v1.1** with its own
App Store review-notes section (demo, no real money) — separate from the current
submission.
