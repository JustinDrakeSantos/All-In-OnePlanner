import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * A real screenshot of the app, in the light or dark version to match the
 * current theme. Images live in public/screenshots/ and are regenerated with
 * `npm run screenshots` (see scripts/capture-screenshots.mjs).
 */
export function Screenshot({
  name,
  alt,
  priority = false,
  className,
}: {
  name: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const size = { width: 2560, height: 1600, sizes: "(min-width: 1152px) 1104px, 100vw" };
  return (
    <div className={cn("overflow-hidden rounded-xl bg-surface shadow-pop ring-1 ring-fg/5", className)}>
      <Image {...size} src={`/screenshots/${name}-light.webp`} alt={alt} priority={priority} className="h-auto w-full dark:hidden" />
      <Image {...size} src={`/screenshots/${name}-dark.webp`} alt="" aria-hidden priority={priority} className="hidden h-auto w-full dark:block" />
    </div>
  );
}
