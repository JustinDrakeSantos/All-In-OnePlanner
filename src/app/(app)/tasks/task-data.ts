import { toTone, type Tone } from "@/lib/constants";
import type { TaskWithList } from "@/server/data/tasks";

/** The slice of a task the browser needs (keeps the client payload small). */
export interface TaskRowData {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  listId: string | null;
  listName: string | null;
  listColor: Tone | null;
}

export interface ListOption {
  id: string;
  name: string;
  color: Tone;
}

export function toListOption(list: { id: string; name: string; color: string }): ListOption {
  return { id: list.id, name: list.name, color: toTone(list.color) };
}

export function toTaskRow(task: TaskWithList): TaskRowData {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    recurrence: task.recurrence,
    listId: task.listId,
    listName: task.listName,
    listColor: task.listColor ? toTone(task.listColor) : null,
  };
}
