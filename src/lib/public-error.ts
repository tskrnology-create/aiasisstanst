// Müşteriye gösterilecek hata metinleri. Teknik ayrıntı (anahtar adı, model, sağlayıcı)
// yalnızca sunucu loguna yazılır; kullanıcıya sade bir mesaj döner.

const TECHNICAL = /yapılandırılmadı|anahtar|_KEY|yetkili|bakiye|kredi|reddet|model|Gemini|DeepSeek|OpenAI|ulaşılamadı|\(\d{3}/i;

export function publicTextError(message: string): string {
  console.error("[AI metin hatası]", message);
  if (/yoğun|sınır|kota/i.test(message) && !/anahtar|_KEY/i.test(message)) {
    return "Yapay zekâ servisi şu an yoğun. Birkaç saniye sonra tekrar deneyin.";
  }
  if (TECHNICAL.test(message)) {
    return "Yapay zekâ servisi şu an yanıt vermiyor. Lütfen biraz sonra tekrar deneyin.";
  }
  return message;
}

export function publicImageError(message: string): string {
  console.error("[AI görsel hatası]", message);
  return "Yapay zekâ ile görsel üretimi şu an kullanılamıyor. Stok fotoğraf seçebilir veya kendi görselinizi yükleyebilirsiniz.";
}
