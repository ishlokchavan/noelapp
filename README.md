# Noel — Native App (Expo / React Native)

A genuine native iOS + Android app for the Noel `/experience`. The screens are
native (not a WebView): native navigation, gestures, a snap-paging discovery
feed, native maps, haptics, and Supabase auth. It talks to your **existing**
Next.js backend — the `/api/glass/*` routes and Supabase project are reused as-is.

## Architecture

```
Native app (this repo)                 Supabase  (iclose-academy-db — the live DB)
─────────────────────                  ──────────────────────────────────────────
Expo Router screens          ──read──▶ listings (status=active) + listing_translations
NativeWind (your tokens)     ──read──▶ listing_images (carousel)
Behavioural recommender      ─write──▶ discovery_events / discovery_affinity (analytics)
Supabase JS (AsyncStorage)   ◀──────▶ Supabase Auth (email + Google OAuth)
Instant seed → live upgrade
```

Everything in the feed comes from the **live database** — the exact same source
as the web `/experience` page. The native data layer is a direct port of the
web's `lib/glass/*` + `lib/portal/listings`: it reads the `listings` table
(`status = 'active'`) with translations and the `listing_images` carousel, then
enriches each row with the credit award + one-line hook client-side (identical
logic to the web). The feed paints instantly from bundled seed, then upgrades to
the live rows, so first paint never blocks and the app still works offline.

The Supabase anon key is a publishable, RLS-protected client key (the same one
the web app ships), so the app reads the DB out of the box with no setup.

## What's built (mirrors the web `/experience`)

- **First-run onboarding** — the brand **intro story** (3 slides) then the
  **taste picker** (intent · budget · love a few homes) that seeds the recommender
- **Apple-style liquid-glass tab bar** — floating frosted pill, icons-only, the
  active tab a filled ink circle
- **Home** — full-screen, recommender-ranked discovery feed: swipeable photo/video
  gallery, Save / Share / Pass / Info rail, instant "Why this fits you", haptics,
  swipe-up hint, and an end cap (Review saved / Start over)
- **Behavioural recommender** — per-facet affinity (ported from the web) ranks the
  feed; views/dwell/save/skip/share log to `discovery_events` (DB)
- **Trending** — off-plan launches with a stories rail + project cards
- **Launches** — auto-advancing, Instagram-style **stories viewer** (tap zones,
  hold to pause, save, view home)
- **Search** — instant substring search + chips, upgraded by on-device
  natural-language parsing ("2-bed near the marina under 2M with a pool")
- **Map** — native map with live price-pin markers, filter chips, bottom card carousel
- **Profile** — Supabase email + native Google OAuth, saved/explored
  stats, reset activity, list-your-property
- **Property detail** — photo/video gallery, off-plan payment plan,
  amenities, map link, agent card, "more like this", and the high-intent action bar
  (WhatsApp / Call / Book a viewing) — all tracked, exactly like the web
- **Saved** — shortlist of homes you love, remove, empty state (on-device, same as web)
- **Sell** — listing-create form → `/api/listing`
- Design tokens, types, data layer, recommender, explain, tracking — all ported from web

## Roadmap (next passes)

Inline video playback (currently opens in the system player), developer profile
pages (`/experience/developer/[slug]`), push notifications.

## Prerequisites

- **Node 18+**
- **Quick preview:** the Expo Go app on your phone (most screens)
- **Full features (maps) + store builds:** a *development build*. For iOS builds
  without a Mac, use **EAS Build** (cloud). With a Mac, Xcode works locally.
  Android needs Android Studio or EAS.
- To publish: **Apple Developer** account ($99/yr) and **Google Play** ($25 once).

## Setup

```bash
npm install
npx expo install --fix        # aligns native deps to your installed Expo SDK
cp .env.example .env           # then fill in the values below
```

Fill `.env`:
- `EXPO_PUBLIC_API_BASE_URL` — your deployed site, e.g. `https://iclose.ae`
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same as the web app
- `GOOGLE_MAPS_API_KEY` — an Android-enabled Google Maps key (iOS uses Apple Maps)

> Native apps don't enforce browser CORS, so the cross-origin calls to
> `/api/glass/*` work without any backend CORS changes.

## Run

```bash
# Quick UI preview (no maps): Expo Go
npx expo start            # scan the QR with Expo Go

# Full development build (includes maps, blur, haptics):
npx expo run:ios          # needs a Mac + Xcode
npx expo run:android      # needs Android Studio
# …or build the dev client in the cloud:
npx eas build --profile development --platform ios   # / android
```

## Supabase auth config (one-time)

In the Supabase dashboard → **Authentication → URL Configuration**, add to
**Redirect URLs**:

```
noelapp://auth-callback
exp://*            # optional: lets OAuth work in Expo Go during dev
```

Enable the **Google** provider (same client you use on web). Email/password
works with no extra config.

## Build for the stores

```bash
npm i -g eas-cli && eas login
eas build:configure
eas build --profile production --platform ios       # produces an .ipa
eas build --profile production --platform android    # produces an .aab
eas submit --platform ios       # uploads to App Store Connect
eas submit --platform android    # uploads to Play Console
```

The `assets/` set is Noel-branded: an `N.` monogram (ink `#1d1d1f` + accent
`#0071e3` on white) for `icon.png` / `adaptive-icon.png` / `favicon.png`, and a
centred `Noel` wordmark for `splash.png`. The adaptive icon keeps the mark
inside the Android mask safe zone. Swap these for higher-fidelity brand artwork
any time — keep `icon.png`/`adaptive-icon.png` at 1024×1024 and re-export via
`npx expo-asset` or any 1024px source.

## Notes

- This scaffold was authored against **Expo SDK 53** conventions and could not be
  compiled in the authoring sandbox — run `npx expo install --fix` and
  `npm run typecheck` first; if your CLI installs a newer SDK, the native
  versions will reconcile automatically.
- `app.config.ts` reads everything from env/`extra`, so no secrets are committed.
