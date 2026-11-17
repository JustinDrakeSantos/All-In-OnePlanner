"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TourStop {
  key: string;
  label: string;
  description: string;
  /** A working demo or a screenshot of the real page. */
  media: ReactNode;
}

/** Tabs that switch between live demos and screenshots of each part of the app. */
export function ProductTour({ stops }: { stops: TourStop[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();

  // On phones the tabs scroll sideways; bring the chosen one fully into view.
  const select = (index: number) => {
    setActive(index);
    const tab = document.getElementById(`${baseId}-tab-${index}`);
    tab?.focus();
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = stops.length - 1;
    const next =
      event.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Parts of All-In Planner"
        className="-mx-4 flex scroll-px-4 gap-1 overflow-x-auto scroll-smooth px-4 pb-1 motion-reduce:scroll-auto sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {stops.map((stop, index) => (
          <button
            key={stop.key}
            id={`${baseId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={onKeyDown}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              index === active ? "bg-secondary text-secondary-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {stop.label}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="mt-8"
      >
        <p className="mx-auto mb-8 max-w-2xl text-center text-lg text-muted" aria-live="polite">
          {stops[active].description}
        </p>
        <div key={stops[active].key} className="animate-rise">
          {stops[active].media}
        </div>
      </div>
    </div>
  );
}
