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
} from "./Ui";
import { ALL_SHARE_TARGETS } from "@/lib/share-links";
import { IconCheck, IconPlus, IconTrash } from "./Icons";
import { useBusinessContext } from "./BusinessContext";
import BrandColorStudio from "./BrandColorStudio";
import LogoStudio from "./LogoStudio";

const initialsOf = (platform: SocialPlatform) =>
  ALL_SHARE_TARGETS.find((t) => t.platform === platform)?.initials ?? "•";
const colorOf = (platform: SocialPlatform) =>
  ALL_SHARE_TARGETS.find((t) => t.platform === platform)?.color ?? "#6b7280";

export default function ProfileForm() {
  const { activeBusinessId, isBusinessLoading, refreshBusinesses } = useBusinessContext();
  return (
    <ProfileFormWorkspace
      key={activeBusinessId ?? "no-brand"}
      activeBusinessId={activeBusinessId}
      isBusinessLoading={isBusinessLoading}
      refreshBusinesses={refreshBusinesses}
    />
  );
}

function ProfileFormWorkspace({
  activeBusinessId,
  isBusinessLoading,
  refreshBusinesses,
}: {
  activeBusinessId: string | null;
  isBusinessLoading: boolean;
  refreshBusinesses: (preferredId?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<StoredBusiness>(EMPTY_BUSINESS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);

  useEffect(() => {
    if (isBusinessLoading) return;
    let active = true;
    businessStore
      .get(activeBusinessId)
      .then((stored) => {
        if (!active) return;
        setForm(stored ? { ...EMPTY_BUSINESS, ...stored } : { ...EMPTY_BUSINESS });
        setNewDraft(false);
      })
      .catch(() => {
        if (active) setLoadError("Profil yüklenemedi. İnternet bağlantınızı veya oturumunuzu kontrol edin.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, [activeBusinessId, isBusinessLoading, loadRevision]);

  function update<K extends keyof StoredBusiness>(key: K, value: StoredBusiness[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSavedAt(null);
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
      setNewDraft(false);
      setSavedAt(new Date());
      await refreshBusinesses(id);
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

  if (loadError) {
    return (
      <Callout tone="error">
        <p>{loadError}</p>
        <p>Mevcut profil yüklenmeden düzenleme veya kaydetme devre dışıdır.</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setLoadError(null);
            setLoaded(false);
            setLoadRevision((revision) => revision + 1);
          }}
        >
          Yeniden dene
        </Button>
      </Callout>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {newDraft && (
        <Callout tone="info">Yeni marka taslağı oluşturuluyor. Kaydettiğinizde bu marka aktif çalışma alanı olur.</Callout>
      )}
      <SectionCard
        step="01"
        title="Temel bilgiler"
        description="Bu alanlar yapay zekânın kimin için yazdığını belirler."
        aside={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => {
              setForm({ ...EMPTY_BUSINESS });
              setErrors({});
              setLoadError(null);
              setSavedAt(null);
              setNewDraft(true);
            }}
          >
            <IconPlus /> Yeni marka
          </Button>
        }
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

        <div className="mt-6 space-y-6">
          <Field label="Marka renkleri" error={undefined}>
            <BrandColorStudio
              colors={colors.length ? colors : ["", ""]}
              primaryShare={form.primary_share}
              onPrimaryShareChange={(next) => update("primary_share", next)}
              onChange={(next) => update("brand_colors", next)}
              brandName={form.name}
              logoDataUrl={form.logo_data_url ?? null}
              error={errors.brand_colors}
              errorId="biz-colors-error"
            />
          </Field>

          <Field label="Logo" >
            <LogoStudio
              logo={form.logo_data_url ?? null}
              onChange={(next) => update("logo_data_url", next)}
              brandName={form.name}
              colors={colors}
            />
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
                aria-invalid={errors.social_accounts && !acc.handle.trim() ? true : undefined}
                aria-describedby={errors.social_accounts ? "social-accounts-error" : undefined}
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
            <p id="social-accounts-error" role="alert" aria-live="polite" className="text-xs font-medium text-danger">{errors.social_accounts}</p>
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
        {saveError && <span role="alert" aria-live="polite" className="text-sm font-medium text-danger">{saveError}</span>}
        <span className={cx(hintClass, "ml-auto hidden sm:block")}>
          Kaydettiğiniz profil tüm üretimlerde otomatik kullanılır.
        </span>
      </div>
    </form>
  );
}
