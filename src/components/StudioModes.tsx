"use client";

// Bağımsız üretim yapıları: Metin, Görsel, Video ve hepsini birleştiren "Metin + Görsel".
// Her yapı kendi başına çalışır; birlikte kullanmak isteyen Metin + Görsel yapısını seçer.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import { suggestMusic } from "@/lib/music-suggestions";
import { totalSeconds, type PostPackage } from "@/lib/post-formats";
import { STUDIO_MODES, contentsHref, modeHref, studioHref, type StudioMode } from "@/lib/routes";
import { postApi } from "@/lib/api-client";
import { useBusinessContext } from "./BusinessContext";
import { REPLY_GOALS, REPLY_SOURCES, type ReplyGoal, type ReplyOption, type ReplySource } from "@/lib/reply-prompt";
import Generator from "./Generator";
import VisualCreator from "./VisualCreator";
import MediaPicker from "./MediaPicker";
import { CopyButton } from "./ShareControls";
import { Button, Callout, Chip, SectionCard, Tag, cx, hintClass, inputClass } from "./Ui";
import MusicPicker, { type MusicChoice } from "./MusicPicker";
import { IconArrowLeft, IconLibrary, IconVideo } from "./Icons";

const MODE_ICON: Record<StudioMode, string> = { metin: "Aa", gorsel: "▣", birlikte: "Aa▣", video: "▶", yanit: "💬" };
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function StudioHub() {
  return (
    <div className="space-y-5">
      <Link href="/studyo/birlikte" className="block rounded-3xl border border-brand/25 bg-brand-soft p-5 shadow-soft transition hover:border-brand">
        <span className="text-xs font-bold uppercase tracking-wide text-brand">Önerilen akış</span>
        <span className="mt-1 block text-xl font-extrabold text-ink">Bir paylaşım hazırla</span>
        <span className="mt-1 block max-w-xl text-sm leading-relaxed text-muted">Önce mesajı netleştir, sonra gerekirse görselini ekle ve yayın zamanını seç. Paylaşım işlemi sende kalır.</span>
        <span className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-ink">Yeni paylaşım başlat →</span>
      </Link>
      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Sadece belirli bir içerik türü hazırlayacağım</summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {STUDIO_MODES.filter((m) => m.id !== "birlikte" && m.id !== "video").map((m) => (
            <li key={m.id}>
              <Link href={m.href} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-surface-2/50 p-3 transition hover:border-brand">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-xs font-extrabold text-brand">{MODE_ICON[m.id]}</span>
                <span><span className="block text-sm font-bold text-ink">{m.label}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted">{m.hint}</span></span>
              </Link>
            </li>
          ))}
          <li><Link href={modeHref("video", { step: "kendi" })} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-surface-2/50 p-3 transition hover:border-brand"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-xs font-extrabold text-brand">▶</span><span><span className="block text-sm font-bold text-ink">Hazır videom</span><span className="mt-0.5 block text-xs text-muted">Kendi MP4/WebM videonu yükle</span></span></Link></li>
          <li><Link href={modeHref("video", { step: "senaryo" })} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-surface-2/50 p-3 transition hover:border-brand"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-xs font-extrabold text-brand">▤</span><span><span className="block text-sm font-bold text-ink">Video senaryosu</span><span className="mt-0.5 block text-xs text-muted">Metin ve çekim planı oluştur</span></span></Link></li>
        </ul>
      </details>
    </div>
  );
}

export function BackToHub({ label }: { label: string }) {
  return (
    <Link href="/studyo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
      <IconArrowLeft className="h-3.5 w-3.5" />
      Stüdyo · <span className="text-ink">{label}</span>
    </Link>
  );
}

function Pills({ items }: { items: Array<{ href: string; label: string; active: boolean; disabled?: boolean }> }) {
  return (
    <nav aria-label="Adımlar" className="mb-5 flex gap-2">
      {items.map((it, i) =>
        it.disabled ? (
          <span key={it.label} aria-disabled="true" className="flex-1 rounded-2xl border border-dashed border-line px-3 py-2.5 text-center text-sm font-semibold opacity-50">
            {i + 1} · {it.label}
          </span>
        ) : (
          <Link
            key={it.label}
            href={it.href}
            aria-current={it.active ? "step" : undefined}
            className={cx(
              "flex-1 rounded-2xl border px-3 py-2.5 text-center text-sm font-semibold transition",
              it.active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:border-line-strong"
            )}
          >
            {i + 1} · {it.label}
          </Link>
        )
      )}
    </nav>
  );
}

/** Kullanıcının metnini yeni taslak olarak kaydeder veya aynı içerik kaydını günceller. */
function OwnText({ contentId }: { contentId: string | null }) {
  const { activeBusinessId } = useBusinessContext();
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(contentId);
  const [loadingContent, setLoadingContent] = useState(Boolean(contentId));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!contentId) return () => { active = false; };
    if (!activeBusinessId) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setLoadError("İçeriği düzenlemek için önce ilgili markayı seçin.");
        setLoadingContent(false);
      });
      return () => { active = false; };
    }

    void Promise.resolve(getSupabase().from("contents").select("id, post_text, hashtags")
      .eq("id", contentId)
      .eq("business_id", activeBusinessId)
      .maybeSingle())
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setLoadError("İçerik bulunamadı veya seçili markaya ait değil.");
          setSavedId(null);
          return;
        }
        setText(data.post_text ?? "");
        setTags((data.hashtags ?? []).join(" "));
      })
      .catch(() => {
        if (active) setLoadError("İçerik yüklenemedi. Yeniden deneyin.");
      })
      .finally(() => {
        if (active) setLoadingContent(false);
      });
    return () => { active = false; };
  }, [activeBusinessId, contentId]);

  async function save() {
    if (!activeBusinessId || busy || loadingContent || loadError) return;
    const body = text.trim();
    if (body.length < 3) {
      setMsg({ ok: false, text: "Önce metni yazın." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const hashtags = [...new Set(tags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`).slice(0, 60)))].slice(0, 30);
      const supabase = getSupabase();
      const targetId = savedId ?? contentId;
      if (targetId) {
        const { data, error } = await supabase.from("contents")
          .update({ post_text: body, hashtags })
          .eq("id", targetId)
          .eq("business_id", activeBusinessId)
          .select("id")
          .maybeSingle();
        if (error || !data) throw new Error(error?.message ?? "İçerik bulunamadı.");
        setSavedId(data.id);
        setMsg({ ok: true, text: "Değişiklikler aynı içerik kaydına kaydedildi." });
      } else {
        const biz = await businessStore.get(activeBusinessId);
        if (!biz) throw new Error("Marka bulunamadı.");
        const { data, error } = await supabase.from("contents").insert({
          business_id: activeBusinessId,
          prompt: "Kendi metnim",
          language: biz.content_language,
          post_text: body,
          hashtags,
          status: "draft",
        }).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "İçerik kaydedilemedi.");
        setSavedId(data.id);
        setMsg({ ok: true, text: "Metin taslak olarak kaydedildi." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title={contentId || savedId ? "İçeriği düzenle" : "Kendi metnim"}
      description={contentId || savedId
        ? "Metni ve hashtag'leri düzenleyin; kaydettiğinizde aynı içerik kaydı güncellenir."
        : "Yapay zekâ kullanmadan kendi metninizi yazıp taslak olarak kaydedin; daha sonra düzenleyip planlayabilirsiniz."}
    >
      <div className="space-y-3">
        {loadingContent && <Callout tone="info">İçerik yükleniyor…</Callout>}
        {loadError && <Callout tone="error">{loadError}</Callout>}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Gönderi metni</span>
          <textarea className={cx(inputClass, "min-h-40 resize-y")} rows={7} maxLength={2200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paylaşım metnini buraya yazın…" />
          <span className="block text-right font-mono text-[11px] text-faint">{text.length}/2200</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Hashtag&apos;ler (isteğe bağlı)</span>
          <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#kampanya #kasım" />
        </label>
        {msg && (
          <Callout tone={msg.ok ? "success" : "error"}>
            {msg.text} {msg.ok && savedId && <Link href={studioHref({ step: "onayla", contentId: savedId })} className="font-semibold underline">Gözden geçir / onayla →</Link>}
          </Callout>
        )}
        <Button type="button" onClick={save} disabled={busy || loadingContent || Boolean(loadError) || !activeBusinessId}>
          <IconLibrary />
          {busy ? "Kaydediliyor…" : contentId || savedId ? "Değişiklikleri kaydet" : "Taslak olarak kaydet"}
        </Button>
      </div>
    </SectionCard>
  );
}

/** Yalnız metin: şablon yok. Yapay zekâyla yaz ya da kendi metnini ekle. */
export function TextStudio() {
  const params = useSearchParams();
  const { activeBusinessId } = useBusinessContext();
  const own = params.get("adim") === "kendi";
  const contentId = params.get("content");
  return (
    <div className="space-y-5">
      <BackToHub label="Metin" />
      <Pills
        items={[
          { href: modeHref("metin"), label: "Yapay zekâ ile yaz", active: !own },
          { href: modeHref("metin", { step: "kendi" }), label: "Kendi metnim", active: own },
        ]}
      />
      {own
        ? <OwnText key={`${activeBusinessId ?? "no-brand"}:${contentId ?? "new"}`} contentId={contentId} />
        : <Generator mode="metin" />}
    </div>
  );
}

/** Yalnız görsel: üret / yükle / Pixabay → şablona yerleştir; yazı isteğe bağlı. */
export function ImageStudio() {
  return (
    <div>
      <BackToHub label="Görsel" />
      <VisualCreator mode="gorsel" />
    </div>
  );
}

interface VideoRow {
  id: string;
  prompt: string;
  tone: string | null;
  package: PostPackage | null;
}

function VideoClips({ contentId }: { contentId: string }) {
  const { activeBusinessId } = useBusinessContext();
  const [biz, setBiz] = useState<StoredBusiness | null>(null);
  const [row, setRow] = useState<VideoRow | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    void Promise.all([
      businessStore.get(activeBusinessId),
      getSupabase()
        .from("contents")
        .select("id, prompt, tone, package")
        .eq("id", contentId)
        .eq("business_id", activeBusinessId)
        .maybeSingle(),
    ]).then(([b, r]) => {
      if (cancelled) return;
      setBiz(b);
      setRow((r.data as VideoRow | null) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, contentId]);

  if (row === undefined) return <p className="text-sm text-muted">Yükleniyor…</p>;
  const pkg = row?.package;
  if (!row || !pkg || pkg.scenes.length === 0) {
    return <Callout tone="warning">Bu içerikte sahne listesi yok. Önce «Senaryo» adımında bir video senaryosu üretin.</Callout>;
  }

  const shotList = [
    `${pkg.hook}`,
    ...pkg.scenes.map(
      (s, i) =>
        `Sahne ${i + 1} (${s.seconds} sn): ${s.visual}${s.on_screen_text ? ` | Ekranda yazı: ${s.on_screen_text}` : ""}${s.voiceover ? ` | Ses: ${s.voiceover}` : ""}`
    ),
    `Çağrı: ${pkg.cta}`,
    pkg.hashtags.join(" "),
  ].join("\n");
  const music = suggestMusic({ kind: null, tone: row.tone ?? "", platform: null });

  return (
    <div className="space-y-5">
      <SectionCard
        title={`Çekim listesi · ${totalSeconds(pkg.scenes)} sn`}
        description="Sahne sahne ne çekeceğinizi ya da hangi klibi kullanacağınızı belirleyin."
        aside={<CopyButton text={shotList} label="Listeyi kopyala" />}
      >
        <ol className="space-y-2">
          {pkg.scenes.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border border-line bg-surface-2/60 p-3">
              <span className="grid h-9 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-xs font-bold text-brand">{s.seconds} sn</span>
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-medium text-ink">Sahne {i + 1}: {s.visual}</p>
                {s.on_screen_text && <p className="text-ink-soft">Ekranda yazı: “{s.on_screen_text}”</p>}
                {s.voiceover && <p className="text-muted">Ses: {s.voiceover}</p>}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">
          Müzik: <Tag tone="brand">{music.mood}</Tag> — ayrıntı için Metin + Görsel yapısındaki müzik önerisine bakabilirsiniz.
        </p>
      </SectionCard>

      <SectionCard title="Stok klip bul" description="Pixabay'dan uygun klipleri arayın; seçtiğiniz klip kütüphanenize kaydedilir, oradan indirip kurgu uygulamanızda kullanırsınız.">
        {biz ? (
          <MediaPicker
            business={biz}
            colors={biz.brand_colors}
            onImageSelected={() => setNotice("Fotoğraf seçildi; video için üstteki «Video» sekmesini kullanın.")}
            onContentSaved={() => setNotice("Klip kütüphaneye kaydedildi.")}
          />
        ) : (
          <p className="text-sm text-muted">Marka yükleniyor…</p>
        )}
        {notice && <Callout tone="success" className="mt-3">{notice}</Callout>}
      </SectionCard>
      <Callout tone="info">
        Video dosyası uygulama içinde kurgulanmaz: senaryoyu ve klipleri kullanarak telefonunuzdaki kurgu uygulamasında birleştirirsiniz.
      </Callout>
    </div>
  );
}

function hasVideoSignature(bytes: Uint8Array): boolean {
  const mp4 = bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  const webm = bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return mp4 || webm;
}

/** Kendi videonu yükle: önizle, müzik notu ekle, kütüphaneye kaydet. */
function VideoOwn() {
  const { activeBusinessId } = useBusinessContext();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [music, setMusic] = useState<MusicChoice>({ mode: "none" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setSaved(false);
    if (!["video/mp4", "video/webm"].includes(f.type)) {
      setError("Video MP4 veya WebM olmalı.");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setError("Video 50 MB'den küçük olmalı.");
      return;
    }
    const head = new Uint8Array(await f.slice(0, 16).arrayBuffer());
    if (!hasVideoSignature(head)) {
      setError("Dosya geçerli bir video gibi görünmüyor.");
      return;
    }
    setFile(f);
    setUrl(URL.createObjectURL(f));
  }

  async function save() {
    if (!file || !activeBusinessId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const biz = await businessStore.get(activeBusinessId);
      if (!biz) throw new Error("Marka bulunamadı.");
      const ext = file.type === "video/webm" ? "webm" : "mp4";
      const path = `${activeBusinessId}/${crypto.randomUUID()}.${ext}`;
      const sb = getSupabase();
      const up = await sb.storage.from("visuals").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error("Video yüklenemedi. Lütfen tekrar deneyin.");
      const safeName = file.name.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 80);
      const { error: insertError } = await sb.from("contents").insert({
        business_id: activeBusinessId,
        prompt: `Kendi videom · ${safeName}`.slice(0, 500),
        language: biz.content_language,
        caption: music.mode === "none" ? null : `Müzik notu: ${music.mode === "own" ? "kendi müziğim" : music.mood ?? "önerilen tarz"}`,
        hashtags: [],
        visual_url: path,
        visual_type: "video",
        status: "draft",
      });
      if (insertError) {
        await sb.storage.from("visuals").remove([path]);
        throw new Error("Video kaydı oluşturulamadı.");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Kendi videom" description="Hazır videonuzu yükleyin; önizleyin ve kütüphaneye ekleyin.">
        <div className="space-y-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong hover:bg-surface-2">
            <IconVideo className="h-4 w-4 text-muted" />
            Video seç
            <input type="file" accept="video/mp4,video/webm" onChange={onFile} className="sr-only" aria-label="Video seç" />
          </label>
          <p className={hintClass}>MP4 veya WebM · en fazla 50 MB. Dikey (9:16) videolar Reels ve hikâye için en uygunudur.</p>
          {file && url && (
            <video src={url} controls playsInline preload="metadata" className="mx-auto max-h-[28rem] w-full max-w-xs rounded-2xl border border-line bg-black" />
          )}
        </div>
      </SectionCard>
      <MusicPicker onChange={setMusic} />
      {error && <Callout tone="error">{error}</Callout>}
      {saved && (
        <Callout tone="success">
          Video kütüphaneye taslak olarak eklendi. <Link href={contentsHref()} className="font-semibold underline">İçeriklere git →</Link>
        </Callout>
      )}
      <Button type="button" onClick={save} disabled={!file || busy || saved}>
        <IconLibrary />
        {busy ? "Yükleniyor…" : "Kütüphaneye ekle"}
      </Button>
    </div>
  );
}

/** Yalnız video: yapay zekâ ile (görsel + metin), kendi videon ve senaryo/klip yardımcısı. */
export function VideoStudio() {
  const params = useSearchParams();
  const contentId = params.get("content") ?? "";
  const step = params.get("adim");
  const view = step === "kendi" ? "kendi" : "senaryo";
  return (
    <div className="space-y-5">
      <BackToHub label="Video" />
      <Pills
        items={[
          { href: modeHref("video", { step: "kendi" }), label: "Kendi videom", active: view === "kendi" },
          { href: modeHref("video", { step: "senaryo" }), label: "Senaryo", active: view === "senaryo" },
        ]}
      />
      {view === "kendi" && <VideoOwn />}
      {view === "senaryo" && (step === "klip" && contentId ? <VideoClips contentId={contentId} /> : <Generator mode="video" />)}
    </div>
  );
}

/** Yorum / DM yanıt asistanı: gelen mesajı yapıştır, marka sesiyle 3 yanıt al. */
export function ReplyStudio() {
  const { activeBusinessId } = useBusinessContext();
  const [source, setSource] = useState<ReplySource>("yorum");
  const [goal, setGoal] = useState<ReplyGoal>("tesekkur");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replies, setReplies] = useState<ReplyOption[]>([]);

  async function run() {
    if (!activeBusinessId || busy || message.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postApi<{ replies: ReplyOption[] }>("/api/reply", { businessId: activeBusinessId, message: message.trim(), source, goal });
      setReplies(res.replies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yanıt hazırlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <BackToHub label="Yanıtla" />
      <SectionCard title="Gelen mesaj" description="Yanıtlamak istediğiniz yorumu ya da mesajı yapıştırın.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mesaj türü">
            {REPLY_SOURCES.map((s) => (
              <Chip key={s.id} active={source === s.id} onClick={() => setSource(s.id)}>{s.label}</Chip>
            ))}
          </div>
          <textarea className={cx(inputClass, "min-h-28 resize-y")} rows={4} maxLength={800} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Örn. Ekran değişimi kaç tl? Ne kadar sürer?" aria-label="Gelen mesaj" />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Yanıt amacı">
            {REPLY_GOALS.map((g) => (
              <Chip key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>{g.label}</Chip>
            ))}
          </div>
          {error && <Callout tone="error">{error}</Callout>}
          <Button type="button" onClick={run} disabled={busy || message.trim().length < 2 || !activeBusinessId}>
            {busy ? "Hazırlanıyor…" : "Yanıt öner"}
          </Button>
        </div>
      </SectionCard>
      {replies.length > 0 && (
        <ul className="space-y-2.5" aria-label="Yanıt seçenekleri">
          {replies.map((r) => (
            <li key={r.label + r.text} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Tag>{r.label}</Tag>
                <CopyButton text={r.text} label="Kopyala" />
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink">{r.text}</p>
            </li>
          ))}
          <li className="text-[11px] text-faint">Yanıtı kopyalayıp ilgili platformda siz gönderirsiniz; fiyat ve tarih gibi ayrıntıları göndermeden önce kontrol edin.</li>
        </ul>
      )}
    </div>
  );
}
