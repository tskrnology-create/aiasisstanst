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
import { STUDIO_MODES, modeHref, type StudioMode } from "@/lib/routes";
import { useBusinessContext } from "./BusinessContext";
import Generator from "./Generator";
import VisualCreator from "./VisualCreator";
import MediaPicker from "./MediaPicker";
import { CopyButton } from "./ShareControls";
import { Callout, SectionCard, Tag, cx } from "./Ui";
import { IconArrowLeft } from "./Icons";

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

/** Yalnız metin: metni üret; isteğe bağlı olarak marka renkli şablon kartına dök. */
export function TextStudio() {
  const params = useSearchParams();
  const contentId = params.get("content") ?? "";
  const card = params.get("adim") === "kart" && contentId !== "";
  return (
    <div>
      <BackToHub label="Metin" />
      <Pills
        items={[
          { href: modeHref("metin", { contentId: contentId || undefined }), label: "Yaz", active: !card },
          { href: modeHref("metin", { step: "kart", contentId }), label: "Marka kartı", active: card, disabled: !contentId },
        ]}
      />
      {card ? <VisualCreator mode="metin" /> : <Generator mode="metin" />}
    </div>
  );
}

/** Yalnız görsel: üret / yükle / Pixabay → şablona yerleştir. */
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

/** Yalnız video: senaryo → sahne listesi ve stok klipler. */
export function VideoStudio() {
  const params = useSearchParams();
  const contentId = params.get("content") ?? "";
  const clips = params.get("adim") === "klip" && contentId !== "";
  return (
    <div>
      <BackToHub label="Video" />
      <Pills
        items={[
          { href: modeHref("video", { contentId: contentId || undefined }), label: "Senaryo", active: !clips },
          { href: modeHref("video", { step: "klip", contentId }), label: "Sahneler ve klipler", active: clips, disabled: !contentId },
        ]}
      />
      {clips ? <VideoClips contentId={contentId} /> : <Generator mode="video" />}
    </div>
  );
}

