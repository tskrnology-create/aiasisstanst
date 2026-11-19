"use client";

// Şablon seçici: her şablon, mevcut yazı/renk/arka planla küçük bir önizleme olarak çizilir.
// Yeni şablon TEMPLATES listesine eklenince burada otomatik görünür.

import { useEffect, useRef } from "react";
import { FORMATS, TEMPLATES, drawVisual, type FormatId, type TemplateId, type VisualSpec } from "@/lib/visual-templates";
import { cx } from "../Ui";

const THUMB_W = 180;

type BaseSpec = Omit<VisualSpec, "width" | "height" | "template">;

function Thumb({
  id,
  label,
  format,
  base,
  active,
  onSelect,
}: {
  id: TemplateId;
  label: string;
  format: FormatId;
  base: BaseSpec;
  active: boolean;
  onSelect: (id: TemplateId) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Yazı yazarken her tuşta 11 şablonu çizmemek için kısa gecikme.
    const timer = setTimeout(() => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const f = FORMATS[format];
      const scale = THUMB_W / f.width;
      canvas.width = THUMB_W;
      canvas.height = Math.round(f.height * scale);
      ctx.save();
      ctx.scale(scale, scale);
      drawVisual(ctx, { ...base, width: f.width, height: f.height, template: id });
      ctx.restore();
    }, 120);
    return () => clearTimeout(timer);
  }, [id, format, base]);

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={active}
      aria-label={`${label} şablonu`}
      className={cx(
        "group flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition",
        active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong"
      )}
    >
      <span className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
        <canvas ref={ref} className="max-h-full max-w-full rounded-sm" />
      </span>
      <span className={cx("truncate px-0.5 text-xs font-medium", active ? "text-brand" : "text-muted")}>
        {label}
      </span>
    </button>
  );
}

export default function TemplateGallery({
  value,
  onChange,
  format,
  base,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  format: FormatId;
  base: BaseSpec;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Şablonlar">
      {TEMPLATES.map((t) => (
        <Thumb key={t.id} id={t.id} label={t.label} format={format} base={base} active={value === t.id} onSelect={onChange} />
      ))}
    </div>
  );
}
