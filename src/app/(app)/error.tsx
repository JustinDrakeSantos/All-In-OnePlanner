"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageBody>
      <div role="alert" className="mx-auto max-w-lg rounded-2xl bg-danger-soft p-6 text-center">
        <h1 className="text-xl font-semibold">This section didn&apos;t load</h1>
        <p className="mt-2 text-sm">
          Your saved data is safe. Try again, and if it keeps happening, tell us through the contact form on the home page.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p> : null}
        <Button className="mt-4" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
      </div>
    </PageBody>
  );
}
