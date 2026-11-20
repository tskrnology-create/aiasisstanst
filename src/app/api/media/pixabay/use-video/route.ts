import { authenticateRequest, getBusinessById, isUuid, removeVisual, storageErrorCode, uploadVisual } from "@/lib/api-user";
import {
  inferPixabayPosterMime,
  inferPixabayVideoMime,
  isPixabayPageUrl,
  isPixabayPosterUrl,
  isPixabayVideoUrl,
} from "@/lib/pixabay-video-utils";

const PIXABAY_API = "https://pixabay.com/api/videos/";
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_POSTER_BYTES = 5 * 1024 * 1024;
export const maxDuration = 120;

type VideoRendition = { url: string; width: number; height: number; thumbnail: string };
type PixabayVideoHit = {
  id: number;
  pageURL: string;
  tags?: string;
  user?: string;
  duration?: number;
  videos?: { medium?: VideoRendition; small?: VideoRendition };
};
type ReadResult =
  | { ok: true; bytes: Uint8Array; mime: string }
  | { ok: false; status: number; error: string };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function contentMime(response: Response, sourceUrl: string, kind: "video" | "image"): string | null {
  const header = response.headers.get("content-type");
  return kind === "video"
    ? inferPixabayVideoMime(header, sourceUrl)
    : inferPixabayPosterMime(header, sourceUrl);
}

async function readLimited(response: Response, sourceUrl: string, kind: "video" | "image", maxBytes: number): Promise<ReadResult> {
  const mime = contentMime(response, sourceUrl, kind);
  if (!mime) {
    await response.body?.cancel().catch(() => undefined);
    return { ok: false, status: 415, error: kind === "video" ? "Pixabay desteklenmeyen bir video biçimi döndürdü." : "Pixabay desteklenmeyen bir poster biçimi döndürdü." };
  }
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    return { ok: false, status: 413, error: kind === "video" ? "Video 50 MB sınırını aşıyor." : "Video önizleme karesi 5 MB sınırını aşıyor." };
  }
  const reader = response.body?.getReader();
  if (!reader) return { ok: false, status: 502, error: "Pixabay medya yanıtı boş." };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: kind === "video" ? "Video 50 MB sınırını aşıyor." : "Video önizleme karesi 5 MB sınırını aşıyor." };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, status: 502, error: "Pixabay medya akışı güvenli biçimde okunamadı." };
  }
  if (size === 0) return { ok: false, status: 502, error: "Pixabay boş bir medya dosyası döndürdü." };
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes, mime };
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const apiKey = process.env.PIXABAY_API_KEY?.trim();
  if (!apiKey) return json({ error: "Pixabay medya şu anda kullanılamıyor." }, 503);

  let body: { id?: unknown; businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, 400);
  }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "Pixabay video kimliği geçersiz." }, 400);
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const { business, error: businessError } = await getBusinessById(auth.supabase, body.businessId);
  if (businessError) return json({ error: "İşletme profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  try {
    const apiUrl = new URL(PIXABAY_API);
    apiUrl.searchParams.set("key", apiKey);
    apiUrl.searchParams.set("id", String(id));
    apiUrl.searchParams.set("safesearch", "true");
    apiUrl.searchParams.set("per_page", "3");
    const metadataResponse = await fetch(apiUrl, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) });
    if (metadataResponse.status === 429) return json({ error: "Pixabay kullanım sınırına ulaşıldı. Bir dakika sonra yeniden deneyin." }, 429);
    if (!metadataResponse.ok) return json({ error: "Pixabay video bilgisi alınamadı." }, 502);
    const metadata = (await metadataResponse.json()) as { hits?: PixabayVideoHit[] };
    const hit = metadata.hits?.find((candidate) => candidate.id === id);
    if (!hit || !isPixabayPageUrl(hit.pageURL)) return json({ error: "Seçilen Pixabay videosu bulunamadı." }, 404);
    const rendition = hit.videos?.medium ?? hit.videos?.small;
    if (!rendition || !isPixabayVideoUrl(rendition.url) || !isPixabayPosterUrl(rendition.thumbnail)) {
      return json({ error: "Pixabay video veya önizleme adresi güvenli değil." }, 502);
    }

    const videoResponse = await fetch(rendition.url, { redirect: "error", signal: AbortSignal.timeout(90_000) });
    if (!videoResponse.ok) return json({ error: "Pixabay videosu indirilemedi." }, 502);
    const video = await readLimited(videoResponse, rendition.url, "video", MAX_VIDEO_BYTES);
    if (!video.ok) return json({ error: video.error }, video.status);

    const posterResponse = await fetch(rendition.thumbnail, { redirect: "error", signal: AbortSignal.timeout(20_000) });
    if (!posterResponse.ok) return json({ error: "Video önizleme karesi alınamadı." }, 502);
    const poster = await readLimited(posterResponse, rendition.thumbnail, "image", MAX_POSTER_BYTES);
    if (!poster.ok) return json({ error: poster.error }, poster.status);

    const extension = video.mime === "video/webm" ? "webm" : "mp4";
    const path = `${business.id}/${crypto.randomUUID()}-${id}.${extension}`;
    const uploaded = await uploadVisual(request, path, video.bytes, video.mime, 120_000);
    if (!uploaded.ok) {
      console.error("Pixabay videosu depoya yüklenemedi:", uploaded.status, uploaded.message);
      const code = storageErrorCode(uploaded);
      const error = code.startsWith("DEPO_IZIN") || code.startsWith("DEPO_TUR")
        ? "Video depoya kaydedilemedi. Güncel schema_v3_visual_storage.sql ve ardından schema_v4_media_library.sql migration'larını uygulayın."
        : "Video depoya kaydedilemedi. Lütfen daha sonra tekrar deneyin.";
      return json({ error, code }, 500);
    }

    const creator = (hit.user ?? "Pixabay katkıcısı").replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 100);
    const tags = (hit.tags ?? "").replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 350);
    const { data: row, error: insertError } = await auth.supabase
      .from("contents")
      .insert({
        business_id: business.id,
        parent_id: null,
        prompt: `Pixabay videosu${tags ? ` · ${tags}` : ""}`.slice(0, 500),
        tone: null,
        language: business.content_language,
        post_text: null,
        caption: `Pixabay · ${creator}\nKaynak: ${hit.pageURL}`,
        hashtags: [],
        ad_text: null,
        story_text: null,
        visual_url: path,
        visual_type: "video",
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !row) {
      console.error("Pixabay video kaydı eklenemedi:", insertError?.message);
      const cleaned = await removeVisual(request, path);
      return json({
        error: cleaned
          ? "Video indirildi ancak kütüphane kaydı oluşturulamadı."
          : `Kütüphane kaydı başarısız oldu ve geçici video silinemedi. visuals/${path} yolunu elle temizleyin.`,
        code: cleaned ? "KAYIT_DIGER" : "TEMIZLIK_GEREKLI",
      }, 500);
    }

    return new Response(new Blob([poster.bytes as BlobPart], { type: poster.mime }), {
      status: 200,
      headers: {
        "Content-Type": poster.mime,
        "Content-Length": String(poster.bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Id": row.id,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (cause) {
    console.error("Pixabay video akışı başarısız:", cause instanceof Error ? cause.message : "bilinmeyen hata");
    return json({ error: "Pixabay videosu şu anda alınamıyor. Daha sonra tekrar deneyin." }, 502);
  }
}
