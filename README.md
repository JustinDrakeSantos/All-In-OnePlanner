# All-In Planner

A personal planner that keeps a calendar, task manager, daily planner, journal, mood tracker, and fitness and habit log in one web app, all reading from the same day. Add a task due today and it shows up on the calendar, in the daily plan, and on the dashboard; write a journal entry and it shows how you felt that day.

This is a full-stack rewrite of an earlier static HTML/CSS/JavaScript version, which is kept unchanged in [`legacy/`](legacy/).

## What it is

- **For:** students and busy people who want one place to plan the day, track what got done, and look back on how it went, instead of juggling separate calendar, to-do, journal, and fitness apps.
- **What it does:** accounts with private data; a dashboard and a daily planner; month, week, and day calendar views; task lists with priorities, due dates, repeating tasks, and streaks; a journal with prompts, tags, and search; a daily mood check-in with trends; workouts, meals, water, weight, steps, sleep, and habits; light and dark themes; data export and account deletion.
- **How it's built:** a Next.js 16 / React 19 / TypeScript app with server-side rendering and Server Actions, a SQLite (libsql) database through Drizzle ORM, custom session authentication, Tailwind CSS 4 with a token-based design system, and Vitest and Playwright tests.

## Portfolio summary

A structured overview for portfolio sites and other tools that describe this project. Every value is taken from this repository.

```yaml
name: All-In Planner
tagline: Your calendar, tasks, journal, mood, and workouts on one page.
type: Full-stack web application
summary: >
  A personal planner that combines a calendar, task manager, daily planner, journal,
  mood tracker, and fitness and habit log in one app that shares the same day and data.
  Rebuilt from a static HTML/CSS/JS prototype into a server-rendered Next.js app with
  accounts, a database, an accessible light/dark design system, and automated tests.
status: In development. Deployment to Render is configured (render.yaml) but the app is not live yet.
repository: https://github.com/JustinDrakeSantos/All-In-OnePlanner
live_url: null                      # fill in once deployed
original_version_url: https://justindrakesantos.github.io/All-In-OnePlanner/   # the first, static version
timeline:
  original_static_site: 2025
  full_stack_rewrite: 2026
platforms: [Web (desktop, tablet, and phone browsers)]
stack:
  frontend: [Next.js 16 (App Router), React 19, TypeScript 5.9, Tailwind CSS 4, lucide-react icons]
  backend: [Next.js Server Components and Server Actions, Node.js 20+, Zod 4 validation, Nodemailer]
  database: [SQLite via libsql (Turso-compatible), Drizzle ORM 0.45 with SQL migrations]
  auth: [Custom session auth (no auth library), scrypt password hashing, SHA-256-hashed session and reset tokens, httpOnly cookies, rate limiting]
  testing: [Vitest (unit and database tests), Playwright (end-to-end tests in Microsoft Edge)]
  tooling: [ESLint, Render Blueprint deployment config, Playwright + WebCodecs (mediabunny) for recording the product clips]
features:
  - Dashboard with today's schedule, tasks due, mood, habits, water, and weekly progress
  - Daily planner for any day, with carried-over tasks and links to that day's mood and journal
  - Calendar with month, week, and day views, reminders, and overlapping events laid out side by side
  - Tasks with lists, priorities, due dates, repeating tasks, completion stats, and streaks
  - Journal with daily prompts, gratitude and reflection entries, tags, and search
  - Mood check-ins with energy and emotions, a 30-day trend, and weekday patterns
  - Fitness and health log for workouts, meals, water, weight, steps, sleep, and habits
  - Accounts with password reset, data export (JSON), account deletion, and import from the original version
  - Light, dark, and system themes
highlights:
  - Every tool shares one day of data; time zones are handled per user (fixing an off-by-one-day bug in the original)
  - Partial Prerendering: each page's static shell is prerendered and personal data streams in per request, never cached
  - Per-user data isolation enforced in the data layer and covered by tests
  - Token-based design system with WCAG 2.2 AA contrast checked for light and dark themes, keyboard support, and reduced-motion support
  - Landing page product clips are recorded automatically from the real app by a script with a drawn cursor, encoded to H.264 MP4 in the browser (no ffmpeg), and shown through a "camera" that zooms in on the action using the recorded cursor path
  - Hero background is a generated topographic map (marching-squares contours over a warped terrain); when the page scrolls, four contour lines morph point for point into the dashboard's layout before the clip fades in
  - Scroll-linked landing animations built with CSS scroll timelines (no scroll listeners), including a large moon behind the page that waxes into the sun (shown through clipped per-section windows so it stays under content on solid backgrounds), with complete static fallbacks
  - 98 unit tests and 21 end-to-end tests (as of November 2026)
media:                               # paths relative to the repository root
  logo: public/images/logo.png
  hero_image: public/demos/dashboard-light.webp          # 1920×1200 still of the dashboard
  hero_image_dark: public/demos/dashboard-dark.webp
  hero_video: public/demos/dashboard-light.mp4           # ~8 s muted clip of the dashboard in use
  feature_images:                                        # first frames of each feature clip, 1920×1200
    tasks: public/demos/tasks-light.webp
    calendar: public/demos/calendar-light.webp
    daily_planner: public/demos/planner-light.webp
    journal: public/demos/journal-light.webp
    mood: public/demos/mood-light.webp
    fitness: public/demos/fitness-light.webp
  feature_videos: public/demos/<feature>-<light|dark>.mp4
demo_account:                         # local development only, created by `npm run db:seed`
  email: demo@example.com
  password: demo-password
```

## Features

| Area | What you can do |
|---|---|
| **Dashboard** | Today's schedule, tasks due (with overdue), task progress, mood, water and steps, journal prompt, and habits at a glance. |
| **Daily Planner** | Plan any day: carried-over and due tasks, a schedule of events, future tasks, important tasks, upcoming events, habits, and links to that day's mood and journal. |
| **Calendar** | Month, week, and day views; create, edit, and delete events (all-day or timed, color, location, notes, reminders); overlapping events laid out side by side; tasks with due dates shown on the calendar. |
| **Tasks** | Quick add, lists (Personal / Work / School to start), priorities, due dates, repeating tasks (daily / weekly / monthly), statuses, completion rate, and daily streaks. |
| **Journal** | Daily prompts, free entries, gratitude and reflection logs, tags, search, and the day's mood beside each entry. |
| **Mood** | One check-in per day (mood, energy, emotions, note), a 30-day trend, patterns by weekday, most frequent emotions, self-care ideas on hard days, and a daily check-in reminder. |
| **Fitness & Health** | Workouts (logged or planned), meals, water toward a daily goal, weight / steps / sleep with trend charts, and habits with weekly check-offs and streaks. Imperial or metric units. |
| **Account** | Sign up, log in, password reset by email, change password, notification permission, data export (JSON), import from the original app, and account deletion. |

Reminders for events and the daily mood check-in appear inside the app while it is open, and as system notifications if you allow them in Settings. Light, dark, or system appearance can be switched from the sidebar or Settings.

## Design system

The tokens live in [`src/app/globals.css`](src/app/globals.css) and are defined for both themes.

| Role | Color | Used for |
|---|---|---|
| Primary | Glacier blue `#62A7EA` | The main action on each screen (navy text on glacier, 6.5:1), selection, progress |
| Secondary | Navy `#0C1B48` | Text in light mode, the page background in dark mode, the navy bands on the landing page |
| Accent | Gold `#D4A017` | Badges and numbered markers with navy labels (≈7:1), today's date, streaks, the sunrise and underline artwork. Never text on white (2.4:1) |
| Accent ink | Dark gold `#8A6500` | Small accent text and icons on light backgrounds (5.3:1 on white) |
| Accent soft | Soft gold `#FFF3CC` | Highlighted surfaces with navy text (15:1), such as the journal prompt |

- **Tones.** Events, task lists, and habits pick one of four tones (glacier blue, navy, gold, slate), stored by name so each tone can look right in light and dark mode. (Gold is stored as `lemon`, from before the accent changed.)
- **Type.** Inter for the interface; Sansita (the original brand face) for the wordmark and the landing page's headings.
- **Layout.** Content sits on the page and is grouped by spacing and headings. Secondary summaries share one tinted panel instead of each getting its own card.
- **Charts.** One series color per theme (`#3B8BDB` / `#4893E0`), checked for contrast against the page, with a data-table alternative under every chart.
- **Theme.** A small script in `<head>` applies the saved theme before the first paint, so there's no flash.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.4** (App Router, Server Components, Server Actions), **React 19.3**, **TypeScript 5.9** |
| Rendering | Cache Components / Partial Prerendering: each page's static frame is prerendered and personal data streams in at request time. Personal data is never cached on the server. |
| Database | **SQLite via libsql 0.18** (a local file in development, hosted libsql/Turso in production) with **Drizzle ORM 0.45** and SQL migrations |
| Validation | **Zod 4** for every form, on the server |
| Auth | Session-based, no auth library: `scrypt` password hashing, 256-bit session tokens stored as SHA-256 hashes, httpOnly cookies, rate-limited forms |
| Styling | **Tailwind CSS 4** with a three-layer token system (primitives, semantic, component) and light/dark themes; **lucide-react** icons |
| Email | **Nodemailer** over SMTP (password resets) |
| Testing | **Vitest 5** for unit and database tests; **Playwright 1.65** for end-to-end tests in Microsoft Edge |
| Deployment | Any Node.js host; a **Render** Blueprint is included ([`render.yaml`](render.yaml)) |
| Media tooling | Product clips recorded with Playwright and encoded in the browser with WebCodecs through **mediabunny** |

## Landing page

The home page tells the story of one day with the app:

1. **Hero:** a topographic map (real contour lines, traced from a generated terrain) lies behind the headline and covers the spot where the product clip sits. As soon as the page starts to scroll, four of its contour lines morph into the dashboard's outline (the frame, side panel, sidebar, and a gold schedule block), then the clip fades in over them and starts playing; at the very top it reverses. The clip can't be clicked or focused until it has faded in.
2. **A day, morning to night:** six moments from 7:30 AM to 10 PM, each a card tinted like the sky at that hour, hung from an arc.
3. **Feature explorer:** a tab for each part of the app, with what it's for beside a clip that zooms in on the action.
4. **How it connects:** one evening run followed from the planner to the calendar, the fitness log, and that night's journal.
5. **FAQ**, a contact form behind a disclosure, and a closing call to action under a sunrise.

Behind the whole page sits one large sky body: at the top it's a crescent moon low on the right, and as the page scrolls it rises, waxes, fades at dawn, and brightens into a full gold sun with rays. Each full-width section shows it through a clipped window of its own, so it stays under text and cards even on solid backgrounds, in faint tints chosen to keep text contrast on light and navy sections alike.

Visitors who prefer reduced motion get a complete, still page: the clip is simply there, the sun stays put, and clips never autoplay.

## Getting started

Requires Node.js 20.12 or newer.

```bash
npm install
npm run dev        # applies database migrations, then starts http://localhost:3000
```

Create an account at `/signup`, or load the demo account full of sample data:

```bash
npm run db:seed    # then log in as demo@example.com / demo-password
```

The database lives in `data/planner.db` (ignored by git). Delete the file to start over.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Migrate the database and start the dev server |
| `npm run build` / `npm start` | Production build / migrate and serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm test` | Unit and database tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (run `npm run build` first; uses the installed Microsoft Edge) |
| `npm run db:generate` | Create a migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Recreate the demo account |
| `npm run db:studio` | Browse the database in Drizzle Studio |

To review every page visually, run `SCREENSHOTS=1 npx playwright test screenshots` (images go to `test-results/screens/`).

The landing page plays short clips of the real app in use (`public/demos/`, light and dark, each with a poster frame). They are recorded by a script that drives the app with a visible cursor, so they can be refreshed after any design change:

```bash
npm run build
npm run demos              # every clip; or e.g. `npm run demos -- tasks mood`
npm run build              # Next.js only serves files that were in public/ at build time
```

[`scripts/record-demos.mjs`](scripts/record-demos.mjs) starts its own production server on port 3200 against a throwaway database, reseeds the demo account before each clip, and encodes H.264 MP4 with the browser's built-in encoder (no ffmpeg needed). It needs Microsoft Edge. Each clip's steps are listed at the top of the script.

## Configuration

Copy [`.env.example`](.env.example) to `.env.local`. Everything has a development default.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./data/planner.db` locally, or `libsql://…` for a hosted database |
| `DATABASE_AUTH_TOKEN` | Token for a hosted libsql/Turso database |
| `APP_URL` | Public base URL for password-reset links. **Required in production**, except on Render, where the service URL is used automatically. |
| `SMTP_URL`, `MAIL_FROM` | Outgoing email. Without SMTP, reset links are printed to the server console in development. |
| `TRUST_PROXY` | Set to `1` behind a reverse proxy so rate limits apply per client IP (detected automatically on Vercel) |

## Project structure

```
src/
  app/
    (marketing)/        Landing page: hero, day timeline, feature explorer, FAQ, contact form
    (auth)/             Sign up, log in, forgot / reset password
    (app)/              Signed-in app: dashboard, planner, calendar, tasks,
                        journal, mood, fitness, settings (each with its own actions.ts)
    api/                JSON export and reminders
  components/           UI building blocks, charts, app shell
  lib/                  Pure logic: dates, calendar layout, streaks, units, schemas, demo camera
  server/
    auth/               Password hashing, sessions, current user
    data/               Data access layer (every query is scoped to the signed-in user)
    db/                 Drizzle schema and client
  proxy.ts              Redirects signed-out visitors away from app pages
drizzle/                SQL migrations
public/demos/           Product clips (MP4) and their poster frames (WebP), light and dark
scripts/                migrate, seed, record-demos (the product clips), and the Vitest launcher
tests/                  Vitest unit and database tests
e2e/                    Playwright end-to-end tests
legacy/                 The original static site, unchanged
```

## Data and privacy

- Each account only sees its own records. Every read and write in `src/server/data/` filters on the signed-in user's id, and every Server Action re-checks the session. `tests/data.test.ts` and the end-to-end privacy test verify this.
- Calendar days are stored as plain `YYYY-MM-DD` dates and "today" is computed in each user's time zone. This fixes the original app's bug that saved events a day late for anyone at or east of UTC.
- Passwords are hashed with `scrypt`. Session and reset tokens are stored only as SHA-256 hashes. Reset links expire after an hour and work once.
- Login, sign-up, reset, and contact forms are rate-limited. The limiter is in memory, so it protects a single server process; use a shared store if you run several.
- Data is stored on the server you run; it is not end-to-end encrypted. Users can download everything as JSON and delete their account and all of its data from Settings.

## Moving data from the original app

The original calendar kept events in the browser's `localStorage`. To bring them over:

1. Open the old calendar page in the same browser and at the same address you used before.
2. In the developer console (F12), run `copy(localStorage.getItem("events"))`.
3. In the new app, open **Settings → Import from the original planner**, paste, check, and import.

Dates are read in your browser's time zone, exactly as the old calendar showed them. Re-importing skips events that are already on your calendar.

## Deployment notes

### Render

[`render.yaml`](render.yaml) describes the service. In the Render dashboard choose **New → Blueprint**, pick this repository, and fill in the variables it asks for. Pushes to `main` redeploy automatically.

- Render's disk is erased on every deploy and restart, so point `DATABASE_URL` and `DATABASE_AUTH_TOKEN` at a hosted [Turso](https://turso.tech) database. Without them the app runs on a temporary SQLite file and loses its data on each deploy.
- Migrations run on every start (`prestart`).
- The free plan sleeps after a period without visits, so the first request afterwards takes a while.
- `TRUST_PROXY` is left unset: per-IP limits are skipped and the per-account and global limits still apply.

The original static site is served by GitHub Pages from the `gh-pages` branch, so people can still open it and copy their old events (see above).

### Other hosts

- Any Node.js host works (`npm run build` then `npm start`). On serverless platforms, use a hosted libsql/Turso database, since a local SQLite file isn't shared between instances.
- Set `APP_URL` and SMTP settings for password resets, and `TRUST_PROXY=1` behind a proxy.
- Cookies are marked `Secure` in production, so serve the app over HTTPS.

## Known limitations

- Reminders only fire while the app is open in a browser tab (there is no push service or service worker).
- Events don't repeat yet; tasks do.
- A full Content-Security-Policy isn't configured (it needs nonces with Next.js); baseline security headers are set in `next.config.ts`.
