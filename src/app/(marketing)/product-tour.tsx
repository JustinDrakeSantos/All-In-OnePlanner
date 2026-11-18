"use client";

import { CalendarDays, Check, ClipboardList, Dumbbell, ListChecks, NotebookPen, Smile, type LucideIcon } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { DemoName } from "./demo-posters";
import { DemoVideo, usePrefersReducedMotion } from "./demo-video";

/** The same icons as the app's sidebar. */
const ICONS: Record<string, LucideIcon> = {
  tasks: ListChecks,
  calendar: CalendarDays,
  planner: ClipboardList,
  journal: NotebookPen,
  mood: Smile,
  fitness: Dumbbell,
};

export interface TourStop {
  /** Also the clip's file name in public/demos. */
  key: DemoName;
  label: string;
  /** The benefit, in a few words. */
  heading: string;
  body: string;
  points: string[];
  /** What the clip shows, for people who can't see it. */
  alt: string;
}

/**
 * Tabs over the parts of the app. Each shows what it's for, beside a clip of
 * it in use that zooms in on the action. The tabs move on by themselves as
 * each clip ends; once the visitor picks one, it stays there and loops.
 */
export function ProductTour({ stops }: { stops: TourStop[] }) {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const autoAdvance = !picked && !reducedMotion;
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const tabId = (index: number) => `${baseId}-tab-${index}`;

  // On phones the tabs scroll sideways; center the active one without moving the page.
  const keepTabInView = (index: number) => {
    const list = listRef.current;
    const tab = document.getElementById(tabId(index));
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const select = (index: number) => {
    setActive(index);
    setPicked(true);
    document.getElementById(tabId(index))?.focus();
    keepTabInView(index);
  };

  const advance = () => {
    const next = (active + 1) % stops.length;
    setActive(next);
    keepTabInView(next);
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

  const stop = stops[active];

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Parts of All-In Planner"
        className="relative -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {stops.map((item, index) => {
          const selected = index === active;
          const Icon = ICONS[item.key];
          return (
            <button
              key={item.key}
              id={tabId(index)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={onKeyDown}
              className={cn(
                "inline-flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sm font-medium whitespace-nowrap transition-colors duration-300",
                selected ? "bg-secondary text-secondary-fg" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
              )}
            >
              {Icon ? <Icon className={cn("size-4 transition-transform duration-300 ease-spring", selected && "scale-110")} aria-hidden /> : null}
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="mt-8 grid items-center gap-8 md:mt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14"
      >
        <div key={stop.key} className="animate-fade-in lg:py-6" aria-live={picked ? "polite" : "off"}>
          <h3 className="font-brand text-3xl leading-[1.08] tracking-tight sm:text-4xl">{stop.heading}</h3>
          <p className="mt-3 max-w-md text-lg text-muted">{stop.body}</p>
          <ul className="mt-6 space-y-3">
            {stop.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink" aria-hidden>
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div key={`${stop.key}-clip`} className="animate-fade-in">
          <DemoVideo
            name={stop.key}
            title={stop.label}
            alt={stop.alt}
            follow
            eager
            loop={!autoAdvance}
            onEnded={autoAdvance ? advance : undefined}
            sizes="(min-width: 1152px) 640px, (min-width: 1024px) 56vw, 100vw"
          />
        </div>
      </div>
    </div>
  );
}
