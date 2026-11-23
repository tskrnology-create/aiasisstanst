// "Oluştur" akışının saf mantığı: tür → format/oran/şablon eşlemesi, paylaşım metni, zaman seçenekleri.

import type { FormatId, TemplateId } from "./visual-templates";
import { composeText, type PostFormat, type PostPackage } from "./post-formats";

export interface CreateKind {
  id: PostFormat;
  label: string;
  /** Kapak görselinin oranı; null → görsel yok (yalnızca yazı). */
  cover: FormatId | null;
  template: TemplateId;
}

export const CREATE_KINDS: readonly CreateKind[] = [
  { id: "gonderi", label: "Gönderi", cover: "campaign", template: "foto-alt" },
  { id: "karusel", label: "Karusel", cover: "post", template: "tipografi" },
  { id: "hikaye", label: "Hikâye", cover: "story", template: "tipografi" },
  { id: "video", label: "Reels / Video", cover: "story", template: "foto-alt" },
  { id: "metin", label: "Sadece yazı", cover: null, template: "tipografi" },
];

export function kindOf(id: PostFormat): CreateKind {
  return CREATE_KINDS.find((k) => k.id === id) ?? CREATE_KINDS[0];
}

/** Kapakta görünecek büyük yazı ve küçük yazı. */
export function coverText(pkg: PostPackage): { headline: string; subline: string } {
  const first = pkg.slides[0];
  const headline = (pkg.format === "karusel" || pkg.format === "hikaye") && first?.title ? first.title : pkg.hook || pkg.body.slice(0, 80);
  const subline = (pkg.format === "karusel" || pkg.format === "hikaye") && first?.text ? first.text : pkg.cta;
  return { headline: headline.slice(0, 90), subline: subline.slice(0, 110) };
}

/** Panoya kopyalanacak / paylaşım menüsüne verilecek tam metin. */
export function shareText(pkg: PostPackage): string {
  return [composeText(pkg), pkg.hashtags.join(" ")].filter((x) => x.trim()).join("\n\n");
}

export interface DayOption {
  key: string;
  label: string;
  date: Date;
}

export const SLOTS = [
  { id: "sabah", label: "09:00", hour: 9, minute: 0 },
  { id: "ogle", label: "12:30", hour: 12, minute: 30 },
  { id: "aksam", label: "19:00", hour: 19, minute: 0 },
] as const;

export function dayOptions(now: Date, count = 7): DayOption[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const label = i === 0 ? "Bugün" : i === 1 ? "Yarın" : date.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
    return { key, label, date };
  });
}

export function slotAt(day: Date, slot: (typeof SLOTS)[number]): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute);
}
