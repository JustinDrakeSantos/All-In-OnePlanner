import type { ISODate } from "./dates";
import { daysBetween } from "./dates";

/**
 * The four color tones for events, task lists, and habits, drawn from the brand
 * palette. Stored by name; the actual colors live in globals.css per theme.
 */
export const TONES = [
  { value: "glacier", label: "Glacier blue" },
  { value: "navy", label: "Navy" },
  { value: "lemon", label: "Lemon" },
  { value: "slate", label: "Slate" },
] as const;

export type Tone = (typeof TONES)[number]["value"];
export const TONE_VALUES = TONES.map((t) => t.value) as [Tone, ...Tone[]];

export function toTone(value: string | null | undefined): Tone {
  return TONES.some((t) => t.value === value) ? (value as Tone) : "glacier";
}

/** Colors used by the original static calendar, mapped to the nearest tone. */
export const LEGACY_COLOR_TONES: Record<string, Tone> = {
  "#2563EB": "glacier",
  "#5C7FA3": "slate",
  "#7C3AED": "navy",
  "#EA580C": "lemon",
  "#E11D48": "lemon",
  "#16A34A": "slate",
};

export const REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At start time" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
] as const;

export const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" } as const;
export const STATUS_LABELS = { todo: "To do", in_progress: "In progress", done: "Done" } as const;
export const RECURRENCE_LABELS = {
  none: "Doesn't repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
} as const;

export const DEFAULT_TASK_LISTS: { name: string; color: Tone }[] = [
  { name: "Personal", color: "glacier" },
  { name: "Work", color: "navy" },
  { name: "School", color: "lemon" },
];

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

export const MOOD_SCALE = [
  { value: 1, label: "Awful" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

export const ENERGY_SCALE = [
  { value: 1, label: "Drained" },
  { value: 2, label: "Tired" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Lively" },
  { value: 5, label: "Energized" },
] as const;

export const EMOTIONS = [
  "calm",
  "grateful",
  "happy",
  "excited",
  "proud",
  "hopeful",
  "focused",
  "tired",
  "stressed",
  "anxious",
  "sad",
  "lonely",
  "frustrated",
  "overwhelmed",
  "bored",
] as const;

export const SELF_CARE_IDEAS = [
  "Step outside for ten minutes of fresh air.",
  "Drink a glass of water and have a snack.",
  "Message someone you trust.",
  "Write down three things on your mind.",
  "Do five minutes of slow breathing or stretching.",
  "Put on a song that lifts you up.",
  "Pick one small task and let the rest wait.",
  "Plan an early night.",
];

export function moodLabel(value: number): string {
  return MOOD_SCALE.find((m) => m.value === value)?.label ?? "—";
}


// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export const JOURNAL_KIND_LABELS = {
  entry: "Entry",
  gratitude: "Gratitude",
  reflection: "Reflection",
} as const;

export const JOURNAL_PROMPTS = {
  entry: [
    "What's taking up most of your attention right now?",
    "Describe a moment from today you want to remember.",
    "What would make tomorrow a good day?",
    "What's something you learned recently?",
    "Write about a conversation that stuck with you.",
    "What are you looking forward to this week?",
    "If today had a title, what would it be and why?",
    "What did you do today that your future self will thank you for?",
    "Which habit are you building, and how is it going?",
    "What's a decision you're weighing? List both sides.",
  ],
  gratitude: [
    "List three things you're grateful for today.",
    "Who made your day better recently, and how?",
    "What's a small comfort you often overlook?",
    "What's something about your body or health you appreciate?",
    "Which challenge are you quietly grateful for?",
    "What's a place that makes you feel at home?",
  ],
  reflection: [
    "What went well this week, and what would you change?",
    "When did you feel most like yourself lately?",
    "What drained your energy today? What restored it?",
    "What's one thing you're avoiding, and what's the first step?",
    "How have you grown in the last month?",
    "What do you need more of right now? Less of?",
  ],
} as const;

export type JournalKind = keyof typeof JOURNAL_PROMPTS;

/** A stable prompt for each day, so it doesn't change on every reload. */
export function promptOfTheDay(date: ISODate, kind: JournalKind = "entry"): string {
  const prompts = JOURNAL_PROMPTS[kind];
  const index = ((daysBetween("2000-01-01", date) % prompts.length) + prompts.length) % prompts.length;
  return prompts[index];
}

// ---------------------------------------------------------------------------
// Fitness
// ---------------------------------------------------------------------------

export const WORKOUT_TYPE_LABELS = {
  run: "Run",
  walk: "Walk",
  cycle: "Cycling",
  swim: "Swim",
  strength: "Strength",
  yoga: "Yoga",
  hiit: "HIIT",
  sport: "Sport",
  other: "Other",
} as const;

export const INTENSITY_LABELS = { low: "Easy", moderate: "Moderate", high: "Hard" } as const;

export const MEAL_TYPE_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
} as const;
