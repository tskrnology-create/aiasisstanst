"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Sayfa hatası:", error.digest ?? error.name);
  }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
      <h1 className="text-xl font-semibold text-ink">Bir şeyler ters gitti</h1>
      <p className="text-sm text-muted">Sayfa yüklenemedi. Verileriniz güvende; tekrar deneyebilirsiniz.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-10 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-ink"
      >
        Tekrar dene
      </button>
    </div>
  );
}
