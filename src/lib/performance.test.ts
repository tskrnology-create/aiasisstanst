import { describe, expect, it } from "vitest";
import { computeInsights, engagement, parseCount, type ResultItem } from "./performance";

const at = (h: number) => new Date(2026, 10, 3, h, 0).toISOString();
const item = (platform: string, h: number, likes: number, comments = 0, saves = 0): ResultItem => ({
  platform, postedAt: at(h), likes, comments, saves,
});

describe("performance", () => {
  it("engagement weights comments and saves", () => {
    expect(engagement({ likes: 10, comments: 2, saves: 1 })).toBe(18);
    expect(engagement({ likes: null, comments: null, saves: null })).toBeNull();
  });
  it("needs at least 3 results", () => {
    const out = computeInsights([item("instagram", 9, 5), item("instagram", 9, 7)]);
    expect(out.bestPlatform).toBeNull();
    expect(out.count).toBe(2);
  });
  it("finds best platform and day part, ignoring single samples", () => {
    const out = computeInsights([
      item("instagram", 19, 40), item("instagram", 20, 60),
      item("tiktok", 9, 10), item("tiktok", 9, 20), item("facebook", 12, 500),
    ]);
    expect(out.bestPlatform).toEqual({ name: "instagram", average: 50 });
    expect(out.bestDayPart?.name).toBe("akşam");
  });
  it("parseCount", () => {
    expect(parseCount("")).toBeNull();
    expect(parseCount(" 12 ")).toBe(12);
    expect(parseCount("-1")).toBeUndefined();
    expect(parseCount("1e3")).toBeUndefined();
  });
});
