// İçerik takvimi yardımcıları (saf fonksiyonlar). Tüm hesaplar tarayıcının
// yerel saat dilimine (Türkiye: UTC+3) göre yapılır; veritabanında ISO/UTC saklanır.

import type { ContentStatus } from "./library-utils";
import type { SocialPlatform } from "./business-store";

export interface CalendarContent {
  prompt: string;
  tone: string | null;
  post_text: string | null;
  caption: string | null;
  hashtags: string[];
  status: ContentStatus;
}

export interface CalendarItem {
  id: string;
  business_id: string;
  content_id: string;
  social_account_id: string | null;
  platform: SocialPlatform | null;
  scheduled_at: string; // ISO
  remind_at: string | null; // ISO
  done: boolean;
  posted_at: string | null;
  post_url: string | null;
  contents: CalendarContent | null;
}

export type ReminderOption = "none" | "1h" | "1d";

export const REMINDER_LABEL: Record<ReminderOption, string> = {
  none: "Hatırlatma yok",
  "1h": "1 saat önce",
  "1d": "1 gün önce",
};

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Haftanın ilk günü Pazartesi.
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Pzt=0 ... Paz=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Ay ızgarası: her zaman 6 hafta (42 gün), Pazartesi'den başlar.
export function monthGrid(anchor: Date): Date[] {
  const first = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDays(anchor: Date): Date[] {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

// <input type="datetime-local"> değeri ↔ Date (yerel saat)
export function toLocalInput(d: Date): string {
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeRemindAt(scheduled: Date, option: ReminderOption): string | null {
  if (option === "none") return null;
  const ms = option === "1h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return new Date(scheduled.getTime() - ms).toISOString();
}

/** Boş değer isteğe bağlıdır; dolu değer yalnızca HTTP(S) paylaşım bağlantısı olabilir. */
export function normalizePostUrl(value: string): string | null | undefined {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(input);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dayKey(new Date(item.scheduled_at));
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }
  return map;
}

export function isOverdue(item: CalendarItem, now: Date): boolean {
  return !item.done && new Date(item.scheduled_at).getTime() < now.getTime();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDayLong(d: Date): string {
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatMonthTitle(d: Date): string {
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

// Elle paylaşım için panoya kopyalanacak metin.
export function shareText(c: CalendarContent | null): string {
  if (!c) return "";
  return [c.caption || c.post_text, c.hashtags.join(" ")]
    .filter((x) => x && x.trim())
    .join("\n\n");
}
