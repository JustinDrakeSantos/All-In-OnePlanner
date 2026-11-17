import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth/current-user";
import { SignupForm } from "../auth-forms";
import { FormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your planner</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        One place for your calendar, tasks, journal, mood, and fitness. Your entries are private to your account.
      </p>
      <Suspense fallback={<FormSkeleton fields={4} />}>
        <SignupFormUnlessSignedIn />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <TextLink href="/login">
          Log in
        </TextLink>
      </p>
    </>
  );
}

async function SignupFormUnlessSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <SignupForm />;
}
