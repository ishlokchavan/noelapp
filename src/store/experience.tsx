import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getListings, fetchCarouselImages, fetchCarouselVideos } from '@/lib/listings';
import { toExperienceListing, FALLBACK_EXPERIENCE_LISTINGS } from '@/data/experience-data';
import type { ExperienceListing } from '@/types/listing';

interface ExperienceValue {
  listings: ExperienceListing[];
  launches: ExperienceListing[];
  loading: boolean;
  byRef: (reference: string) => ExperienceListing | undefined;
  /** Re-fetch listings from Supabase (used by pull-to-refresh). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<ExperienceValue | null>(null);

/**
 * Reads the live Supabase `listings` table (+ `listing_images`) directly —
 * the same data source as the web /experience page — enriching each row with
 * credits + hook. Paints instantly from seed, then upgrades to live data, so
 * first render never blocks on the network and the app works offline too.
 */
export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<ExperienceListing[]>(FALLBACK_EXPERIENCE_LISTINGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [live, extras, vids] = await Promise.all([
        getListings({ purpose: 'sale', limit: 50 }),
        fetchCarouselImages(),
        fetchCarouselVideos(),
      ]);
      if (live.length) setListings(live.map((l) => toExperienceListing(l, extras[l.reference], vids[l.reference])));
    } catch {
      /* keep current/seed */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const value = useMemo<ExperienceValue>(
    () => ({
      listings,
      launches: listings.filter((l) => l.completion === 'off_plan'),
      loading,
      byRef: (reference) => listings.find((l) => l.reference === reference),
      refresh,
    }),
    [listings, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExperience(): ExperienceValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useExperience must be used within <ExperienceProvider>');
  return ctx;
}
