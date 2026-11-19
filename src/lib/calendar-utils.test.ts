import { describe, expect, it } from "vitest";
import { normalizePostUrl } from "./calendar-utils";

describe("normalizePostUrl", () => {
  it("HTTP(S) bağlantılarını normalize eder", () => {
    expect(normalizePostUrl(" https://example.com/post?id=2 ")).toBe("https://example.com/post?id=2");
    expect(normalizePostUrl("http://example.com")).toBe("http://example.com/");
  });

  it("boş alanı null, geçersiz veya güvensiz protokolü undefined döndürür", () => {
    expect(normalizePostUrl("  ")).toBeNull();
    expect(normalizePostUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizePostUrl("file:///etc/passwd")).toBeUndefined();
    expect(normalizePostUrl("metin değil URL")).toBeUndefined();
  });
});
