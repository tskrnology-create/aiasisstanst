"use client";

// Hafta: 7 günlük plan şeridi. Güne dokun, o günün paylaşımlarını gör; boş günde asistanı aç.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { loadDashboard, type DashboardData } from "@/lib/dashboard-data";
import { weekStrip } from "@/lib/dashboard-utils";
import { addDays, dayKey, normalizePostUrl, startOfDay } from "@/lib/calendar-utils";
import { modeHref } from "@/lib/routes";
import { postApi } from "@/lib/api-client";
import { PLAN_SLOTS, type PlanItem } from "@/lib/plan-prompt";
import { businessStore } from "@/lib/business-store";
import { useBusinessContext } from "./BusinessContext";
import { Button, Callout, Chip, EmptyState, LinkButton, SectionCard, Tag, cx } from "./Ui";
import { IconCheck, IconPlus, IconSparkles } from "./Icons";

export default function Week() {
  const { activeBusinessId: businessId } = useBusinessContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadedBusinessId, setLoadedBusinessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorBusinessId, setErrorBusinessId] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const requestSequence = useRef(0);

  const load = useCallback(() => {
    if (!businessId) return Promise.resolve();
    const requestId = ++requestSequence.current;
    return loadDashboard(businessId)
      .then((result) => {
        if (requestSequence.current !== requestId) return;
        setData(result);
        setLoadedBusinessId(businessId);
        setError(null);
        setErrorBusinessId(null);
      })
      .catch(() => {
        if (requestSequence.current !== requestId) return;
        setError("Hafta yüklenemedi.");
        setErrorBusinessId(businessId);
        setLoadedBusinessId(businessId);
      });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [businessId, load]);

  const currentData = loadedBusinessId === businessId ? data : null;
  const currentError = errorBusinessId === businessId ? error : null;
  const loading = Boolean(businessId && !currentData && !currentError);
  const strip = useMemo(() => weekStrip(currentData?.weekIsos ?? [], now), [currentData, now]);
  const day = startOfDay(addDays(now, selected));
  const items = (currentData?.upcoming ?? []).filter((i) => dayKey(new Date(i.scheduled_at)) === dayKey(day));
  const overdue = (currentData?.upcoming ?? []).filter((i) => new Date(i.scheduled_at) < startOfDay(now));

  const [proposal, setProposal] = useState<PlanItem[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [perWeek, setPerWeek] = useState(5);
  const [planning, setPlanning] = useState(false);
  const [adding, setAdding] = useState(false);

  async function propose() {
    if (!businessId || planning) return;
    setPlanning(true);
    setError(null);
    try {
      const res = await postApi<{ items: PlanItem[] }>("/api/plan", { businessId, perWeek });
      setProposal(res.items);
      setPicked(new Set(res.items.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan hazırlanamadı.");
    } finally {
      setPlanning(false);
    }
  }

  async function addPlan() {
    if (!businessId || !proposal || adding) return;
    setAdding(true);
    setError(null);
    try {
      const biz = await businessStore.get(businessId);
      if (!biz) throw new Error("Marka bulunamadı.");
      const sb = getSupabase();
      for (const [i, item] of proposal.entries()) {
        if (!picked.has(i)) continue;
        const slot = PLAN_SLOTS[item.slot];
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + item.day, slot.hour, slot.minute);
        const content = await sb
          .from("contents")
          .insert({ business_id: businessId, prompt: `${item.title}: ${item.prompt}`.slice(0, 500), language: biz.content_language, status: "draft" })
          .select("id")
          .single();
        if (content.error || !content.data) throw new Error("Plan kaydedilemedi.");
        const cal = await sb.from("calendar_items").insert({
          business_id: businessId,
          content_id: content.data.id,
          social_account_id: null,
          platform: item.platform,
          scheduled_at: at.toISOString(),
          remind_at: new Date(at.getTime() - 60 * 60 * 1000).toISOString(),
        });
        if (cal.error) {
          await sb.from("contents").delete().eq("id", content.data.id);
          throw new Error("Plan kaydedilemedi.");
        }
      }
      setProposal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan kaydedilemedi.");
    } finally {
      setAdding(false);
    }
  }

  async function markDone(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const normalizedUrl = normalizePostUrl(postUrl);
    if (normalizedUrl === undefined) {
      setError("Gönderi bağlantısı http:// veya https:// ile başlamalıdır.");
      return;
    }
    if (!businessId) return;
    setSavingId(id);
    const { error: err } = await getSupabase().from("calendar_items")
      .update({ done: true, posted_at: new Date().toISOString(), post_url: normalizedUrl })
      .eq("id", id)
      .eq("business_id", businessId);
    setSavingId(null);
    if (err) setError("Paylaşım kaydedilemedi. Tekrar deneyin.");
    else {
      setConfirmingId(null);
      setPostUrl("");
      void load();
    }
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (!businessId) return <EmptyState title="Önce bir marka seçin" description="Hafta planı seçili markaya göre gösterilir." />;
  if (loading || (!currentData && !error)) return <Callout tone="info">Hafta planı yükleniyor…</Callout>;
  if (currentError) return <Callout tone="error">{currentError} <button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Yeniden dene</button></Callout>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm text-muted">Önümüzdeki 7 gün</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Haftam</h1>
      </header>

      {error && errorBusinessId !== businessId && <Callout tone="error">{error}</Callout>}

      {!proposal ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand/25 bg-brand-soft p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Haftayı tek tıkla planla</p>
            <p className="text-xs text-muted">Konuları dengeler, günlere dağıtır. Sonra her fikri tek dokunuşla yazdırırsın.</p>
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Haftalık paylaşım sayısı">
            {[3, 5, 7].map((n) => (
              <Chip key={n} active={perWeek === n} onClick={() => setPerWeek(n)}>{n}</Chip>
            ))}
          </div>
          <Button type="button" size="sm" onClick={propose} disabled={planning}>
            <IconSparkles className="h-4 w-4" />
            {planning ? "Hazırlanıyor…" : "Planla"}
          </Button>
        </div>
      ) : (
        <SectionCard title="Önerilen hafta" description="İstemediğini çıkar, kalanı takvime ekle.">
          <ul className="space-y-2">
            {proposal.map((item, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-2/60 p-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-brand"
                    checked={picked.has(i)}
                    onChange={(e) =>
                      setPicked((cur) => {
                        const next = new Set(cur);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block text-[11px] font-semibold text-muted">
                      {addDays(startOfDay(now), item.day).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "short" })} · {PLAN_SLOTS[item.slot].label} · {item.platform} · {item.pillar}
                    </span>
                    <span className="block font-semibold text-ink">{item.title}</span>
                    <span className="block text-xs text-muted">{item.prompt}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={addPlan} disabled={adding || picked.size === 0}>
              {adding ? "Ekleniyor…" : `${picked.size} paylaşımı takvime ekle`}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setProposal(null)} disabled={adding}>Vazgeç</Button>
          </div>
        </SectionCard>
      )}

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
            <p className="mt-1.5 text-sm text-ink">{item.ready ? item.text : `Fikir: ${item.prompt}`}</p>
            {!item.ready && <p className="mt-1 text-[11px] font-semibold text-warn">Henüz yazılmadı</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {!item.ready && (
                <LinkButton
                  size="sm"
                  variant="primary"
                  href={modeHref("metin", { prompt: item.prompt.slice(0, 500) }) + `&slot=${item.contentId}${item.platform ? `&platform=${item.platform}` : ""}`}
                >
                  <IconSparkles className="h-4 w-4" /> Hazırla
                </LinkButton>
              )}
              <Button size="sm" variant="secondary" onClick={() => { setConfirmingId(item.id); setPostUrl(""); }} disabled={!item.ready}>
                <IconCheck className="h-4 w-4" /> Paylaşıldı
              </Button>
            </div>
            {confirmingId === item.id && (
              <form onSubmit={(event) => markDone(event, item.id)} className="mt-3 space-y-2 rounded-xl border border-ok/25 bg-ok-soft/30 p-3">
                <p className="text-xs font-semibold text-ink">Yayını gerçekten sosyal platformda yaptıysan kaydet.</p>
                <label className="block space-y-1 text-xs text-muted">
                  <span>Gönderi bağlantısı (isteğe bağlı)</span>
                  <input type="url" value={postUrl} onChange={(event) => setPostUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink" />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={savingId === item.id}>{savingId === item.id ? "Kaydediliyor…" : "Manuel paylaşımı kaydet"}</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>Vazgeç</Button>
                </div>
              </form>
            )}
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
