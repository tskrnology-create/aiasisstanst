// Asistan balonu: markanın herkese açık profil bilgisine göre kısa yanıt verir. Kayıt oluşturmaz.
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import { buildAssistantMessages, parseAssistantReply, sanitizeHistory } from "@/lib/assistant-chat";
import type { BusinessProfile } from "@/lib/brand-prompt";
import { generateJson, getProvider } from "@/lib/llm";
import { publicTextError } from "@/lib/public-error";

export const maxDuration = 60;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function release(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.rpc("release_generation", { p_reservation_id: id });
  if (error) console.error("Asistan rezervasyonu bırakılamadı:", error.code);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  if (!getProvider()) return json({ error: "Asistan şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, 503);

  let body: { businessId?: unknown; message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 2) return json({ error: "Bir mesaj yazın." }, 400);

  const { supabase } = auth;
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("platform, handle")
    .eq("business_id", business.id)
    .limit(10);

  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_generation", {
    p_business_id: business.id,
    p_kind: "text",
  });
  if (reserveError) return json({ error: "Kullanım durumu şu an denetlenemedi. Lütfen daha sonra tekrar deneyin." }, 500);
  if (typeof reservationId !== "string") return json({ error: "Saatlik kullanım sınırına ulaştınız. Biraz sonra tekrar deneyin." }, 429);

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
    const result = await generateJson(
      buildAssistantMessages(
        profile,
        ((accounts ?? []) as Array<{ platform: string; handle: string }>).map((a) => ({ platform: a.platform, handle: a.handle })),
        sanitizeHistory(body.history),
        message
      )
    );
    if (!result.ok) return json({ error: publicTextError(result.message) }, 502);
    consumed = true;
    try {
      return json({ ...parseAssistantReply(result.text) });
    } catch {
      return json({ error: "Yanıt okunamadı, tekrar deneyin." }, 502);
    }
  } catch (cause) {
    console.error("Asistan yanıtı başarısız:", cause instanceof Error ? cause.message : "unknown");
    return json({ error: "Asistan şu anda yanıt veremedi. Daha sonra tekrar deneyin." }, 502);
  } finally {
    if (!consumed) await release(supabase, reservationId);
  }
}
