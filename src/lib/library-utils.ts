// İçerik kütüphanesi yardımcıları (saf fonksiyonlar, kolay test edilir).

export type ContentStatus = "draft" | "approved" | "archived";

export interface ContentRow {
  id: string;
  parent_id: string | null;
  prompt: string;
  tone: string | null;
  language: "tr" | "en";
  post_text: string | null;
  caption: string | null;
  hashtags: string[];
  ad_text: string | null;
  story_text: string | null;
  visual_url: string | null;
  status: ContentStatus;
  created_at: string;
}

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Taslak",
  approved: "Onaylı",
  archived: "Arşiv",
};

const MAX_HASHTAGS = 30;

// "#a #b, c" → ["#a", "#b", "#c"] (tekrarsız, # eklenir, boşluk içermez)
export function parseHashtags(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(/[\s,]+/)) {
    const clean = part.trim().replace(/^#+/, "");
    if (!clean) continue;
    seen.add("#" + clean);
    if (seen.size >= MAX_HASHTAGS) break;
  }
  return [...seen];
}

// İndirilecek düz metin dosyasının içeriği.
export function contentToText(row: ContentRow): string {
  const blocks: Array<[string, string]> = [
    ["GÖNDERİ METNİ", row.post_text ?? ""],
    ["AÇIKLAMA (CAPTION)", row.caption ?? ""],
    ["HASHTAG", row.hashtags.join(" ")],
    ["REKLAM METNİ", row.ad_text ?? ""],
    ["HİKÂYE METNİ", row.story_text ?? ""],
  ];
  const head = [
    `İstek: ${row.prompt}`,
    `Ton: ${row.tone ?? "marka diline göre"}`,
    `Durum: ${STATUS_LABEL[row.status]}`,
    `Tarih: ${row.created_at.slice(0, 10)}`,
  ].join("\n");
  const body = blocks
    .filter(([, text]) => text.trim())
    .map(([title, text]) => `## ${title}\n${text.trim()}`)
    .join("\n\n");
  return `${head}\n\n${body}\n`;
}

export function downloadName(row: ContentRow): string {
  return `icerik-${row.created_at.slice(0, 10)}-${row.id.slice(0, 6)}.txt`;
}

// Arama: istek, ton ve tüm metin alanlarında, büyük/küçük harf ve Türkçe
// "İ/ı" farkını gözetmeden.
export function matchesSearch(row: ContentRow, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(
    [row.prompt, row.tone, row.post_text, row.caption, row.ad_text, row.story_text, row.hashtags.join(" ")]
      .filter(Boolean)
      .join(" ")
  );
  return haystack.includes(q);
}

function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
