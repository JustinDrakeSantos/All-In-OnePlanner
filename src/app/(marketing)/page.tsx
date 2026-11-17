import { Suspense, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { AccountNotice } from "./account-notice";
import { ContactForm } from "./contact-form";
import { CalendarDemo } from "./demos/calendar-demo";
import { FitnessDemo } from "./demos/fitness-demo";
import { MoodDemo } from "./demos/mood-demo";
import { TasksDemo } from "./demos/tasks-demo";
import { ProductTour } from "./product-tour";
import { Screenshot } from "./screenshot";

/** Each stop shows either a working demo with sample data or a screenshot of the real page. */
const TOUR: { key: string; label: string; description: string; demo?: ReactNode; alt?: string }[] = [
  {
    key: "tasks",
    label: "Tasks",
    description: "Lists for school, work, and home, with priorities, due dates, repeating tasks, and a streak for every day you finish something.",
    demo: <TasksDemo />,
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "Month, week, and day views. Click an empty slot to add an event. Overlapping events sit side by side.",
    demo: <CalendarDemo />,
  },
  {
    key: "planner",
    label: "Daily Planner",
    description: "Plan any day in one view: what carried over, what's due, what's on the calendar, and how you felt.",
    alt: "The Daily Planner showing today's tasks, schedule, important tasks, upcoming events, and habits.",
  },
  {
    key: "journal",
    label: "Journal",
    description: "Write freely or start from today's prompt. Keep gratitude and reflection entries, tag them, and search them later.",
    alt: "The journal with today's prompts and past entries grouped by month.",
  },
  {
    key: "mood",
    label: "Mood",
    description: "A quick daily check-in for mood, energy, and emotions, with a trend line and gentle suggestions on harder days.",
    demo: <MoodDemo />,
  },
  {
    key: "fitness",
    label: "Fitness",
    description: "Log workouts, meals, and water. Track weight, steps, and sleep, and check off your habits.",
    demo: <FitnessDemo />,
  },
];

const PRIVACY = [
  { title: "Only you can see your entries", body: "Every request is checked against your account on the server, not just hidden in the browser." },
  { title: "Take your data with you", body: "Download everything you've entered as a file whenever you like." },
  { title: "Leave in one step", body: "Deleting your account removes every entry in it." },
  { title: "No ads or trackers", body: "No advertising or third-party analytics scripts, and fonts are served by the app itself." },
];

export default function LandingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <AccountNotice />
      </Suspense>

      {/* Hero */}
      <section className="overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-14 text-center sm:px-6 md:pt-20">
          {/* One load sequence: headline, line, buttons, then the product. */}
          <h1 className="mx-auto max-w-4xl animate-hero-in font-brand text-[2.6rem] leading-[1.02] tracking-tight text-fg sm:text-6xl md:text-[4.5rem]">
            Your calendar, tasks, journal, and workouts on one page
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-hero-in text-lg text-muted [animation-delay:90ms]">
            Plan the day, check things off, and look back on how it went, without switching between five apps.
          </p>
          <div className="mt-8 flex animate-hero-in flex-wrap justify-center gap-3 [animation-delay:180ms]">
            <ButtonLink href="/signup" size="lg">
              Create your planner
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="ghost">
              Log in
            </ButtonLink>
          </div>
          <div className="relative mx-auto mt-14 max-w-[69rem] animate-media-in [animation-delay:240ms] md:mt-16">
            <Screenshot
              name="dashboard"
              priority
              alt="The All-In Planner dashboard: today's schedule and tasks on the left, with mood, habits, water, and weekly progress on the right."
            />
          </div>
        </div>
      </section>

      {/* Product tour */}
      <section id="tour" className="scroll-mt-16 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Six tools that share the same day
          </h2>
          <p className="mx-auto mt-3 mb-10 max-w-xl text-center text-muted">
            A task due today shows up on the calendar, in your daily plan, and on the dashboard. Tasks, Calendar, Mood, and Fitness work right here with sample data.
          </p>
          <ProductTour
            stops={TOUR.map((stop) => ({
              key: stop.key,
              label: stop.label,
              description: stop.description,
              media: stop.demo ?? <Screenshot name={stop.key} alt={stop.alt ?? ""} />,
            }))}
          />
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-16 bg-surface-2 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your journal stays yours</h2>
            <p className="mt-3 text-muted">
              Moods, health notes, and journal entries are personal. Here is how the app treats them.
            </p>
          </div>
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PRIVACY.map((item) => (
              <div key={item.title}>
                <dt className="font-semibold">{item.title}</dt>
                <dd className="mt-1 text-sm text-muted">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Found a bug or have an idea?</h2>
            <p className="mt-3 text-muted">Send a message and we&apos;ll reply by email.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-secondary text-secondary-fg dark:bg-surface-2 dark:text-fg">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-brand text-3xl tracking-tight sm:text-4xl">Start with today</h2>
            <p className="mt-2 opacity-80">Add a few tasks and an event. The rest fills in as you go.</p>
          </div>
          <ButtonLink href="/signup" size="lg">
            Create your planner
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
