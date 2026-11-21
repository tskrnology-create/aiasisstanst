// Türkiye'deki ticari/özel günler. Yalnızca kuralla hesaplanabilen günler yer alır;
// tarihi her yıl değişen dini bayramlar yanlış gösterilmesin diye bilerek eklenmedi.

export interface SpecialDay {
  name: string;
  date: Date;
  daysAway: number;
  /** "İçerik üret" için hazır brief. */
  prompt: string;
}

/** ay: 0-11. n. haftanın günü (0=Pazar). */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function definitions(year: number): Array<{ name: string; date: Date; prompt: string }> {
  const blackFriday = new Date(nthWeekday(year, 10, 4, 4)); // 4. Perşembe
  blackFriday.setDate(blackFriday.getDate() + 1);
  const d = (m: number, day: number) => new Date(year, m, day);
  return [
    { name: "Yılbaşı", date: d(0, 1), prompt: "Yeni yıl kutlaması ve yeni yıla özel bir fırsat/duyuru paylaşımı hazırla." },
    { name: "Sevgililer Günü", date: d(1, 14), prompt: "Sevgililer Günü için hediye veya özel teklif odaklı bir paylaşım hazırla." },
    { name: "Dünya Kadınlar Günü", date: d(2, 8), prompt: "8 Mart Dünya Kadınlar Günü için saygılı bir kutlama paylaşımı hazırla." },
    { name: "23 Nisan", date: d(3, 23), prompt: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı için kutlama paylaşımı hazırla." },
    { name: "1 Mayıs", date: d(4, 1), prompt: "1 Mayıs Emek ve Dayanışma Günü için saygılı bir paylaşım hazırla." },
    { name: "Anneler Günü", date: nthWeekday(year, 4, 0, 2), prompt: "Anneler Günü için duygusal ve hediye/fırsat odaklı bir paylaşım hazırla." },
    { name: "19 Mayıs", date: d(4, 19), prompt: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı kutlama paylaşımı hazırla." },
    { name: "Babalar Günü", date: nthWeekday(year, 5, 0, 3), prompt: "Babalar Günü için hediye ve özel teklif odaklı bir paylaşım hazırla." },
    { name: "30 Ağustos Zafer Bayramı", date: d(7, 30), prompt: "30 Ağustos Zafer Bayramı için kutlama paylaşımı hazırla." },
    { name: "29 Ekim Cumhuriyet Bayramı", date: d(9, 29), prompt: "29 Ekim Cumhuriyet Bayramı için kutlama paylaşımı hazırla." },
    { name: "Efsane Cuma (Black Friday)", date: blackFriday, prompt: "Efsane Cuma / Black Friday kampanyasını duyuran, aciliyet hissi veren bir paylaşım hazırla." },
    { name: "Öğretmenler Günü", date: d(10, 24), prompt: "24 Kasım Öğretmenler Günü için teşekkür ve kutlama paylaşımı hazırla." },
    { name: "Yılbaşı hazırlığı", date: d(11, 25), prompt: "Yılbaşı öncesi hediye ve yeni yıl kampanyası paylaşımı hazırla." },
  ];
}

/** Bugünden itibaren `withinDays` gün içindeki özel günler (en fazla `limit`), yakından uzağa. */
export function upcomingSpecialDays(now: Date, withinDays = 45, limit = 4): SpecialDay[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const all = [...definitions(today.getFullYear()), ...definitions(today.getFullYear() + 1)];
  return all
    .map((item) => ({
      ...item,
      daysAway: Math.round((item.date.getTime() - today.getTime()) / 86_400_000),
    }))
    .filter((item) => item.daysAway >= 0 && item.daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit);
}
