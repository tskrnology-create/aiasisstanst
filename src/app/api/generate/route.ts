// Metin üretim uç noktası. Oturum/RLS doğrulanır; otomatik sosyal yayınlama yapılmaz.
import { publicTextError } from "@/lib/public-error";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBusinessById, isUuid } from "@/lib/api-user";
import { buildGenerateMessages, type BusinessProfile } from "@/lib/brand-prompt";
import { isPostFormat, packageToLegacy, parsePostPackage, recommendFormat } from "@/lib/post-formats";
import { isTone } from "@/lib/tones";
import { isContentKind, isPlatformId } from "@/lib/content-kinds";
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
    console.error("GEMINI_API_KEY tanımlı değil");
    return json({ error: "Yapay zekâ servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, 503);
  }

  let body: { prompt?: unknown; tone?: unknown; parentId?: unknown; businessId?: unknown; kind?: unknown; platform?: unknown; format?: unknown };
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
  const kind = body.kind === undefined || body.kind === null || body.kind === "" ? undefined : body.kind;
  if (kind !== undefined && !isContentKind(kind)) return json({ error: "Geçersiz içerik türü." }, 400);
  const platform = body.platform === undefined || body.platform === null || body.platform === "" ? undefined : body.platform;
  if (platform !== undefined && !isPlatformId(platform)) return json({ error: "Geçersiz platform." }, 400);
  const rawFormat = body.format === undefined || body.format === null || body.format === "" ? undefined : body.format;
  if (rawFormat !== undefined && !isPostFormat(rawFormat)) return json({ error: "Geçersiz format." }, 400);
  const format = rawFormat ?? recommendFormat(platform, kind);
  const parentId = body.parentId === undefined || body.parentId === null || body.parentId === ""
    ? null
    : isUuid(body.parentId) ? body.parentId : null;
  if (body.parentId && !parentId) return json({ error: "Üst içerik kimliği geçersiz." }, 400);

  const { supabase } = auth;
  if (!isUuid(body.businessId)) return json({ error: "Geçerli bir marka seçimi gerekli." }, 400);
  const { business, error: businessError } = await getBusinessById(supabase, body.businessId);
  if (businessError) return json({ error: "Seçili marka profili okunamadı." }, 500);
  if (!business) return json({ error: "Seçili marka bulunamadı veya bu hesaba ait değil." }, 404);

  if (parentId) {
    // Üst içerik, ücretli model çağrısından ÖNCE doğrulanır; geçersizse kota harcanmaz/iade edilmez.
    const { data: parent, error: parentError } = await supabase
      .from("contents")
      .select("id")
      .eq("id", parentId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (parentError) return json({ error: "Üst içerik okunamadı." }, 500);
    if (!parent) return json({ error: "Üst içerik bulunamadı." }, 404);
  }

  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_generation", {
    p_business_id: business.id,
    p_kind: "text",
  });
  if (reserveError) {
    console.error("Metin üretim rezervasyonu başarısız:", reserveError.code);
    return json({ error: "Kullanım durumu şu an denetlenemedi. Lütfen daha sonra tekrar deneyin." }, 500);
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
      primary_share: business.primary_share,
      content_language: business.content_language,
    };
    const result = await generateJson(buildGenerateMessages(profile, { userPrompt: prompt, tone, kind, platform, format }));
    if (!result.ok) return json({ error: publicTextError(result.message) }, 502);
    // Model yanıtı alındıktan sonra maliyet oluştu; kayıt başarısız olsa bile kota iade edilmez.
    saved = true;

    let pkg;
    try {
      pkg = parsePostPackage(result.text, format);
    } catch {
      return json({ error: "Üretilen içerik okunamadı, tekrar deneyin." }, 502);
    }
    const legacy = packageToLegacy(pkg);

    const base = {
      business_id: business.id,
      parent_id: parentId,
      prompt,
      tone: tone ?? null,
      language: business.content_language,
      ...legacy,
      status: "draft",
    };
    let { data: content, error: saveError } = await supabase
      .from("contents")
      .insert({ ...base, format: pkg.format, package: pkg })
      .select("*")
      .single();
    if (saveError && (saveError.code === "42703" || saveError.code === "PGRST204")) {
      // schema_v8 henüz uygulanmamış: yapılandırılmış paket saklanamaz, metin yine de kaydedilir.
      console.error("contents.package sütunu yok; schema_v8 uygulanmalı.");
      ({ data: content, error: saveError } = await supabase.from("contents").insert(base).select("*").single());
      if (content) content = { ...content, format: pkg.format, package: pkg };
    }
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
