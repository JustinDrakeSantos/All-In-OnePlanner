import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Frames a live demo on the landing page like an app window, with a plain note
 * that the data is sample data and a reset button.
 */
export function DemoFrame({
  title,
  hint,
  onReset,
  children,
}: {
  title: string;
  hint: string;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-surface text-left shadow-pop ring-1 ring-fg/5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface-2 px-5 py-3">
        <p className="text-sm">
          <span className="font-semibold">{title}</span>
          <span className="ml-3 text-muted">{hint}</span>
        </p>
        <div className="flex items-center gap-3 text-meta text-muted">
          <span>Sample data. Nothing is saved.</span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-fg transition-colors hover:bg-surface-3"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        </div>
      </div>
      <div className="p-5 sm:p-8">{children}</div>
    </div>
  );
}
