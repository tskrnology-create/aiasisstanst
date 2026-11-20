"use client";

// İşletme paneli: aktif markanın durumunu tek bakışta gösterir ve sonraki adıma götürür.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import { readPalette, DEFAULT_RATIO } from "@/lib/brand-palette";
import { STATUS_LABEL, type ContentStatus } from "@/lib/library-utils";
import { shareTarget } from "@/lib/share-links";
import {
  buildChecklist,
  formatWhen,
  greeting,
  isProfileComplete,
  longDate,
  snippet,
  weekStrip,
} from "@/lib/dashboard-utils";
import { useBusinessContext } from "./BusinessContext";
import { Button, Callout, EmptyState, LinkButton, PlatformBadge, SectionCard, StatusPill, Tag, cx } from "./Ui";
import {
  IconAlert,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconImage,
  IconLibrary,
  IconRefresh,
  IconSparkles,
} from "./Icons";

interface UpcomingItem {
  id: string;
  platform: string | null;
  scheduled_at: string;
  text: string;
}

interface RecentContent {
  id: string;
  prompt: string;
  status: ContentStatus;
  created_at: string;
  text: string;
  hasVisual: boolean;
}

interface DashboardData {
  business: StoredBusiness;
  total: number;
  drafts: number;
  approved: number;
  thisMonth: number;
  visuals: number;
  planned: number;
  overdue: number;
  postedThisMonth: number;
  upcoming: UpcomingItem[];
  weekIsos: string[];
  recent: RecentContent[];
  loadedAt: Date;
}

async function loadDashboard(businessId: string): Promise<DashboardData> {
  const sb = getSupabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

  const contents = () => sb.from("contents").select("id", { count: "exact", head: true }).eq("business_id", businessId);
  const items = () => sb.from("calendar_items").select("id", { count: "exact", head: true }).eq("business_id", businessId);

  const [business, total, drafts, approved, thisMonth, visuals, planned, overdue, posted, upcoming, recent] =
    await Promise.all([
      businessStore.get(businessId),
      contents(),
      contents().eq("status", "draft"),
      contents().eq("status", "approved"),
      contents().gte("created_at", monthStart),
      contents().not("visual_url", "is", null),
      items(),
      items().eq("done", false).lt("scheduled_at", nowIso),
      items().eq("done", true).gte("scheduled_at", monthStart),
      sb
        .from("calendar_items")
        .select("id, platform, scheduled_at, contents(prompt, post_text, caption)")
        .eq("business_id", businessId)
        .eq("done", false)
        .lt("scheduled_at", weekEnd)
        .order("scheduled_at", { ascending: true })
        .limit(50),
      sb
        .from("contents")
        .select("id, prompt, status, created_at, post_text, caption, visual_url")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (!business) throw new Error("Marka bulunamadı.");
  const failed = [total, drafts, approved, thisMonth, visuals, planned, overdue, posted, upcoming, recent].find(
    (r) => r.error
  );
  if (failed?.error) throw new Error(failed.error.message);

  type Embedded = { prompt?: string; post_text?: string | null; caption?: string | null };
  const upcomingRows = ((upcoming.data ?? []) as unknown as Array<{
    id: string;
    platform: string | null;
    scheduled_at: string;
    contents: Embedded | Embedded[] | null;
  }>).map((row) => {
    const c = Array.isArray(row.contents) ? row.contents[0] : row.contents;
    return {
      id: row.id,
      platform: row.platform,
      scheduled_at: row.scheduled_at,
      text: snippet(c?.post_text || c?.caption || c?.prompt, 100),
    };
  });

  return {
    business,
    total: total.count ?? 0,
    drafts: drafts.count ?? 0,
    approved: approved.count ?? 0,
    thisMonth: thisMonth.count ?? 0,
    visuals: visuals.count ?? 0,
    planned: planned.count ?? 0,
    overdue: overdue.count ?? 0,
    postedThisMonth: posted.count ?? 0,
    upcoming: upcomingRows,
    weekIsos: upcomingRows.map((r) => r.scheduled_at),
    recent: ((recent.data ?? []) as unknown as Array<{
      id: string;
      prompt: string;
      status: ContentStatus;
      created_at: string;
      post_text: string | null;
      caption: string | null;
      visual_url: string | null;
    }>).map((r) => ({
      id: r.id,
      prompt: r.prompt,
      status: r.status,
      created_at: r.created_at,
      text: snippet(r.post_text || r.caption || r.prompt, 110),
      hasVisual: Boolean(r.visual_url),
    })),
    loadedAt: now,
  };
}

function Skeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Panel yükleniyor">
      <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-2xl bg-surface-2 lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface-2 lg:col-span-2" />
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  note,
  icon,
  tone = "neutral",
}: {
  href: string;
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
  tone?: "neutral" | "warn" | "ok" | "brand";
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    warn: "bg-warn-soft text-warn",
    ok: "bg-ok-soft text-ok",
    brand: "bg-brand-soft text-brand dark:text-brand-strong",
  } as const;
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong"
    >
      <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{note}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { activeBusinessId, isBusinessLoading, businessError } = useBusinessContext();
  if (isBusinessLoading) return <Skeleton />;
  if (businessError) {
    return <Callout tone="error">Markalar yüklenemedi. Sayfayı yenileyip tekrar deneyin.</Callout>;
  }
  if (!activeBusinessId) {
    return (
      <EmptyState
        icon={<IconBuilding className="h-5 w-5" />}
        title="Önce markanı tanıt"
        description="Yapay zekâ içerik üretmeden önce işletmeni, hedef kitleni ve marka sesini bilmeli. Birkaç dakikanı alır."
        action={
          <LinkButton href="/marka" variant="primary">
            Marka profilini oluştur
          </LinkButton>
        }
      />
    );
  }
  return <DashboardWorkspace key={activeBusinessId} businessId={activeBusinessId} />;
}

function DashboardWorkspace({ businessId }: { businessId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const load = useCallback(() => {
    return loadDashboard(businessId)
      .then((next) => {
        setData(next);
        setError(null);
      })
      .catch((err: Error) => setError("Panel yüklenemedi: " + err.message));
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    void load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function refresh() {
    setReloading(true);
    await load();
    setReloading(false);
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <Callout tone="error">{error}</Callout>
        <Button variant="secondary" onClick={refresh} disabled={reloading}>
          <IconRefresh className={reloading ? "animate-spin" : ""} /> Yeniden dene
        </Button>
      </div>
    );
  }
  if (!data) return <Skeleton />;

  const { business } = data;
  const now = data.loadedAt;
  const palette = readPalette(business.brand_colors, DEFAULT_RATIO);
  const strip = weekStrip(data.weekIsos, now);
  const stripMax = Math.max(1, ...strip.map((d) => d.count));
  const checklist = buildChecklist({
    profileComplete: isProfileComplete(business),
    contentCount: data.total,
    visualCount: data.visuals,
    plannedCount: data.planned,
  });
  const sevenDay = data.upcoming.filter((i) => new Date(i.scheduled_at).getTime() >= now.getTime()).length;
  const initial = business.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="space-y-5">
      {/* Karşılama */}
      <section
        className="relative overflow-hidden rounded-3xl border border-line p-5 shadow-soft sm:p-7"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${palette.primary} 16%, transparent), color-mix(in oklab, ${palette.secondary} 10%, transparent))`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            {business.logo_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_data_url}
                alt={`${business.name} logosu`}
                className="h-14 w-14 shrink-0 rounded-2xl border border-line bg-white object-contain p-1.5"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl font-bold"
                style={{ backgroundColor: palette.primary, color: palette.onPrimary }}
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium capitalize text-muted">{longDate(now)}</p>
              <h2 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {greeting(now)}, {business.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {business.industry && <Tag>{business.industry}</Tag>}
                <Tag tone="brand">Manuel paylaşım</Tag>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/uret" variant="primary">
              <IconSparkles /> İçerik üret
            </LinkButton>
            <LinkButton href="/gorsel" variant="secondary">
              <IconImage /> Görsel oluştur
            </LinkButton>
            <LinkButton href="/takvim" variant="ghost">
              <IconCalendar /> Takvim
            </LinkButton>
          </div>
        </div>
      </section>

      {error && <Callout tone="warning">{error}</Callout>}

      {data.overdue > 0 && (
        <Callout tone="warning">
          <p>
            <strong>{data.overdue} paylaşım</strong> zamanı geçti ve henüz “paylaşıldı” işaretlenmedi.{" "}
            <Link href="/takvim" className="font-semibold underline underline-offset-2">
              Takvime git →
            </Link>
          </p>
        </Callout>
      )}

      {/* Sayılar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          href="/kutuphane"
          label="Toplam içerik"
          value={data.total}
          note={`Bu ay ${data.thisMonth} yeni`}
          icon={<IconLibrary className="h-4.5 w-4.5" />}
          tone="brand"
        />
        <StatCard
          href="/kutuphane"
          label={STATUS_LABEL.draft}
          value={data.drafts}
          note="Onay bekliyor"
          icon={<IconClock className="h-4.5 w-4.5" />}
          tone="warn"
        />
        <StatCard
          href="/kutuphane"
          label={STATUS_LABEL.approved}
          value={data.approved}
          note="Paylaşıma hazır"
          icon={<IconCheck className="h-4.5 w-4.5" />}
          tone="ok"
        />
        <StatCard
          href="/takvim"
          label="Önümüzdeki 7 gün"
          value={sevenDay}
          note={`Bu ay ${data.postedThisMonth} paylaşıldı`}
          icon={<IconCalendar className="h-4.5 w-4.5" />}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        {/* Yaklaşan paylaşımlar */}
        <SectionCard
          className="lg:col-span-3"
          title="Yaklaşan paylaşımlar"
          description="Zamanı gelen veya geçmiş, henüz paylaşılmamış içerikler."
          aside={
            <LinkButton href="/takvim" variant="ghost" size="sm">
              Tümü
            </LinkButton>
          }
        >
          <div className="mb-4 grid grid-cols-7 gap-1.5" aria-label="Önümüzdeki 7 günün paylaşım yoğunluğu">
            {strip.map((day) => (
              <div key={day.key} className="flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-full items-end rounded-lg bg-surface-2 p-1">
                  <div
                    className={cx("w-full rounded-md transition-all", day.count > 0 ? "bg-brand" : "bg-line")}
                    style={{ height: `${day.count > 0 ? 20 + (day.count / stripMax) * 80 : 12}%` }}
                    title={`${day.count} paylaşım`}
                  />
                </div>
                <span className={cx("text-[10px] font-medium capitalize", day.isToday ? "text-brand dark:text-brand-strong" : "text-muted")}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>
          {data.upcoming.length === 0 ? (
            <EmptyState
              icon={<IconCalendar className="h-5 w-5" />}
              title="Planlı paylaşım yok"
              description="Bir içeriği takvime ekleyerek ne zaman paylaşacağını planla."
              action={
                <LinkButton href="/takvim" variant="soft" size="sm">
                  Takvimi aç
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.upcoming.slice(0, 5).map((item) => {
                const target = shareTarget(item.platform as never);
                const late = new Date(item.scheduled_at).getTime() < now.getTime();
                return (
                  <li key={item.id}>
                    <Link href="/takvim" className="flex items-center gap-3 py-3 transition hover:opacity-80">
                      {target ? (
                        <PlatformBadge initials={target.initials} color={target.color} label={target.label} className="h-8 w-8 rounded-xl text-xs" />
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                          <IconCalendar className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.text || "İçerik"}</span>
                        <span className={cx("flex items-center gap-1 text-xs", late ? "text-danger" : "text-muted")}>
                          {late && <IconAlert className="h-3 w-3" />}
                          {formatWhen(item.scheduled_at, now)}
                          {late && " · gecikti"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-5 lg:col-span-2">
          {checklist.percent < 100 && (
            <SectionCard title="Başlangıç listesi" description={`%${checklist.percent} tamamlandı`}>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={checklist.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Kurulum ilerlemesi">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${checklist.percent}%` }} />
              </div>
              <ul className="space-y-1.5">
                {checklist.steps.map((step) => (
                  <li key={step.id}>
                    <Link
                      href={step.href}
                      className={cx(
                        "flex items-start gap-3 rounded-xl px-2.5 py-2 transition hover:bg-surface-2",
                        step.done && "opacity-60"
                      )}
                    >
                      <span
                        className={cx(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                          step.done ? "border-ok bg-ok text-white" : "border-line-strong"
                        )}
                      >
                        {step.done && <IconCheck className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className={cx("block text-sm font-medium text-ink", step.done && "line-through")}>{step.label}</span>
                        {!step.done && <span className="block text-xs text-muted">{step.hint}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard
            title="Marka özeti"
            aside={
              <LinkButton href="/marka" variant="ghost" size="sm">
                Düzenle
              </LinkButton>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg border border-line" style={{ backgroundColor: palette.primary }} title="Ana renk" />
                <span className="h-7 w-7 rounded-lg border border-line" style={{ backgroundColor: palette.secondary }} title="Yardımcı renk" />
                <span className="ml-1 font-mono text-xs text-muted">
                  {palette.primary} · {palette.secondary}
                </span>
              </div>
              {business.brand_voice && <p className="text-sm text-ink-soft">{snippet(business.brand_voice, 110)}</p>}
              {business.social_accounts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {business.social_accounts.map((acc) => {
                    const t = shareTarget(acc.platform);
                    return (
                      <Tag key={acc.id ?? `${acc.platform}-${acc.handle}`}>
                        {t?.label ?? acc.platform} · {acc.handle}
                      </Tag>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">Sosyal hesap eklenmedi. Paylaşım hatırlatmaları için profilden ekleyebilirsin.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Son içerikler */}
      <SectionCard
        title="Son içerikler"
        aside={
          <LinkButton href="/kutuphane" variant="ghost" size="sm">
            Kütüphane
          </LinkButton>
        }
      >
        {data.recent.length === 0 ? (
          <EmptyState
            icon={<IconSparkles className="h-5 w-5" />}
            title="Henüz içerik yok"
            description="İlk içeriğini üret; marka profiline göre gönderi, açıklama, hashtag ve reklam metni hazırlanır."
            action={
              <LinkButton href="/uret" variant="primary" size="sm">
                İçerik üret
              </LinkButton>
            }
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.recent.map((c) => (
              <li key={c.id}>
                <Link
                  href="/kutuphane"
                  className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-strong hover:bg-surface-2"
                >
                  <span className="flex items-center justify-between gap-2">
                    <StatusPill status={c.status} />
                    {c.hasVisual && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <IconImage className="h-3 w-3" /> Görselli
                      </span>
                    )}
                  </span>
                  <span className="text-sm leading-relaxed text-ink-soft">{c.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={refresh} disabled={reloading}>
          <IconRefresh className={reloading ? "animate-spin" : ""} /> Yenile
        </Button>
      </div>
    </div>
  );
}
