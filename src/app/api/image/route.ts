// Yapay zekâ arka plan görseli üretimi.
// Güvenlik: anahtar yalnızca sunucuda; kullanıcı oturumuyla RLS geçerli;
// saatlik limit image_generations tablosundan sayılır (maliyet kontrolü).

import { createClient } from "@supabase/supabase-js";
import { FORMATS, type FormatId } from "@/lib/visual-templates";
import { DEFAULT_RATIO, isRatioId, readPalette, type RatioId } from "@/lib/brand-palette";
import {
  buildImagePrompt,
  generateImage,
  imageProviderConfigured,
  isImageStyle,
} from "@/lib/image-gen";

// Görsel üretimi 60 sn'ye kadar sürebilir.
export const maxDuration = 60;

const HOURLY_LIMIT = 10;
const MAX_TOPIC_LEN = 300;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return json({ error: "Sunucu ayarları eksik." }, 500);
  if (!imageProviderConfigured()) {
    return json({ error: "Görsel servisi henüz yapılandırılmadı (GEMINI_API_KEY)." }, 503);
  }

  // 1) Oturum
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Giriş yapmanız gerekiyor." }, 401);
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Oturum geçersiz, tekrar giriş yapın." }, 401);

  // 2) Girdi doğrulama
  let body: { topic?: unknown; style?: unknown; format?: unknown; ratio?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  // Renk oranı: geçersiz veya eksikse tasarım varsayılanına düşer (%70 / %30).
  const ratioId: RatioId = isRatioId(body.ratio) ? body.ratio : DEFAULT_RATIO;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < 3) return json({ error: "Görsel için bir konu yazın." }, 400);
  if (topic.length > MAX_TOPIC_LEN) {
    return json({ error: `Konu en fazla ${MAX_TOPIC_LEN} karakter olabilir.` }, 400);
  }
  if (!isImageStyle(body.style)) return json({ error: "Geçersiz stil." }, 400);
  const formatId = (typeof body.format === "string" ? body.format : "post") as FormatId;
  const format = FORMATS[formatId];
  if (!format) return json({ error: "Geçersiz format." }, 400);

  // 3) İşletme (RLS: yalnızca kendi kaydı)
  const { data: biz, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, industry, brand_colors")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (bizError) return json({ error: "Profil okunamadı." }, 500);
  if (!biz) return json({ error: "Önce işletme profilinizi kaydedin." }, 400);

  // 4) Saatlik limit
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("image_generations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", biz.id)
    .gte("created_at", since);
  if (countError) {
    console.error("image_generations okunamadı:", countError.code);
    return json(
      { error: "Kullanım tablosu bulunamadı. Supabase SQL Editor'de schema_v2_image_usage.sql dosyasını çalıştırın." },
      500
    );
  }
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return json(
      { error: `Saatlik görsel üretim sınırına (${HOURLY_LIMIT}) ulaştınız. Biraz sonra tekrar deneyin.` },
      429
    );
  }

  // 5) Üretim
  const palette = readPalette((biz.brand_colors ?? []) as string[], ratioId);
  const prompt = buildImagePrompt({
    businessName: biz.name,
    industry: biz.industry,
    topic,
    style: body.style,
    palette,
  });
  const result = await generateImage(prompt, format.aspect);
  if (!result.ok) return json({ error: result.message }, 502);

  // 6) Kullanımı kaydet (başarılı üretimlerde)
  const { error: logError } = await supabase.from("image_generations").insert({ business_id: biz.id });
  if (logError) console.error("Kullanım kaydedilemedi:", logError.code);

  return json({ image: `data:${result.mimeType};base64,${result.data}` });
}
