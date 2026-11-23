"use client";

// Oluştur: tek ekranda fikir → Instagram tarzı önizleme (otomatik markalı kapak) → düzenle → paylaş / planla.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import { loadImage, postApi } from "@/lib/api-client";
import { PLATFORMS, isPlatformId, type PlatformId } from "@/lib/content-kinds";
import { CREATE_KINDS, SLOTS, coverText, dayOptions, kindOf, shareText, slotAt } from "@/lib/create-flow";
import { formatsForPlatform, type PostFormat } from "@/lib/post-formats";
import { FORMATS, TEMPLATES, drawVisual, templateWantsPhoto, DEFAULT_PHOTO_TEMPLATE, type TemplateId } from "@/lib/visual-templates";
import { studioHref } from "@/lib/routes";
import type { ContentIdea } from "@/lib/brand-prompt";
import { useBusinessContext } from "./BusinessContext";
import { PackageEditor, type GeneratedRow } from "./PackageView";
import MusicPicker from "./MusicPicker";
import { CopyButton } from "./ShareControls";
import { Button, Callout, Chip, cx } from "./Ui";
import { IconCalendar, IconImage, IconSend, IconSparkles } from "./Icons";

const MAX_BRIEF = 500;

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Görsel hazırlanamadı."))), "image/png"));
}

export default function Create() {
  const { activeBusinessId: businessId } = useBusinessContext();
  const params = useSearchParams();
  const [biz, setBiz] = useState<StoredBusiness | null>(null);
  const [kindId, setKindId] = useState<PostFormat>("gonderi");
  const [platform, setPlatform] = useState<PlatformId>(() => {
    const p = params.get("platform");
    return isPlatformId(p) ? p : "instagram";
  });
  // Haftalık plandan gelindiyse (?slot=<yer tutucu içerik>) üretilen içerik o plan satırına bağlanır.
  const slotId = params.get("slot");
  const [brief, setBrief] = useState(() => (params.get("prompt") ?? "").slice(0, MAX_BRIEF));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [row, setRow] = useState<GeneratedRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [template, setTemplate] = useState<TemplateId>(CREATE_KINDS[0].template);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [savedVisual, setSavedVisual] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [planned, setPlanned] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const [dayKey, setDayKey] = useState(() => dayOptions(new Date(), 7)[0].key);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const days = useMemo(() => dayOptions(now, 7), [now]);

  const kind = kindOf(kindId);
  const pkg = row?.package ?? null;
  const allowed = formatsForPlatform(platform);

  useEffect(() => {
    let cancelled = false;
    if (!businessId) return;
    businessStore.get(businessId).then((b) => !cancelled && setBiz(b)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    const src = biz?.logo_data_url;
    if (!src) return;
    loadImage(src).then((img) => !cancelled && setLogo(img)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [biz?.logo_data_url]);

  // Kapak: yazı veya şablon/fotoğraf değiştikçe yeniden çizilir.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pkg || !kind.cover) return;
    const f = FORMATS[kind.cover];
    canvas.width = f.width;
    canvas.height = f.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { headline, subline } = coverText(pkg);
    drawVisual(ctx, {
      width: f.width,
      height: f.height,
      template,
      headline,
      subline,
      brandName: biz?.name ?? "",
      colors: biz?.brand_colors ?? [],
      logo: logo && biz?.logo_data_url ? logo : null,
      logoSize: logo ? { w: logo.naturalWidth, h: logo.naturalHeight } : undefined,
      background: photo,
      backgroundSize: photo ? { w: photo.naturalWidth, h: photo.naturalHeight } : undefined,
    });
  }, [pkg, kind.cover, template, photo, logo, biz]);

  function pickKind(id: PostFormat) {
    setKindId(id);
    setTemplate(kindOf(id).template);
  }

  function pickPlatform(id: PlatformId) {
    setPlatform(id);
    const ok = formatsForPlatform(id);
    if (!ok.includes(kindId)) pickKind(ok[0]);
  }

  async function generate(text = brief) {
    const prompt = text.trim();
    if (!prompt || busy || !businessId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPlanned(null);
    setSavedVisual(false);
    setEditing(false);
    try {
      const res = await postApi<{ content: GeneratedRow }>("/api/generate", { prompt, businessId, format: kindId, platform });
      if (slotId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slotId)) {
        const sb = getSupabase();
        const moved = await sb.from("calendar_items").update({ content_id: res.content.id }).eq("content_id", slotId);
        if (!moved.error) await sb.from("contents").delete().eq("id", slotId).is("post_text", null).is("visual_url", null);
      }
      setRow(res.content);
      setIdeas([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İçerik hazırlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function fetchIdeas() {
    if (busy || !businessId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postApi<{ ideas: ContentIdea[] }>("/api/ideas", { businessId });
      setIdeas(res.ideas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fikirler alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 6 * 1024 * 1024) {
      setError("Fotoğraf PNG, JPG veya WebP olmalı ve 6 MB'den küçük olmalı.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      setPhoto(img);
      setSavedVisual(false);
      setTemplate((t) => (templateWantsPhoto(t) ? t : DEFAULT_PHOTO_TEMPLATE));
      setError(null);
    } catch {
      setError("Fotoğraf okunamadı.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Kapağı özel depoya kaydeder ve bu içeriğe bağlar (bir kez). */
  const saveCover = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !kind.cover || !row || !businessId || !pkg || savedVisual) return;
    const blob = await canvasBlob(canvas);
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");
    const form = new FormData();
    form.append("image", blob, "kapak.png");
    form.append("businessId", businessId);
    form.append("contentId", row.id);
    form.append("prompt", brief.slice(0, 500) || "Kapak görseli");
    form.append("tone", row.tone ?? "");
    form.append("postText", row.post_text ?? "");
    form.append("caption", row.caption ?? "");
    form.append("hashtags", JSON.stringify(row.hashtags ?? []));
    form.append("adText", row.ad_text ?? "");
    form.append("storyText", row.story_text ?? "");
    const res = await fetch("/api/media/library", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: unknown };
      throw new Error(typeof body.error === "string" ? body.error : "Kapak kaydedilemedi.");
    }
    setSavedVisual(true);
  }, [kind.cover, row, businessId, pkg, savedVisual, brief]);

  async function share() {
    if (!pkg) return;
    setError(null);
    setNotice(null);
    const text = shareText(pkg);
    try {
      const canvas = canvasRef.current;
      const file = canvas && kind.cover ? new File([await canvasBlob(canvas)], "paylasim.png", { type: "image/png" }) : null;
      if (typeof navigator.share === "function" && (!file || navigator.canShare?.({ files: [file] }))) {
        await navigator.share(file ? { files: [file], text } : { text });
        setNotice("Paylaşım menüsü açıldı. Uygulamayı seçip paylaşımı tamamlayın.");
        return;
      }
      await navigator.clipboard?.writeText(text).catch(() => undefined);
      if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = "paylasim.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      setNotice("Metin kopyalandı" + (file ? " ve görsel indirildi" : "") + ". İlgili uygulamayı açıp yapıştırın.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Paylaşım menüsü açılamadı. Metni kopyalayıp elle paylaşabilirsiniz.");
    }
  }

  async function plan(slotIndex: number) {
    if (!row || !businessId || busy) return;
    const day = days.find((d) => d.key === dayKey);
    if (!day) return;
    const at = slotAt(day.date, SLOTS[slotIndex]);
    if (at.getTime() < now.getTime()) {
      setError("Bu saat geçmiş; başka bir saat seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (kind.cover) await saveCover();
      const { error: err } = await getSupabase().from("calendar_items").insert({
        business_id: businessId,
        content_id: row.id,
        social_account_id: null,
        platform,
        scheduled_at: at.toISOString(),
        remind_at: new Date(at.getTime() - 60 * 60 * 1000).toISOString(),
      });
      if (err) throw new Error("Planlanamadı, tekrar deneyin.");
      setPlanned(`${day.label} ${SLOTS[slotIndex].label}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Planlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  const brand = biz?.name || "Markan";
  const caption = pkg ? shareText(pkg) : "";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="space-y-1 pt-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Ne paylaşalım?</h1>
        <p className="text-sm text-muted">Fikrini yaz; yazıyı ve kapak görselini birlikte hazırlayayım.</p>
      </header>

      <section aria-label="Oluştur" className="space-y-3 rounded-3xl border border-line bg-surface p-3.5 shadow-soft">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Paylaşım türü">
          {CREATE_KINDS.map((k) => (
            <Chip key={k.id} active={kindId === k.id} disabled={!allowed.includes(k.id)} onClick={() => pickKind(k.id)} className="shrink-0">
              {k.label}
            </Chip>
          ))}
        </div>
        <label htmlFor="create-brief" className="sr-only">Ne paylaşmak istiyorsun?</label>
        <textarea
          id="create-brief"
          value={brief}
          maxLength={MAX_BRIEF}
          rows={3}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Örn. Hafta sonu ekran değişiminde %20 indirim"
          className="w-full resize-none rounded-2xl border-0 bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Platform">
          {PLATFORMS.map((p) => (
            <Chip key={p.id} active={platform === p.id} onClick={() => pickPlatform(p.id)} className="shrink-0 py-1 text-xs">
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={() => generate()} disabled={busy || !brief.trim() || !businessId}>
            <IconSparkles className="h-4 w-4" />
            {busy && !row ? "Hazırlanıyor…" : row ? "Yeniden hazırla" : "Hazırla"}
          </Button>
          <Button type="button" variant="secondary" onClick={fetchIdeas} disabled={busy || !businessId}>
            Fikir ver
          </Button>
        </div>
      </section>

      {error && <Callout tone="error">{error}</Callout>}
      {notice && <Callout tone="success">{notice}</Callout>}

      {ideas.length > 0 && (
        <ul className="space-y-2" aria-label="Fikirler">
          {ideas.map((idea) => (
            <li key={idea.title + idea.prompt}>
              <button
                type="button"
                onClick={() => {
                  setBrief(idea.prompt.slice(0, MAX_BRIEF));
                  setIdeas([]);
                  void generate(idea.prompt);
                }}
                className="w-full rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:border-brand"
              >
                <span className="block text-sm font-semibold text-ink">{idea.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{idea.prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pkg && row && (
        <section aria-label="Önizleme" className="space-y-4 animate-rise">
          {/* Instagram tarzı önizleme */}
          <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-pop">
            <header className="flex items-center gap-2.5 px-3.5 py-3">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink">
                {brand.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{brand}</p>
                <p className="text-[11px] text-muted">{kind.label} · {PLATFORMS.find((p) => p.id === platform)?.label}</p>
              </div>
            </header>
            {kind.cover && (
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={pkg.alt_text || "Kapak görseli önizlemesi"}
                className="block h-auto w-full bg-surface-2"
              />
            )}
            {pkg.format === "karusel" && pkg.slides.length > 1 && (
              <p className="px-3.5 pt-2 text-[11px] font-semibold text-muted">1 / {pkg.slides.length} slayt · diğer slaytlar metinde</p>
            )}
            <div className="space-y-2 px-3.5 py-3">
              {editing ? (
                <PackageEditor
                  rowId={row.id}
                  pkg={pkg}
                  onCancel={() => setEditing(false)}
                  onSaved={(next) => {
                    setRow({ ...row, package: next, post_text: next.hook ? `${next.hook}\n\n${next.body}\n\n${next.cta}`.trim() : next.body });
                    setSavedVisual(false);
                    setEditing(false);
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{caption}</p>
              )}
            </div>
          </article>

          {kind.cover && (
            <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-3.5">
              <p className="text-xs font-semibold text-muted">Kapak şablonu</p>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Kapak şablonu">
                {TEMPLATES.map((t) => (
                  <Chip key={t.id} active={template === t.id} onClick={() => { setTemplate(t.id); setSavedVisual(false); }} className="shrink-0 py-1 text-xs">
                    {t.label}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-2">
                  <IconImage className="h-4 w-4 text-muted" />
                  {photo ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} className="sr-only" aria-label="Fotoğraf seç" />
                </label>
                {photo && (
                  <button type="button" onClick={() => { setPhoto(null); setSavedVisual(false); }} className="text-xs font-semibold text-muted underline">
                    Kaldır
                  </button>
                )}
                <Link href={studioHref({ step: "gorsel", contentId: row.id })} className="ml-auto text-xs font-semibold text-brand">
                  Pixabay ve daha fazlası →
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={share} className="flex-1">
              <IconSend className="h-4 w-4" />
              Paylaş
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "Düzenlemeyi kapat" : "Düzenle"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPlan((v) => !v)} aria-expanded={showPlan}>
              <IconCalendar className="h-4 w-4" />
              Planla
            </Button>
            <CopyButton text={caption} label="Metni kopyala" />
          </div>

          {showPlan && (
            <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-3.5">
              {planned ? (
                <p className="text-sm font-semibold text-ok">
                  Planlandı: {planned}. <Link href="/hafta" className="underline">Haftaya bak</Link>
                </p>
              ) : (
                <>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Gün">
                    {days.map((d) => (
                      <Chip key={d.key} active={dayKey === d.key} onClick={() => setDayKey(d.key)} className="shrink-0">
                        {d.label}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saat">
                    {SLOTS.map((s, i) => (
                      <Chip key={s.id} disabled={busy} onClick={() => plan(i)}>
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                  <p className="text-[11px] text-faint">Seçtiğin saatten 1 saat önce hatırlatma kurulur.</p>
                </>
              )}
            </div>
          )}

          <MusicPicker kind={null} platform={platform} />
          <p className="text-[11px] leading-relaxed text-faint">
            Paylaş düğmesi telefonunun paylaşım menüsünü açar; görsel ve metin hazır gelir. Doğrudan otomatik yayın için hesap bağlama henüz kapalı.
          </p>
        </section>
      )}

      <p className={cx("text-center text-xs text-faint", pkg && "hidden")}>
        Daha fazla seçenek: <Link href="/studyo" className="font-semibold text-brand">Gelişmiş stüdyo</Link>
      </p>
    </div>
  );
}
