"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import { STATUS_LABEL, type ContentRow } from "@/lib/library-utils";
import {
  FORMATS,
  TEMPLATES,
  TEMPLATE_USAGE,
  drawVisual,
  type FormatId,
  type TemplateId,
} from "@/lib/visual-templates";
import {
  DEFAULT_RATIO,
  MAX_PRIMARY_SHARE,
  MIN_PRIMARY_SHARE,
  percent,
  readPalette,
  type RatioId,
} from "@/lib/brand-palette";
import {
  Button,
  Callout,
  Chip,
  LinkButton,
  StatusPill,
  Tag,
  cx,
  hintClass,
  inputClass,
  selectClass,
} from "./Ui";
import { IconDownload, IconImage, IconLibrary, IconRefresh, IconSparkles, IconWand } from "./Icons";

type TextSource = "post_text" | "ad_text" | "story_text" | "caption";
type Style = "photo" | "illustration" | "abstract";

const SOURCE_LABEL: Record<TextSource, string> = {
  post_text: "Gönderi metni",
  ad_text: "Reklam metni",
  story_text: "Hikâye metni",
  caption: "Açıklama (caption)",
};
const STYLE_LABEL: Record<Style, string> = {
  photo: "Fotoğraf",
  illustration: "İllüstrasyon",
  abstract: "Soyut / minimal",
};

const TOOLBAR_TEMPLATE_IDS: TemplateId[] = ["gradyan", "serit", "cerceve", "fotograf", "diyagonal", "editorial"];

const MAX_HEADLINE = 160;
const MAX_SUBLINE = 120;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi."));
    img.src = src;
  });
}

// Metni görsele uygun kısa bir başlığa çevirir (fazla boşlukları temizler).
function toHeadline(text: string | null): string {
  return (text ?? "").replace(/[ \t]+/g, " ").trim().slice(0, MAX_HEADLINE);
}

export default function VisualCreator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [biz, setBiz] = useState<StoredBusiness | null>(null);
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [contentId, setContentId] = useState("");
  const [source, setSource] = useState<TextSource>("post_text");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [format, setFormat] = useState<FormatId>("post");
  const [template, setTemplate] = useState<TemplateId>("gradyan");
  // Ana rengin yüzdesi 50–90 arasında tek tek ayarlanır; yardımcı renk kalandır.
  const [ratioId, setRatioId] = useState<RatioId>(DEFAULT_RATIO);
  const [showStorySafeArea, setShowStorySafeArea] = useState(true);
  const [style, setStyle] = useState<Style>("photo");

  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Profil ve içerikler
  useEffect(() => {
    Promise.all([
      businessStore.get(),
      getSupabase()
        .from("contents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ])
      .then(([b, c]) => {
        setBiz(b);
        if (c.error) setLoadError("İçerikler yüklenemedi: " + c.error.message);
        else setContents((c.data ?? []) as ContentRow[]);
      })
      .catch((err: Error) => setLoadError("Yüklenemedi: " + err.message))
      .finally(() => setLoading(false));
  }, []);

  // Logo
  useEffect(() => {
    const src = biz?.logo_data_url;
    if (!src) return;
    let cancelled = false;
    loadImage(src)
      .then((img) => {
        if (!cancelled) setLogo(img);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [biz?.logo_data_url]);

  // Canlı önizleme
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const f = FORMATS[format];
    canvas.width = f.width;
    canvas.height = f.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawVisual(ctx, {
      width: f.width,
      height: f.height,
      template,
      headline,
      subline,
      brandName: biz?.name ?? "",
      colors: biz?.brand_colors ?? [],
      ratioId,
      logo: logo && biz?.logo_data_url ? logo : null,
      logoSize: logo ? { w: logo.naturalWidth, h: logo.naturalHeight } : undefined,
      background,
      backgroundSize: background
        ? { w: background.naturalWidth, h: background.naturalHeight }
        : undefined,
    });
  }, [biz, logo, background, template, format, headline, subline, loading, ratioId]);

  const selected = contents.find((c) => c.id === contentId) ?? null;

  function pickContent(id: string, src: TextSource = source) {
    setContentId(id);
    const c = contents.find((x) => x.id === id);
    if (c) setHeadline(toHeadline(c[src]));
  }

  async function generateBackground() {
    setError(null);
    setNotice(null);
    const topic = (selected?.prompt || headline).trim();
    if (topic.length < 3) {
      setError("Önce bir içerik seçin veya görseldeki yazıyı girin.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: topic.slice(0, 300), style, format, ratio: ratioId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Görsel üretilemedi.");
      const img = await loadImage(body.image as string);
      setBackground(img);
      setTemplate("fotograf");
      setNotice("Arka plan hazır. Yazıyı ve şablonu değiştirebilirsiniz.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setBusy(false);
    }
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Fotoğraf PNG, JPG veya WebP olmalı.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Fotoğraf 4 MB'den küçük olmalı.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result as string)
        .then((img) => {
          setBackground(img);
          setTemplate("fotograf");
        })
        .catch(() => setError("Fotoğraf okunamadı."));
    };
    reader.readAsDataURL(file);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Görsel oluşturulamadı.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gorsel-${format}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function saveToLibrary() {
    const canvas = canvasRef.current;
    if (!canvas || !biz?.id) {
      setError("Önce işletme profilinizi kaydedin, ardından görseli kütüphaneye ekleyin.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    let objectPath = "";
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG hazırlanamadı.")), "image/png");
      });
      const supabase = getSupabase();
      objectPath = `${biz.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("visuals")
        .upload(objectPath, blob, { contentType: "image/png", upsert: false });
      if (uploadError) {
        throw new Error(`Görsel depoya yüklenemedi: ${uploadError.message}. Storage için schema_v3_visual_storage.sql dosyasının uygulanmış olduğunu kontrol edin.`);
      }

      const visualPrompt = selected
        ? `Görsel tasarımı · ${selected.prompt}`
        : `Görsel tasarımı · ${headline.trim() || "Marka içeriği"}`;
      const { error: insertError } = await supabase.from("contents").insert({
        business_id: biz.id,
        parent_id: null,
        prompt: visualPrompt.slice(0, 500),
        tone: selected?.tone ?? null,
        language: biz.content_language,
        post_text: selected?.post_text || headline.trim() || null,
        caption: selected?.caption || subline.trim() || null,
        hashtags: selected?.hashtags ?? [],
        ad_text: selected?.ad_text ?? null,
        story_text: selected?.story_text ?? null,
        visual_url: objectPath,
        status: "draft",
      });
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from("visuals").remove([objectPath]);
        throw new Error(
          cleanupError
            ? `Kütüphane kaydı başarısız oldu (${insertError.message}); geçici görsel de silinemedi (${cleanupError.message}).`
            : `Kütüphane kaydı başarısız oldu: ${insertError.message}`
        );
      }
      setNotice("Görsel taslağı kütüphaneye kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
        Stüdyo yükleniyor…
      </div>
    );
  }

  if (!biz) {
    return (
      <Callout tone="warning">
        Görsel oluşturmak için önce{" "}
        <Link href="/" className="font-semibold underline underline-offset-2">
          işletme profilinizi kaydedin →
        </Link>
      </Callout>
    );
  }

  const palette = readPalette(biz.brand_colors, ratioId);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {/* Önizleme */}
      <div className="space-y-3 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-line bg-surface/90 p-4 shadow-soft backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              Canlı önizleme
            </p>
            <Tag tone="brand">{FORMATS[format].aspect}</Tag>
          </div>
          <div className="relative mx-auto w-full max-w-[19rem]">
            <canvas
              ref={canvasRef}
              aria-label="Görsel önizleme"
              className="block h-auto w-full rounded-xl border border-line shadow-soft"
            />
            {format === "story" && showStorySafeArea && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
                <div className="absolute inset-x-0 top-0 flex h-[14%] items-center justify-center border-b border-dashed border-white/80 bg-black/35 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Üst arayüz alanı
                </div>
                <div className="absolute inset-x-0 bottom-0 flex h-[15%] items-center justify-center border-t border-dashed border-white/80 bg-black/35 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Alt arayüz alanı
                </div>
                <div className="absolute inset-x-[7%] bottom-[17%] top-[16%] rounded-lg border border-dashed border-white/75" />
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" onClick={saveToLibrary} disabled={saving || busy} className="w-full">
              <IconLibrary />
              {saving ? "Kaydediliyor…" : "Kütüphaneye ekle"}
            </Button>
            <Button type="button" variant="secondary" onClick={download} disabled={saving || busy} className="w-full">
              <IconDownload />PNG indir
            </Button>
          </div>
          {error && <Callout tone="error" className="mt-3">{error}</Callout>}
          {notice && <Callout tone="success" className="mt-3">{notice}</Callout>}
          <div className="mt-3 space-y-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: palette.primary }} />Ana</span>
                <span className="font-mono">{percent(palette.share)} / {percent(palette.accent)}</span>
                <span className="inline-flex items-center gap-1.5">Yardımcı<i className="h-2.5 w-2.5 rounded-full" style={{ background: palette.secondary }} /></span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span style={{ width: `${palette.share * 100}%`, backgroundColor: palette.primary }} />
                <span style={{ width: `${palette.accent * 100}%`, backgroundColor: palette.secondary }} />
              </div>
              <p className={hintClass}>{TEMPLATE_USAGE[template]}</p>
            </div>
          </div>
        </div>
        {loadError && <Callout tone="error">{loadError}</Callout>}
      </div>

      {/* Kontroller */}
      <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-soft backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">Görselini hazırla</h2>
            <p className="text-sm text-muted">Metni seç, görünümü düzenle ve tek tıkla kütüphanene kaydet.</p>
          </div>
          <LinkButton href="/uret" size="sm" variant="ghost">
            <IconSparkles className="h-3.5 w-3.5" />Yeni içerik
          </LinkButton>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">İçerik</p>
          {contents.length === 0 ? (
            <Callout tone="info">
              Henüz içeriğiniz yok.{" "}
              <Link href="/uret" className="font-semibold underline underline-offset-2">
                Önce içerik üretin →
              </Link>{" "}
              Dilerseniz yazıyı aşağıya kendiniz de girebilirsiniz.
            </Callout>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="space-y-1.5">
                <label htmlFor="vis-content" className="text-sm font-medium text-ink">
                  İçerik
                </label>
                <select
                  id="vis-content"
                  className={selectClass}
                  value={contentId}
                  onChange={(e) => pickContent(e.target.value)}
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
              <div className="space-y-1.5">
                <label htmlFor="vis-source" className="text-sm font-medium text-ink">
                  Yazı kaynağı
                </label>
                <select
                  id="vis-source"
                  className={selectClass}
                  value={source}
                  onChange={(e) => {
                    const s = e.target.value as TextSource;
                    setSource(s);
                    if (contentId) pickContent(contentId, s);
                  }}
                >
                  {(Object.keys(SOURCE_LABEL) as TextSource[]).map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-3 flex items-center gap-2">
              <StatusPill status={selected.status} />
              <p className="truncate text-xs text-muted">{selected.prompt}</p>
            </div>
          )}

          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="flex items-center justify-between text-sm font-medium text-ink">
                Görseldeki yazı
                <span className="font-mono text-[11px] text-faint">
                  {headline.length}/{MAX_HEADLINE}
                </span>
              </span>
              <textarea
                className={cx(inputClass, "resize-y")}
                rows={3}
                maxLength={MAX_HEADLINE}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Örn. Kasım'a özel %20 indirim"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">Alt yazı (isteğe bağlı)</span>
              <input
                className={inputClass}
                maxLength={MAX_SUBLINE}
                value={subline}
                onChange={(e) => setSubline(e.target.value)}
                placeholder="Örn. 30 Kasım'a kadar geçerli"
              />
            </label>
          </div>
        </div>

        <div className="space-y-5 border-t border-line pt-5">
          <div>
            <h3 className="text-sm font-semibold text-ink">Görünüm</h3>
            <p className="mt-1 text-xs text-muted">Şablon, format ve marka rengi dengesini ayarlayın.</p>
          </div>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="vis-format" className="text-sm font-medium text-ink">
                Format
              </label>
              <select
                id="vis-format"
                className={selectClass}
                value={format}
                onChange={(e) => setFormat(e.target.value as FormatId)}
              >
                {(Object.keys(FORMATS) as FormatId[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMATS[f].label}
                  </option>
                ))}
              </select>
              <p className={hintClass}>
                Bunlar indirme ölçüleridir; paylaşmadan önce hedef platformun güncel kırpma ve güvenli alanını kontrol edin.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">Marka rengi dengesi</p>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs font-semibold text-ink">
                  %{ratioId} <span className="text-faint">/</span> %{100 - ratioId}
                </span>
              </div>
              <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 rounded-xl border border-white/70 shadow-sm" style={{ backgroundColor: palette.primary }} />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-muted">Ana renk</span>
                      <span className="block font-mono text-xs font-semibold text-ink">%{ratioId}</span>
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2.5 text-right">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-muted">Yardımcı</span>
                      <span className="block font-mono text-xs font-semibold text-ink">%{100 - ratioId}</span>
                    </span>
                    <span className="h-8 w-8 shrink-0 rounded-xl border border-white/70 shadow-sm" style={{ backgroundColor: palette.secondary }} />
                  </div>
                </div>
                <label htmlFor="vis-ratio" className="sr-only">Ana rengin kullanım oranı</label>
                <input
                  id="vis-ratio"
                  type="range"
                  min={MIN_PRIMARY_SHARE}
                  max={MAX_PRIMARY_SHARE}
                  step={1}
                  value={ratioId}
                  onChange={(e) => setRatioId(Number(e.target.value))}
                  aria-valuetext={`Ana renk yüzde ${ratioId}, yardımcı renk yüzde ${100 - ratioId}`}
                  className="brand-ratio-slider w-full"
                  style={{
                    background: `linear-gradient(to right, ${palette.primary} 0%, ${palette.primary} ${ratioId}%, ${palette.secondary} ${ratioId}%, ${palette.secondary} 100%)`,
                  }}
                />
                <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-muted">
                  <span>50 / 50</span><span>Her adım %1</span><span>90 / 10</span>
                </div>
              </div>
              <p className={hintClass}>Kaydırdıkça önizleme ve AI arka plan paleti anında güncellenir.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Şablon araç çubuğu</p>
              <div role="group" aria-label="Görsel stili" className="flex flex-wrap gap-2">
                {TOOLBAR_TEMPLATE_IDS.map((id) => {
                  const item = TEMPLATES.find((entry) => entry.id === id);
                  if (!item) return null;
                  return <Chip key={id} active={template === id} onClick={() => setTemplate(id)}>{item.label}</Chip>;
                })}
              </div>
              <details className="group rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5">
                <summary className="cursor-pointer list-none text-xs font-semibold text-muted marker:hidden">
                  <span className="inline-flex items-center gap-2">Diğer şablonlar <span className="rounded-full bg-surface px-2 py-0.5 font-mono">{TEMPLATES.length - TOOLBAR_TEMPLATE_IDS.length}</span><span className="text-faint transition group-open:rotate-90">›</span></span>
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TEMPLATES.filter((item) => !TOOLBAR_TEMPLATE_IDS.includes(item.id)).map((item) => (
                    <Chip key={item.id} active={template === item.id} onClick={() => setTemplate(item.id)}>{item.label}</Chip>
                  ))}
                </div>
              </details>
              {template === "fotograf" && !background && (
                <p className={hintClass}>
                  &quot;Fotoğraflı&quot; temel şablon için aşağıdan arka plan ekleyin; yoksa gradyan
                  yedek olarak gösterilir. Yeni kompozisyonlar yüklenen/üretilen fotoğrafın üstüne de uygulanabilir.
                </p>
              )}
              {format === "story" && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={showStorySafeArea}
                    onChange={(e) => setShowStorySafeArea(e.target.checked)}
                    className="h-4 w-4 accent-brand"
                  />
                  Hikâyede platform arayüzü için güvenli alanı göster (yalnızca önizleme)
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-line pt-5">
          <div>
            <h3 className="text-sm font-semibold text-ink">Arka plan görseli</h3>
            <p className="mt-1 text-xs text-muted">İstersen bir fotoğraf yükle veya AI ile yazısız arka plan oluştur.</p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-end">
              <div className="space-y-1.5">
                <label htmlFor="vis-style" className="text-sm font-medium text-ink">
                  Stil
                </label>
                <select
                  id="vis-style"
                  className={selectClass}
                  value={style}
                  onChange={(e) => setStyle(e.target.value as Style)}
                >
                  {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
                    <option key={s} value={s}>
                      {STYLE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={generateBackground} disabled={busy || saving}>
                  {busy ? <IconRefresh className="animate-spin" /> : <IconWand />}
                  {busy ? "Üretiliyor…" : "Yapay zekâyla üret"}
                </Button>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-2">
                  <IconImage className="h-4 w-4 text-muted" />
                  Fotoğraf yükle
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onUpload}
                    disabled={busy || saving}
                    className="sr-only"
                  />
                </label>
                {background && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setBackground(null);
                      setNotice(null);
                    }}
                  >
                    Kaldır
                  </Button>
                )}
              </div>
            </div>

            <p className={hintClass}>
              AI üretimi görseller görünmez SynthID işareti içerebilir. Kütüphaneye kaydedilen PNG özel tutulur ve yalnızca işletme hesabınızdan açılır.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
