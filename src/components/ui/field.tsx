import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const controlClasses = cn(
  "rounded-lg bg-surface px-3 text-sm text-fg ring-1 ring-input ring-inset transition-shadow",
  "placeholder:text-subtle hover:ring-subtle/60",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  "aria-invalid:ring-2 aria-invalid:ring-danger disabled:opacity-60",
);

/*
 * Two Tailwind classes for the same property (w-full and w-28) don't override
 * each other by order of appearance, so the default width and height are only
 * added when the caller didn't pass its own.
 */
const setsWidth = (className?: string) => /(^|\s)([\w@-]+:)*(w-|flex-1)/.test(className ?? "");
const setsHeight = (className?: string) => /(^|\s)([\w@-]+:)*h-/.test(className ?? "");

function sized(className: string | undefined, defaultHeight: string | null) {
  return cn(
    controlClasses,
    !setsWidth(className) && "w-full",
    defaultHeight && !setsHeight(className) && defaultHeight,
    className,
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-fg", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={sized(className, "h-10")} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(sized(className, null), "min-h-24 py-2 leading-relaxed")} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(sized(className, "h-10"), "pr-8")} {...props} />;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 animate-rise text-sm text-danger">
      {message}
    </p>
  );
}

/**
 * A labelled control with an error message. `children` receives the props that
 * wire up accessibility (id, aria-invalid, aria-describedby).
 */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Color tone swatches (radio group) for events, lists, and habits. */
export function ToneSwatches({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Color</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer" title={option.label}>
            <input type="radio" name={name} value={option.value} defaultChecked={option.value === defaultValue} className="peer sr-only" />
            <span
              data-tone={option.value}
              className="tone-dot block size-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
            />
            <span className="sr-only">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
