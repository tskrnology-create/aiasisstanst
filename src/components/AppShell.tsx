"use client";

// Uygulama kabuğu: masaüstünde sol menü, mobilde üst başlık + alt sekme çubuğu.
// Hesap bilgisi ve tema tercihi burada tutulur; sayfalar yalnız içeriği çizer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { cx } from "./Ui";
import {
  IconBuilding,
  IconCalendar,
  IconImage,
  IconLibrary,
  IconLogout,
  IconMoon,
  IconSparkles,
  IconSun,
} from "./Icons";

const NAV = [
  { href: "/", label: "Marka", short: "Marka", icon: IconBuilding, description: "İşletme profili" },
  { href: "/uret", label: "İçerik üret", short: "Üret", icon: IconSparkles, description: "Yapay zekâ metinleri" },
  { href: "/gorsel", label: "Görsel", short: "Görsel", icon: IconImage, description: "Tasarım stüdyosu" },
  { href: "/takvim", label: "Takvim", short: "Takvim", icon: IconCalendar, description: "Paylaşım planı" },
  { href: "/kutuphane", label: "Kütüphane", short: "Kütüphane", icon: IconLibrary, description: "Tüm içerikler" },
] as const;

const THEME_KEY = "ai-asisst-theme";

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--accent))] text-[13px] font-extrabold text-white shadow-[0_8px_20px_-10px_var(--brand)]"
      >
        Aı
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-ink">Aı Asisst</span>
          <span className="block truncate text-[11px] text-muted">Sosyal medya stüdyosu</span>
        </span>
      )}
    </span>
  );
}

function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      window.localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {
      /* tercih kalıcı olmasa da tema anında uygulanır */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Açık ve koyu tema arasında geçiş yap"
      title="Tema"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-line-strong hover:text-ink"
    >
      <IconSun className="hidden h-4 w-4 dark:block" />
      <IconMoon className="h-4 w-4 dark:hidden" />
    </button>
  );
}

function useSession() {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  return session;
}

function AccountBlock({ vertical }: { vertical: boolean }) {
  const session = useSession();
  if (!session?.user) {
    return (
      <p className={cx("text-xs text-muted", vertical ? "px-1" : "text-right")}>
        Oturum açılmadı
      </p>
    );
  }
  const email = session.user.email;
  const label = email ?? "Hesabım";
  const initials = email ? email.slice(0, 2) : "Aı";
  return (
    <div className={cx("flex items-center gap-2.5", vertical ? "w-full" : "")}>
      <span
        aria-hidden="true"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold uppercase text-brand dark:text-brand-strong"
      >
        {initials}
      </span>
      <div className={cx("min-w-0", vertical && "flex-1")}>
        <p className="truncate text-xs font-medium text-ink">{label}</p>
        <p className="text-[11px] text-muted">Hesap</p>
      </div>
      <button
        type="button"
        onClick={() => getSupabase().auth.signOut()}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-danger-soft hover:text-danger"
      >
        <IconLogout className="h-3.5 w-3.5" />
        Çıkış
      </button>
    </div>
  );
}

function ManualBadge() {
  return (
    <div className="rounded-xl border border-line bg-surface-2/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand dark:text-brand-strong">
        Manuel paylaşım
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        İçerikler platformlara otomatik gönderilmez. Takvimden kopyalayıp kendiniz
        yayımlarsınız.
      </p>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = NAV.find((item) => item.href === pathname);

  return (
    <div className="min-h-screen">
      {/* Mobil üst başlık */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Wordmark />
          <ThemeToggle />
        </div>
      </header>

      {/* Masaüstü kenar menüsü */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-line bg-surface/70 px-4 py-5 backdrop-blur-xl md:flex">
        <Link href="/" className="px-1" aria-label="Aı Asisst ana sayfa">
          <Wordmark />
        </Link>

        <nav className="mt-7 flex-1" aria-label="Ana menü">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
            Çalışma alanı
          </p>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-brand-soft font-semibold text-brand dark:text-brand-strong"
                        : "text-muted hover:bg-surface-2 hover:text-ink"
                    )}
                  >
                    <span
                      className={cx(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition",
                        active
                          ? "border-brand/30 bg-surface text-brand dark:text-brand-strong"
                          : "border-line bg-surface/60 text-muted group-hover:text-ink"
                      )}
                    >
                      <Icon />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{item.label}</span>
                      <span className="block truncate text-[11px] font-normal text-faint">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3">
          <ManualBadge />
          <AccountBlock vertical />
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/80 px-3 py-2">
            <span className="text-[11px] font-medium text-muted">Görünüm</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* İçerik */}
      <div className="md:pl-[260px]">
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8 lg:px-8">
          {current && (
            <p className="sr-only" aria-live="polite">
              Şu anki sayfa: {current.label}
            </p>
          )}
          <div key={pathname} className="animate-rise">{children}</div>
        </main>
      </div>

      {/* Mobil alt sekme çubuğu */}
      <nav
        aria-label="Ana menü"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="no-scrollbar flex items-stretch justify-between overflow-x-auto px-1.5 py-1.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition",
                    active ? "bg-brand-soft text-brand dark:text-brand-strong" : "text-muted"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
