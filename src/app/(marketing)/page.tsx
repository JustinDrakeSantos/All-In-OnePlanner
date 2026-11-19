import { LogIn, Plus, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { AccountNotice } from "./account-notice";
import { Connected } from "./connected";
import { DayTimeline } from "./day-timeline";
import { Faq } from "./faq";
import { HeroDemo } from "./hero-demo";
import { ProductTour, type TourStop } from "./product-tour";
import { SkyWindow } from "./sky";

/*
 * Page flow: hero with the product → a day, morning to night → each tool and
 * what it's for → how the tools hand one plan along → questions → sign up.
 *
 * Clips are recorded from the real app with `npm run demos` (scripts/record-demos.mjs).
 */
const TOUR: TourStop[] = [
  {
    key: "tasks",
    label: "Tasks",
    heading: "Know what needs you today.",
    body: "Overdue tasks, today's priorities, and upcoming deadlines, together in one list.",
    points: ["Lists for school, work, and home", "Repeating tasks that come back on schedule", "A streak for every day you finish something"],
    alt: "The task list: a new task is typed and added, then “Email internship coordinator” is checked off and a message offers Undo.",
  },
  {
    key: "calendar",
    label: "Calendar",
    heading: "See the whole week at once.",
    body: "Month, week, and day views, with the tasks that are due sitting beside your events.",
    points: ["Click an empty slot to add an event", "Overlapping events sit side by side", "Reminders before things start"],
    alt: "The calendar's week view: clicking a free afternoon opens a new event, which is named, given a place, and added.",
  },
  {
    key: "planner",
    label: "Daily Planner",
    heading: "Plan any day in one view.",
    body: "What carried over, what's due, and what's on the calendar, on a single page.",
    points: ["Unfinished tasks carry over by themselves", "Your schedule and the next seven days", "A place to reflect at the end of the day"],
    alt: "The Daily Planner: a task is added to today's plan, an overdue task is checked off, and the view moves on to tomorrow.",
  },
  {
    key: "journal",
    label: "Journal",
    heading: "Write a little, every night.",
    body: "Start from one of today's prompts or a blank page. It only takes a few lines.",
    points: ["Gratitude and reflection prompts", "Tags and search to find entries later", "Each entry shows that day's mood"],
    alt: "The journal: one of today's prompts is picked, a short entry is written and tagged, and it's saved.",
  },
  {
    key: "mood",
    label: "Mood",
    heading: "Notice how your days feel.",
    body: "A quick check-in for mood, energy, and emotions, with a short note if you want one.",
    points: ["A 30-day trend at a glance", "The weekdays that tend to go better", "An optional daily reminder to check in"],
    alt: "The mood check-in: Great, an energy level, and two emotions are chosen with a short note, and the 30-day chart updates.",
  },
  {
    key: "fitness",
    label: "Fitness",
    heading: "Keep the habits that keep you going.",
    body: "Log workouts, meals, and water, and check off the habits you're building.",
    points: ["One-tap water with a daily goal", "Weight, steps, and sleep charts", "Weekly targets for every habit"],
    alt: "Fitness: water is logged past the daily goal, steps and sleep are entered, and the weight, steps, and sleep charts open.",
  },
];

export default function LandingPage() {
  return (
    /*
      The whole page sits in front of one sky: a crescent moon low on the right that, as the page
      scrolls, rises and becomes a full sun (SkyWindow). This window shows it wherever the page
      background shows; sections with their own backgrounds have windows of their own.
    */
    <div className="relative isolate">
      {/* Soft glacier and gold light behind everything, for the glass to frost. */}
      <div aria-hidden className="landing-wash" />
      <SkyWindow id="page" />

      <Suspense fallback={null}>
        <AccountNotice />
      </Suspense>

      {/*
        Hero: a topographic map lies behind this copy and covers the product preview; when
        scrolling starts, some of its lines morph into the dashboard and the preview fades in (see HeroDemo).
      */}
      {/* overflow-x-clip: the tilted notes must never cause sideways scrolling. */}
      <section className="relative overflow-x-clip">
        {/* Without JavaScript there's no map and nothing to morph, so the preview is simply there. */}
        <noscript>
          <style>{`[data-hero="topo"] .hero-demo, [data-hero="topo"] .hero-notes { opacity: 1; }`}</style>
        </noscript>
        <div className="hero-copy relative z-20">
          <div className="mx-auto max-w-6xl px-4 pt-10 text-center sm:px-6 md:pt-14">
            {/* One load sequence: label, headline, line, buttons. */}
            <p className="glass-card inline-flex animate-hero-in items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-fg">
              <Sparkles className="size-4 text-accent-ink" aria-hidden />
              Your day, all in one place
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl animate-hero-in font-display text-[2.7rem] leading-[1.02] font-semibold tracking-[-0.03em] text-fg [animation-delay:60ms] sm:text-6xl md:text-[4.75rem]">
              A little more together.{" "}
              <span className="relative isolate inline-block pr-[0.06em] whitespace-nowrap text-primary-ink italic">
                Every day.
                {/* A thin hand-drawn gold swoosh. */}
                <svg aria-hidden className="absolute -bottom-[0.14em] left-[6%] -z-10 h-[0.2em] w-[88%]" viewBox="0 0 200 20" preserveAspectRatio="none">
                  <path className="scribble" pathLength={1} d="M4 14 C 50 5, 120 3, 196 9" fill="none" stroke="var(--accent)" strokeWidth={3.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl animate-hero-in text-lg text-muted [animation-delay:120ms] sm:text-xl">
              Your calendar, tasks, journal, mood, and workouts on one page. Plan the day, check things off, and look back on how it went.
            </p>
            <div className="mt-8 flex animate-hero-in flex-wrap justify-center gap-3 pb-2 [animation-delay:180ms]">
              <ButtonLink href="/signup" size="lg" className="rounded-full! pr-7 pl-6 shadow-[0_10px_28px_-10px_rgb(98_167_234/0.9),inset_0_1px_0_rgb(255_255_255/0.45)]">
                <Plus className="size-5" aria-hidden /> Create your planner
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="ghost" className="glass-card rounded-full! pr-7 pl-6 hover:bg-white/60 dark:hover:bg-white/10">
                <LogIn className="size-5" aria-hidden /> Log in
              </ButtonLink>
            </div>
          </div>
        </div>
        <HeroDemo />
      </section>

      <DayTimeline />

      {/* Feature explorer */}
      <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 id="features-heading" className="font-display font-semibold tracking-[-0.025em] text-4xl sm:text-5xl">
              Pick a part of <em className="text-primary-ink">your day</em>
            </h2>
            <p className="mt-3 text-lg text-muted">Each tool does one job well. Everything stays connected to your day.</p>
          </div>
          <ProductTour stops={TOUR} />
        </div>
      </section>

      <Connected />

      <Faq />

      {/* Closing call to action: the risen sun over a horizon. */}
      {/* overflow-clip, not hidden: a hidden box can still be scrolled (say, by focusing its button), which would slide the horizon. */}
      <section className="relative isolate overflow-clip bg-dusk-sky text-paper dark:text-fg">
        <SkyWindow id="closing" onDark />
        {/* The horizon: ground in front of the sky, the same navy as the footer below. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 border-t border-accent/50 bg-dusk-ground" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-32 sm:px-6 md:pt-20 md:pb-36">
          {/* A pane of dark glass in front of the risen sun. */}
          <div className="glass-tint glass-on-dark max-w-xl rounded-3xl bg-white/[0.06] p-7 sm:p-10">
            <h2 className="font-display text-5xl font-semibold tracking-[-0.025em] sm:text-6xl">
              Start with <em className="text-[var(--glacier-300)]">today</em>
            </h2>
            <p className="mt-3 max-w-md text-lg opacity-85">Add a few tasks and an event. The rest fills in as you go.</p>
            <ButtonLink href="/signup" size="lg" className="mt-7 rounded-full! pr-7 pl-6 shadow-[0_10px_28px_-10px_rgb(98_167_234/0.9),inset_0_1px_0_rgb(255_255_255/0.45)]">
              <Plus className="size-5" aria-hidden /> Create your planner
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
