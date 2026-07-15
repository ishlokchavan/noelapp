import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/**
 * Seller listing submissions — uploads photos + ownership documents to the
 * private `listing-uploads` bucket (per-user folder, RLS-enforced) and records
 * the submission in `listing_submissions`. Everything stays on-platform.
 */

const BUCKET = 'listing-uploads';

export interface SellerIdentity {
  id: string;
  email: string;
  name: string;
  phone: string;
}

export interface PickedPhoto { uri: string; base64?: string | null; mimeType?: string | null }
export interface PickedMedia { uri: string; mimeType?: string | null; kind: 'image' | 'video'; posterUri?: string }
export interface PickedDoc { uri: string; name?: string | null; mimeType?: string | null; size?: number | null }

export interface ListingForm {
  title: string;
  propertyType: string;
  purpose: 'sale' | 'rent';
  completion: 'ready' | 'off_plan';
  category: 'residential' | 'commercial';
  community: string;
  city: string;
  priceAed: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

/** Pull name / email / phone from the signed-in user so we never re-ask. */
export async function getSellerIdentity(): Promise<SellerIdentity | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const md = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const name =
    md.full_name || md.name ||
    [md.given_name, md.family_name].filter(Boolean).join(' ') || '';
  return { id: user.id, email: user.email ?? '', name, phone: user.phone || md.phone || '' };
}

async function toBuffer(file: { uri: string; base64?: string | null }): Promise<ArrayBuffer> {
  const b64 = file.base64 ?? (await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' }));
  return decode(b64);
}

async function uploadOne(path: string, file: { uri: string; base64?: string | null }, contentType: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, await toBuffer(file), { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Stream a file straight to Storage (no base64 in memory). Reliable for large
 * photos and especially VIDEOS, which OOM the base64 path. Uploads with the
 * signed-in user's token so the per-user-folder RLS still holds.
 */
async function uploadBinary(path: string, uri: string, contentType: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
  const res = await FileSystem.uploadAsync(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
  });
  if (res.status >= 300) throw new Error(`Upload failed (${res.status}): ${(res.body ?? '').slice(0, 300)}`);
  return path;
}

const extFor = (mime?: string | null) =>
  mime?.includes('png') ? 'png'
    : mime?.includes('webp') ? 'webp'
      : mime?.includes('heic') ? 'heic'
        : mime?.includes('quicktime') || mime?.includes('mov') ? 'mov'
          : mime?.includes('mp4') || mime?.includes('video') ? 'mp4'
            : 'jpg';

/** Retry an upload a few times — mobile connections drop mid-transfer, especially
 *  on larger videos. Upserts, so a partial first attempt doesn't block the retry. */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (attempt < tries - 1) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Upload everything then insert the submission. Reports coarse progress so the
 * UI can show "Uploading 3 of 8…". Returns the new submission id.
 */
export async function submitListing(
  form: ListingForm,
  media: PickedMedia[],
  docs: PickedDoc[],
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error('Please sign in to list your property.');

  const draftId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const base = `${user.id}/${draftId}`;

  const images = media.filter((m) => m.kind === 'image');
  const videos = media.filter((m) => m.kind === 'video');
  // A video-only listing has no photo to be the cover — use the first video's
  // generated poster frame as the cover image so nothing is ever blank.
  const posterUri = images.length === 0 ? videos.find((v) => v.posterUri)?.posterUri : undefined;

  const total = (posterUri ? 1 : 0) + images.length + videos.length + docs.length;
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  // Photos (images) — proven base64 → storage upload. Poster (if any) leads.
  const photoPaths: string[] = [];
  if (posterUri) {
    photoPaths.push(await withRetry(() => uploadOne(`${base}/photos/0.jpg`, { uri: posterUri }, 'image/jpeg')));
    tick();
  }
  for (let i = 0; i < images.length; i++) {
    const p = images[i];
    photoPaths.push(await withRetry(() => uploadOne(`${base}/photos/${i}.${extFor(p.mimeType)}`, { uri: p.uri }, p.mimeType ?? 'image/jpeg')));
    tick();
  }

  // Videos — binary stream so large files don't blow up memory.
  const videoPaths: string[] = [];
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    videoPaths.push(await withRetry(() => uploadBinary(`${base}/videos/${i}.${extFor(v.mimeType)}`, v.uri, v.mimeType ?? 'video/mp4')));
    tick();
  }

  const documentPaths: string[] = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const safe = (d.name ?? `document-${i}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    documentPaths.push(await withRetry(() => uploadOne(`${base}/documents/${i}_${safe}`, d, d.mimeType ?? 'application/octet-stream')));
    tick();
  }

  const { data: row, error } = await supabase.from('listing_submissions').insert({
    user_id: user.id,
    title: form.title,
    property_type: form.propertyType,
    purpose: form.purpose,
    completion: form.completion,
    category: form.category,
    community: form.community,
    city: form.city,
    price_aed: form.priceAed,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    area_sqft: form.areaSqft,
    description: form.description,
    contact_name: form.contactName,
    contact_email: form.contactEmail,
    contact_phone: form.contactPhone,
    photo_paths: photoPaths,
    video_paths: videoPaths,
    document_paths: documentPaths,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return row.id as string;
}

export type SubmissionStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export interface MyListing {
  id: string;
  title: string;
  propertyType: string;
  community: string;
  city: string;
  priceAed: number;
  status: SubmissionStatus;
  photoCount: number;
  docCount: number;
  createdAt: string;
  thumbUrl: string | null;
}

/** The signed-in user's submitted listings (newest first), with a signed thumbnail. */
export async function getMyListings(): Promise<MyListing[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: rows, error } = await supabase
    .from('listing_submissions')
    .select('id,title,property_type,community,city,price_aed,status,photo_paths,document_paths,created_at')
    .order('created_at', { ascending: false });
  if (error || !rows) return [];
  return Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rows as any[]).map(async (r) => {
      const media: string[] = r.photo_paths ?? [];
      // Thumbnail the first actual image — a video can't render as an <Image>.
      const isVideo = (p: string) => /\.(mp4|mov)$/i.test(p);
      const firstImage = media.find((p) => !isVideo(p)) ?? null;
      let thumbUrl: string | null = null;
      if (firstImage) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(firstImage, 3600);
        thumbUrl = data?.signedUrl ?? null;
      }
      return {
        id: r.id, title: r.title, propertyType: r.property_type, community: r.community, city: r.city,
        priceAed: Number(r.price_aed), status: r.status as SubmissionStatus,
        photoCount: media.length, docCount: (r.document_paths ?? []).length,
        createdAt: r.created_at, thumbUrl,
      };
    }),
  );
}
