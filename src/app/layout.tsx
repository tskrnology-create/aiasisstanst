import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Aı Asisst — Sosyal medya stüdyosu",
    template: "%s · Aı Asisst",
  },
  description:
    "KOBİ'ler ve markalar için tek panelden sosyal medya içerik üretimi, görsel hazırlama, takvim ve kütüphane.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
  ],
};

// Sayfa boyamasından önce tema uygulanır; böylece açılışta beyaz/koyu yanıp sönmesi olmaz.
const themeInit = `(function(){try{var k='ai-asisst-theme';var s=localStorage.getItem(k);var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
