import { describe, expect, it } from "vitest";
import { buildGenerateMessages } from "./brand-prompt";
import { sanitizePackage, composeText, formatsForPlatform, packageToLegacy, parsePostPackage, recommendFormat, totalSeconds } from "./post-formats";

describe("post-formats", () => {
  it("platforma uygun format önerir", () => {
    expect(formatsForPlatform("tiktok")).toEqual(["video"]);
    expect(recommendFormat("tiktok", "kampanya")).toBe("video");
    expect(recommendFormat("instagram", "ipucu")).toBe("karusel");
    expect(recommendFormat("x", "ipucu")).toBe("metin");
    expect(recommendFormat(null, null)).toBe("gonderi");
  });

  it("karusel paketini doğrular ve düzleştirir", () => {
    const raw = JSON.stringify({
      hook: "Telefonun ekranı kırıldı mı?",
      body: "Aynı gün değişim.",
      cta: "Hemen mesaj atın",
      hashtags: ["telefon", "#tamir", ""],
      slides: [{ title: "Kapak", text: "Kırık ekran" }, { title: "", text: "" }, { title: "Çağrı", text: "Mesaj at" }],
      visual_brief: "Kırık ekranlı telefon",
    });
    const pkg = parsePostPackage(raw, "karusel");
    expect(pkg.hashtags).toEqual(["#telefon", "#tamir"]);
    expect(pkg.slides).toHaveLength(2);
    const legacy = packageToLegacy(pkg);
    expect(legacy.post_text).toBe(composeText(pkg));
    expect(legacy.story_text).toContain("1) Kapak: Kırık ekran");
  });

  it("video sahnelerini sınırlar ve süreyi toplar", () => {
    const raw = JSON.stringify({
      hook: "3 saniyede kanca",
      body: "Gövde",
      scenes: [
        { seconds: 99, visual: "Açılış", on_screen_text: "Merhaba" },
        { seconds: "x", visual: "Orta" },
        { seconds: 0, visual: "" },
      ],
    });
    const pkg = parsePostPackage(raw, "video");
    expect(pkg.scenes).toHaveLength(2);
    expect(pkg.scenes[0].seconds).toBe(15);
    expect(pkg.scenes[1].seconds).toBe(3);
    expect(totalSeconds(pkg.scenes)).toBe(18);
    expect(packageToLegacy(pkg).story_text).toContain("Sahne 1 (15 sn)");
  });

  it("eksik zorunlu yapıda hata verir", () => {
    expect(() => parsePostPackage("x", "metin")).toThrow();
    expect(() => parsePostPackage(JSON.stringify({ hook: "a" }), "karusel")).toThrow();
    expect(() => parsePostPackage(JSON.stringify({ hook: "a" }), "video")).toThrow();
    expect(() => parsePostPackage(JSON.stringify({}), "metin")).toThrow();
    expect(parsePostPackage(JSON.stringify({ hook: "Sadece kanca" }), "metin").slides).toEqual([]);
  });

  it("istem formatın şemasını içerir", () => {
    const profile = { name: "A", industry: "B", content_language: "tr" as const };
    const video = buildGenerateMessages(profile, { userPrompt: "Tanıtım", format: "video" })[1].content;
    expect(video).toContain('"scenes"');
    expect(video).not.toContain('"slides"');
    const auto = buildGenerateMessages(profile, { userPrompt: "İpucu", kind: "ipucu", platform: "instagram" })[1].content;
    expect(auto).toContain('"slides"');
  });
});

describe("sanitizePackage", () => {
  it("kullanıcı düzenlemesini temizler: hashtag, boş slayt, saniye sınırı", () => {
    const out = sanitizePackage({
      format: "video",
      hook: "  Merhaba  ",
      body: "Gövde",
      cta: "Ara",
      hashtags: ["kampanya", "#kampanya", " ", "#x y"],
      slides: [{ title: "", text: "" }],
      scenes: [{ seconds: 99, visual: "a", on_screen_text: "", voiceover: "" }, { seconds: 3, visual: "", on_screen_text: "", voiceover: "" }],
      visual_brief: "",
      alt_text: "",
    });
    expect(out.hook).toBe("Merhaba");
    expect(out.hashtags).toEqual(["#kampanya", "#xy"]);
    expect(out.slides).toEqual([]);
    expect(out.scenes).toHaveLength(1);
    expect(out.scenes[0].seconds).toBe(15);
  });
});
