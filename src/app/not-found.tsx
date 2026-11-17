import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo withWordmark={false} />
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-muted">That page doesn&apos;t exist, or the entry was deleted.</p>
      <div className="flex gap-2">
        <Link href="/dashboard" className={buttonClasses()}>Go to dashboard</Link>
        <Link href="/" className={buttonClasses({ variant: "outline" })}>Home</Link>
      </div>
    </main>
  );
}
