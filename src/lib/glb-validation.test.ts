import { describe, expect, it } from "vitest";
import { validateGlb } from "./glb-validation";

const JSON_CHUNK = 0x4e4f534a;

function buildGlb(document: unknown): Uint8Array {
  const raw = new TextEncoder().encode(JSON.stringify(document));
  const chunkLength = Math.ceil(raw.byteLength / 4) * 4;
  const totalLength = 20 + chunkLength;
  const bytes = new Uint8Array(totalLength);
  bytes.set(new TextEncoder().encode("glTF"), 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, chunkLength, true);
  view.setUint32(16, JSON_CHUNK, true);
  bytes.fill(0x20, 20);
  bytes.set(raw, 20);
  return bytes;
}

describe("validateGlb", () => {
  it("geçerli, gömülü kaynaklı GLB v2'yi kabul eder", () => {
    const bytes = buildGlb({
      asset: { version: "2.0" },
      buffers: [{ byteLength: 4 }],
      images: [{ uri: "data:image/png;base64,AA==" }],
    });
    expect(validateGlb(bytes)).toBe(true);
  });

  it("harici dosya ve ağ URL'si içeren modeli reddeder", () => {
    expect(validateGlb(buildGlb({ asset: { version: "2.0" }, buffers: [{ uri: "texture.bin" }] }))).toBe(false);
    expect(validateGlb(buildGlb({ asset: { version: "2.0" }, images: [{ uri: "https://example.com/a.png" }] }))).toBe(false);
  });

  it("yanlış magic, GLB sürümü veya toplam uzunluğu reddeder", () => {
    const valid = buildGlb({ asset: { version: "2.0" } });
    const wrongMagic = valid.slice();
    wrongMagic[0] = 0;
    expect(validateGlb(wrongMagic)).toBe(false);

    const wrongVersion = valid.slice();
    new DataView(wrongVersion.buffer).setUint32(4, 1, true);
    expect(validateGlb(wrongVersion)).toBe(false);

    const wrongLength = valid.slice();
    new DataView(wrongLength.buffer).setUint32(8, wrongLength.byteLength - 4, true);
    expect(validateGlb(wrongLength)).toBe(false);
  });

  it("kesilmiş veya JSON olmayan ilk chunk'ı reddeder", () => {
    const truncated = buildGlb({ asset: { version: "2.0" } }).slice(0, 23);
    expect(validateGlb(truncated)).toBe(false);

    const invalidJson = buildGlb({ asset: { version: "2.0" } });
    invalidJson.fill(0x7b, 20); // '{' karakterleri geçerli bir JSON nesnesi oluşturmaz.
    expect(validateGlb(invalidJson)).toBe(false);
  });
});
