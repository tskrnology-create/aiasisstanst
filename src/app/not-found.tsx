import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
      <p className="text-4xl font-bold text-brand dark:text-brand-strong">404</p>
      <h1 className="text-xl font-semibold text-ink">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-ink">
        Panele dön
      </Link>
    </div>
  );
}
