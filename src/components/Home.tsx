"use client";

// Ana sayfa: bugünün özeti, sıradaki adım ve Stüdyo'ya kısayollar. Sohbet asistanı sağ alttaki balondadır.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDashboard, type DashboardData } from "@/lib/dashboard-data";
import { greeting, nextAction, weekStrip } from "@/lib/dashboard-utils";
import { upcomingSpecialDays } from "@/lib/special-days";
import { modeHref } from "@/lib/routes";
import { useBusinessContext } from "./BusinessContext";
import { IconArrowRight } from "./Icons";
import { cx } from "./Ui";

export default function Home() {
  const { activeBusinessId: businessId, isBusinessLoading } = useBusinessContext();
  const [snapshot, setSnapshot] = useState<{ businessId: string; data: DashboardData } | null>(null);
  const [failedBusinessId, setFailedBusinessId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    if (!businessId || isBusinessLoading) return;
    loadDashboard(businessId)
      .then((data) => {
        if (!cancelled) {
          setSnapshot({ businessId, data });
          setFailedBusinessId(null);
        }
      })
      .catch(() => { if (!cancelled) setFailedBusinessId(businessId); });
    return () => {
      cancelled = true;
    };
  }, [businessId, isBusinessLoading, version]);

  const currentData = snapshot?.businessId === businessId ? snapshot.data : null;
  const loading = Boolean(businessId && !isBusinessLoading && !currentData && failedBusinessId !== businessId);
  const failed = Boolean(businessId && failedBusinessId === businessId);
  const strip = useMemo(() => weekStrip(currentData?.weekIsos ?? [], now), [currentData, now]);
  const specialDays = useMemo(() => upcomingSpecialDays(now, 30, 3), [now]);
  const next = currentData
    ? nextAction({
        overdue: currentData.overdue,
        total: currentData.total,
        drafts: currentData.drafts,
        approved: currentData.approved,
        upcoming7: currentData.upcoming.filter((i) => new Date(i.scheduled_at).getTime() >= now.getTime()).length,
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1 pt-1">
        <p className="text-sm text-muted">
          {greeting(now)}
          {currentData ? `, ${currentData.business.name}` : ""}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Bugün ne paylaşalım?</h1>
      </header>

      {!businessId && !isBusinessLoading && (
        <Link href="/marka" className="block rounded-2xl border border-brand/25 bg-brand-soft p-4 text-sm font-semibold text-brand">
          Başlamak için önce markanı oluştur →
        </Link>
      )}
      {loading && <p role="status" className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">İş özetin yükleniyor…</p>}
      {failed && (
        <div role="alert" className="rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
          <p>İş özeti yüklenemedi. İçeriklerin silinmedi; bağlantıyı kontrol edip yeniden deneyebilirsin.</p>
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="mt-2 font-semibold underline underline-offset-2">Yeniden dene</button>
        </div>
      )}

      <Link href="/hafta" className="flex items-center justify-between rounded-2xl bg-brand p-4 text-brand-ink shadow-pop transition hover:-translate-y-0.5">
        <span>
          <span className="block text-sm font-bold">Haftayı planla</span>
          <span className="block text-xs opacity-90">Ne paylaşacağına bir daha takılma: fikirler günlere yerleşir.</span>
        </span>
        <IconArrowRight className="h-5 w-5" />
      </Link>

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
          <h2 className="text-sm font-bold text-ink">Bir sonraki paylaşım</h2>
          <Link href="/studyo" className="text-xs font-semibold text-brand">Stüdyo →</Link>
        </div>
        <Link href="/studyo/birlikte" className="block rounded-3xl border border-brand/25 bg-brand-soft p-5 transition hover:border-brand">
          <span className="text-base font-bold text-ink">Fikirden paylaşım planına ilerle</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted">Metni hazırla, gerekirse görsel ekle, hesabı ve tarihi seç. Son paylaşımı sosyal platformda sen yaparsın.</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand">Paylaşım hazırla <IconArrowRight className="h-4 w-4" /></span>
        </Link>
        <details className="rounded-2xl border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Sadece tek bir iş yap</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={modeHref("metin")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink">Yalnız metin</Link>
            <Link href={modeHref("gorsel")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink">Yalnız görsel</Link>
            <Link href={modeHref("video", { step: "kendi" })} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink">Hazır videomu ekle</Link>
          </div>
        </details>
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
