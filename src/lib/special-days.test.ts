import { describe, expect, it } from "vitest";
import { upcomingSpecialDays } from "./special-days";

describe("special-days", () => {
  it("2026'da Efsane Cuma 27 Kasım'dır ve yaklaşan günlerde görünür", () => {
    const days = upcomingSpecialDays(new Date(2026, 10, 21), 10, 5);
    const bf = days.find((d) => d.name.includes("Efsane"));
    expect(bf?.date.getDate()).toBe(27);
    expect(bf?.daysAway).toBe(6);
  });

  it("Anneler Günü mayısın 2. Pazarı", () => {
    const d = upcomingSpecialDays(new Date(2026, 4, 1), 30, 10).find((x) => x.name === "Anneler Günü");
    expect(d?.date.getDay()).toBe(0);
    expect(d?.date.getDate()).toBe(10);
  });

  it("yıl sonunda ertesi yılın günlerini de bulur", () => {
    const d = upcomingSpecialDays(new Date(2026, 11, 28), 10, 5);
    expect(d.some((x) => x.name === "Yılbaşı" && x.date.getFullYear() === 2027)).toBe(true);
  });

  it("geçmiş günleri ve sınırı dışındakileri döndürmez", () => {
    const d = upcomingSpecialDays(new Date(2026, 5, 1), 5, 5);
    expect(d.every((x) => x.daysAway >= 0 && x.daysAway <= 5)).toBe(true);
  });
});
