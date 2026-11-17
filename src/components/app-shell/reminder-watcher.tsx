"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Reminder {
  id: string;
  title: string;
  body: string;
  at: string;
  href: string;
}

const REFRESH_MS = 5 * 60 * 1000;
const STORAGE_KEY = "aip:shown-reminders";

function loadShown(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveShown(ids: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Storage can be unavailable (private mode); reminders still work for this page.
  }
}

/**
 * Shows event and mood check-in reminders while the app is open: an in-page
 * toast, plus a system notification if the user allowed them in Settings.
 */
export function ReminderWatcher() {
  const [toasts, setToasts] = useState<Reminder[]>([]);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const shown = loadShown();
    let cancelled = false;
    const activeTimers = timers.current;
    const controller = new AbortController();

    const fire = (reminder: Reminder) => {
      if (shown.has(reminder.id)) return;
      shown.add(reminder.id);
      saveShown(shown);
      setToasts((current) => [...current, reminder]);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(reminder.title, { body: reminder.body, tag: reminder.id });
        } catch {
          // Some browsers only allow notifications from a service worker.
        }
      }
    };

    const load = async () => {
      try {
        const response = await fetch("/api/reminders", { cache: "no-store", signal: controller.signal });
        if (!response.ok || cancelled) return;
        const { reminders } = (await response.json()) as { reminders: Reminder[] };
        for (const reminder of reminders) {
          if (shown.has(reminder.id) || activeTimers.has(reminder.id)) continue;
          const delay = new Date(reminder.at).getTime() - Date.now();
          if (delay > REFRESH_MS * 2) continue;
          const timer = window.setTimeout(() => {
            activeTimers.delete(reminder.id);
            fire(reminder);
          }, Math.max(0, delay));
          activeTimers.set(reminder.id, timer);
        }
      } catch {
        // Offline or signed out; try again on the next tick.
      }
    };

    void load();
    const interval = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
      for (const timer of activeTimers.values()) window.clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="region" aria-label="Reminders">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className="flex animate-rise items-start gap-3 rounded-xl bg-surface p-4 shadow-pop">
          <Bell className="mt-0.5 size-5 shrink-0 text-primary-ink" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{toast.title}</p>
            <p className="text-sm text-muted">{toast.body}</p>
            <Link
              href={toast.href}
              className="mt-1 inline-block text-sm font-medium text-primary-ink hover:underline"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
            >
              Open
            </Link>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-muted hover:bg-surface-2"
            aria-label="Dismiss reminder"
            onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
