import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * A native checkbox, restyled. The visible box is 18px, but the real (invisible)
 * input extends 7px beyond it, so the tap target is 32px without changing layout.
 * The check mark pops in when ticked.
 */
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={cn("relative inline-grid size-[18px] shrink-0 place-items-center", className)}>
      <input type="checkbox" className="peer absolute -inset-[7px] z-10 cursor-pointer opacity-0" {...props} />
      <span
        aria-hidden
        className="size-[18px] rounded-[5px] bg-surface ring-[1.5px] ring-input ring-inset transition-colors peer-checked:bg-primary peer-checked:ring-primary peer-hover:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-ink"
      />
      <Check
        className="pointer-events-none absolute size-3.5 scale-50 text-primary-fg opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
    </span>
  );
}
