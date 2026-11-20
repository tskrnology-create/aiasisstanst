import { describe, expect, it } from "vitest";
import { buildChecklist, greeting, isProfileComplete, snippet, weekStrip } from "./dashboard-utils";

describe("dashboard-utils", () => {
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 10, 20, 8))).toMatch(/gün|Günaydın/i);
    expect(greeting(new Date(2026, 10, 20, 22))).toBeTruthy();
  });

  it("builds checklist percent", () => {
    const none = buildChecklist({ profileComplete: false, contentCount: 0, visualCount: 0, plannedCount: 0 });
    expect(none.percent).toBe(0);
    const all = buildChecklist({ profileComplete: true, contentCount: 2, visualCount: 1, plannedCount: 1 });
    expect(all.percent).toBe(100);
    expect(all.steps.every((s) => s.done)).toBe(true);
  });

  it("counts week strip per day", () => {
    const now = new Date(2026, 10, 20, 9);
    const strip = weekStrip([new Date(2026, 10, 20, 12).toISOString(), new Date(2026, 10, 20, 15).toISOString()], now);
    expect(strip).toHaveLength(7);
    expect(strip[0].count).toBe(2);
    expect(strip[0].isToday).toBe(true);
  });

  it("detects incomplete profile and trims snippets", () => {
    expect(isProfileComplete({ industry: "", products: "", target_audience: "", brand_voice: "" })).toBe(false);
    expect(snippet("a".repeat(300), 50).length).toBeLessThanOrEqual(51);
  });
});
