// Marka renk araçları: hazır paletler, uyumlu yardımcı renk önerileri ve logodan renk çıkarma.
// Marka modeli değişmez: tek ana + tek yardımcı renk (bkz. brand-palette.ts).

import {
  contrastRatio,
  hslToHex,
  matchContrast,
  normalizeHex,
  rgbToHsl,
  suggestSecondary,
} from "./brand-palette";

export interface PalettePreset {
  id: string;
  name: string;
  hint: string;
  primary: string;
  secondary: string;
}

/** Sektöre/hisse göre seçilebilen, kontrastı doğrulanmış hazır paletler. */
export const PALETTE_PRESETS: PalettePreset[] = [
  { id: "guven", name: "Güven", hint: "Kurumsal, hizmet", primary: "#1e3a8a", secondary: "#f59e0b" },
  { id: "dogal", name: "Doğal", hint: "Organik, sağlıklı", primary: "#166534", secondary: "#f5e6c8" },
  { id: "enerji", name: "Enerji", hint: "Kampanya, spor", primary: "#e11d48", secondary: "#fbbf24" },
  { id: "luks", name: "Lüks", hint: "Butik, güzellik", primary: "#111827", secondary: "#d4af37" },
  { id: "teknoloji", name: "Teknoloji", hint: "Yazılım, modern", primary: "#4f46e5", secondary: "#22d3ee" },
  { id: "sicak", name: "Sıcak", hint: "Kafe, el yapımı", primary: "#c2410c", secondary: "#fde68a" },
  { id: "ferah", name: "Ferah", hint: "Sağlık, temizlik", primary: "#0f766e", secondary: "#bae6fd" },
  { id: "lezzet", name: "Lezzet", hint: "Restoran, gıda", primary: "#b91c1c", secondary: "#fcd34d" },
  { id: "deniz", name: "Deniz", hint: "Turizm, yaşam", primary: "#0c4a6e", secondary: "#fb923c" },
  { id: "pastel", name: "Pastel", hint: "Tatlı, çocuk, moda", primary: "#be185d", secondary: "#fbcfe8" },
  { id: "toprak", name: "Toprak", hint: "Zanaat, mobilya", primary: "#5b3a29", secondary: "#d9a066" },
  { id: "keskin", name: "Keskin", hint: "Minimal, cesur", primary: "#27272a", secondary: "#a3e635" },
];

export interface Harmony {
  id: string;
  label: string;
  color: string;
}

/** Canlı (çok koyu/açık olmayan) bir ton arar; yoksa kontrast hedefine en yakın tonu verir. */
function vividMatch(base: string, hue: number, saturation: number): string {
  let best: string | null = null;
  let bestScore = Infinity;
  for (let l = 0.4; l <= 0.82; l += 0.02) {
    const candidate = hslToHex(hue, saturation, l);
    const ratio = contrastRatio(base, candidate);
    if (ratio < 2.3 || candidate === base) continue;
    const score = Math.abs(ratio - 4);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ?? matchContrast(base, hue, saturation, 3.4);
}

/** Ana renge göre, okunaklı kontrast verecek şekilde ayarlanmış yardımcı renk adayları. */
export function harmonySecondaries(primary: string): Harmony[] {
  const base = normalizeHex(primary);
  if (!base) return [];
  const [hue, sat] = rgbToHsl(base);
  const chroma = Math.min(0.85, Math.max(0.45, sat || 0.6));
  const candidates: Harmony[] = [
    { id: "tamamlayici", label: "Tamamlayıcı", color: vividMatch(base, hue + 180, chroma) },
    { id: "benzer-1", label: "Benzer", color: vividMatch(base, hue + 30, chroma) },
    { id: "benzer-2", label: "Benzer (ters)", color: vividMatch(base, hue - 30, chroma) },
    { id: "uclu-1", label: "Üçlü", color: vividMatch(base, hue + 120, chroma) },
    { id: "uclu-2", label: "Üçlü (ters)", color: vividMatch(base, hue + 240, chroma) },
    { id: "notr", label: "Nötr", color: matchContrast(base, hue, chroma * 0.18, 3.4) },
  ];
  const seen = new Set<string>([base]);
  return candidates.filter((c) => {
    if (seen.has(c.color)) return false;
    seen.add(c.color);
    return true;
  });
}

const bin = (v: number) => v >> 4;

/**
 * RGBA piksel dizisinden ana ve yardımcı renk çıkarır (logo için).
 * Şeffaf pikseller atlanır; gri/beyaz/siyah tonlar yalnızca canlı renk yoksa kullanılır.
 */
export function extractPalette(data: ArrayLike<number>): { primary: string; secondary: string } | null {
  type Bucket = { n: number; r: number; g: number; b: number };
  const buckets = new Map<number, Bucket>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = (bin(data[i]) << 8) | (bin(data[i + 1]) << 4) | bin(data[i + 2]);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n += 1;
    b.r += data[i];
    b.g += data[i + 1];
    b.b += data[i + 2];
    buckets.set(key, b);
  }
  if (buckets.size === 0) return null;

  const all = [...buckets.values()]
    .map((b) => {
      const hex = "#" + [b.r, b.g, b.b].map((v) => Math.round(v / b.n).toString(16).padStart(2, "0")).join("");
      const [h, s, l] = rgbToHsl(hex);
      return { hex, n: b.n, h, s, l };
    })
    .sort((a, b) => b.n - a.n);

  const vivid = all.filter((c) => c.s >= 0.25 && c.l > 0.12 && c.l < 0.92);
  const pool = vivid.length > 0 ? vivid : all;
  const primary = pool[0];
  const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const second = pool.find((c) => c !== primary && (hueDistance(c.h, primary.h) >= 25 || contrastRatio(c.hex, primary.hex) >= 2.2));
  return { primary: primary.hex, secondary: second ? second.hex : suggestSecondary(primary.hex) };
}

/** Logo/zemin için rengi okunaklı bir tona getirir (çok açık zeminlerde koyulaştırır). */
export function darken(hex: string, amount: number): string {
  const base = normalizeHex(hex);
  if (!base) return hex;
  const [h, s, l] = rgbToHsl(base);
  return hslToHex(h, s, Math.max(0, l - amount));
}
