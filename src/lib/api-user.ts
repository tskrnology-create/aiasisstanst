import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthResult =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; response: Response };

function json(body: Record<string, string>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Bearer oturumunu doğrular ve RLS uygulayan kullanıcı-scoped Supabase istemcisi döndürür. */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return { ok: false, response: json({ error: "Sunucu ayarları eksik." }, 500) };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    return { ok: false, response: json({ error: "Giriş yapmanız gerekiyor." }, 401) };
  }

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: json({ error: "Oturum geçersiz, tekrar giriş yapın." }, 401) };
  }
  return { ok: true, supabase };
}

/** Yalnızca istemcinin seçtiği ve RLS ile oturum sahibine ait olduğu doğrulanan işletmeyi döndürür. */
export async function getBusinessById(supabase: SupabaseClient, businessId: unknown) {
  if (!isUuid(businessId)) return { business: null, error: null };
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, industry, products, target_audience, brand_voice, brand_colors, content_language")
    .eq("id", businessId)
    .maybeSingle();
  return { business: data, error };
}
