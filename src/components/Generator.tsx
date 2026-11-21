"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { TONES, type Tone } from "@/lib/tones";
import { CONTENT_KINDS, PLATFORMS, type ContentKind, type PlatformId } from "@/lib/content-kinds";
import { postApi } from "@/lib/api-client";
import type { ContentIdea } from "@/lib/brand-prompt";
import { MANUAL_SHARE_NOTE } from "@/lib/share-links";
import {
  Callout,
  Chip,
  LinkButton,
  SectionCard,
  Segmented,
  Tag,
  cx,
  hintClass,
  inputClass,
} from "./Ui";
import { CopyButton } from "./ShareControls";
import { IconCalendar, IconImage, IconLayers, IconSparkles, IconWand } from "./Icons";
import { useBusinessContext } from "./BusinessContext";
import { MusicCard, PostChecklist, PostPackageCard, type GenMeta, type GeneratedRow } from "./PackageView";
import { contentsHref, studioHref } from "@/lib/routes";
import { POST_FORMATS, formatsForPlatform, type PostFormat } from "@/lib/post-formats";


const MAX_PROMPT_LEN = 500;

type BlockId = "post_text" | "caption" | "hashtags" | "ad_text" | "story_text";

const BLOCKS: Array<{ id: BlockId; label: string; get: (r: GeneratedRow) => string }> = [
  { id: "post_text", label: "Gönderi", get: (r) => r.post_text ?? "" },
  { id: "caption", label: "Açıklama", get: (r) => r.caption ?? "" },
  { id: "hashtags", label: "Hashtag", get: (r) => r.hashtags.join(" ") },
  { id: "ad_text", label: "Reklam", get: (r) => r.ad_text ?? "" },
  { id: "story_text", label: "Hikâye", get: (r) => r.story_text ?? "" },
];

const BLOCK_OPTIONS = BLOCKS.map((b) => ({ value: b.id, label: b.label }));

function allText(row: GeneratedRow): string {
  return BLOCKS.map((b) => {
    const value = b.get(row).trim();
    return value ? `## ${b.label}\n${value}` : "";
  })
    .filter(Boolean)
    .join("\n\n");
}

function PromptIdeas({ onPick }: { onPick: (text: string) => void }) {
  const ideas = [
    "Bu haftaki kampanyamızı duyuran, öne çıkan bir faydayı anlatan bir gönderi hazırla.",
    "Yeni ürünümüzü tanıtan, soru ile başlayan ve yoruma davet eden bir içerik üret.",
    "Müşteri yorumunu öne çıkaran, güven veren kısa bir tanıtım metni yaz.",
    "Hafta sonu için harekete geçiren bir hikâye (story) metni hazırla.",
  ];
  return (
    <div className="space-y-2">
      <p className={hintClass}>Örnek bir istekle başlayın, sonra kendiniz düzenleyin:</p>
      <div className="flex flex-wrap gap-1.5">
        {ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => onPick(idea)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-xs text-muted transition hover:border-brand hover:text-ink"
          >
            {idea.length > 52 ? idea.slice(0, 52) + "…" : idea}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ row, headline }: { row: GeneratedRow; headline?: string }) {
  if (row.package) return <PostPackageCard row={row} pkg={row.package} headline={headline} />;
  return <LegacyResultCard row={row} headline={headline} />;
}

function LegacyResultCard({ row, headline }: { row: GeneratedRow; headline?: string }) {
  const [tab, setTab] = useState<BlockId>("post_text");
  const block = BLOCKS.find((b) => b.id === tab) ?? BLOCKS[0];
  const value = block.get(row);

  return (
    <SectionCard
      title={headline ?? (row.tone ? `Ton: ${row.tone}` : "Marka diline göre")}
      description={row.tone ? headline ? `Alternatif · ${row.tone} tonu` : undefined : undefined}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="ok">Kütüphaneye kaydedildi</Tag>
          <CopyButton text={allText(row)} label="Tümünü kopyala" />
        </div>
      }
    >
      <div className="space-y-4">
        <Segmented
          ariaLabel="Metin türü"
          value={tab}
          onChange={setTab}
          options={BLOCK_OPTIONS}
          className="no-scrollbar w-full overflow-x-auto"
        />
        <div className="space-y-3">
          {value.trim() ? (
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2/70 p-4 text-sm leading-relaxed text-ink">
              {value}
            </p>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-muted">
              Bu alan bu içerikte üretilmedi. Başka bir sekme seçin veya içeriği yeniden üretin.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={value} label={`${block.label} metnini kopyala`} />
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
      </div>
    </SectionCard>
  );
}

export default function Generator() {
  const { activeBusinessId } = useBusinessContext();
  return <GeneratorWorkspace key={activeBusinessId ?? "no-brand"} businessId={activeBusinessId} />;
}

function GeneratorWorkspace({ businessId }: { businessId: string | null }) {
  // "Yeniden kullan" bağlantısı ?prompt=... ile gelir. Bu bileşen yalnızca
  // oturum açıldıktan sonra (istemcide) çizildiği için window güvenle okunur.
  const [prompt, setPrompt] = useState(() => {
    if (typeof window === "undefined") return "";
    const q = new URLSearchParams(window.location.search).get("prompt");
    return q ? q.slice(0, MAX_PROMPT_LEN) : "";
  });
  const [tone, setTone] = useState<Tone | "">("");
  const [kind, setKind] = useState<ContentKind | "">("");
  const [format, setFormat] = useState<PostFormat | "">("");
  const [platform, setPlatform] = useState<PlatformId | "">("");
  const [ideas, setIdeas] = useState<ContentIdea[] | null>(null);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [main, setMain] = useState<GeneratedRow | null>(null);
  const [meta, setMeta] = useState<GenMeta>({ kind: "", platform: "", tone: "" });
  const [alternatives, setAlternatives] = useState<GeneratedRow[]>([]);

  async function generate(opts: { prompt: string; tone: Tone | ""; parentId?: string }) {
    if (!businessId) {
      setError("İçerik üretmek için önce aktif bir marka seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: opts.prompt,
          businessId,
          tone: opts.tone || undefined,
          parentId: opts.parentId,
          kind: kind || undefined,
          format: format || undefined,
          platform: platform || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Üretim başarısız oldu.");
      const row = body.content as GeneratedRow;
      if (opts.parentId) {
        setAlternatives((a) => [row, ...a]);
      } else {
        setMain(row);
        setMeta({ kind, platform, tone: opts.tone });
        setAlternatives([]);
        setLastPrompt(opts.prompt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setBusy(false);
    }
  }

  async function loadIdeas() {
    if (!businessId || ideasBusy) return;
    setIdeasBusy(true);
    setError(null);
    try {
      const res = await postApi<{ ideas: ContentIdea[] }>("/api/ideas", { businessId });
      setIdeas(res.ideas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fikirler alınamadı.");
    } finally {
      setIdeasBusy(false);
    }
  }

  function pickIdea(idea: ContentIdea) {
    setPrompt(idea.prompt.slice(0, MAX_PROMPT_LEN));
    if (idea.kind) setKind(idea.kind);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!businessId) {
      setError("İçerik üretmek için önce aktif bir marka seçin.");
      return;
    }
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      setError("Lütfen ne üretmek istediğinizi yazın.");
      return;
    }
    generate({ prompt: trimmed, tone });
  }

  return (
    <div className="space-y-5">
      <SectionCard
        step="Komut"
        title="Ne üretelim?"
        description="Kısa bir brief yazın; marka profilinizdeki ton, ürün ve hedef kitle otomatik eklenir."
        aside={busy ? <Tag tone="brand"><IconSparkles className="h-3 w-3" />Üretiliyor</Tag> : undefined}
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <textarea
              className={cx(inputClass, "min-h-28 resize-y text-[15px] leading-relaxed")}
              rows={4}
              maxLength={MAX_PROMPT_LEN}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Örn. Kasım ayına özel güzellik merkezimiz için indirim kampanyası oluştur."
              aria-label="İçerik isteği"
            />
            <div className="flex items-center justify-between gap-3">
              <span className={hintClass}>İpucu: hedef, tarih ve tek bir güçlü fayda yazın.</span>
              <span className="font-mono text-[11px] text-faint">
                {prompt.length}/{MAX_PROMPT_LEN}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Format</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={format === ""} onClick={() => setFormat("")}>
                Otomatik
              </Chip>
              {POST_FORMATS.filter((f) => formatsForPlatform(platform || null).includes(f.id)).map((f) => (
                <Chip key={f.id} active={format === f.id} onClick={() => setFormat(f.id)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">İçerik türü</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={kind === ""} onClick={() => setKind("")}>
                Serbest
              </Chip>
              {CONTENT_KINDS.map((k) => (
                <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
                  {k.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Platform</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={platform === ""} onClick={() => setPlatform("")}>
                Genel
              </Chip>
              {PLATFORMS.map((p) => (
                <Chip key={p.id} active={platform === p.id} onClick={() => { setPlatform(p.id); if (format && !formatsForPlatform(p.id).includes(format)) setFormat(""); }}>
                  {p.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Ton</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={tone === ""} onClick={() => setTone("")}>
                Marka diline göre
              </Chip>
              {TONES.map((t) => (
                <Chip key={t} active={tone === t} onClick={() => setTone(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          {error && <Callout tone="error">{error}</Callout>}
          {!businessId && <Callout tone="warning">İçerik üretmeden önce bir marka oluşturup seçin.</Callout>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !businessId}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-ink shadow-[0_10px_30px_-12px_var(--brand)] transition hover:bg-brand-strong active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
            >
              <IconWand className="h-4 w-4" />
              {busy ? "Üretiliyor…" : "İçerik üret"}
            </button>
            {main && (
              <LinkButton href={contentsHref()} variant="ghost" size="md">
                <IconLayers className="h-4 w-4" />
                Kütüphanede gör
              </LinkButton>
            )}
          </div>
        </form>

        {!main && (
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Ne paylaşacağını bilmiyor musun?</p>
                <p className={hintClass}>Markana ve yaklaşan özel günlere göre fikirler önerelim.</p>
              </div>
              <button
                type="button"
                onClick={loadIdeas}
                disabled={ideasBusy || !businessId}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-soft disabled:opacity-60"
              >
                <IconSparkles className="h-4 w-4 text-brand dark:text-brand-strong" />
                {ideasBusy ? "Fikirler hazırlanıyor…" : ideas ? "Yeni fikirler getir" : "Fikir öner"}
              </button>
            </div>
            {ideas && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {ideas.map((idea) => (
                  <li key={idea.title + idea.prompt}>
                    <button
                      type="button"
                      onClick={() => pickIdea(idea)}
                      className="flex h-full w-full flex-col items-start gap-1 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:border-brand hover:bg-brand-soft"
                    >
                      <span className="text-sm font-semibold text-ink">{idea.title}</span>
                      <span className="text-xs leading-relaxed text-muted">{idea.prompt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!ideas && <PromptIdeas onPick={setPrompt} />}
          </div>
        )}
      </SectionCard>

      {main && (
        <div className="space-y-5">
          <ResultCard row={main} />
          <PostChecklist row={main} platform={meta.platform} />
          {(main.package?.format === "video" || main.package?.format === "hikaye") && <MusicCard meta={meta} />}

          <SectionCard
            step="Alternatifler"
            title="Başka bir tonla dene"
            description="Aynı brief farklı bir tonla yeniden üretilir ve kütüphaneye ana içeriğin alternatifi olarak eklenir."
          >
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={busy || !lastPrompt}
                  onClick={() => generate({ prompt: lastPrompt!, tone: t, parentId: main.id })}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-soft disabled:opacity-50"
                >
                  <IconSparkles className="h-3.5 w-3.5 text-brand dark:text-brand-strong" />
                  {t}
                </button>
              ))}
            </div>
            {busy && <p className={cx(hintClass, "mt-3")}>Alternatif üretiliyor…</p>}
          </SectionCard>

          {alternatives.map((alt, i) => (
            <ResultCard key={alt.id} row={alt} headline={i === 0 ? "Son alternatif" : "Alternatif"} />
          ))}

          <Callout tone="info">{MANUAL_SHARE_NOTE}</Callout>
        </div>
      )}
    </div>
  );
}
