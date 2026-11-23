// İşletme profili Supabase'de (businesses + social_accounts) tutulur.
// RLS kullanıcı sahipliğini sağlar; çağıran ekran aktif business_id'yi açıkça verir.

import type { BusinessProfile } from "./brand-prompt";
import { getSupabase } from "./supabase";
import { DEFAULT_RATIO, isValidHex, normalizeHex, normalizeShare, toStoredColors } from "./brand-palette";

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "x"
  | "linkedin"
  | "youtube"
  | "other";

export interface SocialAccount {
  id?: string;
  platform: SocialPlatform;
  handle: string;
}

export interface StoredBusiness extends BusinessProfile {
  id?: string;
  primary_share: number;
  // v1'de logo küçük bir data URL olarak businesses.logo_url sütununda tutulur.
  logo_data_url: string | null;
  social_accounts: SocialAccount[];
}

export interface BusinessStore {
  get(businessId?: string | null): Promise<StoredBusiness | null>;
  save(business: StoredBusiness): Promise<{ id: string }>;
}

export const businessStore: BusinessStore = {
  async get(businessId) {
    if (!businessId) return null;
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: accounts, error: accError } = await supabase
      .from("social_accounts")
      .select("id, platform, handle")
      .eq("business_id", row.id)
      .order("created_at", { ascending: true });
    if (accError) throw new Error(accError.message);

    return {
      id: row.id,
      name: row.name,
      industry: row.industry,
      products: row.products ?? "",
      target_audience: row.target_audience ?? "",
      brand_voice: row.brand_voice ?? "",
      // [0] = ana renk, [1] = yardımcı renk. Eski kayıtlar readPalette içinde karşılanır.
      brand_colors: (row.brand_colors ?? []).slice(0, 2),
      primary_share: normalizeShare(row.primary_share),
      content_language: row.content_language,
      logo_data_url: row.logo_url ?? null,
      social_accounts: (accounts ?? []) as SocialAccount[],
    };
  },

  async save(business) {
    const supabase = getSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");

    const storedColors = toStoredColors(
      business.brand_colors?.[0] ?? "",
      business.brand_colors?.[1] ?? ""
    );
    const fields = {
      name: business.name,
      industry: business.industry,
      products: business.products || null,
      target_audience: business.target_audience || null,
      brand_voice: business.brand_voice || null,
      brand_colors: storedColors,
      primary_share: normalizeShare(business.primary_share),
      content_language: business.content_language,
      logo_url: business.logo_data_url,
    };

    const unique = new Map<string, SocialAccount>();
    for (const account of business.social_accounts) {
      const handle = account.handle.trim();
      if (!handle) continue;
      unique.set(`${account.platform}:${handle.toLocaleLowerCase()}`, { ...account, handle });
    }
    const { data: businessId, error: saveError } = await supabase.rpc("save_business_with_accounts", {
      p_business_id: business.id ?? null,
      p_profile: fields,
      p_accounts: [...unique.values()].map(({ id, platform, handle }) => ({
        id: id ?? null,
        platform,
        handle,
      })),
    });
    if (saveError || typeof businessId !== "string") {
      throw new Error(
        `Marka profili ve sosyal hesaplar birlikte kaydedilemedi: ${saveError?.message ?? "RPC geçerli marka kimliği döndürmedi"}. Güncel migration'ları v9'a kadar sırasıyla uygulayın.`
      );
    }

    return { id: businessId };
  },
};

export const EMPTY_BUSINESS: StoredBusiness = {
  name: "",
  industry: "",
  products: "",
  target_audience: "",
  brand_voice: "",
  brand_colors: [],
  primary_share: DEFAULT_RATIO,
  content_language: "tr",
  logo_data_url: null,
  social_accounts: [],
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  other: "Diğer",
};

export interface ValidationErrors {
  name?: string;
  industry?: string;
  brand_colors?: string;
  social_accounts?: string;
}

export function validateBusiness(b: StoredBusiness): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!b.name.trim()) errors.name = "İşletme adı gerekli.";
  if (!b.industry.trim()) errors.industry = "Sektör gerekli.";

  const colors = b.brand_colors ?? [];
  const rawPrimary = colors[0] ?? "";
  const rawSecondary = colors[1] ?? "";
  const primary = normalizeHex(rawPrimary);
  const secondary = normalizeHex(rawSecondary);
  if (!primary || !isValidHex(rawPrimary)) {
    errors.brand_colors = "Ana renk gerekli (#RRGGBB biçiminde).";
  } else if (!secondary || !isValidHex(rawSecondary)) {
    errors.brand_colors =
      "Yardımcı renk de gerekli (#RRGGBB). Görsellerdeki orantılı kullanım bu renkle kurulur.";
  } else if (primary === secondary) {
    errors.brand_colors = "Ana ve yardımcı renk aynı olamaz; vurgu görünmez hâle gelir.";
  }

  if (b.social_accounts.some((account) => !account.handle.trim())) {
    errors.social_accounts = "Boş hesap satırlarını doldurun veya silin.";
  }
  return errors;
}
