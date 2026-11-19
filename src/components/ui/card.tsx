import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A group of related content.
 * - "plain" (default): sits directly on the page; spacing and the heading do the grouping.
 * - "panel": a pane of frosted glass for side summaries, so they read as secondary to the main content.
 */
export function Card({
  className,
  variant = "plain",
  ...props
}: ComponentProps<"section"> & { variant?: "plain" | "panel" }) {
  return <section className={cn(variant === "panel" && "glass-panel rounded-2xl p-5", className)} {...props} />;
}

export function CardHeader({
  title,
  action,
  description,
  className,
  headingLevel = 2,
}: {
  title: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-3", className)}>
      <div className="min-w-0">
        <Heading className={cn("font-semibold text-fg", headingLevel === 2 ? "text-section" : "text-panel")}>{title}</Heading>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={className} {...props} />;
}

/** A quiet text link used in card headers ("All tasks", "Open calendar"). */
export function CardLink({ className, ...props }: ComponentProps<"a">) {
  return <a className={cn("font-medium text-primary-ink hover:underline", className)} {...props} />;
}
