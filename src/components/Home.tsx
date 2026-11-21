"use client";

// Ana sayfa: bugünün özeti, sıradaki adım ve Stüdyo'ya kısayollar. Sohbet asistanı sağ alttaki balondadır.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDashboard, type DashboardData } from "@/lib/dashboard-data";
import { greeting, nextAction, weekStrip } from "@/lib/dashboard-utils";
import { upcomingSpecialDays } from "@/lib/special-days";
import { STUDIO_MODES, modeHref } from "@/lib/routes";
import { useBusinessContext } from "./BusinessContext";
import { IconArrowRight } from "./Icons";
import { cx } from "./Ui";

export default function Home() {
  const { activeBusinessId: businessId, isBusinessLoading } = useBusinessContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    if (!businessId) return;
    loadDashboard(businessId)
      .then((d) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const strip = useMemo(() => weekStrip(data?.weekIsos ?? [], now), [data, now]);
  const specialDays = useMemo(() => upcomingSpecialDays(now, 30, 3), [now]);
  const next = data
    ? nextAction({
        overdue: data.overdue,
        total: data.total,
        drafts: data.drafts,
        approved: data.approved,
        upcoming7: data.upcoming.filter((i) => new Date(i.scheduled_at).getTime() >= now.getTime()).length,
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1 pt-1">
        <p className="text-sm text-muted">
          {greeting(now)}
          {data ? `, ${data.business.name}` : ""}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Bugün ne paylaşalım?</h1>
      </header>

      {!businessId && !isBusinessLoading && (
        <Link href="/marka" className="block rounded-2xl border border-brand/25 bg-brand-soft p-4 text-sm font-semibold text-brand">
          Başlamak için önce markanı oluştur →
        </Link>
      )}
      {failed && <p role="alert" className="text-sm text-danger">Özet yüklenemedi.</p>}

      {next && (
        <Link
          href={next.href}
          className={cx("block rounded-2xl border p-4 transition hover:-translate-y-0.5", next.tone === "warn" ? "border-warn/30 bg-warn-soft" : "border-brand/25 bg-brand-soft")}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Sıradaki adım</p>
          <p className="mt-1 text-sm font-semibold text-ink">{next.title}</p>
          <p className="mt-0.5 text-xs text-muted">{next.description}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            {next.cta} <IconArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      )}

      <section aria-label="Stüdyo" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Ne hazırlayacaksın?</h2>
          <Link href="/studyo" className="text-xs font-semibold text-brand">Stüdyo →</Link>
        </div>
        <ul className="grid grid-cols-2 gap-2.5">
          {STUDIO_MODES.map((m) => (
            <li key={m.id}>
              <Link href={m.href} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-3.5 shadow-soft transition hover:border-brand">
                <span className="text-sm font-bold text-ink">{m.label}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-muted">{m.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Bu hafta" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Bu hafta</h2>
          <Link href="/hafta" className="text-xs font-semibold text-brand">Haftam →</Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {strip.map((d) => (
            <Link key={d.key} href="/hafta" className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2 text-[11px] text-muted">
              <span className="font-semibold capitalize">{d.isToday ? "Bugün" : d.label}</span>
              <span className={cx("grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold", d.count ? "bg-brand-soft text-brand" : "bg-surface-2 text-faint")}>{d.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {specialDays.length > 0 && (
        <section aria-label="Yaklaşan özel günler" className="space-y-2.5">
          <h2 className="text-sm font-bold text-ink">Yaklaşan özel günler</h2>
          <ul className="space-y-1.5">
            {specialDays.map((d) => (
              <li key={d.name}>
                <Link href={modeHref("metin", { prompt: d.prompt })} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm transition hover:border-brand">
                  <span className="font-medium text-ink">{d.name}</span>
                  <span className="text-xs text-muted">{d.daysAway === 0 ? "bugün" : `${d.daysAway} gün`} · yaz →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
