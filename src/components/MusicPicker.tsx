"use client";

// Her üretim yapısında (metin, görsel, video) isteğe bağlı müzik seçimi. Instagram'da hikâye/gönderiye müzik eklemek gibi:
// kapalı başlar; açılırsa önerilen tarzı ya da kullanıcının kendi müzik dosyasını seçer.
// Telifli şarkı otomatik eklenmez: yayın sırasında platformun ses seçicisi kullanılır.

import { useEffect, useState } from "react";
import { suggestMusic } from "@/lib/music-suggestions";
import type { ContentKind, PlatformId } from "@/lib/content-kinds";
import { Chip, hintClass } from "./Ui";
import { IconMusic } from "./Icons";

export interface MusicChoice {
  mode: "none" | "suggest" | "own";
  /** Önerilen tarz için ruh hâli etiketi. */
  mood?: string;
  file?: File;
}

const MOODS: Array<{ label: string; tone: string }> = [
  { label: "Enerjik", tone: "heyecanlı" },
  { label: "Eğlenceli", tone: "esprili" },
  { label: "Zarif", tone: "lüks" },
  { label: "Kurumsal", tone: "resmi" },
  { label: "Sakin", tone: "" },
];

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg"];

export default function MusicPicker({
  kind,
  platform,
  onChange,
}: {
  kind?: ContentKind | null;
  platform?: PlatformId | null;
  onChange?: (choice: MusicChoice) => void;
}) {
  const [mode, setMode] = useState<MusicChoice["mode"]>("none");
  const [mood, setMood] = useState(MOODS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function emit(next: MusicChoice) {
    onChange?.(next);
  }

  function pick(m: MusicChoice["mode"]) {
    setMode(m);
    setError(null);
    emit({ mode: m, mood: m === "suggest" ? mood.label : undefined, file: m === "own" ? file ?? undefined : undefined });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!AUDIO_TYPES.includes(f.type)) {
      setError("Ses dosyası MP3, WAV, M4A veya OGG olmalı.");
      return;
    }
    if (f.size > MAX_AUDIO_BYTES) {
      setError("Ses dosyası 10 MB'den küçük olmalı.");
      return;
    }
    setError(null);
    setFile(f);
    setUrl(URL.createObjectURL(f));
    emit({ mode: "own", file: f });
  }

  const suggestion = suggestMusic({ kind: kind ?? null, tone: mood.tone, platform: platform ?? null });

  return (
    <section aria-label="Müzik" className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
          <IconMusic className="h-4 w-4 text-brand" />
          Müzik
        </p>
        <div role="group" aria-label="Müzik seçimi" className="flex gap-1.5">
          <Chip active={mode === "none"} onClick={() => pick("none")}>Müzik yok</Chip>
          <Chip active={mode === "suggest"} onClick={() => pick("suggest")}>Önerilen tarz</Chip>
          <Chip active={mode === "own"} onClick={() => pick("own")}>Kendi müziğim</Chip>
        </div>
      </div>

      {mode === "suggest" && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ruh hâli">
            {MOODS.map((m) => (
              <Chip
                key={m.label}
                active={mood.label === m.label}
                onClick={() => {
                  setMood(m);
                  emit({ mode: "suggest", mood: m.label });
                }}
              >
                {m.label}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-ink">
            <span className="font-semibold">{suggestion.mood}</span> · {suggestion.genres.join(", ")} · {suggestion.bpm[0]}–{suggestion.bpm[1]} BPM
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {suggestion.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-line px-3 py-1 text-xs font-medium text-brand hover:border-brand">
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className={hintClass}>{suggestion.tip}</p>
          <p className="rounded-xl border border-line bg-surface-2/70 p-3 text-xs text-muted">{suggestion.licenseNote}</p>
        </div>
      )}

      {mode === "own" && (
        <div className="mt-3 space-y-2.5">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong hover:bg-surface-2">
            <IconMusic className="h-4 w-4 text-muted" />
            Ses dosyası seç
            <input type="file" accept="audio/*" onChange={onFile} className="sr-only" />
          </label>
          {file && url && (
            <div className="space-y-1">
              <p className="truncate text-xs text-muted">{file.name}</p>
              <audio controls src={url} className="h-10 w-full" />
            </div>
          )}
          <p className={hintClass}>MP3, WAV veya M4A · en fazla 10 MB. Dosya yalnızca bu cihazda kalır; kullanım hakkı sizdedir.</p>
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
      {mode === "none" && <p className={`${hintClass} mt-2`}>İsterseniz hikâye, gönderi veya video için müzik ekleyin.</p>}
    </section>
  );
}
