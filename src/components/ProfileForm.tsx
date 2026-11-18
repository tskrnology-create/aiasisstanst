"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_BUSINESS,
  PLATFORM_LABELS,
  businessStore,
  validateBusiness,
  type SocialPlatform,
  type StoredBusiness,
  type ValidationErrors,
} from "@/lib/business-store";
import {
  Button,
  Callout,
  Field,
  PlatformBadge,
  SectionCard,
  Segmented,
  Tag,
  cx,
  hintClass,
  inputClass,
  labelClass,
} from "./Ui";
import { ALL_SHARE_TARGETS } from "@/lib/share-links";
import { IconCheck, IconPlus, IconTrash, IconWand } from "./Icons";
import {
  FALLBACK_PRIMARY,
  FALLBACK_SECONDARY,
  contrastText,
  isValidHex,
  normalizeHex,
  paletteAdvice,
  percent,
  readPalette,
  suggestSecondary,
} from "@/lib/brand-palette";

const MAX_LOGO_BYTES = 500 * 1024; // localStorage sınırı nedeniyle; Supabase'de kalkacak

const initialsOf = (platform: SocialPlatform) =>
  ALL_SHARE_TARGETS.find((t) => t.platform === platform)?.initials ?? "•";
const colorOf = (platform: SocialPlatform) =>
  ALL_SHARE_TARGETS.find((t) => t.platform === platform)?.color ?? "#6b7280";

const SLOTS = [
  {
    index: 0,
    title: "Ana renk",
    role: "baskın",
    hint: "Görsellerin büyük bölümü bu renkle kurulur.",
    placeholder: "#E91E63",
  },
  {
    index: 1,
    title: "Yardımcı renk",
    role: "vurgu",
    hint: "Band, çizgi ve öne çıkan kelime için kullanılır.",
    placeholder: "#2B2B3A",
  },
] as const;

/** Markanın iki rengini ve zorunlu kullanım oranını seçtiren alan. */
function BrandColorSlots({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (next: string[]) => void;
}) {
  const current = [colors[0] ?? "", colors[1] ?? ""];
  const bothValid = isValidHex(current[0]) && isValidHex(current[1]);
  // Geçersiz/eksik durumda palete düşülür; önizleme yine de oranı gösterir.
  const palette = readPalette(bothValid ? current : []);
  const advice = paletteAdvice(palette);

  function set(index: number, value: string) {
    const next = [...current];
    next[index] = value;
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const value = current[slot.index];
          const swatch =
            normalizeHex(value) ?? (slot.index === 0 ? FALLBACK_PRIMARY : FALLBACK_SECONDARY);
          return (
            <div
              key={slot.index}
              className="space-y-2.5 rounded-xl border border-line bg-surface-2/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{slot.title}</span>
                <Tag tone={slot.index === 0 ? "brand" : "neutral"}>
                  {slot.role} · {percent(slot.index === 0 ? palette.share : palette.accent)}
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${slot.title} seçici`}
                  value={swatch}
                  onChange={(e) => set(slot.index, e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
                />
                <input
                  aria-label={`${slot.title} kodu`}
                  className={cx(inputClass, "font-mono text-xs uppercase")}
                  value={value}
                  onChange={(e) => set(slot.index, e.target.value.trim())}
                  placeholder={slot.placeholder}
                />
              </div>
              <p className={hintClass}>{slot.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!isValidHex(current[0])}
          onClick={() => set(1, (suggestSecondary(current[0]) ?? "").toUpperCase())}
        >
          <IconWand />
          Tamamlayıcı rengi öner
        </Button>
        {bothValid && (
          <Tag tone="neutral">
            Ana renk üzerinde yazı: {palette.onPrimary === "#ffffff" ? "beyaz" : "koyu"}
          </Tag>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-3.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-[0.12em] text-faint">
            Kullanım oranı
          </span>
          <span className="font-mono text-muted">
            {percent(palette.share)} / {percent(palette.accent)}
          </span>
        </div>
        <div className="flex h-12 overflow-hidden rounded-lg border border-line">
          <span
            className="grid place-items-center text-[11px] font-semibold"
            style={{
              width: `${palette.share * 100}%`,
              backgroundColor: bothValid ? palette.primary : "var(--surface-2)",
              color: contrastText(palette.primary),
            }}
          >
            Ana
          </span>
          <span
            className="grid place-items-center text-[11px] font-semibold"
            style={{
              width: `${palette.accent * 100}%`,
              backgroundColor: bothValid ? palette.secondary : "var(--surface-2)",
              color: contrastText(palette.secondary),
            }}
          >
            Vurgu
          </span>
        </div>

        {bothValid ? (
          <Callout tone={advice.tone === "ok" ? "success" : "warning"}>{advice.text}</Callout>
        ) : (
          <Callout tone="info">
            İki renk de seçildiğinde oran önizlemesi ve kontrast uyarısı burada görünür.
          </Callout>
        )}
        <p className={hintClass}>
          Oran hem şablonlara hem yapay zekâ arka plan istemine otomatik işlenir; tek bir görsel
          için oranı Görsel stüdyosundan değiştirebilirsiniz.
        </p>
      </div>
    </div>
  );
}

export default function ProfileForm() {
  const [form, setForm] = useState<StoredBusiness>(EMPTY_BUSINESS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [logoError, setLogoError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    businessStore
      .get()
      .then((stored) => {
        if (stored) setForm({ ...EMPTY_BUSINESS, ...stored });
      })
      .catch((err: Error) => setLoadError("Profil yüklenemedi: " + err.message))
      .finally(() => setLoaded(true));
  }, []);

  function update<K extends keyof StoredBusiness>(key: K, value: StoredBusiness[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSavedAt(null);
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Logo PNG, JPG veya WebP olmalı.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo 500 KB'den küçük olmalı.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("logo_data_url", reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateBusiness(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { id } = await businessStore.save({
        ...form,
        name: form.name.trim(),
        industry: form.industry.trim(),
        social_accounts: form.social_accounts.map((a) => ({ ...a, handle: a.handle.trim() })),
      });
      setForm((f) => ({ ...f, id }));
      setSavedAt(new Date());
    } catch (err) {
      setSaveError("Kaydedilemedi: " + (err instanceof Error ? err.message : "bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  }

  const colors = form.brand_colors ?? [];

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
        Profil yükleniyor…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {loadError && (
        <div className="rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      <SectionCard
        step="01"
        title="Temel bilgiler"
        description="Bu alanlar yapay zekânın kimin için yazdığını belirler."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="İşletme adı *" error={errors.name} htmlFor="biz-name">
            <input
              id="biz-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Örn. Pınar Güzellik Merkezi"
            />
          </Field>
          <Field label="Sektör *" error={errors.industry} htmlFor="biz-industry">
            <input
              id="biz-industry"
              className={inputClass}
              value={form.industry}
              onChange={(e) => update("industry", e.target.value)}
              placeholder="Örn. Güzellik ve kişisel bakım"
            />
          </Field>
        </div>

        <div className="mt-5 space-y-5">
          <Field
            label="Ürün ve hizmetler"
            htmlFor="biz-products"
            hint="Yapay zekâ yalnızca burada yazanları ürün olarak kullanır; ne kadar net yazarsanız o kadar iyi içerik çıkar."
          >
            <textarea
              id="biz-products"
              className={cx(inputClass, "min-h-24 resize-y")}
              rows={4}
              value={form.products ?? ""}
              onChange={(e) => update("products", e.target.value)}
              placeholder="Örn. Cilt bakımı, lazer epilasyon, manikür, kaş tasarımı"
            />
          </Field>
          <Field label="Hedef kitle" htmlFor="biz-audience">
            <textarea
              id="biz-audience"
              className={cx(inputClass, "min-h-20 resize-y")}
              rows={3}
              value={form.target_audience ?? ""}
              onChange={(e) => update("target_audience", e.target.value)}
              placeholder="Örn. 25–45 yaş, İstanbul Anadolu Yakası'nda yaşayan çalışan kadınlar"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        step="02"
        title="Marka kimliği"
        description="Ton, renkler ve logo tüm üretimlerde ve görsel şablonlarda kullanılır."
      >
        <Field label="Marka dili" htmlFor="biz-voice" hint="İşletmenin nasıl konuştuğunu birkaç cümleyle anlatın.">
          <textarea
            id="biz-voice"
            className={cx(inputClass, "min-h-20 resize-y")}
            rows={3}
            value={form.brand_voice ?? ""}
            onChange={(e) => update("brand_voice", e.target.value)}
            placeholder="Örn. Samimi ama profesyonel; 'sen' dili, ölçülü emoji kullanımı"
          />
        </Field>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Field label="Marka renkleri" error={errors.brand_colors}>
            <BrandColorSlots
              colors={colors.length ? colors : ["", ""]}
              onChange={(next) => update("brand_colors", next)}
            />
          </Field>

          <Field label="Logo" error={logoError ?? undefined} hint="PNG, JPG veya WebP, en fazla 500 KB.">
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-line-strong bg-surface-2/50 p-4">
              {form.logo_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logo_data_url}
                  alt="Logo önizleme"
                  className="h-16 w-16 rounded-xl border border-line bg-surface object-contain p-1"
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-xl border border-line bg-surface text-xs text-faint">
                  Logo
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <label className={cx(labelClass, "inline-flex cursor-pointer text-sm text-brand dark:text-brand-strong")}>
                  {form.logo_data_url ? "Logoyu değiştir" : "Logo yükle"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onLogoChange}
                    className="sr-only"
                  />
                </label>
                {form.logo_data_url && (
                  <button
                    type="button"
                    onClick={() => update("logo_data_url", null)}
                    className="block text-xs text-muted transition hover:text-danger"
                  >
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        step="03"
        title="Sosyal medya hesapları"
        description="Şimdilik yalnızca kayıt ve paylaşım hatırlatması için; platformlara bağlantı ve otomatik gönderim bu sürümde yok."
        aside={<Tag>{form.social_accounts.length} hesap</Tag>}
      >
        <div className="space-y-2.5">
          {form.social_accounts.map((acc, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2/50 p-2.5"
            >
              <PlatformBadge
                initials={initialsOf(acc.platform)}
                color={colorOf(acc.platform)}
                label={PLATFORM_LABELS[acc.platform]}
                className="h-8 w-8 rounded-lg"
              />
              <select
                aria-label={`Platform ${i + 1}`}
                className={cx(inputClass, "w-auto min-w-[9.5rem] flex-none py-2 text-sm")}
                value={acc.platform}
                onChange={(e) => {
                  const next = [...form.social_accounts];
                  next[i] = { ...acc, platform: e.target.value as SocialPlatform };
                  update("social_accounts", next);
                }}
              >
                {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Hesap adı ${i + 1}`}
                className={cx(inputClass, "min-w-[10rem] flex-1 py-2")}
                value={acc.handle}
                onChange={(e) => {
                  const next = [...form.social_accounts];
                  next[i] = { ...acc, handle: e.target.value };
                  update("social_accounts", next);
                }}
                placeholder="@kullaniciadi"
              />
              <button
                type="button"
                aria-label="Hesabı sil"
                title="Hesabı sil"
                onClick={() => update("social_accounts", form.social_accounts.filter((_, j) => j !== i))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
              >
                <IconTrash />
              </button>
            </div>
          ))}
          {form.social_accounts.length === 0 && (
            <p className={hintClass}>Henüz hesap eklenmedi. Hesapları kaydetmek zorunlu değildir.</p>
          )}
          {errors.social_accounts && (
            <p className="text-xs font-medium text-danger">{errors.social_accounts}</p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              update("social_accounts", [...form.social_accounts, { platform: "instagram", handle: "" }])
            }
          >
            <IconPlus />
            Hesap ekle
          </Button>
        </div>
      </SectionCard>

      <SectionCard step="04" title="İçerik dili" description="Üretimlerin varsayılan dili.">
        <Segmented
          ariaLabel="İçerik dili"
          value={form.content_language}
          onChange={(next) => update("content_language", next)}
          options={[
            { value: "tr", label: "Türkçe" },
            { value: "en", label: "English" },
          ]}
        />
      </SectionCard>

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur md:bottom-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor…" : "Profili kaydet"}
        </Button>
        {savedAt && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ok">
            <IconCheck className="h-4 w-4" />
            Kaydedildi · {savedAt.toLocaleTimeString("tr-TR")}
          </span>
        )}
        {saveError && <span className="text-sm font-medium text-danger">{saveError}</span>}
        <span className={cx(hintClass, "ml-auto hidden sm:block")}>
          Kaydettiğiniz profil tüm üretimlerde otomatik kullanılır.
        </span>
      </div>
    </form>
  );
}
