// Marka paleti katmanı — ürünün renk çekirdeği.
// Kural: markada TEK bir ana renk ve TEK bir yardımcı renk vardır; iki renk
// rastgele kullanılmaz, orantılı paylaşılır. Oran varsayılanı %70 ana / %30
// yardımcıdır ve görsel stüdyosunda tek görsel için değiştirilebilir.
//
// Veritabanı (businesses.brand_colors text[]) yalnızca iki hex kodu tutar:
// [0] = ana renk, [1] = yardımcı renk. Oran, tasarım kuralı olarak kodda
// yaşar; böylece eski kayıtlar (0, 1 veya 3+ renk) migrasyon gerektirmeden
// okunur. Saf fonksiyonlardır; Node tarafında test edilebilir.

export const MAX_BRAND_COLORS = 2;
export const FALLBACK_PRIMARY = "#1f2937";
export const FALLBACK_SECONDARY = "#f59e0b";

/** Ana rengin yüzdesi; yardımcı rengin payı her zaman 100 - share'dir. */
export type RatioId = number;

export const DEFAULT_RATIO = 70;
export const MIN_PRIMARY_SHARE = 50;
export const MAX_PRIMARY_SHARE = 90;

/** Slider/API için tam sayı yüzdeyi güvenli aralığa alır. */
export function normalizeShare(value: unknown, fallback = DEFAULT_RATIO): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_PRIMARY_SHARE, Math.max(MIN_PRIMARY_SHARE, Math.round(parsed)));
}

/** API'den gelen kullanıcı kontrollü oranı kabul eder mi? */
export function isRatioId(value: unknown): value is RatioId {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_PRIMARY_SHARE && value <= MAX_PRIMARY_SHARE;
}

// ---------------------------------------------------------------- renk matematiği

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

/** "#rrggbb" döndürür; geçersizse null. */
export function normalizeHex(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim().toLowerCase();
  if (HEX_RE.test(raw)) return raw.startsWith("#") ? raw : "#" + raw;
  const short = /^#?([0-9a-fA-F]{3})$/.exec(raw);
  if (short) return "#" + short[1].toLowerCase().split("").map((c) => c + c).join("");
  return null;
}

export function isValidHex(input: string | null | undefined): boolean {
  return normalizeHex(input) !== null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? "#000000";
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function rgbToHex(rgb: number[]): string {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** WCAG göreli parlaklığı (0–1). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Zemin üzerinde daha okunaklı olan beyaz veya siyah. */
export function contrastText(bg: string): "#ffffff" | "#111111" {
  const l = luminance(bg);
  const white = 1.05 / (l + 0.05);
  const black = (l + 0.05) / (luminance("#111111") + 0.05);
  return white >= black ? "#ffffff" : "#111111";
}

/** a renginden b rengine t oranında karışım (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** HSL dönüşümü; tamamlayıcı renk önerisi için kullanılır. */
export function rgbToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return rgbToHex([channel(hh + 1 / 3) * 255, channel(hh) * 255, channel(hh - 1 / 3) * 255]);
}

/** Sabit ton ve doygunlukta, hedef kontrasta en yakın parlaklığı arar. */
export function matchContrast(base: string, hue: number, saturation: number, target: number): string {
  let best = FALLBACK_SECONDARY;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= 40; step++) {
    const lightness = 0.05 + (step / 40) * 0.9;
    const candidate = hslToHex(hue, saturation, lightness);
    if (candidate === base) continue;
    const score = Math.abs(Math.log(contrastRatio(base, candidate) / target));
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Ana renkten yardımcı renk üretir. Önce tamamlayıcı ton denenir (markalarda en
 * alışıldık eşleşme), olmazsa benzer ton, o da olmazsa aynı rengin nötr versiyonu.
 * Seçilen tonun parlaklığı, ana renkle ~3.4:1 kontrast verecek şekilde çözülür;
 * oran bu kadar ayrıştığında gerçekten görünür olur.
 */
export function suggestSecondary(primary: string): string {
  const base = normalizeHex(primary) ?? FALLBACK_PRIMARY;
  const [hue, sat] = rgbToHsl(base);
  const chroma = Math.min(0.9, Math.max(0.45, sat || 0.6));
  const target = 3.4;
  const complementary = matchContrast(base, hue + 180, chroma, target);
  if (complementary !== base) return complementary;
  const analogous = matchContrast(base, hue + 32, chroma, target);
  if (analogous !== base) return analogous;
  return matchContrast(base, hue, chroma * 0.22, target);
}

// ---------------------------------------------------------------- palet okuma

export interface BrandPalette {
  primary: string;
  secondary: string;
  onPrimary: string;
  onSecondary: string;
  ratioId: RatioId;
  /** Ana rengin kapladığı oran (0–1). */
  share: number;
  /** Yardımcı rengin oranı. */
  accent: number;
  /** Kayıtta saklanan renk(ler)den mi geliyor, yoksa türetilmiş mi. */
  derived: { secondary: boolean };
}

/**
 * Depodaki (veya eski depodaki) renk listesinden palet çıkarır.
 * - 0 renk → iki varsayılan renk
 * - 1 renk → yardımcı renk ana renkten türetilir
 * - 2+ renk → ilk ikisi kullanılır, fazlası yoksayılır
 */
export function readPalette(
  colors: string[] | null | undefined,
  ratioId: RatioId = DEFAULT_RATIO
): BrandPalette {
  const valid = (colors ?? []).map(normalizeHex).filter((c): c is string => Boolean(c));
  // Hiç renk yoksa tanımlı örnek çift; tek renk varsa yardımcı türetilir.
  const empty = valid.length === 0;
  const primary = valid[0] ?? FALLBACK_PRIMARY;
  const secondaryFromStore = empty ? FALLBACK_SECONDARY : valid[1];
  const secondary = secondaryFromStore ?? suggestSecondary(primary);
  const normalizedRatio = normalizeShare(ratioId);
  const share = normalizedRatio / 100;
  return {
    primary,
    secondary,
    onPrimary: contrastText(primary),
    onSecondary: contrastText(secondary),
    ratioId: normalizedRatio,
    share,
    accent: 1 - share,
    derived: { secondary: !valid[1] },
  };
}

/** Profildeki iki alanı veritabanı sırasına çevirir: [ana, yardımcı]. */
export function toStoredColors(primary: string, secondary: string): string[] {
  return [normalizeHex(primary) ?? FALLBACK_PRIMARY, normalizeHex(secondary) ?? FALLBACK_SECONDARY];
}

/** Türkçe biçim: "%70". Arayüz ve marka promptu bunu kullanır. */
export const percent = (value: number) => `%${Math.round(value * 100)}`;

/** İngilizce biçim: "70%". Görsel üretim istemi bunu kullanır. */
export const percentEn = (value: number) => `${Math.round(value * 100)}%`;

// ---------------------------------------------------------------- istem metinleri

/** Marka promptuna giren Türkçe palet satırı. */
export function paletteSummaryTr(p: BrandPalette): string {
  return [
    `Ana renk ${p.primary.toUpperCase()} (baskın, görsel yüzeyin yaklaşık ${percent(p.share)}'i)`,
    `yardımcı renk ${p.secondary.toUpperCase()} (vurgu, yaklaşık ${percent(p.accent)}'i)`,
  ].join(" · ");
}

/** Metin üretimine eklenen renk kuralı. */
export function paletteRuleTr(p: BrandPalette): string {
  return [
    `Marka yalnızca iki rengi kullanır: ana ${p.primary.toUpperCase()} ve yardımcı ${p.secondary.toUpperCase()}.`,
    `Görsel, arka plan veya sahne önerisi yazarken bu iki rengi orantılı kullan: yüzeyin yaklaşık ${percent(p.share)}'i ana renk, geri kalanı yardımcı renk; renk adı uydurma, üçüncü bir marka rengi ekleme.`,
    `Yardımcı renk yalnızca vurgu içindir: buton, çerçeve, altyazı bandı, önemli kelime.`,
  ].join(" ");
}

/** Görsel üretim istemine (Gemini) giren İngilizce kural. */
export function paletteRuleEn(p: BrandPalette): string {
  return [
    `Brand palette is exactly two colors: dominant ${p.primary.toUpperCase()} covering about ${percentEn(p.share)} of the image area, and accent ${p.secondary.toUpperCase()} covering about ${percentEn(p.accent)}.`,
    `Keep those proportions: the accent color appears in a smaller, clearly secondary part of the composition (edge band, corner shape or soft glow).`,
    `Do not introduce other saturated brand colors; neutrals (white, black, grey) may be used for light and shadow.`,
  ].join(" ");
}

/** Profil ekranındaki okunabilirlik uyarısı. */
export function paletteAdvice(p: BrandPalette): { tone: "ok" | "warn"; text: string } {
  const between = contrastRatio(p.primary, p.secondary);
  if (between < 1.6) {
    return {
      tone: "warn",
      text: `Ana ve yardımcı renk birbirine çok yakın (kontrast ${between.toFixed(1)}:1). Yardımcı rengi koyulaştırın veya açın; orantılı kullanım görünmez hâle gelir.`,
    };
  }
  if (between < 2.5) {
    return {
      tone: "warn",
      text: `Renkler ayrışıyor ama fark az (kontrast ${between.toFixed(1)}:1). Vurgu bandını seçerken zorlanabilirsiniz; yardımcı rengi bir ton daha koyulaştırmayı deneyin.`,
    };
  }
  return {
    tone: "ok",
    text: `İki renk net ayrışıyor (kontrast ${between.toFixed(1)}:1). Yazı rengi ana renk üzerinde ${p.onPrimary === "#ffffff" ? "beyaz" : "koyu"}, yardımcı renk üzerinde ${p.onSecondary === "#ffffff" ? "beyaz" : "koyu"} çizilir.`,
  };
}
