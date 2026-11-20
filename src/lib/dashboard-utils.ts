// İşletme paneli yardımcıları (saf fonksiyonlar; tarayıcının yerel saat dilimiyle çalışır).

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "Günaydın";
  if (h >= 11 && h < 18) return "İyi günler";
  if (h >= 18 && h < 23) return "İyi akşamlar";
  return "İyi geceler";
}

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "Bugün 14:30", "Yarın 09:00", "Dün 18:00", yoksa "Cum, 21 Kas 10:00". */
export function formatWhen(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diffDays === 0) return `Bugün ${time}`;
  if (diffDays === 1) return `Yarın ${time}`;
  if (diffDays === -1) return `Dün ${time}`;
  const date = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
  return `${date} ${time}`;
}

export function longDate(now: Date): string {
  return now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

export function snippet(text: string | null | undefined, max = 90): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

export interface DayCount {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}

/** Bugünden başlayarak `days` günlük şerit: her gün için planlı paylaşım sayısı. */
export function weekStrip(scheduledIsos: string[], now: Date, days = 7): DayCount[] {
  const start = startOfDay(now);
  const counts = new Map<string, number>();
  for (const iso of scheduledIsos) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const key = startOfDay(d).getTime().toString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = day.getTime().toString();
    return {
      key,
      label: day.toLocaleDateString("tr-TR", { weekday: "short" }),
      count: counts.get(key) ?? 0,
      isToday: i === 0,
    };
  });
}

export interface ChecklistInput {
  profileComplete: boolean;
  contentCount: number;
  visualCount: number;
  plannedCount: number;
}

export interface ChecklistStep {
  id: "profile" | "content" | "visual" | "plan";
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

export function buildChecklist(input: ChecklistInput): { steps: ChecklistStep[]; percent: number } {
  const steps: ChecklistStep[] = [
    { id: "profile", label: "Marka profilini tamamla", hint: "Ürünler, hedef kitle ve marka sesi yapay zekâyı yönlendirir.", href: "/marka", done: input.profileComplete },
    { id: "content", label: "İlk içeriğini üret", hint: "Gönderi, açıklama, hashtag ve reklam metni tek istekte.", href: "/uret", done: input.contentCount > 0 },
    { id: "visual", label: "İlk görselini oluştur", hint: "Şablon seç, marka renklerin ve logonla hazırla.", href: "/gorsel", done: input.visualCount > 0 },
    { id: "plan", label: "İlk paylaşımı planla", hint: "Takvime ekle; zamanı gelince hatırlat.", href: "/takvim", done: input.plannedCount > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, percent: Math.round((doneCount / steps.length) * 100) };
}

export function isProfileComplete(b: {
  industry?: string | null;
  products?: string | null;
  target_audience?: string | null;
  brand_voice?: string | null;
}): boolean {
  return [b.industry, b.products, b.target_audience, b.brand_voice].every((v) => (v ?? "").trim().length > 0);
}
