// Haftalık içerik planı önerir. Kayıt oluşturmaz; kullanıcı onaylayınca istemci takvime ekler.
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import type { BusinessProfile } from "@/lib/brand-prompt";
import { isPlatformId, type PlatformId } from "@/lib/content-kinds";
import { buildPlanMessages, parsePlan } from "@/lib/plan-prompt";
import { generateJson, getProvider } from "@/lib/llm";
import { publicTextError } from "@/lib/public-error";
import { upcomingSpecialDays } from "@/lib/special-days";

export const maxDuration = 60;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function releaseReservation(supabase: SupabaseClient, reservationId: string) {
  const { error } = await supabase.rpc("release_generation", { p_reservation_id: reservationId });
  if (error) console.error("Plan rezervasyonu bırakılamadı:", error.code);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  if (!getProvider()) {
    return json({ error: "Yapay zekâ servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, 503);
  }

  let body: { businessId?: unknown; perWeek?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const perWeek = Math.min(7, Math.max(3, Number.isInteger(body.perWeek) ? (body.perWeek as number) : 5));

  const { supabase } = auth;
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const { data: accounts } = await supabase.from("social_accounts").select("platform").eq("business_id", business.id).limit(10);
  const platforms = [...new Set(((accounts ?? []) as Array<{ platform: string }>).map((a) => a.platform).filter(isPlatformId))] as PlatformId[];

  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_generation", {
    p_business_id: business.id,
    p_kind: "text",
  });
  if (reserveError) {
    console.error("Plan rezervasyonu başarısız:", reserveError.code);
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
    const upcoming = upcomingSpecialDays(new Date(), 21, 4).map((d) => d.name);
    const result = await generateJson(buildPlanMessages(profile, { platforms, today: new Date(), upcoming, perWeek }));
    if (!result.ok) return json({ error: publicTextError(result.message) }, 502);
    consumed = true;
    try {
      return json({ items: parsePlan(result.text, platforms, 10), platforms });
    } catch {
      return json({ error: "Plan okunamadı, tekrar deneyin." }, 502);
    }
  } catch (cause) {
    console.error("Plan üretimi başarısız:", cause instanceof Error ? cause.message : "unknown");
    return json({ error: "Plan üretimi şu anda tamamlanamadı. Daha sonra tekrar deneyin." }, 502);
  } finally {
    if (!consumed) await releaseReservation(supabase, reservationId);
  }
}
