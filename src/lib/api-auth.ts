// API rotaları için ortak oturum doğrulaması. Kullanıcının belirteciyle Supabase'e
// bağlanılır; böylece RLS geçerli kalır.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; response: Response };

export async function authenticate(request: Request): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    return { ok: false, response: Response.json({ error: "Sunucu ayarları eksik." }, { status: 500 }) };
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return { ok: false, response: Response.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 }) };
  }
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: Response.json({ error: "Oturum geçersiz, tekrar giriş yapın." }, { status: 401 }) };
  }
  return { ok: true, supabase, userId: data.user.id };
}

// Basit kullanıcı başına saatlik sınır (sunucu örneği belleğinde). Sunucusuz ortamda
// örnekler arasında paylaşılmaz; bu yüzden kesin değil, kötüye kullanıma karşı ilk frendir.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, limit: number, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return false;
}
