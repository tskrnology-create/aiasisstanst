// İçerik türüne, tona ve platforma uygun MÜZİK TARZI önerisi. Belirli şarkı önermez: telifli şarkıyı
// işletme hesabında paylaşmak içeriğin sessize alınmasına/kaldırılmasına yol açabilir; bunun yerine
// telifsiz/ticari kitaplıklarda aranacak ruh hâli, tür, tempo ve arama sözcükleri verilir.

import type { ContentKind, PlatformId } from "./content-kinds";

export interface MusicSuggestion {
  mood: string;
  genres: string[];
  bpm: [number, number];
  /** Müzik kitaplıklarında aranacak (İngilizce) sözcükler. */
  keywords: string[];
  tip: string;
  links: Array<{ label: string; url: string }>;
  licenseNote: string;
}

interface Profile {
  mood: string;
  genres: string[];
  bpm: [number, number];
  keywords: string[];
}

const BY_KIND: Record<ContentKind | "default", Profile> = {
  kampanya: { mood: "Enerjik ve heyecanlı", genres: ["Upbeat pop", "Elektronik"], bpm: [110, 128], keywords: ["upbeat", "energetic pop", "sale promo"] },
  duyuru: { mood: "Net ve güven veren", genres: ["Kurumsal", "Hafif elektronik"], bpm: [90, 110], keywords: ["corporate", "inspiring", "announcement"] },
  urun: { mood: "Modern ve temiz", genres: ["Minimal elektronik", "Lo-fi"], bpm: [95, 115], keywords: ["modern", "minimal", "product showcase"] },
  etkinlik: { mood: "Coşkulu ve davetkâr", genres: ["Dans", "House"], bpm: [118, 128], keywords: ["party", "festive", "dance"] },
  yorum: { mood: "Sıcak ve güven veren", genres: ["Akustik", "Piyano"], bpm: [70, 95], keywords: ["warm acoustic", "emotional piano", "heartfelt"] },
  ipucu: { mood: "Odaklı ve hafif", genres: ["Lo-fi", "Chill"], bpm: [80, 100], keywords: ["lofi", "chill", "tutorial"] },
  sahne: { mood: "Samimi ve rahat", genres: ["Indie akustik", "Ukulele"], bpm: [90, 110], keywords: ["happy acoustic", "ukulele", "behind the scenes"] },
  default: { mood: "Nötr ve çok yönlü", genres: ["Hafif pop", "Akustik"], bpm: [90, 110], keywords: ["light pop", "background", "positive"] },
};

const PLATFORM_TIP: Record<PlatformId, string> = {
  instagram:
    "Reels'te müziği uygulamadaki ses seçiciden ekleyin. İşletme hesaplarında popüler şarkılar kısıtlı olabilir; ticari/telifsiz seçenekleri veya kendi sesinizi tercih edin.",
  tiktok: "TikTok'ta işletme hesapları için “Ticari Sesler” kitaplığındaki parçaları kullanın; trend sesler marka hesabında kullanılamayabilir.",
  facebook: "Video paylaşıyorsanız telifsiz bir parça seçin; Facebook'un kendi ses koleksiyonu da kullanılabilir.",
  linkedin: "LinkedIn'de müzik genellikle gerekmez. Video paylaşıyorsanız çoğu kişi sessiz izler; altyazı eklemek müzikten daha etkilidir.",
  x: "X'te müzik genellikle gerekmez. Video paylaşıyorsanız kısa tutun ve altyazı ekleyin.",
};

const GENERAL_TIP =
  "Müziği paylaşacağınız platformun ses seçicisinden veya telifsiz bir kitaplıktan seçin; müziğin sesi konuşmanın önüne geçmesin.";

export const MUSIC_LICENSE_NOTE =
  "Popüler/ticari şarkıları işletme hesabından paylaşmak içeriğin sessize alınmasına veya kaldırılmasına yol açabilir. Kullandığınız parçanın ticari kullanım lisansını kaynağında mutlaka kontrol edin.";

export function suggestMusic(input: { kind?: ContentKind | null; tone?: string | null; platform?: PlatformId | null }): MusicSuggestion {
  const base = BY_KIND[input.kind ?? "default"] ?? BY_KIND.default;
  let mood = base.mood;
  const genres = [...base.genres];
  let [lo, hi] = base.bpm;
  const keywords = [...base.keywords];

  switch (input.tone) {
    case "lüks":
      mood = "Zarif ve sofistike";
      genres.unshift("Sinematik");
      lo -= 20;
      hi -= 20;
      keywords.unshift("elegant cinematic");
      break;
    case "esprili":
      mood = "Eğlenceli ve oyuncu";
      genres.unshift("Playful pop");
      keywords.unshift("playful quirky");
      break;
    case "heyecanlı":
      lo += 10;
      hi += 10;
      keywords.unshift("energetic");
      break;
    case "resmi":
    case "profesyonel":
      genres.unshift("Kurumsal");
      keywords.unshift("corporate");
      break;
    default:
      break;
  }

  const unique = [...new Set(keywords)].slice(0, 4);
  return {
    mood,
    genres: [...new Set(genres)].slice(0, 3),
    bpm: [Math.max(60, lo), Math.min(160, hi)],
    keywords: unique,
    tip: input.platform ? PLATFORM_TIP[input.platform] : GENERAL_TIP,
    links: unique.slice(0, 3).map((kw) => ({
      label: `Pixabay Müzik: ${kw}`,
      url: `https://pixabay.com/music/search/${encodeURIComponent(kw)}/`,
    })),
    licenseNote: MUSIC_LICENSE_NOTE,
  };
}
