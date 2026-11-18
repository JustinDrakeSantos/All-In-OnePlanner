import { cn } from "@/lib/cn";

/** Twelve rays, from just outside the disc. */
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const at = (r: number) => [Math.round((100 + r * Math.cos(a)) * 100) / 100, Math.round((100 + r * Math.sin(a)) * 100) / 100];
  return [...at(70), ...at(86)];
});

/**
 * The landing page's sky: one moon that becomes the sun, fixed to the screen
 * behind everything. Each full-width surface shows it through a window of its
 * own (put this first inside the surface, which needs `relative` or `absolute`
 * and a stacking context such as `isolate`), so it stays under the surface's
 * text and cards even where the surface has a solid background. Every window
 * runs the same scroll-linked animation, so the copies line up exactly.
 * See .sky-window in globals.css.
 *
 * `id` keeps each copy's mask and gradient ids unique; `onDark` picks tints
 * for navy surfaces.
 */
export function SkyWindow({ id, onDark = false }: { id: string; onDark?: boolean }) {
  return (
    <div aria-hidden className={cn("sky-window", onDark && "sky-on-dark")}>
      <svg viewBox="0 0 200 200" className="sky-art">
        {/* The color (moon blue to gold) is set on this group; the glow's gradient picks it up from here. */}
        <g className="sky-tint">
          <defs>
            {/* The moon's shadow: a disc that slides off it as the page scrolls, leaving the lit edge facing the page. */}
            <mask id={`sky-phase-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
              <rect width="200" height="200" fill="#fff" />
              <circle className="sky-shadow" cx="122" cy="91" r="62" fill="#000" />
            </mask>
            <radialGradient id={`sky-glow-${id}`}>
              <stop offset="0.58" stopColor="currentColor" stopOpacity="0" />
              <stop offset="0.6" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="sky-glow" cx="100" cy="100" r="100" fill={`url(#sky-glow-${id})`} />
          <g className="sky-rays">
            {RAYS.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </g>
          <circle className="sky-outline" cx="100" cy="100" r="60" />
          <circle className="sky-disc" cx="100" cy="100" r="60" mask={`url(#sky-phase-${id})`} />
        </g>
      </svg>
    </div>
  );
}
