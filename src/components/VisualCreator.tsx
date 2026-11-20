"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { loadImage, postApi } from "@/lib/api-client";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import { STATUS_LABEL, type ContentRow } from "@/lib/library-utils";
import {
  FORMATS,
  DEFAULT_PHOTO_TEMPLATE,
  DEFAULT_TEMPLATE,
  TEMPLATE_USAGE,
  templateWantsPhoto,
  drawVisual,
  type FormatId,
  type TemplateId,
} from "@/lib/visual-templates";
import {
  DEFAULT_RATIO,
  MAX_PRIMARY_SHARE,
  MIN_PRIMARY_SHARE,
  readPalette,
  type RatioId,
} from "@/lib/brand-palette";
import { Button, Callout, Chip, LinkButton, Segmented, StatusPill, Tag, cx, hintClass, inputClass, selectClass } from "./Ui";
import { IconDownload, IconImage, IconLibrary, IconRefresh, IconSparkles, IconWand } from "./Icons";
import TemplateGallery from "./visual/TemplateGallery";
import MediaPicker from "./MediaPicker";
import { useBusinessContext } from "./BusinessContext";

type TextSource = "post_text" | "ad_text" | "story_text" | "caption";
type Style = "photo" | "illustration" | "abstract";
type Tab = "content" | "design" | "background";
type BgMode = "media" | "upload" | "ai";

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
const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: "content", label: "1 · İçerik" },
  { value: "design", label: "2 · Tasarım" },
  { value: "background", label: "3 · Arka plan" },
];
const BG_MODES: ReadonlyArray<{ value: BgMode; label: string }> = [
  { value: "media", label: "Pixabay medya" },
  { value: "upload", label: "Yükle" },
  { value: "ai", label: "Yapay zekâ" },
];

const MAX_HEADLINE = 160;
const MAX_SUBLINE = 120;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Metni görsele uygun kısa bir başlığa çevirir (fazla boşlukları temizler).
function toHeadline(text: string | null): string {
  return (text ?? "").replace(/[ \t]+/g, " ").trim().slice(0, MAX_HEADLINE);
}

export default function VisualCreator() {
  const { activeBusinessId, isBusinessLoading } = useBusinessContext();
  return (
    <VisualCreatorWorkspace
      key={activeBusinessId ?? "no-brand"}
      activeBusinessId={activeBusinessId}
      isBusinessLoading={isBusinessLoading}
    />
  );
}

function VisualCreatorWorkspace({
  activeBusinessId,
  isBusinessLoading,
}: {
  activeBusinessId: string | null;
  isBusinessLoading: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [biz, setBiz] = useState<StoredBusiness | null>(null);
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loading = isBusinessLoading || (Boolean(activeBusinessId) && !profileLoaded);

  const [contentId, setContentId] = useState("");
  const [source, setSource] = useState<TextSource>("post_text");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [format, setFormat] = useState<FormatId>("post");
  const [template, setTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE);
  // Ana rengin yüzdesi 50–90 arasında tek tek ayarlanır; yardımcı renk kalandır.
  const [ratioId, setRatioId] = useState<RatioId>(DEFAULT_RATIO);
  const [showStorySafeArea, setShowStorySafeArea] = useState(true);
  const [style, setStyle] = useState<Style>("photo");
  const [tab, setTab] = useState<Tab>("content");
  const [bgMode, setBgMode] = useState<BgMode>("media");

  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Profil ve içerikler yalnızca seçili markadan yüklenir.
  useEffect(() => {
    if (isBusinessLoading || !activeBusinessId) return;
    let active = true;
    Promise.all([
      businessStore.get(activeBusinessId),
      getSupabase()
        .from("contents")
        .select("*")
        .eq("business_id", activeBusinessId)
        .order("created_at", { ascending: false })
        .limit(100),
    ])
      .then(([b, c]) => {
        if (!active) return;
        setBiz(b);
        if (c.error) setLoadError("İçerikler yüklenemedi: " + c.error.message);
        else setContents((c.data ?? []) as ContentRow[]);
      })
      .catch((err: Error) => { if (active) setLoadError("Yüklenemedi: " + err.message); })
      .finally(() => { if (active) setProfileLoaded(true); });
    return () => { active = false; };
  }, [activeBusinessId, isBusinessLoading]);

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

  // Şablon küçük resimleri için ortak çizim bilgisi (yalnızca ilgili değerler değişince yenilenir).
  const thumbBase = useMemo(
    () => ({
      headline,
      subline,
      brandName: biz?.name ?? "",
      colors: biz?.brand_colors ?? [],
      ratioId,
      logo: logo && biz?.logo_data_url ? logo : null,
      logoSize: logo ? { w: logo.naturalWidth, h: logo.naturalHeight } : undefined,
      background,
      backgroundSize: background ? { w: background.naturalWidth, h: background.naturalHeight } : undefined,
    }),
    [headline, subline, biz, ratioId, logo, background]
  );

  // Arka plan eklenince, fotoğrafı öne çıkarmayan bir şablondaysak (Büyük yazı, Minimal, Alıntı) fotoğraflı varsayılana geçilir.
  function applyPhotoTemplate() {
    setTemplate((current) => (templateWantsPhoto(current) ? current : DEFAULT_PHOTO_TEMPLATE));
  }

  function pickContent(id: string, src: TextSource = source) {
    setContentId(id);
    const c = contents.find((x) => x.id === id);
    if (c) setHeadline(toHeadline(c[src]));
  }

  async function generateBackground() {
    setError(null);
    setNotice(null);
    if (!biz?.id) {
      setError("Görsel üretmek için önce aktif bir marka seçin.");
      return;
    }
    const topic = (selected?.prompt || headline).trim();
    if (topic.length < 3) {
      setError("Önce bir içerik seçin veya görseldeki yazıyı girin.");
      return;
    }
    setBusy(true);
    try {
      const body = await postApi<{ image: string }>("/api/image", {
        topic: topic.slice(0, 300),
        style,
        format,
        ratio: ratioId,
        businessId: biz.id,
      });
      const img = await loadImage(body.image);
      setBackground(img);
      applyPhotoTemplate();
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
          applyPhotoTemplate();
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
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG hazırlanamadı.")), "image/png");
      });
      const visualPrompt = selected
        ? `Görsel tasarımı · ${selected.prompt}`
        : `Görsel tasarımı · ${headline.trim() || "Marka içeriği"}`;
      const { data: sessionData, error: sessionError } = await getSupabase().auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error("Oturum doğrulanamadı. Yeniden giriş yapıp tekrar deneyin.");

      const form = new FormData();
      form.append("image", blob, "visual.png");
      form.append("businessId", biz.id);
      form.append("prompt", visualPrompt.slice(0, 500));
      form.append("tone", selected?.tone ?? "");
      form.append("postText", selected?.post_text || headline.trim() || "");
      form.append("caption", selected?.caption || subline.trim() || "");
      form.append("hashtags", JSON.stringify(selected?.hashtags ?? []));
      form.append("adText", selected?.ad_text ?? "");
      form.append("storyText", selected?.story_text ?? "");

      const response = await fetch("/api/media/library", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const payload = await response.json().catch(() => ({})) as { error?: unknown; content?: ContentRow };
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Görsel kütüphaneye kaydedilemedi.");
      }
      const savedContent = payload.content;
      if (!savedContent) throw new Error("Görsel kaydedildi ancak kütüphane yanıtı alınamadı.");
      setContents((current) => [savedContent, ...current.filter((item) => item.id !== savedContent.id)]);
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
        <Link href="/profil" className="font-semibold underline underline-offset-2">
          işletme profilinizi kaydedin →
        </Link>
      </Callout>
    );
  }

  const palette = readPalette(biz.brand_colors, ratioId);
  const working = busy || saving;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      {/* Önizleme ve ana eylemler: masaüstünde sabit kalır */}
      <div className="space-y-3 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-line bg-surface/90 p-4 shadow-soft backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Canlı önizleme</p>
            <Tag tone="brand">{FORMATS[format].aspect}</Tag>
          </div>
          <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-[19rem]">
            <canvas
              ref={canvasRef}
              aria-label={`Görsel önizlemesi: ${headline.trim() || selected?.prompt || "boş taslak"}; ${FORMATS[format].label}; ${biz.name}.`}
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
          {format === "story" && (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={showStorySafeArea}
                onChange={(e) => setShowStorySafeArea(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Güvenli alanı göster (yalnızca önizleme)
            </label>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" onClick={saveToLibrary} disabled={working} className="w-full">
              <IconLibrary />
              {saving ? "Kaydediliyor…" : "Kütüphaneye ekle"}
            </Button>
            <Button type="button" variant="secondary" onClick={download} disabled={working} className="w-full">
              <IconDownload />PNG indir
            </Button>
          </div>
          {error && <Callout tone="error" className="mt-3">{error}</Callout>}
          {notice && <Callout tone="success" className="mt-3">{notice}</Callout>}
        </div>
        {loadError && <Callout tone="error">{loadError}</Callout>}
      </div>

      {/* Düzenleme: üç adımlı sekmeler */}
      <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-soft backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Segmented value={tab} onChange={setTab} options={TABS} ariaLabel="Düzenleme adımı" />
          <LinkButton href="/uret" size="sm" variant="ghost">
            <IconSparkles className="h-3.5 w-3.5" />Yeni içerik
          </LinkButton>
        </div>

        {tab === "content" && (
          <div className="space-y-4">
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
                  <label htmlFor="vis-content" className="text-sm font-medium text-ink">İçerik</label>
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
                  <label htmlFor="vis-source" className="text-sm font-medium text-ink">Yazı kaynağı</label>
                  <select
                    id="vis-source"
                    className={selectClass}
                    value={source}
                    onChange={(e) => {
                      const sc = e.target.value as TextSource;
                      setSource(sc);
                      if (contentId) pickContent(contentId, sc);
                    }}
                  >
                    {(Object.keys(SOURCE_LABEL) as TextSource[]).map((k) => (
                      <option key={k} value={k}>{SOURCE_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {selected && (
              <div className="flex items-center gap-2">
                <StatusPill status={selected.status} />
                <p className="truncate text-xs text-muted">{selected.prompt}</p>
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="flex items-center justify-between text-sm font-medium text-ink">
                Görseldeki yazı
                <span className="font-mono text-[11px] text-faint">{headline.length}/{MAX_HEADLINE}</span>
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
            <div className="flex justify-end">
              <Button type="button" variant="soft" onClick={() => setTab("design")}>Tasarıma geç →</Button>
            </div>
          </div>
        )}

        {tab === "design" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Format</p>
              <div role="group" aria-label="Format" className="flex flex-wrap gap-2">
                {(Object.keys(FORMATS) as FormatId[]).map((f) => (
                  <Chip key={f} active={format === f} onClick={() => setFormat(f)} title={FORMATS[f].label}>
                    {FORMATS[f].aspect} · {FORMATS[f].label.split(" (")[0]}
                  </Chip>
                ))}
              </div>
              <p className={hintClass}>
                İndirme ölçüsüdür; paylaşmadan önce platformun güncel kırpma ve güvenli alanını kontrol edin.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Şablon</p>
              <TemplateGallery value={template} onChange={setTemplate} format={format} base={thumbBase} />
              <p className={hintClass}>{TEMPLATE_USAGE[template]}</p>
              {templateWantsPhoto(template) && !background && (
                <Callout tone="info">
                  Bu şablon fotoğrafla çok daha iyi görünür; şimdilik marka renkli yedek zemin gösteriliyor.{" "}
                  <button type="button" className="font-semibold underline" onClick={() => setTab("background")}>
                    Arka plan ekle →
                  </button>
                </Callout>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">Marka rengi dengesi</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs font-semibold text-ink">
                  <i className="h-3 w-3 rounded-full border border-white/70" style={{ backgroundColor: palette.primary }} />
                  %{ratioId} <span className="text-faint">/</span> %{100 - ratioId}
                  <i className="h-3 w-3 rounded-full border border-white/70" style={{ backgroundColor: palette.secondary }} />
                </span>
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
              <p className={hintClass}>Renkleri profil sayfasından değiştirebilirsiniz.</p>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="soft" onClick={() => setTab("background")}>Arka plana geç →</Button>
            </div>
          </div>
        )}

        {tab === "background" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented value={bgMode} onChange={setBgMode} options={BG_MODES} ariaLabel="Arka plan kaynağı" />
              {background && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBackground(null);
                    setNotice(null);
                  }}
                >
                  Arka planı kaldır
                </Button>
              )}
            </div>

            {bgMode === "media" && (
              <MediaPicker
                business={biz}
                colors={biz.brand_colors}
                snapshotSize={{ width: FORMATS[format].width, height: FORMATS[format].height }}
                disabled={working}
                onImageSelected={(img) => {
                  setBackground(img);
                  applyPhotoTemplate();
                  setError(null);
                  setNotice("Arka plan eklendi. Şablonu Tasarım sekmesinden değiştirebilirsiniz.");
                }}
                onContentSaved={(row) => setContents((current) => [row, ...current.filter((item) => item.id !== row.id)])}
              />
            )}

            {bgMode === "upload" && (
              <div className="space-y-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-2">
                  <IconImage className="h-4 w-4 text-muted" />
                  Fotoğraf seç
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onUpload}
                    disabled={working}
                    className="sr-only"
                  />
                </label>
                <p className={hintClass}>PNG, JPG veya WebP · en fazla 4 MB. Fotoğraf cihazınızdan çıkmaz, yalnızca önizlemede kullanılır.</p>
              </div>
            )}

            {bgMode === "ai" && (
              <div className="space-y-3">
                <Callout tone="info">
                  Yapay zekâ görseli Gemini&apos;nin görsel özelliğini kullanır; ücretsiz planda kota dolu olabilir. Hata alırsanız stok fotoğrafı deneyin.
                </Callout>
                <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-end">
                  <div className="space-y-1.5">
                    <label htmlFor="vis-style" className="text-sm font-medium text-ink">Stil</label>
                    <select
                      id="vis-style"
                      className={selectClass}
                      value={style}
                      onChange={(e) => setStyle(e.target.value as Style)}
                    >
                      {(Object.keys(STYLE_LABEL) as Style[]).map((k) => (
                        <option key={k} value={k}>{STYLE_LABEL[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Button type="button" onClick={generateBackground} disabled={working}>
                      {busy ? <IconRefresh className="animate-spin" /> : <IconWand />}
                      {busy ? "Üretiliyor…" : "Yapay zekâyla üret"}
                    </Button>
                  </div>
                </div>
                <p className={hintClass}>
                  AI görselleri görünmez SynthID işareti içerebilir. Saatte 10 üretim sınırı vardır.
                </p>
              </div>
            )}
            <p className={hintClass}>
              Kütüphaneye kaydedilen PNG özel tutulur ve yalnızca işletme hesabınızdan açılır.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
