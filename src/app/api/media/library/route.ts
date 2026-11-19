import { authenticateRequest, getBusinessById, isUuid, removeVisual, storageErrorCode, uploadVisual } from "@/lib/api-user";
import { validatePngBytes } from "@/lib/png-validation";

const MAX_PNG_BYTES = 12 * 1024 * 1024;

type JsonBody = Record<string, unknown>;

function json(body: JsonBody, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function field(form: FormData, name: string, maxLength: number): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const clean = value.replace(/\u0000/g, "").trim().slice(0, maxLength);
  return clean || null;
}

function readHashtags(form: FormData): string[] {
  const raw = field(form, "hashtags", 4000);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 100))
      .filter(Boolean))].slice(0, 30);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PNG_BYTES + 128 * 1024) {
    return json({ error: "Görsel yükleme isteği 12 MB sınırını aşıyor." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Görsel yükleme isteği okunamadı." }, 400);
  }

  const businessId = form.get("businessId");
  if (!isUuid(businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);

  const { business, error: businessError } = await getBusinessById(auth.supabase, businessId);
  if (businessError) return json({ error: "İşletme profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const file = form.get("image");
  if (!(file instanceof File)) return json({ error: "Kaydedilecek PNG görseli bulunamadı." }, 400);
  if (file.type !== "image/png") return json({ error: "Yalnızca PNG görselleri kaydedilebilir." }, 415);
  if (file.size === 0) return json({ error: "PNG görseli boş." }, 400);
  if (file.size > MAX_PNG_BYTES) return json({ error: "Görsel 12 MB sınırını aşıyor." }, 413);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return json({ error: "PNG görseli güvenli biçimde okunamadı." }, 400);
  }
  try {
    validatePngBytes(bytes);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Yüklenen dosya geçerli bir PNG değil." }, 415);
  }

  const path = `${business.id}/${crypto.randomUUID()}.png`;
  const uploaded = await uploadVisual(request, path, bytes, "image/png");
  if (!uploaded.ok) {
    console.error("Stüdyo görseli depoya yüklenemedi:", uploaded.status, uploaded.message);
    const code = storageErrorCode(uploaded);
    const error = code.startsWith("DEPO_IZIN")
      ? "Supabase Storage izni reddedildi. SQL Editor'de önce schema_v3_visual_storage.sql, ardından schema_v4_media_library.sql dosyalarını çalıştırın."
      : "Görsel kaydedilemedi. Lütfen daha sonra tekrar deneyin.";
    return json({ error, code }, 500);
  }

  const prompt = field(form, "prompt", 500) ?? "Görsel tasarımı";
  const { data: content, error: insertError } = await auth.supabase
    .from("contents")
    .insert({
      business_id: business.id,
      parent_id: null,
      prompt,
      tone: field(form, "tone", 100),
      language: business.content_language,
      post_text: field(form, "postText", 5000),
      caption: field(form, "caption", 5000),
      hashtags: readHashtags(form),
      ad_text: field(form, "adText", 5000),
      story_text: field(form, "storyText", 5000),
      visual_url: path,
      visual_type: "image",
      status: "draft",
    })
    .select("*")
    .single();

  if (insertError || !content) {
    const cleaned = await removeVisual(request, path);
    if (!cleaned) {
      return json({
        error: `Kütüphane kaydı başarısız oldu ve geçici dosya silinemedi. Supabase Storage'da visuals/${path} yolunu elle temizleyin.`,
        code: "TEMIZLIK_GEREKLI",
      }, 500);
    }
    return json({ error: "Görsel dosyası yüklendi ancak kütüphane kaydı oluşturulamadı." }, 500);
  }

  return json({ content }, 201);
}
