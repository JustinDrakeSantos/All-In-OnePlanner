import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * A standalone text link ("Open calendar", "All tasks"). An invisible pseudo-element
 * extends the tap target to at least 24px tall without changing the layout.
 */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "relative font-medium text-primary-ink underline-offset-2 hover:underline",
        "after:absolute after:-inset-x-1.5 after:-inset-y-1.5 after:content-['']",
        className,
      )}
      {...props}
    />
  );
}
