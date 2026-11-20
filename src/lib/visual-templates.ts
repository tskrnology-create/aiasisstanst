// Görsel şablon motoru. Yazı, logo ve marka renkleri kodla çizilir (yapay zekâ
// görsellerinde Türkçe karakterler ve logolar sık bozulduğu için); yapay zekâ
// yalnızca yazısız arka plan üretir. Saf yardımcılar Node'da test edilebilir.
//
// Renk kuralı: markada tek ana + tek yardımcı renk vardır ve şablonlar bu iki
// rengi `spec.share` oranında paylaşır (varsayılan %70 / %30). Yardımcı renk
// asla zemini tamamen kaplamaz; band, çizgi, çerçeve veya ışık gibi vurgu
// alanlarında kullanılır.

import {
  contrastText,
  mix,
  readPalette,
  type BrandPalette,
  type RatioId,
  DEFAULT_RATIO,
} from "./brand-palette";

export type TemplateId =
  | "foto-alt"
  | "kart"
  | "bolunmus"
  | "tipografi"
  | "rozet"
  | "cam"
  | "kemer"
  | "polaroid"
  | "minimal"
  | "bant"
  | "alinti"
  | "cerceve-foto";
export type FormatId = "post" | "story" | "campaign" | "landscape" | "wide" | "pin";

export const TEMPLATES: Array<{ id: TemplateId; label: string }> = [
  { id: "tipografi", label: "Büyük yazı" },
  { id: "foto-alt", label: "Foto + başlık" },
  { id: "kart", label: "Beyaz kart" },
  { id: "bolunmus", label: "Bölünmüş" },
  { id: "rozet", label: "Rozet" },
  { id: "cam", label: "Cam panel" },
  { id: "kemer", label: "Kemer" },
  { id: "polaroid", label: "Polaroid" },
  { id: "bant", label: "Duyuru bandı" },
  { id: "cerceve-foto", label: "Çerçeveli foto" },
  { id: "minimal", label: "Minimal" },
  { id: "alinti", label: "Alıntı" },
];

export const DEFAULT_TEMPLATE: TemplateId = "tipografi";
/** Arka plan seçilince, mevcut şablon fotoğraf kullanmıyorsa geçilecek şablon. */
export const DEFAULT_PHOTO_TEMPLATE: TemplateId = "foto-alt";

const NO_PHOTO: ReadonlySet<TemplateId> = new Set<TemplateId>(["minimal", "alinti"]);
const PHOTO_BEST: ReadonlySet<TemplateId> = new Set<TemplateId>([
  "foto-alt",
  "kart",
  "bolunmus",
  "rozet",
  "cam",
  "kemer",
  "polaroid",
  "bant",
  "cerceve-foto",
]);
/** Şablon arka plan fotoğrafı kullanabiliyor mu? */
export const templateUsesPhoto = (id: TemplateId) => !NO_PHOTO.has(id);
/** Şablon fotoğrafla en iyi görünüyor mu? (yoksa arayüz ipucu verir) */
export const templateWantsPhoto = (id: TemplateId) => PHOTO_BEST.has(id);

/** Her şablonun kısa açıklaması (arayüzde gösterilir). */
export const TEMPLATE_USAGE: Record<TemplateId, string> = {
  tipografi: "Marka renginde zemin, dev başlık ve renkli daire. Fotoğraf eklerseniz daire içinde görünür.",
  "foto-alt": "Tam ekran fotoğraf, altta okunaklı büyük başlık. Hikâye ve gönderi için klasik.",
  kart: "Fotoğrafın üstünde yuvarlak köşeli beyaz bilgi kartı. Duyuru ve ürün için.",
  bolunmus: "Yarısı fotoğraf, yarısı marka rengi panel. Metni net gösterir.",
  rozet: "Büyük dairesel rozet (alt yazı rozette) ve altta başlık. İndirim ve kampanya için.",
  cam: "Fotoğraf üzerinde yarı saydam cam görünümlü panel; ortalı yazı.",
  kemer: "Kemer biçimli fotoğraf penceresi ve altında başlık. Şık, sakin marka duruşu.",
  polaroid: "Hafif eğik polaroid kartı ve bant. Samimi, hikâye anlatan paylaşımlar için.",
  bant: "Fotoğrafın ortasından geçen eğik duyuru bandı. Dikkat çekici kısa mesajlar için.",
  "cerceve-foto": "Marka renginde zemin, içte yuvarlak köşeli fotoğraf ve altında başlık.",
  minimal: "Açık zemin, ince çizgiler ve sade tipografi. Fotoğraf kullanmaz.",
  alinti: "Dev tırnak işareti ve ortalı yazı. Müşteri yorumu ve söz paylaşımları için.",
};

export const FORMATS: Record<
  FormatId,
  { label: string; width: number; height: number; aspect: string }
> = {
  post: { label: "Kare gönderi (1:1)", width: 1080, height: 1080, aspect: "1:1" },
  story: { label: "Dikey hikâye / kısa video (9:16)", width: 1080, height: 1920, aspect: "9:16" },
  campaign: { label: "Portre gönderi (4:5)", width: 1080, height: 1350, aspect: "4:5" },
  landscape: { label: "Yatay video / kapak (16:9)", width: 1280, height: 720, aspect: "16:9" },
  wide: { label: "Geniş yatay gönderi (1.91:1)", width: 1200, height: 628, aspect: "1.91:1" },
  pin: { label: "Uzun dikey pin (2:3)", width: 1000, height: 1500, aspect: "2:3" },
};

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

// yeniden dışa aktarım: profil ve stüdyo tek yerden renk yardımı alsın
export { normalizeHex, isValidHex } from "./brand-palette";
export { contrastText, luminance, mix } from "./brand-palette";

// ------------------------------------------------------------ yerleşim yardımcıları

// Greedy satır kırma; sığmayan çok uzun kelime karakterden bölünür.
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      continue;
    }
    let line = "";
    const push = () => {
      if (line) out.push(line);
      line = "";
    };
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      push();
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      // tek kelime çok uzun: karakter karakter böl
      let chunk = "";
      for (const ch of Array.from(word)) {
        if (measure(chunk + ch) > maxWidth && chunk) {
          out.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }
    push();
  }
  return out;
}

// Kaynak görseli hedefe "cover" olarak oturtan kırpma dikdörtgeni
export function coverRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const sw = dstW / scale;
  const sh = dstH / scale;
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh };
}

interface Fit {
  size: number;
  lines: string[];
  height: number;
}

const LINE_HEIGHT = 1.18;

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxW: number,
  boxH: number,
  maxSize: number,
  minSize: number,
  weight: number
): Fit {
  for (let size = Math.round(maxSize); size >= minSize; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrapLines((s) => ctx.measureText(s).width, text, boxW);
    const height = lines.length * size * LINE_HEIGHT;
    if (height <= boxH) return { size, lines, height };
  }
  const size = minSize;
  ctx.font = `${weight} ${size}px ${FONT}`;
  let lines = wrapLines((s) => ctx.measureText(s).width, text, boxW);
  const maxLines = Math.max(1, Math.floor(boxH / (size * LINE_HEIGHT)));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > boxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return { size, lines, height: lines.length * size * LINE_HEIGHT };
}

// ------------------------------------------------------------ çizim

export interface VisualSpec {
  width: number;
  height: number;
  template: TemplateId;
  headline: string;
  subline: string;
  brandName: string;
  /** businesses.brand_colors: [ana renk, yardımcı renk] */
  colors: string[];
  /** Ana rengin yüzey payı slider'dan gelir; yüzde değeri 50–90 arasıdır. */
  share?: number;
  ratioId?: RatioId;
  logo: CanvasImageSource | null;
  logoSize?: { w: number; h: number };
  background: CanvasImageSource | null;
  backgroundSize?: { w: number; h: number };
  /** Metin stüdyosundaki canlı düzenleme tercihleri. */
  textScale?: number;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  textOffsetX?: number;
  textOffsetY?: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function paletteOf(spec: VisualSpec): BrandPalette {
  return readPalette(spec.colors, spec.ratioId ?? DEFAULT_RATIO);
}

// Oran, palette verilmişse ona yoksa spec.share'a göre ayarlanır.
function sharesOf(spec: VisualSpec, p: BrandPalette) {
  const share = spec.share ?? p.share;
  return { share: Math.min(0.9, Math.max(0.5, share)), accent: 1 - Math.min(0.9, Math.max(0.5, share)) };
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  spec: VisualSpec,
  box: Box,
  headColor: string,
  subColor: string,
  valign: "middle" | "bottom",
  defaultAlign: "left" | "center" | "right" = "left"
): number | null {
  const head = spec.headline.trim();
  const sub = spec.subline.trim();
  if (!head && !sub) return null;
  const scale = Math.min(1.5, Math.max(0.7, spec.textScale ?? 1));
  const layout: Box = {
    x: Math.max(0, Math.min(spec.width - box.w, box.x + (spec.textOffsetX ?? 0) * spec.width)),
    y: Math.max(0, Math.min(spec.height - box.h, box.y + (spec.textOffsetY ?? 0) * spec.height)),
    w: box.w,
    h: box.h,
  };
  const gap = sub && head ? Math.round(spec.width * 0.03 * scale) : 0;

  const headFit = head
    ? fitText(ctx, head, layout.w, sub ? layout.h * 0.72 : layout.h, spec.width * 0.115 * scale, Math.max(28, 40 * scale), 800)
    : null;
  const remaining = layout.h - (headFit ? headFit.height : 0) - gap;
  const subFit = sub && remaining > 40
    ? fitText(ctx, sub, layout.w, remaining, spec.width * 0.05 * scale, Math.max(18, 26 * scale), 500)
    : null;

  const total = (headFit?.height ?? 0) + (subFit ? gap + subFit.height : 0);
  let y = valign === "bottom" ? layout.y + layout.h - total : layout.y + (layout.h - total) / 2;
  const startY = y;
  const alignment = spec.textAlign ?? defaultAlign;
  const x = alignment === "center" ? layout.x + layout.w / 2 : alignment === "right" ? layout.x + layout.w : layout.x;

  ctx.textBaseline = "top";
  ctx.textAlign = alignment;
  if (headFit) {
    ctx.font = `800 ${headFit.size}px ${FONT}`;
    ctx.fillStyle = spec.textColor ?? headColor;
    for (const line of headFit.lines) {
      ctx.fillText(line, x, y);
      y += headFit.size * LINE_HEIGHT;
    }
  }
  if (subFit) {
    y += gap;
    ctx.font = `500 ${subFit.size}px ${FONT}`;
    ctx.fillStyle = spec.textColor ?? subColor;
    for (const line of subFit.lines) {
      ctx.fillText(line, x, y);
      y += subFit.size * LINE_HEIGHT;
    }
  }
  return startY; // yazı bloğunun üst kenarı (süs çizgisi için)
}

// Logo (varsa) + işletme adı; (x, centerY) sol-orta noktası
function drawBrand(
  ctx: CanvasRenderingContext2D,
  spec: VisualSpec,
  x: number,
  centerY: number,
  height: number,
  color: string
) {
  let cx = x;
  if (spec.logo && spec.logoSize && spec.logoSize.w > 0 && spec.logoSize.h > 0) {
    const ratio = spec.logoSize.w / spec.logoSize.h;
    const h = height;
    const w = Math.min(h * ratio, spec.width * 0.28);
    ctx.drawImage(spec.logo, cx, centerY - h / 2, w, w / ratio);
    cx += w + height * 0.3;
  }
  const name = spec.brandName.trim();
  if (name) {
    const size = Math.round(height * 0.5);
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    let shown = name;
    const maxW = spec.width - cx - spec.width * 0.08;
    while (shown.length > 1 && ctx.measureText(shown).width > maxW) shown = shown.slice(0, -1);
    ctx.fillText(shown === name ? shown : shown + "…", cx, centerY);
  }
}


// ------------------------------------------------------------ yeni şablon seti

interface Layout {
  W: number;
  H: number;
  m: number; // kenar boşluğu
  tall: boolean; // hikâye/pin: üst-alt arayüz alanları boş kalır
  wide: boolean; // yatay formatlar
  top: number; // güvenli üst sınır
  bottom: number; // güvenli alt boşluk
  footerH: number; // marka satırı yüksekliği
  footerY: number; // marka satırı orta noktası
  contentBottom: number; // yazı bloğunun alt sınırı (marka satırının üstü)
}

function layoutOf(spec: VisualSpec): Layout {
  const W = spec.width;
  const H = spec.height;
  const tall = H / W > 1.6;
  const wide = W / H > 1.3;
  const m = Math.round(Math.min(W, H) * 0.08);
  const top = tall ? 250 : m;
  const bottom = tall ? 270 : m;
  const footerH = Math.round(Math.min(W, H) * 0.075);
  const footerY = H - bottom - footerH / 2;
  const contentBottom = H - bottom - footerH - Math.round(Math.min(W, H) * 0.035);
  return { W, H, m, tall, wide, top, bottom, footerH, footerY, contentBottom };
}

function shape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[] = 0) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

/** Dikdörtgen alana fotoğraf (cover) çizer; fotoğraf yoksa marka renkli gradyan + dekor daireler. */
function paintPhoto(
  ctx: CanvasRenderingContext2D,
  spec: VisualSpec,
  p: BrandPalette,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[] = 0
): boolean {
  ctx.save();
  shape(ctx, x, y, w, h, radius);
  ctx.clip();
  const has = Boolean(spec.background && spec.backgroundSize);
  if (has) {
    const size = spec.backgroundSize as { w: number; h: number };
    const r = coverRect(size.w, size.h, w, h);
    ctx.drawImage(spec.background as CanvasImageSource, r.sx, r.sy, r.sw, r.sh, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, p.primary);
    g.addColorStop(1, mix(p.primary, p.secondary, 0.7));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const R = Math.min(w, h);
    ctx.fillStyle = p.secondary;
    ctx.globalAlpha = 0.28;
    circle(ctx, x + w * 0.82, y + h * 0.22, R * 0.34);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.07;
    circle(ctx, x + w * 0.15, y + h * 0.85, R * 0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  return has;
}

function verticalScrim(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: Array<[number, string]>
) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function accentBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  shape(ctx, x, y, w, h, h / 2);
  ctx.fill();
}

type Painter = (ctx: CanvasRenderingContext2D, spec: VisualSpec, p: BrandPalette, L: Layout, accent: number) => void;

const DARK = (p: BrandPalette) => mix(p.primary, "#101010", 0.6);

const painters: Record<TemplateId, Painter> = {
  // Tam ekran fotoğraf, altta büyük başlık
  "foto-alt": (ctx, spec, p, L) => {
    const { W, H, m } = L;
    paintPhoto(ctx, spec, p, 0, 0, W, H);
    verticalScrim(ctx, 0, 0, W, H, [
      [0, "rgba(0,0,0,0.30)"],
      [0.28, "rgba(0,0,0,0.04)"],
      [0.5, "rgba(0,0,0,0.30)"],
      [1, "rgba(0,0,0,0.80)"],
    ]);
    drawBrand(ctx, spec, m, L.tall ? L.top : m + L.footerH / 2, L.footerH, "#ffffff");
    const boxTop = Math.round(H * 0.4);
    const startY = drawTextBlock(
      ctx,
      spec,
      { x: m, y: boxTop, w: L.wide ? W * 0.7 : W - 2 * m, h: L.contentBottom + L.footerH * 0.9 - boxTop },
      "#ffffff",
      "#f4f4f5",
      "bottom"
    );
    if (startY !== null) accentBar(ctx, m, startY - Math.round(L.m * 0.55), Math.round(W * 0.14), Math.max(9, Math.round(W * 0.011)), p.secondary);
  },

  // Fotoğraf üstünde beyaz bilgi kartı
  kart: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    paintPhoto(ctx, spec, p, 0, 0, W, H);
    verticalScrim(ctx, 0, 0, W, H, [
      [0, "rgba(0,0,0,0.05)"],
      [1, "rgba(0,0,0,0.30)"],
    ]);
    const card = L.wide
      ? { x: m, y: m, w: Math.round(W * 0.47), h: H - 2 * m }
      : (() => {
          const h = Math.round(H * (L.tall ? 0.3 : 0.38));
          return { x: m, y: H - L.bottom - h, w: W - 2 * m, h };
        })();
    const pad = Math.round(Math.min(card.w, card.h) * 0.09);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#ffffff";
    shape(ctx, card.x, card.y, card.w, card.h, Math.round(m * 0.55));
    ctx.fill();
    ctx.restore();
    accentBar(ctx, card.x + pad, card.y + pad, Math.round(card.w * 0.14), 10, p.secondary);
    const brandH = Math.round(L.footerH * 0.7);
    drawTextBlock(
      ctx,
      spec,
      { x: card.x + pad, y: card.y + pad + 34, w: card.w - 2 * pad, h: card.h - 2 * pad - 34 - brandH - 14 },
      DARK(p),
      "#52525b",
      "middle"
    );
    drawBrand(ctx, spec, card.x + pad, card.y + card.h - pad - brandH / 2, brandH, p.primary);
  },

  // Yarı fotoğraf, yarı marka paneli
  bolunmus: (ctx, spec, p, L, accent) => {
    const { W, H, m } = L;
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, W, H);
    const bar = Math.max(10, Math.round(Math.min(W, H) * (0.012 + accent * 0.03)));
    if (L.wide) {
      const split = Math.round(W * 0.5);
      paintPhoto(ctx, spec, p, 0, 0, split, H);
      ctx.fillStyle = p.secondary;
      ctx.fillRect(split - bar / 2, 0, bar, H);
      drawTextBlock(ctx, spec, { x: split + m * 0.8, y: m, w: W - split - m * 1.6, h: H - 2 * m - L.footerH }, p.onPrimary, p.onPrimary, "middle");
      drawBrand(ctx, spec, split + m * 0.8, H - m - L.footerH / 2, L.footerH, p.onPrimary);
      return;
    }
    const split = Math.round(H * (L.tall ? 0.48 : 0.52));
    paintPhoto(ctx, spec, p, 0, 0, W, split);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(0, split - bar / 2, W, bar);
    const y = split + Math.round(m * 0.7);
    drawTextBlock(ctx, spec, { x: m, y, w: W - 2 * m, h: L.contentBottom - y }, p.onPrimary, p.onPrimary, "middle");
    drawBrand(ctx, spec, m, L.footerY, L.footerH, p.onPrimary);
  },

  // Dev tipografi + renkli daire
  tipografi: (ctx, spec, p, L, accent) => {
    const { W, H, m } = L;
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, W, H);
    const base = L.wide ? H * 0.46 : W * 0.34;
    const r = base * (0.72 + accent * 1.1);
    const cx = L.wide ? W * 0.8 : W - m * 0.2 - r * 0.45;
    const cy = L.wide ? H * 0.5 : L.tall ? L.top + r * 0.55 : m + r * 0.5;
    ctx.fillStyle = p.secondary;
    circle(ctx, cx, cy, r);
    ctx.fill();
    if (spec.background && spec.backgroundSize) {
      paintPhoto(ctx, spec, p, cx - r * 0.86, cy - r * 0.86, r * 1.72, r * 1.72, r * 0.86);
    }
    ctx.strokeStyle = p.onPrimary;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 3;
    circle(ctx, L.wide ? W * 0.12 : m * 0.4, H - L.bottom * 0.6, Math.min(W, H) * 0.22);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const boxTop = L.wide ? m : Math.round(H * (L.tall ? 0.34 : 0.36));
    const startY = drawTextBlock(
      ctx,
      spec,
      { x: m, y: boxTop, w: L.wide ? W * 0.52 - m : W - 2 * m, h: L.contentBottom - boxTop },
      p.onPrimary,
      p.onPrimary,
      "bottom"
    );
    if (startY !== null) accentBar(ctx, m, startY - Math.round(m * 0.5), Math.round(W * 0.12), Math.max(9, Math.round(W * 0.011)), p.secondary);
    drawBrand(ctx, spec, m, L.footerY, L.footerH, p.onPrimary);
  },

  // Kampanya rozeti (alt yazı rozette)
  rozet: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    paintPhoto(ctx, spec, p, 0, 0, W, H);
    ctx.fillStyle = p.primary;
    ctx.globalAlpha = 0.42;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    verticalScrim(ctx, 0, 0, W, H, [
      [0.3, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,0.62)"],
    ]);
    const R = Math.min(W, H) * (L.wide ? 0.3 : 0.2);
    const cx = L.wide ? W * 0.8 : W - m - R * 0.95;
    const cy = L.wide ? H * 0.46 : L.tall ? L.top + R : m + R * 0.95;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-10 * Math.PI) / 180);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = p.secondary;
    circle(ctx, 0, 0, R);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = p.onSecondary;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(3, R * 0.03);
    ctx.setLineDash([R * 0.08, R * 0.07]);
    circle(ctx, 0, 0, R * 0.88);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const sub = spec.subline.trim();
    if (sub) {
      const fit = fitText(ctx, sub, R * 1.45, R * 1.25, R * 0.62, 18, 800);
      ctx.font = `800 ${fit.size}px ${FONT}`;
      ctx.fillStyle = p.onSecondary;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      let y = -fit.height / 2;
      for (const line of fit.lines) {
        ctx.fillText(line, 0, y);
        y += fit.size * LINE_HEIGHT;
      }
    }
    ctx.restore();
    const boxTop = Math.round(H * 0.42);
    drawTextBlock(
      ctx,
      { ...spec, subline: "" },
      { x: m, y: boxTop, w: L.wide ? W * 0.56 : W - 2 * m, h: L.contentBottom + L.footerH * 0.6 - boxTop },
      "#ffffff",
      "#ffffff",
      "bottom"
    );
    drawBrand(ctx, spec, m, L.footerY, L.footerH, "#ffffff");
  },

  // Fotoğraf üstünde yarı saydam cam panel
  cam: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    paintPhoto(ctx, spec, p, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(0, 0, W, H);
    const w = L.wide ? Math.round(W * 0.64) : W - 2 * m;
    const h = Math.round(H * (L.wide ? 0.64 : L.tall ? 0.3 : 0.5));
    const x = Math.round((W - w) / 2);
    const y = L.tall ? Math.round(L.top + (H - L.top - L.bottom - h) / 2) : Math.round((H - h) / 2);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "rgba(255,255,255,0.17)";
    shape(ctx, x, y, w, h, Math.round(m * 0.7));
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    shape(ctx, x, y, w, h, Math.round(m * 0.7));
    ctx.stroke();
    const pad = Math.round(Math.min(w, h) * 0.1);
    accentBar(ctx, x + w / 2 - Math.round(W * 0.06), y + pad * 0.7, Math.round(W * 0.12), 9, p.secondary);
    drawTextBlock(ctx, spec, { x: x + pad, y: y + pad + 14, w: w - 2 * pad, h: h - 2 * pad - 14 }, "#ffffff", "#f4f4f5", "middle", "center");
    drawBrand(ctx, spec, m, L.footerY, L.footerH, "#ffffff");
  },

  // Kemer biçimli fotoğraf penceresi
  kemer: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    ctx.fillStyle = mix(p.primary, "#ffffff", 0.92);
    ctx.fillRect(0, 0, W, H);
    const archW = L.wide ? Math.round(H * 0.6) : Math.round(W * 0.62);
    const archH = L.wide ? H - 2 * m : Math.round(H * (L.tall ? 0.46 : 0.54));
    const archX = L.wide ? Math.round(W * 0.56) : Math.round((W - archW) / 2);
    const archY = L.wide ? m : L.tall ? L.top : m;
    const radii = [archW / 2, archW / 2, Math.round(m * 0.25), Math.round(m * 0.25)];
    ctx.fillStyle = p.secondary;
    shape(ctx, archX + 16, archY + 16, archW, archH, radii);
    ctx.fill();
    paintPhoto(ctx, spec, p, archX, archY, archW, archH, radii);
    const dark = DARK(p);
    if (L.wide) {
      const startY = drawTextBlock(ctx, spec, { x: m, y: m, w: archX - 2 * m, h: H - 2 * m - L.footerH }, dark, "#52525b", "middle");
      if (startY !== null) accentBar(ctx, m, startY - Math.round(m * 0.5), Math.round(W * 0.08), 10, p.secondary);
      drawBrand(ctx, spec, m, H - m - L.footerH / 2, L.footerH, p.primary);
      return;
    }
    const y = archY + archH + Math.round(m * 0.75);
    drawTextBlock(ctx, spec, { x: m, y, w: W - 2 * m, h: L.contentBottom - y }, dark, "#52525b", "middle", "center");
    drawBrand(ctx, spec, m, L.footerY, L.footerH, p.primary);
  },

  // Hafif eğik polaroid kartı
  polaroid: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, p.primary);
    bg.addColorStop(1, mix(p.primary, p.secondary, 0.4));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = p.secondary;
    ctx.globalAlpha = 0.25;
    circle(ctx, W * 0.92, H * 0.12, Math.min(W, H) * 0.3);
    ctx.fill();
    ctx.globalAlpha = 1;

    const cardW = Math.round(L.wide ? H * 0.68 : W * (L.tall ? 0.78 : 0.68));
    const fp = Math.round(cardW * 0.055);
    const photoW = cardW - 2 * fp;
    const photoH = Math.round(photoW * 0.86);
    const capH = Math.round(cardW * 0.3);
    const cardH = fp + photoH + capH;
    const cx = L.wide ? Math.round(W * 0.3) : Math.round(W / 2);
    const cy = L.wide ? Math.round(H / 2) : L.tall ? Math.round((L.top + H - L.bottom) / 2 - H * 0.03) : Math.round(H * 0.45);
    const x = cx - cardW / 2;
    const y = cy - cardH / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-3.5 * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#ffffff";
    shape(ctx, x, y, cardW, cardH, Math.round(cardW * 0.012));
    ctx.fill();
    ctx.shadowColor = "transparent";
    paintPhoto(ctx, spec, p, x + fp, y + fp, photoW, photoH);
    drawTextBlock(
      ctx,
      { ...spec, textScale: Math.min(spec.textScale ?? 1, 0.75) },
      { x: x + fp * 1.4, y: y + fp + photoH + capH * 0.1, w: cardW - fp * 2.8, h: capH * 0.8 },
      DARK(p),
      "#52525b",
      "middle",
      "center"
    );
    ctx.fillStyle = p.secondary;
    ctx.globalAlpha = 0.9;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate((5 * Math.PI) / 180);
    ctx.fillRect(-cardW * 0.14, -22, cardW * 0.28, 46);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();

    if (L.wide) {
      const bx = Math.round(W * 0.56);
      drawTextBlock(ctx, spec, { x: bx, y: m, w: W - bx - m, h: H - 2 * m - L.footerH }, p.onPrimary, p.onPrimary, "middle");
      drawBrand(ctx, spec, bx, H - m - L.footerH / 2, L.footerH, p.onPrimary);
    } else {
      drawBrand(ctx, spec, m, L.footerY, L.footerH, p.onPrimary);
    }
  },

  // Fotoğrafın ortasından geçen eğik duyuru bandı
  bant: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    paintPhoto(ctx, spec, p, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(0, 0, W, H);
    const cy = Math.round(H * (L.tall ? 0.5 : 0.52));
    const bh = Math.round(H * (L.wide ? 0.42 : L.tall ? 0.27 : 0.34));
    const tilt = ((L.wide ? -4 : -6) * Math.PI) / 180;
    // arka ince bant (ana renk)
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(-tilt * 0.6);
    ctx.translate(-W / 2, -cy);
    ctx.fillStyle = p.primary;
    ctx.fillRect(-W * 0.2, cy - bh / 2 - 26, W * 1.4, bh + 52);
    ctx.restore();
    // ön bant (yardımcı renk) ve yazı
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(tilt);
    ctx.translate(-W / 2, -cy);
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = p.secondary;
    ctx.fillRect(-W * 0.2, cy - bh / 2, W * 1.4, bh);
    ctx.shadowColor = "transparent";
    drawTextBlock(
      ctx,
      spec,
      { x: m * 1.2, y: cy - bh / 2 + bh * 0.08, w: W - 2.4 * m, h: bh * 0.84 },
      p.onSecondary,
      p.onSecondary,
      "middle",
      "center"
    );
    ctx.restore();
    drawBrand(ctx, spec, m, L.tall ? L.top : m + L.footerH / 2, L.footerH, "#ffffff");
  },

  // Marka zemini içinde yuvarlak köşeli fotoğraf
  "cerceve-foto": (ctx, spec, p, L) => {
    const { W, H, m } = L;
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, W, H);
    const i = Math.round(m * 0.8);
    const radius = Math.round(m * 0.6);
    const box = L.wide
      ? { x: i, y: i, w: Math.round(W * 0.5) - i, h: H - 2 * i }
      : { x: i, y: L.tall ? 150 : i, w: W - 2 * i, h: Math.round(H * (L.tall ? 0.5 : 0.58)) };
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = 6;
    shape(ctx, box.x - 10, box.y - 10, box.w + 20, box.h + 20, radius + 8);
    ctx.stroke();
    paintPhoto(ctx, spec, p, box.x, box.y, box.w, box.h, radius);
    if (L.wide) {
      const bx = box.x + box.w + m;
      drawTextBlock(ctx, spec, { x: bx, y: m, w: W - bx - m, h: H - 2 * m - L.footerH }, p.onPrimary, p.onPrimary, "middle");
      drawBrand(ctx, spec, bx, H - m - L.footerH / 2, L.footerH, p.onPrimary);
      return;
    }
    const y = box.y + box.h + Math.round(m * 0.7);
    const startY = drawTextBlock(ctx, spec, { x: m, y, w: W - 2 * m, h: L.contentBottom - y }, p.onPrimary, p.onPrimary, "middle");
    if (startY !== null) accentBar(ctx, m, startY - Math.round(m * 0.35), Math.round(W * 0.1), 9, p.secondary);
    drawBrand(ctx, spec, m, L.footerY, L.footerH, p.onPrimary);
  },

  // Açık zemin, ince çizgiler, sade tipografi
  minimal: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    ctx.fillStyle = mix(p.primary, "#ffffff", 0.95);
    ctx.fillRect(0, 0, W, H);
    const inset = Math.round(m * 0.55);
    ctx.strokeStyle = p.primary;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 4;
    ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset);
    ctx.globalAlpha = 1;
    const topRow = L.tall ? L.top : m + L.footerH * 0.2;
    drawBrand(ctx, spec, m, topRow + L.footerH / 2, L.footerH, p.primary);
    ctx.fillStyle = p.primary;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(m, topRow + L.footerH + 18, W - 2 * m, 2);
    ctx.globalAlpha = 1;
    const y = topRow + L.footerH + Math.round(m * 0.9);
    const startY = drawTextBlock(ctx, spec, { x: m, y, w: W - 2 * m, h: L.contentBottom - y }, DARK(p), "#52525b", "middle");
    if (startY !== null) accentBar(ctx, m, startY - Math.round(m * 0.45), Math.round(W * 0.1), 10, p.secondary);
    ctx.fillStyle = p.primary;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(m, L.footerY, W - 2 * m, 2);
    ctx.globalAlpha = 1;
  },

  // Dev tırnak işareti ve ortalı yazı
  alinti: (ctx, spec, p, L) => {
    const { W, H, m } = L;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p.primary);
    g.addColorStop(1, mix(p.primary, p.secondary, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const on = contrastText(mix(p.primary, p.secondary, 0.25));
    const qSize = Math.round(Math.min(W, H) * 0.5);
    ctx.font = `900 ${qSize}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = p.secondary;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("“", m * 0.8, (L.tall ? L.top : m * 0.3) - qSize * 0.05);
    const y = (L.tall ? L.top : m) + Math.round(qSize * 0.55);
    drawTextBlock(
      ctx,
      spec,
      { x: m * 1.2, y, w: W - 2.4 * m, h: L.contentBottom - y },
      on,
      on,
      "middle",
      "center"
    );
    drawBrand(ctx, spec, m, L.footerY, L.footerH, on);
  },
};

export function drawVisual(ctx: CanvasRenderingContext2D, spec: VisualSpec): void {
  const p = paletteOf(spec);
  const { accent } = sharesOf(spec, p);
  const L = layoutOf(spec);
  ctx.clearRect(0, 0, L.W, L.H);
  ctx.save();
  (painters[spec.template] ?? painters[DEFAULT_TEMPLATE])(ctx, spec, p, L, accent);
  ctx.restore();
}
