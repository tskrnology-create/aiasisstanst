"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Profil", short: "Profil" },
  { href: "/uret", label: "İçerik üret", short: "Üret" },
  { href: "/gorsel", label: "Görsel", short: "Görsel" },
  { href: "/takvim", label: "Takvim", short: "Takvim" },
  { href: "/kutuphane", label: "Kütüphane", short: "Kütüp." },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ana navigasyon"
      className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-5">
        <ul className="grid grid-cols-5 gap-1 py-2 sm:flex sm:justify-center sm:gap-5 sm:py-3">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-lg px-1 text-center text-xs transition-colors sm:min-h-0 sm:px-1.5 sm:text-sm ${
                    active
                      ? "bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
