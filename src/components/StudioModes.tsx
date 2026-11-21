"use client";

// Bağımsız üretim yapıları: Metin, Görsel, Video ve hepsini birleştiren "Metin + Görsel".
// Her yapı kendi başına çalışır; birlikte kullanmak isteyen Metin + Görsel yapısını seçer.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import { suggestMusic } from "@/lib/music-suggestions";
import { totalSeconds, type PostPackage } from "@/lib/post-formats";
import { STUDIO_MODES, contentsHref, modeHref, type StudioMode } from "@/lib/routes";
import { postApi, loadImage } from "@/lib/api-client";
import { useBusinessContext } from "./BusinessContext";
import Generator from "./Generator";
import VisualCreator from "./VisualCreator";
import MediaPicker from "./MediaPicker";
import { CopyButton } from "./ShareControls";
import { Button, Callout, Chip, SectionCard, Tag, cx, hintClass, inputClass } from "./Ui";
import MusicPicker, { type MusicChoice } from "./MusicPicker";
import { IconArrowLeft, IconImage, IconLibrary, IconVideo, IconClose } from "./Icons";

const MODE_ICON: Record<StudioMode, string> = { metin: "Aa", gorsel: "▣", birlikte: "Aa▣", video: "▶" };

export function StudioHub() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Ne yapmak istediğinizi seçin. Her yapı tek başına çalışır; metin ve görseli birlikte istiyorsanız ortadaki yapıyı seçin.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {STUDIO_MODES.map((m) => (
          <li key={m.id}>
            <Link
              href={m.href}
              className="flex h-full items-start gap-3.5 rounded-3xl border border-line bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand"
            >
              <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-sm font-extrabold text-brand">
                {MODE_ICON[m.id]}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-ink">{m.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{m.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
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

/** Kendi yazdığı metni kütüphaneye ekler (yapay zekâ kullanmadan). */
function OwnText() {
  const { activeBusinessId } = useBusinessContext();
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (!activeBusinessId || busy) return;
    const body = text.trim();
    if (body.length < 3) {
      setMsg({ ok: false, text: "Önce metni yazın." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const biz = await businessStore.get(activeBusinessId);
      if (!biz) throw new Error("Marka bulunamadı.");
      const hashtags = [...new Set(tags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`).slice(0, 60)))].slice(0, 30);
      const { error } = await getSupabase().from("contents").insert({
        business_id: activeBusinessId,
        prompt: "Kendi metnim",
        language: biz.content_language,
        post_text: body,
        hashtags,
        status: "draft",
      });
      if (error) throw new Error(error.message);
      setText("");
      setTags("");
      setMsg({ ok: true, text: "Metin kütüphaneye taslak olarak eklendi." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Kendi metnim" description="Yapay zekâ kullanmadan kendi yazdığınız metni kaydedin; sonra planlayın.">
      <div className="space-y-3">
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
            {msg.text} {msg.ok && <Link href={contentsHref()} className="font-semibold underline">İçeriklere git →</Link>}
          </Callout>
        )}
        <Button type="button" onClick={save} disabled={busy || !activeBusinessId}>
          <IconLibrary />
          {busy ? "Kaydediliyor…" : "Kütüphaneye ekle"}
        </Button>
      </div>
    </SectionCard>
  );
}

/** Yalnız metin: şablon yok. Yapay zekâyla yaz ya da kendi metnini ekle; isteğe bağlı müzik notu. */
export function TextStudio() {
  const params = useSearchParams();
  const own = params.get("adim") === "kendi";
  return (
    <div className="space-y-5">
      <BackToHub label="Metin" />
      <Pills
        items={[
          { href: modeHref("metin"), label: "Yapay zekâ ile yaz", active: !own },
          { href: modeHref("metin", { step: "kendi" }), label: "Kendi metnim", active: own },
        ]}
      />
      {own ? <OwnText /> : <Generator mode="metin" />}
      <MusicPicker />
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

const MIN_IMAGES = 3;
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

interface Pic {
  id: number;
  name: string;
  url: string;
}

/** Yapay zekâ ile video: en az 3 görsel + metin. Servis henüz bağlı değil; arayüz ve istek hazır. */
function VideoAi() {
  const { activeBusinessId } = useBusinessContext();
  const [pics, setPics] = useState<Pic[]>([]);
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState<"9:16" | "16:9">("9:16");
  const [music, setMusic] = useState<MusicChoice>({ mode: "none" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    return () => pics.forEach((p) => URL.revokeObjectURL(p.url));
    // yalnızca ekrandan çıkarken kalan adresler serbest bırakılır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    const next: Pic[] = [];
    for (const f of files) {
      if (pics.length + next.length >= MAX_IMAGES) {
        setError(`En fazla ${MAX_IMAGES} görsel ekleyebilirsiniz.`);
        break;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
        setError("Görseller PNG, JPG veya WebP olmalı.");
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setError("Her görsel 4 MB'den küçük olmalı.");
        continue;
      }
      const url = URL.createObjectURL(f);
      try {
        await loadImage(url);
        counter.current += 1;
        next.push({ id: counter.current, name: f.name, url });
      } catch {
        URL.revokeObjectURL(url);
        setError("Bir görsel okunamadı.");
      }
    }
    if (next.length) setPics((cur) => [...cur, ...next]);
  }

  function remove(id: number) {
    setPics((cur) => {
      const hit = cur.find((p) => p.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return cur.filter((p) => p.id !== id);
    });
  }

  function move(id: number, dir: -1 | 1) {
    setPics((cur) => {
      const i = cur.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const copy = [...cur];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const ready = pics.length >= MIN_IMAGES && text.trim().length >= 10;

  async function submit() {
    if (!ready || !activeBusinessId || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await postApi("/api/video/generate", { businessId: activeBusinessId, text: text.trim(), imageCount: pics.length, ratio, music: music.mode });
      setInfo("Video hazırlanıyor.");
    } catch (err) {
      setInfo(err instanceof Error ? err.message : "Video servisi yanıt vermedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard step="1" title="Görseller" description={`En az ${MIN_IMAGES}, en fazla ${MAX_IMAGES} görsel. Sıra videodaki sıradır.`}>
        <ul className="grid grid-cols-3 gap-2" aria-label="Seçilen görseller">
          {pics.map((p, i) => (
            <li key={p.id} className="relative overflow-hidden rounded-2xl border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Görsel ${i + 1}: ${p.name}`} className="aspect-square w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
              <button type="button" onClick={() => remove(p.id)} aria-label={`Görsel ${i + 1} kaldır`} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white">
                <IconClose className="h-3 w-3" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-white">
                <button type="button" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label={`Görsel ${i + 1} öne al`} className="px-1 text-sm disabled:opacity-30">←</button>
                <button type="button" onClick={() => move(p.id, 1)} disabled={i === pics.length - 1} aria-label={`Görsel ${i + 1} sona al`} className="px-1 text-sm disabled:opacity-30">→</button>
              </div>
            </li>
          ))}
          {pics.length < MAX_IMAGES && (
            <li>
              <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border border-dashed border-line-strong text-center text-xs font-semibold text-muted hover:border-brand hover:text-brand">
                <span>
                  <IconImage className="mx-auto mb-1 h-5 w-5" />
                  Görsel ekle
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFiles} className="sr-only" aria-label="Görsel seç" />
              </label>
            </li>
          )}
        </ul>
        <p className={cx(hintClass, "mt-2")}>{pics.length}/{MIN_IMAGES} zorunlu görsel{pics.length >= MIN_IMAGES ? " ✓" : ""} · PNG, JPG, WebP · 4 MB</p>
      </SectionCard>

      <SectionCard step="2" title="Metin" description="Videoda anlatılacak mesaj. Marka profilinizdeki bilgilerle birlikte kullanılır.">
        <textarea className={cx(inputClass, "min-h-28 resize-y")} rows={4} maxLength={800} value={text} onChange={(e) => setText(e.target.value)} placeholder="Örn. Ekran değişimi 30 dakikada, 6 ay garantili. Hemen mesaj atın." aria-label="Video metni" />
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Video oranı">
          <span className="text-xs font-semibold text-muted">Oran</span>
          <Chip active={ratio === "9:16"} onClick={() => setRatio("9:16")}>Reels / Hikâye 9:16</Chip>
          <Chip active={ratio === "16:9"} onClick={() => setRatio("16:9")}>Yatay 16:9</Chip>
        </div>
      </SectionCard>

      <MusicPicker onChange={setMusic} />

      {error && <Callout tone="error">{error}</Callout>}
      {info && <Callout tone="info">{info}</Callout>}
      <Callout tone="warning">Yapay zekâ video servisi henüz bağlı değil; düğme şimdilik yalnızca isteğinizi doğrular.</Callout>
      <Button type="button" onClick={submit} disabled={!ready || busy || !activeBusinessId} className="w-full sm:w-auto">
        <IconVideo />
        {busy ? "Gönderiliyor…" : "Video üret"}
      </Button>
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
  const view = step === "kendi" ? "kendi" : step === "senaryo" || step === "klip" ? "senaryo" : "ai";
  return (
    <div className="space-y-5">
      <BackToHub label="Video" />
      <Pills
        items={[
          { href: modeHref("video"), label: "Yapay zekâ ile", active: view === "ai" },
          { href: modeHref("video", { step: "kendi" }), label: "Kendi videom", active: view === "kendi" },
          { href: modeHref("video", { step: "senaryo" }), label: "Senaryo", active: view === "senaryo" },
        ]}
      />
      {view === "ai" && <VideoAi />}
      {view === "kendi" && <VideoOwn />}
      {view === "senaryo" && (step === "klip" && contentId ? <VideoClips contentId={contentId} /> : <Generator mode="video" />)}
    </div>
  );
}
