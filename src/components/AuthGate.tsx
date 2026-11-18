"use client";

import { useEffect, useState } from "react";
import { Fragment } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button, Callout, Field, Segmented, cx, inputClass } from "./Ui";
import { IconBuilding, IconSparkles, IconImage, IconCalendar } from "./Icons";

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("already registered")) return "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.";
  if (m.includes("email not confirmed")) return "E-postanızı doğrulayın, ardından giriş yapın.";
  if (m.includes("password should be at least")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("rate limit")) return "Çok fazla deneme yapıldı, biraz bekleyip tekrar deneyin.";
  return "İşlem başarısız: " + message;
}

const HIGHLIGHTS = [
  { icon: IconSparkles, title: "Markana uygun metin", text: "Gönderi, açıklama, hashtag, reklam ve hikâye." },
  { icon: IconImage, title: "Satar görseller", text: "Marka rengin ve logonla hazır şablonlar." },
  { icon: IconCalendar, title: "Planlı takvim", text: "Ne paylaşacağını önceden gör, gecikmeleri yakala." },
];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(configured);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  if (!configured) {
    return (
      <Callout tone="warning">
        <p className="font-semibold">Supabase ayarları eksik</p>
        <p className="text-muted">
          Vercel&apos;de <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> ve{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
          değişkenlerini ekleyip yeniden yayınlayın.
        </p>
      </Callout>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
        Yükleniyor…
      </div>
    );
  }

  // Oturum varsa çocuk içeriği çiz; hesap bilgisi kenar menüde gösterilir.
  if (session) {
    return <Fragment key={session.user.id}>{children}</Fragment>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    setBusy(true);
    const supabase = getSupabase();
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) setError(translateAuthError(err.message));
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) {
          setError(translateAuthError(err.message));
        } else if (!data.session) {
          setInfo(
            "Kayıt oluşturuldu. E-postanıza gelen doğrulama bağlantısına basıp ardından giriş yapın."
          );
          setMode("login");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-[linear-gradient(150deg,var(--brand-soft),var(--surface))] p-6 shadow-soft sm:p-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--brand),transparent_65%)] opacity-25"
        />
        <div className="relative space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-[11px] font-semibold text-muted">
            <IconBuilding className="h-3.5 w-3.5 text-brand dark:text-brand-strong" />
            Tek panelde sosyal medya
          </span>
          <div className="space-y-2">
            <h2 className="text-xl font-bold leading-tight text-ink sm:text-2xl">
              Markanızın içeriğini{" "}
              <span className="text-gradient">tek yerden</span> yönetin
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Profilinizi tanımlayın, yapay zekâyla içerik ve görsel hazırlayın, takviminizi kurun.
              Paylaşımlar şimdilik manuel yapılır.
            </p>
          </div>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface/80 text-brand dark:text-brand-strong">
                  <item.icon />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{item.title}</span>
                  <span className="block text-xs text-muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-3xl border border-line bg-surface/90 p-6 shadow-soft backdrop-blur-sm sm:p-8"
        noValidate
      >
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-ink">
            {mode === "login" ? "Hesabınıza girin" : "Yeni hesap oluşturun"}
          </h3>
          <Segmented
            ariaLabel="İşlem seçimi"
            className="w-full"
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
              setInfo(null);
            }}
            options={[
              { value: "login", label: "Giriş yap" },
              { value: "signup", label: "Kayıt ol" },
            ]}
          />
        </div>

        <Field label="E-posta" htmlFor="auth-email">
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@markaniz.com"
          />
        </Field>

        <Field
          label="Şifre"
          htmlFor="auth-password"
          hint="En az 6 karakter."
        >
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && <Callout tone="error">{error}</Callout>}
        {info && <Callout tone="success">{info}</Callout>}

        <div className="space-y-3">
          <Button type="submit" disabled={busy} className={cx("w-full")}>
            {busy ? "Bekleyin…" : mode === "login" ? "Giriş yap" : "Kayıt ol"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-center text-sm text-muted transition hover:text-ink"
          >
            {mode === "login"
              ? "Hesabınız yok mu? Kayıt olun"
              : "Zaten hesabınız var mı? Giriş yapın"}
          </button>
        </div>
      </form>
    </div>
  );
}
