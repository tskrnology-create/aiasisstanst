// Sosyal medya "paylaşım paketi": içerik düz metin değil, bir formatın yapısıdır.
// Kanca → gövde → çağrı + (kaydırmalı için slaytlar, video için sahneler) + görsel fikri.
// Model çıktısı burada doğrulanır; kütüphane/takvim eski sütunlarla çalışmaya devam etsin diye
// paket aynı zamanda post_text / story_text alanlarına düzleştirilir.

import type { PlatformId, ContentKind } from "./content-kinds";

export const POST_FORMATS = [
  { id: "gonderi", label: "Tek görsel gönderi", guide: "Tek görselli gönderi: görselin üstüne yazılacak vurucu bir kanca, açıklama gövdesi ve tek çağrı." },
  { id: "karusel", label: "Kaydırmalı (karusel)", guide: "5-7 slayt. Slayt 1 kapak: merak uyandıran kanca. Her slayt tek fikir ve kısa. Son slayt çağrı (kaydet, paylaş, mesaj at). Açıklama (body) slaytları özetler ve kaydırmaya davet eder." },
  { id: "video", label: "Kısa video (Reels/TikTok)", guide: "15-30 saniyelik dikey video. İlk sahne (ilk 3 saniye) güçlü kanca. 3-6 sahne; her sahne için süre (saniye), görüntü tarifi, ekranda görünecek kısa yazı ve isteğe bağlı konuşma. Son sahne çağrı. Çoğu kişi sessiz izler: ekranda yazı olsun." },
  { id: "hikaye", label: "Hikâye serisi", guide: "3 karelik hikâye. Kare 1 kanca veya soru, kare 2 değer/bilgi, kare 3 çağrı. Her karede etkileşim çıkartması öner (anket, soru kutusu, bağlantı)." },
  { id: "metin", label: "Yalnızca metin", guide: "Yalnızca metin paylaşımı: güçlü ilk satır, kısa paragraflar, sonda soru veya çağrı. slides ve scenes boş olsun." },
] as const;

export type PostFormat = (typeof POST_FORMATS)[number]["id"];

export function isPostFormat(value: unknown): value is PostFormat {
  return typeof value === "string" && POST_FORMATS.some((f) => f.id === value);
}

/** Platformda anlamlı formatlar (ilk öğe varsayılan önerilendir). */
const PLATFORM_FORMATS: Record<PlatformId, PostFormat[]> = {
  instagram: ["karusel", "video", "gonderi", "hikaye"],
  facebook: ["gonderi", "video", "metin"],
  x: ["metin", "gonderi"],
  linkedin: ["metin", "karusel", "gonderi"],
  tiktok: ["video"],
};

export function formatsForPlatform(platform?: PlatformId | null): PostFormat[] {
  return platform ? PLATFORM_FORMATS[platform] : POST_FORMATS.map((f) => f.id);
}

/** Format seçilmediyse tür ve platforma göre makul varsayılan. */
export function recommendFormat(platform?: PlatformId | null, kind?: ContentKind | null): PostFormat {
  const allowed = formatsForPlatform(platform);
  const preferred: PostFormat | null =
    kind === "ipucu" ? "karusel" : kind === "sahne" || kind === "etkinlik" ? "video" : kind === "kampanya" || kind === "urun" ? "gonderi" : null;
  if (preferred && allowed.includes(preferred)) return preferred;
  return allowed[0];
}

export interface Slide {
  title: string;
  text: string;
}
export interface Scene {
  seconds: number;
  visual: string;
  on_screen_text: string;
  voiceover: string;
}
export interface PostPackage {
  format: PostFormat;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  slides: Slide[];
  scenes: Scene[];
  visual_brief: string;
  alt_text: string;
}

/** Modele verilen JSON şeması. */
export function packageSchemaPrompt(format: PostFormat): string {
  const lines = [
    `{`,
    `  "hook": "dikkat çeken ilk satır (en fazla 110 karakter)",`,
    `  "body": "gövde metni, kısa paragraflar",`,
    `  "cta": "tek bir net harekete geçirici çağrı",`,
    `  "hashtags": ["#örnek"],`,
  ];
  if (format === "karusel" || format === "hikaye") {
    lines.push(`  "slides": [ { "title": "slayt başlığı (en fazla 50 karakter)", "text": "slayt metni (en fazla 160 karakter)" } ],`);
  }
  if (format === "video") {
    lines.push(`  "scenes": [ { "seconds": 3, "visual": "ne görünecek", "on_screen_text": "ekrandaki kısa yazı", "voiceover": "isteğe bağlı konuşma" } ],`);
  }
  lines.push(`  "visual_brief": "görsel/video için 1-2 cümlelik çekim-tasarım tarifi",`, `  "alt_text": "görseli anlatan erişilebilirlik metni"`, `}`);
  return lines.join("\n");
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
}

export function parsePostPackage(raw: string, format: PostFormat): PostPackage {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Model geçerli JSON döndürmedi");
  }
  if (!data || typeof data !== "object") throw new Error("Geçersiz içerik");
  const o = data as Record<string, unknown>;

  const hook = str(o.hook, 150);
  const body = str(o.body, 2000);
  if (!hook && !body) throw new Error("Metin yok");

  const hashtags = (Array.isArray(o.hashtags) ? o.hashtags : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t.replace(/\s+/g, "")}`))
    .filter((t) => t.length > 1 && t.length <= 40)
    .slice(0, 20);

  const slides: Slide[] =
    format === "karusel" || format === "hikaye"
      ? (Array.isArray(o.slides) ? o.slides : [])
          .map((s) => (s && typeof s === "object" ? (s as Record<string, unknown>) : null))
          .filter((s): s is Record<string, unknown> => s !== null)
          .map((s) => ({ title: str(s.title, 60), text: str(s.text, 220) }))
          .filter((s) => s.title || s.text)
          .slice(0, format === "hikaye" ? 5 : 10)
      : [];

  const scenes: Scene[] =
    format === "video"
      ? (Array.isArray(o.scenes) ? o.scenes : [])
          .map((s) => (s && typeof s === "object" ? (s as Record<string, unknown>) : null))
          .filter((s): s is Record<string, unknown> => s !== null)
          .map((s) => {
            const seconds = Number(s.seconds);
            return {
              seconds: Number.isFinite(seconds) ? Math.min(15, Math.max(1, Math.round(seconds))) : 3,
              visual: str(s.visual, 220),
              on_screen_text: str(s.on_screen_text, 100),
              voiceover: str(s.voiceover, 220),
            };
          })
          .filter((s) => s.visual || s.on_screen_text || s.voiceover)
          .slice(0, 8)
      : [];

  if ((format === "karusel" || format === "hikaye") && slides.length === 0) throw new Error("Slayt yok");
  if (format === "video" && scenes.length === 0) throw new Error("Sahne yok");

  return {
    format,
    hook,
    body,
    cta: str(o.cta, 200),
    hashtags,
    slides,
    scenes,
    visual_brief: str(o.visual_brief, 400),
    alt_text: str(o.alt_text, 300),
  };
}

/** Paylaşılacak ana metin: kanca + gövde + çağrı. */
export function composeText(pkg: Pick<PostPackage, "hook" | "body" | "cta">): string {
  return [pkg.hook, pkg.body, pkg.cta].filter((x) => x.trim()).join("\n\n");
}

export function totalSeconds(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + s.seconds, 0);
}

/** Eski sütunlara düzleştirme: kütüphane, takvim ve görsel stüdyosu bu alanlarla çalışır. */
export function packageToLegacy(pkg: PostPackage): { post_text: string; caption: null; hashtags: string[]; ad_text: null; story_text: string | null } {
  const parts: string[] = [];
  pkg.slides.forEach((s, i) => parts.push(`${i + 1}) ${[s.title, s.text].filter(Boolean).join(": ")}`));
  pkg.scenes.forEach((s, i) =>
    parts.push(`Sahne ${i + 1} (${s.seconds} sn): ${[s.visual, s.on_screen_text && `Yazı: ${s.on_screen_text}`, s.voiceover && `Ses: ${s.voiceover}`].filter(Boolean).join(" · ")}`)
  );
  return {
    post_text: composeText(pkg),
    caption: null,
    hashtags: pkg.hashtags,
    ad_text: null,
    story_text: parts.length ? parts.join("\n") : null,
  };
}
