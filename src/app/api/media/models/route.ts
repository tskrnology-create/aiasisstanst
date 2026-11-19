import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import { validateGlb } from "@/lib/glb-validation";

const MAX_MODEL_BYTES = 50 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_MODEL_BYTES + 256 * 1024;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function isPixabayPage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "pixabay.com" || url.hostname.endsWith(".pixabay.com"));
  } catch {
    return false;
  }
}

/** Checks GLB v2 container structure before an untrusted model reaches model-viewer. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length <= 0) return json({ error: "İstek boyutu geçersiz." }, 400);
    if (length > MAX_REQUEST_BYTES) return json({ error: "Model yüklemesi 50 MB'ı aşamaz." }, 413);
  }
  if (!request.body) return json({ error: "Model dosyası bulunamadı." }, 400);

  let exceededLimit = false;
  let receivedBytes = 0;
  const limitedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > MAX_REQUEST_BYTES) {
          exceededLimit = true;
          controller.error(new Error("Request size limit exceeded"));
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );

  let form: FormData;
  try {
    const requestInit = {
      method: "POST",
      headers: request.headers,
      body: limitedBody,
      duplex: "half",
    } as RequestInit & { duplex: "half" };
    const limitedRequest = new Request(request.url, requestInit);
    form = await limitedRequest.formData();
  } catch {
    return json({ error: exceededLimit ? "Model yüklemesi 50 MB'ı aşamaz." : "Dosya yükleme isteği okunamadı." }, exceededLimit ? 413 : 400);
  }

  const files = form.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) return json({ error: "Tek bir .glb model dosyası seçin." }, 400);
  const file = files[0];
  if (!file.name.toLowerCase().endsWith(".glb")) return json({ error: "Şimdilik yalnızca .glb dosyaları destekleniyor." }, 415);
  if (file.size < 20 || file.size > MAX_MODEL_BYTES) return json({ error: "Model dosyası boş olmamalı ve 50 MB'ı aşmamalıdır." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validateGlb(bytes)) {
    return json({ error: "Dosya geçerli, tek dosyalı bir GLB v2 modeli değil veya harici doku/URL içeriyor." }, 415);
  }

  const sourceEntry = form.get("source");
  const source = typeof sourceEntry === "string" && sourceEntry.trim() ? sourceEntry.trim() : "https://pixabay.com/3d-models/";
  if (!isPixabayPage(source)) return json({ error: "Kaynak adresi HTTPS Pixabay bağlantısı olmalı." }, 400);

  const { supabase } = auth;
  const businessId = form.get("businessId");
  if (!isUuid(businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const { business, error: businessError } = await getBusinessById(supabase, businessId);
  if (businessError) return json({ error: "İşletme profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const path = `${business.id}/${crypto.randomUUID()}.glb`;
  const { error: uploadError } = await supabase.storage.from("visuals").upload(path, bytes, {
    contentType: "model/gltf-binary",
    upsert: false,
  });
  if (uploadError) return json({ error: "3D model özel depoya kaydedilemedi. schema_v4_media_library.sql migration'ını kontrol edin." }, 500);

  const safeName = file.name.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 200);
  const { data: row, error: insertError } = await supabase
    .from("contents")
    .insert({
      business_id: business.id,
      parent_id: null,
      prompt: `Pixabay 3D modeli · ${safeName}`.slice(0, 500),
      tone: null,
      language: business.content_language,
      post_text: null,
      caption: `Pixabay 3D kataloğu · Kaynak: ${source}`,
      hashtags: [],
      ad_text: null,
      story_text: null,
      visual_url: path,
      visual_type: "model",
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    await supabase.storage.from("visuals").remove([path]);
    return json({ error: "3D model yüklendi ancak kütüphane kaydı oluşturulamadı." }, 500);
  }

  return json({ id: row.id });
}
