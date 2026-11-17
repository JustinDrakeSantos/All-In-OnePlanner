"use client";

import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/cn";

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined} {...props}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
        isError ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
        className,
      )}
    >
      {isError ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{state.message}</span>
    </p>
  );
}

/** Helpers for reading a FormState inside a form. */
export function fieldError(state: FormState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name] : undefined;
}

export function fieldValue(state: FormState, name: string, fallback?: string | null): string | undefined {
  if (state.status === "error" && state.values && name in state.values) return state.values[name];
  return fallback ?? undefined;
}

/** Remount the form after each submit so fields reset on success and re-fill on error. */
export function formKey(state: FormState): string {
  return state.status === "idle" ? "initial" : String(state.nonce);
}
