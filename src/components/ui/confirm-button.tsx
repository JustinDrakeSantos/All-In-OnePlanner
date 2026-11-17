"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Button } from "./button";
import { useToast } from "./toast";

/**
 * A destructive button that asks for a second click before acting.
 * The confirmation resets after a few seconds.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Click again to confirm",
  size = "sm",
  variant = "ghost",
  className,
  "aria-label": ariaLabel,
}: {
  onConfirm: () => Promise<void> | void;
  children: ReactNode;
  confirmLabel?: string;
  size?: "sm" | "md" | "icon";
  variant?: "ghost" | "outline" | "danger";
  className?: string;
  "aria-label"?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      size={armed && size === "icon" ? "sm" : size}
      variant={armed ? "danger" : variant}
      className={className}
      disabled={pending}
      aria-label={armed ? confirmLabel : ariaLabel}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        startTransition(async () => {
          try {
            await onConfirm();
          } catch (error) {
            // Let Next.js handle its own redirects (for example after deleting a journal entry).
            unstable_rethrow(error);
            toast.error("That didn't go through. Check your connection and try again.");
          }
        });
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
