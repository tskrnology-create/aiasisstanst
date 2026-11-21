"use client";

// Marka renkleri: iki renk (ana %70 / yardımcı %30), hazır paletler, uyumlu öneriler,
// logodan renk alma ve canlı gönderi önizlemesi.

import { useState } from "react";
import {
  FALLBACK_PRIMARY,
  FALLBACK_SECONDARY,
  isValidHex,
  normalizeHex,
  paletteAdvice,
  percent,
  readPalette,
} from "@/lib/brand-palette";
import { PALETTE_PRESETS, extractPalette, harmonySecondaries } from "@/lib/palette-tools";
import { Button, Callout, cx, hintClass, inputClass } from "./Ui";
import { IconWand } from "./Icons";

async function colorsFromImage(dataUrl: string): Promise<{ primary: string; secondary: string } | null> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  return extractPalette(ctx.getImageData(0, 0, size, size).data);
}

function Swatch({
  title,
  role,
  share,
  value,
  fallback,
  onChange,
  invalid,
  describedBy,
}: {
  title: string;
  role: string;
  share: number;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const shown = normalizeHex(value) ?? fallback;
  return (
    <div className="flex items-stretch gap-3 rounded-2xl border border-line bg-surface-2/60 p-3">
      <label
        className="relative block h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line shadow-inner"
        style={{ backgroundColor: shown }}
      >
        <span className="sr-only">{title} seçici</span>
        <input
          type="color"
          value={shown}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
            {role} · {percent(share)}
          </span>
        </div>
        <input
          aria-label={`${title} kodu`}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          className={cx(inputClass, "font-mono text-xs uppercase")}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="#RRGGBB"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export default function BrandColorStudio({
  colors,
  onChange,
  brandName,
  logoDataUrl,
  error,
  errorId,
}: {
  colors: string[];
  onChange: (next: string[]) => void;
  brandName: string;
  logoDataUrl: string | null;
  error?: string;
  errorId?: string;
}) {
  const [primaryText, secondaryText] = [colors[0] ?? "", colors[1] ?? ""];
  const bothValid = isValidHex(primaryText) && isValidHex(secondaryText);
  const palette = readPalette(bothValid ? [primaryText, secondaryText] : []);
  const advice = paletteAdvice(palette);
  const harmonies = isValidHex(primaryText) ? harmonySecondaries(primaryText) : [];
  const [logoMsg, setLogoMsg] = useState<string | null>(null);

  const set = (primary: string, secondary: string) => onChange([primary, secondary]);

  async function fromLogo() {
    if (!logoDataUrl) return;
    setLogoMsg(null);
    try {
      const result = await colorsFromImage(logoDataUrl);
      if (!result) throw new Error("empty");
      set(result.primary.toUpperCase(), result.secondary.toUpperCase());
      setLogoMsg("Logodaki baskın renkler uygulandı. İsterseniz düzenleyebilirsiniz.");
    } catch {
      setLogoMsg("Logodan renk alınamadı. Renkleri elle seçebilirsiniz.");
    }
  }

  const name = brandName.trim() || "Markanız";

  return (
    <div className="space-y-5" role="group" aria-label="Marka renkleri" aria-describedby={errorId}>
      <div className="grid gap-3 md:grid-cols-2">
        <Swatch
          title="Ana renk"
          role="Baskın"
          share={palette.share}
          value={primaryText}
          fallback={FALLBACK_PRIMARY}
          onChange={(v) => set(v, secondaryText)}
          invalid={Boolean(error)}
          describedBy={errorId}
        />
        <Swatch
          title="Yardımcı renk"
          role="Vurgu"
          share={palette.accent}
          value={secondaryText}
          fallback={FALLBACK_SECONDARY}
          onChange={(v) => set(primaryText, v)}
          invalid={Boolean(error)}
          describedBy={errorId}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          {harmonies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Ana renge uyan yardımcı renkler</p>
              <ul className="flex flex-wrap gap-2">
                {harmonies.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => set(primaryText, h.color.toUpperCase())}
                      className={cx(
                        "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition hover:border-brand",
                        normalizeHex(secondaryText) === h.color ? "border-brand bg-brand-soft" : "border-line bg-surface"
                      )}
                    >
                      <span className="h-5 w-5 rounded-md border border-line" style={{ backgroundColor: h.color }} />
                      {h.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Hazır paletler</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PALETTE_PRESETS.map((p) => {
                const active = normalizeHex(primaryText) === p.primary && normalizeHex(secondaryText) === p.secondary;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => set(p.primary.toUpperCase(), p.secondary.toUpperCase())}
                      aria-pressed={active}
                      className={cx(
                        "flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition hover:border-brand",
                        active ? "border-brand bg-brand-soft" : "border-line bg-surface"
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line">
                        <span className="w-[70%]" style={{ backgroundColor: p.primary }} />
                        <span className="w-[30%]" style={{ backgroundColor: p.secondary }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-ink">{p.name}</span>
                        <span className="block truncate text-[11px] text-muted">{p.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {logoDataUrl && (
            <div className="space-y-2">
              <Button type="button" variant="secondary" size="sm" onClick={fromLogo}>
                <IconWand /> Logomdan renkleri al
              </Button>
              {logoMsg && <p className={hintClass}>{logoMsg}</p>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Önizleme (%70 / %30)</p>
          <div
            className="flex aspect-square w-full max-w-[260px] flex-col overflow-hidden rounded-2xl border border-line shadow-soft"
            aria-label="Marka renkleriyle örnek gönderi"
          >
            <div
              className="flex flex-[7] flex-col justify-between p-4"
              style={{ backgroundColor: palette.primary, color: palette.onPrimary }}
            >
              <span className="flex items-center gap-2">
                {logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoDataUrl} alt="" className="h-7 w-7 rounded-md bg-white/90 object-contain p-0.5" />
                )}
                <span className="truncate text-xs font-semibold opacity-90">{name}</span>
              </span>
              <span className="text-xl font-extrabold leading-tight">Kasım fırsatı başladı</span>
            </div>
            <div
              className="flex flex-[3] items-center justify-between px-4 text-xs font-bold"
              style={{ backgroundColor: palette.secondary, color: palette.onSecondary }}
            >
              <span>Hemen mesaj atın</span>
              <span aria-hidden="true">→</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {bothValid ? (
        <Callout tone={advice.tone === "ok" ? "success" : "warning"}>{advice.text}</Callout>
      ) : (
        <Callout tone="info">İki renk de seçildiğinde kontrast uyarısı burada görünür.</Callout>
      )}
      <p className={hintClass}>
        Oran şablonlara ve yapay zekâ isteklerine otomatik işlenir; tek bir görsel için Görsel adımında değiştirebilirsiniz.
      </p>
    </div>
  );
}
