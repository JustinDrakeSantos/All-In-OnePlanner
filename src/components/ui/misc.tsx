import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Page title area. Plain type on the page background; no banner. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pt-8 pb-2 sm:px-6 md:pt-10">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-sm text-muted tabular-nums">{eyebrow}</p> : null}
        <h1 className="text-page font-semibold text-fg md:text-page-lg">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-panel text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PageBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto max-w-6xl px-4 py-6 sm:px-6", className)} {...props} />;
}

/** Small group label inside a list (sentence case; it names the group, not decoration). */
export function SectionLabel({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("mb-1 text-meta font-semibold text-muted", className)} {...props} />;
}

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl bg-surface-2 px-6 py-8 text-center", className)}>
      <p className="font-medium text-fg">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

/** The dashboard's check-ins: one frosted-glass surface with quiet dividers between its sections. */
export const glassPanelClasses = "glass-panel divide-y divide-glass-divider rounded-2xl px-5";

/**
 * Holds the check-ins panel and the wash behind its upper part, which reaches past the
 * panel's edges so the same color shows crisply on the page and softly through the glass.
 */
export function CheckinsFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      <div aria-hidden className="checkins-wash" />
      {children}
    </div>
  );
}

/** Placeholder shown while a page's personal data streams in. */
export function PageSkeleton({ layout = "split" }: { layout?: "split" | "single" | "grid" | "dashboard" }) {
  const block = (lines: number, key: number) => (
    <div key={key} className="glass-panel rounded-2xl p-5">
      <Skeleton className="mb-4 h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("mb-2.5 h-3.5", i % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
  // A heading over rows, straight on the page (the dashboard's schedule and tasks).
  const plain = (rows: number, key: number) => (
    <div key={key}>
      <Skeleton className="mb-4 h-4 w-1/4" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="mb-1 h-12 w-full" />
      ))}
    </div>
  );
  return (
    <PageBody>
      <p className="sr-only" role="status">
        Loading…
      </p>
      {layout === "dashboard" ? (
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-10">{[plain(4, 0), plain(3, 1)]}</div>
          <CheckinsFrame>
            <div className={glassPanelClasses}>
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="py-5">
                  <Skeleton className="mb-4 h-4 w-1/3" />
                  <Skeleton className="mb-2.5 h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              ))}
            </div>
          </CheckinsFrame>
        </div>
      ) : layout === "split" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">{[block(8, 0), block(4, 1)]}</div>
          <div className="space-y-6">{[block(3, 2), block(3, 3), block(2, 4)]}</div>
        </div>
      ) : layout === "grid" ? (
        <div className="grid items-start gap-6 md:grid-cols-2">{[block(5, 0), block(5, 1), block(3, 2), block(3, 3)]}</div>
      ) : (
        <div className="space-y-6">{[block(6, 0), block(3, 1)]}</div>
      )}
    </PageBody>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className="h-full origin-left rounded-full bg-chart-1 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** The original logo artwork; inverted and hue-shifted in dark mode so the lines stay visible. */
export function Logo({ withWordmark = true, className }: { withWordmark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      {/* Tiny already; served as-is so it never depends on the image resizer. */}
      <Image src="/images/logo.png" alt="" width={22} height={33} preload unoptimized className="h-8 w-auto dark:hue-rotate-180 dark:invert" />
      {withWordmark ? <span className="font-brand text-[1.2rem] leading-none tracking-tight whitespace-nowrap">All-In Planner</span> : null}
    </span>
  );
}

/** Underlined section tabs (links, so each tab has its own URL). */
export function TabLinks({
  tabs,
  active,
  label,
}: {
  tabs: { href: string; label: string; key: string }[];
  active: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
            tab.key === active ? "text-fg after:bg-selected-ink" : "text-muted after:bg-transparent hover:text-fg",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** A label/value row for small stat lists (numbers align in a column). */
export function StatRow({ label, value, emphasis }: { label: ReactNode; value: ReactNode; emphasis?: "danger" | "accent" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums",
          emphasis === "danger" && "text-danger",
          emphasis === "accent" && "rounded-md bg-accent px-1.5 text-accent-fg",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
