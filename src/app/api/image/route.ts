// Yapay zekâ arka plan görseli üretimi; sosyal ağlara otomatik yayın yapılmaz.
import { publicImageError } from "@/lib/public-error";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import { FORMATS, type FormatId } from "@/lib/visual-templates";
import { DEFAULT_RATIO, isRatioId, readPalette, type RatioId } from "@/lib/brand-palette";
import {
  buildImagePrompt,
  generateImage,
  imageProviderConfigured,
  isImageStyle,
} from "@/lib/image-gen";

export const maxDuration = 60;

const HOURLY_LIMIT = 10;
const MAX_TOPIC_LEN = 300;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function releaseReservation(supabase: SupabaseClient, reservationId: string) {
  const { error } = await supabase.rpc("release_generation", { p_reservation_id: reservationId });
  if (error) console.error("Görsel üretim rezervasyonu bırakılamadı:", error.code);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  if (!imageProviderConfigured()) {
    console.error("GEMINI_API_KEY tanımlı değil");
    return json({ error: "Yapay zekâ ile görsel üretimi şu an kullanılamıyor. Stok fotoğraf seçebilir veya kendi görselinizi yükleyebilirsiniz." }, 503);
  }

  let body: { topic?: unknown; style?: unknown; format?: unknown; ratio?: unknown; businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  const ratioId: RatioId = isRatioId(body.ratio) ? body.ratio : DEFAULT_RATIO;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < 3) return json({ error: "Görsel için bir konu yazın." }, 400);
  if (topic.length > MAX_TOPIC_LEN) {
    return json({ error: `Konu en fazla ${MAX_TOPIC_LEN} karakter olabilir.` }, 400);
  }
  if (!isImageStyle(body.style)) return json({ error: "Geçersiz stil." }, 400);
  const formatId = (typeof body.format === "string" ? body.format : "post") as FormatId;
  const format = Object.hasOwn(FORMATS, formatId) ? FORMATS[formatId] : undefined;
  if (!format) return json({ error: "Geçersiz format." }, 400);

  const { supabase } = auth;
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_generation", {
    p_business_id: business.id,
    p_kind: "image",
  });
  if (reserveError) {
    console.error("Görsel üretim rezervasyonu başarısız:", reserveError.code);
    return json({ error: "Kullanım durumu şu an denetlenemedi. Lütfen daha sonra tekrar deneyin." }, 500);
  }
  if (typeof reservationId !== "string") {
    return json({ error: `Saatlik görsel üretim sınırına (${HOURLY_LIMIT}) ulaştınız. Biraz sonra tekrar deneyin.` }, 429);
  }

  let saved = false;
  try {
    const palette = readPalette((business.brand_colors ?? []) as string[], ratioId);
    const prompt = buildImagePrompt({
      businessName: business.name,
      industry: business.industry,
      topic,
      style: body.style,
      palette,
    });
    const result = await generateImage(prompt, format.aspect);
    if (!result.ok) return json({ error: publicImageError(result.message) }, 502);
    saved = true;
    return json({ image: `data:${result.mimeType};base64,${result.data}` });
  } catch (cause) {
    console.error("Görsel üretimi başarısız:", cause instanceof Error ? cause.message : "unknown");
    return json({ error: "Görsel üretimi şu anda tamamlanamadı. Daha sonra tekrar deneyin." }, 502);
  } finally {
    if (!saved) await releaseReservation(supabase, reservationId);
  }
}
