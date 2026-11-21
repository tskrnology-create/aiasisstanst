// Basit logo üretici: marka adı + iki marka rengi + biçim seçimleriyle 512×512 PNG çizer.
// Yapay zekâ görseli değildir; tarayıcıda canvas ile çizilir, ağ isteği ve kota gerektirmez.

import { mix, normalizeHex, readPalette } from "./brand-palette";

export const LOGO_STYLES = [
  { id: "rozet", label: "Yuvarlak rozet", hint: "Baş harfler daire içinde" },
  { id: "kare", label: "Kare rozet", hint: "Yuvarlak köşeli kare" },
  { id: "simge", label: "Simge + isim", hint: "Üstte simge, altta isim" },
  { id: "yazi", label: "Yazı logosu", hint: "Sadece marka adı" },
] as const;
export type LogoStyle = (typeof LOGO_STYLES)[number]["id"];

export const LOGO_SYMBOLS = [
  { id: "daire", label: "Daire" },
  { id: "elmas", label: "Elmas" },
  { id: "altigen", label: "Altıgen" },
  { id: "yildiz", label: "Yıldız" },
  { id: "yaprak", label: "Yaprak" },
  { id: "simsek", label: "Şimşek" },
  { id: "dalga", label: "Dalga" },
  { id: "dag", label: "Dağ" },
] as const;
export type LogoSymbol = (typeof LOGO_SYMBOLS)[number]["id"];

export const LOGO_FONTS = [
  { id: "modern", label: "Modern" },
  { id: "klasik", label: "Klasik" },
  { id: "yuvarlak", label: "Yuvarlak" },
  { id: "ince", label: "İnce" },
] as const;
export type LogoFont = (typeof LOGO_FONTS)[number]["id"];

export type LogoBackground = "acik" | "koyu";

export interface LogoOptions {
  name: string;
  style: LogoStyle;
  symbol: LogoSymbol;
  font: LogoFont;
  background: LogoBackground;
  colors: string[];
}

export function isLogoStyle(v: unknown): v is LogoStyle {
  return LOGO_STYLES.some((s) => s.id === v);
}

/** "Dakika Bilişim" → "DB"; tek sözcükte ilk harf; Türkçe büyük harf kuralı. */
export function initialsOf(name: string, max = 2): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "A";
  const letters = words.length === 1 ? [[...words[0]][0]] : words.slice(0, max).map((w) => [...w][0]);
  return letters.join("").toLocaleUpperCase("tr-TR");
}

/** Uzun adlarda iki satıra böler (en dengeli boşluktan). */
export function splitName(name: string, maxLine = 12): string[] {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLine || !clean.includes(" ")) return [clean];
  const words = clean.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

const SIZE = 512;

function fontString(font: LogoFont, px: number, sans: string): string {
  switch (font) {
    case "klasik":
      return `700 ${px}px Georgia, "Times New Roman", serif`;
    case "yuvarlak":
      return `800 ${px}px "Trebuchet MS", "Segoe UI", ${sans}`;
    case "ince":
      return `300 ${px}px ${sans}`;
    default:
      return `800 ${px}px ${sans}`;
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: LogoFont, sans: string, maxWidth: number, startPx: number, minPx = 28): number {
  let px = startPx;
  while (px > minPx) {
    ctx.font = fontString(font, px, sans);
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  ctx.font = fontString(font, px, sans);
  return px;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Simgeyi (cx, cy) merkezli, yarıçapı r olan alana çizer. */
function drawSymbol(ctx: CanvasRenderingContext2D, symbol: LogoSymbol, cx: number, cy: number, r: number) {
  ctx.beginPath();
  switch (symbol) {
    case "daire":
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case "elmas":
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.8, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.8, cy);
      ctx.closePath();
      break;
    case "altigen":
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case "yildiz":
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.42;
        const x = cx + rad * Math.cos(a);
        const y = cy + rad * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case "yaprak":
      ctx.moveTo(cx - r * 0.85, cy + r * 0.85);
      ctx.quadraticCurveTo(cx - r * 1.05, cy - r * 0.7, cx + r * 0.85, cy - r * 0.9);
      ctx.quadraticCurveTo(cx + r * 1.05, cy + r * 0.7, cx - r * 0.85, cy + r * 0.85);
      ctx.closePath();
      break;
    case "simsek":
      ctx.moveTo(cx + r * 0.2, cy - r);
      ctx.lineTo(cx - r * 0.6, cy + r * 0.12);
      ctx.lineTo(cx - r * 0.05, cy + r * 0.12);
      ctx.lineTo(cx - r * 0.25, cy + r);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.18);
      ctx.lineTo(cx + r * 0.08, cy - r * 0.18);
      ctx.closePath();
      break;
    case "dalga":
      ctx.moveTo(cx - r, cy);
      ctx.bezierCurveTo(cx - r * 0.6, cy - r * 0.9, cx - r * 0.2, cy - r * 0.9, cx, cy);
      ctx.bezierCurveTo(cx + r * 0.2, cy + r * 0.9, cx + r * 0.6, cy + r * 0.9, cx + r, cy);
      ctx.lineTo(cx + r, cy + r * 0.45);
      ctx.bezierCurveTo(cx + r * 0.6, cy + r * 1.35, cx + r * 0.2, cy + r * 1.35, cx, cy + r * 0.45);
      ctx.bezierCurveTo(cx - r * 0.2, cy - r * 0.45, cx - r * 0.6, cy - r * 0.45, cx - r, cy + r * 0.45);
      ctx.closePath();
      break;
    case "dag":
      ctx.moveTo(cx - r, cy + r * 0.8);
      ctx.lineTo(cx - r * 0.25, cy - r * 0.6);
      ctx.lineTo(cx + r * 0.15, cy + r * 0.05);
      ctx.lineTo(cx + r * 0.5, cy - r * 0.3);
      ctx.lineTo(cx + r, cy + r * 0.8);
      ctx.closePath();
      break;
  }
  ctx.fill();
}

/** 512×512 tuvale logoyu çizer. `sans`: sayfanın yüklü sans-serif yazı tipi ailesi. */
export function drawLogo(canvas: HTMLCanvasElement, opts: LogoOptions, sans = "system-ui, sans-serif"): void {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, SIZE, SIZE);

  const palette = readPalette(opts.colors.map((c) => normalizeHex(c) ?? "").filter(Boolean));
  const primary = palette.primary;
  const secondary = palette.secondary;
  const name = opts.name.trim() || "Marka";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (opts.style === "rozet" || opts.style === "kare") {
    const initials = initialsOf(name);
    if (opts.style === "rozet") {
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(256, 256, 244, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = secondary;
      ctx.beginPath();
      ctx.arc(256, 256, 212, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = primary;
      roundRect(ctx, 12, 12, 488, 488, 110);
      ctx.fill();
      ctx.save();
      roundRect(ctx, 12, 12, 488, 488, 110);
      ctx.clip();
      ctx.fillStyle = secondary;
      ctx.fillRect(12, 400, 488, 100);
      ctx.restore();
    }
    ctx.fillStyle = palette.onPrimary;
    fitText(ctx, initials, opts.font, sans, opts.style === "rozet" ? 300 : 340, initials.length > 1 ? 230 : 280, 80);
    ctx.fillText(initials, 256, opts.style === "rozet" ? 266 : 236);
    return;
  }

  // Simge+isim ve yazı logosu: zemin plakası üzerinde.
  const dark = opts.background === "koyu";
  const plate = dark ? primary : "#ffffff";
  const ink = dark ? palette.onPrimary : primary;
  const accent = dark ? mix(secondary, "#ffffff", 0.0) : secondary;
  ctx.fillStyle = plate;
  roundRect(ctx, 12, 12, 488, 488, 64);
  ctx.fill();
  if (!dark) {
    ctx.strokeStyle = mix(primary, "#ffffff", 0.82);
    ctx.lineWidth = 6;
    roundRect(ctx, 15, 15, 482, 482, 62);
    ctx.stroke();
  }

  const lines = splitName(name, opts.style === "simge" ? 11 : 10).map((l) => l.toLocaleUpperCase("tr-TR"));
  ctx.fillStyle = ink;

  if (opts.style === "simge") {
    ctx.fillStyle = accent;
    drawSymbol(ctx, opts.symbol, 256, 170, 92);
    ctx.fillStyle = ink;
    const px = Math.min(...lines.map((l) => fitText(ctx, l, opts.font, sans, 400, lines.length > 1 ? 70 : 88, 30)));
    ctx.font = fontString(opts.font, px, sans);
    const top = lines.length > 1 ? 340 : 360;
    lines.forEach((l, i) => ctx.fillText(l, 256, top + i * (px + 8)));
  } else {
    const px = Math.min(...lines.map((l) => fitText(ctx, l, opts.font, sans, 410, lines.length > 1 ? 110 : 130, 36)));
    ctx.font = fontString(opts.font, px, sans);
    const total = lines.length * px + (lines.length - 1) * 10;
    const start = 256 - total / 2 + px / 2 - 22;
    lines.forEach((l, i) => ctx.fillText(l, 256, start + i * (px + 10)));
    ctx.fillStyle = accent;
    roundRect(ctx, 156, start + total / 2 + px / 2 + 24, 200, 18, 9);
    ctx.fill();
  }
}
