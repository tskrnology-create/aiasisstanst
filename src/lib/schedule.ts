// Tek dokunuşla planlama: gün ve saat dilimi seçenekleri.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayKey, startOfDay } from "./calendar-utils";

export interface DayOption {
  key: string;
  date: Date;
  label: string;
}

export interface TimeSlot {
  id: "sabah" | "ogle" | "aksam";
  label: string;
  hour: number;
  minute: number;
}

export const TIME_SLOTS: readonly TimeSlot[] = [
  { id: "sabah", label: "Sabah 09:00", hour: 9, minute: 0 },
  { id: "ogle", label: "Öğle 12:30", hour: 12, minute: 30 },
  { id: "aksam", label: "Akşam 19:00", hour: 19, minute: 0 },
];

/** Bugünden başlayan `count` günlük seçenek listesi. */
export function dayOptions(now: Date, count = 7): DayOption[] {
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    const label =
      i === 0 ? "Bugün" : i === 1 ? "Yarın" : date.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
    return { key: dayKey(date), date, label };
  });
}

export function atSlot(day: Date, slot: TimeSlot): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute, 0, 0);
}

/** Saat dilimi geçmişteyse seçilemez. */
export function slotIsPast(day: Date, slot: TimeSlot, now: Date): boolean {
  return atSlot(day, slot).getTime() <= now.getTime();
}

/** "2026-11-27" → yerel gün (geçersizse null). */
export function parseDayKey(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) || dayKey(d) !== value ? null : d;
}

export async function scheduleContent(
  sb: SupabaseClient,
  input: { businessId: string; contentId: string; platform: string; at: Date }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await sb.from("calendar_items").insert({
    business_id: input.businessId,
    content_id: input.contentId,
    social_account_id: null,
    platform: input.platform,
    scheduled_at: input.at.toISOString(),
    remind_at: new Date(input.at.getTime() - 60 * 60 * 1000).toISOString(),
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}
