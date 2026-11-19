// Metin üretim uç noktası. Oturum/RLS doğrulanır; otomatik sosyal yayınlama yapılmaz.
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import {
  buildGenerateMessages,
  parseGeneratedContent,
  type BusinessProfile,
} from "@/lib/brand-prompt";
import { isTone } from "@/lib/tones";
import { generateJson, getProvider } from "@/lib/llm";

export const maxDuration = 60;

const MAX_PROMPT_LEN = 500;
const HOURLY_LIMIT = 30;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function releaseReservation(supabase: SupabaseClient, reservationId: string) {
  const { error } = await supabase.rpc("release_generation", { p_reservation_id: reservationId });
  if (error) console.error("Üretim rezervasyonu bırakılamadı:", error.code);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  if (!getProvider()) {
    return json({ error: "Yapay zekâ servisi henüz yapılandırılmadı (GEMINI_API_KEY)." }, 503);
  }

  let body: { prompt?: unknown; tone?: unknown; parentId?: unknown; businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 3) return json({ error: "Lütfen ne üretmek istediğinizi yazın." }, 400);
  if (prompt.length > MAX_PROMPT_LEN) {
    return json({ error: `İstek en fazla ${MAX_PROMPT_LEN} karakter olabilir.` }, 400);
  }
  let tone: string | undefined;
  if (body.tone !== undefined && body.tone !== null && body.tone !== "") {
    if (!isTone(body.tone)) return json({ error: "Geçersiz ton." }, 400);
    tone = body.tone;
  }
  const parentId = body.parentId === undefined || body.parentId === null || body.parentId === ""
    ? null
    : isUuid(body.parentId) ? body.parentId : null;
  if (body.parentId && !parentId) return json({ error: "Üst içerik kimliği geçersiz." }, 400);

  const { supabase } = auth;
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_generation", {
    p_business_id: business.id,
    p_kind: "text",
  });
  if (reserveError) {
    console.error("Metin üretim rezervasyonu başarısız:", reserveError.code);
    return json({ error: "Kullanım sınırı denetlenemedi. schema_v5_workspace_and_manual_publishing.sql migration'ının uygulandığını kontrol edin." }, 500);
  }
  if (typeof reservationId !== "string") {
    return json({ error: `Saatlik üretim sınırına (${HOURLY_LIMIT}) ulaştınız. Biraz sonra tekrar deneyin.` }, 429);
  }

  let saved = false;
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
    const result = await generateJson(buildGenerateMessages(profile, { userPrompt: prompt, tone }));
    if (!result.ok) return json({ error: result.message }, 502);

    let generated;
    try {
      generated = parseGeneratedContent(result.text);
    } catch {
      return json({ error: "Üretilen içerik okunamadı, tekrar deneyin." }, 502);
    }
    generated.hashtags = generated.hashtags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/\s+/g, "")}`))
      .slice(0, 20);

    const { data: content, error: saveError } = await supabase
      .from("contents")
      .insert({
        business_id: business.id,
        parent_id: parentId,
        prompt,
        tone: tone ?? null,
        language: business.content_language,
        post_text: generated.post_text,
        caption: generated.caption,
        hashtags: generated.hashtags,
        ad_text: generated.ad_text,
        story_text: generated.story_text,
        status: "draft",
      })
      .select("*")
      .single();
    if (saveError || !content) {
      console.error("İçerik kaydedilemedi:", saveError?.code);
      return json({ error: "İçerik kaydedilemedi." }, 500);
    }
    saved = true;
    return json({ content });
  } catch (cause) {
    console.error("İçerik üretimi başarısız:", cause instanceof Error ? cause.message : "unknown");
    return json({ error: "İçerik üretimi şu anda tamamlanamadı. Daha sonra tekrar deneyin." }, 502);
  } finally {
    if (!saved) await releaseReservation(supabase, reservationId);
  }
}
