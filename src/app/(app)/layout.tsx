import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu, AccountMenuSkeleton } from "@/components/app-shell/account-menu";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { ActiveNavList, NavList } from "@/components/app-shell/nav";
import { ReminderWatcher } from "@/components/app-shell/reminder-watcher";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/ui/misc";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const account = (
    <Suspense fallback={<AccountMenuSkeleton />}>
      <AccountMenu />
    </Suspense>
  );

  return (
    <ToastProvider>
      {/* The gradient paints the sidebar column full height even when the page is taller than the screen. */}
      <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:bg-[linear-gradient(to_right,var(--sidebar)_15rem,transparent_15rem)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar px-3 pt-5 pb-4 md:flex">
          <div className="mb-6 flex items-center justify-between pr-1 pl-2">
            <Link href="/dashboard" className="rounded-lg">
              <Logo />
            </Link>
            <ThemeToggle />
          </div>
          <nav aria-label="App" className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<NavList pathname={null} />}>
              <ActiveNavList />
            </Suspense>
          </nav>
          <div className="mt-3 px-1 pt-3">{account}</div>
        </aside>

        <MobileNav account={account} />

        <main id="main" className="min-w-0 pb-16">
          {children}
        </main>

        <ReminderWatcher />
      </div>
    </ToastProvider>
  );
}
