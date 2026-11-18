"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useResolvedTheme } from "@/components/theme";
import { cn } from "@/lib/cn";
import { cameraAt, cameraTransform, type DemoTrack } from "@/lib/demo-camera";
import { POSTERS, type DemoName } from "./demo-posters";
import recordedTracks from "./demo-tracks.json";

/** Cursor paths for each clip and theme, written by scripts/record-demos.mjs. */
export const TRACKS = recordedTracks as Record<string, DemoTrack | undefined>;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Seconds before the end at which a looping clip starts dissolving back to its first frame. */
const LOOP_DISSOLVE = 0.45;

/**
 * A short recording of the real app (see scripts/record-demos.mjs), in the
 * light or dark version to match the theme. The poster (its first frame) is
 * always there underneath: a blurred preview is built into the page, so the
 * frame is never an empty box, and if the clip can't load or play, the poster
 * simply stays. The clip downloads and plays only while it's on screen. Muted
 * (no audio track at all), inline, with a pause button. Visitors who prefer
 * reduced motion get the poster and a play button instead of autoplay.
 *
 * With `follow`, the clip is shown through a camera that zooms in on the action
 * (see src/lib/demo-camera.ts), so a small preview stays readable.
 */
export function DemoVideo({
  name,
  title,
  alt,
  loop = false,
  follow = false,
  hold = false,
  preload = false,
  eager = false,
  sizes = "(min-width: 1104px) 1024px, 100vw",
  playWhenVisible = 0.3,
  onEnded,
  onTime,
}: {
  name: DemoName;
  /** Names the play/pause button: "Play {title} demo". */
  title: string;
  /** What the clip shows, for people who can't see it. */
  alt: string;
  loop?: boolean;
  /** Zoom in and follow the cursor, using the clip's recorded track. */
  follow?: boolean;
  /** Keep still for now (the hero holds while it is still moving into place). */
  hold?: boolean;
  /** Preload the poster with the page (for the hero). */
  preload?: boolean;
  /** Load the poster without waiting for it to near the screen, so whole-page captures never show an empty frame. */
  eager?: boolean;
  sizes?: string;
  /** How much of the clip must be on screen before it plays (0–1). */
  playWhenVisible?: number;
  onEnded?: () => void;
  /** Called every frame while playing, with the clip's current time in seconds. */
  onTime?: (seconds: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const theme = useResolvedTheme();
  const track = follow ? TRACKS[`${name}-${theme}`] : undefined;
  const reducedMotion = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);
  const [intent, setIntent] = useState<"auto" | "play" | "pause">("auto");
  const [requested, setRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  // 0: resized poster; 1: the original file, if resizing fails; 2: neither loaded (blurred layer only).
  const [posterFallback, setPosterFallback] = useState<0 | 1 | 2>(0);
  // Advance only from the stage that failed, so two posters failing together don't skip a stage.
  const nextFallback = () => {
    const failed = posterFallback;
    setPosterFallback((step) => (step === failed && step < 2 ? ((step + 1) as 1 | 2) : step));
  };
  const posters = POSTERS[name];
  const posterProps = (theme: "light" | "dark") =>
    posterFallback === 0
      ? { src: posters[theme], placeholder: "blur" as const }
      : { src: `/demos/${name}-${theme}.webp`, width: posters[theme].width, height: posters[theme].height, unoptimized: true };

  const shouldPlay = !hold && inView && (intent === "play" || (intent === "auto" && !reducedMotion));
  // Fetch the file the first time it's wanted, then keep it.
  if (shouldPlay && !requested) setRequested(true);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= playWhenVisible), {
      threshold: [0, playWhenVisible],
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [playWhenVisible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !requested) return;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  }, [shouldPlay, requested, theme]);

  // Every frame while playing: report the time (the hero's notes follow it) and move the camera.
  useEffect(() => {
    if (!playing || (!onTime && !track)) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        onTime?.(video.currentTime);
        if (track && stageRef.current) stageRef.current.style.transform = cameraTransform(cameraAt(track, video.currentTime));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, onTime, track]);

  return (
    <div ref={frameRef} className="group relative overflow-clip rounded-xl bg-surface-2 shadow-pop ring-1 ring-fg/5">
      {/*
        The camera moves this layer; without `follow` it just sits still. Its
        background is a blurred copy of the poster, built into the page, so the
        frame shows the dashboard's shape even if the poster is slow or fails.
      */}
      <div
        ref={stageRef}
        className="relative origin-top-left bg-cover bg-center will-change-transform [background-image:var(--poster-light)] dark:[background-image:var(--poster-dark)]"
        style={{ "--poster-light": `url("${posters.light.blurDataURL}")`, "--poster-dark": `url("${posters.dark.blurDataURL}")` } as CSSProperties}
      >
        {/* Only the poster for the default (light) theme is preloaded; the other loads when it's shown. */}
        <Image
          key={`light-${posterFallback}`}
          {...posterProps("light")}
          alt={alt}
          sizes={sizes}
          preload={preload && posterFallback === 0}
          loading={eager ? "eager" : undefined}
          onError={nextFallback}
          className={cn("h-auto w-full dark:hidden", posterFallback === 2 && "invisible")}
        />
        <Image
          key={`dark-${posterFallback}`}
          {...posterProps("dark")}
          alt=""
          aria-hidden
          sizes={sizes}
          onError={nextFallback}
          className={cn("hidden h-auto w-full dark:block", posterFallback === 2 && "invisible")}
        />
        <video
          ref={videoRef}
          src={requested ? `/demos/${name}-${theme}.mp4` : undefined}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          aria-hidden
          tabIndex={-1}
          className={cn("absolute inset-0 size-full transition-opacity duration-500", shown ? "opacity-100" : "opacity-0")}
          onLoadStart={() => setShown(false)}
          // If the clip can't load or play, the poster underneath stays in view.
          onError={() => setShown(false)}
          onPlaying={() => {
            setPlaying(true);
            setShown(true);
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (loop && video.duration - video.currentTime < LOOP_DISSOLVE) setShown(false);
          }}
          onEnded={(e) => {
            if (loop) {
              e.currentTarget.currentTime = 0;
              e.currentTarget.play().catch(() => {});
            } else onEnded?.();
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => setIntent(playing ? "pause" : "play")}
        aria-label={`${playing ? "Pause" : "Play"} ${title} demo`}
        title={playing ? "Pause" : "Play"}
        className={cn(
          "absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-surface text-fg shadow-card ring-1 ring-fg/10 transition-opacity hover:opacity-100 focus-visible:opacity-100",
          playing ? "opacity-0 group-hover:opacity-80 pointer-coarse:opacity-80" : "opacity-90",
          // While held (still moving into place) there's nothing to press, so don't show a control.
          hold && "invisible",
        )}
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
      </button>
    </div>
  );
}
