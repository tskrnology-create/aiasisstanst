import { describe, expect, it } from "vitest";
import { buildPlanMessages, parsePlan } from "./plan-prompt";

const profile = { name: "Dakika", industry: "Telefon tamiri", content_language: "tr" as const };

describe("plan-prompt", () => {
  it("mesajda platform kısıtı ve özel günler yer alır", () => {
    const [, user] = buildPlanMessages(profile, { platforms: ["instagram"], today: new Date(2026, 10, 21), upcoming: ["Efsane Cuma"], perWeek: 5 });
    expect(user.content).toContain("yalnızca şunlardan: instagram");
    expect(user.content).toContain("Efsane Cuma");
    expect(user.content).toContain("5 paylaşımlık");
  });

  it("geçersiz kayıtları eler, değerleri düzeltir, güne göre sıralar", () => {
    const raw = JSON.stringify({
      items: [
        { day: 4, slot: "aksam", platform: "tiktok", format: "video", pillar: "Eğitici", title: "İpucu", prompt: "Şarj ömrünü uzatmanın 3 yolu" },
        { day: 9, platform: "instagram", prompt: "geçersiz gün için içerik" },
        { day: 1, slot: "x", platform: "myspace", format: "zzz", prompt: "Önce-sonra ekran değişimi paylaşımı" },
        { day: 2, prompt: "kısa" },
      ],
    });
    const items = parsePlan(raw, ["instagram"]);
    expect(items.map((i) => i.day)).toEqual([1, 4]);
    expect(items[0]).toMatchObject({ slot: "ogle", platform: "instagram", pillar: "Genel" });
    expect(items[1].platform).toBe("instagram"); // izin verilmeyen platform → varsayılan
    expect(() => parsePlan("{}", [])).toThrow();
  });
});
