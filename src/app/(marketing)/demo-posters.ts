import type { StaticImageData } from "next/image";
import calendarDark from "../../../public/demos/calendar-dark.webp";
import calendarLight from "../../../public/demos/calendar-light.webp";
import dashboardDark from "../../../public/demos/dashboard-dark.webp";
import dashboardLight from "../../../public/demos/dashboard-light.webp";
import fitnessDark from "../../../public/demos/fitness-dark.webp";
import fitnessLight from "../../../public/demos/fitness-light.webp";
import journalDark from "../../../public/demos/journal-dark.webp";
import journalLight from "../../../public/demos/journal-light.webp";
import moodDark from "../../../public/demos/mood-dark.webp";
import moodLight from "../../../public/demos/mood-light.webp";
import plannerDark from "../../../public/demos/planner-dark.webp";
import plannerLight from "../../../public/demos/planner-light.webp";
import tasksDark from "../../../public/demos/tasks-dark.webp";
import tasksLight from "../../../public/demos/tasks-light.webp";

/**
 * Each clip's first frame, imported statically so Next.js knows the size and
 * builds a tiny blurred preview into the page. The preview frame is therefore
 * never an empty box, even before the poster itself arrives.
 */
export const POSTERS = {
  dashboard: { light: dashboardLight, dark: dashboardDark },
  tasks: { light: tasksLight, dark: tasksDark },
  calendar: { light: calendarLight, dark: calendarDark },
  planner: { light: plannerLight, dark: plannerDark },
  journal: { light: journalLight, dark: journalDark },
  mood: { light: moodLight, dark: moodDark },
  fitness: { light: fitnessLight, dark: fitnessDark },
} satisfies Record<string, { light: StaticImageData; dark: StaticImageData }>;

export type DemoName = keyof typeof POSTERS;
