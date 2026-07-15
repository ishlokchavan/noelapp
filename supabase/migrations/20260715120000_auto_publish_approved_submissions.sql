-- ============================================================================
-- Auto-publish approved listing submissions into the live feed
-- ----------------------------------------------------------------------------
-- The mobile app writes seller submissions to public.listing_submissions (a
-- review queue). The feed reads public.listings (+ listing_translations for the
-- title, + listing_images / cover_image_url for photos). Nothing bridged the two,
-- so "approved" submissions never appeared. This promotes them automatically:
-- on status -> 'approved', create the live listing + English translation and
-- fire the existing publish-listing-photos edge function to move photos into the
-- public bucket.
--
-- ⚠️ Shared prod DB (also powers academy.iclose.ae). Applied via Supabase MCP.
-- ============================================================================

-- Idempotency marker: which submissions have already been promoted.
alter table public.listing_submissions add column if not exists published_reference text;

-- Promote one submission → a live listing. Returns the new reference (or the
-- existing one if already published). SECURITY DEFINER so approvers don't need
-- direct write access to listings.
create or replace function public.publish_listing_submission(p_submission_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.listing_submissions%rowtype;
  v_ref text;
  v_listing_id uuid;
  v_category text;
begin
  select * into s from public.listing_submissions where id = p_submission_id;
  if not found then return null; end if;
  if s.published_reference is not null then return s.published_reference; end if; -- already live

  v_category := case when s.property_type in ('office', 'retail') then 'commercial' else 'residential' end;

  -- Next reference in the IC-#### series.
  select 'IC-' || (coalesce(max((regexp_replace(reference, '\D', '', 'g'))::int), 4000) + 1)::text
    into v_ref
  from public.listings where reference ~ '^IC-\d+$';

  insert into public.listings
    (reference, status, purpose, completion, category, property_type, source, city, community,
     price_aed, bedrooms, bathrooms, area_sqft, is_verified, amenities, published_at, created_at)
  values
    (v_ref, 'active', 'sale', 'ready', v_category, s.property_type, 'owner', s.city, s.community,
     s.price_aed, s.bedrooms, s.bathrooms, s.area_sqft, false, '{}', now(), now())
  returning id into v_listing_id;

  insert into public.listing_translations (listing_id, locale, title, description)
  values (v_listing_id, 'en', s.title, nullif(s.description, ''));

  update public.listing_submissions set published_reference = v_ref where id = p_submission_id;

  -- Publish photos out of the private bucket (best-effort, async via pg_net).
  -- A failure here must not roll back the listing — photos can be re-published.
  begin
    perform net.http_post(
      url := 'https://nnkicmfsdbfpucfcnutn.supabase.co/functions/v1/publish-listing-photos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua2ljbWZzZGJmcHVjZmNudXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODkyMDcsImV4cCI6MjA5NDI2NTIwN30.liASHVfCZQsB4OFwhY6uBYuv99IWXaMBbGGgbuFiKTs'
      ),
      body := jsonb_build_object('submission_id', p_submission_id::text, 'reference', v_ref, 'secret', 'iclose-publish-2026'),
      timeout_milliseconds := 20000
    );
  exception when others then null;
  end;

  return v_ref;
end;
$$;

-- Trigger: promote on approval.
create or replace function public.trg_publish_on_approve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') and new.published_reference is null then
    perform public.publish_listing_submission(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists publish_on_approve on public.listing_submissions;
create trigger publish_on_approve
after update of status on public.listing_submissions
for each row execute function public.trg_publish_on_approve();

-- Backfill: Golf Trails was promoted by hand as IC-3002 before this migration.
update public.listing_submissions
set published_reference = 'IC-3002'
where id = '6e2bac18-3325-4453-b0ab-ba8100a04d3a' and published_reference is null;
