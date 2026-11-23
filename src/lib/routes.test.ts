import { describe, expect, it } from "vitest";
import { contentsHref, isStudioStep, modeHref, STUDIO_STEPS, studioHref } from "./routes";

describe("routes", () => {
  it("stüdyo bağlantıları adım ve içerik kimliğini taşır", () => {
    expect(studioHref()).toBe("/studyo/birlikte");
    expect(studioHref({ step: "yaz" })).toBe("/studyo/birlikte");
    expect(studioHref({ step: "onayla", contentId: "abc" })).toBe("/studyo/birlikte?adim=onayla&content=abc");
    expect(studioHref({ step: "gorsel", contentId: "abc" })).toBe("/studyo/birlikte?adim=gorsel&content=abc");
    expect(studioHref({ prompt: "Kasım & indirim" })).toBe("/studyo/birlikte?prompt=Kas%C4%B1m+%26+indirim");
  });

  it("bağımsız yapı bağlantıları", () => {
    expect(modeHref("metin")).toBe("/studyo/metin");
    expect(modeHref("video", { step: "klip", contentId: "a" })).toBe("/studyo/video?adim=klip&content=a");
  });

  it("içerikler bağlantıları", () => {
    expect(contentsHref()).toBe("/icerikler");
    expect(contentsHref({ view: "takvim" })).toBe("/icerikler?gorunum=takvim");
    expect(contentsHref({ contentId: "x" })).toBe("/icerikler?content=x");
  });

  it("adım doğrulama", () => {
    expect(STUDIO_STEPS.map((step) => step.id)).toEqual(["yaz", "onayla", "gorsel", "planla"]);
    expect(isStudioStep("gorsel")).toBe(true);
    expect(isStudioStep("onayla")).toBe(true);
    expect(isStudioStep("x")).toBe(false);
  });
});
