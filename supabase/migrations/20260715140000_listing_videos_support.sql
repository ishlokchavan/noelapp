-- Video support for user-submitted listings so clips play in the feed.
-- Applied to the shared prod DB (iclose-academy-db) via Supabase MCP.

alter table public.listing_submissions add column if not exists video_paths text[] default '{}';

create table if not exists public.listing_videos (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_videos_reference_idx on public.listing_videos(reference);

alter table public.listing_videos enable row level security;
drop policy if exists listing_videos_public_read on public.listing_videos;
create policy listing_videos_public_read on public.listing_videos for select using (true);
grant select on public.listing_videos to anon, authenticated;

-- Allow video in the public photos bucket so clips can be published + streamed.
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime']
where id = 'listing-photos';
