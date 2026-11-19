// Tarayıcıdan kendi API uçlarımıza oturum belirteciyle istek atan ortak yardımcı.

import { getSupabase } from "./supabase";

export async function postApi<T = Record<string, unknown>>(
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "İşlem başarısız.");
  return body as T;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi."));
    img.src = src;
  });
}
