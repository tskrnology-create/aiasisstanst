"use client";

// İçerikler: aynı içerik havuzunun iki görünümü — Liste (düzenle/onayla/kopyala) ve Takvim (planla/işaretle).

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { contentsHref, type ContentsView } from "@/lib/routes";
import Library from "./Library";
import Calendar from "./Calendar";
import { cx } from "./Ui";

const VIEWS: ReadonlyArray<{ id: ContentsView; label: string }> = [
  { id: "liste", label: "Liste" },
  { id: "takvim", label: "Takvim" },
];

export default function ContentsHub() {
  const params = useSearchParams();
  const view: ContentsView = params.get("gorunum") === "takvim" ? "takvim" : "liste";
  const contentId = params.get("content") ?? undefined;
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Görünüm" className="inline-flex rounded-xl border border-line bg-surface-2/80 p-1">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            href={contentsHref({ view: v.id, contentId })}
            replace
            className={cx(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition",
              view === v.id ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>
      {view === "liste" ? <Library /> : <Calendar />}
    </div>
  );
}
