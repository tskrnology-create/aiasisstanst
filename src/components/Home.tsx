"use client";

// Ana sayfa: bugünün özeti, sıradaki adım ve Stüdyo'ya kısayollar. Sohbet asistanı sağ alttaki balondadır.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDashboard, type DashboardData } from "@/lib/dashboard-data";
import { greeting, nextAction, weekStrip } from "@/lib/dashboard-utils";
import { upcomingSpecialDays } from "@/lib/special-days";
import { contentsHref } from "@/lib/routes";
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

      <Link href="/olustur" className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-soft transition hover:border-brand">
        <span>
          <span className="block text-sm font-bold text-ink">Şimdi bir şey oluştur</span>
          <span className="block text-xs text-muted">Fikrini yaz; yazı ve kapak görseli birlikte hazırlansın.</span>
        </span>
        <IconArrowRight className="h-5 w-5 text-brand" />
      </Link>

      <section aria-label="Bu hafta" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Bu hafta</h2>
          <Link href={contentsHref({ view: "takvim" })} className="text-xs font-semibold text-brand">Takvim →</Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {strip.map((d) => (
            <Link key={d.key} href={contentsHref({ view: "takvim" })} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2 text-[11px] text-muted">
              <span className="font-semibold capitalize">{d.isToday ? "Bugün" : d.label}</span>
              <span className={cx("grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold", d.count ? "bg-brand-soft text-brand" : "bg-surface-2 text-faint")}>{d.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {currentData && (
        <section aria-label="Neler işe yarıyor" className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">Neler işe yarıyor?</h2>
          {currentData.insights.bestPlatform ? (
            <p className="mt-1 text-sm text-muted">
              En çok etkileşim <b className="text-ink">{currentData.insights.bestPlatform.name}</b>
              {currentData.insights.bestDayPart && <> ve <b className="text-ink">{currentData.insights.bestDayPart.name}</b> saatlerinde</>} geldi
              ({currentData.insights.count} gönderiye göre).
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Paylaştığın gönderilerin beğeni, yorum ve kaydetme sayısını Hafta ekranında girersen en iyi platformu ve saati burada gösteririz
              (en az 3 sonuç gerekir, şu an {currentData.insights.count}).
            </p>
          )}
        </section>
      )}

      {specialDays.length > 0 && (
        <section aria-label="Yaklaşan özel günler" className="space-y-2.5">
          <h2 className="text-sm font-bold text-ink">Yaklaşan özel günler</h2>
          <ul className="space-y-1.5">
            {specialDays.map((d) => (
              <li key={d.name}>
                <Link href={`/olustur?prompt=${encodeURIComponent(d.prompt.slice(0, 500))}`} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm transition hover:border-brand">
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
