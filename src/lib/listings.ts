import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import type { Listing } from '@/types/listing';
import { filterSeed, SEED_LISTINGS } from '@/data/seed-listings';

/**
 * Live listings data-access — a React-Native port of the web's
 * lib/portal/listings. Reads the same Supabase `listings` table (status=active)
 * with translations, plus the additive `listing_images` carousel table. Falls
 * back to seed data when Supabase isn't configured or is unreachable, so the UI
 * always renders.
 */

export interface ListingFilters {
  purpose?: 'sale' | 'rent';
  completion?: 'ready' | 'off_plan';
  q?: string;
  limit?: number;
}

function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

const LISTING_SELECT =
  'id,reference,purpose,completion,category,property_type,source,city,community,building,latitude,longitude,bedrooms,bathrooms,area_sqft,price_aed,is_verified,cover_image_url,amenities,developer_name,developer_logo,handover_by,payment_plan,agent_name,agency_name,listing_translations(locale,title,description)';

interface ListingRow {
  id: string;
  reference: string;
  purpose: Listing['purpose'];
  completion: Listing['completion'];
  category: Listing['category'];
  property_type: Listing['propertyType'];
  source: 'owner' | 'developer';
  city: string;
  community: string | null;
  building: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  price_aed: number;
  is_verified: boolean;
  cover_image_url: string | null;
  amenities: string[] | null;
  developer_name: string | null;
  developer_logo: string | null;
  handover_by: string | null;
  payment_plan: string | null;
  agent_name: string | null;
  agency_name: string | null;
  listing_translations?: { locale: string; title: string; description: string | null }[];
}

function rowToListing(row: ListingRow, locale: string): Listing {
  const tr =
    row.listing_translations?.find((t) => t.locale === locale) ??
    row.listing_translations?.find((t) => t.locale === 'en') ??
    row.listing_translations?.[0];
  return {
    id: row.id,
    reference: row.reference,
    title: tr?.title ?? row.reference,
    description: tr?.description ?? '',
    purpose: row.purpose,
    completion: row.completion,
    category: row.category,
    propertyType: row.property_type,
    source: row.source === 'developer' ? 'developer' : 'owner',
    city: row.city,
    community: row.community,
    building: row.building,
    latitude: row.latitude,
    longitude: row.longitude,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    areaSqft: row.area_sqft,
    priceAed: Number(row.price_aed),
    isVerified: row.is_verified,
    coverImageUrl: row.cover_image_url,
    amenities: row.amenities ?? [],
    developerName: row.developer_name,
    developerLogo: row.developer_logo,
    handoverBy: row.handover_by,
    paymentPlan: row.payment_plan,
    agentName: row.agent_name,
    agencyName: row.agency_name,
  };
}

/** reference -> ordered carousel image URLs, from the live `listing_images` table. */
export async function fetchCarouselImages(reference?: string): Promise<Record<string, string[]>> {
  if (!isSupabaseConfigured()) return {};
  try {
    let query = supabase
      .from('listing_images')
      .select('reference,url,position')
      .order('position', { ascending: true });
    if (reference) query = query.eq('reference', reference);
    const { data, error } = await query;
    if (error || !data) return {};
    const map: Record<string, string[]> = {};
    for (const r of data as { reference: string; url: string }[]) {
      (map[r.reference] ??= []).push(r.url);
    }
    return map;
  } catch {
    return {};
  }
}

/** reference -> ordered video URLs, from the live `listing_videos` table. */
export async function fetchCarouselVideos(reference?: string): Promise<Record<string, string[]>> {
  if (!isSupabaseConfigured()) return {};
  try {
    let query = supabase
      .from('listing_videos')
      .select('reference,url,position')
      .order('position', { ascending: true });
    if (reference) query = query.eq('reference', reference);
    const { data, error } = await query;
    if (error || !data) return {};
    const map: Record<string, string[]> = {};
    for (const r of data as { reference: string; url: string }[]) {
      (map[r.reference] ??= []).push(r.url);
    }
    return map;
  } catch {
    return {};
  }
}

/** Fetch active listings from Supabase, falling back to seed data. */
export async function getListings(filters: ListingFilters = {}, locale = 'en'): Promise<Listing[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('listings').select(LISTING_SELECT).eq('status', 'active');
      if (filters.purpose) query = query.eq('purpose', filters.purpose);
      if (filters.completion) query = query.eq('completion', filters.completion);
      if (filters.q) query = query.ilike('community', `%${filters.q}%`);
      query = query.order('published_at', { ascending: false }).limit(filters.limit ?? 50);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return (data as unknown as ListingRow[]).map((r) => rowToListing(r, locale));
      }
    } catch {
      /* fall through to seed */
    }
  }
  return filterSeed(filters);
}

/** Fetch a single active listing by reference, falling back to seed. */
export async function getListingByReference(reference: string, locale = 'en'): Promise<Listing | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'active')
        .eq('reference', reference)
        .maybeSingle();
      if (!error && data) return rowToListing(data as unknown as ListingRow, locale);
    } catch {
      /* fall through to seed */
    }
  }
  return SEED_LISTINGS.find((l) => l.reference === reference) ?? null;
}
