/**
 * A "camera" for the landing page's product clips. Each clip is a recording of
 * the full 1280×800 app; the feature previews show it zoomed in on whatever
 * the cursor is doing, so the text is readable at preview size.
 *
 * The cursor paths come from scripts/record-demos.mjs (demo-tracks.json).
 * The camera starts on the whole screen, zooms in on the first action, glides
 * from action to action a little behind the cursor, and pulls back out shortly
 * after the last click, so each clip ends on its result in context (and a
 * looping clip dissolves cleanly into its first frame).
 */

export interface Point {
  x: number;
  y: number;
}

export interface DemoTrack {
  /** Clip length in seconds. */
  duration: number;
  /** Where the cursor rests when the clip begins. */
  start: Point;
  /** Cursor glides, in seconds and page pixels. */
  moves: { t0: number; t1: number; from: Point; to: Point }[];
  clicks: { t: number; at: Point }[];
}

/** The visible part of the page: zoom factor, and its top-left corner in page pixels. */
export interface CameraView {
  scale: number;
  x: number;
  y: number;
}

export const PAGE = { width: 1280, height: 800 } as const;

/** The app's sidebar is the first 240px; zoomed-in views keep to the content beside it. */
export const CONTENT_LEFT = 240;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: Point, b: Point, k: number): Point => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

/**
 * What the camera looks at: the target of the first glide from the start, then
 * each following target, reached a little after the cursor so the view glides.
 */
export function focusAt(track: DemoTrack, seconds: number): Point {
  const { moves } = track;
  if (moves.length === 0) return track.start;
  let focus = moves[0].to;
  for (let i = 1; i < moves.length; i += 1) {
    const move = moves[i];
    const begin = move.t0 - 0.15;
    if (seconds <= begin) break;
    const span = Math.max(0.7, (move.t1 - move.t0) * 1.4);
    const k = smoothstep((seconds - begin) / span);
    focus = mix(moves[i - 1].to, move.to, k);
    if (k < 1) break;
  }
  return focus;
}

/**
 * The camera at a moment in the clip.
 *
 * @param zoom  how far to zoom in while following the action
 * @param lead  offset from the focus point; a little to the right keeps text
 *              that's being typed (to the right of the cursor) in view
 */
export function cameraAt(track: DemoTrack, seconds: number, zoom = 1.7, lead: Point = { x: 40, y: 0 }): CameraView {
  const zoomIn = smoothstep((seconds - 0.4) / 0.9);
  // Pull back just after the last click, and in any case by the end.
  const lastClick = track.clicks.at(-1)?.t ?? track.duration;
  const pullBack = Math.min(lastClick + 0.35, track.duration - 1);
  const zoomOut = smoothstep((pullBack + 0.8 - seconds) / 0.8);
  const zoomed = Math.min(zoomIn, zoomOut);
  const scale = 1 + (zoom - 1) * zoomed;
  // While pulling back, drift toward the middle of the page, where the result usually is.
  const focus = mix(focusAt(track, seconds), { x: PAGE.width / 2, y: PAGE.height / 2 }, 1 - zoomOut);
  const width = PAGE.width / scale;
  const height = PAGE.height / scale;
  // The further in, the more the view keeps clear of the sidebar (fully out, it shows the whole app).
  const left = Math.min(CONTENT_LEFT, PAGE.width - width) * zoomed;
  return {
    scale,
    x: clamp(focus.x + lead.x - width / 2, left, PAGE.width - width),
    y: clamp(focus.y + lead.y - height / 2, 0, PAGE.height - height),
  };
}

/** The CSS transform that shows `view` inside a box the size of the whole page (transform-origin 0 0). */
export function cameraTransform(view: CameraView): string {
  const x = (view.x / PAGE.width) * 100;
  const y = (view.y / PAGE.height) * 100;
  return `scale(${view.scale.toFixed(4)}) translate(${(-x).toFixed(3)}%, ${(-y).toFixed(3)}%)`;
}
