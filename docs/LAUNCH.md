# Noel — iOS launch checklist

Single source of truth for taking the new **Noel** app (`com.noelapp.app`) from
built `.ipa` to live on the App Store. The legacy **iClose** app
(`ae.iclose.app`) is separate and stays live — nothing here touches it.

Key facts
- Display name: **Noel** · App Store name: **Noel: Property Feed**
- Bundle id: **com.noelapp.app** · Scheme: **noelapp://**
- EAS project: **@shlokchavan.personal/noelapp** (`681d6f23-d39d-4407-b850-d7fafe484335`)
- App Store Connect app: **6791083696** (submits via ASC API key, stored on EAS)
- Backend (shared, unchanged): Supabase **iclose-academy-db**, API **iclose.ae**
- Marketing site: **noelapp.com** · Support/Privacy: GitHub Pages on this repo

---

## ✅ Done (in this repo)
- [x] Brand renamed iClose → Noel (display) with noelapp as the technical handle
- [x] iOS bundle id `com.noelapp.app`, scheme/slug `noelapp`, version `1.0.0`
- [x] EAS project created + `projectId`/`owner` wired into `app.config.ts`
- [x] Apple bundle id registered, Sign In with Apple, cert + provisioning profile
- [x] iOS `.ipa` built on EAS
- [x] Brand art: `N.` icon + `Noel` splash
- [x] App Store listing copy (name, subtitle, promo, description) — `APP_STORE_LISTING.md`

## ⛔ Blocker — do before anyone tests sign-in
- [ ] **Supabase → Authentication → URL Configuration → Redirect URLs:** add
      `noelapp://auth-callback`
- [ ] **Supabase → Authentication → Providers → Apple → Authorized Client IDs:**
      add `com.noelapp.app` (native Sign In with Apple validates against the
      bundle id; the old `ae.iclose.app`-only config rejects Noel's tokens)
- [ ] Confirm the **Google** provider is enabled for the same project

## 1. App Store Connect app record
- [x] Created via `eas submit` → ASC App ID **6791083696** (`com.noelapp.app`)
- [x] `ascAppId` wired into `eas.json` so future submits skip the Apple-login step

## 2. Upload the build → TestFlight
- [x] `eas submit --platform ios --latest` → binary uploaded, Apple processing
- [ ] Wait for the "processing complete" email (~5–10 min), add yourself as a tester
- [ ] Install and verify: new **N.** icon, **Noel** splash, browse + **sign-in works**
      (sign-in needs the Supabase fix above)

## 3. Store listing assets
- [ ] Screenshots — iPhone only (`supportsTablet: false`): 6.9"/6.7" + 6.5" sizes
- [ ] Host privacy + support pages: repo **Settings → Pages** → branch `main`,
      folder `/docs` → live at `https://ishlokchavan.github.io/noelapp/{privacy-policy,support}.html`
- [ ] Stand up **noelapp.com** (marketing URL in the listing)
- [ ] Paste name/subtitle/description/keywords/URLs from `APP_STORE_LISTING.md`
- [ ] App Privacy answers (in `APP_STORE_LISTING.md`) · Category: Lifestyle · Age 4+

## 4. Compliance
- [ ] **EU trader status** — App Store Connect → **Business** (required by the DSA
      to distribute in the EU; doesn't block TestFlight)
- [ ] Export compliance: `usesNonExemptEncryption: false` is already set

## 5. Submit for review
- [ ] Attach the TestFlight build, complete "App Review Information" notes
      (reviewer test steps are in `APP_STORE_LISTING.md`), submit

---

### Rebuilds
App icon & splash are baked into the native binary — after any asset/config
change, a fresh `eas build --profile production --platform ios` is required for
it to show up (a running dev client keeps the old art).

### Android (later)
This pass was iOS-only. The Android `package` is still `ae.iclose.app`; a Play
Store rebrand needs its own bundle change + listing pass.
