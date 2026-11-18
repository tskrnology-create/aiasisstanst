// Sayfa başlıkları için ortak, istemci yükü gerektirmeyen bileşen.

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand dark:text-brand-strong">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
