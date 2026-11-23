import type { SupabaseClient } from "@supabase/supabase-js";
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

async function drainVisualCleanup(request: Request, supabase: SupabaseClient, businessId: string) {
  const { data: queued, error } = await supabase
    .from("visual_cleanup_queue")
    .select("id, storage_path, attempts")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) {
    console.warn("Görsel temizleme kuyruğu okunamadı:", error.message);
    return false;
  }

  let complete = true;
  for (const item of queued ?? []) {
    if (await removeVisual(request, item.storage_path)) {
      const { error: deleteError } = await supabase.from("visual_cleanup_queue")
        .delete().eq("id", item.id).eq("business_id", businessId);
      if (deleteError) {
        complete = false;
        console.warn("Silinen medya için kuyruk kaydı temizlenemedi:", deleteError.message);
      }
    } else {
      complete = false;
      const { error: updateError } = await supabase.from("visual_cleanup_queue")
        .update({ attempts: item.attempts + 1, last_error: "Storage silme denemesi başarısız" })
        .eq("id", item.id).eq("business_id", businessId);
      if (updateError) console.warn("Medya cleanup denemesi kaydedilemedi:", updateError.message);
    }
  }
  return complete;
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
  const rawContentId = form.get("contentId");
  const contentId = typeof rawContentId === "string" && rawContentId.trim() ? rawContentId.trim() : null;
  if (contentId && !isUuid(contentId)) return json({ error: "Geçerli bir içerik seçimi gerekli." }, 400);

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

  // Önceki başarısız silme işlemlerini yeni bir kullanıcı işlemi geldiğinde yeniden dene.
  await drainVisualCleanup(request, auth.supabase, business.id);

  const path = `${business.id}/${crypto.randomUUID()}.png`;
  const uploaded = await uploadVisual(request, path, bytes, "image/png");
  if (!uploaded.ok) {
    console.error("Stüdyo görseli depoya yüklenemedi:", uploaded.status, uploaded.message);
    const code = storageErrorCode(uploaded);
    const error = code.startsWith("DEPO_IZIN")
      ? "Supabase Storage izni reddedildi. Önce schema_v3_visual_storage.sql, sonra schema_v4_media_library.sql dosyalarını; oran özelliği için schema_v9_brand_ratio_and_visual_cleanup.sql dosyasını uygulayın."
      : "Görsel kaydedilemedi. Lütfen daha sonra tekrar deneyin.";
    return json({ error, code }, 500);
  }

  const prompt = field(form, "prompt", 500) ?? "Görsel tasarımı";
  let content: Record<string, unknown> | null = null;
  if (contentId) {
    const { data, error: replaceError } = await auth.supabase.rpc("replace_content_visual", {
      p_content_id: contentId,
      p_business_id: business.id,
      p_new_storage_path: path,
      p_prompt: prompt,
      p_tone: field(form, "tone", 100),
      p_post_text: field(form, "postText", 5000),
      p_caption: field(form, "caption", 5000),
      p_hashtags: readHashtags(form),
      p_ad_text: field(form, "adText", 5000),
      p_story_text: field(form, "storyText", 5000),
    });
    if (replaceError || !data || typeof data !== "object") {
      const cleaned = await removeVisual(request, path);
      if (!cleaned) {
        console.error("Başarısız içerik güncellemesinin PNG dosyası silinemedi:", path);
        return json({ error: "İçerik güncellenemedi; yüklenen geçici görselin temizliği tekrar denenecek.", code: "TEMIZLIK_GEREKLI" }, 500);
      }
      const missingMigration = replaceError?.message.includes("replace_content_visual") || replaceError?.code === "42883";
      return json({
        error: missingMigration
          ? "Seçili içeriğe görsel eklemek için Supabase'de schema_v9_brand_ratio_and_visual_cleanup.sql migration'ını uygulayın."
          : "Görsel seçili içeriğe kaydedilemedi. İçerik başka markaya ait olabilir veya silinmiş olabilir.",
      }, missingMigration ? 503 : 404);
    }
    content = data as Record<string, unknown>;
  } else {
    const { data, error: insertError } = await auth.supabase
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
    if (insertError || !data) {
      const cleaned = await removeVisual(request, path);
      if (!cleaned) {
        console.error("Başarısız kütüphane insert'inin PNG dosyası silinemedi:", path);
        return json({ error: "Kütüphane kaydı başarısız oldu; geçici görsel temizliği tekrar denenecek.", code: "TEMIZLIK_GEREKLI" }, 500);
      }
      return json({ error: "Görsel dosyası yüklendi ancak kütüphane kaydı oluşturulamadı." }, 500);
    }
    content = data as Record<string, unknown>;
  }

  const cleanupComplete = await drainVisualCleanup(request, auth.supabase, business.id);
  return json({
    content,
    ...(cleanupComplete ? {} : { cleanupWarning: "Yeni görsel kaydedildi; önceki özel görselin silinmesi kuyruğa alındı ve sonraki kaydetme denemesinde tekrar denenecek." }),
  }, contentId ? 200 : 201);
}
