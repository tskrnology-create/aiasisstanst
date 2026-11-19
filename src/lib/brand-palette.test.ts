import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATIO,
  FALLBACK_PRIMARY,
  FALLBACK_SECONDARY,
  contrastRatio,
  isRatioId,
  normalizeHex,
  normalizeShare,
  paletteRuleEn,
  readPalette,
  suggestSecondary,
  toStoredColors,
} from "./brand-palette";

describe("brand-palette", () => {
  it("renkleri küçük/büyük harften bağımsız biçimde normalize eder", () => {
    expect(normalizeHex("  #AbC  ")).toBe("#aabbcc");
    expect(normalizeHex("12G456")).toBeNull();
  });

  it("pay oranını güvenli sınırlar içinde tam sayıya yuvarlar", () => {
    expect(normalizeShare(91)).toBe(90);
    expect(normalizeShare(48.6)).toBe(50);
    expect(normalizeShare("72.4")).toBe(72);
    expect(normalizeShare(Number.NaN)).toBe(DEFAULT_RATIO);
    expect(isRatioId(90)).toBe(true);
    expect(isRatioId(91)).toBe(false);
  });

  it("ana/yardımcı renk oranını birlikte ve tutarlı döndürür", () => {
    const palette = readPalette(["#112233", "#aabbcc", "#ff00ff"], 80);
    expect(palette.primary).toBe("#112233");
    expect(palette.secondary).toBe("#aabbcc");
    expect(palette.share).toBe(0.8);
    expect(palette.accent).toBeCloseTo(0.2);
    expect(palette.derived.secondary).toBe(false);
  });

  it("eksik eski kayıtta ikinci rengi türetir, hiç renk yoksa fallback çiftini kullanır", () => {
    const legacy = readPalette(["#22aa66"]);
    expect(legacy.primary).toBe("#22aa66");
    expect(legacy.derived.secondary).toBe(true);
    expect(legacy.secondary).not.toBe(legacy.primary);
    expect(contrastRatio(legacy.primary, legacy.secondary)).toBeGreaterThan(1.6);

    const empty = readPalette([]);
    expect(empty.primary).toBe(FALLBACK_PRIMARY);
    expect(empty.secondary).toBe(FALLBACK_SECONDARY);
  });

  it("tamamlayıcı renk üretir ve saklama sırasını ana/yardımcı olarak korur", () => {
    const secondary = suggestSecondary("#1459a8");
    expect(secondary).not.toBe("#1459a8");
    expect(toStoredColors("#ABCDEF", "#123456")).toEqual(["#abcdef", "#123456"]);
  });

  it("görsel üretim kuralında yalnız iki renk ve oranı açıkça belirtir", () => {
    const prompt = paletteRuleEn(readPalette(["#112233", "#aabbcc"], 70));
    expect(prompt).toContain("#112233");
    expect(prompt).toContain("#AABBCC");
    expect(prompt).toContain("70%");
    expect(prompt).toContain("30%");
  });
});
