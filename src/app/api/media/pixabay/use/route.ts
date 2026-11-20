import { authenticateRequest, getBusinessById, isUuid, removeVisual, storageErrorCode, uploadVisual } from "@/lib/api-user";

const PIXABAY_API = "https://pixabay.com/api/";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

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
    return json({ error: "Stok fotoğraf şu an kullanılamıyor. Kendi fotoğrafınızı \"Yükle\" sekmesinden ekleyebilirsiniz." }, 503);
  }

  let body: { id?: unknown; businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, 400);
  }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "Pixabay medya kimliği geçersiz." }, 400);

  const { supabase } = auth;
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "İşletme profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const apiUrl = new URL(PIXABAY_API);
  apiUrl.searchParams.set("key", apiKey);
  apiUrl.searchParams.set("id", String(id));
  apiUrl.searchParams.set("safesearch", "true");

  try {
    // Pixabay API yanıtı 24 saat cache edilir; seçilen dosya kalıcı kullanım için Storage'a alınır.
    const metadataResponse = await fetch(apiUrl, { next: { revalidate: 86_400 }, redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (metadataResponse.status === 429) {
      return json({ error: "Pixabay kullanım sınırına ulaşıldı. Bir dakika sonra yeniden deneyin." }, 429);
    }
    if (!metadataResponse.ok) return json({ error: "Pixabay görsel bilgisi alınamadı." }, 502);

    const metadata = (await metadataResponse.json()) as {
      hits?: Array<{
        id: number;
        pageURL: string;
        tags?: string;
        user?: string;
        largeImageURL?: string;
        webformatURL?: string;
      }>;
    };
    const hit = metadata.hits?.find((item) => item.id === id);
    if (!hit || !isPixabayAsset(hit.pageURL)) return json({ error: "Seçilen Pixabay görseli bulunamadı." }, 404);

    const sourceImage = hit.largeImageURL ?? hit.webformatURL;
    if (!sourceImage || !isPixabayAsset(sourceImage)) {
      return json({ error: "Görselin indirilebilir adresi geçersiz." }, 502);
    }
    const imageResponse = await fetch(sourceImage, { redirect: "error", signal: AbortSignal.timeout(20_000) });
    if (!imageResponse.ok) return json({ error: "Pixabay görseli indirilemedi." }, 502);
    const declaredLength = Number(imageResponse.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      await imageResponse.body?.cancel();
      return json({ error: "Seçilen görsel 12 MB sınırını aşıyor." }, 413);
    }

    const mime = (imageResponse.headers.get("content-type") ?? "image/jpeg").split(";")[0].toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      await imageResponse.body?.cancel();
      return json({ error: "Pixabay beklenmeyen bir görsel biçimi döndürdü." }, 415);
    }
    const reader = imageResponse.body?.getReader();
    if (!reader) return json({ error: "Pixabay görsel yanıtı boş." }, 502);
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_IMAGE_BYTES) {
          await reader.cancel();
          return json({ error: "Seçilen görsel 12 MB sınırını aşıyor." }, 413);
        }
        chunks.push(value);
      }
    } catch {
      await reader.cancel().catch(() => undefined);
      return json({ error: "Pixabay görseli güvenli biçimde okunamadı." }, 502);
    }
    if (totalBytes === 0) return json({ error: "Pixabay boş bir görsel döndürdü." }, 502);
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${business.id}/${crypto.randomUUID()}-${id}.${extension}`;
    const uploaded = await uploadVisual(request, path, bytes, mime);
    if (!uploaded.ok) {
      console.error("Pixabay görseli depoya yüklenemedi:", uploaded.status, uploaded.message);
      const code = storageErrorCode(uploaded);
      const error = code.startsWith("DEPO_IZIN")
        ? "Supabase Storage izni reddedildi. SQL Editor'de önce schema_v3_visual_storage.sql, ardından schema_v4_media_library.sql dosyalarını çalıştırın."
        : "Görsel kaydedilemedi. Lütfen daha sonra tekrar deneyin.";
      return json(
        { error, code },
        500
      );
    }

    const creator = (hit.user ?? "Pixabay katkıcısı").replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 100);
    const tags = (hit.tags ?? "").replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 350);
    const { data: row, error: insertError } = await supabase
      .from("contents")
      .insert({
        business_id: business.id,
        parent_id: null,
        prompt: `Pixabay fotoğrafı${tags ? ` · ${tags}` : ""}`.slice(0, 500),
        tone: null,
        language: business.content_language,
        post_text: null,
        caption: `Pixabay · ${creator}\nKaynak: ${hit.pageURL}`,
        hashtags: [],
        ad_text: null,
        story_text: null,
        visual_url: path,
        visual_type: "image",
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !row) {
      console.error("Pixabay içerik kaydı eklenemedi:", insertError?.message);
      const cleaned = await removeVisual(request, path);
      if (!cleaned) {
        return json({
          error: `Kütüphane kaydı başarısız oldu ve geçici dosya silinemedi. Supabase Storage'da visuals/${path} yolunu elle temizleyin.`,
          code: "TEMIZLIK_GEREKLI",
        }, 500);
      }
      const missingColumn = /visual_type|column|schema cache/i.test(insertError?.message ?? "");
      return json(
        {
          error: "Görsel indirildi ancak kütüphane kaydı oluşturulamadı.",
          code: missingColumn ? "KAYIT_SEMA" : "KAYIT_DIGER",
        },
        500
      );
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Id": row.id,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "Pixabay görseli şu anda alınamıyor. Daha sonra tekrar deneyin." }, 502);
  }
}
