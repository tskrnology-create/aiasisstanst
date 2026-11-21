import { describe, expect, it } from "vitest";
import { initialsOf, splitName } from "./logo-maker";

describe("logo-maker", () => {
  it("baş harfleri Türkçe kurala göre üretir", () => {
    expect(initialsOf("Dakika Bilişim")).toBe("DB");
    expect(initialsOf("kahve")).toBe("K");
    expect(initialsOf("ışık  ilaç evi")).toBe("Iİ");
    expect(initialsOf("  ")).toBe("A");
    expect(initialsOf("A & B Studio")).toBe("AB");
  });

  it("uzun adı dengeli iki satıra böler", () => {
    expect(splitName("Kısa Ad")).toEqual(["Kısa Ad"]);
    expect(splitName("Dakika Bilişim Teknik Servis")).toEqual(["Dakika Bilişim", "Teknik Servis"]);
    expect(splitName("Tekkelimeçokuzunbirmarkaadı")).toEqual(["Tekkelimeçokuzunbirmarkaadı"]);
  });
});
