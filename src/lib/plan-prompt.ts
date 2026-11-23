// Haftalık içerik planı: işletmenin bir haftalık paylaşımlarını konu sütunlarına dengeli dağıtır.
// Yapay zekâ çağrısı burada yapılmaz; yalnızca mesaj hazırlanır ve yanıt doğrulanır.

import { buildBrandSystemPrompt, type BusinessProfile, type ChatMessage } from "./brand-prompt";
import { isPlatformId, PLATFORMS, type PlatformId } from "./content-kinds";
import { isPostFormat, POST_FORMATS, recommendFormat, type PostFormat } from "./post-formats";

export const PLAN_SLOTS = {
  sabah: { label: "Sabah 09:00", hour: 9, minute: 0 },
  ogle: { label: "Öğle 12:30", hour: 12, minute: 30 },
  aksam: { label: "Akşam 19:00", hour: 19, minute: 0 },
} as const;
export type PlanSlot = keyof typeof PLAN_SLOTS;

export interface PlanItem {
  /** Bugünden itibaren gün sayısı (0-6). */
  day: number;
  slot: PlanSlot;
  platform: PlatformId;
  format: PostFormat;
  pillar: string;
  title: string;
  prompt: string;
}

function clean(v: string | null | undefined): string {
  return (v ?? "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
}

export function buildPlanMessages(
  profile: BusinessProfile,
  opts: { platforms: PlatformId[]; today: Date; upcoming: string[]; perWeek: number }
): ChatMessage[] {
  const platforms = opts.platforms.length ? opts.platforms : (["instagram"] as PlatformId[]);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(opts.today.getFullYear(), opts.today.getMonth(), opts.today.getDate() + i);
    return `${i}=${d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}`;
  });
  const user = [
    `Bu işletme için önümüzdeki 7 gün için ${opts.perWeek} paylaşımlık bir içerik planı hazırla.`,
    "Kurallar:",
    "- Konu sütunlarını dengele: eğitici/ipucu, güven (müşteri yorumu, sonuç), perde arkası, etkileşim (soru/anket) ve EN FAZLA %30 doğrudan satış/tanıtım.",
    "- Aynı gün aynı platformda ikiden fazla paylaşım olmasın; günleri düzgün dağıt.",
    "- Her paylaşım profildeki gerçek ürün/hizmetlere dayansın; uydurma fiyat, tarih veya rakam verme.",
    `- Platformlar yalnızca şunlardan: ${platforms.join(", ")}.`,
    `- Biçim yalnızca şunlardan: ${POST_FORMATS.map((f) => f.id).join(", ")}.`,
    opts.upcoming.length ? `- Yaklaşan özel günler (uygunsa değerlendir): ${opts.upcoming.map(clean).join(", ")}.` : "",
    `Günler: ${days.join("; ")}`,
    "Yalnızca şu JSON biçiminde yanıt ver:",
    '{ "items": [ { "day": 0-6, "slot": "sabah|ogle|aksam", "platform": "...", "format": "...", "pillar": "konu sütunu (en fazla 3 kelime)", "title": "kısa başlık (en fazla 60 karakter)", "prompt": "içerik üretici için 1-2 cümlelik net brief" } ] }',
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: buildBrandSystemPrompt(profile) },
    { role: "user", content: user },
  ];
}

export function parsePlan(raw: string, allowed: PlatformId[], max = 10): PlanItem[] {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    throw new Error("Model geçerli JSON döndürmedi");
  }
  const list = (data as { items?: unknown })?.items;
  if (!Array.isArray(list)) throw new Error("Plan listesi yok");
  const fallbackPlatform = allowed[0] ?? PLATFORMS[0].id;
  const items: PlanItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const day = Number(e.day);
    const prompt = typeof e.prompt === "string" ? clean(e.prompt).slice(0, 300) : "";
    if (!Number.isInteger(day) || day < 0 || day > 6 || prompt.length < 8) continue;
    const slot: PlanSlot = e.slot === "sabah" || e.slot === "ogle" || e.slot === "aksam" ? e.slot : "ogle";
    const platform = isPlatformId(e.platform) && (allowed.length === 0 || allowed.includes(e.platform)) ? e.platform : fallbackPlatform;
    const format = isPostFormat(e.format) ? e.format : recommendFormat(platform, null);
    const title = (typeof e.title === "string" ? clean(e.title) : "").slice(0, 80) || prompt.slice(0, 60);
    const pillar = (typeof e.pillar === "string" ? clean(e.pillar) : "").slice(0, 30) || "Genel";
    items.push({ day, slot, platform, format, pillar, title, prompt });
    if (items.length >= max) break;
  }
  if (items.length === 0) throw new Error("Plan boş");
  return items.sort((a, b) => a.day - b.day);
}
