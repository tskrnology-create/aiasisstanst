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

export type TemplateId = "duz" | "gradyan" | "cerceve" | "serit" | "fotograf";
export type FormatId = "post" | "story" | "campaign";

export const TEMPLATES: Array<{ id: TemplateId; label: string }> = [
  { id: "duz", label: "Düz renk" },
  { id: "gradyan", label: "Gradyan" },
  { id: "cerceve", label: "Çerçeve" },
  { id: "serit", label: "Şerit" },
  { id: "fotograf", label: "Fotoğraflı" },
];

/** Her şablonda yardımcı rengin hangi alana denk düştüğü (arayüzde gösterilir). */
export const TEMPLATE_USAGE: Record<TemplateId, string> = {
  duz: "Alt bant ve vurgu çizgisi yardımcı renkte; üstteki yazı alanı ana renkte kalır.",
  gradyan: "Gradyanın başlangıcı ana renk, bitiş bölgesi yardımcı renk; geçiş oranı sizdeki payı izler.",
  cerceve: "Çerçeve çizgisi ve üst başlık bandı yardımcı renk; zemin ana rengin çok açık tonu.",
  serit: "Üst bant ana renk, sol dikey şerit ve başlık altı çizgi yardımcı renk.",
  fotograf: "Fotoğrafın üst bölgesine ana renk tonu, başlık altına yardımcı renk çizgi bindirilir.",
};

export const FORMATS: Record<
  FormatId,
  { label: string; width: number; height: number; aspect: string }
> = {
  post: { label: "Instagram gönderisi (1:1)", width: 1080, height: 1080, aspect: "1:1" },
  story: { label: "Hikâye (9:16)", width: 1080, height: 1920, aspect: "9:16" },
  campaign: { label: "Kampanya görseli (4:5)", width: 1080, height: 1350, aspect: "4:5" },
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
  /** Ana rengin yüzey payı; RATIOS üzerinden gelir, varsayılan %70. */
  share?: number;
  ratioId?: RatioId;
  logo: CanvasImageSource | null;
  logoSize?: { w: number; h: number };
  background: CanvasImageSource | null;
  backgroundSize?: { w: number; h: number };
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
  valign: "middle" | "bottom"
): number | null {
  const head = spec.headline.trim();
  const sub = spec.subline.trim();
  if (!head && !sub) return null;
  const gap = sub && head ? Math.round(spec.width * 0.03) : 0;

  const headFit = head
    ? fitText(ctx, head, box.w, sub ? box.h * 0.72 : box.h, spec.width * 0.115, 40, 800)
    : null;
  const remaining = box.h - (headFit ? headFit.height : 0) - gap;
  const subFit = sub && remaining > 40
    ? fitText(ctx, sub, box.w, remaining, spec.width * 0.05, 26, 500)
    : null;

  const total = (headFit?.height ?? 0) + (subFit ? gap + subFit.height : 0);
  let y = valign === "bottom" ? box.y + box.h - total : box.y + (box.h - total) / 2;
  const startY = y;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  if (headFit) {
    ctx.font = `800 ${headFit.size}px ${FONT}`;
    ctx.fillStyle = headColor;
    for (const line of headFit.lines) {
      ctx.fillText(line, box.x, y);
      y += headFit.size * LINE_HEIGHT;
    }
  }
  if (subFit) {
    y += gap;
    ctx.font = `500 ${subFit.size}px ${FONT}`;
    ctx.fillStyle = subColor;
    for (const line of subFit.lines) {
      ctx.fillText(line, box.x, y);
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

export function drawVisual(ctx: CanvasRenderingContext2D, spec: VisualSpec): void {
  const W = spec.width;
  const H = spec.height;
  const m = Math.round(W * 0.08);
  const tall = H / W > 1.6; // hikâye: üst ve alt arayüz alanları boş kalmalı
  const top = tall ? 250 : m;
  const bottom = tall ? 270 : m;
  const footerH = Math.round(W * 0.075);
  const p = paletteOf(spec);
  const { share, accent } = sharesOf(spec, p);

  let template = spec.template;
  const hasBg = Boolean(spec.background && spec.backgroundSize);
  if (template === "fotograf" && !hasBg) template = "gradyan"; // arka plan yoksa güvenli yedek

  ctx.clearRect(0, 0, W, H);

  if (template === "duz") {
    // Ana renk yüzeyin (1 - accent) kadarında: alt bant yardımcı renge ayrılır.
    const bandH = Math.round(H * accent);
    const bandY = H - bandH;
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(0, bandY, W, bandH);
    const textBottom = bandY - Math.round(W * 0.05);
    drawTextBlock(
      ctx,
      spec,
      { x: m, y: top, w: W - 2 * m, h: Math.max(120, textBottom - top) },
      p.onPrimary,
      p.onPrimary,
      "middle"
    );
    // Bant büyüdükçe yazı da büyür; genişliği aşmaması için üst sınır uygulanır.
    drawBrand(ctx, spec, m, bandY + bandH / 2, Math.round(Math.min(bandH * 0.42, W * 0.05)), p.onSecondary);
    return;
  }

  if (template === "gradyan") {
    // Geçiş durakları orana göre kaydırılır: diagonelin ~share kadarı ana renk.
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p.primary);
    g.addColorStop(share * 0.75, mix(p.primary, p.secondary, 0.12));
    g.addColorStop(share, mix(p.primary, p.secondary, 0.5));
    g.addColorStop(Math.min(0.98, share + accent * 0.45), mix(p.primary, p.secondary, 0.88));
    g.addColorStop(1, p.secondary);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const on = contrastText(mix(p.primary, p.secondary, share));
    const textBottom = H - bottom - footerH - Math.round(W * 0.04);
    drawTextBlock(ctx, spec, { x: m, y: top, w: W - 2 * m, h: textBottom - top }, on, on, "middle");
    // Yardımcı renk vurgu çizgisi: kalınlık oranla artar.
    ctx.fillStyle = on;
    ctx.globalAlpha = 0.25 + accent * 0.6;
    ctx.fillRect(m, textBottom + Math.round(W * 0.02), Math.round(W * (0.14 + accent * 0.3)), Math.max(8, Math.round(W * accent * 0.02)));
    ctx.globalAlpha = 1;
    drawBrand(ctx, spec, m, H - bottom - footerH / 2, footerH, on);
    return;
  }

  if (template === "cerceve") {
    // Zemin ana rengin çok açık tonu; çerçeve ve başlık bandı yardımcı renk.
    const paper = mix(p.primary, "#ffffff", 0.93);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    const headerH = Math.round(H * accent * 0.42);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(0, 0, W, headerH);
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = Math.max(4, Math.round(W * 0.016 * share));
    const inset = Math.round(W * 0.035);
    ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset);
    drawBrand(ctx, spec, m, headerH / 2, Math.round(headerH * 0.5), p.onSecondary);
    const textTop = headerH + m;
    const textBottom = H - (tall ? bottom : m) - Math.round(W * 0.04);
    drawTextBlock(
      ctx,
      spec,
      { x: m, y: textTop, w: W - 2 * m, h: Math.max(120, textBottom - textTop) },
      mix(p.primary, "#101010", 0.55),
      "#4b4b4b",
      "middle"
    );
    return;
  }

  if (template === "serit") {
    // Üst bant ana renk (payı share ile orantılı), dikey vurgu yardımcı renk.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const bandH = tall ? Math.round(220 + 260 * share) : Math.round(H * share * 0.17);
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, 0, W, bandH);
    const bandCenter = tall ? bandH - 90 : bandH / 2;
    drawBrand(ctx, spec, m, bandCenter, Math.round(W * 0.075), p.onPrimary);
    const textTop = bandH + m;
    const textBottom = H - (tall ? bottom : m);
    const barW = Math.max(10, Math.round(W * accent * 0.09));
    ctx.fillStyle = p.secondary;
    ctx.fillRect(m, textTop, barW, textBottom - textTop);
    drawTextBlock(
      ctx,
      spec,
      { x: m + barW + 30, y: textTop, w: W - 2 * m - barW - 30, h: textBottom - textTop },
      "#111111",
      "#4b4b4b",
      "middle"
    );
    return;
  }

  // fotograf (arka plan var)
  const bg = spec.background as CanvasImageSource;
  const size = spec.backgroundSize as { w: number; h: number };
  const r = coverRect(size.w, size.h, W, H);
  ctx.drawImage(bg, r.sx, r.sy, r.sw, r.sh, 0, 0, W, H);
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,0.18)");
  shade.addColorStop(0.45, "rgba(0,0,0,0.25)");
  shade.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  // Ana renk tonu üst (geniş) bölgede, yardımcı renk dar vurgu bandında.
  ctx.fillStyle = p.primary;
  ctx.globalAlpha = 0.16 + share * 0.12;
  ctx.fillRect(0, 0, W, Math.round(H * share * 0.55));
  ctx.globalAlpha = 1;
  const textBottomY = H - bottom - footerH - Math.round(W * 0.04);
  const textTopY = drawTextBlock(
    ctx,
    spec,
    { x: m, y: textBottomY - Math.round(H * 0.4), w: W - 2 * m, h: Math.round(H * 0.4) },
    "#ffffff",
    "#f1f1f1",
    "bottom"
  );
  if (textTopY !== null) {
    ctx.fillStyle = p.secondary;
    ctx.fillRect(m, textTopY - 36, Math.round(W * (0.12 + accent * 0.34)), Math.max(8, Math.round(W * accent * 0.022)));
  }
  drawBrand(ctx, spec, m, H - bottom - footerH / 2, footerH, "#ffffff");
}
