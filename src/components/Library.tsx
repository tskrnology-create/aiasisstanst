"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { SocialPlatform } from "@/lib/business-store";
import { shareText } from "@/lib/calendar-utils";
import {
  STATUS_LABEL,
  contentToText,
  downloadName,
  matchesSearch,
  parseHashtags,
  type ContentRow,
  type ContentStatus,
} from "@/lib/library-utils";
import {
  Button,
  Callout,
  EmptyState,
  LinkButton,
  SectionCard,
  StatusPill,
  Tag,
  cx,
  hintClass,
  inputClass,
} from "./Ui";
import { CopyButton, OpenPlatformButton, PlatformPicker } from "./ShareControls";
import {
  IconArrowRight,
  IconDownload,
  IconImage,
  IconLibrary,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "./Icons";

const PAGE_LIMIT = 200;

const FILTERS: Array<{ value: "all" | ContentStatus; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "draft", label: "Taslak" },
  { value: "approved", label: "Onaylı" },
  { value: "archived", label: "Arşiv" },
];

function downloadText(row: ContentRow) {
  const blob = new Blob([contentToText(row)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName(row);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function EditArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">{label}</span>
      <textarea
        className={cx(inputClass, "resize-y leading-relaxed")}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ItemCard({
  row,
  onUpdated,
  onDeleted,
}: {
  row: ContentRow;
  onUpdated: (row: ContentRow) => void;
  onDeleted: (id: string, warning?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [postText, setPostText] = useState(row.post_text ?? "");
  const [caption, setCaption] = useState(row.caption ?? "");
  const [hashtags, setHashtags] = useState(row.hashtags.join(" "));
  const [adText, setAdText] = useState(row.ad_text ?? "");
  const [storyText, setStoryText] = useState(row.story_text ?? "");
  const [visualResult, setVisualResult] = useState<{ key: string; src?: string; error?: string } | null>(null);
  const visualSrc = visualResult?.key === row.visual_url ? visualResult.src ?? null : null;
  const visualError = visualResult?.key === row.visual_url ? visualResult.error ?? null : null;
  const visualLoading = Boolean(open && row.visual_url && visualResult?.key !== row.visual_url);

  useEffect(() => {
    let active = true;
    if (!open || !row.visual_url) return () => { active = false; };
    const key = row.visual_url;

    if (/^(https?:|data:|blob:)/i.test(key)) {
      Promise.resolve().then(() => {
        if (active) setVisualResult({ key, src: key });
      });
      return () => { active = false; };
    }

    getSupabase().storage.from("visuals").createSignedUrl(key, 60 * 60)
      .then(({ data, error: signedError }) => {
        if (!active) return;
        if (signedError || !data?.signedUrl) {
          setVisualResult({ key, error: "Görsel açılamadı. visuals deposu ve erişim kurallarını kontrol edin." });
        } else {
          setVisualResult({ key, src: data.signedUrl });
        }
      })
      .catch(() => {
        if (active) setVisualResult({ key, error: "Görsel bağlantısı oluşturulamadı." });
      });
    return () => { active = false; };
  }, [open, row.visual_url]);

  async function save(status: ContentStatus = row.status) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: err } = await getSupabase()
      .from("contents")
      .update({
        post_text: postText,
        caption,
        hashtags: parseHashtags(hashtags),
        ad_text: adText,
        story_text: storyText,
        status,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    setBusy(false);
    if (err || !data) {
      setError("Kaydedilemedi: " + (err?.message ?? "bilinmeyen hata"));
      return;
    }
    const updated = data as ContentRow;
    setHashtags(updated.hashtags.join(" "));
    onUpdated(updated);
    setNotice(status === row.status ? "Kaydedildi." : `Durum: ${STATUS_LABEL[status]}`);
  }

  async function remove() {
    if (!window.confirm("Bu içerik kalıcı olarak silinsin mi?")) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { error: err } = await supabase.from("contents").delete().eq("id", row.id);
    if (err) {
      setBusy(false);
      setError("Silinemedi: " + err.message);
      return;
    }
    let warning: string | undefined;
    if (row.visual_url && !/^(https?:|data:|blob:)/i.test(row.visual_url)) {
      const { error: storageError } = await supabase.storage.from("visuals").remove([row.visual_url]);
      if (storageError) warning = "İçerik silindi ancak görsel dosyası depodan silinemedi; erişim politikasını kontrol edin.";
    }
    setBusy(false);
    onDeleted(row.id, warning);
  }

  const date = new Date(row.created_at).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article
      className={cx(
        "rounded-2xl border bg-surface shadow-soft transition hover:border-line-strong",
        open ? "border-brand/40" : "border-line"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full space-y-2.5 rounded-2xl p-4 text-left sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <StatusPill status={row.status} />
          <span>{date}</span>
          <span aria-hidden="true">·</span>
          <span>{row.tone ? `Ton: ${row.tone}` : "Marka diline göre"}</span>
          {row.parent_id && <Tag>Alternatif</Tag>}
          {row.visual_url && <Tag tone="brand"><IconImage className="h-3 w-3" />Görsel</Tag>}
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-faint">
            {open ? "Daralt" : "Düzenle ve paylaş"}
            <IconArrowRight className={cx("h-3.5 w-3.5 transition", open && "rotate-90")} />
          </span>
        </div>
        <p className="text-sm font-semibold text-ink">{row.prompt}</p>
        <p className={cx("whitespace-pre-wrap text-sm leading-relaxed text-muted", !open && "line-clamp-2")}>
          {row.post_text || row.caption || "Metin alanı boş."}
        </p>
      </button>

      {open && (
        <div className="space-y-5 border-t border-line p-4 sm:p-5">
          {row.visual_url && (
            <div className="rounded-xl border border-line bg-surface-2/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Kaydedilmiş görsel</p>
                {visualSrc && <a href={visualSrc} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">Tam boy aç</a>}
              </div>
              {visualLoading ? (
                <p className="text-xs text-muted">Görsel yükleniyor…</p>
              ) : visualError ? (
                <p className="text-xs text-danger">{visualError}</p>
              ) : visualSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visualSrc} alt={`${row.prompt} görsel tasarımı`} className="max-h-[32rem] w-full rounded-lg object-contain" />
              ) : null}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <EditArea label="Gönderi metni" value={postText} onChange={setPostText} />
            <EditArea label="Açıklama (caption)" value={caption} onChange={setCaption} rows={4} />
            <EditArea label="Hashtag'ler" value={hashtags} onChange={setHashtags} rows={2} />
            <EditArea label="Hikâye (story) metni" value={storyText} onChange={setStoryText} rows={2} />
            <div className="sm:col-span-2">
              <EditArea label="Reklam metni" value={adText} onChange={setAdText} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => save()}>
              Kaydet
            </Button>
            {row.status === "approved" ? (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => save("draft")}>
                Taslağa al
              </Button>
            ) : (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => save("approved")}>
                Onayla
              </Button>
            )}
            {row.status !== "archived" && (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => save("archived")}>
                Arşivle
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => downloadText(row)}>
              <IconDownload />İndir (.txt)
            </Button>
            <LinkButton href={`/uret?prompt=${encodeURIComponent(row.prompt)}`} size="sm" variant="ghost">
              <IconRefresh />Yeniden kullan
            </LinkButton>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            >
              <IconTrash className="h-3.5 w-3.5" />
              Sil
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                Manuel paylaşım
              </p>
              <span className={hintClass}>Paylaşım metni: açıklama + hashtag</span>
            </div>
            <PlatformPicker value={platform} onChange={setPlatform} />
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={shareText(row)} label="Paylaşım metnini kopyala" />
              <OpenPlatformButton platform={platform} />
              <CopyButton text={contentToText(row)} label="Tüm alanları kopyala" variant="ghost" />
            </div>
            {platform && (
              <p className={hintClass}>
                Metni kopyalayıp platformu açın; orada yapıştırıp paylaşın. Takvimden “Paylaşıldı”
                işareti eklemeyi unutmayın.
              </p>
            )}
          </div>

          {error && <Callout tone="error">{error}</Callout>}
          {notice && <Callout tone="success">{notice}</Callout>}
        </div>
      )}
    </article>
  );
}

export default function Library() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "warning" } | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContentStatus>("all");

  useEffect(() => {
    getSupabase()
      .from("contents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT)
      .then(({ data, error: err }) => {
        if (err) setError("İçerikler yüklenemedi: " + err.message);
        else setRows((data ?? []) as ContentRow[]);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) => (statusFilter === "all" || r.status === statusFilter) && matchesSearch(r, query)
      ),
    [rows, query, statusFilter]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
        Kütüphane yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Arşiviniz"
        description={`${rows.length} içerik · ${visible.length} gösteriliyor`}
        aside={
          <LinkButton href="/uret" size="sm" variant="soft">
            Yeni içerik üret
          </LinkButton>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[14rem] flex-1">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              className={cx(inputClass, "pl-10")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İçeriklerde ara…"
              aria-label="Ara"
            />
          </div>
          <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                aria-pressed={statusFilter === f.value}
                className={cx(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  statusFilter === f.value
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,16,24,0.08)]"
                    : "text-muted hover:text-ink"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {error && <Callout tone="error">{error}</Callout>}
      {notice && <Callout tone={notice.tone}>{notice.message}</Callout>}

      {!error && rows.length === 0 && (
        <EmptyState
          icon={<IconLibrary className="h-5 w-5" />}
          title="Henüz kayıtlı içeriğiniz yok"
          description="İlk içeriğinizi üretin; taslak olarak kütüphaneye otomatik kaydedilir."
          action={
            <LinkButton href="/uret" variant="primary" size="sm">
              İlk içeriğinizi üretin
            </LinkButton>
          }
        />
      )}

      {rows.length > 0 && visible.length === 0 && (
        <EmptyState title="Aramanızla eşleşen içerik yok" description="Filtreyi değiştirin veya farklı bir kelime arayın." />
      )}

      <div className="space-y-4">
        {visible.map((row) => (
          <ItemCard
            key={row.id}
            row={row}
            onUpdated={(u) => setRows((all) => all.map((r) => (r.id === u.id ? u : r)))}
            onDeleted={(id, warning) => {
              setRows((all) => all.filter((r) => r.id !== id));
              setNotice(warning
                ? { message: warning, tone: "warning" }
                : { message: "İçerik kütüphaneden silindi.", tone: "success" });
            }}
          />
        ))}
      </div>

      {rows.length >= PAGE_LIMIT && (
        <p className={hintClass}>En yeni {PAGE_LIMIT} içerik gösteriliyor.</p>
      )}
    </div>
  );
}
