"use client";

// Stüdyo: tek bir içeriğin Yaz → Görsel → Planla akışı. Adım ve çalışılan içerik URL'de tutulur;
// böylece geri tuşu, yenileme ve paylaşılan bağlantı akışı bozmaz.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { snippet } from "@/lib/dashboard-utils";
import { STUDIO_STEPS, isStudioStep, studioHref, type StudioStep } from "@/lib/routes";
import { useBusinessContext } from "./BusinessContext";
import Generator from "./Generator";
import VisualCreator from "./VisualCreator";
import Calendar from "./Calendar";
import Library from "./Library";
import { cx } from "./Ui";

function ActiveContentBar({ contentId, step }: { contentId: string; step: StudioStep }) {
  const { activeBusinessId } = useBusinessContext();
  const [loaded, setLoaded] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    void getSupabase()
      .from("contents")
      .select("prompt, post_text, caption")
      .eq("id", contentId)
      .eq("business_id", activeBusinessId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { prompt: string; post_text: string | null; caption: string | null } | null;
        setLoaded({ id: contentId, text: row ? snippet(row.post_text || row.caption || row.prompt, 120) : "" });
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, activeBusinessId]);

  const text = loaded?.id === contentId ? loaded.text : null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Çalışılan içerik</p>
        <p className="truncate text-sm text-ink">{text === null ? "Yükleniyor…" : text || "İçerik bulunamadı"}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        {step !== "onayla" && (
          <Link href={studioHref({ step: "onayla", contentId })} className="text-brand hover:underline dark:text-brand-strong">
            Düzenle / onayla
          </Link>
        )}
        <Link href={studioHref()} className="text-brand hover:underline dark:text-brand-strong">
          Yeni içerik
        </Link>
      </div>
    </div>
  );
}

export default function Studio() {
  const params = useSearchParams();
  const rawStep = params.get("adim");
  const step: StudioStep = isStudioStep(rawStep) ? rawStep : "yaz";
  const contentId = params.get("content") ?? "";
  return (
    <div className="space-y-5">
      <nav aria-label="Stüdyo adımları">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STUDIO_STEPS.map((s, i) => {
            const active = s.id === step;
            // İçeriğe bağlı adımlar, bir içerik kaydı oluşturulana kadar pasiftir.
            const href = studioHref({ step: s.id, contentId: contentId || undefined });
            const locked = s.id !== "yaz" && !contentId;
            const body = (
              <>
                <span
                  className={cx(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    active ? "bg-brand text-white" : "bg-surface-2 text-muted"
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold text-ink">{s.label}</span>
                  <span className="hidden truncate text-[11px] text-muted sm:block">{s.hint}</span>
                </span>
              </>
            );
            return (
              <li key={s.id}>
                {locked ? (
                  <span
                    aria-disabled="true"
                    title="Önce bir içerik yazın veya İçerikler'den seçin"
                    className="flex items-center gap-2.5 rounded-2xl border border-dashed border-line px-3 py-2.5 opacity-50"
                  >
                    {body}
                  </span>
                ) : (
                  <Link
                    href={href}
                    aria-current={active ? "step" : undefined}
                    className={cx(
                      "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition",
                      active ? "border-brand bg-brand-soft" : "border-line bg-surface/90 hover:border-line-strong"
                    )}
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {contentId && <ActiveContentBar contentId={contentId} step={step} />}

      {step === "yaz" && <Generator />}
      {step === "onayla" && <Library />}
      {step === "gorsel" && <VisualCreator />}
      {step === "planla" && <Calendar />}
    </div>
  );
}
