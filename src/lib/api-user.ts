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
  const { data, error } = await Promise.race([
    supabase.auth.getUser(token),
    new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error("timeout") }), 10_000)
    ),
  ]);
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
    .select("id, name, industry, products, target_audience, brand_voice, brand_colors, primary_share, content_language")
    .eq("id", businessId)
    .maybeSingle();
  return { business: data, error };
}

// --- Özel depo (visuals) işlemleri: kullanıcının oturum belirteciyle doğrudan Storage REST'e gider. ---

type StorageResult = { ok: true } | { ok: false; status: number; message: string };

function storageEndpoint(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/visuals/${encoded}`;
}

function storageHeaders(request: Request): Record<string, string> | null {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!key || !token) return null;
  return { apikey: key, Authorization: `Bearer ${token}` };
}

export async function uploadVisual(
  request: Request,
  path: string,
  bytes: Uint8Array,
  contentType: string,
  timeoutMs = 30_000
): Promise<StorageResult> {
  const url = storageEndpoint(path);
  const headers = storageHeaders(request);
  if (!url || !headers) return { ok: false, status: 500, message: "Sunucu ayarları eksik." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": contentType, "x-upsert": "false", "Cache-Control": "max-age=3600" },
      body: new Blob([bytes as BlobPart], { type: contentType }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: text.slice(0, 300) };
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.name : "bilinmeyen" };
  }
}

export async function removeVisual(request: Request, path: string): Promise<boolean> {
  const url = storageEndpoint(path);
  const headers = storageHeaders(request);
  if (!url || !headers) return false;
  try {
    const response = await fetch(url, { method: "DELETE", headers, signal: AbortSignal.timeout(15_000) });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/** Depo hatasını kısa bir tanı koduna çevirir (ayrıntı müşteriye gitmez). */
export function storageErrorCode(result: { status: number; message: string }): string {
  const reason = result.message.toLowerCase();
  const suffix = result.status ? `_${result.status}` : "";
  if (/bucket not found/.test(reason)) return `DEPO_YOK${suffix}`;
  if (/row-level security|policy|unauthorized|not authorized|permission|jwt/.test(reason)) return `DEPO_IZIN${suffix}`;
  if (/mime|not supported/.test(reason)) return `DEPO_TUR${suffix}`;
  if (/size|too large|exceed/.test(reason)) return `DEPO_BOYUT${suffix}`;
  return `DEPO_DIGER${suffix}`;
}
