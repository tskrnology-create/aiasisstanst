// API rotaları için ortak oturum doğrulaması. Kullanıcının belirteciyle Supabase'e
// bağlanılır; böylece RLS geçerli kalır.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; supabase: SupabaseClient }
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
  return { ok: true, supabase };
}
