import { describe, expect, it } from "vitest";
import { buildGenerateMessages, buildIdeasMessages, parseIdeas, type BusinessProfile } from "./brand-prompt";

const profile: BusinessProfile = {
  name: "Dakika Bilişim",
  industry: "Teknik servis",
  products: "Telefon tamiri",
  content_language: "tr",
};

describe("brand-prompt", () => {
  it("içerik türü ve platform kuralını istek mesajına ekler", () => {
    const msgs = buildGenerateMessages(profile, { userPrompt: "Kasım indirimi", kind: "kampanya", platform: "x" });
    const user = msgs[1].content;
    expect(user).toContain("Kampanya");
    expect(user).toContain("270 karakter");
  });

  it("tür/platform yoksa ek satır eklemez", () => {
    const user = buildGenerateMessages(profile, { userPrompt: "Merhaba dünya" })[1].content;
    expect(user).not.toContain("İçerik türü");
    expect(user).not.toMatch(/\n\n\n/);
  });

  it("fikir istemi özel günleri içerir", () => {
    const user = buildIdeasMessages(profile, { count: 6, upcoming: ["Efsane Cuma"] })[1].content;
    expect(user).toContain("6 FARKLI");
    expect(user).toContain("Efsane Cuma");
  });

  it("parseIdeas bozuk öğeleri eler, türü doğrular, sınırı uygular", () => {
    const raw = JSON.stringify({
      ideas: [
        { title: "A", prompt: "Bir kampanya duyur", kind: "kampanya" },
        { title: "", prompt: "boş başlık" },
        { title: "B", prompt: "x" },
        { title: "C", prompt: "Geçersiz tür", kind: "bilinmeyen" },
        { title: "D", prompt: "Dördüncü fikir", kind: "ipucu" },
      ],
    });
    const ideas = parseIdeas(raw, 3);
    expect(ideas.map((i) => i.title)).toEqual(["A", "C", "D"]);
    expect(ideas[1].kind).toBeNull();
  });

  it("parseIdeas geçersiz JSON ve boş listede hata verir", () => {
    expect(() => parseIdeas("nope")).toThrow();
    expect(() => parseIdeas(JSON.stringify({ ideas: [] }))).toThrow();
  });
});
