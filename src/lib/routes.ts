// Uygulamadaki tüm iç bağlantılar tek yerden üretilir; rota adları değişirse yalnızca burası güncellenir.

export type StudioStep = "yaz" | "gorsel" | "planla";
export type ContentsView = "liste" | "takvim";

export const STUDIO_STEPS: ReadonlyArray<{ id: StudioStep; label: string; hint: string }> = [
  { id: "yaz", label: "Yaz", hint: "Fikri metne dönüştür" },
  { id: "gorsel", label: "Görsel", hint: "Marka görselini hazırla" },
  { id: "planla", label: "Planla", hint: "Paylaşım gününü seç" },
];

export function isStudioStep(value: unknown): value is StudioStep {
  return STUDIO_STEPS.some((s) => s.id === value);
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) q.set(key, value);
  const text = q.toString();
  return text ? `${path}?${text}` : path;
}

/** Bağımsız üretim yapıları: her biri tek başına çalışır; "birlikte" metin + görseli tek akışta toplar. */
export type StudioMode = "metin" | "gorsel" | "birlikte" | "video";

export const STUDIO_HUB = "/studyo";

export const STUDIO_MODES: ReadonlyArray<{ id: StudioMode; label: string; hint: string; href: string }> = [
  { id: "metin", label: "Metin", hint: "Yazıyı üret, marka renkli şablon kartına dök", href: "/studyo/metin" },
  { id: "gorsel", label: "Görsel", hint: "Üret, yükle ya da Pixabay'dan seç; şablona yerleştir", href: "/studyo/gorsel" },
  { id: "birlikte", label: "Metin + Görsel", hint: "Metin, görsel ve plan tek akışta", href: "/studyo/birlikte" },
  { id: "video", label: "Video", hint: "Senaryo, sahne listesi ve stok klipler", href: "/studyo/video" },
];

/** Metin / Video yapıları için: ?adim= ve ?content= taşıyan bağlantı. */
export function modeHref(mode: Exclude<StudioMode, "birlikte">, opts: { step?: string; contentId?: string; prompt?: string } = {}): string {
  return withQuery(`/studyo/${mode}`, { adim: opts.step, content: opts.contentId, prompt: opts.prompt });
}

/** Birlikte: tek bir içeriğin yazım → görsel → plan akışı. */
export function studioHref(opts: { step?: StudioStep; contentId?: string; prompt?: string } = {}): string {
  return withQuery("/studyo/birlikte", {
    adim: opts.step && opts.step !== "yaz" ? opts.step : undefined,
    content: opts.contentId,
    prompt: opts.prompt,
  });
}

/** İçerikler: tüm içeriklerin listesi ve takvimi. */
export function contentsHref(opts: { view?: ContentsView; contentId?: string } = {}): string {
  return withQuery("/icerikler", {
    gorunum: opts.view && opts.view !== "liste" ? opts.view : undefined,
    content: opts.contentId,
  });
}

export const ROUTES = {
  today: "/",
  brand: "/marka",
  account: "/hesap",
} as const;
