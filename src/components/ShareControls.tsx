"use client";

// Manuel paylaşım kontrolleri. Otomatik gönderim yoktur; kullanıcı metni kopyalar,
// platformun kendi paylaşım ekranını açar ve orada yapıştırır.

import { useState } from "react";
import type { SocialPlatform } from "@/lib/business-store";
import { ALL_SHARE_TARGETS, copyToClipboard, openCompose, shareTarget } from "@/lib/share-links";
import { Button, PlatformBadge, cx } from "./Ui";
import { IconCheck, IconCopy, IconExternal } from "./Icons";

export function CopyButton({
  text,
  size = "sm",
  label = "Metni kopyala",
  variant = "secondary",
}: {
  text: string;
  size?: "sm" | "md";
  label?: string;
  variant?: "secondary" | "primary" | "soft" | "ghost";
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function onCopy() {
    const ok = await copyToClipboard(text);
    setState(ok ? "done" : "failed");
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <Button
      type="button"
      variant={state === "failed" ? "danger" : variant}
      size={size}
      onClick={onCopy}
      disabled={!text.trim()}
      title={state === "failed" ? "Panoya kopyalanamadı, metni elle seçip kopyalayın." : label}
    >
      {state === "done" ? <IconCheck /> : <IconCopy />}
      {state === "done" ? "Kopyalandı" : state === "failed" ? "Kopyalanamadı" : label}
    </Button>
  );
}

export function OpenPlatformButton({
  platform,
  size = "sm",
}: {
  platform: SocialPlatform | null | undefined;
  size?: "sm" | "md";
}) {
  const target = shareTarget(platform);
  if (!target?.composeUrl) return null;
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={() => openCompose(target)}
      title={target.hint}
    >
      <PlatformBadge initials={target.initials} color={target.color} label={target.label} className="h-5 w-5" />
      {target.label}&apos;da aç
      <IconExternal className="h-3.5 w-3.5 opacity-70" />
    </Button>
  );
}

export function PlatformPicker({
  value,
  onChange,
  className,
}: {
  value: SocialPlatform | null;
  onChange: (platform: SocialPlatform) => void;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap gap-1.5", className)} role="group" aria-label="Paylaşım platformu">
      {ALL_SHARE_TARGETS.map((target) => {
        const active = value === target.platform;
        return (
          <button
            key={target.platform}
            type="button"
            aria-pressed={active}
            title={target.hint}
            onClick={() => onChange(target.platform)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition",
              active
                ? "border-brand bg-brand-soft text-brand dark:text-brand-strong"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            )}
          >
            <PlatformBadge initials={target.initials} color={target.color} label={target.label} className="h-4 w-4 rounded" />
            {target.label}
          </button>
        );
      })}
    </div>
  );
}
