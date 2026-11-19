"use client";

// Ücretsiz stok fotoğraf (Pexels) arama ve seçme paneli.

import { useState } from "react";
import { postApi, loadImage } from "@/lib/api-client";
import type { FormatId } from "@/lib/visual-templates";
import type { StockPhoto } from "@/lib/stock";
import { Button, Callout, hintClass, inputClass } from "../Ui";
import { IconSearch, IconSparkles } from "../Icons";

export default function StockPanel({
  format,
  topic,
  disabled,
  onPick,
}: {
  format: FormatId;
  /** "İçeriğe göre öner" için konu (seçili içeriğin istemi ya da görsel yazısı) */
  topic: string;
  disabled?: boolean;
  onPick: (img: HTMLImageElement, photo: StockPhoto) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setBusy(false);
    }
  }

  async function search(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const q = (override ?? query).trim();
    if (q.length < 2) return setError("Aranacak bir kelime yazın.");
    await run(async () => {
      const body = await postApi<{ photos?: StockPhoto[] }>("/api/stock", {
        action: "search",
        query: q,
        orientation: format === "post" ? "square" : "portrait",
      });
      const photos = body.photos ?? [];
      setResults(photos);
      if (photos.length === 0) setError("Sonuç bulunamadı. Daha genel bir kelime deneyin.");
    });
  }

  async function suggest() {
    const t = topic.trim();
    if (t.length < 3) return setError("Önce bir içerik seçin veya görseldeki yazıyı girin.");
    const q = await run(async () => {
      const body = await postApi<{ query: string }>("/api/stock", { action: "suggest", topic: t.slice(0, 300) });
      return body.query;
    });
    if (q) {
      setQuery(q);
      await search(undefined, q); // öneri sonrası doğrudan ara: tek tık
    }
  }

  async function pick(photo: StockPhoto) {
    await run(async () => {
      const body = await postApi<{ image: string }>("/api/stock", { action: "image", url: photo.full });
      onPick(await loadImage(body.image), photo);
    });
  }

  const off = busy || disabled;

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
          placeholder="Örn. autumn sale (İngilizce daha iyi sonuç verir)"
          aria-label="Fotoğraf ara"
        />
        <Button type="submit" variant="secondary" disabled={off} aria-label="Ara">
          <IconSearch />
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="soft" size="sm" disabled={off} onClick={suggest}>
          <IconSparkles className="h-3.5 w-3.5" />İçeriğe göre öner
        </Button>
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted underline underline-offset-4"
        >
          Fotoğraflar Pexels&apos;ten
        </a>
      </div>
      {busy && <p className={hintClass}>Bekleyin…</p>}
      {error && <Callout tone="error">{error}</Callout>}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2" role="list" aria-label="Fotoğraf sonuçları">
          {results.map((ph) => (
            <button
              key={ph.id}
              type="button"
              role="listitem"
              disabled={off}
              onClick={() => pick(ph)}
              className="overflow-hidden rounded-lg border border-line transition hover:border-brand disabled:opacity-60"
              title={`${ph.photographer} / Pexels`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.thumb} alt={ph.alt || "Stok fotoğraf"} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
