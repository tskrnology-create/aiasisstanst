import { describe, expect, it } from "vitest";
import { fold, parseIntent } from "./assistant-intent";
import { atSlot, dayOptions, parseDayKey, slotIsPast, TIME_SLOTS } from "./schedule";

describe("assistant-intent", () => {
  it("Türkçe karakterleri sadeleştirir", () => {
    expect(fold("Hikâye ŞİMDİ Işık")).toBe("hikaye simdi isik");
  });

  it("fikir ve hafta niyetlerini tanır", () => {
    expect(parseIntent("Ne paylaşsam?").type).toBe("ideas");
    expect(parseIntent("fikir ver").type).toBe("ideas");
    expect(parseIntent("Haftayı planla").type).toBe("week");
  });

  it("içerik isteğinden format, platform ve tür çıkarır", () => {
    const r = parseIntent("Instagram için kasım indirimi reels hazırla");
    expect(r).toMatchObject({ type: "generate", format: "video", platform: "instagram", kind: "kampanya" });
    const c = parseIntent("telefon bakımı için ipuçları karusel");
    expect(c).toMatchObject({ format: "karusel", kind: "ipucu" });
    expect(parseIntent("hikaye olarak yeni şubemizi duyur")).toMatchObject({ format: "hikaye", kind: "duyuru" });
  });

  it("ipucu kutusundan gelen ön seçim metinden üstündür", () => {
    const r = parseIntent("kasım indirimi", { format: "karusel", platform: "linkedin" });
    expect(r).toMatchObject({ format: "karusel", platform: "linkedin", kind: "kampanya" });
  });

  it("uzun brief içindeki 'bu hafta' ifadesi plan niyeti sayılmaz", () => {
    const r = parseIntent("Bu hafta cuma günü başlayacak olan efsane cuma indirimlerimizi duyuran bir gönderi hazırla lütfen");
    expect(r.type).toBe("generate");
  });
});

describe("schedule", () => {
  const now = new Date(2026, 10, 21, 14, 0);
  it("7 günlük seçenek üretir", () => {
    const days = dayOptions(now);
    expect(days).toHaveLength(7);
    expect(days[0].label).toBe("Bugün");
    expect(days[1].label).toBe("Yarın");
    expect(days[6].key).toBe("2026-11-27");
  });
  it("geçmiş saat dilimini işaretler", () => {
    const today = dayOptions(now)[0].date;
    expect(slotIsPast(today, TIME_SLOTS[0], now)).toBe(true);
    expect(slotIsPast(today, TIME_SLOTS[2], now)).toBe(false);
    expect(atSlot(today, TIME_SLOTS[1]).getHours()).toBe(12);
  });
  it("gün anahtarını doğrular", () => {
    expect(parseDayKey("2026-11-27")?.getDate()).toBe(27);
    expect(parseDayKey("2026-02-31")).toBeNull();
    expect(parseDayKey("x")).toBeNull();
  });
});
