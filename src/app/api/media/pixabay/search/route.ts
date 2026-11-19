import { authenticateRequest } from "@/lib/api-user";

const PIXABAY_API = "https://pixabay.com/api/";
const MAX_QUERY_LENGTH = 100;
const MAX_PAGE = 25;
const PER_PAGE = 20;

type PixabayImageHit = {
  id: number;
  pageURL: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  imageWidth: number;
  imageHeight: number;
  user: string;
};

type PixabayVideoHit = {
  id: number;
  pageURL: string;
  tags: string;
  user: string;
  duration: number;
  videos?: {
    small?: { url: string; width: number; height: number; thumbnail: string };
    medium?: { url: string; width: number; height: number; thumbnail: string };
  };
};
type SearchResult =
  | { kind: "photo"; id: number; pageURL: string; tags: string; previewURL: string; width: number; height: number; user: string }
  | { kind: "video"; id: number; pageURL: string; tags: string; user: string; duration: number; thumbnailURL: string; videoURL: string; width: number; height: number };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.PIXABAY_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: "Pixabay araması için sunucuya PIXABAY_API_KEY ortam değişkenini ekleyin." }, 503);
  }

  let body: { kind?: unknown; query?: unknown; page?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, 400);
  }

  const kind = body.kind;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const page = Number.isInteger(body.page) ? Number(body.page) : 1;
  if (kind !== "photo" && kind !== "video") {
    return json({ error: "Arama türü fotoğraf veya video olmalı." }, 400);
  }
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
    return json({ error: `Arama kelimesi 2–${MAX_QUERY_LENGTH} karakter arasında olmalı.` }, 400);
  }
  if (page < 1 || page > MAX_PAGE) {
    return json({ error: "Arama sayfası geçersiz." }, 400);
  }

  const endpoint = kind === "video" ? `${PIXABAY_API}videos/` : PIXABAY_API;
  const url = new URL(endpoint);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "tr");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PER_PAGE));
  if (kind === "photo") url.searchParams.set("image_type", "photo");

  try {
    // Pixabay API şartı: sorgu yanıtları en az 24 saat önbelleğe alınır.
    const upstream = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) });
    if (upstream.status === 429) {
      return json({ error: "Pixabay arama sınırına ulaşıldı. Bir dakika sonra yeniden deneyin." }, 429);
    }
    if (!upstream.ok) {
      return json({ error: "Pixabay arama servisi şu anda yanıt vermiyor." }, 502);
    }

    const payload = (await upstream.json()) as {
      totalHits?: number;
      hits?: Array<PixabayImageHit | PixabayVideoHit>;
    };
    const results: SearchResult[] = [];
    for (const hit of payload.hits ?? []) {
      if (!Number.isSafeInteger(hit.id) || !hit.pageURL?.startsWith("https://pixabay.com/")) continue;
      if (kind === "photo") {
        const image = hit as PixabayImageHit;
        if (!image.previewURL?.startsWith("https://")) continue;
        results.push({
          kind: "photo",
          id: image.id,
          pageURL: image.pageURL,
          tags: image.tags ?? "",
          previewURL: image.previewURL,
          width: image.imageWidth ?? image.previewWidth ?? 0,
          height: image.imageHeight ?? image.previewHeight ?? 0,
          user: image.user ?? "Pixabay katkıcısı",
        });
        continue;
      }
      const video = hit as PixabayVideoHit;
      const rendition = video.videos?.medium ?? video.videos?.small;
      if (!rendition?.url?.startsWith("https://") || !rendition.thumbnail?.startsWith("https://")) continue;
      results.push({
        kind: "video",
        id: video.id,
        pageURL: video.pageURL,
        tags: video.tags ?? "",
        user: video.user ?? "Pixabay katkıcısı",
        duration: video.duration ?? 0,
        thumbnailURL: rendition.thumbnail,
        videoURL: rendition.url,
        width: rendition.width ?? 0,
        height: rendition.height ?? 0,
      });
    }

    return json({ kind, totalHits: payload.totalHits ?? 0, page, results });
  } catch {
    return json({ error: "Pixabay aramasına şu anda ulaşılamıyor. Daha sonra tekrar deneyin." }, 502);
  }
}
