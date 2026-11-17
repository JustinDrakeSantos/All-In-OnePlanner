"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea, ToneSwatches } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { REMINDER_OPTIONS, TONES, toTone } from "@/lib/constants";
import { minutesToTimeInput } from "@/lib/dates";
import { initialFormState } from "@/lib/forms";
import { createEventAction, deleteEventAction, updateEventAction } from "./actions";
import type { EventData } from "./calendar-data";

export type EventDraft =
  | { mode: "create"; date: string; startMinute: number; endMinute: number; allDay: boolean }
  | { mode: "edit"; event: EventData };

export function EventDialog({ draft, onClose }: { draft: EventDraft | null; onClose: () => void }) {
  return (
    <Dialog
      open={draft !== null}
      onClose={onClose}
      title={draft?.mode === "edit" ? "Edit event" : "New event"}
    >
      {draft ? <EventForm key={draft.mode === "edit" ? draft.event.id : `${draft.date}-${draft.startMinute}`} draft={draft} onDone={onClose} /> : null}
    </Dialog>
  );
}

function EventForm({ draft, onDone }: { draft: EventDraft; onDone: () => void }) {
  const editing = draft.mode === "edit" ? draft.event : null;
  const [state, action] = useActionState(editing ? updateEventAction : createEventAction, initialFormState);
  const initialAllDay = editing ? editing.allDay : draft.mode === "create" && draft.allDay;
  const [allDay, setAllDay] = useState(initialAllDay);
  const toast = useToast();

  useEffect(() => {
    if (state.status !== "success") return;
    onDone();
    toast.show({ message: editing ? "Event saved" : "Event added" });
  }, [state, onDone, toast, editing]);

  const date = editing?.date ?? (draft.mode === "create" ? draft.date : "");
  const start = editing ? editing.startMinute : draft.mode === "create" ? draft.startMinute : 540;
  const end = editing ? editing.endMinute : draft.mode === "create" ? draft.endMinute : 600;
  const timedStart = editing?.allDay ? 540 : start;
  const timedEnd = editing?.allDay ? 600 : end;
  const color = fieldValue(state, "color", toTone(editing?.color));

  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
      <Field id="event-title" label="Title" error={fieldError(state, "title")}>
        {(a) => <Input {...a} name="title" required autoFocus defaultValue={fieldValue(state, "title", editing?.title)} placeholder="Add an event" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field id="event-date" label="Date" error={fieldError(state, "date")}>
          {(a) => <Input {...a} type="date" name="date" required defaultValue={fieldValue(state, "date", date)} />}
        </Field>
        <label className="flex h-10 items-center gap-2 text-sm font-medium">
          <Checkbox name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>
      </div>
      {!allDay ? (
        <div className="grid grid-cols-2 gap-4">
          <Field id="event-start" label="Starts" error={fieldError(state, "startTime")}>
            {(a) => <Input {...a} type="time" name="startTime" step={300} required defaultValue={fieldValue(state, "startTime", minutesToTimeInput(timedStart))} />}
          </Field>
          <Field id="event-end" label="Ends" error={fieldError(state, "endTime")}>
            {(a) => <Input {...a} type="time" name="endTime" step={300} required defaultValue={fieldValue(state, "endTime", minutesToTimeInput(timedEnd))} />}
          </Field>
        </div>
      ) : null}
      <ToneSwatches name="color" defaultValue={color ?? "glacier"} options={TONES} />
      <Field id="event-location" label="Location" error={fieldError(state, "location")}>
        {(a) => <Input {...a} name="location" defaultValue={fieldValue(state, "location", editing?.location)} placeholder="Optional" />}
      </Field>
      <Field
        id="event-reminder"
        label="Reminder"
        error={fieldError(state, "reminder")}
        hint={allDay ? "All-day reminders count back from 9:00 AM. Reminders appear while the app is open." : "Reminders appear while the app is open."}
      >
        {(a) => (
          <Select {...a} name="reminder" defaultValue={fieldValue(state, "reminder", editing?.reminderMinutes?.toString() ?? "")}>
            {REMINDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field id="event-notes" label="Notes" error={fieldError(state, "notes")}>
        {(a) => <Textarea {...a} name="notes" rows={3} defaultValue={fieldValue(state, "notes", editing?.notes)} />}
      </Field>
      <div className="flex items-center justify-between gap-2 pt-2">
        {editing ? (
          <ConfirmButton
            aria-label="Delete event"
            confirmLabel="Delete this event?"
            onConfirm={async () => {
              await deleteEventAction(editing.id);
              onDone();
              toast.show({ message: `Deleted “${editing.title}”` });
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </ConfirmButton>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <SubmitButton pendingLabel="Saving…">{editing ? "Save" : "Add event"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

/** A "New event" button that opens the dialog on its own (for pages other than the calendar). */
export function NewEventButton({
  date,
  startMinute = 540,
  label = "New event",
  variant = "primary",
}: {
  date: string;
  startMinute?: number;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
}) {
  const [draft, setDraft] = useState<EventDraft | null>(null);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setDraft({ mode: "create", date, startMinute, endMinute: Math.min(startMinute + 60, 1440), allDay: false })}
      >
        <Plus className="size-4" aria-hidden /> {label}
      </Button>
      <EventDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
