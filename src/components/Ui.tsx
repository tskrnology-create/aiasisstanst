"use client";

// Ortak arayüz bileşenleri: tüm ekranlar aynı görsel dili kullansın diye tek yerde.

import Link from "next/link";
import { STATUS_LABEL, type ContentStatus } from "@/lib/library-utils";
import { IconAlert, IconCheck, IconInfo } from "./Icons";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink " +
  "shadow-[0_1px_0_rgba(16,16,24,0.03)] transition placeholder:text-faint " +
  "hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/15 " +
  "focus:outline-none disabled:pointer-events-none disabled:opacity-60";

export const selectClass = cx(inputClass, "cursor-pointer appearance-none pr-9");

export const labelClass = "text-sm font-medium text-ink";

export const hintClass = "text-xs leading-relaxed text-muted";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-ink hover:bg-brand-strong shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--brand)_80%,transparent)]",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
  soft: "bg-brand-soft text-brand hover:bg-brand-soft/70 dark:text-brand-strong",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:border-danger/50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
};

const buttonBase =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={cx(buttonBase, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  href,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link className={cx(buttonBase, VARIANTS[variant], SIZES[size], className)} href={href} {...props} />
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition",
        "hover:border-line-strong hover:text-ink disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && !error && <p className={hintClass}>{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <IconAlert className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export function SectionCard({
  step,
  title,
  description,
  aside,
  className,
  children,
}: {
  step?: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-line bg-surface/90 p-5 shadow-soft backdrop-blur-sm sm:p-6",
        className
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {step && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{step}</p>
          )}
          <h2 className="text-base font-semibold text-ink sm:text-lg">{title}</h2>
          {description && <p className="max-w-prose text-sm text-muted">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(
        "inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,16,24,0.08)]"
                : "text-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50",
        active
          ? "border-brand bg-brand-soft text-brand dark:text-brand-strong"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "border-warn/25 bg-warn-soft text-warn",
  approved: "border-ok/25 bg-ok-soft text-ok",
  archived: "border-line bg-surface-2 text-muted",
};

export function StatusPill({ status }: { status: ContentStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Tag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "danger" | "ok" | "brand";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-line bg-surface-2 text-muted",
    danger: "border-danger/30 bg-danger-soft text-danger",
    ok: "border-ok/25 bg-ok-soft text-ok",
    brand: "border-brand/25 bg-brand-soft text-brand dark:text-brand-strong",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Callout({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "error" | "success" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-line bg-surface-2 text-ink-soft",
    error: "border-danger/25 bg-danger-soft text-danger",
    success: "border-ok/25 bg-ok-soft text-ok",
    warning: "border-warn/25 bg-warn-soft text-warn",
  } as const;
  const Icon = tone === "error" ? IconAlert : tone === "success" ? IconCheck : IconInfo;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
        styles[tone],
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface-2/60 px-6 py-12 text-center">
      {icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand dark:text-brand-strong">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PlatformBadge({
  initials,
  color,
  label,
  className,
}: {
  initials: string;
  color: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cx(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}
