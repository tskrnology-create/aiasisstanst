// Paylaşım sonuçlarından "neyin işe yaradığını" çıkarır. Saf fonksiyonlar; veri çekmez.

export interface ResultItem {
  platform: string | null;
  postedAt: string;
  likes: number | null;
  comments: number | null;
  saves: number | null;
}

export type DayPart = "sabah" | "öğle" | "akşam";

export interface Insights {
  count: number;
  bestPlatform: { name: string; average: number } | null;
  bestDayPart: { name: DayPart; average: number } | null;
}

export const MIN_RESULTS = 3;

/** Yorum ve kaydetme beğeniden daha güçlü sinyal sayılır. */
export function engagement(item: Pick<ResultItem, "likes" | "comments" | "saves">): number | null {
  if (item.likes == null && item.comments == null && item.saves == null) return null;
  return (item.likes ?? 0) + 3 * (item.comments ?? 0) + 2 * (item.saves ?? 0);
}

export function dayPartOf(iso: string): DayPart {
  const hour = new Date(iso).getHours();
  if (hour < 11) return "sabah";
  if (hour < 16) return "öğle";
  return "akşam";
}

function best<K extends string>(groups: Map<K, number[]>): { name: K; average: number } | null {
  let top: { name: K; average: number } | null = null;
  for (const [name, values] of groups) {
    if (values.length < 2) continue; // tek örnekle karar verme
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    if (!top || average > top.average) top = { name, average: Math.round(average) };
  }
  return top;
}

export function computeInsights(items: ResultItem[]): Insights {
  const scored = items
    .map((item) => ({ item, score: engagement(item) }))
    .filter((entry): entry is { item: ResultItem; score: number } => entry.score !== null);
  if (scored.length < MIN_RESULTS) return { count: scored.length, bestPlatform: null, bestDayPart: null };
  const platforms = new Map<string, number[]>();
  const parts = new Map<DayPart, number[]>();
  for (const { item, score } of scored) {
    if (item.platform) platforms.set(item.platform, [...(platforms.get(item.platform) ?? []), score]);
    const part = dayPartOf(item.postedAt);
    parts.set(part, [...(parts.get(part) ?? []), score]);
  }
  return { count: scored.length, bestPlatform: best(platforms), bestDayPart: best(parts) };
}

/** Boş bırakılabilir sayı alanı: boş → null, geçersiz → undefined. */
export function parseCount(value: string): number | null | undefined {
  const text = value.trim();
  if (text === "") return null;
  if (!/^\d{1,9}$/.test(text)) return undefined;
  return Number(text);
}
