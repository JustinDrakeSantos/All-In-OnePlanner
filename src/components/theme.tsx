"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";

/*
 * Light / dark / system theme. The preference lives in localStorage; the
 * resolved theme is the data-theme attribute on <html>, set before the first
 * paint by THEME_SCRIPT (src/lib/theme-script.ts) so there's no flash.
 */

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = THEME_STORAGE_KEY;
const CHANGE_EVENT = "aip-theme-change";

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyPreference(preference: ThemePreference) {
  const dark =
    preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Private browsing: the theme still applies for this page.
  }
  applyPreference(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribePreference(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeResolved(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribePreference, readPreference, () => "system");
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribeResolved,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/** Keeps "system" in step with the OS setting and syncs other tabs. Render once, near the root. */
export function ThemeWatcher() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyPreference(readPreference());
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return null;
}

/** One-click switch between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useResolvedTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setThemePreference(next)}
      className={cn("grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg", className)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === "dark" ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}

/** Light / Dark / System choice for Settings. */
export function ThemePicker() {
  const preference = useThemePreference();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-xl bg-surface-2 p-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => setThemePreference(value)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
            preference === value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
