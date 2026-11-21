"use client";

// Uygulama kabuğu: masaüstünde sol menü, mobilde üst başlık + alt sekme çubuğu.
// Hesap bilgisi ve tema tercihi burada tutulur; sayfalar yalnız içeriği çizer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { BusinessContextProvider, useBusinessContext, type BusinessOption } from "./BusinessContext";
import { cx, selectClass } from "./Ui";
import {
  IconBuilding,
  IconLayers,
  IconLibrary,
  IconLogout,
  IconMoon,
  IconSparkles,
  IconSun,
} from "./Icons";

const NAV = [
  { href: "/", label: "Bugün", short: "Bugün", icon: IconLayers, description: "Sıradaki işler" },
  { href: "/studyo", label: "Stüdyo", short: "Stüdyo", icon: IconSparkles, description: "Yaz, görsel hazırla, planla" },
  { href: "/icerikler", label: "İçerikler", short: "İçerikler", icon: IconLibrary, description: "Liste ve takvim" },
  { href: "/marka", label: "Marka", short: "Marka", icon: IconBuilding, description: "Profil ve sosyal hesaplar" },
] as const;

const THEME_KEY = "ai-asisst-theme";
const BUSINESS_SELECTION_KEY = "ai-asisst-active-business";

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
        <Link href="/hesap" className="block truncate text-xs font-medium text-ink hover:underline">{label}</Link>
        <Link href="/hesap" className="text-[11px] text-muted hover:text-ink">Hesabım</Link>
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

function BusinessSelector({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const { businesses, activeBusinessId, isBusinessLoading, businessError, selectBusiness } =
    useBusinessContext();

  if (!session?.user) return null;
  if (businessError) {
    return <p role="status" className="px-1 text-xs text-danger">Marka listesi yüklenemedi.</p>;
  }
  if (isBusinessLoading) {
    return <p className="px-1 text-xs text-muted">Markalar yükleniyor…</p>;
    }
    if (businesses.length === 0) {
      return (
      <Link href="/marka" className="inline-flex rounded-lg px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft dark:text-brand-strong">
        İlk markanı oluştur →
      </Link>
    );
  }

  return (
    <div className={cx("space-y-1.5", compact ? "" : "px-1")}>
      <label htmlFor={compact ? "active-business-mobile" : "active-business-desktop"} className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        Aktif marka
      </label>
      <select
        id={compact ? "active-business-mobile" : "active-business-desktop"}
        aria-label="Aktif marka"
        className={cx(selectClass, "w-full truncate py-2 text-xs")}
        value={activeBusinessId ?? ""}
        onChange={(event) => selectBusiness(event.target.value)}
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>{business.name}</option>
        ))}
      </select>
      <Link href="/marka" className="inline-flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted hover:text-brand dark:hover:text-brand-strong">
        <IconBuilding className="h-3.5 w-3.5" />
        Marka profili ve hesaplar
      </Link>
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
  const current = NAV.find((item) => item.href === pathname) ??
    (pathname === "/marka" ? { label: "Marka ve sosyal hesaplar" } : undefined);
  const session = useSession();
  const userId = session?.user.id ?? null;
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [isBusinessLoading, setIsBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const loadRequest = useRef(0);

  const refreshBusinesses = useCallback(async (preferredId?: string) => {
    const requestId = ++loadRequest.current;
    if (!userId) {
      setBusinesses([]);
      setActiveBusinessId(null);
      setIsBusinessLoading(false);
      return;
    }

    setIsBusinessLoading(true);
    setBusinessError(null);
    const { data, error } = await getSupabase()
      .from("businesses")
      .select("id, name")
      .order("created_at", { ascending: true });
    if (requestId !== loadRequest.current) return;
    if (error) {
      setBusinessError(error.message);
      setBusinesses([]);
      setActiveBusinessId(null);
      setIsBusinessLoading(false);
      return;
    }

    const nextBusinesses = (data ?? []) as BusinessOption[];
    setBusinesses(nextBusinesses);
    let storedId: string | null = null;
    try {
      storedId = window.localStorage.getItem(`${BUSINESS_SELECTION_KEY}:${userId}`);
    } catch {
      /* localStorage kapalıysa varsayılan markayla devam edilir. */
    }
    const nextId = [preferredId, storedId, nextBusinesses[0]?.id].find(
      (id) => id && nextBusinesses.some((business) => business.id === id)
    ) ?? null;
    setActiveBusinessId(nextId);
    try {
      if (nextId) window.localStorage.setItem(`${BUSINESS_SELECTION_KEY}:${userId}`, nextId);
      else window.localStorage.removeItem(`${BUSINESS_SELECTION_KEY}:${userId}`);
    } catch {
      /* Tercih oturum boyunca bellekte kalır. */
    }
    setIsBusinessLoading(false);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return refreshBusinesses();
      return undefined;
    });
    return () => { cancelled = true; };
  }, [userId, refreshBusinesses]);

  const selectBusiness = useCallback((id: string) => {
    if (!businesses.some((business) => business.id === id)) return;
    setActiveBusinessId(id);
    if (!userId) return;
    try {
      window.localStorage.setItem(`${BUSINESS_SELECTION_KEY}:${userId}`, id);
    } catch {
      /* Seçim yine de mevcut ekranda uygulanır. */
    }
  }, [businesses, userId]);

  const contextValue = {
    businesses,
    activeBusinessId,
    isBusinessLoading,
    businessError,
    selectBusiness,
    refreshBusinesses,
  };

  return (
    <BusinessContextProvider value={contextValue}>
    <div className="min-h-screen">
      {/* Mobil üst başlık */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl md:hidden">
        <div className="space-y-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Wordmark />
            <ThemeToggle />
          </div>
          <BusinessSelector compact />
        </div>
      </header>

      {/* Masaüstü kenar menüsü */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-line bg-surface/70 px-4 py-5 backdrop-blur-xl md:flex">
        <Link href="/" className="px-1" aria-label="Aı Asisst ana sayfa">
          <Wordmark />
        </Link>
        <div className="mt-5">
          <BusinessSelector />
        </div>

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
          <footer className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-faint">
            <Link href="/gizlilik" className="hover:text-ink">Gizlilik</Link>
            <Link href="/kosullar" className="hover:text-ink">Koşullar</Link>
            <Link href="/hesap" className="hover:text-ink">Hesabım</Link>
          </footer>
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
    </BusinessContextProvider>
  );
}
