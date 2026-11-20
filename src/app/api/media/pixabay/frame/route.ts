// Seçilen Pixabay videosunun kapak karesini (thumbnail) sunucudan alıp döndürür.
// Tarayıcı çapraz kaynaklı görseli tuvale çizemediği (canvas bozulur) için kare sunucu
// üzerinden geçer. Hiçbir şey depoya yazılmaz; yalnızca önizleme arka planı içindir.

import { authenticateRequest } from "@/lib/api-user";

const PIXABAY_VIDEO_API = "https://pixabay.com/api/videos/";
const MAX_FRAME_BYTES = 6 * 1024 * 1024;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function isPixabayAsset(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "pixabay.com" || url.hostname.endsWith(".pixabay.com"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.PIXABAY_API_KEY?.trim();
  if (!apiKey) {
    console.error("PIXABAY_API_KEY tanımlı değil");
    return json({ error: "Stok medya şu an kullanılamıyor. Kendi fotoğrafınızı \"Yükle\" sekmesinden ekleyebilirsiniz." }, 503);
  }

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, 400);
  }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "Pixabay video kimliği geçersiz." }, 400);

  const apiUrl = new URL(PIXABAY_VIDEO_API);
  apiUrl.searchParams.set("key", apiKey);
  apiUrl.searchParams.set("id", String(id));

  try {
    const meta = await fetch(apiUrl, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) });
    if (meta.status === 429) return json({ error: "Pixabay kullanım sınırına ulaşıldı. Bir dakika sonra yeniden deneyin." }, 429);
    if (!meta.ok) return json({ error: "Video bilgisi alınamadı." }, 502);
    const payload = (await meta.json()) as {
      hits?: Array<{
        id: number;
        videos?: Record<string, { thumbnail?: string } | undefined>;
      }>;
    };
    const hit = payload.hits?.find((item) => item.id === id);
    const renditions = hit?.videos;
    const thumbnail = [renditions?.large, renditions?.medium, renditions?.small, renditions?.tiny]
      .map((item) => item?.thumbnail)
      .find((value): value is string => typeof value === "string" && isPixabayAsset(value));
    if (!thumbnail) return json({ error: "Videonun kapak karesi bulunamadı." }, 404);

    const frame = await fetch(thumbnail, { signal: AbortSignal.timeout(20_000), redirect: "error" });
    if (!frame.ok) return json({ error: "Kapak karesi indirilemedi." }, 502);
    const mime = (frame.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      await frame.body?.cancel();
      return json({ error: "Kapak karesi biçimi desteklenmiyor." }, 415);
    }
    const bytes = new Uint8Array(await frame.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_FRAME_BYTES) {
      return json({ error: "Kapak karesi geçersiz boyutta." }, 502);
    }
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "Video kapak karesi şu anda alınamıyor. Daha sonra tekrar deneyin." }, 502);
  }
}
