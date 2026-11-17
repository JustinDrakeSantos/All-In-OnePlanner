"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/ui/misc";
import { ActiveNavList, NavList } from "./nav";

/** Top bar with a slide-in navigation drawer for small screens. */
export function MobileNav({ account }: { account: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between bg-bg/90 px-4 py-2.5 shadow-[0_1px_0_var(--line)] backdrop-blur md:hidden">
      <Link href="/dashboard" className="rounded-lg">
        <Logo />
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-10 place-items-center rounded-lg text-fg hover:bg-surface-2"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu className="size-6" aria-hidden />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        aria-label="Navigation"
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(20rem,85vw)] bg-sidebar p-0 text-fg"
      >
        {open ? (
          <div className="flex h-full flex-col p-4">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={close} className="grid size-10 place-items-center rounded-lg hover:bg-sidebar-active" aria-label="Close navigation">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <nav aria-label="App" className="min-h-0 flex-1 overflow-y-auto">
              <Suspense fallback={<NavList pathname={null} />}>
                <ActiveNavList onNavigate={close} />
              </Suspense>
            </nav>
            <div className="mt-3 pt-3">{account}</div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
