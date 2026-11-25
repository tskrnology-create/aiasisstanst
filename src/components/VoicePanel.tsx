"use client";

// Marka sesi: içerik sütunları ve kullanıcının kendi eski paylaşımları (üslup örneği).
// Üretim istemleri bunları kullanır; sınırlar veritabanında da zorlanır (schema v11).

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useBusinessContext } from "./BusinessContext";
import { Button, Callout, SectionCard, inputClass } from "./Ui";
import { IconPlus, IconTrash } from "./Icons";

interface Pillar { id: string; name: string; description: string | null }
interface Sample { id: string; body: string }

export const MAX_PILLARS = 6;
export const MAX_SAMPLES = 5;

export default function VoicePanel() {
  const { activeBusinessId: businessId } = useBusinessContext();
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sample, setSample] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    const sb = getSupabase();
    const [p, s] = await Promise.all([
      sb.from("content_pillars").select("id, name, description").eq("business_id", businessId).order("position").order("created_at"),
      sb.from("voice_samples").select("id, body").eq("business_id", businessId).order("created_at"),
    ]);
    if (p.error || s.error) { setError("Marka sesi yüklenemedi. Veritabanı güncellemesi (schema v11) yapıldı mı?"); return; }
    setError(null);
    setPillars(p.data ?? []);
    setSamples(s.data ?? []);
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  async function addPillar(event: React.FormEvent) {
    event.preventDefault();
    if (!businessId || name.trim().length < 2) return;
    setBusy(true);
    const { error: err } = await getSupabase().from("content_pillars").insert({
      business_id: businessId, name: name.trim().slice(0, 40), description: description.trim().slice(0, 200) || null, position: pillars.length,
    });
    setBusy(false);
    if (err) setError("Sütun eklenemedi. En fazla 6 sütun olabilir."); else { setName(""); setDescription(""); await load(); }
  }

  async function addSample(event: React.FormEvent) {
    event.preventDefault();
    if (!businessId) return;
    const body = sample.trim();
    if (body.length < 20) { setError("Örnek en az 20 karakter olmalı."); return; }
    setBusy(true);
    const { error: err } = await getSupabase().from("voice_samples").insert({ business_id: businessId, body: body.slice(0, 1500) });
    setBusy(false);
    if (err) setError("Örnek eklenemedi. En fazla 5 örnek olabilir."); else { setSample(""); await load(); }
  }

  async function remove(table: "content_pillars" | "voice_samples", id: string) {
    if (!businessId) return;
    const { error: err } = await getSupabase().from(table).delete().eq("id", id).eq("business_id", businessId);
    if (err) setError("Silinemedi. Tekrar deneyin."); else await load();
  }

  if (!businessId) return null;
  return (
    <SectionCard title="Marka sesi" description="Yapay zekâ gönderileri senin gibi yazsın diye konu başlıklarını ve eski paylaşımlarını ver.">
      {error && <Callout tone="error">{error}</Callout>}

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink">İçerik sütunları ({pillars.length}/{MAX_PILLARS})</h3>
        <ul className="space-y-1.5">
          {pillars.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
              <span><b className="text-ink">{p.name}</b>{p.description && <span className="text-muted"> · {p.description}</span>}</span>
              <button type="button" aria-label={`${p.name} sütununu sil`} onClick={() => void remove("content_pillars", p.id)} className="text-muted hover:text-danger"><IconTrash className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        {pillars.length < MAX_PILLARS && (
          <form onSubmit={addPillar} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input id="pillar-name" aria-label="Sütun adı" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Örn. Bakım ipuçları" className={inputClass} />
            <input id="pillar-desc" aria-label="Sütun açıklaması" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Kısa açıklama (isteğe bağlı)" className={inputClass} />
            <Button type="submit" size="sm" disabled={busy || name.trim().length < 2}><IconPlus className="h-4 w-4" /> Ekle</Button>
          </form>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-bold text-ink">Ses örnekleri ({samples.length}/{MAX_SAMPLES})</h3>
        <ul className="space-y-1.5">
          {samples.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink-soft">
              <span className="line-clamp-3 whitespace-pre-line">{s.body}</span>
              <button type="button" aria-label="Örneği sil" onClick={() => void remove("voice_samples", s.id)} className="text-muted hover:text-danger"><IconTrash className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        {samples.length < MAX_SAMPLES && (
          <form onSubmit={addSample} className="space-y-2">
            <textarea id="voice-sample" aria-label="Eski paylaşım örneği" value={sample} onChange={(e) => setSample(e.target.value)} maxLength={1500} rows={3} placeholder="Daha önce paylaştığın ve beğendiğin bir gönderiyi yapıştır." className={inputClass} />
            <Button type="submit" size="sm" disabled={busy || sample.trim().length < 20}><IconPlus className="h-4 w-4" /> Örnek ekle</Button>
          </form>
        )}
      </div>
    </SectionCard>
  );
}
