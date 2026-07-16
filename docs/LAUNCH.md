# Noel — iOS launch checklist

Single source of truth for taking the new **Noel** app (`com.noelapp.ios`) from
built `.ipa` to live on the App Store. The legacy **iClose** app
(`ae.iclose.app`) is separate and stays live — nothing here touches it.

Key facts
- Display name: **Noel** · App Store name: **Noel: Property Feed**
- Bundle id: **com.noelapp.ios** · Scheme: **noelapp://**
- EAS project: **@shlokchavan.personal/noelapp** (`681d6f23-d39d-4407-b850-d7fafe484335`)
  — the Expo account is independent of the Apple account; it can hold signing
  credentials for any Apple team.
- **Apple account: Jareth's personal account** (deploying directly here; Shlok has **Admin**).
  Signing certs + provisioning profile + the App Store Connect record all live
  under Jareth's team.
- Backend (shared, unchanged): Supabase **iclose-academy-db**, API **iclose.ae**
- Marketing site: **noelapp.com** · Support/Privacy: GitHub Pages on this repo

> **Why `com.noelapp.ios` and not `com.noelapp.app`?** `com.noelapp.app` was
> registered under Shlok's *personal* Apple team by an earlier build. A bundle
> id is globally unique and can't move to Jareth's team while the personal
> team holds it, and Apple permanently reserves deleted bundle ids — so we ship
> a fresh id on Jareth's team instead. The app was never released, so nothing is
> lost. The abandoned personal app (`6791083696`) can be removed later.

---

## ✅ Done (in this repo)
- [x] Brand renamed iClose → Noel (display) with noelapp as the technical handle
- [x] iOS bundle id `com.noelapp.ios`, scheme/slug `noelapp`, version `1.0.0`
- [x] EAS project created + `projectId`/`owner` wired into `app.config.ts`
- [x] Sign In with Apple entitlement declared (`app.config.ts`) — EAS registers
      it on the new App ID + provisioning profile under Jareth's team
- [x] Brand art: `N.` icon + `Noel` splash
- [x] App Store listing copy (name, subtitle, promo, description) — `APP_STORE_LISTING.md`

## ⛔ Blocker — do before anyone tests sign-in
- [ ] **Supabase → Authentication → URL Configuration → Redirect URLs:** add
      `noelapp://auth-callback`
- [ ] **Supabase → Authentication → Providers → Apple → Authorized Client IDs:**
      add `com.noelapp.ios` (native Sign In with Apple validates the token
      audience against the bundle id; without it Noel's tokens are rejected)
- [ ] Confirm the **Google** provider is enabled for the same project

## 1. Point EAS at Jareth's Apple team
Shlok is **Admin** on Jareth's team, so his Apple login can generate signing assets
under Jareth's team. The Expo `owner` (`shlokchavan.personal`) stays as-is.
- [ ] `eas credentials` → iOS → **production** → sign in with Apple → **pick
      Jareth's team** → generate **Distribution Certificate** + **Provisioning
      Profile** for `com.noelapp.ios` (EAS auto-registers the new bundle id under
      Jareth's team, with Sign In with Apple enabled)
- [ ] App Store Connect (Jareth's account) → **Integrations → App Store Connect API → +**
      → new key, **App Manager** access → download the `.p8` (Shlok can create
      this as Admin) → add to EAS when `eas submit` prompts

> **Personal-account caveat.** On an *individual* Apple Developer account, an
> invited Admin can normally manage Certificates, Identifiers & Profiles — but
> if `eas credentials` doesn't list Jareth's team, or cert/bundle-id creation
> fails with a permissions error, that portal area is holder-only on his
> account. **Fallback:** Jareth (account holder, full access) generates the
> Distribution Certificate + a `com.noelapp.ios` provisioning profile himself,
> exports the cert as a `.p12` (with its password) and the `.mobileprovision`,
> and sends both to Shlok, who imports them via `eas credentials` → **Set up
> from local files**. The ASC API key for submit likewise comes from Jareth if
> Shlok can't create one. Signing still happens under Jareth's team either way.

## 2. Build + create the App Store Connect record
- [ ] `eas build --platform ios --profile production` (signs under Jareth's account)
- [ ] `eas submit --platform ios --profile production` → EAS **creates a fresh
      ASC app record** under Jareth's account and uploads the build
- [ ] Copy the new **ASC App ID** it prints back into `eas.json`
      (`submit.production.ios.ascAppId`) so future submits skip the prompt

## 3. Upload the build → TestFlight
- [ ] Wait for the "processing complete" email (~5–10 min), add yourself as a tester
- [ ] Install and verify: new **N.** icon, **Noel** splash, browse + **sign-in works**
      (sign-in needs the Supabase fix above)

## 4. Store listing assets
- [ ] Screenshots — iPhone only (`supportsTablet: false`): 6.9"/6.7" + 6.5" sizes
- [ ] Host privacy + support pages: repo **Settings → Pages** → branch `main`,
      folder `/docs` → live at `https://ishlokchavan.github.io/noelapp/{privacy-policy,support}.html`
- [ ] Stand up **noelapp.com** (marketing URL in the listing)
- [ ] Paste name/subtitle/description/keywords/URLs from `APP_STORE_LISTING.md`
- [ ] App Privacy answers (in `APP_STORE_LISTING.md`) · Category: Lifestyle · Age 4+

## 5. Compliance
- [ ] **EU trader status** — App Store Connect → **Business** (required by the DSA
      to distribute in the EU; doesn't block TestFlight). Note this is now
      **Jareth's** trader info, not Shlok's.
- [ ] Export compliance: `usesNonExemptEncryption: false` is already set

## 6. Submit for review
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
