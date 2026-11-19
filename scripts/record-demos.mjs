// Records the landing-page product clips: the real app, driven by a script,
// saved as H.264 MP4 plus a poster image, in light and dark.
//
//   npm run build
//   npm run demos                 (all clips)
//   npm run demos -- tasks mood   (only some)
//
// Writes public/demos/<clip>-<light|dark>.mp4 and .webp, plus each take's
// cursor path to src/app/(marketing)/demo-tracks.json (the landing page's
// feature previews use it to zoom in and follow the action). Uses a throwaway
// database (data/demos.db) and a production server on port 3200, reseeding the
// demo account before every clip so each one starts from the same state.
//
// How it works: page frames are captured at full resolution (1920×1200), as
// fast as the browser allows (~15 per second). The cursor isn't part of the
// page. Its path and clicks are recorded and drawn on top of every frame at
// 30 fps while encoding, so it moves smoothly. Encoding uses the browser's own
// H.264 encoder (WebCodecs) through mediabunny, so no ffmpeg is needed.
// Requires Microsoft Edge.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const PORT = 3200;
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve("public/demos");
const TRACKS = path.resolve("src/app/(marketing)/demo-tracks.json");
const DB_URL = "file:./data/demos.db";
const VIEWPORT = { width: 1280, height: 800 };
const SCALE = 1.5; // 1920×1200 video
const FPS = 30;
const BITRATE = 3_000_000;
const env = { ...process.env, DATABASE_URL: DB_URL };

// ---------------------------------------------------------------------------
// Clips. Each starts on `url` and plays a short, realistic piece of use.
// ---------------------------------------------------------------------------

const CLIPS = {
  dashboard: {
    url: "/dashboard",
    start: { x: 760, y: 720 },
    async play(d) {
      await d.click(d.page.getByRole("checkbox", { name: "Read chapter 5 for seminar: mark as done" }), { after: 1100 });
      await d.click(d.page.getByRole("button", { name: "+16 oz" }), { after: 600 });
      await d.click(d.page.getByRole("button", { name: "+8 oz" }), { after: 900 });
      await d.click(d.page.getByRole("button", { name: /^Read 20 pages, .*: not done$/ }), { after: 1500 });
    },
  },
  tasks: {
    url: "/tasks",
    start: { x: 1100, y: 620 },
    async play(d) {
      await d.click(d.page.getByRole("textbox", { name: "New task" }), { at: "start", after: 150 });
      await d.type("Outline the history essay");
      const form = d.page.locator("main form").filter({ has: d.page.getByRole("textbox", { name: "New task" }) });
      await d.click(form.getByRole("button", { name: /add/i }).filter({ visible: true }).first(), { after: 1000 });
      await d.click(d.page.getByRole("checkbox", { name: "Email internship coordinator: mark as done" }), { after: 1800 });
    },
  },
  calendar: {
    url: "/calendar?view=week",
    start: { x: 1000, y: 700 },
    async prepare(page) {
      // Show the working day, whatever time it is now.
      await page.evaluate(() => {
        const scroller = document.querySelector("main .overflow-y-auto");
        if (scroller) scroller.scrollTop = 8 * 48;
      });
    },
    async play(d) {
      // An empty slot two days from today at 2 PM (a free afternoon in the sample data).
      const slot = await d.page.evaluate(() => {
        const columns = [...document.querySelectorAll("main .overflow-y-auto .grid > div.relative.border-l")];
        const today = columns.findIndex((c) => c.className.includes("bg-primary-soft"));
        const target = columns[today + 2 < columns.length ? today + 2 : Math.max(0, today - 2)];
        const r = target.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + 14 * 48 + 14 };
      });
      await d.clickAt(slot, { after: 600 });
      await d.click(d.page.getByLabel("Title", { exact: true }), { at: "start", after: 100 });
      await d.type("Coffee with Priya");
      await d.click(d.page.getByLabel("Location", { exact: true }), { at: "start", after: 100 });
      await d.type("Campus café");
      await d.click(d.page.getByRole("button", { name: "Add event", exact: true }), { after: 1700 });
    },
  },
  planner: {
    url: "/planner",
    start: { x: 700, y: 640 },
    async play(d) {
      await d.click(d.page.getByRole("textbox", { name: "New task" }), { at: "start", after: 150 });
      await d.type("Pick up groceries");
      await d.page.keyboard.press("Enter");
      await d.wait(900);
      await d.click(d.page.getByRole("checkbox", { name: "Finish CS homework #3: mark as done" }).first(), { after: 1100 });
      await d.click(d.page.getByRole("link", { name: "Next day" }), { after: 1800 });
    },
  },
  journal: {
    url: "/journal",
    start: { x: 900, y: 520 },
    async play(d) {
      // Today's prompts change every day; the entry below is about gratitude, so take that one
      // (the prompts are listed Entry, Gratitude, Reflection).
      await d.click(d.page.getByRole("link", { name: /^Write about:/ }).nth(1), { after: 500 });
      const body = d.page.getByLabel("Entry", { exact: true });
      await body.waitFor();
      await d.click(d.page.getByLabel("Title", { exact: true }), { at: "start", after: 100 });
      await d.type("A better afternoon");
      await d.click(body, { at: "start", after: 150 });
      await d.type("Sam stayed after class to help me debug my project. A stressful afternoon turned into a good one.", 28);
      await d.click(d.page.getByLabel("Tags", { exact: true }), { at: "start", after: 100 });
      await d.type("friends, school");
      await d.click(d.page.getByRole("button", { name: "Save entry" }), { after: 1800 });
    },
  },
  mood: {
    url: "/mood",
    start: { x: 640, y: 640 },
    async play(d) {
      await d.click(d.page.locator('label:has(input[name="mood"][value="5"])'), { after: 350 });
      await d.click(d.page.locator('label:has(input[name="energy"][value="4"])'), { after: 300 });
      await d.click(d.page.locator('label:has(input[name="emotions"][value="grateful"])'), { after: 200 });
      await d.click(d.page.locator('label:has(input[name="emotions"][value="happy"])'), { after: 200 });
      await d.click(d.page.getByLabel("Note", { exact: true }), { at: "start", after: 100 });
      await d.page.keyboard.press("Control+A");
      await d.type("Aced the quiz this morning.");
      await d.click(d.page.getByRole("button", { name: "Update check-in" }), { after: 1900 });
    },
  },
  fitness: {
    url: "/fitness",
    start: { x: 640, y: 700 },
    async play(d) {
      await d.click(d.page.getByRole("button", { name: "+16 oz" }), { after: 500 });
      await d.click(d.page.getByRole("button", { name: "+12 oz" }), { after: 700 });
      await d.click(d.page.getByLabel("Steps", { exact: true }), { at: "start", after: 100 });
      await d.type("8412");
      await d.click(d.page.getByLabel("Sleep (hours)", { exact: true }), { at: "start", after: 100 });
      await d.type("7.5");
      await d.click(d.page.getByRole("button", { name: "Save measurements" }), { after: 900 });
      await d.click(d.page.getByRole("link", { name: "Weight, steps & sleep" }), { after: 1900 });
    },
  },
};

// ---------------------------------------------------------------------------
// The director moves the (invisible) real mouse and logs where the drawn
// cursor should be: glides between targets, and a ring on each click.
// ---------------------------------------------------------------------------

function director(page, clock) {
  let pos = { x: 0, y: 0 };
  const moves = []; // { t0, t1, from, to } in seconds and CSS pixels
  const clicks = []; // { t, at }
  const wait = (ms) => page.waitForTimeout(ms);

  const glide = async (to) => {
    const distance = Math.hypot(to.x - pos.x, to.y - pos.y);
    const ms = Math.round(Math.min(950, Math.max(380, 300 + distance * 0.75)));
    const t0 = clock();
    moves.push({ t0, t1: t0 + ms / 1000, from: pos, to });
    await wait(ms + 40);
    await page.mouse.move(to.x, to.y); // hover styles appear as the cursor arrives
    pos = to;
  };
  const press = async (to, after) => {
    clicks.push({ t: clock(), at: to });
    await page.mouse.click(to.x, to.y);
    await wait(after);
  };
  // Bring a target fully on screen with a smooth scroll, like a person would.
  const reveal = async (locator) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Not on the page: ${locator}`);
    const overflow = box.y + box.height - (VIEWPORT.height - 48);
    if (overflow > 0) {
      await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "smooth" }), overflow);
      await wait(650);
      return locator.boundingBox();
    }
    return box;
  };

  return {
    page,
    wait,
    moves,
    clicks,
    get start() {
      return pos;
    },
    async setStart(p) {
      pos = p;
      await page.mouse.move(p.x, p.y);
    },
    async click(locator, { at = "center", after = 300 } = {}) {
      await locator.waitFor({ state: "visible" });
      const box = await reveal(locator);
      const to = { x: at === "start" ? box.x + Math.min(48, box.width / 2) : box.x + box.width / 2, y: box.y + box.height / 2 };
      await glide(to);
      await press(to, after);
    },
    async clickAt(to, { after = 300 } = {}) {
      await glide(to);
      await press(to, after);
    },
    type: (text, delay = 45) => page.keyboard.type(text, { delay }),
  };
}

// ---------------------------------------------------------------------------
// Server, database, and login
// ---------------------------------------------------------------------------

function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Failed: node ${args.join(" ")}`);
}
const tsx = path.resolve("node_modules/tsx/dist/cli.mjs");
// The server may still be writing from the previous clip, so a reseed can briefly hit a locked
// database; try a few times before giving up.
const reseed = () => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return run([tsx, "--conditions=react-server", "scripts/seed.ts"]);
    } catch (error) {
      if (attempt === 3) throw error;
      spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 1500)"]);
    }
  }
};

async function startServer() {
  const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], { env, stdio: "ignore" });
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error("The server didn't start. Run `npm run build` first.");
}

async function logIn(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

async function record(context, clip) {
  const page = await context.newPage();
  await page.route("**/api/reminders", (route) => route.fulfill({ json: { reminders: [] } }));
  await logIn(page);
  await page.goto(BASE + clip.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await clip.prepare?.(page);

  const cdp = await context.newCDPSession(page);
  const begin = Date.now();
  const clock = () => (Date.now() - begin) / 1000;
  const d = director(page, clock);
  await d.setStart(clip.start);
  const startPos = clip.start;

  const frames = [];
  let capturing = true;
  const capture = (async () => {
    while (capturing) {
      const before = clock();
      const shot = await cdp
        .send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 90,
          optimizeForSpeed: true,
          clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height, scale: SCALE },
        })
        .catch(() => null);
      if (!shot) break;
      frames.push({ t: (before + clock()) / 2, data: shot.data });
    }
  })();

  let duration;
  try {
    await page.waitForTimeout(700);
    await clip.play(d);
    duration = clock();
  } catch (error) {
    const file = path.resolve("test-results/demo-failure.png");
    await page.screenshot({ path: file }).catch(() => {});
    throw new Error(`The "${clip.url}" clip failed (screenshot: ${file}): ${error.message}`);
  } finally {
    capturing = false;
    await capture;
    await page.close();
  }

  frames[0].t = 0; // the first capture is the opening frame
  return { frames, duration, start: startPos, moves: d.moves, clicks: d.clicks };
}

// ---------------------------------------------------------------------------
// Encoding: page frames + drawn cursor → H.264 MP4 (and a poster)
// ---------------------------------------------------------------------------

async function encoderPage(browser) {
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();
  await page.goto(`${BASE}/icon.png`); // any same-origin page: WebCodecs needs a secure context
  const source = readFileSync(path.resolve("node_modules/mediabunny/dist/bundles/mediabunny.min.mjs"), "utf8");
  await page.evaluate(async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    window.MB = await import(url);
  }, source);
  return page;
}

async function encode(page, take) {
  await page.evaluate(() => (window.__frames = []));
  for (let i = 0; i < take.frames.length; i += 20) {
    await page.evaluate(async (batch) => {
      for (const f of batch) {
        const blob = await (await fetch(`data:image/jpeg;base64,${f.data}`)).blob();
        window.__frames.push({ t: f.t, blob });
      }
    }, take.frames.slice(i, i + 20));
  }
  return page.evaluate(
    async ({ duration, start, moves, clicks, fps, bitrate, scale }) => {
      const { Output, Mp4OutputFormat, BufferTarget, CanvasSource } = window.MB;
      const frames = window.__frames;

      // cubic-bezier(.3, 0, .2, 1): a gentle start and a soft landing.
      const bezier = (p1x, p1y, p2x, p2y) => (x) => {
        const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
        const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
        let t = x;
        for (let i = 0; i < 8; i += 1) {
          const fx = ((ax * t + bx) * t + cx) * t - x;
          const dx = (3 * ax * t + 2 * bx) * t + cx;
          if (Math.abs(fx) < 1e-5 || dx === 0) break;
          t -= fx / dx;
        }
        return ((ay * t + by) * t + cy) * t;
      };
      const ease = bezier(0.3, 0, 0.2, 1);
      const cursorAt = (t) => {
        let p = start;
        for (const m of moves) {
          if (t >= m.t1) p = m.to;
          else if (t > m.t0) {
            const k = ease((t - m.t0) / (m.t1 - m.t0));
            return { x: m.from.x + (m.to.x - m.from.x) * k, y: m.from.y + (m.to.y - m.from.y) * k };
          } else break;
        }
        return p;
      };

      const arrow = new Path2D("M3 2.5v17.2l4.6-4.4 3.1 6.9 3-1.3-3-6.8h6.4z");
      const drawOverlay = (ctx, t) => {
        for (const c of clicks) {
          const age = t - c.t;
          if (age < 0 || age > 0.45) continue;
          const k = 1 - Math.pow(1 - age / 0.45, 3);
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.beginPath();
          ctx.arc(c.at.x * scale, c.at.y * scale, (6 + 13 * k) * scale, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(98,167,234,0.35)";
          ctx.fill();
          ctx.lineWidth = 2 * scale;
          ctx.strokeStyle = "rgba(98,167,234,0.75)";
          ctx.stroke();
          ctx.restore();
        }
        const p = cursorAt(t);
        const pressed = clicks.some((c) => t - c.t >= 0 && t - c.t < 0.14);
        ctx.save();
        ctx.translate(p.x * scale, p.y * scale);
        ctx.scale(scale * (pressed ? 0.88 : 1), scale * (pressed ? 0.88 : 1));
        ctx.translate(-3, -2.5); // the arrow's tip sits on the point
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 3 * scale;
        ctx.shadowOffsetY = 1 * scale;
        ctx.fillStyle = "#0f172a";
        ctx.fill(arrow);
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#ffffff";
        ctx.stroke(arrow);
        ctx.restore();
      };

      const firstBitmap = await createImageBitmap(frames[0].blob);
      const canvas = new OffscreenCanvas(firstBitmap.width, firstBitmap.height);
      const ctx = canvas.getContext("2d");
      const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
      const source = new CanvasSource(canvas, { codec: "avc", bitrate, keyFrameInterval: 2 });
      output.addVideoTrack(source, { frameRate: fps });
      await output.start();

      const total = Math.max(1, Math.round(duration * fps));
      let shown = 0;
      let bitmap = firstBitmap;
      let poster = null;
      for (let i = 0; i < total; i += 1) {
        const t = i / fps;
        let k = shown;
        while (k + 1 < frames.length && frames[k + 1].t <= t) k += 1;
        if (k !== shown) {
          bitmap.close();
          bitmap = await createImageBitmap(frames[k].blob);
          shown = k;
        }
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        drawOverlay(ctx, t);
        if (i === 0) poster = await canvas.convertToBlob({ type: "image/png" });
        await source.add(t, 1 / fps);
      }
      bitmap.close();
      await output.finalize();

      const toBase64 = (bytes) => {
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(binary);
      };
      return {
        mp4: toBase64(new Uint8Array(output.target.buffer)),
        poster: toBase64(new Uint8Array(await poster.arrayBuffer())),
        size: [canvas.width, canvas.height],
      };
    },
    { duration: take.duration, start: take.start, moves: take.moves, clicks: take.clicks, fps: FPS, bitrate: BITRATE, scale: SCALE },
  );
}

// ---------------------------------------------------------------------------

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(CLIPS);
for (const name of names) if (!CLIPS[name]) throw new Error(`Unknown clip "${name}". Choose from: ${Object.keys(CLIPS).join(", ")}`);

mkdirSync(OUT, { recursive: true });
for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(path.resolve(`data/demos.db${suffix}`), { force: true });
run([tsx, "scripts/migrate.ts"]);

const browser = await chromium.launch({ channel: "msedge" });
try {
  // One server per theme: each clip logs in again after its reseed, and the
  // login limit (10 per account per 15 minutes) lives in the server's memory.
  for (const theme of ["light", "dark"]) {
    const server = await startServer();
    const encoder = await encoderPage(browser);
    try {
      for (const name of names) {
        reseed();
        const context = await browser.newContext({
          viewport: VIEWPORT,
          deviceScaleFactor: SCALE,
          colorScheme: theme,
          timezoneId: "America/Los_Angeles",
          reducedMotion: "no-preference",
        });
        // No scrollbars in the footage.
        await context.addInitScript(() => {
          document.addEventListener("DOMContentLoaded", () => {
            const style = document.createElement("style");
            style.textContent = "html{scrollbar-width:none}::-webkit-scrollbar{display:none}";
            document.head.append(style);
          });
        });
        const take = await record(context, CLIPS[name]);
        await context.close();
        const result = await encode(encoder, take);
        const base = path.join(OUT, `${name}-${theme}`);
        const mp4 = Buffer.from(result.mp4, "base64");
        writeFileSync(`${base}.mp4`, mp4);
        await sharp(Buffer.from(result.poster, "base64")).webp({ quality: 80 }).toFile(`${base}.webp`);
        // The cursor's path, in seconds and CSS pixels of the 1280×800 page.
        const r = (n) => Math.round(n * 100) / 100;
        const point = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });
        const tracks = existsSync(TRACKS) ? JSON.parse(readFileSync(TRACKS, "utf8")) : {};
        tracks[`${name}-${theme}`] = {
          duration: r(take.duration),
          start: point(take.start),
          moves: take.moves.map((m) => ({ t0: r(m.t0), t1: r(m.t1), from: point(m.from), to: point(m.to) })),
          clicks: take.clicks.map((c) => ({ t: r(c.t), at: point(c.at) })),
        };
        const sorted = Object.fromEntries(Object.keys(tracks).sort().map((key) => [key, tracks[key]]));
        writeFileSync(TRACKS, `${JSON.stringify(sorted, null, 1)}\n`);
        const fps = (take.frames.length / take.duration).toFixed(1);
        console.log(`saved ${path.relative(process.cwd(), base)}.mp4  ${result.size.join("×")}  ${take.duration.toFixed(1)}s  ${(mp4.length / 1e6).toFixed(2)} MB  (${fps} page frames/s)`);
      }
    } finally {
      await encoder.context().close();
      server.kill();
      await new Promise((r) => setTimeout(r, 800));
    }
  }
} finally {
  await browser.close();
}
