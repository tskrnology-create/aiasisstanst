"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import type { StoredBusiness } from "@/lib/business-store";
import type { ContentRow } from "@/lib/library-utils";
import { Button, Callout, cx, inputClass } from "./Ui";

type MediaTab = "photo" | "video" | "model";
type PhotoHit = {
  id: number;
  pageURL: string;
  tags: string;
  previewURL: string;
  width: number;
  height: number;
  user: string;
};
type VideoHit = {
  id: number;
  pageURL: string;
  tags: string;
  user: string;
  duration: number;
  thumbnailURL: string;
  videoURL: string;
  width: number;
  height: number;
};
type SearchHit = PhotoHit | VideoHit;

const MAX_MODEL_BYTES = 50 * 1024 * 1024;
const PIXABAY_3D_SEARCH = "https://pixabay.com/3d-models/search/";
const MEDIA_TABS: Array<{ id: MediaTab; label: string }> = [
  { id: "photo", label: "Fotoğraf" },
  { id: "video", label: "Video" },
  { id: "model", label: "3D model" },
];

async function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Pixabay görseli önizlemede açılamadı."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function MediaPicker({
  business,
  onImageSelected,
  onContentSaved,
  disabled = false,
}: {
  business: Pick<StoredBusiness, "id" | "content_language">;
  onImageSelected: (image: HTMLImageElement) => void;
  onContentSaved: (row: ContentRow) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<MediaTab>("photo");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modelSource, setModelSource] = useState("");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const off = disabled || searching || busyId !== null;

  function changeTab(next: MediaTab) {
    setTab(next);
    setResults([]);
    setTotalHits(0);
    setPage(1);
    setError(null);
    setNotice(null);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % MEDIA_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + MEDIA_TABS.length) % MEDIA_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = MEDIA_TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = MEDIA_TABS[nextIndex].id;
    changeTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`media-tab-${nextTab}`)?.focus());
  }

  async function getToken() {
    const { data, error: sessionError } = await getSupabase().auth.getSession();
    if (sessionError || !data.session?.access_token) throw new Error("Oturum bulunamadı, yeniden giriş yapın.");
    return data.session.access_token;
  }

  async function search(nextPage = 1) {
    const term = query.trim();
    if (term.length < 2) {
      setError("Aramak için en az iki karakter yazın.");
      return;
    }
    setSearching(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/media/pixabay/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: tab, query: term, page: nextPage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Arama yapılamadı, tekrar deneyin.");
      setResults((data.results ?? []) as SearchHit[]);
      setTotalHits(Number(data.totalHits ?? 0));
      setPage(nextPage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Arama yapılamadı, tekrar deneyin.");
    } finally {
      setSearching(false);
    }
  }

  async function refreshSavedRow(id: string) {
    const { data, error: rowError } = await getSupabase()
      .from("contents")
      .select("*")
      .eq("id", id)
      .eq("business_id", business.id ?? "")
      .single();
    if (rowError || !data) throw new Error("Medya kaydedildi ancak kütüphane listesi yenilenemedi; sayfayı yenileyin.");
    onContentSaved(data as ContentRow);
  }

  async function applyPhoto(hit: PhotoHit) {
    if (!business.id) {
      setError("Önce aktif bir marka seçin.");
      return;
    }
    setBusyId(hit.id);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/media/pixabay/use", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: hit.id, businessId: business.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const base = data.error ?? "Fotoğraf kütüphaneye eklenemedi.";
        throw new Error(data.code ? `${base} (Hata kodu: ${data.code})` : base);
      }
      const recordId = response.headers.get("X-Content-Id");
      if (!recordId) throw new Error("Kütüphane kaydı için kimlik dönmedi.");
      const image = await imageFromBlob(await response.blob());
      onImageSelected(image);
      await refreshSavedRow(recordId);
      setNotice("Fotoğraf özel depoya ve kütüphaneye eklendi; canlı önizlemede arka plan olarak kullanılıyor.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fotoğraf kullanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveVideo(hit: VideoHit) {
    if (!business.id) {
      setError("Önce aktif bir marka seçin.");
      return;
    }
    setBusyId(hit.id);
    setError(null);
    setNotice(null);
    try {
      const { data, error: insertError } = await getSupabase()
        .from("contents")
        .insert({
          business_id: business.id,
          parent_id: null,
          prompt: `Pixabay video · ${hit.tags}`.slice(0, 500),
          tone: null,
          language: business.content_language,
          post_text: null,
          caption: `Pixabay · ${hit.user}\nKaynak: ${hit.pageURL}`,
          hashtags: [],
          ad_text: null,
          story_text: null,
          visual_url: hit.videoURL,
          visual_type: "video",
          status: "draft",
        })
        .select("*")
        .single();
      if (insertError || !data) throw new Error(`Video kaydedilemedi: ${insertError?.message ?? "kayıt oluşturulamadı"}`);
      onContentSaved(data as ContentRow);
      setNotice("Video kütüphaneye eklendi; sosyal ağlarda paylaşım yine manuel yapılır.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Video kaydedilemedi.");
    } finally {
      setBusyId(null);
    }
  }

  function open3DSearch() {
    const url = new URL(PIXABAY_3D_SEARCH);
    if (query.trim()) url.searchParams.set("q", query.trim());
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setModelSource(url.toString());
  }

  async function addModel() {
    if (!business.id) {
      setError("Önce aktif bir marka seçin.");
      return;
    }
    const file = modelFile;
    if (!file) {
      setError("Önce Pixabay'den indirdiğiniz .glb modelini seçin.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setError("Şimdilik tek dosyalı .glb modeli destekleniyor. Dış doku gerektiren .gltf paketleri desteklenmiyor.");
      return;
    }
    if (file.size === 0 || file.size > MAX_MODEL_BYTES) {
      setError("Model dosyası boş olamaz ve 50 MB'ı aşmamalıdır.");
      return;
    }

    let source = "https://pixabay.com/3d-models/";
    if (modelSource.trim()) {
      try {
        const parsed = new URL(modelSource.trim());
        if (parsed.protocol !== "https:" || !(parsed.hostname === "pixabay.com" || parsed.hostname.endsWith(".pixabay.com"))) {
          throw new Error();
        }
        source = parsed.toString();
      } catch {
        setError("Model kaynağı HTTPS Pixabay bağlantısı olmalı.");
        return;
      }
    }

    setBusyId("model");
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("source", source);
      form.append("businessId", business.id);
      const response = await fetch("/api/media/models", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "3D model eklenemedi.");
      if (typeof data.id !== "string" && typeof data.id !== "number") throw new Error("Model kaydedildi ancak kütüphane kimliği dönmedi.");
      await refreshSavedRow(String(data.id));
      setModelFile(null);
      if (modelInputRef.current) modelInputRef.current.value = "";
      setNotice("Doğrulanmış 3D model özel depoya ve içerik kütüphanesine eklendi.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "3D model kütüphaneye kaydedilemedi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-ink">Stok medya ekle</h3>
        <p className="mt-1 text-xs text-muted">Pixabay fotoğraf/video ara; seçtiklerini kütüphaneye ekle.</p>
        <p role="status" className="mt-2 inline-flex rounded-full border border-brand/20 bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand">Fotoğraf ve video kaynağı: Pixabay</p>
      </div>

      <div role="tablist" aria-label="Medya türü" aria-orientation="horizontal" className="flex w-fit gap-1 rounded-xl border border-line bg-surface p-1">
        {MEDIA_TABS.map((item, index) => (
          <button
            key={item.id}
            id={`media-tab-${item.id}`}
            type="button"
            role="tab"
            disabled={off}
            aria-selected={tab === item.id}
            aria-controls="media-tabpanel"
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => changeTab(item.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              tab === item.id ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id="media-tabpanel" role="tabpanel" aria-labelledby={`media-tab-${tab}`} tabIndex={0}>
      {tab !== "model" ? (
        <>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void search(1);
            }}
          >
            <input
              className={cx(inputClass, "min-w-0 flex-1")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={off}
              maxLength={100}
              placeholder={tab === "photo" ? "Örn. kahve, doğa, ürün…" : "Örn. şehir, ürün, hareket…"}
              aria-label="Pixabay arama"
            />
            <Button type="submit" disabled={off || query.trim().length < 2}>
              {searching ? "Aranıyor…" : "Pixabay'de ara"}
            </Button>
          </form>
          <p className="text-[11px] text-faint">Arama en fazla 20 sonuç getirir. Pixabay ve katkıcı bilgisi kaynak olarak korunur.</p>

          {results.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tab === "photo" && results.map((result) => {
                const hit = result as PhotoHit;
                return (
                  <article key={hit.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                    {/* Pixabay küçük resmi yalnızca arama sonucunda geçici gösterilir. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hit.previewURL} alt={hit.tags || "Pixabay fotoğrafı"} loading="lazy" className="h-36 w-full bg-surface-2 object-cover" />
                    <div className="space-y-2 p-3">
                      <p className="truncate text-xs font-medium text-ink">{hit.tags || "Pixabay fotoğrafı"}</p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-faint">
                        <span className="truncate">Pixabay · {hit.user}</span>
                        <a href={hit.pageURL} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-brand hover:underline">Kaynak</a>
                      </div>
                      <Button type="button" size="sm" className="w-full" disabled={off} onClick={() => void applyPhoto(hit)}>
                        {busyId === hit.id ? "İndiriliyor…" : "Arka plan yap + kütüphaneye ekle"}
                      </Button>
                    </div>
                  </article>
                );
              })}
              {tab === "video" && results.map((result) => {
                const hit = result as VideoHit;
                return (
                  <article key={hit.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                    {/* Pixabay küçük resmi yalnızca arama sonucunda geçici gösterilir. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hit.thumbnailURL} alt={hit.tags || "Pixabay videosu"} loading="lazy" className="h-36 w-full bg-surface-2 object-cover" />
                    <div className="space-y-2 p-3">
                      <p className="truncate text-xs font-medium text-ink">{hit.tags || "Pixabay videosu"} · {Math.round(hit.duration)} sn</p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-faint">
                        <span className="truncate">Pixabay · {hit.user}</span>
                        <a href={hit.pageURL} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-brand hover:underline">Kaynak</a>
                      </div>
                      <Button type="button" size="sm" className="w-full" disabled={off} onClick={() => void saveVideo(hit)}>
                        {busyId === hit.id ? "Ekleniyor…" : "Kütüphaneye ekle"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {results.length === 0 && totalHits > 0 && !searching && <p className="text-xs text-muted">Bu sayfada sonuç yok.</p>}
          {totalHits > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-muted">
              <span>{totalHits.toLocaleString("tr-TR")} sonuç · sayfa {page}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={off || page <= 1} onClick={() => void search(page - 1)}>Önceki</Button>
                <Button type="button" size="sm" variant="secondary" disabled={off || page >= 25 || results.length === 0} onClick={() => void search(page + 1)}>Sonraki</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-medium text-ink">Pixabay 3D kataloğu</p>
          <p className="text-xs leading-relaxed text-muted">
            Pixabay geliştirici API&apos;si fotoğraf ve video arıyor; 3D modeller için resmi API endpoint&apos;i bulunmadığından katalog yeni sekmede açılır. Modeli Pixabay&apos;den indirin ve buradan yükleyin.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={off} onClick={open3DSearch}>Pixabay&apos;de 3D model ara ↗</Button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Model sayfası bağlantısı (isteğe bağlı)</span>
            <input
              className={inputClass}
              type="url"
              value={modelSource}
              onChange={(event) => setModelSource(event.target.value)}
              disabled={off}
              placeholder="https://pixabay.com/3d-models/..."
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">İndirilen model dosyası</span>
            <input
              ref={modelInputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              onChange={(event) => setModelFile(event.target.files?.[0] ?? null)}
              disabled={off}
              className="block w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
            />
            <span className="block text-[11px] text-faint">Tek dosyalı .glb · en fazla 50 MB. Doku dosyaları ayrı olan .gltf paketleri şimdilik desteklenmiyor.</span>
          </label>
          <Button type="button" disabled={!modelFile || off} onClick={() => void addModel()}>
            {busyId === "model" ? "Yükleniyor…" : "3D modeli kütüphaneye ekle"}
          </Button>
        </div>
      )}
      </div>

      {error && <Callout tone="error">{error}</Callout>}
      {notice && <Callout tone="success">{notice}</Callout>}
    </section>
  );
}
