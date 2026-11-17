# All-In Planner

Your one-stop shop for personal organization: a calendar, task manager, daily planner, journal, mood tracker, and fitness & health log that share the same day and the same data.

This is a full-stack rewrite of the original static HTML/CSS/JS site, which is preserved unchanged in [`legacy/`](legacy/).

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
| Secondary | Navy `#0C1B48` | Text in light mode, the page background in dark mode, the closing band on the landing page |
| Accent | Lemon `#F2EA1E` | Today's date, streaks, the journal prompt. Never used as text on white |

- **Tones.** Events, task lists, and habits pick one of four tones (glacier, navy, lemon, slate), stored by name so each tone can look right in light and dark mode.
- **Type.** Inter for the interface; Sansita (the original brand face) only for the wordmark and the landing-page headlines.
- **Layout.** Content sits on the page and is grouped by spacing and headings. Secondary summaries share one tinted panel instead of each getting its own card.
- **Charts.** One series color per theme (`#3B8BDB` / `#4893E0`), checked for contrast against the page, with a data-table alternative under every chart.
- **Theme.** A small script in `<head>` applies the saved theme before the first paint, so there's no flash.

## Tech stack

- **Next.js 16** (App Router, React 19, Server Components and Server Actions) with **TypeScript**
- **Cache Components / Partial Prerendering**: each page's static frame is prerendered and personal data streams in at request time. Personal data is never cached on the server.
- **SQLite via libsql** with **Drizzle ORM** and SQL migrations: a local file in development, a hosted libsql/Turso database in production.
- **Tailwind CSS v4** with the brand palette (glacier blue, navy, lemon) and a light/dark theme switch.
- **Zod** for validating every form on the server
- Session-based authentication with no auth library: `scrypt` password hashing, 256-bit session tokens stored as SHA-256 hashes, and httpOnly cookies.
- **Vitest** for unit and database tests; **Playwright** for end-to-end tests in Microsoft Edge.

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

The landing page uses real screenshots of the app in `public/screenshots/`. To refresh them after a design change, build, start a production server against a seeded database on port 3200, and run `npm run screenshots` (the steps are at the top of [`scripts/capture-screenshots.mjs`](scripts/capture-screenshots.mjs)). Then rebuild, because Next.js only serves files that were in `public/` at build time.

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
    (marketing)/        Landing page and contact form
    (auth)/             Sign up, log in, forgot / reset password
    (app)/              Signed-in app: dashboard, planner, calendar, tasks,
                        journal, mood, fitness, settings (each with its own actions.ts)
    api/                JSON export and reminders
  components/           UI building blocks, charts, app shell
  lib/                  Pure logic: dates, calendar layout, streaks, units, schemas
  server/
    auth/               Password hashing, sessions, current user
    data/               Data access layer (every query is scoped to the signed-in user)
    db/                 Drizzle schema and client
  proxy.ts              Redirects signed-out visitors away from app pages
drizzle/                SQL migrations
scripts/                migrate, seed, and the Vitest launcher
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
