"use client";

import { TextLink } from "@/components/ui/text-link";
import { useActionState, useSyncExternalStore } from "react";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { initialFormState } from "@/lib/forms";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signupAction,
} from "./actions";

const subscribeNever = () => () => {};

/** The browser's IANA time zone, so "today" is computed for where the user lives. */
function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    subscribeNever,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={fieldValue(state, "next", next) ?? ""} />
      <Field id="email" label="Email" error={fieldError(state, "email")}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" required defaultValue={fieldValue(state, "email")} />}
      </Field>
      <Field id="password" label="Password" error={fieldError(state, "password")}>
        {(a) => <PasswordInput {...a} name="password" autoComplete="current-password" required />}
      </Field>
      <div className="flex justify-end text-sm">
        <TextLink href="/forgot-password">
          Forgot password?
        </TextLink>
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initialFormState);
  const timeZone = useBrowserTimeZone();
  return (
    <form key={formKey(state)} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="timezone" value={timeZone} />
      <Field id="name" label="Name" error={fieldError(state, "name")}>
        {(a) => <Input {...a} name="name" autoComplete="name" required defaultValue={fieldValue(state, "name")} />}
      </Field>
      <Field id="email" label="Email" error={fieldError(state, "email")}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" required defaultValue={fieldValue(state, "email")} />}
      </Field>
      <Field id="password" label="Password" hint="At least 8 characters." error={fieldError(state, "password")}>
        {(a) => <Input {...a} name="password" type="password" autoComplete="new-password" required minLength={8} />}
      </Field>
      <Field id="confirmPassword" label="Confirm password" error={fieldError(state, "confirmPassword")}>
        {(a) => <Input {...a} name="confirmPassword" type="password" autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field id="email" label="Email" error={fieldError(state, "email")}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" required defaultValue={fieldValue(state, "email")} />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="New password" hint="At least 8 characters." error={fieldError(state, "password")}>
        {(a) => <Input {...a} name="password" type="password" autoComplete="new-password" required minLength={8} />}
      </Field>
      <Field id="confirmPassword" label="Confirm new password" error={fieldError(state, "confirmPassword")}>
        {(a) => <Input {...a} name="confirmPassword" type="password" autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
