# noelapp — Backup & Restore Runbook

> Snapshot taken **2026-07-05**, before starting a new version of the platform.
> This document is the single source of truth for what exists and how to back
> it up / restore it. Keep it up to date.

---

## 0. What you're protecting (inventory as of 2026-07-05)

### Code — GitHub `ishlokchavan/iclose-v2`
- Branches: `main` (production / App Store baseline), `claude/bold-maxwell-pdqlsb` (active work).
- Backed up: yes, on GitHub. An **offline git bundle** (`iclose-v2-backup.bundle`,
  contains all branches + tags + full history) was also produced — store it somewhere safe.
- A git tag **`backup-2026-07-05`** marks this exact snapshot for easy restore.

### Database — Supabase project `iclose-academy-db`
- Project ref: **`nnkicmfsdbfpucfcnutn`**
- Region: `ap-southeast-1` · Postgres **17.6**
- Host: `db.nnkicmfsdbfpucfcnutn.supabase.co`
- Organization: `hzzcnatbuiluycjbcods` (**Free tier — NO automatic backups; manual backup is essential**)
- **49 public tables**, 92 migrations. Notable data (row counts at snapshot):
  - `discovery_events` 1741 · `audit_logs` 174 · `notifications` 81 · `intern_applications` 78
  - `email_otps` 54 · `listings` 21 · `listing_translations` 21 · `listing_images` 62
  - `profiles` 18 · `leads` 13 · `transactions` 8 · `agents` 6 · `crm_leads` 6 · `deals` 6
  - `shares_*` (assets 8, distributions 18, ledger 10, holdings 2, claims 3, wallets 1)
  - `listing_submissions` 1 · plus taxonomy tables (areas 88, subtypes 14, etc.)
- ⚠️ This DB is **shared with the `academy.iclose.ae` web platform** — it holds real
  business PII (applicant CVs metadata, leads, partners, referrals, CRM). Treat every
  data dump as confidential: **never commit it to git.**

### Edge functions (now mirrored in `supabase/functions/`)
- `send-push` (verify_jwt=false) · `invite-user` (jwt) · `delete-account` (jwt) · `publish-listing-photos` (false, secret-gated)

### Storage buckets (~19 MB total — NOT in any backup yet)
| bucket | public | objects | size |
|---|---|---|---|
| `resumes` | private | 75 | 15.82 MB (⚠️ applicant CVs — PII) |
| `listing-uploads` | private | 6 | 1.41 MB (seller docs/photos) |
| `listing-photos` | public | 4 | 1.03 MB |
| `track-covers` | public | 3 | 0.47 MB |
| `topic-covers` | public | 1 | 0.16 MB |
| `lesson-resources` / `topic-resources` | private | 0 | 0 |

---

## 1. Back up the DATABASE (do this first — it's the irreplaceable part)

Install the Supabase CLI once: `brew install supabase/tap/supabase` (or see
https://supabase.com/docs/guides/cli). Then:

```bash
# Log in and link to the live project
supabase login
supabase link --project-ref nnkicmfsdbfpucfcnutn

# Full schema (tables, RLS, functions, triggers, types) — safe, no rows
supabase db dump -f iclose-schema-2026-07-05.sql

# All data (rows) — CONTAINS PII, store privately, do NOT commit
supabase db dump --data-only -f iclose-data-2026-07-05.sql

# Optional: roles/grants
supabase db dump --role-only -f iclose-roles-2026-07-05.sql
```

**Alternative with plain `pg_dump`** (get the connection string from Dashboard →
Project Settings → Database → Connection string → URI; it contains your DB password):

```bash
pg_dump "postgresql://postgres:[YOUR-DB-PASSWORD]@db.nnkicmfsdbfpucfcnutn.supabase.co:5432/postgres" \
  --no-owner --clean --if-exists -f iclose-full-2026-07-05.sql
```

Store the resulting `.sql` files in a private, encrypted location (password
manager vault, private cloud drive, or an encrypted disk). Keep at least the
schema + data pair together.

---

## 2. Back up STORAGE (buckets / uploaded files)

The CLI doesn't dump storage objects, so download them directly. Easiest is a
small script using the service_role key (Dashboard → Project Settings → API →
`service_role` secret). Example with the Supabase JS client or the `s3`-compatible
endpoint — or simply, per bucket, from the Dashboard → Storage → select bucket →
download. Priority buckets: **`resumes`** (applicant CVs) and **`listing-uploads`**.

```bash
# Using rclone with Supabase's S3-compatible endpoint (Dashboard → Storage → S3 connection)
# Configure an rclone remote pointing at https://nnkicmfsdbfpucfcnutn.storage.supabase.co/storage/v1/s3
rclone copy supabase:resumes ./storage-backup/resumes
rclone copy supabase:listing-uploads ./storage-backup/listing-uploads
rclone copy supabase:listing-photos ./storage-backup/listing-photos
```

---

## 3. Back up CREDENTIALS & SECRETS (collect into a password manager)

None of these live in git (correctly). Gather them into a secure vault so a new
build/environment can be stood up. **Where to find each:**

- [ ] **Supabase**
  - `service_role` key & JWT secret — Dashboard → Project Settings → API
  - DB password — Dashboard → Project Settings → Database (reset if unknown)
  - Edge function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`,
    `WEBHOOK_SECRET`, `WEB_APP_URL` — Dashboard → Edge Functions → Secrets
  - Apple provider config (Client IDs incl. `ae.iclose.app`, Services ID, Secret Key)
    — Dashboard → Authentication → Sign In / Providers → Apple
  - Google provider client ID/secret — same Providers screen
- [ ] **Apple**
  - App Store Connect app ID `6783816832`, bundle id `ae.iclose.app`
  - Apple Developer account (Team ID), signing certs / provisioning (managed by EAS)
  - Sign in with Apple: Services ID, Key ID + `.p8` AuthKey, App ID capability
- [ ] **Google**
  - Play Console developer account (pending approval)
  - Play service account JSON (for `eas submit`) — will live at repo root as
    `google-play-service-account.json` (gitignored)
  - Google Maps Android API key — Google Cloud Console → Credentials
- [ ] **Expo / EAS**
  - Expo account login, project id `329eea7c-7a6a-4abf-bf2c-a5ed6aaf817a`
  - EAS-managed Android keystore & iOS certs — run `eas credentials` to view/export
- [ ] **App env** (`.env`, see `.env.example` for the full list of keys)
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable, safe),
    `GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_API_BASE_URL`

> Tip: also export the EAS keystore so Android signing survives account loss:
> `eas credentials` → Android → download keystore. Losing this means you can never
> update the Play Store listing under the same app again.

---

## 4. Restore procedure (new environment from scratch)

1. **Code**: `git clone` from GitHub, or `git clone iclose-v2-backup.bundle` from the offline bundle. Checkout tag `backup-2026-07-05` for this exact state.
2. **Database**: create/target a Supabase project → `psql "<conn>" -f iclose-schema-*.sql` then `-f iclose-data-*.sql`. Or `supabase db reset` against the linked project.
3. **Edge functions**: `supabase functions deploy send-push invite-user delete-account publish-listing-photos` (sources are in `supabase/functions/`). Re-add their secrets (§3).
4. **Storage**: re-upload the downloaded bucket files to the same bucket names.
5. **Secrets/env**: recreate `.env` from `.env.example` + the vault; re-add Supabase edge secrets and auth provider config.
6. **Builds**: `eas build` (iOS/Android) with restored credentials.

---

## 5. Quick recurring backup (do periodically)

```bash
supabase db dump -f "iclose-schema-$(date +%F).sql"
supabase db dump --data-only -f "iclose-data-$(date +%F).sql"
```
Keep the last few dated pairs. Consider upgrading the Supabase project to Pro to
get automatic daily backups + point-in-time recovery.
