"use client";

import { Check, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MoodIcon } from "@/components/mood-icon";
import { useResolvedTheme } from "@/components/theme";
import { cn } from "@/lib/cn";
import {
  blend,
  closedPath,
  contains,
  easeInOut,
  ellipse,
  isolines,
  linePath,
  matchRing,
  roundedRect,
  simplify,
  span,
  type ContourLine,
  type Pt,
} from "@/lib/topo";
import { DemoVideo, TRACKS, usePrefersReducedMotion } from "./demo-video";
import { SkyWindow } from "./sky";

/** Contour levels; every fifth one is drawn heavier, like the index lines on a survey map. */
const LEVELS = Array.from({ length: 13 }, (_, i) => 0.1 + i * 0.07);
const isIndex = (level: number) => level % 5 === 1;

/**
 * Where the morphing lines land, as fractions of the preview frame, measured
 * from the dashboard clip's first frame (1920×1200): the frame, the side
 * panel (mood, habits, water), the sidebar, and the gold schedule block.
 * Largest first, matched to the largest contours.
 */
const TARGETS = [
  { box: [0, 0, 1, 1], radius: () => 12 },
  { box: [0.7318, 0.1725, 0.9813, 1], radius: (w: number) => (24 * w) / 1920 },
  { box: [0, 0, 0.1875, 1], radius: () => 12 },
  { box: [0.2063, 0.2425, 0.7, 0.3117], radius: (w: number) => (12 * w) / 1920, gold: true },
] as const;

const MORPH_IN_MS = 600;
const MORPH_OUT_MS = 450;
/** Each line sets off a little after the one before it (as a share of the whole morph): the frame forms first. */
const STAGGER = [0, 0.07, 0.12, 0.17];
const LINE_SHARE = 1 - STAGGER[STAGGER.length - 1];
/** The preview starts fading in while the last lines are still settling, so it's on screen in well under a second. */
const REVEAL_AT = 0.65;
/** Matches the preview's fade-in in globals.css. */
const FADE_IN_MS = 300;

interface TopoMap {
  /** The map covers the whole hero; it sits in the preview's layer, so it's shifted up by this much. */
  top: number;
  left: number;
  width: number;
  height: number;
  field: { d: string; index: boolean }[];
  morph: { from: Pt[]; to: Pt[]; index: boolean; gold: boolean }[];
}

/**
 * Lay out the terrain for the hero as it is right now: one hill under the
 * preview frame (its rings are the ones that become the dashboard) and two
 * behind the headline, then trace its contours.
 */
function survey(section: HTMLElement, layer: HTMLElement, frame: HTMLElement): TopoMap {
  const s = section.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const f = frame.getBoundingClientRect();
  const copy = section.querySelector(".hero-copy")?.getBoundingClientRect() ?? s;
  const width = Math.round(s.width);
  const height = Math.round(s.height);
  const fx = f.left - s.left;
  const fy = f.top - s.top;
  const fw = f.width;
  const fh = f.height;
  const center = { x: fx + fw / 2, y: fy + fh / 2 };
  const copyTop = copy.top - s.top;

  const terrain = {
    width,
    height,
    warp: Math.min(width, height) * 0.02,
    peaks: [
      { x: center.x, y: center.y, height: 1, rx: fw * 0.6, ry: fh * 0.62 },
      { x: width * 0.12, y: copyTop + copy.height * 0.35, height: 0.78, rx: Math.max(width * 0.16, 150), ry: copy.height * 0.5 },
      { x: width * 0.9, y: copyTop + copy.height * 0.12, height: 0.72, rx: Math.max(width * 0.15, 130), ry: copy.height * 0.45 },
    ],
  };
  const lines = isolines(terrain, LEVELS, Math.min(12, Math.max(6, width / 120)));

  // The rings around the frame's hill, largest first, starting with the largest that fits inside the frame.
  const rings = lines.filter((line) => line.closed && contains(line.points, center)).sort((a, b) => span(b.points) - span(a.points));
  const first = Math.max(0, rings.findIndex((ring) => span(ring.points) <= fw * 1.02));
  const used = new Set<ContourLine>();
  const morph = TARGETS.map((target, i) => {
    const [x0, y0, x1, y1] = target.box;
    const to = roundedRect(fx + x0 * fw, fy + y0 * fh, fx + x1 * fw, fy + y1 * fh, target.radius(fw));
    const ring = rings[first + i];
    if (ring) used.add(ring);
    const from = matchRing(ring ? ring.points : ellipse(center.x, center.y, fw * (0.4 - i * 0.08), fh * (0.4 - i * 0.08)), to);
    return { from, to, index: ring ? isIndex(ring.level) : false, gold: "gold" in target };
  });

  const field = lines.filter((line) => !used.has(line)).map((line) => ({ d: linePath(simplify(line.points, 0.4), line.closed), index: isIndex(line.level) }));
  return { top: s.top - l.top, left: s.left - l.left, width, height, field, morph };
}

function Note({ className, drift, children }: { className?: string; drift: number; children: ReactNode }) {
  return (
    <div
      className={cn("drift glass-card flex items-start gap-3 rounded-2xl p-3.5 text-left", className)}
      style={{ "--drift": `${drift}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * The product preview in the hero, and the topographic map behind the hero.
 *
 * Before the page scrolls, the map covers the spot where the preview sits.
 * As soon as scrolling starts, four of the map's contour lines morph into the
 * dashboard's outline (frame, side panel, sidebar, the gold schedule block)
 * and the preview fades in over them. Back at the very top it fades out and
 * the lines settle back into the map. Until it has fully faded in, the
 * preview is inert (nothing inside can be clicked or focused) and the clip
 * holds on its poster; then it plays. With reduced motion it's simply there.
 *
 * Below the frame sit three notes from the same day: the priority the clip
 * checks off (ticking at the same moment), a journal line, and the mood check-in.
 */
export function HeroDemo() {
  const theme = useResolvedTheme();
  const reducedMotion = usePrefersReducedMotion();

  // "Scrolling has begun": a marker 24px down the page has left the top of the screen.
  const markerRef = useRef<HTMLSpanElement>(null);
  const progress = useRef(0); // of the morph, 0 (map) to 1 (dashboard outline), before easing
  const [scrolled, setScrolled] = useState(false);
  const [morphed, setMorphed] = useState(false);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    let first = true;
    const observer = new IntersectionObserver(([entry]) => {
      const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      // Opened partway down the page: skip straight to the preview.
      if (first && past) {
        progress.current = 1;
        setMorphed(true);
      }
      first = false;
      setScrolled(past);
      if (!past) {
        setMorphed(false);
        setLanded(false);
      }
    });
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  const framed = reducedMotion || (scrolled && morphed);
  const settled = reducedMotion || (framed && landed);
  // Usable once the fade-in is over. A timer, not transitionend, so it can't get stuck.
  useEffect(() => {
    if (!framed || reducedMotion) return;
    const timer = setTimeout(() => setLanded(true), FADE_IN_MS);
    return () => clearTimeout(timer);
  }, [framed, reducedMotion]);

  // Survey the hero now and whenever it changes size.
  const layerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<TopoMap | null>(null);
  useEffect(() => {
    const layer = layerRef.current;
    const frame = frameRef.current;
    const section = layer?.parentElement;
    if (!layer || !frame || !section) return;
    let frameId = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => setMap(survey(section, layer, frame)));
    });
    observer.observe(section);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Drawing the morph: straight to the DOM, once per frame, without re-rendering.
  const mapRef = useRef<TopoMap | null>(null);
  const morphPaths = useRef<(SVGPathElement | null)[]>([]);
  const draw = useCallback((p: number) => {
    mapRef.current?.morph.forEach((line, i) => {
      const path = morphPaths.current[i];
      if (!path) return;
      const k = easeInOut(Math.min(1, Math.max(0, (p - STAGGER[i]) / LINE_SHARE)));
      path.setAttribute("d", closedPath(blend(line.from, line.to, k)));
      path.style.setProperty("--k", k.toFixed(3));
    });
  }, []);
  useLayoutEffect(() => {
    mapRef.current = map;
    draw(progress.current);
  }, [map, draw]);

  // Run the morph toward the dashboard while scrolled, back toward the map at the top.
  const target = !reducedMotion && scrolled ? 1 : 0;
  useEffect(() => {
    if (reducedMotion) return;
    // Heading back: let the preview fade out first, so its outline is what morphs back.
    const startAt = performance.now() + (target === 0 && progress.current === 1 ? 150 : 0);
    let last = startAt;
    let frameId = 0;
    let revealed = false;
    const tick = (now: number) => {
      if (now >= startAt) {
        const step = (now - last) / (target === 1 ? MORPH_IN_MS : MORPH_OUT_MS);
        last = now;
        progress.current = target === 1 ? Math.min(1, progress.current + step) : Math.max(0, progress.current - step);
        draw(progress.current);
      }
      if (target === 1 && !revealed && progress.current >= REVEAL_AT) {
        revealed = true;
        setMorphed(true);
      }
      if (progress.current !== target) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, reducedMotion, draw]);

  // The clip's first click checks off "Read chapter 5 for seminar".
  const tickAt = (TRACKS[`dashboard-${theme}`]?.clicks[0]?.t ?? 1.5) + 0.1;
  const [ticked, setTicked] = useState(false);
  const onTime = useCallback((seconds: number) => setTicked(seconds >= tickAt), [tickAt]);
  const done = reducedMotion || ticked;

  return (
    <>
      {/* 24px down the page (the hero section starts below the 4rem header). */}
      <span ref={markerRef} aria-hidden className="pointer-events-none absolute -top-10 left-0 h-px w-px" />

      {/* Above the next section (so the notes can overhang into it), below the hero copy. */}
      <div ref={layerRef} className="relative z-10 mt-6 md:mt-10" data-hero={framed ? "framed" : "topo"}>
        {/* The graph-paper stage the framed preview overlaps; it carries on into the day timeline below. */}
        <div aria-hidden className="grid-paper absolute inset-x-0 top-1/3 bottom-0 bg-stage [--grid-anchor:bottom]">
          <SkyWindow id="hero" />
        </div>

        {/* The map: drawn over the stage, under the preview, and up behind the headline. */}
        {map ? (
          <svg
            aria-hidden
            className="topo pointer-events-none absolute"
            style={{ top: map.top, left: map.left, width: map.width, height: map.height }}
            viewBox={`0 0 ${map.width} ${map.height}`}
          >
            <g>
              {map.field.map((line, i) => (
                <path key={i} d={line.d} className={line.index ? "index" : undefined} />
              ))}
            </g>
            <g className="topo-morph">
              {map.morph.map((line, i) => (
                <path
                  key={i}
                  ref={(el) => {
                    morphPaths.current[i] = el;
                  }}
                  className={cn(line.index && "index", line.gold && "gold")}
                />
              ))}
            </g>
          </svg>
        ) : null}

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* The clip sits in a thick pane of frosted glass (on ::before, so the morph still lands on the clip's own edges). */}
          <div ref={frameRef} className="hero-demo glass-bezel mx-auto max-w-5xl [--bezel:8px] sm:[--bezel:14px]" inert={!settled} data-settled={settled ? "true" : "false"}>
            <DemoVideo
              name="dashboard"
              title="product"
              loop
              preload
              hold={!settled}
              playWhenVisible={0.1}
              onTime={onTime}
              alt="The All-In Planner dashboard in use: a task is checked off, water is logged until the day's goal is reached, and a habit is checked."
            />
          </div>
          <div aria-hidden className="hero-notes mx-auto mt-6 grid max-w-4xl grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-5 md:mt-8">
            <Note className="sm:-rotate-2" drift={8}>
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md transition-colors duration-200",
                  done ? "bg-primary text-primary-fg" : "ring-2 ring-input ring-inset",
                )}
              >
                {done ? <Check className="size-3.5 animate-pop" strokeWidth={3.25} /> : null}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold transition-colors", done && "text-muted line-through decoration-muted/70")}>
                  Read chapter 5 for seminar
                </span>
                <span className="block text-meta text-muted">{done ? "Done. 6-day streak" : "High priority, due today"}</span>
              </span>
            </Note>

            <Note className="hidden sm:mt-6 sm:flex sm:rotate-1" drift={16}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
                <NotebookPen className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-meta text-muted">Tonight&apos;s journal</span>
                <span className="block text-sm">&ldquo;Sam stayed after class to help me debug my project.&rdquo;</span>
              </span>
            </Note>

            <Note className="sm:-rotate-1" drift={12}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink">
                <MoodIcon value={4} className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Feeling good</span>
                <span className="block text-meta text-muted">Calm, focused</span>
              </span>
            </Note>
          </div>
        </div>
      </div>
    </>
  );
}
