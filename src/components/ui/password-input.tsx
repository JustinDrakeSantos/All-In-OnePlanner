"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Input } from "./field";

/**
 * A password field with an eye button that shows or hides what was typed.
 * The button is a toggle (aria-pressed), so it works by click, tap, or keyboard;
 * hovering shows a hint. The field goes back to hidden whenever the form resets.
 */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const hint = visible ? "Hide password" : "Show password";

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label="Show password"
        aria-pressed={visible}
        aria-controls={props.id}
        title={hint}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted transition-colors hover:text-fg focus-visible:outline-offset-[-2px]"
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
