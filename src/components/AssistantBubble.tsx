"use client";

// Asistan balonu: her sayfada sağ altta durur; basınca sohbet açılır, tekrar basınca kapanır.
// Asistan markanın herkese açık profil bilgisini bilir ve ona göre yanıtlar.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { postApi } from "@/lib/api-client";
import type { ContentIdea } from "@/lib/brand-prompt";
import { useBusinessContext } from "./BusinessContext";
import { IconClose, IconSend, IconSparkles } from "./Icons";
import { cx } from "./Ui";

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; suggestions?: string[]; error?: boolean }
  | { id: number; role: "ideas"; ideas: ContentIdea[] };

const QUICK = ["Bugün ne paylaşmalıyım?", "Hedef kitlemi özetle", "Bu hafta için fikir ver"];

export default function AssistantBubble({ signedIn }: { signedIn: boolean }) {
  const { activeBusinessId: businessId, businesses } = useBusinessContext();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const brand = businesses.find((b) => b.id === businessId)?.name;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, busy, open]);

  if (!signedIn) return null;

  function add(m: Omit<Msg, "id"> & Record<string, unknown>) {
    idRef.current += 1;
    setMessages((list) => [...list, { ...m, id: idRef.current } as Msg]);
  }

  async function ask(raw: string) {
    const q = raw.trim();
    if (!q || busy || !businessId) return;
    const history = messages
      .filter((m): m is Extract<Msg, { role: "user" | "assistant" }> => (m.role === "user" || m.role === "assistant") && !("error" in m && m.error))
      .map((m) => ({ role: m.role, text: m.text }));
    add({ role: "user", text: q });
    setText("");
    setBusy(true);
    try {
      if (/fikir/i.test(q) && q.length < 40) {
        const res = await postApi<{ ideas: ContentIdea[] }>("/api/ideas", { businessId });
        add({ role: "ideas", ideas: res.ideas });
      } else {
        const res = await postApi<{ reply: string; suggestions: string[] }>("/api/assistant", {
          businessId,
          message: q,
          history,
        });
        add({ role: "assistant", text: res.reply, suggestions: res.suggestions });
      }
    } catch (err) {
      add({ role: "assistant", text: err instanceof Error ? err.message : "Bir sorun oluştu.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Asistan"
          className="fixed inset-x-3 bottom-40 z-50 flex max-h-[min(34rem,calc(100dvh-14rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-pop animate-rise sm:left-auto sm:right-5 sm:w-[24rem] md:bottom-24"
        >
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">Asistan</p>
              <p className="truncate text-[11px] text-muted">{brand ? `${brand} profilini biliyorum` : "Önce bir marka seçin"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Asistanı kapat" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
              <IconClose className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-ink-soft">
                  Merhaba! İşletme profilini biliyorum. İçerik fikri, ton, hedef kitle ya da bir paylaşımın nasıl olacağı hakkında sorabilirsin.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <button key={q} type="button" disabled={busy || !businessId} onClick={() => ask(q)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand hover:text-ink disabled:opacity-50">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-sm text-brand-ink">{m.text}</p>
              ) : m.role === "ideas" ? (
                <ul key={m.id} className="space-y-1.5">
                  {m.ideas.map((idea) => (
                    <li key={idea.title + idea.prompt}>
                      <Link
                        href={`/olustur?prompt=${encodeURIComponent(idea.prompt.slice(0, 500))}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-2xl border border-line bg-surface-2/60 p-3 transition hover:border-brand"
                      >
                        <span className="block text-sm font-semibold text-ink">{idea.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">{idea.prompt}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-brand">Oluştur →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div key={m.id} className="space-y-1.5">
                  <p role={m.error ? "alert" : undefined} className={cx("w-fit max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-3.5 py-2 text-sm", m.error ? "border-danger/30 bg-danger-soft text-danger" : "border-line bg-surface-2/60 text-ink")}>
                    {m.text}
                  </p>
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <Link key={s} href={`/olustur?prompt=${encodeURIComponent(s)}`} onClick={() => setOpen(false)} className="rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                          {s}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
            {busy && <p className="text-xs text-muted">Yazıyor…</p>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
            className="flex items-end gap-2 border-t border-line p-2.5"
          >
            <label htmlFor="assistant-bubble-input" className="sr-only">Asistana yaz</label>
            <input
              id="assistant-bubble-input"
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder="Asistana sor…"
              className="h-10 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-sm text-ink placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <button type="submit" aria-label="Gönder" disabled={busy || !text.trim() || !businessId} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-brand-ink disabled:opacity-40">
              <IconSend className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Asistanı kapat" : "Asistanı aç"}
        className="fixed bottom-24 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-ink shadow-pop transition active:scale-95 md:bottom-6 md:right-6"
      >
        {open ? <IconClose className="h-6 w-6" /> : <IconSparkles className="h-6 w-6" />}
      </button>
    </>
  );
}
