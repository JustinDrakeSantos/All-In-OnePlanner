import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <TextLink href="/login">
          Back to log in
        </TextLink>
      </p>
    </>
  );
}
