import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

/**
 * Publish a submission's media out of the private `listing-uploads` bucket into
 * the public `listing-photos` bucket, then wire up the live listing:
 *  - photos  -> cover_image_url + listing_images
 *  - videos  -> listing_videos (played in the feed; cover uses the first photo,
 *               which for a video-only listing is the client-generated poster)
 */
Deno.serve(async (req) => {
  try {
    const { submission_id, reference, secret } = await req.json();
    if (secret !== "iclose-publish-2026") return json({ ok: false, error: "forbidden" }, 403);

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const { data: sub, error: subErr } = await sb
      .from("listing_submissions").select("photo_paths, video_paths").eq("id", submission_id).single();
    if (subErr || !sub) return json({ ok: false, error: "submission not found" }, 404);

    async function copyOut(srcPath: string, destPath: string, fallbackType: string): Promise<string | null> {
      const { data: file, error } = await sb.storage.from("listing-uploads").download(srcPath);
      if (error || !file) return null;
      const buf = new Uint8Array(await file.arrayBuffer());
      const ct = file.type || fallbackType;
      const up = await sb.storage.from("listing-photos").upload(destPath, buf, { contentType: ct, upsert: true });
      if (up.error) return null;
      const { data: pub } = sb.storage.from("listing-photos").getPublicUrl(destPath);
      return pub.publicUrl;
    }

    const photoPaths: string[] = sub.photo_paths ?? [];
    const videoPaths: string[] = sub.video_paths ?? [];

    // Photos → public URLs.
    const imageUrls: string[] = [];
    for (let i = 0; i < photoPaths.length; i++) {
      const ext = (photoPaths[i].split(".").pop() || "jpg").toLowerCase();
      const ctFb = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "heic" ? "image/heic" : "image/jpeg";
      const u = await copyOut(photoPaths[i], `${reference}/${i}.${ext}`, ctFb);
      if (u) imageUrls.push(u);
    }

    // Videos → public URLs.
    const videoUrls: string[] = [];
    for (let i = 0; i < videoPaths.length; i++) {
      const ext = (videoPaths[i].split(".").pop() || "mp4").toLowerCase();
      const ctFb = ext === "mov" ? "video/quicktime" : "video/mp4";
      const u = await copyOut(videoPaths[i], `${reference}/v${i}.${ext}`, ctFb);
      if (u) videoUrls.push(u);
    }

    if (imageUrls.length) {
      await sb.from("listings").update({ cover_image_url: imageUrls[0] }).eq("reference", reference);
      await sb.from("listing_images").delete().eq("reference", reference);
      const rows = imageUrls.slice(1).map((u, idx) => ({ reference, url: u, position: idx + 1 }));
      if (rows.length) await sb.from("listing_images").insert(rows);
    }

    if (videoUrls.length) {
      await sb.from("listing_videos").delete().eq("reference", reference);
      await sb.from("listing_videos").insert(videoUrls.map((u, idx) => ({ reference, url: u, position: idx })));
    }

    return json({ ok: true, images: imageUrls.length, videos: videoUrls.length });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
