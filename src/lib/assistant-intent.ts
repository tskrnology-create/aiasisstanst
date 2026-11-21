// Asistan sohbetindeki serbest metni bir niyete çevirir. Kurallı ve öngörülebilir: yapay zekâ çağrısı yapmaz;
// çağrı yalnızca niyet "içerik üret" veya "fikir ver" olduğunda ilgili uç noktalarda yapılır.

import type { ContentKind, PlatformId } from "./content-kinds";
import type { PostFormat } from "./post-formats";

export type Intent =
  | { type: "ideas"; focus?: string }
  | { type: "week" }
  | { type: "generate"; prompt: string; format?: PostFormat; platform?: PlatformId; kind?: ContentKind };

export interface IntentHints {
  format?: PostFormat;
  platform?: PlatformId;
  kind?: ContentKind;
}

/** Türkçe karakterleri ve büyük/küçük harfi sadeleştirir: "Hikâye" → "hikaye". */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[âá]/g, "a")
    .replace(/[îí]/g, "i")
    .replace(/[ûú]/g, "u");
}

const FORMAT_RULES: Array<[RegExp, PostFormat]> = [
  [/\b(reels?|video|tiktok)\b/, "video"],
  [/\b(karusel|carousel|kaydirmali)\b/, "karusel"],
  [/\b(hikaye|story|stories)\b/, "hikaye"],
  [/\b(tweet|sadece metin|yalnizca metin)\b/, "metin"],
];

const PLATFORM_RULES: Array<[RegExp, PlatformId]> = [
  [/\b(instagram|insta|reels?)\b/, "instagram"],
  [/\b(facebook|face)\b/, "facebook"],
  [/\b(linkedin)\b/, "linkedin"],
  [/\b(tiktok)\b/, "tiktok"],
  [/\b(tweet|twitter)\b|\bx['’]?(te|de)\b/, "x"],
];

const KIND_RULES: Array<[RegExp, ContentKind]> = [
  [/(indirim|kampanya|firsat|kupon|black friday|efsane cuma)/, "kampanya"],
  [/(duyuru|acilis|yeni sube|calisma saat|tatil)/, "duyuru"],
  [/(etkinlik|davet|workshop|atolye|lansman)/, "etkinlik"],
  [/(musteri yorum|yorum|referans|memnun)/, "yorum"],
  [/(ipucu|ipuclari|nasil|puf noktasi|rehber|oneri)/, "ipucu"],
  [/(perde arkasi|ekibimiz|ekip|uretim sureci|bir gun)/, "sahne"],
  [/(tanitim|yeni urun|urunumuz|hizmetimiz|koleksiyon)/, "urun"],
];

function firstMatch<T>(folded: string, rules: Array<[RegExp, T]>): T | undefined {
  for (const [re, value] of rules) if (re.test(folded)) return value;
  return undefined;
}

export function parseIntent(text: string, hints: IntentHints = {}): Intent {
  const raw = text.replace(/\s+/g, " ").trim().slice(0, 500);
  const folded = fold(raw);
  const short = raw.length <= 60;

  if (short && /(haftayi planla|haftalik plan|bu haftanin plani|haftami planla|hafta plani)/.test(folded)) {
    return { type: "week" };
  }
  if (short && /(fikir|ne paylas|ne yazsam|ilham|bos kaldim|aklima bir sey gelmiyor)/.test(folded)) {
    return { type: "ideas", focus: raw.length > 14 ? raw : undefined };
  }

  const format = hints.format ?? firstMatch(folded, FORMAT_RULES);
  const platform = hints.platform ?? firstMatch(folded, PLATFORM_RULES);
  const kind = hints.kind ?? firstMatch(folded, KIND_RULES);
  return { type: "generate", prompt: raw, format, platform, kind };
}
