"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A modal built on the native <dialog> element: focus is trapped, Escape
 * closes it, and the page behind is inert.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] dialog-surface rounded-2xl p-0 text-fg open:animate-rise",
        className,
      )}
    >
      {open ? (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-6 pt-2 pb-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
