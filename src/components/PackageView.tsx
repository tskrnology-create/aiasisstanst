"use client";

// Paylaşım paketinin ortak görünümü: kanca/gövde/çağrı, slayt ve sahneler, paylaşım kontrolü, müzik önerisi.

import type { ContentKind, PlatformId } from "@/lib/content-kinds";
import { analyzePost } from "@/lib/platform-playbook";
import { suggestMusic } from "@/lib/music-suggestions";
import { POST_FORMATS, totalSeconds, type PostPackage } from "@/lib/post-formats";
import { contentsHref, studioHref } from "@/lib/routes";
import { LinkButton, SectionCard, Tag, cx } from "./Ui";
import { CopyButton } from "./ShareControls";
import { IconCalendar, IconImage } from "./Icons";

export interface GeneratedRow {
  id: string;
  tone: string | null;
  post_text: string | null;
  caption: string | null;
  hashtags: string[];
  ad_text: string | null;
  story_text: string | null;
  package?: PostPackage | null;
}

export interface GenMeta {
  kind: ContentKind | "";
  platform: PlatformId | "";
  tone: string;
}

export function PostChecklist({ row, platform }: { row: GeneratedRow; platform: PlatformId | "" }) {
  if (!platform) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong p-3 text-xs text-muted">
        Platform seçerseniz (Instagram, LinkedIn…) burada o platforma göre paylaşım kontrolü görünür.
      </p>
    );
  }
  const checks = analyzePost(platform, {
    body: row.caption || row.post_text || "",
    hashtags: row.hashtags,
  });
  const warnings = checks.filter((c) => c.status === "warn").length;
  return (
    <SectionCard
      title="Paylaşım kontrolü"
      description={warnings === 0 ? "Bu platform için hazır görünüyor." : `${warnings} noktaya dikkat edin.`}
    >
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className={cx(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                c.status === "ok" ? "bg-ok" : "bg-warn"
              )}
            >
              {c.status === "ok" ? "✓" : "!"}
            </span>
            <span>
              <span className="font-medium text-ink">{c.label}: </span>
              <span className="text-ink-soft">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function MusicCard({ meta }: { meta: GenMeta }) {
  const m = suggestMusic({ kind: meta.kind || null, tone: meta.tone, platform: meta.platform || null });
  return (
    <SectionCard title="Müzik önerisi" description="Video, Reels veya hikâye olarak paylaşacaksanız.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag tone="brand">{m.mood}</Tag>
          {m.genres.map((g) => (
            <Tag key={g}>{g}</Tag>
          ))}
          <Tag>
            {m.bpm[0]}–{m.bpm[1]} BPM
          </Tag>
        </div>
        <p className="text-ink-soft">{m.tip}</p>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-faint">Telifsiz kitaplıkta ara</p>
          <ul className="flex flex-wrap gap-2">
            {m.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:border-brand hover:bg-brand-soft"
                >
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-xl border border-line bg-surface-2/70 p-3 text-xs text-muted">{m.licenseNote}</p>
      </div>
    </SectionCard>
  );
}

function PackageBlock({ label, text, copy = true }: { label: string; text: string; copy?: boolean }) {
  if (!text.trim()) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
        {copy && <CopyButton text={text} label="Kopyala" />}
      </div>
      <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2/70 p-3.5 text-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}

export function PostPackageCard({ row, pkg, headline }: { row: GeneratedRow; pkg: PostPackage; headline?: string }) {
  const format = POST_FORMATS.find((f) => f.id === pkg.format);
  const shareAll = [row.post_text ?? "", pkg.hashtags.join(" ")].filter((x) => x.trim()).join("\n\n");
  return (
    <SectionCard
      title={headline ?? format?.label ?? "Paylaşım paketi"}
      description={row.tone ? `Ton: ${row.tone}` : undefined}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="ok">Kütüphaneye kaydedildi</Tag>
          <CopyButton text={shareAll} label="Paylaşım metnini kopyala" />
        </div>
      }
    >
      <div className="space-y-4">
        <PackageBlock label="1 · Kanca" text={pkg.hook} />
        <PackageBlock label="2 · Gövde" text={pkg.body} />
        <PackageBlock label="3 · Çağrı" text={pkg.cta} />
        {pkg.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pkg.hashtags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}

        {pkg.slides.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              {pkg.format === "hikaye" ? "Hikâye kareleri" : "Slaytlar"} ({pkg.slides.length})
            </p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {pkg.slides.map((s, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface p-3.5">
                  <p className="text-[11px] font-semibold text-brand dark:text-brand-strong">
                    {i === 0 ? "Kapak" : i === pkg.slides.length - 1 ? `Slayt ${i + 1} · Çağrı` : `Slayt ${i + 1}`}
                  </p>
                  {s.title && <p className="mt-0.5 text-sm font-semibold text-ink">{s.title}</p>}
                  {s.text && <p className="mt-0.5 text-sm text-ink-soft">{s.text}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {pkg.scenes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              Sahneler · toplam {totalSeconds(pkg.scenes)} sn
            </p>
            <ol className="space-y-2">
              {pkg.scenes.map((sc, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-line bg-surface p-3.5">
                  <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand dark:text-brand-strong">
                    {sc.seconds} sn
                  </span>
                  <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="text-ink">{sc.visual}</p>
                    {sc.on_screen_text && <p className="text-ink-soft">Ekranda yazı: “{sc.on_screen_text}”</p>}
                    {sc.voiceover && <p className="text-muted">Ses: {sc.voiceover}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <PackageBlock label="Görsel fikri" text={pkg.visual_brief} />
        <PackageBlock label="Alternatif metin (erişilebilirlik)" text={pkg.alt_text} />

        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={contentsHref({ contentId: row.id })} variant="secondary" size="sm">
            İçeriği düzenle
          </LinkButton>
          <LinkButton href={studioHref({ step: "gorsel", contentId: row.id })} variant="primary" size="sm">
            <IconImage className="h-3.5 w-3.5" />
            Sonraki adım: Görsel
          </LinkButton>
          <LinkButton href={studioHref({ step: "planla", contentId: row.id })} variant="ghost" size="sm">
            <IconCalendar className="h-3.5 w-3.5" />
            Doğrudan planla
          </LinkButton>
        </div>
      </div>
    </SectionCard>
  );
}

