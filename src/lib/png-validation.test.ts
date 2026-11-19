import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { validatePngBytes } from "./png-validation";

function makePng(): Buffer {
  const png = new PNG({ width: 1, height: 1 });
  png.data = Buffer.from([255, 0, 0, 255]);
  return PNG.sync.write(png);
}

describe("validatePngBytes", () => {
  it("geçerli PNG'yi gerçekten çözümler ve boyutlarını döndürür", () => {
    expect(validatePngBytes(makePng())).toEqual({ width: 1, height: 1 });
  });

  it("yanlış imzayı reddeder", () => {
    const bytes = makePng();
    bytes[0] = 0;
    expect(() => validatePngBytes(bytes)).toThrow("PNG imzası");
  });

  it("kesik veya bozuk görüntü akışını reddeder", () => {
    const bytes = makePng().subarray(0, -5);
    expect(() => validatePngBytes(bytes)).toThrow("PNG içeriği bozuk");
  });

  it("çözümleme öncesi izin verilen boyutu aşan başlığı reddeder", () => {
    const bytes = makePng();
    bytes.writeUInt32BE(2049, 16);
    expect(() => validatePngBytes(bytes)).toThrow("çözünürlüğü");
  });
});
