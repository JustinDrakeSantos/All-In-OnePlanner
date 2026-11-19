import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/server/auth/current-user";

/** Signed-in user's name with a sign-out button. Reads the session, so render inside <Suspense>. */
export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg" aria-hidden>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-nav-hover hover:text-fg"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-[18px]" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function AccountMenuSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="skeleton size-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <span className="skeleton block h-3 w-24 rounded" />
        <span className="skeleton block h-2.5 w-32 rounded" />
      </div>
    </div>
  );
}
