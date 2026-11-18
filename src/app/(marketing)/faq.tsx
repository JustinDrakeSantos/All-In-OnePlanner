import { Plus } from "lucide-react";
import { ContactDisclosure } from "./contact-disclosure";
import { ContactForm } from "./contact-form";

/*
 * Every answer here is checked against the app itself:
 * - responsive web app with a phone navigation drawer; no app-store app or PWA manifest
 * - data lives in the server database, scoped to the account (src/server/data)
 * - sign-up asks for name, email, and a password of 8+ characters (signupSchema)
 * - no billing code, ads, or third-party scripts
 * - reminders: in-page while the app is open, plus system notifications if allowed (ReminderWatcher)
 * - export (api/export), account deletion, and the import from the original app in Settings
 */
const QUESTIONS = [
  {
    q: "Does it work on my phone?",
    a: "Yes. All-In Planner runs in your browser on phones, tablets, and computers, and the layout adapts to your screen. There's no app to install from an app store.",
  },
  {
    q: "Where is my data saved?",
    a: "On the All-In Planner server, in a database tied to your account, so your planner is the same on every device you sign in on. Every request is checked against your account, so only you can see your entries.",
  },
  {
    q: "What do I need to sign up?",
    a: "Your name, an email address, and a password of at least 8 characters. No credit card or phone number.",
  },
  {
    q: "How much does it cost?",
    a: "Nothing. All-In Planner is free to use, with no paid plans, ads, or third-party trackers.",
  },
  {
    q: "Will it remind me about things?",
    a: "Yes, while the app is open in a browser tab: before events you've set a reminder on, and for your daily mood check-in if you turn it on. You can also allow system notifications in Settings.",
  },
  {
    q: "Can I take my data with me, or delete it?",
    a: "Yes. Settings lets you download everything you've entered as a file, and deleting your account removes every entry in it.",
  },
  {
    q: "I used the original All-In Planner. Can I bring my events?",
    a: "Yes. Open the old calendar in the same browser, copy your saved events, and paste them into Settings under Import from the original planner.",
  },
];

/** Short answers to the questions people ask before signing up, and a way to ask anything else. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 py-16 md:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
        <div>
          <h2 id="faq-heading" className="font-brand text-4xl tracking-tight sm:text-5xl">
            Questions, answered
          </h2>
          <p className="mt-3 text-lg text-muted">The things people ask before they sign up.</p>
          <ContactDisclosure>
            <ContactForm />
          </ContactDisclosure>
        </div>

        <div className="divide-y divide-line">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="faq-item group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg font-semibold">
                {item.q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 transition-[rotate,background-color] duration-300 ease-spring group-open:rotate-45 group-open:bg-accent group-open:text-accent-fg">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="pr-14 pb-6 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
