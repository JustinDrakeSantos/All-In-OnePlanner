"use client";

import { ChevronDown, MessageSquare } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * The contact form, folded away behind a clearly labeled native disclosure so
 * it doesn't compete with the FAQ. Following a "#contact" link opens it.
 */
export function ContactDisclosure({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openForHash = () => {
      if (window.location.hash === "#contact" && ref.current) ref.current.open = true;
    };
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, []);

  return (
    <details ref={ref} id="contact" className="faq-item group mt-8 scroll-mt-24 rounded-2xl bg-surface-2">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-4 transition-colors hover:bg-surface-3">
        <MessageSquare className="size-5 shrink-0 text-primary-ink" aria-hidden />
        <span className="flex-1">
          <span className="block font-semibold">Send us a message</span>
          <span className="block text-sm text-muted">Something else on your mind? We&apos;ll reply by email.</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-5 pt-1 pb-6">{children}</div>
    </details>
  );
}
