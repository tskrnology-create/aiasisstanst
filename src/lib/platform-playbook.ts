// Platform bazlı paylaşım kuralları. Sayılar yayımlanmış içerik rehberlerinden (ör. SocialPilot'un
// platform bazlı başlık/açıklama uzunluğu rehberi, Hootsuite ideal gönderi uzunluğu) derlenmiş yaklaşık
// önerilerdir; platformlar değiştirebilir. Hashtag aralıkları kaynakta sayısal verilmediği için pratik öneridir.
// Aynı kurallar hem yapay zekâ isteminde hem de "Paylaşım kontrolü" listesinde kullanılır.

import type { PlatformId } from "./content-kinds";

export interface Playbook {
  /** Platformun karakter sınırı. */
  limit: number;
  /** İdeal uzunluk aralığı (karakter). */
  ideal: [number, number];
  /** Kullanıcının akışta kesilmeden gördüğü yaklaşık karakter sayısı: kanca bu sınır içinde olmalı. */
  hookChars: number;
  hashtags: [number, number];
  /** Yapay zekâ istemine eklenen Türkçe yönerge. */
  prompt: string;
}

export const PLAYBOOK: Record<PlatformId, Playbook> = {
  instagram: {
    limit: 2200,
    ideal: [60, 300],
    hookChars: 125,
    hashtags: [3, 8],
    prompt:
      "Instagram için yaz: ana mesaj ilk 125 karakterde olsun (devamı \"daha fazla\" arkasında kalır), açıklama kısa tut (ideal 150 karakter civarı), paragrafları kısa satırlara böl, uygun emoji kullan, hashtag'leri sona koy (3-8 adet, konuya özel).",
  },
  facebook: {
    limit: 63206,
    ideal: [40, 300],
    hookChars: 125,
    hashtags: [0, 3],
    prompt:
      "Facebook için yaz: ilk cümle ana mesajı taşısın (mobilde yaklaşık 125 karakter görünür), sohbet havasında ve kısa tut, hashtag en fazla 1-3 adet olsun, bir soru veya net çağrı ile bitir.",
  },
  x: {
    limit: 280,
    ideal: [100, 270],
    hookChars: 280,
    hashtags: [0, 2],
    prompt:
      "X için yaz: gönderi metni en fazla 270 karakter olsun (hashtag dahil), ana noktayla başla, en çok 2 hashtag kullan, gereksiz dolgu cümlesi yazma.",
  },
  linkedin: {
    limit: 3000,
    ideal: [600, 2000],
    hookChars: 200,
    hashtags: [0, 5],
    prompt:
      "LinkedIn için yaz: ilk 200 karakter güçlü bir kanca olsun (devamı \"daha fazla\" arkasında kalır), profesyonel ve değer odaklı anlat, kısa paragraflar kullan, abartılı emoji kullanma, sonda tartışma başlatan bir soru sor, en çok 3-5 hashtag ekle.",
  },
  tiktok: {
    limit: 4000,
    ideal: [50, 300],
    hookChars: 90,
    hashtags: [3, 5],
    prompt:
      "TikTok için yaz: video açıklaması kısa olsun (50-150 karakter), ilk 80-100 karakterde merak uyandıran kanca ver, #fyp gibi geniş etiketler yerine konuya özel 3-5 hashtag kullan. Videonun ilk 3 saniyesi için bir kanca cümlesi de öner.",
  },
};

/** Her içerikte geçerli genel kurallar (platform seçilmese de). */
export const UNIVERSAL_RULES =
  "Genel kurallar: ilk cümle dikkat çeken bir kanca olsun; tek bir net harekete geçirici çağrı (ör. mesaj at, rezervasyon yap) ekle; kısa paragraflar kullan; müşteriye sağlanan faydayı somut anlat; profilde olmayan fiyat, tarih, telefon veya adres uydurma.";

export type CheckStatus = "ok" | "warn";
export interface PostCheck {
  id: "length" | "hook" | "hashtags" | "cta";
  label: string;
  status: CheckStatus;
  detail: string;
}

const CTA_PATTERN =
  /(mesaj|dm|yaz[ıi]n|ara[yn]|arayın|ziyaret|sipariş|rezervasyon|randevu|tıkla|link|bio|kaydol|katıl|takip|keşfet|hemen|incele|kaçırma|satın al|iletişim|whatsapp|gel(in)?\b|yorum)/i;

/** Metnin ilk satırı (kanca) – boş satıra veya satır sonuna kadar. */
function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0] ?? "";
}

export function analyzePost(
  platform: PlatformId,
  input: { body: string; hashtags: string[] }
): PostCheck[] {
  const rule = PLAYBOOK[platform];
  const body = input.body.trim();
  const tags = input.hashtags.filter((t) => t.trim());
  const fullLength = (body + (tags.length ? "\n\n" + tags.join(" ") : "")).length;
  const checks: PostCheck[] = [];

  if (fullLength > rule.limit) {
    checks.push({ id: "length", label: "Uzunluk", status: "warn", detail: `${fullLength} karakter; platform sınırı ${rule.limit}. Kısaltın.` });
  } else if (fullLength > rule.ideal[1]) {
    checks.push({ id: "length", label: "Uzunluk", status: "warn", detail: `${fullLength} karakter; ideal üst sınır yaklaşık ${rule.ideal[1]}. Daha kısa daha çok okunur.` });
  } else if (fullLength < rule.ideal[0]) {
    checks.push({ id: "length", label: "Uzunluk", status: "warn", detail: `${fullLength} karakter; çok kısa kalmış olabilir (ideal ${rule.ideal[0]}+).` });
  } else {
    checks.push({ id: "length", label: "Uzunluk", status: "ok", detail: `${fullLength} karakter; ideal aralıkta.` });
  }

  const hook = firstLine(body);
  if (hook.length > rule.hookChars && rule.hookChars < rule.limit) {
    checks.push({ id: "hook", label: "Kanca", status: "warn", detail: `İlk satır ${hook.length} karakter; akışta yalnızca yaklaşık ${rule.hookChars} karakteri görünür. Ana mesajı öne alın.` });
  } else {
    checks.push({ id: "hook", label: "Kanca", status: "ok", detail: "İlk satır akışta kesilmeden görünür." });
  }

  const [minTags, maxTags] = rule.hashtags;
  if (tags.length > maxTags) {
    checks.push({ id: "hashtags", label: "Hashtag", status: "warn", detail: `${tags.length} adet; bu platformda en fazla ${maxTags} önerilir.` });
  } else if (tags.length < minTags) {
    checks.push({ id: "hashtags", label: "Hashtag", status: "warn", detail: `${tags.length} adet; ${minTags}-${maxTags} konuya özel hashtag önerilir.` });
  } else {
    checks.push({ id: "hashtags", label: "Hashtag", status: "ok", detail: `${tags.length} adet; uygun.` });
  }

  checks.push(
    CTA_PATTERN.test(body)
      ? { id: "cta", label: "Çağrı", status: "ok", detail: "Harekete geçirici bir çağrı var." }
      : { id: "cta", label: "Çağrı", status: "warn", detail: "Net bir çağrı yok (ör. “Mesaj atın”, “Rezervasyon yapın”)." }
  );
  return checks;
}
