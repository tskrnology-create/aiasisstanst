"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { PLATFORM_LABELS, type SocialPlatform } from "@/lib/business-store";
import { STATUS_LABEL, type ContentStatus } from "@/lib/library-utils";
import { MANUAL_SHARE_NOTE, shareTarget } from "@/lib/share-links";
import {
  REMINDER_LABEL,
  normalizePostUrl,
  addDays,
  computeRemindAt,
  dayKey,
  endOfDay,
  formatDayLong,
  formatMonthTitle,
  formatTime,
  fromLocalInput,
  groupByDay,
  isOverdue,
  monthGrid,
  sameDay,
  shareText,
  startOfDay,
  toLocalInput,
  weekDays,
  type CalendarItem,
  type ReminderOption,
} from "@/lib/calendar-utils";
import {
  Button,
  Callout,
  IconButton,
  SectionCard,
  Segmented,
  StatusPill,
  Tag,
  cx,
  hintClass,
  inputClass,
  selectClass,
} from "./Ui";
import { CopyButton, OpenPlatformButton } from "./ShareControls";
import { useBusinessContext } from "./BusinessContext";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconExternal,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "./Icons";

const SELECT_ITEM = "*, contents(prompt, tone, post_text, caption, hashtags, status)";
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface PickerContent {
  id: string;
  prompt: string;
  tone: string | null;
  status: ContentStatus;
}

interface CalendarSocialAccount {
  id: string;
  platform: SocialPlatform;
  handle: string;
}

// PostgREST filtresinde milisaniyesiz ISO kullanılır.
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function ItemRow({
  item,
  showDate,
  accounts,
  onChanged,
}: {
  item: CalendarItem;
  showDate?: boolean;
  accounts: CalendarSocialAccount[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [markingPosted, setMarkingPosted] = useState(false);
  const [postUrl, setPostUrl] = useState(item.post_url ?? "");
  const [when, setWhen] = useState(toLocalInput(new Date(item.scheduled_at)));

  const scheduled = new Date(item.scheduled_at);
  const overdue = isOverdue(item, new Date());
  const c = item.contents;
  const account = accounts.find((entry) => entry.id === item.social_account_id);
  const target = shareTarget(item.platform);
  const postedUrl = item.post_url ? normalizePostUrl(item.post_url) : null;
  const text = shareText(c);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error: err } = await action();
    setBusy(false);
    if (err) {
      setError(err.message);
      return false;
    }
    onChanged();
    return true;
  }

  async function saveTime() {
    const next = fromLocalInput(when);
    if (!next) {
      setError("Geçerli bir tarih ve saat girin.");
      return;
    }
    // Hatırlatma varsa aynı farkla kaydır.
    let remind = item.remind_at;
    if (remind) {
      const delta = next.getTime() - scheduled.getTime();
      remind = new Date(new Date(remind).getTime() + delta).toISOString();
    }
    const ok = await run(() =>
      getSupabase()
        .from("calendar_items")
        .update({ scheduled_at: next.toISOString(), remind_at: remind })
        .eq("id", item.id)
        .eq("business_id", item.business_id)
    );
    if (ok) setEditing(false);
  }

  async function markPosted(event: React.FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizePostUrl(postUrl);
    if (normalizedUrl === undefined) {
      setError("Gönderi bağlantısı http:// veya https:// ile başlamalıdır.");
      return;
    }
    const ok = await run(() =>
      getSupabase()
        .from("calendar_items")
        .update({ done: true, posted_at: new Date().toISOString(), post_url: normalizedUrl })
        .eq("id", item.id)
        .eq("business_id", item.business_id)
    );
    if (ok) setMarkingPosted(false);
  }

  return (
    <li
      className={cx(
        "rounded-2xl border bg-surface p-4 shadow-soft transition",
        overdue ? "border-danger/40" : "border-line",
        item.done && "opacity-70"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 font-mono text-[11px] font-medium text-ink-soft">
          <IconClock className="h-3.5 w-3.5 text-muted" />
          {showDate &&
            `${scheduled.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} · `}
          {formatTime(item.scheduled_at)}
        </span>
        {target ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: target.color }}
            />
            {target.label}
          </span>
        ) : (
          <span className="font-medium text-faint">Platform seçilmedi</span>
        )}
        {account && <span className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-soft">{account.handle}</span>}
        {c && <StatusPill status={c.status} />}
        {item.done && (
          <Tag tone="ok">
            <IconCheck className="h-3 w-3" />
            Paylaşıldı
          </Tag>
        )}
        {overdue && <Tag tone="danger">Gecikmiş</Tag>}
        {item.done && item.posted_at && (
          <span className="text-[11px] text-muted">Gerçekleşti: {new Date(item.posted_at).toLocaleString("tr-TR")}</span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {c ? c.post_text || c.prompt : "İçerik bulunamadı"}
      </p>
      {c && c.hashtags.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-brand dark:text-brand-strong">
          {c.hashtags.join(" ")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <CopyButton text={text} label="Paylaşım metnini kopyala" />
        <OpenPlatformButton platform={item.platform} />
        <Button
          type="button"
          variant={item.done ? "ghost" : "soft"}
          size="sm"
          disabled={busy}
          onClick={() => {
            if (!item.done) {
              setPostUrl(item.post_url ?? "");
              setMarkingPosted((open) => !open);
              return;
            }
            run(() => getSupabase()
              .from("calendar_items")
              .update({ done: false, posted_at: null, post_url: null })
              .eq("id", item.id)
              .eq("business_id", item.business_id));
          }}
        >
          {item.done ? <IconRefresh /> : <IconCheck />}
          {item.done ? "Geri al" : "Paylaşıldı"}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setEditing((e) => !e)}>
          <IconClock />
          Saat
        </Button>
        {c && (
          <Link
            href={`/uret?prompt=${encodeURIComponent(c.prompt)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <IconExternal className="h-3.5 w-3.5" />
            Yeniden üret
          </Link>
        )}
        <button
          type="button"
          disabled={busy}
          aria-label="Plandan kaldır"
          title="Plandan kaldır"
          onClick={() => {
            if (!window.confirm("Bu plan takvimden kaldırılsın mı? (İçerik kütüphanede kalır.)")) return;
            run(() => getSupabase().from("calendar_items").delete().eq("id", item.id).eq("business_id", item.business_id));
          }}
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
        >
          <IconTrash />
        </button>
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2/70 p-2.5">
          <select
            aria-label="Hedef sosyal hesap"
            className={cx(selectClass, "w-auto min-w-[13rem] flex-1 py-2")}
            value={item.social_account_id ?? ""}
            disabled={busy}
            onChange={(event) => {
              const nextAccount = accounts.find((entry) => entry.id === event.target.value);
              run(() => getSupabase()
                .from("calendar_items")
                .update({
                  social_account_id: nextAccount?.id ?? null,
                  platform: nextAccount?.platform ?? item.platform,
                })
                .eq("id", item.id)
                .eq("business_id", item.business_id));
            }}
          >
            <option value="">Platform geneli / hesap yok</option>
            {accounts.map((entry) => (
              <option key={entry.id} value={entry.id}>{PLATFORM_LABELS[entry.platform]} · {entry.handle}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            className={cx(inputClass, "w-auto min-w-[14rem] flex-1 py-2")}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="Yeni tarih ve saat"
          />
          <Button type="button" size="sm" disabled={busy} onClick={saveTime}>
            Kaydet
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Vazgeç
          </Button>
        </div>
      )}
      {markingPosted && (
        <form onSubmit={markPosted} className="mt-3 space-y-2 rounded-xl border border-ok/25 bg-ok-soft/30 p-3">
          <p className="text-xs font-semibold text-ink">Manuel paylaşımı kaydet</p>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Yayınlanan gönderinin bağlantısı (isteğe bağlı)</span>
            <input
              type="url"
              className={inputClass}
              value={postUrl}
              onChange={(event) => setPostUrl(event.target.value)}
              placeholder="https://…"
              aria-label="Yayınlanan gönderinin bağlantısı"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy}><IconCheck />Paylaşımı kaydet</Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setMarkingPosted(false)}>Vazgeç</Button>
          </div>
        </form>
      )}
      {item.done && postedUrl && (
        <a href={postedUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-medium text-brand hover:underline">
          Yayınlanan gönderiyi aç ↗
        </a>
      )}
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      {target?.hint && (
        <p className={cx(hintClass, "mt-2")}>{target.hint}</p>
      )}
    </li>
  );
}

function AddForm({
  day,
  businessId,
  contents,
  accounts,
  onAdded,
}: {
  day: Date;
  businessId: string;
  contents: PickerContent[];
  accounts: CalendarSocialAccount[];
  onAdded: () => void;
}) {
  const [contentId, setContentId] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [socialAccountId, setSocialAccountId] = useState("");
  const [time, setTime] = useState("10:00");
  const [reminder, setReminder] = useState<ReminderOption>("1h");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contentId) {
      setError("Bir içerik seçin.");
      return;
    }
    const scheduled = fromLocalInput(`${dayKey(day)}T${time}`);
    if (!scheduled) {
      setError("Geçerli bir saat girin.");
      return;
    }
    setBusy(true);
    const { error: err } = await getSupabase().from("calendar_items").insert({
      business_id: businessId,
      content_id: contentId,
      social_account_id: socialAccountId || null,
      platform: accounts.find((account) => account.id === socialAccountId)?.platform ?? platform,
      scheduled_at: scheduled.toISOString(),
      remind_at: computeRemindAt(scheduled, reminder),
    });
    setBusy(false);
    if (err) {
      setError("Eklenemedi: " + err.message);
      return;
    }
    setContentId("");
    onAdded();
  }

  if (contents.length === 0) {
    return (
      <Callout tone="warning">
        Takvime eklenecek içerik yok.{" "}
        <Link href="/uret" className="font-semibold underline underline-offset-2">
          Önce içerik üretin →
        </Link>
      </Callout>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="cal-content" className="text-sm font-medium text-ink">
          İçerik
        </label>
        <select
          id="cal-content"
          className={selectClass}
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
        >
          <option value="">İçerik seçin…</option>
          {contents.map((c) => (
            <option key={c.id} value={c.id}>
              [{STATUS_LABEL[c.status]}] {c.prompt.slice(0, 60)}
              {c.tone ? ` · ${c.tone}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cal-platform" className="text-sm font-medium text-ink">
            Platform
          </label>
          <select
            id="cal-platform"
            className={selectClass}
            value={platform}
            onChange={(e) => {
              const nextPlatform = e.target.value as SocialPlatform;
              setPlatform(nextPlatform);
              if (accounts.find((account) => account.id === socialAccountId)?.platform !== nextPlatform) {
                setSocialAccountId("");
              }
            }}
          >
            {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cal-account" className="text-sm font-medium text-ink">Hedef hesap (isteğe bağlı)</label>
          <select
            id="cal-account"
            className={selectClass}
            value={socialAccountId}
            onChange={(event) => {
              const nextAccount = accounts.find((account) => account.id === event.target.value);
              setSocialAccountId(nextAccount?.id ?? "");
              if (nextAccount) setPlatform(nextAccount.platform);
            }}
          >
            <option value="">Hesap seçin…</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{PLATFORM_LABELS[account.platform]} · {account.handle}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cal-time" className="text-sm font-medium text-ink">
            Saat
          </label>
          <input
            id="cal-time"
            type="time"
            className={inputClass}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cal-reminder" className="text-sm font-medium text-ink">
            Hatırlatma
          </label>
          <select
            id="cal-reminder"
            className={selectClass}
            value={reminder}
            onChange={(e) => setReminder(e.target.value as ReminderOption)}
          >
            {(Object.keys(REMINDER_LABEL) as ReminderOption[]).map((o) => (
              <option key={o} value={o}>
                {REMINDER_LABEL[o]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {accounts.length === 0 && (
        <p className={hintClass}>Bu markaya bağlı sosyal hesap yok. İsterseniz platform seçimini kullanabilir veya marka profilinden hesap ekleyebilirsiniz.</p>
      )}

      {error && <Callout tone="error">{error}</Callout>}

      <Button type="submit" disabled={busy} className="w-full">
        <IconPlus />
        {busy ? "Ekleniyor…" : `${formatDayLong(day)} gününe ekle`}
      </Button>
    </form>
  );
}

export default function Calendar() {
  const { activeBusinessId, isBusinessLoading } = useBusinessContext();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(today);
  const [selected, setSelected] = useState<Date>(today);
  const [loadedBusinessId, setLoadedBusinessId] = useState<string | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [attention, setAttention] = useState<CalendarItem[]>([]);
  const [contents, setContents] = useState<PickerContent[]>([]);
  const [accounts, setAccounts] = useState<CalendarSocialAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const rangeFrom = grid[0];
  const rangeTo = addDays(grid[41], 1);
  const rangeKey = dayKey(rangeFrom);

  // Bütün takvim verileri aynı business_id ile yüklenir ve marka değişiminde iptal edilir.
  useEffect(() => {
    if (isBusinessLoading || !activeBusinessId) return;
    let cancelled = false;
    const supabase = getSupabase();
    const now = new Date();
    Promise.all([
      supabase
        .from("social_accounts")
        .select("id, platform, handle")
        .eq("business_id", activeBusinessId)
        .order("created_at", { ascending: true }),
      supabase
        .from("contents")
        .select("id, prompt, tone, status")
        .eq("business_id", activeBusinessId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("calendar_items")
        .select(SELECT_ITEM)
        .eq("business_id", activeBusinessId)
        .gte("scheduled_at", iso(rangeFrom))
        .lt("scheduled_at", iso(rangeTo))
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("calendar_items")
        .select(SELECT_ITEM)
        .eq("business_id", activeBusinessId)
        .eq("done", false)
        .or(`scheduled_at.lt.${iso(endOfDay(now))},remind_at.lte.${iso(now)}`)
        .order("scheduled_at", { ascending: true })
        .limit(50),
    ]).then(([social, cont, range, att]) => {
      if (cancelled) return;
      const loadError = social.error ?? cont.error ?? range.error ?? att.error;
      setError(loadError ? `Takvim verileri yüklenemedi: ${loadError.message}` : null);
      setAccounts((social.data ?? []) as CalendarSocialAccount[]);
      setContents((cont.data ?? []) as PickerContent[]);
      setItems((range.data ?? []) as unknown as CalendarItem[]);
      setAttention((att.data ?? []) as unknown as CalendarItem[]);
      setLoadedBusinessId(activeBusinessId);
    }).catch((cause) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "Takvim verileri yüklenemedi.");
        setLoadedBusinessId(activeBusinessId);
      }
    });
    return () => { cancelled = true; };
  }, [activeBusinessId, isBusinessLoading, rangeKey, rangeFrom, rangeTo, version]);

  const dataReady = !isBusinessLoading && loadedBusinessId === activeBusinessId;
  const visibleAttention = dataReady ? attention : [];
  const visibleContents = dataReady ? contents : [];
  const visibleAccounts = dataReady ? accounts : [];
  const byDay = useMemo(() => groupByDay(dataReady ? items : []), [dataReady, items]);
  const reload = () => setVersion((v) => v + 1);

  function move(delta: number) {
    setCursor((c) =>
      view === "month"
        ? new Date(c.getFullYear(), c.getMonth() + delta, 1)
        : addDays(c, delta * 7)
    );
  }

  function selectDay(d: Date) {
    setSelected(d);
    if (view === "month" && d.getMonth() !== cursor.getMonth()) setCursor(d);
  }

  if (isBusinessLoading || (activeBusinessId && !dataReady)) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
        Takvim yükleniyor…
      </div>
    );
  }

  if (!activeBusinessId) {
    return (
      <Callout tone="warning">
        Takvimi kullanmak için önce{" "}
        <Link href="/" className="font-semibold underline underline-offset-2">
          işletme profilinizi kaydedin →
        </Link>
      </Callout>
    );
  }

  const selectedItems = byDay.get(dayKey(selected)) ?? [];
  const week = weekDays(cursor);
  const title =
    view === "month"
      ? formatMonthTitle(cursor)
      : `${week[0].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${week[6].toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-5">
      {error && <Callout tone="error">{error}</Callout>}

      {visibleAttention.length > 0 && (
        <SectionCard
          step="Öncelik"
          title="Paylaşım bekleyenler"
          description="Bugün paylaşılacaklar, gecikenler ve hatırlatma zamanı gelenler."
          aside={<Tag tone="danger">{visibleAttention.length} iş</Tag>}
        >
          <ul className="space-y-3">
            {visibleAttention.map((item) => (
              <ItemRow key={item.id} item={item} accounts={visibleAccounts} showDate onChanged={reload} />
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title={title}
        description={view === "month" ? "Ay görünümü · Pazartesi ile başlar" : "Hafta görünümü"}
        className="capitalize"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <IconButton label="Önceki" onClick={() => move(-1)}>
                <IconArrowLeft />
              </IconButton>
              <IconButton label="Sonraki" onClick={() => move(1)}>
                <IconArrowRight />
              </IconButton>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCursor(today);
                  setSelected(today);
                }}
              >
                Bugün
              </Button>
            </div>
            <Segmented
              ariaLabel="Görünüm"
              value={view}
              onChange={setView}
              options={[
                { value: "month", label: "Ay" },
                { value: "week", label: "Hafta" },
              ]}
            />
          </div>
        }
      >
        {view === "month" ? (
          <div>
            <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-faint">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d) => {
                const list = byDay.get(dayKey(d)) ?? [];
                const inMonth = d.getMonth() === cursor.getMonth();
                const isSel = sameDay(d, selected);
                const hasOverdue = list.some((i) => isOverdue(i, new Date()));
                const isToday = sameDay(d, today);
                return (
                  <button
                    key={dayKey(d)}
                    type="button"
                    onClick={() => selectDay(d)}
                    aria-label={`${formatDayLong(d)}, ${list.length} plan`}
                    aria-pressed={isSel}
                    className={cx(
                      "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition",
                      isSel
                        ? "border-brand bg-brand text-brand-ink shadow-[0_10px_24px_-14px_var(--brand)]"
                        : "border-transparent hover:border-line hover:bg-surface-2",
                      !inMonth && !isSel && "opacity-35",
                      isToday && !isSel && "border-line-strong font-bold"
                    )}
                  >
                    <span>{d.getDate()}</span>
                    {list.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {hasOverdue && (
                          <span className={cx("h-1.5 w-1.5 rounded-full", isSel ? "bg-white" : "bg-danger")} />
                        )}
                        {list.slice(0, 3).map((i) => (
                          <span
                            key={i.id}
                            className={cx(
                              "h-1.5 w-1.5 rounded-full",
                              isSel ? "bg-white/80" : i.done ? "bg-ok" : "bg-brand"
                            )}
                          />
                        ))}
                        {list.length > 3 && (
                          <span className={cx("text-[9px] font-semibold", isSel ? "text-white/80" : "text-muted")}>
                            +{list.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Planlı
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Paylaşıldı
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Gecikmiş
              </span>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {week.map((d) => {
              const list = byDay.get(dayKey(d)) ?? [];
              return (
                <div
                  key={dayKey(d)}
                  className={cx(
                    "space-y-2 rounded-xl border p-3",
                    sameDay(d, selected) ? "border-brand bg-brand-soft/40" : "border-line bg-surface-2/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectDay(d)}
                    aria-pressed={sameDay(d, selected)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold capitalize text-ink"
                  >
                    {formatDayLong(d)}
                    {sameDay(d, today) && <Tag tone="brand">bugün</Tag>}
                    {list.length > 0 && <span className="text-xs font-normal text-muted">{list.length} plan</span>}
                  </button>
                  {list.length === 0 ? (
                    <p className="text-xs text-faint">Plan yok.</p>
                  ) : (
                    <ul className="space-y-2">
                      {list.map((item) => (
                        <ItemRow key={item.id} item={item} accounts={visibleAccounts} onChanged={reload} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          step="Seçili gün"
          title={formatDayLong(selected)}
          description={`${selectedItems.length} plan`}
          className="capitalize"
        >
          {view === "month" &&
            (selectedItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
                Bu gün için plan yok. Sağdaki formdan içerik ekleyin.
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedItems.map((item) => (
                  <ItemRow key={item.id} item={item} accounts={visibleAccounts} onChanged={reload} />
                ))}
              </ul>
            ))}
        </SectionCard>

        <SectionCard step="Planla" title="Bu güne içerik ekle">
          <AddForm key={`${activeBusinessId}:${dayKey(selected)}`} day={selected} businessId={activeBusinessId} contents={visibleContents} accounts={visibleAccounts} onAdded={reload} />
        </SectionCard>
      </div>

      <Callout tone="info">{MANUAL_SHARE_NOTE}</Callout>
    </div>
  );
}
