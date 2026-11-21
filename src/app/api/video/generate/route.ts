// Yapay zekâ video üretimi: kullanıcının en az 3 görseli ve metniyle video istenir.
// ŞİMDİLİK BAĞLI DEĞİL: istek doğrulanır ve servis bağlanana kadar net bir mesajla reddedilir.
// Sağlayıcı bağlandığında yalnızca bu dosyadaki "dispatch" kısmı doldurulur; arayüz değişmez.
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";

export const MIN_IMAGES = 3;
export const MAX_IMAGES = 6;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  let body: { businessId?: unknown; text?: unknown; imageCount?: unknown; ratio?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 10 || text.length > 800) return json({ error: "Video metni 10–800 karakter olmalı." }, 400);
  const count = Number(body.imageCount);
  if (!Number.isInteger(count) || count < MIN_IMAGES || count > MAX_IMAGES) {
    return json({ error: `Video için ${MIN_IMAGES}–${MAX_IMAGES} görsel gerekir.` }, 400);
  }
  if (body.ratio !== "9:16" && body.ratio !== "16:9") return json({ error: "Geçersiz video oranı." }, 400);

  const { business, error } = await getBusinessById(auth.supabase, body.businessId);
  if (error) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  // dispatch: video sağlayıcısı bağlanınca burada görseller yüklenir ve iş başlatılır.
  return json({ error: "Yapay zekâ video servisi henüz bağlı değil. Hazırladığınız içerik kaybolmaz; servis açılınca buradan üretebileceksiniz.", code: "VIDEO_PROVIDER_NOT_CONNECTED" }, 503);
}
