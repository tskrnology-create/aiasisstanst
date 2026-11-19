import { PNG } from "pngjs";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_WIDTH = 2048;
const MAX_HEIGHT = 2048;
const MAX_PIXELS = 2_500_000;

/** PNG yapısını, CRC değerlerini ve zlib piksel akışını çözer; aşırı boyutları decode öncesi reddeder. */
export function validatePngBytes(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 33 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new Error("PNG imzası veya başlığı geçersiz.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ihdrLength = view.getUint32(8, false);
  const ihdrType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const interlaceMethod = bytes[28];

  if (ihdrLength !== 13 || ihdrType !== "IHDR") throw new Error("PNG IHDR başlığı geçersiz.");
  if (
    width === 0 || height === 0 ||
    width > MAX_WIDTH || height > MAX_HEIGHT ||
    width * height > MAX_PIXELS
  ) {
    throw new Error("PNG çözünürlüğü izin verilen sınırı aşıyor.");
  }
  if (bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType) || interlaceMethod !== 0) {
    throw new Error("PNG renk biçimi desteklenmiyor.");
  }

  try {
    const decoded = PNG.sync.read(Buffer.from(bytes), { checkCRC: true });
    if (decoded.width !== width || decoded.height !== height) {
      throw new Error("PNG boyut bilgisi tutarsız.");
    }
  } catch {
    throw new Error("PNG içeriği bozuk veya çözümlenemiyor.");
  }

  return { width, height };
}
