// Yasal sayfalar için ortak, istemci yükü gerektirmeyen iskelet.
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
        <p className="text-xs text-muted">Son güncelleme: {updated}</p>
      </header>
      <div className="space-y-5 text-sm leading-relaxed text-ink-soft [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
