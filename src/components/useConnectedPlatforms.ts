"use client";

// İşletmenin kayıtta eklediği sosyal platformlar. Hiç hesap yoksa null döner (arayüz tüm platformları gösterir).

import { useEffect, useState } from "react";
import { businessStore, type SocialPlatform } from "@/lib/business-store";

export function useConnectedPlatforms(businessId: string | null): SocialPlatform[] | null {
  const [state, setState] = useState<{ id: string; platforms: SocialPlatform[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!businessId) return;
    businessStore
      .get(businessId)
      .then((b) => {
        if (cancelled) return;
        const list = Array.from(new Set((b?.social_accounts ?? []).map((a) => a.platform)));
        setState({ id: businessId, platforms: list });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [businessId]);
  if (!businessId || state?.id !== businessId || state.platforms.length === 0) return null;
  return state.platforms;
}
