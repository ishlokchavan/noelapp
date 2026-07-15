-- ============================================================================
-- Unique user email + phone   (REVIEW BEFORE APPLYING)
-- ----------------------------------------------------------------------------
-- ⚠️  The Supabase project (iclose-academy-db) is SHARED with the live web
--     platform (academy.iclose.ae). Do NOT apply this blindly. Run the
--     pre-flight duplicate checks first; adding a UNIQUE index will FAIL if
--     duplicate data already exists, and could affect the web app.
--
-- Email: auth.users.email is already unique (case-insensitive) in Supabase Auth,
--        so duplicate-email signups are already rejected. The index below just
--        mirrors that guarantee on public.profiles.email.
-- Phone: not currently constrained. This adds a normalized phone column + a
--        unique index so no two USER PROFILES can share a phone number.
-- ============================================================================

-- 1) PRE-FLIGHT — run these SELECTs first. Each must return ZERO rows before the
--    matching unique index can be created. Resolve any duplicates by hand.

-- Duplicate profile emails (case-insensitive):
--   select lower(email) as email, count(*)
--   from public.profiles
--   where email is not null and email <> ''
--   group by lower(email) having count(*) > 1;

-- Duplicate profile phones (after normalization):
--   select regexp_replace(phone, '[^0-9+]', '', 'g') as phone, count(*)
--   from public.profiles
--   where phone is not null and phone <> ''
--   group by regexp_replace(phone, '[^0-9+]', '', 'g') having count(*) > 1;

-- ----------------------------------------------------------------------------
-- 2) SCHEMA — additive and idempotent.

-- Add a phone column if the profiles table doesn't already have one.
alter table public.profiles add column if not exists phone text;

-- Keep stored phones normalized (digits + optional leading '+'), so
-- "+971 50 000 0000" and "+971500000000" can't both exist.
-- (App-side normalization lives in src/lib/account.ts — keep the two in sync.)

-- Case-insensitive unique email on profiles (mirrors auth.users).
create unique index if not exists profiles_email_lower_uidx
  on public.profiles (lower(email))
  where email is not null and email <> '';

-- Unique phone across user profiles (ignores blanks).
create unique index if not exists profiles_phone_uidx
  on public.profiles (phone)
  where phone is not null and phone <> '';

-- ----------------------------------------------------------------------------
-- 3) ROLLBACK (if needed)
--   drop index if exists public.profiles_phone_uidx;
--   drop index if exists public.profiles_email_lower_uidx;
--   -- (leave the phone column in place; dropping it is destructive)
