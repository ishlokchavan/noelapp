-- Add purpose / completion / category to seller submissions so the mobile form
-- can carry them through instead of the promoter defaulting them. The
-- publish_listing_submission() function is updated to use these (falling back to
-- sensible defaults / derivation when blank).
--
-- Applied to the shared prod DB (iclose-academy-db) via Supabase MCP.

alter table public.listing_submissions
  add column if not exists purpose text default 'sale',
  add column if not exists completion text default 'ready',
  add column if not exists category text default 'residential';

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
  if s.published_reference is not null then return s.published_reference; end if;

  v_category := coalesce(nullif(s.category, ''),
                        case when s.property_type in ('office','retail') then 'commercial' else 'residential' end);

  select 'IC-' || (coalesce(max((regexp_replace(reference, '\D', '', 'g'))::int), 4000) + 1)::text
    into v_ref
  from public.listings where reference ~ '^IC-\d+$';

  insert into public.listings
    (reference, status, purpose, completion, category, property_type, source, city, community,
     price_aed, bedrooms, bathrooms, area_sqft, is_verified, amenities, published_at, created_at)
  values
    (v_ref, 'active', coalesce(nullif(s.purpose,''),'sale'), coalesce(nullif(s.completion,''),'ready'),
     v_category, s.property_type, 'owner', s.city, s.community,
     s.price_aed, s.bedrooms, s.bathrooms, s.area_sqft, false, '{}', now(), now())
  returning id into v_listing_id;

  insert into public.listing_translations (listing_id, locale, title, description)
  values (v_listing_id, 'en', s.title, nullif(s.description, ''));

  update public.listing_submissions set published_reference = v_ref where id = p_submission_id;

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
