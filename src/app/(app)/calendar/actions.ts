"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { eventSchema } from "@/lib/schemas";
import { requireUser } from "@/server/auth/current-user";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "@/server/data/events";

const idSchema = z.string().min(1).max(64);

function toInput(data: z.infer<typeof eventSchema>): EventInput {
  return {
    title: data.title,
    date: data.date,
    allDay: data.allDay,
    startMinute: data.startMinute,
    endMinute: data.endMinute,
    color: data.color,
    location: data.location,
    notes: data.notes,
    reminderMinutes: data.reminderMinutes,
  };
}

export async function createEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.ok) return parsed.state;
  await createEvent(user.id, toInput(parsed.data));
  refresh();
  return success(`“${parsed.data.title}” added to your calendar.`);
}

export async function updateEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("This event couldn't be found.");
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.ok) return parsed.state;
  const updated = await updateEvent(user.id, id.data, toInput(parsed.data));
  if (!updated) return failure("This event couldn't be found. It may have been deleted.");
  refresh();
  return success("Event saved.");
}

export async function deleteEventAction(eventId: string): Promise<void> {
  const user = await requireUser();
  await deleteEvent(user.id, idSchema.parse(eventId));
  refresh();
}
