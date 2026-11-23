// Yorum/DM yanıt asistanı: gelen mesaja marka sesiyle 3 yanıt hazırlar. Kayıt oluşturmaz; gönderim yapmaz.
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import type { BusinessProfile } from "@/lib/brand-prompt";
import { buildReplyMessages, isReplyGoal, isReplySource, parseReplies } from "@/lib/reply-prompt";
import { generateJson, getProvider } from "@/lib/llm";
import { publicTextError } from "@/lib/public-error";

export const maxDuration = 60;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function releaseReservation(supabase: SupabaseClient, reservationId: string) {
  const { error } = await supabase.rpc("release_generation", { p_reservation_id: reservationId });
  if (error) console.error("Yanıt rezervasyonu bırakılamadı:", error.code);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  if (!getProvider()) {
    return json({ error: "Yapay zekâ servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, 503);
  }

  let body: { businessId?: unknown; message?: unknown; source?: unknown; goal?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 2 || message.length > 800) return json({ error: "Yanıtlanacak mesaj 2–800 karakter olmalı." }, 400);
  if (!isReplySource(body.source) || !isReplyGoal(body.goal)) return json({ error: "Geçersiz yanıt ayarı." }, 400);

  const { supabase } = auth;
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_generation", {
    p_business_id: business.id,
    p_kind: "text",
  });
  if (reserveError) {
    console.error("Yanıt rezervasyonu başarısız:", reserveError.code);
    return json({ error: "Kullanım durumu şu an denetlenemedi. Lütfen daha sonra tekrar deneyin." }, 500);
  }
  if (typeof reservationId !== "string") {
    return json({ error: "Saatlik üretim sınırına ulaştınız. Biraz sonra tekrar deneyin." }, 429);
  }

  let consumed = false;
  try {
    const profile: BusinessProfile = {
      name: business.name,
      industry: business.industry,
      products: business.products,
      target_audience: business.target_audience,
      brand_voice: business.brand_voice,
      brand_colors: business.brand_colors ?? [],
      content_language: business.content_language,
    };
        const result = await generateJson(buildReplyMessages(profile, { message, source: body.source, goal: body.goal }));
    if (!result.ok) return json({ error: publicTextError(result.message) }, 502);
    consumed = true;
    try {
      return json({ replies: parseReplies(result.text) });
    } catch {
      return json({ error: "Yanıtlar okunamadı, tekrar deneyin." }, 502);
    }
  } catch (cause) {
    console.error("Yanıt üretimi başarısız:", cause instanceof Error ? cause.message : "unknown");
    return json({ error: "Yanıt üretimi şu anda tamamlanamadı. Daha sonra tekrar deneyin." }, 502);
  } finally {
    if (!consumed) await releaseReservation(supabase, reservationId);
  }
}
