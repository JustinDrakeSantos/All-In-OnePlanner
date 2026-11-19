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
      {/*
        One canvas behind the rail and the page. The shell is isolated, so the decorative washes
        (z-index -1) sit on the canvas and under all content, where the glass rail, header, and
        panel can blur them. Horizontal overflow is clipped so a wash never widens the page.
      */}
      <div className="app-canvas relative isolate min-h-dvh overflow-x-clip md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <div aria-hidden className="app-wash" />
        <div aria-hidden className="app-wash-main" />

        <aside className="glass-nav sticky top-0 hidden h-dvh flex-col border-r border-nav-line px-3 pt-5 pb-4 md:flex">
          <div className="mb-6 flex items-center justify-between pr-1 pl-2">
            <Link href="/dashboard" className="rounded-lg">
              <Logo />
            </Link>
            <ThemeToggle />
          </div>
          {/* The padding (offset by the margin) leaves room for focus rings inside the scrolling area. */}
          <nav aria-label="App" className="-m-1 min-h-0 flex-1 overflow-y-auto p-1">
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
