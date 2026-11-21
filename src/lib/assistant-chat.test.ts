import { describe, expect, it } from "vitest";
import { buildAssistantMessages, parseAssistantReply, sanitizeHistory } from "./assistant-chat";

const profile = {
  name: "Dakika Servis",
  industry: "Telefon tamiri",
  products: "Ekran değişimi",
  target_audience: "Öğrenciler",
  brand_voice: "samimi",
  brand_colors: ["#E91E63", "javascript:alert(1)"],
  content_language: "tr" as const,
};

describe("assistant-chat", () => {
  it("public profil bilgisini sistem mesajına koyar, geçersiz rengi atar", () => {
    const [sys, user] = buildAssistantMessages(profile, [{ platform: "instagram", handle: "@dakika" }], [], "Bugün ne paylaşsam?");
    expect(sys.content).toContain("Dakika Servis");
    expect(sys.content).toContain("instagram: @dakika");
    expect(sys.content).toContain("#E91E63");
    expect(sys.content).not.toContain("javascript:");
    expect(user.content).toContain("Bugün ne paylaşsam?");
  });

  it("geçmişi temizler ve sınırlar", () => {
    const raw = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `m${i}` }));
    raw.push({ role: "system", text: "gizli" } as never, { role: "user", text: 5 } as never);
    const out = sanitizeHistory(raw);
    expect(out).toHaveLength(6);
    expect(out.every((t) => t.role !== ("system" as never))).toBe(true);
    expect(sanitizeHistory("x")).toEqual([]);
  });

  it("yanıtı ayrıştırır; düz metne dayanıklıdır", () => {
    expect(parseAssistantReply('```json\n{"reply":"Merhaba","suggestions":["a","b","c","d"]}\n```')).toEqual({
      reply: "Merhaba",
      suggestions: ["a", "b", "c"],
    });
    expect(parseAssistantReply("Düz yanıt").reply).toBe("Düz yanıt");
    expect(() => parseAssistantReply("{}")).toThrow();
  });
});
