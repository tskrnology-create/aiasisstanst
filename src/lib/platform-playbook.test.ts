import { describe, expect, it } from "vitest";
import { analyzePost, PLAYBOOK } from "./platform-playbook";
import { suggestMusic } from "./music-suggestions";

const by = (checks: ReturnType<typeof analyzePost>, id: string) => checks.find((c) => c.id === id)!;

describe("analyzePost", () => {
  it("iyi bir Instagram metnini onaylar", () => {
    const c = analyzePost("instagram", {
      body: "Kasım indirimi başladı! Tüm ekran değişimlerinde %20 fırsat.\nHemen mesaj atın, yerinizi ayırın.",
      hashtags: ["#telefon", "#tamir", "#kasim", "#indirim"],
    });
    expect(c.every((x) => x.status === "ok")).toBe(true);
  });

  it("X'te 280 karakter sınırını (hashtag dahil) denetler", () => {
    const c = analyzePost("x", { body: "a".repeat(270), hashtags: ["#bir", "#iki"] });
    expect(by(c, "length").status).toBe("warn");
    expect(by(c, "length").detail).toContain("280");
  });

  it("uzun ilk satırı kanca uyarısı olarak işaretler", () => {
    const c = analyzePost("instagram", { body: "x".repeat(200), hashtags: [] });
    expect(by(c, "hook").status).toBe("warn");
  });

  it("fazla/az hashtag ve çağrı eksikliğini yakalar", () => {
    const many = analyzePost("linkedin", { body: "Profesyonel bir paylaşım. ".repeat(30), hashtags: Array(8).fill("#a") });
    expect(by(many, "hashtags").status).toBe("warn");
    const none = analyzePost("tiktok", { body: "Sadece bilgi cümlesi burada", hashtags: [] });
    expect(by(none, "hashtags").status).toBe("warn");
    expect(by(none, "cta").status).toBe("warn");
  });

  it("her platformda ideal aralık sınırın içindedir", () => {
    for (const rule of Object.values(PLAYBOOK)) {
      expect(rule.ideal[0]).toBeLessThan(rule.ideal[1]);
      expect(rule.ideal[1]).toBeLessThanOrEqual(rule.limit);
    }
  });
});

describe("suggestMusic", () => {
  it("türe göre ruh hâli ve arama sözcüğü verir", () => {
    const m = suggestMusic({ kind: "kampanya", platform: "instagram" });
    expect(m.mood).toContain("Enerjik");
    expect(m.keywords).toContain("upbeat");
    expect(m.links[0].url).toMatch(/^https:\/\/pixabay\.com\/music\/search\//);
    expect(m.tip).toContain("Reels");
  });

  it("lüks ton tempoyu düşürür ve sinematik ekler", () => {
    const base = suggestMusic({ kind: "urun" });
    const lux = suggestMusic({ kind: "urun", tone: "lüks" });
    expect(lux.bpm[1]).toBeLessThan(base.bpm[1]);
    expect(lux.genres[0]).toBe("Sinematik");
  });

  it("bilinmeyen/boş girdide varsayılana döner, tempo sınırlarda kalır", () => {
    const m = suggestMusic({});
    expect(m.mood).toBeTruthy();
    expect(m.bpm[0]).toBeGreaterThanOrEqual(60);
    expect(m.licenseNote).toContain("lisans");
  });
});
