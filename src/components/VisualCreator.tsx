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
  contrastText,
  percent,
  readPalette,
  type RatioId,
} from "@/lib/brand-palette";
import {
  Button,
  Callout,
  LinkButton,
  SectionCard,
  StatusPill,
  Tag,
  cx,
  hintClass,
  inputClass,
  selectClass,
} from "./Ui";
import { IconDownload, IconImage, IconRefresh, IconSparkles, IconWand } from "./Icons";

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
          <div className="mt-4 space-y-3">
            <Button type="button" onClick={download} className="w-full">
              <IconDownload />
              PNG olarak indir
            </Button>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>Renk oranı</span>
                <span className="font-mono">
                  {percent(palette.share)} / {percent(palette.accent)}
                </span>
              </div>
              <div className="flex h-8 overflow-hidden rounded-lg border border-line">
                <span
                  className="grid text-[10px] font-semibold"
                  style={{
                    width: `${palette.share * 100}%`,
                    backgroundColor: palette.primary,
                    color: contrastText(palette.primary),
                  }}
                >
                  {palette.primary.toUpperCase()}
                </span>
                <span
                  className="grid text-[10px] font-semibold"
                  style={{
                    width: `${palette.accent * 100}%`,
                    backgroundColor: palette.secondary,
                    color: contrastText(palette.secondary),
                  }}
                >
                  {palette.secondary.toUpperCase()}
                </span>
              </div>
              <p className={hintClass}>{TEMPLATE_USAGE[template]}</p>
            </div>
          </div>
        </div>
        {loadError && <Callout tone="error">{loadError}</Callout>}
      </div>

      {/* Kontroller */}
      <div className="space-y-5">
        <SectionCard
          step="01"
          title="İçerik ve yazı"
          description="Kütüphanenizdeki bir içeriği temel alın veya yazıyı elle girin."
          aside={
            contents.length > 0 ? (
              <LinkButton href="/uret" size="sm" variant="ghost">
                <IconSparkles className="h-3.5 w-3.5" />
                Yeni içerik
              </LinkButton>
            ) : undefined
          }
        >
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
        </SectionCard>

        <SectionCard step="02" title="Format ve şablon" description="Yerleşim, marka renklerinizi ve logonuzu kullanır.">
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

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">Renk oranı</p>
                <span className="text-xs text-muted">
                  ana {percent(palette.share)} · yardımcı {percent(palette.accent)}
                </span>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/70 px-3.5 py-3">
                <label htmlFor="vis-ratio" className="sr-only">
                  Ana renk kullanım oranı
                </label>
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
                <div className="mt-1 flex justify-between text-[10px] font-mono text-muted">
                  <span>%{MIN_PRIMARY_SHARE} / %{100 - MIN_PRIMARY_SHARE}</span>
                  <span>%70 / %30</span>
                  <span>%{MAX_PRIMARY_SHARE} / %{100 - MAX_PRIMARY_SHARE}</span>
                </div>
              </div>
              <p className={hintClass}>
                Ana rengin payı %{ratioId}, yardımcı rengin payı %{100 - ratioId}. Her yüzde
                adımında canlı önizleme ve yapay zekâ arka plan istemi güncellenir.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">Kompozisyon şablonu</p>
                <span className="text-xs text-muted">{TEMPLATES.length} seçenek</span>
              </div>
              <div role="radiogroup" aria-label="Kompozisyon şablonu" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={template === item.id}
                    onClick={() => setTemplate(item.id)}
                    className={cx(
                      "min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-medium transition",
                      template === item.id
                        ? "border-brand bg-brand-soft text-brand dark:text-brand-strong"
                        : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
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
        </SectionCard>

        <SectionCard
          step="03"
          title="Arka plan"
          description="Yapay zekâ yalnızca yazısız arka plan üretir; yazı, logo ve renkler şablonla çizilir."
        >
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
                <Button type="button" onClick={generateBackground} disabled={busy}>
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

            {error && <Callout tone="error">{error}</Callout>}
            {notice && <Callout tone="success">{notice}</Callout>}

            <Callout tone="info">
              Üretilen görseller, üretici tarafından görünmez bir işaretle (SynthID) etiketlenebilir.
              Arka plan ve görsel şimdilik kaydedilmez; beğendiğiniz görseli indirin ve takvimdeki
              paylaşım sırasında elle yükleyin.
            </Callout>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
