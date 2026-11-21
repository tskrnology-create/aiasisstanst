"use client";

// Ana ekran: sohbet asistanı. Tek kutuya ne istediğini yaz; asistan içeriği üretir, fikir verir ve tek dokunuşla planlar.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { postApi } from "@/lib/api-client";
import { loadDashboard, type DashboardData } from "@/lib/dashboard-data";
import { greeting, nextAction } from "@/lib/dashboard-utils";
import { parseIntent } from "@/lib/assistant-intent";
import { PLATFORMS, type PlatformId } from "@/lib/content-kinds";
import { POST_FORMATS, type PostFormat } from "@/lib/post-formats";
import { upcomingSpecialDays } from "@/lib/special-days";
import { TONES } from "@/lib/tones";
import { TIME_SLOTS, atSlot, dayOptions, parseDayKey, scheduleContent, slotIsPast } from "@/lib/schedule";
import { contentsHref, studioHref } from "@/lib/routes";
import { MANUAL_SHARE_NOTE } from "@/lib/share-links";
import type { ContentIdea } from "@/lib/brand-prompt";
import { useBusinessContext } from "./BusinessContext";
import { MusicCard, PostChecklist, PostPackageCard, type GenMeta, type GeneratedRow } from "./PackageView";
import { CopyButton } from "./ShareControls";
import { Button, Chip, LinkButton, SectionCard, cx } from "./Ui";
import { IconArrowRight, IconCalendar, IconCheck, IconImage, IconSend, IconSparkles } from "./Icons";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; text: string; tone?: "error" }
  | { id: number; role: "ideas"; ideas: ContentIdea[] }
  | { id: number; role: "result"; row: GeneratedRow; meta: GenMeta; prompt: string; alt?: boolean };

const MAX_LEN = 500;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

function ResultBubble({
  message,
  businessId,
  initialDay,
  busy,
  onAnother,
}: {
  message: Extract<Message, { role: "result" }>;
  businessId: string;
  initialDay: string | null;
  busy: boolean;
  onAnother: (tone: string) => void;
}) {
  const { row, meta } = message;
  const [pickDay, setPickDay] = useState(Boolean(initialDay));
  const [planned, setPlanned] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const days = useMemo(() => dayOptions(now, 7), [now]);
  const [dayKeyValue, setDayKey] = useState(() => {
    const fromQuery = parseDayKey(initialDay);
    return days.find((d) => fromQuery && d.key === initialDay)?.key ?? days[0].key;
  });
  const platform = meta.platform || "instagram";
  const isVisualFormat = row.package?.format !== "metin";

  async function plan(slotId: string) {
    const day = days.find((d) => d.key === dayKeyValue);
    const slot = TIME_SLOTS.find((s) => s.id === slotId);
    if (!day || !slot) return;
    setPlanError(null);
    const result = await scheduleContent(getSupabase(), {
      businessId,
      contentId: row.id,
      platform,
      at: atSlot(day.date, slot),
    });
    if (result.ok) setPlanned(`${day.label} · ${slot.label}`);
    else setPlanError("Planlanamadı, tekrar deneyin.");
  }

  return (
    <div className="space-y-3">
      {row.package ? (
        <PostPackageCard row={row} pkg={row.package} headline={message.alt ? `Alternatif · ${row.tone}` : undefined} />
      ) : (
        <SectionCard title="Hazır içerik" aside={<CopyButton text={row.post_text ?? ""} label="Kopyala" />}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{row.post_text}</p>
        </SectionCard>
      )}
      <PostChecklist row={row} platform={meta.platform} />
      {(row.package?.format === "video" || row.package?.format === "hikaye") && <MusicCard meta={meta} />}

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        {planned ? (
          <p className="flex items-center gap-2 text-sm font-medium text-ok">
            <IconCheck className="h-4 w-4" />
            Planlandı: {planned}.{" "}
            <Link href="/hafta" className="underline">
              Haftaya bak
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => setPickDay((v) => !v)} aria-expanded={pickDay}>
                <IconCalendar className="h-4 w-4" />
                Planla
              </Button>
              {isVisualFormat && (
                <LinkButton size="sm" variant="secondary" href={studioHref({ step: "gorsel", contentId: row.id })}>
                  <IconImage className="h-4 w-4" />
                  Görsel hazırla
                </LinkButton>
              )}
              <LinkButton size="sm" variant="ghost" href={contentsHref({ contentId: row.id })}>
                Kütüphanede aç
              </LinkButton>
            </div>
            {pickDay && (
              <div className="space-y-2">
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Gün seç">
                  {days.map((d) => (
                    <Chip key={d.key} active={d.key === dayKeyValue} onClick={() => setDayKey(d.key)} className="shrink-0">
                      {d.label}
                    </Chip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saat seç">
                  {TIME_SLOTS.map((slot) => {
                    const day = days.find((d) => d.key === dayKeyValue)!;
                    return (
                      <Chip
                        key={slot.id}
                        disabled={slotIsPast(day.date, slot, new Date())}
                        onClick={() => plan(slot.id)}
                      >
                        {slot.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}
            {planError && <p role="alert" className="text-xs text-danger">{planError}</p>}
          </div>
        )}
      </div>

      {!message.alt && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Başka ton:</span>
          {TONES.map((t) => (
            <Chip key={t} disabled={busy} onClick={() => onAnother(t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-faint">{MANUAL_SHARE_NOTE}</p>
    </div>
  );
}

export default function Assistant() {
  const { activeBusinessId: businessId, isBusinessLoading } = useBusinessContext();
  const params = useSearchParams();
  const queryPrompt = params.get("prompt");
  const queryDay = params.get("gun");

  const [data, setData] = useState<DashboardData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState(() => (queryPrompt ?? "").slice(0, MAX_LEN));
  const [format, setFormat] = useState<PostFormat | "">("");
  const [platform, setPlatform] = useState<PlatformId | "">("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const [now] = useState(() => new Date());

  const refresh = useCallback(() => {
    if (!businessId) return;
    loadDashboard(businessId)
      .then(setData)
      .catch(() => setData(null));
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    if (!businessId) return;
    loadDashboard(businessId)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, busy]);

  const push = useCallback((m: DistributiveOmit<Message, "id">) => {
    idRef.current += 1;
    setMessages((list) => [...list, { ...m, id: idRef.current } as Message]);
  }, []);

  async function run(raw: string, opts: { tone?: string; parentId?: string } = {}) {
    const input = raw.trim();
    if (!input || busy) return;
    if (!businessId) {
      push({ role: "bot", text: "Önce bir marka seçmeniz ya da oluşturmanız gerekiyor.", tone: "error" });
      return;
    }
    const intent = parseIntent(input, { format: format || undefined, platform: platform || undefined });
    if (!opts.parentId) push({ role: "user", text: input });
    setText("");
    setBusy(true);
    try {
      if (intent.type === "week") {
        push({ role: "bot", text: "Haftanı birlikte planlayalım: önce fikirler, sonra gün gün yerleştirme." });
        const res = await postApi<{ ideas: ContentIdea[] }>("/api/ideas", { businessId });
        push({ role: "ideas", ideas: res.ideas });
      } else if (intent.type === "ideas") {
        const res = await postApi<{ ideas: ContentIdea[] }>("/api/ideas", { businessId });
        push({ role: "ideas", ideas: res.ideas });
      } else {
        const body = await postApi<{ content: GeneratedRow }>("/api/generate", {
          prompt: intent.prompt,
          businessId,
          tone: opts.tone || undefined,
          parentId: opts.parentId,
          kind: intent.kind,
          format: intent.format,
          platform: intent.platform,
        });
        push({
          role: "result",
          row: body.content,
          meta: { kind: intent.kind ?? "", platform: intent.platform ?? "", tone: opts.tone ?? "" },
          prompt: intent.prompt,
          alt: Boolean(opts.parentId),
        });
        refresh();
      }
    } catch (err) {
      push({ role: "bot", text: err instanceof Error ? err.message : "Bir sorun oluştu.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const specialDays = useMemo(() => upcomingSpecialDays(now, 30, 2), [now]);
  const next = data
    ? nextAction({
        overdue: data.overdue,
        total: data.total,
        drafts: data.drafts,
        approved: data.approved,
        upcoming7: data.upcoming.filter((i) => new Date(i.scheduled_at).getTime() >= now.getTime()).length,
      })
    : null;
  const name = data?.business.name;
  const hasChat = messages.length > 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="space-y-1 pt-1">
        <p className="text-sm text-muted">{greeting(now)}{name ? `, ${name}` : ""}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Bugün ne paylaşalım?</h1>
      </header>

      {!hasChat && (
        <div className="space-y-4 animate-fade">
          {next && next.id !== "create" && (
            <Link
              href={next.href}
              className={cx(
                "block rounded-2xl border p-4 transition hover:-translate-y-0.5",
                next.tone === "warn" ? "border-warn/30 bg-warn-soft" : "border-brand/25 bg-brand-soft"
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Sıradaki adım</p>
              <p className="mt-1 text-sm font-semibold text-ink">{next.title}</p>
              <p className="mt-0.5 text-xs text-muted">{next.description}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                {next.cta} <IconArrowRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Ne tür bir paylaşım?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POST_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(format === f.id ? "" : f.id)}
                  aria-pressed={format === f.id}
                  className={cx(
                    "rounded-2xl border p-3 text-left text-sm font-semibold transition",
                    format === f.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink hover:border-line-strong"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {specialDays.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">Yaklaşan özel günler</p>
              <div className="flex flex-wrap gap-1.5">
                {specialDays.map((d) => (
                  <Chip key={d.name} onClick={() => setText(d.prompt.slice(0, MAX_LEN))}>
                    {d.name} · {d.daysAway === 0 ? "bugün" : `${d.daysAway} gün`}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Chip onClick={() => run("Bana paylaşım fikirleri ver")} disabled={busy || !businessId}>
              <IconSparkles className="mr-1 inline h-3.5 w-3.5" />
              Fikir ver
            </Chip>
            <Chip onClick={() => run("Haftamı planla")} disabled={busy || !businessId}>
              <IconCalendar className="mr-1 inline h-3.5 w-3.5" />
              Haftamı planla
            </Chip>
          </div>
        </div>
      )}

      <section aria-label="Sohbet" aria-live="polite" className="space-y-4">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end animate-rise">
                <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-brand px-4 py-2.5 text-sm text-brand-ink">{m.text}</p>
              </div>
            );
          }
          if (m.role === "bot") {
            return (
              <p
                key={m.id}
                role={m.tone === "error" ? "alert" : undefined}
                className={cx(
                  "max-w-[90%] animate-rise rounded-3xl rounded-bl-lg border px-4 py-2.5 text-sm",
                  m.tone === "error" ? "border-danger/30 bg-danger-soft text-danger" : "border-line bg-surface text-ink"
                )}
              >
                {m.text}
              </p>
            );
          }
          if (m.role === "ideas") {
            return (
              <div key={m.id} className="space-y-2 animate-rise">
                <p className="text-sm text-muted">Birini seç, yazıya dönüştüreyim:</p>
                <ul className="grid gap-2">
                  {m.ideas.map((idea) => (
                    <li key={idea.title + idea.prompt}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(idea.prompt)}
                        className="w-full rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:border-brand hover:bg-brand-soft disabled:opacity-60"
                      >
                        <span className="block text-sm font-semibold text-ink">{idea.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{idea.prompt}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={m.id} className="animate-rise">
              {businessId && (
                <ResultBubble
                  message={m}
                  businessId={businessId}
                  initialDay={queryDay}
                  busy={busy}
                  onAnother={(tone) => run(m.prompt, { tone, parentId: m.row.id })}
                />
              )}
            </div>
          );
        })}
        {busy && (
          <p className="inline-flex animate-fade items-center gap-2 rounded-3xl rounded-bl-lg border border-line bg-surface px-4 py-2.5 text-sm text-muted">
            <IconSparkles className="h-4 w-4 animate-pulse text-brand" />
            Hazırlıyorum…
          </p>
        )}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(text);
        }}
        className="sticky bottom-24 z-30 space-y-2 rounded-3xl border border-line bg-surface p-2.5 shadow-pop md:bottom-4"
      >
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Platform">
          {PLATFORMS.map((p) => (
            <Chip
              key={p.id}
              active={platform === p.id}
              onClick={() => setPlatform(platform === p.id ? "" : p.id)}
              className="shrink-0 py-1 text-xs"
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Ne paylaşmak istiyorsun?
          </label>
          <textarea
            id="assistant-input"
            value={text}
            maxLength={MAX_LEN}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void run(text);
              }
            }}
            placeholder={
              format
                ? `${POST_FORMATS.find((f) => f.id === format)?.label} için konu yaz…`
                : "Örn: Hafta sonu %20 indirim için Instagram reels fikri"
            }
            className="min-h-[3rem] flex-1 resize-none rounded-2xl border-0 bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <button
            type="submit"
            disabled={busy || !text.trim() || isBusinessLoading}
            aria-label="Gönder"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-brand-ink transition active:scale-95 disabled:opacity-40"
          >
            <IconSend className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
