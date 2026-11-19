import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { getCurrentUser } from "@/server/auth/current-user";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      {/* A floating pane of dense frosted glass: the page shows through it, softened, as it scrolls. */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
        <div className="glass-strong mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl pr-2 pl-3 sm:pr-2.5 sm:pl-5">
          <Link href="/" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-fg">Features</a>
            <a href="#connected" className="transition-colors hover:text-fg">How it works</a>
            <a href="#faq" className="transition-colors hover:text-fg">FAQ</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeToggle />
            <Suspense fallback={<SignedOutButtons />}>
              <AccountButtons />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      {/* Positioned, so it paints over the landing page's fixed background wash. */}
      <footer className="relative bg-secondary text-secondary-fg dark:bg-surface-2 dark:text-fg">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="opacity-80">All-In Planner. Your day, all in one place.</p>
          <nav aria-label="Footer" className="flex gap-5 opacity-80">
            <Link href="/login" className="hover:underline">Log in</Link>
            <Link href="/signup" className="hover:underline">Sign up</Link>
            <a href="#contact" className="hover:underline">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SignedOutButtons() {
  return (
    <>
      <ButtonLink href="/login" variant="ghost" size="sm" className="rounded-xl!">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup" size="sm" className="rounded-xl!">
        Sign up
      </ButtonLink>
    </>
  );
}

async function AccountButtons() {
  const user = await getCurrentUser();
  if (!user) return <SignedOutButtons />;
  return (
    <ButtonLink href="/dashboard" size="sm" className="rounded-xl!">
      Open your planner
    </ButtonLink>
  );
}
