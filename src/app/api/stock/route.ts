// Stok fotoğraf uç noktası (Pexels). Üç işlem:
//  - search : anahtar kelimeyle fotoğraf ara
//  - suggest: içerik konusundan İngilizce anahtar kelime öner (yapay zekâ)
//  - image  : seçilen fotoğrafı sunucudan alıp data URL olarak döndür
// Anahtar yalnızca sunucuda (PEXELS_API_KEY).

import { authenticate, rateLimited } from "@/lib/api-auth";
import { generateJson } from "@/lib/llm";
import {
  ORIENTATIONS,
  buildKeywordMessages,
  fetchImageDataUrl,
  isAllowedImageUrl,
  parseKeywordQuery,
  searchPexels,
  type Orientation,
} from "@/lib/stock";

export const maxDuration = 60;

const MAX_QUERY_LEN = 100;
const MAX_TOPIC_LEN = 300;
const SEARCH_LIMIT_PER_HOUR = 60;
const SUGGEST_LIMIT_PER_HOUR = 20;

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) {
    return json({ error: "Stok fotoğraf servisi henüz yapılandırılmadı (PEXELS_API_KEY)." }, 503);
  }
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }

  if (body.action === "search") {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (query.length < 2) return json({ error: "Aranacak bir kelime yazın." }, 400);
    if (query.length > MAX_QUERY_LEN) return json({ error: `Arama en fazla ${MAX_QUERY_LEN} karakter olabilir.` }, 400);
    const orientation = ORIENTATIONS.includes(body.orientation as Orientation)
      ? (body.orientation as Orientation)
      : "square";
    if (rateLimited(`stock-search:${auth.userId}`, SEARCH_LIMIT_PER_HOUR)) {
      return json({ error: "Saatlik fotoğraf arama sınırına ulaştınız. Biraz sonra tekrar deneyin." }, 429);
    }
    const result = await searchPexels(pexelsKey, query, orientation);
    if (!result.ok) return json({ error: result.message }, 502);
    return json({ photos: result.photos });
  }

  if (body.action === "suggest") {
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (topic.length < 3) return json({ error: "Önce bir içerik seçin veya yazıyı girin." }, 400);
    if (topic.length > MAX_TOPIC_LEN) return json({ error: `Konu en fazla ${MAX_TOPIC_LEN} karakter olabilir.` }, 400);
    if (rateLimited(`stock-suggest:${auth.userId}`, SUGGEST_LIMIT_PER_HOUR)) {
      return json({ error: "Saatlik öneri sınırına ulaştınız. Aramayı kendiniz yazabilirsiniz." }, 429);
    }
    const { data: biz } = await auth.supabase
      .from("businesses")
      .select("industry")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const result = await generateJson(buildKeywordMessages(topic, biz?.industry ?? ""));
    if (!result.ok) return json({ error: result.message }, 502);
    const query = parseKeywordQuery(result.text);
    if (!query) return json({ error: "Öneri üretilemedi, aramayı kendiniz yazın." }, 502);
    return json({ query });
  }

  if (body.action === "image") {
    if (!isAllowedImageUrl(body.url)) return json({ error: "Geçersiz görsel adresi." }, 400);
    const result = await fetchImageDataUrl(body.url);
    if (!result.ok) return json({ error: result.message }, 502);
    return json({ image: result.image });
  }

  return json({ error: "Geçersiz işlem." }, 400);
}
