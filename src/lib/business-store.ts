// Depolama katmanı: işletme profili Supabase'de (businesses + social_accounts).
// Erişim güvenliğini schema.sql içindeki RLS politikaları sağlar; her
// kullanıcı yalnızca kendi işletmesini okuyup yazabilir.

import type { BusinessProfile } from "./brand-prompt";
import { getSupabase } from "./supabase";
import { isValidHex, normalizeHex, toStoredColors } from "./brand-palette";

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "x"
  | "linkedin"
  | "youtube"
  | "other";

export interface SocialAccount {
  platform: SocialPlatform;
  handle: string;
}

export interface StoredBusiness extends BusinessProfile {
  id?: string;
  // v1'de logo küçük bir data URL olarak businesses.logo_url sütununda tutulur.
  // Storage bucket'ına geçiş sonraki aşamada.
  logo_data_url: string | null;
  social_accounts: SocialAccount[];
}

export interface BusinessStore {
  get(): Promise<StoredBusiness | null>;
  save(business: StoredBusiness): Promise<{ id: string }>;
}

export const businessStore: BusinessStore = {
  async get() {
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: accounts, error: accError } = await supabase
      .from("social_accounts")
      .select("platform, handle")
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
      // [0] = ana renk, [1] = yardımcı renk. Eski kayıtlardaki 0, 1 veya 3+ renk
      // readPalette içinde güvenle karşılanır; burada yalnızca ilk ikisi tutulur.
      brand_colors: (row.brand_colors ?? []).slice(0, 2),
      content_language: row.content_language,
      logo_data_url: row.logo_url ?? null,
      social_accounts: (accounts ?? []) as SocialAccount[],
    };
  },

  async save(business) {
    const supabase = getSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");

    // Kayıt her zaman tam iki renk içerir.
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
      content_language: business.content_language,
      logo_url: business.logo_data_url,
    };

    let businessId = business.id;
    if (businessId) {
      const { error } = await supabase
        .from("businesses")
        .update(fields)
        .eq("id", businessId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("businesses")
        .insert({ ...fields, owner_id: userData.user.id })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      businessId = data.id as string;
    }

    // Sosyal hesaplar: önce sil, sonra güncel listeyi yaz.
    const { error: delError } = await supabase
      .from("social_accounts")
      .delete()
      .eq("business_id", businessId);
    if (delError) throw new Error(delError.message);

    const unique = new Map<string, SocialAccount>();
    for (const a of business.social_accounts) {
      unique.set(`${a.platform}:${a.handle}`, a);
    }
    if (unique.size > 0) {
      const { error: insError } = await supabase.from("social_accounts").insert(
        [...unique.values()].map((a) => ({
          business_id: businessId,
          platform: a.platform,
          handle: a.handle,
        }))
      );
      if (insError) throw new Error(insError.message);
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
  // Boş başlangıç: kullanıcı ana + yardımcı renk seçmek zorundadır.
  brand_colors: [],
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

  // Markada tam olarak iki renk olur: ana (baskın) ve yardımcı (vurgu).
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

  if (b.social_accounts.some((a) => !a.handle.trim())) {
    errors.social_accounts = "Boş hesap satırlarını doldurun veya silin.";
  }
  return errors;
}
