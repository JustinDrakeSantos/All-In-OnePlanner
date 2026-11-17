import { toTone, type Tone } from "@/lib/constants";
import type { CalendarEvent } from "@/server/db/schema";
import type { TaskWithList } from "@/server/data/tasks";

export type CalendarViewName = "month" | "week" | "day";

export interface EventData {
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  startMinute: number;
  endMinute: number;
  color: Tone;
  location: string | null;
  notes: string | null;
  reminderMinutes: number | null;
}

export interface CalendarTask {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  priority: "low" | "medium" | "high";
  color: Tone | null;
}

export function toEventData(event: CalendarEvent): EventData {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    allDay: event.allDay,
    startMinute: event.startMinute,
    endMinute: event.endMinute,
    color: toTone(event.color),
    location: event.location,
    notes: event.notes,
    reminderMinutes: event.reminderMinutes,
  };
}

export function toCalendarTask(task: TaskWithList): CalendarTask {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ?? "",
    done: task.status === "done",
    priority: task.priority,
    color: task.listColor ? toTone(task.listColor) : null,
  };
}
