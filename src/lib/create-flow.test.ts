import { describe, expect, it } from "vitest";
import { CREATE_KINDS, coverText, dayOptions, kindOf, shareText, slotAt, SLOTS } from "./create-flow";
import type { PostPackage } from "./post-formats";

const pkg = (over: Partial<PostPackage>): PostPackage => ({
  format: "gonderi", hook: "Kanca", body: "Gövde", cta: "Ara", hashtags: ["#a"], slides: [], scenes: [], visual_brief: "", alt_text: "", ...over,
});

describe("create-flow", () => {
  it("yalnız yazı türünde kapak yoktur; diğerlerinde vardır", () => {
    expect(kindOf("metin").cover).toBeNull();
    expect(CREATE_KINDS.filter((k) => k.cover).length).toBe(4);
    expect(kindOf("hikaye").cover).toBe("story");
  });
  it("kapak yazısı karuselde ilk slayttan, diğerlerinde kancadan gelir", () => {
    expect(coverText(pkg({}))).toEqual({ headline: "Kanca", subline: "Ara" });
    expect(coverText(pkg({ format: "karusel", slides: [{ title: "Başlık", text: "Metin" }] }))).toEqual({ headline: "Başlık", subline: "Metin" });
  });
  it("paylaşım metni hashtag'leri içerir", () => {
    expect(shareText(pkg({}))).toContain("#a");
  });
  it("gün seçenekleri bugünden başlar ve saat doğru kurulur", () => {
    const days = dayOptions(new Date(2026, 10, 24, 15, 0));
    expect(days).toHaveLength(7);
    expect(days[0].label).toBe("Bugün");
    expect(days[1].label).toBe("Yarın");
    expect(days[0].key).toBe("2026-11-24");
    const at = slotAt(days[2].date, SLOTS[2]);
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([26, 19, 0]);
  });
});
