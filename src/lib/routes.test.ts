import { describe, expect, it } from "vitest";
import { contentsHref, isStudioStep, studioHref } from "./routes";

describe("routes", () => {
  it("stüdyo bağlantıları adım ve içerik kimliğini taşır", () => {
    expect(studioHref()).toBe("/studyo");
    expect(studioHref({ step: "yaz" })).toBe("/studyo");
    expect(studioHref({ step: "gorsel", contentId: "abc" })).toBe("/studyo?adim=gorsel&content=abc");
    expect(studioHref({ prompt: "Kasım & indirim" })).toBe("/studyo?prompt=Kas%C4%B1m+%26+indirim");
  });

  it("içerikler bağlantıları", () => {
    expect(contentsHref()).toBe("/icerikler");
    expect(contentsHref({ view: "takvim" })).toBe("/icerikler?gorunum=takvim");
    expect(contentsHref({ contentId: "x" })).toBe("/icerikler?content=x");
  });

  it("adım doğrulama", () => {
    expect(isStudioStep("gorsel")).toBe(true);
    expect(isStudioStep("x")).toBe(false);
  });
});
