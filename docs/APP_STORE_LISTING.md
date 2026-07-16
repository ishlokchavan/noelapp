# Noel — App Store Connect listing

Paste these into App Store Connect → Distribution → iOS App → 1.0.0.
Character limits noted in parentheses.

## New app identity (create a fresh App Store Connect record)
- **Bundle ID:** `com.noelapp.ios`, registered under **Edingrad's** team (EAS
  auto-registers it during the first production build — see `LAUNCH.md`).
- This is a **brand-new app**, separate from the legacy iClose app
  (`ae.iclose.app`, ASC id `6783816832`), which stays live. Do **not** reuse the
  old app record or its ascAppId.
- Backend is unchanged: same Supabase project (`iclose-academy-db`) and API.
- The App Store Connect record is created by the first `eas submit` under
  Edingrad's account; copy the new **ASC App ID** it prints into `eas.json`
  (`submit.production.ios.ascAppId`). The earlier personal-account record
  `6791083696` (`com.noelapp.app`) is abandoned and can be removed.

---

## App name (≤30)
Noel: Property Feed

> Alternatives (all ≤30, global, no trademark clash):
> `Noel - Home Discovery Feed` (26) · `Noel: Real Estate Feed` (22) · `Noel - Swipe Homes` (18)

## Subtitle (≤30)
Swipe, discover, save homes

## Promotional text (≤170, editable any time without review)
The addictive way to find your next home. Swipe a full-screen feed that learns your taste — save the ones you love and never miss a new listing.

## Keywords (≤100, comma-separated, no spaces)
dubai,property,real estate,homes,apartment,villa,off-plan,uae,rent,buy,listings,feed,realty

## Description (≤4000)
Noel is the addictive way to find your next home — a full-screen feed that learns your taste.

Swipe through a full-screen, personalised feed of apartments, villas, townhouses and off-plan launches. The more you explore, the smarter your feed gets — the homes you love rise to the top.

WHY NOEL
• A discovery feed that learns your taste as you save and skip
• Save homes you love and pick up right where you left off
• Verified listings from trusted agents and developers
• Off-plan launches with payment plans and handover dates
• Photo and video tours, right in the feed

FIND IT FAST
• Natural-language search — try “2-bed near the marina under 2M with a pool”
• Filter by ready vs. off-plan, beds, price, type and amenities
• Explore on a live map with price pins
• Trending launches and developer collections

SAVE & ENQUIRE
• Save homes to your shortlist and revisit anytime
• Message an agent on WhatsApp, call, or book a viewing in a tap

LIST YOUR HOME
• List your own home in a few taps
• Add a few details and we’ll handle the rest

You can browse everything without an account. Sign in with Apple, Google or email to sync your shortlist.

Noel — find your next home, one swipe at a time.

## What's New (release notes, ≤4000)
First release of Noel:
• Personalised, full-screen home discovery feed
• A feed that learns your taste as you swipe
• Natural-language search, map, and trending launches
• Photo & video tours
• Sign in with Apple, Google or email
• List your property in minutes

## URLs
- Support URL:        https://ishlokchavan.github.io/noelapp/support.html
- Marketing URL:      https://noelapp.com
- Privacy Policy URL: https://ishlokchavan.github.io/noelapp/privacy-policy.html

> These GitHub Pages URLs work once you enable Pages (see README/Hosting below).
> You can also host the two files in docs/ anywhere and use those URLs instead.

## Category
- Primary:   Lifestyle
- Secondary: Business (optional)

## Age rating
4+ (no objectionable content). Answer “None” to all questionnaire items.

---

## App Privacy (Left sidebar → App Privacy)
Data collected and linked to the user’s identity:
- **Contact Info → Email address** — App Functionality, Account (linked).
- **Identifiers → User ID** — App Functionality, Account (linked).
- **Usage Data → Product Interaction** — Analytics / Personalization (you may mark NOT linked, since interaction events are anonymous/session-based).

Answers:
- Do you or your partners use data for tracking? **No.**
- Is data used for third-party advertising? **No.**
- Data is used only for App Functionality, Analytics, and Personalization.

## App Review Information (notes for the reviewer)
"Listings are fully browsable without an account. To test sign-in, use Sign in
with Apple, Google, or create an email account on the Profile tab. Account
deletion is available in-app at Profile → Delete account. Enquiries open
WhatsApp/Phone, which won’t function in the Simulator."

No demo account required (content is public). Provide your contact email/phone.

---

## Hosting the privacy + support pages (GitHub Pages, free)
1. Push this branch / merge to main.
2. GitHub repo → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: **main**, Folder: **/docs** → Save.
3. After a minute the pages are live at:
   - https://ishlokchavan.github.io/noelapp/privacy-policy.html
   - https://ishlokchavan.github.io/noelapp/support.html
   (If your repo name differs, the path matches the repo name.)
