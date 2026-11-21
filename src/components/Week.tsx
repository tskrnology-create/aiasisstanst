"use client";

// Hafta: 7 günlük plan şeridi. Güne dokun, o günün paylaşımlarını gör; boş günde asistanı aç.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { loadDashboard, type DashboardData } from "@/lib/dashboard-data";
import { weekStrip } from "@/lib/dashboard-utils";
import { addDays, dayKey, startOfDay } from "@/lib/calendar-utils";
import { contentsHref } from "@/lib/routes";
import { useBusinessContext } from "./BusinessContext";
import { Button, Callout, EmptyState, LinkButton, Tag, cx } from "./Ui";
import { IconCheck, IconPlus } from "./Icons";

export default function Week() {
  const { activeBusinessId: businessId } = useBusinessContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [now] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      setData(await loadDashboard(businessId));
      setError(null);
    } catch {
      setError("Hafta yüklenemedi.");
    }
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    if (!businessId) return;
    loadDashboard(businessId)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError("Hafta yüklenemedi."));
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const strip = useMemo(() => weekStrip(data?.weekIsos ?? [], now), [data, now]);
  const day = startOfDay(addDays(now, selected));
  const items = (data?.upcoming ?? []).filter((i) => dayKey(new Date(i.scheduled_at)) === dayKey(day));
  const overdue = (data?.upcoming ?? []).filter((i) => new Date(i.scheduled_at) < startOfDay(now));

  async function markDone(id: string) {
    const { error: err } = await getSupabase().from("calendar_items").update({ done: true }).eq("id", id);
    if (err) setError("İşaretlenemedi.");
    else void load();
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (!businessId) return <EmptyState title="Önce bir marka seçin" description="Hafta planı seçili markaya göre gösterilir." />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm text-muted">Önümüzdeki 7 gün</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Haftam</h1>
      </header>

      {error && <Callout tone="error">{error}</Callout>}

      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Günler">
        {strip.map((d, i) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={selected === i}
            onClick={() => setSelected(i)}
            className={cx(
              "flex flex-col items-center gap-1 rounded-2xl border py-2.5 text-xs transition",
              selected === i ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted"
            )}
          >
            <span className="font-semibold capitalize">{d.isToday ? "Bugün" : d.label}</span>
            <span className={cx("grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold",
              selected === i ? "bg-white/25" : d.count ? "bg-brand-soft text-brand" : "bg-surface-2 text-faint")}>
              {d.count}
            </span>
          </button>
        ))}
      </div>

      {overdue.length > 0 && selected === 0 && (
        <Callout tone="warning">{overdue.length} paylaşımın zamanı geçti. Paylaştıysanız aşağıdan işaretleyin.</Callout>
      )}

      <section aria-label="Seçili günün paylaşımları" className="space-y-2.5">
        {[...(selected === 0 ? overdue : []), ...items].map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-surface p-3.5 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">{time(item.scheduled_at)}</span>
              {item.platform && <Tag>{item.platform}</Tag>}
            </div>
            <p className="mt-1.5 text-sm text-ink">{item.text || "İçerik"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => markDone(item.id)}>
                <IconCheck className="h-4 w-4" /> Paylaşıldı
              </Button>
              <LinkButton size="sm" variant="ghost" href={contentsHref({ view: "takvim" })}>
                Takvimde aç
              </LinkButton>
            </div>
          </article>
        ))}
        {items.length === 0 && !(selected === 0 && overdue.length) && (
          <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
            <p className="text-sm font-semibold text-ink">Bu gün boş</p>
            <p className="mt-1 text-xs text-muted">Asistana söyle, içeriği hazırlayıp bu güne koyalım.</p>
            <Link
              href={`/?gun=${dayKey(day)}`}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-brand-ink"
            >
              <IconPlus className="h-4 w-4" /> Bu güne içerik ekle
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
