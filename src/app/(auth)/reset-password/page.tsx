import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "../auth-forms";
import { FormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted">This signs you out on every other device.</p>
      <Suspense fallback={<FormSkeleton />}>
        <ResetFormForToken searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResetFormForToken({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length < 20) {
    return (
      <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
        This reset link is incomplete.{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }
  return <ResetPasswordForm token={token} />;
}
