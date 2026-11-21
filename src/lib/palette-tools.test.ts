import { describe, expect, it } from "vitest";
import { contrastRatio, isValidHex } from "./brand-palette";
import { PALETTE_PRESETS, extractPalette, harmonySecondaries } from "./palette-tools";

describe("palette-tools", () => {
  it("hazır paletler geçerli ve ayrışıyor", () => {
    expect(PALETTE_PRESETS.length).toBeGreaterThanOrEqual(10);
    for (const p of PALETTE_PRESETS) {
      expect(isValidHex(p.primary) && isValidHex(p.secondary)).toBe(true);
      expect(contrastRatio(p.primary, p.secondary), p.name).toBeGreaterThanOrEqual(2.5);
    }
  });

  it("uyumlu yardımcı renkler ana renkten farklı ve tekrarsız", () => {
    const list = harmonySecondaries("#4f46e5");
    expect(list.length).toBeGreaterThanOrEqual(4);
    const colors = list.map((h) => h.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors).not.toContain("#4f46e5");
    expect(harmonySecondaries("zzz")).toEqual([]);
  });

  it("logo pikselinden baskın canlı rengi ve ikinciyi çıkarır", () => {
    const px: number[] = [];
    const push = (r: number, g: number, b: number, a: number, n: number) => {
      for (let i = 0; i < n; i++) px.push(r, g, b, a);
    };
    push(255, 255, 255, 255, 500); // beyaz zemin: atlanmalı
    push(0, 0, 0, 0, 500); // şeffaf
    push(220, 30, 60, 255, 200); // kırmızı (baskın canlı)
    push(30, 80, 220, 255, 100); // mavi
    const result = extractPalette(px)!;
    expect(result.primary).toBe("#dc1e3c");
    expect(result.secondary).toBe("#1e50dc");
  });

  it("tek renkli logoda yardımcı rengi türetir, boşta null döner", () => {
    const px: number[] = [];
    for (let i = 0; i < 100; i++) px.push(20, 140, 90, 255);
    const result = extractPalette(px)!;
    expect(result.primary).toBe("#148c5a");
    expect(result.secondary).not.toBe(result.primary);
    expect(extractPalette([0, 0, 0, 0])).toBeNull();
  });
});
