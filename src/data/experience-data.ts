import { SEED_LISTINGS } from './seed-listings';
import type { Listing, CreditAward, ExperienceListing } from '@/types/listing';
import { aedToCredits } from '@/lib/portal/credits';

/**
 * Experience enrichment — a faithful port of the web app's
 * lib/glass/experience-data.ts. Listings come from the live Supabase `listings`
 * table; this module adds the credit award + one-line hook and provides cover /
 * carousel / video fallbacks (the same cloudfront assets) so media still renders
 * when a row has no explicit images.
 */

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_373qi3JTSvYmXjqMPJT9idOjFt7';
const COVER: Record<string, string> = {
  'IC-1001': `${CDN}/hf_20260617_002543_e188c27d-1f7f-41a3-9c26-76506147c6bc.png`,
  'IC-1002': `${CDN}/hf_20260617_002613_eb69892f-76ef-47ca-a325-f100e334818b.png`,
  'IC-1003': `${CDN}/hf_20260617_003721_84f0c343-e903-4323-a3da-3cc2b40e1caf.png`,
  'IC-1004': `${CDN}/hf_20260617_003731_d8169d74-7b17-4791-85f8-ad305d55f30f.png`,
  'IC-1005': `${CDN}/hf_20260617_003744_5e42a364-7075-48e6-b157-892501c6d8fd.png`,
  'IC-1006': `${CDN}/hf_20260617_003752_1a2077a1-e714-44c0-bd9f-320587367ebc.png`,
  'IC-1007': `${CDN}/hf_20260617_003758_9cd1e39c-34f7-4254-b957-2794b4fd56b3.png`,
  'IC-1008': `${CDN}/hf_20260617_003803_581d9c91-c1f7-4d15-82a0-fbf278dda5c2.png`,
  'IC-1009': `${CDN}/hf_20260617_003812_a0b696ba-39a6-4ce8-b9ce-f142f281ecf1.png`,
  'IC-1010': `${CDN}/hf_20260617_003818_5feff738-8da5-43c6-b04f-58c3252212b4.png`,
  'IC-1011': `${CDN}/hf_20260617_003825_03c046dc-5c3c-4edc-ad64-c1bee05bdc1d.png`,
  'IC-1012': `${CDN}/hf_20260617_003833_cb9eb297-439b-4d90-969e-253590919c91.png`,
  'IC-1013': `${CDN}/hf_20260617_003839_2eff0b07-0f63-4bf6-aeb9-c6f2d09df01e.png`,
  'IC-1014': `${CDN}/hf_20260617_003850_49dffc4f-2d9d-438f-8cd6-9e5722f8377e.png`,
  'IC-1015': `${CDN}/hf_20260617_003856_e005de4e-b563-4f1b-9698-43052d25240b.png`,
  'IC-1016': `${CDN}/hf_20260617_003911_5c9fdb4b-ac4a-4cae-9f3a-f3d494dd6bfc.png`,
};
const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80';

const EX = (file: string) => `${CDN}/${file}`;
const EXTRA_IMAGES: Record<string, string[]> = {
  'IC-1001': ['hf_20260617_024413_3ba497fa-ed2a-4a61-bf4c-61deb776e293.png', 'hf_20260617_024413_50d93cc6-fc24-479a-b5cb-67a2647b05e8.png', 'hf_20260617_024413_5c077e74-b41e-4671-b878-3d1ecd32be30.png'].map(EX),
  'IC-1002': ['hf_20260617_024505_3f3dd0f8-e681-47f5-8212-e5047929c2d3.png', 'hf_20260617_024505_6ac3de7c-09b0-4542-8f68-4177392dbd1c.png', 'hf_20260617_024505_026f74f2-2899-4a2f-83c1-e752855d00a3.png'].map(EX),
  'IC-1003': ['hf_20260617_024511_4e86fb9d-6082-42a5-8c61-ccb3e2f5b09e.png', 'hf_20260617_024511_c41da2f7-007e-4e73-8203-76900bb7937b.png', 'hf_20260617_024511_67590499-ab13-44c7-a64a-daf2cf1f31c5.png'].map(EX),
  'IC-1004': ['hf_20260617_024520_8f3cf5fb-afc3-4469-9417-7072ca86bac2.png', 'hf_20260617_024520_92f1e234-59ed-4e1d-bf95-676aa6f61744.png', 'hf_20260617_024520_2d08b7e2-b291-47ff-87fc-00a5b050ac44.png'].map(EX),
  'IC-1005': ['hf_20260617_024536_247ccd8d-b543-4387-913c-61d3dac84002.png', 'hf_20260617_024536_0b4020b8-970e-46dd-841e-e47dae2fd6ca.png', 'hf_20260617_024536_39f974f7-fb11-47c0-8a94-ac444e777f77.png'].map(EX),
  'IC-1006': ['hf_20260617_024544_b236742e-92a8-445a-a820-f4f6b4a3bd00.png', 'hf_20260617_024543_00800e3e-2bc3-42c2-b6de-1cc6a81c74f1.png'].map(EX),
  'IC-1007': ['hf_20260617_024549_ba3cd781-d33d-4280-bf60-38b4d893f6e8.png', 'hf_20260617_024549_4ae57432-e48c-467b-abed-538c15566774.png', 'hf_20260617_024549_5be6b1a3-e70e-4a4c-a684-38e324fcf1f2.png'].map(EX),
  'IC-1008': ['hf_20260617_024554_633e2324-bd5b-462e-82cd-b2268880d6f9.png', 'hf_20260617_024554_c4e2682d-c619-4ce6-95c9-9397e6b90a24.png', 'hf_20260617_024554_e1ab91bd-61cb-4bb6-a880-370f35bf95e1.png'].map(EX),
  'IC-1009': ['hf_20260617_024559_eb94a50a-9e51-4f09-9bb6-5e1d5351d636.png', 'hf_20260617_024559_d7dba4f7-8da0-472d-826d-3cf0571db236.png', 'hf_20260617_024558_eb88c59a-f1ef-45b3-87fd-eebc5e5bfabf.png'].map(EX),
  'IC-1010': ['hf_20260617_024603_d7033c77-f517-44d8-b46a-8c3403172443.png', 'hf_20260617_024603_bc251382-da02-48ce-bc3e-cfe653a98b15.png', 'hf_20260617_024603_b60e1adc-9575-4f79-a5cb-ce4f0c70a366.png'].map(EX),
  'IC-1011': ['hf_20260617_024609_ea6c66ba-cd35-4757-9969-5ec0c4135de1.png', 'hf_20260617_024609_44cfa7fe-adca-43cb-b148-4cbef90f2b68.png', 'hf_20260617_024609_4489d869-a75c-4835-aecf-60bf10a96049.png'].map(EX),
  'IC-1012': ['hf_20260617_024614_9e2c8b1c-405e-456f-9382-3f029a0ba584.png', 'hf_20260617_024614_fa691f9a-739b-44f8-a369-5e9124f8cbb6.png', 'hf_20260617_024614_561defde-40dd-4a4a-865c-1d361d46a3ae.png'].map(EX),
  'IC-1013': ['hf_20260617_024619_1aa4b65c-5ecf-466f-9eed-343626c562c7.png', 'hf_20260617_024619_e33ead74-10f1-4277-9eeb-bdee6ae09fae.png', 'hf_20260617_024619_5b1696a6-11c0-435b-af9c-ca694dbe5dee.png'].map(EX),
  'IC-1014': ['hf_20260617_024625_a30d0c45-41a8-4921-917a-443d70ac7777.png', 'hf_20260617_024625_6d9e3985-081c-46b7-8697-9c0e44a3d5ec.png', 'hf_20260617_024625_25c5a19e-ea12-4f64-a7db-6fbfeb66c880.png'].map(EX),
  'IC-1015': ['hf_20260617_024634_f10222da-39f6-4fbc-af49-50bdc4539f8a.png', 'hf_20260617_024634_42c4ec37-2c72-4f51-bac1-477cb1e5ea86.png', 'hf_20260617_024634_94506c4a-fbb9-490a-b362-ac60e610baef.png'].map(EX),
  'IC-1016': ['hf_20260617_024641_0815a7a6-230f-4cd9-b473-0a54a31a9a78.png', 'hf_20260617_024641_80ced36d-3f69-4128-a2a2-e8d421b85ec0.png', 'hf_20260617_024641_855455cb-c0a8-48f2-ab9f-30b4bffd96ff.png'].map(EX),
};

const VID = CDN;
const VIDEO_MAP: Record<string, string[]> = {
  'IC-1001': [`${VID}/hf_20260617_042811_d630e2f5-e8fb-47f3-a864-931d9b6ab0e7.mp4`],
  'IC-1003': [
    `${VID}/hf_20260617_042828_9abd9ca0-3f44-471b-b733-81fc68831593.mp4`,
    `${VID}/hf_20260617_042832_58ddc9ba-4c26-4b73-af81-17c9048948b3.mp4`,
  ],
  'IC-1005': [`${VID}/hf_20260617_042818_8171b3a7-7af2-4b78-bcc4-f2cbcc046195.mp4`],
  'IC-1010': [`${VID}/hf_20260617_042823_fbadb123-28e2-44e8-9f08-0d6b14ed96cc.mp4`],
};

/** Commission rate noelapp rebates as credits (mirror of the web). */
const DEV_COMMISSION: Record<string, number> = {
  Binghatti: 6.5,
  Emaar: 5,
  Damac: 6,
  Sobha: 5,
  Aldar: 5,
  Arada: 5,
  'Al Hamra': 5,
  Meraas: 5.5,
};

export function creditAward(listing: Listing): CreditAward {
  const pct =
    listing.completion === 'off_plan'
      ? DEV_COMMISSION[listing.developerName ?? ''] ?? 5
      : 2;
  const valueAed = Math.round((listing.priceAed * pct) / 100);
  return { pct, valueAed, credits: aedToCredits(valueAed) };
}

function hookFor(listing: Listing): string {
  if (listing.completion === 'off_plan') {
    return listing.paymentPlan
      ? `Off-plan · ${listing.paymentPlan} plan`
      : 'New off-plan release';
  }
  if (listing.priceAed >= 15_000_000) return 'Trophy home';
  if (listing.amenities.some((a) => /beach|water|sea/i.test(a))) return 'Waterfront';
  if (listing.amenities.some((a) => /landmark|burj|view/i.test(a))) return 'Landmark views';
  return listing.isVerified ? 'Verified listing' : 'Fresh to market';
}

/** Map a live (or seed) listing into the experience shape. */
export function toExperienceListing(
  listing: Listing,
  extras?: string[],
  videoExtras?: string[],
): ExperienceListing {
  const cover = listing.coverImageUrl ?? COVER[listing.reference] ?? FALLBACK_COVER;
  const gallery = extras?.length ? extras : EXTRA_IMAGES[listing.reference] ?? [];
  const images = [cover, ...gallery.filter((u) => u !== cover)];
  const videos = videoExtras?.length ? videoExtras : VIDEO_MAP[listing.reference] ?? [];
  return {
    ...listing,
    cover,
    images,
    videos,
    hook: hookFor(listing),
    credit: creditAward(listing),
  };
}

/** Fallback dataset (seed) used only if the live table is empty/unreachable. */
export const FALLBACK_EXPERIENCE_LISTINGS: ExperienceListing[] =
  SEED_LISTINGS.map((l) => toExperienceListing(l));

/** Compact AED formatter — "AED 3.2M" / "AED 620K". */
export function formatAed(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `AED ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (value >= 1_000) return `AED ${Math.round(value / 1_000)}K`;
  return `AED ${value}`;
}

/** Credits with thousands separators — "150,000". */
export function formatCredits(credits: number): string {
  return credits.toLocaleString('en-US');
}
