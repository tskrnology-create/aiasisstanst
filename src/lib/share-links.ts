// Manuel paylaşım yardımcıları.
// Bu sürümde platformlara otomatik gönderim YAPILMAZ: kullanıcı metni kopyalar,
// platformun kendi paylaşım ekranını yeni sekmede açar ve takvimde "paylaşıldı"
// işaretler. Buradaki URL'ler yalnızca ilgili paylaşım ekranına yönlendirir.

import type { SocialPlatform } from "./business-store";

export interface ShareTarget {
  platform: SocialPlatform;
  label: string;
  /** Rozette gösterilen kısa kod */
  initials: string;
  /** Platformun marka rengi (rozet arka planı) */
  color: string;
  /** Boş ise platformda açılabilir paylaşım ekranı yok */
  composeUrl: string;
  /** Kullanıcıya gösterilecek kısa ipucu */
  hint: string;
}

export const SHARE_TARGETS: Record<Exclude<SocialPlatform, "other">, ShareTarget> = {
  instagram: {
    platform: "instagram",
    label: "Instagram",
    initials: "Ig",
    color: "#c13584",
    composeUrl: "https://www.instagram.com/",
    hint: "Instagram’da + (Oluştur) → Gönderi/Hikâye adımından yapıştırın.",
  },
  tiktok: {
    platform: "tiktok",
    label: "TikTok",
    initials: "Tk",
    color: "#111111",
    composeUrl: "https://www.tiktok.com/upload",
    hint: "Yükleme ekranında başlığı ve açıklamayı yapıştırın.",
  },
  facebook: {
    platform: "facebook",
    label: "Facebook",
    initials: "Fb",
    color: "#1877f2",
    composeUrl: "https://www.facebook.com/",
    hint: "Sayfanızı seçip “Gönderi oluştur” alanına yapıştırın.",
  },
  x: {
    platform: "x",
    label: "X",
    initials: "X",
    color: "#111111",
    composeUrl: "https://x.com/compose/post",
    hint: "Gönderi kutusuna yapıştırın; X karakter sınırını kontrol edin.",
  },
  linkedin: {
    platform: "linkedin",
    label: "LinkedIn",
    initials: "In",
    color: "#0a66c2",
    composeUrl: "https://www.linkedin.com/feed/",
    hint: "“Bir şeyler paylaş” kutusuna yapıştırın.",
  },
  youtube: {
    platform: "youtube",
    label: "YouTube",
    initials: "Yt",
    color: "#ff0000",
    composeUrl: "https://studio.youtube.com/",
    hint: "Studio → Oluştur → Video yükle; başlık ve açıklamayı yapıştırın.",
  },
};

const OTHER_TARGET: ShareTarget = {
  platform: "other",
  label: "Diğer",
  initials: "•",
  color: "#6b7280",
  composeUrl: "",
  hint: "Bu içerik listede olmayan bir platformda paylaşılacak: metni kopyalayıp kendiniz yapıştırın.",
};

export const ALL_SHARE_TARGETS: ShareTarget[] = [
  ...Object.values(SHARE_TARGETS),
  OTHER_TARGET,
];

export const MANUAL_SHARE_NOTE =
  "Bu sürümde paylaşımlar manuel yapılır: metni kopyalayın, platformu açın, yapıştırıp paylaşın ve takvimde “Paylaşıldı” düğmesine basın.";

/** Bilinen platformlar için hedef döner; platform seçilmemişse null. */
export function shareTarget(platform: SocialPlatform | null | undefined): ShareTarget | null {
  if (!platform) return null;
  return platform === "other" ? OTHER_TARGET : SHARE_TARGETS[platform];
}

/** Panoya kopyalar; Clipboard API yoksa eski yöntemi dener. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback aşağıda denenir */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Yeni sekmede platformun paylaşım ekranını açar. URL yoksa hiçbir şey yapmaz. */
export function openCompose(target: ShareTarget | null): boolean {
  if (!target?.composeUrl) return false;
  window.open(target.composeUrl, "_blank", "noopener,noreferrer");
  return true;
}
