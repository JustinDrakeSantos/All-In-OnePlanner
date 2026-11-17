import type { z } from "zod";

/** State returned by every form action and read with useActionState. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; message?: string; nonce: number }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
      nonce: number;
    };

export const initialFormState: FormState = { status: "idle" };

export function success(message?: string): FormState {
  return { status: "success", message, nonce: Date.now() };
}

export function failure(
  message: string,
  extra: { fieldErrors?: Record<string, string>; values?: Record<string, string> } = {},
): FormState {
  return { status: "error", message, nonce: Date.now(), ...extra };
}

/** First string value of each field, for echoing input back after an error. */
export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$") || omit.includes(key)) continue;
    if (!(key in values)) values[key] = value;
  }
  return values;
}

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** Validates FormData with a schema; on failure returns a ready-made error state. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  options: { arrays?: string[]; secret?: string[] } = {},
): { ok: true; data: z.infer<S> } | { ok: false; state: FormState } {
  const input: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$")) continue;
    input[key] = options.arrays?.includes(key)
      ? formData.getAll(key).filter((v) => typeof v === "string")
      : formData.get(key);
  }
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    state: failure("Please fix the highlighted fields.", {
      fieldErrors: fieldErrorsOf(result.error),
      values: formValues(formData, options.secret),
    }),
  };
}
