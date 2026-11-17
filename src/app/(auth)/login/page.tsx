import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth/current-user";
import { LoginForm } from "../auth-forms";
import { FormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Log in to All-In Planner</h1>
      <div className="mb-6" />
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormForRequest searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <TextLink href="/signup">
          Create an account
        </TextLink>
      </p>
    </>
  );
}

async function LoginFormForRequest({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
