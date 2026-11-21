// İçerik türleri ve platform kuralları: ekran seçimi ile API doğrulaması aynı listeyi kullanır.

export const CONTENT_KINDS = [
  { id: "kampanya", label: "Kampanya / indirim", guide: "Net bir fayda, kısa süre hissi ve tek bir harekete geçirici çağrı içeren kampanya duyurusu." },
  { id: "duyuru", label: "Duyuru", guide: "Açık, kısa ve bilgilendirici bir duyuru (yeni hizmet, çalışma saati, şube vb.)." },
  { id: "urun", label: "Ürün / hizmet tanıtımı", guide: "Ürün veya hizmetin müşteriye sağladığı faydayı öne çıkaran tanıtım." },
  { id: "etkinlik", label: "Etkinlik daveti", guide: "Ne, ne zaman, nerede ve nasıl katılınır bilgisini içeren davet." },
  { id: "yorum", label: "Müşteri yorumu / güven", guide: "Sosyal kanıt ve güven veren, abartısız bir paylaşım." },
  { id: "ipucu", label: "İpucu / bilgilendirici", guide: "Hedef kitleye gerçek bir değer katan kısa, uygulanabilir bir ipucu." },
  { id: "sahne", label: "Perde arkası / hikâye", guide: "Markayı insanileştiren samimi bir perde arkası anlatımı." },
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number]["id"];

export function isContentKind(value: unknown): value is ContentKind {
  return typeof value === "string" && CONTENT_KINDS.some((k) => k.id === value);
}

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", guide: "Instagram için yaz: ilk cümle dikkat çeksin, uygun emoji ve 5-10 hashtag kullan." },
  { id: "facebook", label: "Facebook", guide: "Facebook için yaz: biraz daha açıklayıcı, sohbet havasında; hashtag az olsun." },
  { id: "x", label: "X", guide: "X için yaz: gönderi metni en fazla 270 karakter olsun, en çok 2 hashtag kullan." },
  { id: "linkedin", label: "LinkedIn", guide: "LinkedIn için yaz: profesyonel ve değer odaklı; abartılı emoji kullanma, en çok 3-5 hashtag." },
  { id: "tiktok", label: "TikTok", guide: "TikTok için yaz: kısa, güçlü bir kanca ile başla; video açıklaması kısa ve trend hashtag'li olsun." },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && PLATFORMS.some((p) => p.id === value);
}
