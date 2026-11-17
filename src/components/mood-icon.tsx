import { Angry, Frown, Laugh, Meh, Smile, type LucideProps } from "lucide-react";

const ICONS = { 1: Angry, 2: Frown, 3: Meh, 4: Smile, 5: Laugh } as const;

/** Line icon for a mood from 1 (awful) to 5 (great), from the same icon set as the rest of the app. */
export function MoodIcon({ value, ...props }: { value: number } & LucideProps) {
  const Icon = ICONS[Math.min(5, Math.max(1, Math.round(value))) as keyof typeof ICONS];
  return <Icon aria-hidden {...props} />;
}
