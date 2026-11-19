"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/**
 * The day timeline's animations, each a switch so they can be compared:
 *   auto     the day plays on its own when the section comes into view: the sun travels from
 *            7:30 AM to 10:00 PM, pausing at each card, then rests at night. A button pauses,
 *            resumes, and replays it. Without this switch, the day follows the scroll instead.
 *   sun      a small sun rides the arc, and the card under it lifts and warms
 *   moments  each card plays its tiny moment as the sun reaches it (a task checks off,
 *            the streak ticks up, the journal entry writes itself, the mood lifts)
 *   sheen    a streak of light crosses each glass card as the sun passes over it
 *   tilt     on desktop, a card tilts toward the pointer with a glare that follows it (off by default)
 *
 * Try combinations with ?dayfx=auto,sun,moments,sheen,tilt (or ?dayfx=none). Saved for later, not built yet:
 *   hang     cards swing down on threads from their time markers, morning to night
 *
 * --t (the time of day, 0 → 1) lives on the section; globals.css drives it either with a timed
 * animation (data-play) or the section's scroll timeline, and only once data-live says a driver
 * is available. Without one (no JavaScript, reduced motion, or scroll mode in a browser without
 * scroll timelines) the cards show their finished state.
 */
const ALL = ["auto", "sun", "moments", "sheen", "tilt"] as const;
const DEFAULT = "auto sun moments sheen";
const REDUCED = "(prefers-reduced-motion: reduce)";

type PlayState = "idle" | "playing" | "paused" | "done";

function readFx(): string {
  const param = new URLSearchParams(window.location.search).get("dayfx");
  if (param === null) return DEFAULT;
  return param
    .split(/[\s,]+/)
    .filter((fx) => (ALL as readonly string[]).includes(fx))
    .join(" ");
}

const noSubscribe = () => () => {};
function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const PlayContext = createContext<{ state: PlayState; toggle: () => void } | null>(null);

export function DaySection({ className, children, ...props }: { className?: string; children: ReactNode; "aria-labelledby": string }) {
  const ref = useRef<HTMLElement>(null);
  // The URL and media queries only exist in the browser; the server renders the defaults, still.
  const fx = useSyncExternalStore(noSubscribe, readFx, () => DEFAULT);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => true);
  const has = (name: string) => fx.split(" ").includes(name);
  const auto = has("auto");
  const tilt = has("tilt");
  const animated = has("sun") || has("moments") || has("sheen");
  const live =
    !reduced && animated && (auto || (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")));

  const [play, setPlay] = useState<PlayState>("idle");
  const pausedByVisitor = useRef(false);

  // Auto: play when at least 40% of the section is on screen; once it has left the screen
  // entirely, reset so it plays again on the way back (unless the visitor paused it).
  useEffect(() => {
    const section = ref.current;
    if (!section || !live || !auto) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.4) {
          setPlay((state) => (state === "idle" && !pausedByVisitor.current ? "playing" : state));
        } else if (!entry.isIntersecting) {
          setPlay((state) => (state === "paused" ? state : "idle"));
        }
      },
      { threshold: [0, 0.4] },
    );
    observer.observe(section);
    const onEnd = (event: AnimationEvent) => {
      if (event.animationName === "day-auto") setPlay("done");
    };
    section.addEventListener("animationend", onEnd);
    return () => {
      observer.disconnect();
      section.removeEventListener("animationend", onEnd);
    };
  }, [live, auto]);

  const toggle = useCallback(() => {
    if (play === "playing") {
      pausedByVisitor.current = true;
      setPlay("paused");
    } else if (play === "paused") {
      pausedByVisitor.current = false;
      setPlay("playing");
    } else {
      // Replay: drop the animation for a frame so it starts again from dawn.
      pausedByVisitor.current = false;
      setPlay("idle");
      requestAnimationFrame(() => requestAnimationFrame(() => setPlay("playing")));
    }
  }, [play]);

  // Tilt: pointer position → --rx/--ry (degrees) and the glare's center on the card under it.
  useEffect(() => {
    const section = ref.current;
    if (!section || !tilt) return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let current: HTMLElement | null = null;
    let frame = 0;

    const reset = (card: HTMLElement | null) => {
      if (!card) return;
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--glare", "0");
    };
    const onMove = (event: PointerEvent) => {
      if (!query.matches || event.pointerType !== "mouse") return;
      const card = (event.target as Element).closest<HTMLElement>("[data-tilt]");
      if (card !== current) {
        reset(current);
        current = card;
      }
      if (!card) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = card.getBoundingClientRect();
        const x = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
        const y = Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1);
        card.style.setProperty("--rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${((x - 0.5) * 10).toFixed(2)}deg`);
        card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        card.style.setProperty("--glare", "1");
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      reset(current);
      current = null;
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      reset(current);
    };
  }, [tilt]);

  return (
    <PlayContext.Provider value={live && auto ? { state: play, toggle } : null}>
      <section
        ref={ref}
        data-fx={fx}
        data-live={live ? "" : undefined}
        data-play={live && auto && play !== "idle" ? play : undefined}
        className={className}
        {...props}
      >
        {children}
      </section>
    </PlayContext.Provider>
  );
}

/** Pause, resume, or replay the day. Only shown while the day plays on its own. */
export function DayPlayButton({ className }: { className?: string }) {
  const play = useContext(PlayContext);
  if (!play) return null;
  const { state, toggle } = play;
  const [Icon, label] =
    state === "playing" ? [Pause, "Pause"] : state === "done" ? [RotateCcw, "Replay"] : [Play, "Play"];
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${label} the day's animation`}
      className={`glass-card inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-fg transition-colors hover:bg-white/60 dark:hover:bg-white/10 ${className ?? ""}`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}
