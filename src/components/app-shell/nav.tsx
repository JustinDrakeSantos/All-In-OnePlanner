"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Daily Planner", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/mood", label: "Mood", icon: Smile },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
] as const;

function isActive(pathname: string | null, href: string) {
  return pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: (typeof NAV_ITEMS)[number]["icon"] | typeof Settings;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-panel transition-colors",
        active ? "bg-nav-active font-semibold text-nav-active-fg" : "text-muted hover:bg-nav-hover hover:text-fg",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active && "text-nav-active-icon")} strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className="flex-1">{label}</span>
      <PendingHint />
    </Link>
  );
}

/**
 * A fixed-size dot that fades in while a slow navigation is pending (for example
 * before prefetching finishes). Always rendered, so it never shifts the layout.
 */
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full bg-primary-ink transition-opacity duration-150",
        pending ? "animate-pulse opacity-100 delay-100" : "opacity-0",
      )}
    />
  );
}

/** The nav list itself; `pathname` null renders it without an active item (Suspense fallback). */
export function NavList({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink {...item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <ul className="mt-auto pt-4">
        <li>
          <NavLink href="/settings" label="Settings" icon={Settings} active={isActive(pathname, "/settings")} onNavigate={onNavigate} />
        </li>
      </ul>
    </div>
  );
}

export function ActiveNavList({ onNavigate }: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}
