"use client";

// Logo: yükle, kaldır veya marka adı ve renklerinden basit bir logo oluştur.

import { useEffect, useRef, useState } from "react";
import { readPalette } from "@/lib/brand-palette";
import {
  LOGO_FONTS,
  LOGO_STYLES,
  LOGO_SYMBOLS,
  drawLogo,
  type LogoBackground,
  type LogoFont,
  type LogoStyle,
  type LogoSymbol,
} from "@/lib/logo-maker";
import { Button, Callout, Chip, cx, hintClass, inputClass, labelClass } from "./Ui";
import { IconWand } from "./Icons";

const MAX_LOGO_BYTES = 500 * 1024;

export default function LogoStudio({
  logo,
  onChange,
  brandName,
  colors,
}: {
  logo: string | null;
  onChange: (next: string | null) => void;
  brandName: string;
  colors: string[];
}) {
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState("");
  const [style, setStyle] = useState<LogoStyle>("rozet");
  const [symbol, setSymbol] = useState<LogoSymbol>("daire");
  const [font, setFont] = useState<LogoFont>("modern");
  const [background, setBackground] = useState<LogoBackground>("acik");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const name = text.trim() || brandName.trim() || "Marka";
  const palette = readPalette(colors);
  const key = [name, style, symbol, font, background, palette.primary, palette.secondary].join("|");

  useEffect(() => {
    if (!creating || !canvasRef.current) return;
    const sans = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const canvas = canvasRef.current;
    const run = () =>
      drawLogo(canvas, { name, style, symbol, font, background, colors: [palette.primary, palette.secondary] }, sans);
    run();
    // Yazı tipi geç yüklenirse yeniden çiz.
    void document.fonts?.ready.then(run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating, key]);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo PNG, JPG veya WebP olmalı.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo 500 KB'den küçük olmalı.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  function useGenerated() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    const url = canvas.toDataURL("image/png");
    if (url.length * 0.75 > MAX_LOGO_BYTES) {
      setError("Oluşturulan logo çok büyük; daha kısa bir ad deneyin.");
      return;
    }
    onChange(url);
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface-2/50 p-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Logo önizleme" className="h-20 w-20 rounded-xl border border-line bg-surface object-contain p-1" />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-xl border border-line bg-surface text-xs text-faint">Logo yok</span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
              <IconWand /> {creating ? "Oluşturucuyu kapat" : "Logo oluştur"}
            </Button>
            <label className={cx(labelClass, "inline-flex h-9 cursor-pointer items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-brand")}>
              {logo ? "Başka logo yükle" : "Logo yükle"}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} className="sr-only" />
            </label>
            {logo && (
              <button type="button" onClick={() => onChange(null)} className="text-xs text-muted transition hover:text-danger">
                Kaldır
              </button>
            )}
          </div>
          <p className={hintClass}>PNG, JPG veya WebP, en fazla 500 KB. Kayıt için formu kaydetmeyi unutmayın.</p>
        </div>
      </div>

      {error && <Callout tone="error">{error}</Callout>}

      {creating && (
        <div className="grid gap-5 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Logo önizlemesi"
              className="aspect-square w-full max-w-[220px] rounded-2xl border border-line bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px]"
            />
            <Button type="button" variant="primary" size="sm" className="w-full" onClick={useGenerated}>
              Bu logoyu kullan
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="logo-text" className={labelClass}>Logoda yazacak ad</label>
              <input
                id="logo-text"
                className={inputClass}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 40))}
                placeholder={brandName || "Marka adı"}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Biçim</p>
              <div className="flex flex-wrap gap-1.5">
                {LOGO_STYLES.map((s) => (
                  <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
            {style === "simge" && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Simge</p>
                <div className="flex flex-wrap gap-1.5">
                  {LOGO_SYMBOLS.map((s) => (
                    <Chip key={s.id} active={symbol === s.id} onClick={() => setSymbol(s.id)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Yazı stili</p>
              <div className="flex flex-wrap gap-1.5">
                {LOGO_FONTS.map((f) => (
                  <Chip key={f.id} active={font === f.id} onClick={() => setFont(f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
            </div>
            {(style === "simge" || style === "yazi") && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Zemin</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={background === "acik"} onClick={() => setBackground("acik")}>Açık</Chip>
                  <Chip active={background === "koyu"} onClick={() => setBackground("koyu")}>Ana renk</Chip>
                </div>
              </div>
            )}
            <p className={hintClass}>
              Logo marka renklerinizle çizilir; renkleri değiştirirseniz önizleme güncellenir. Bu basit bir oluşturucudur; kapsamlı bir marka kimliği için bir tasarımcıyla çalışmanızı öneririz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
