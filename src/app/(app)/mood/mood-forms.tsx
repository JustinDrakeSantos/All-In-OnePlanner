"use client";

import { useActionState } from "react";
import { MoodIcon } from "@/components/mood-icon";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { EMOTIONS, ENERGY_SCALE, MOOD_SCALE } from "@/lib/constants";
import { initialFormState } from "@/lib/forms";
import { saveMoodAction, saveMoodReminderAction } from "./actions";

const chip =
  "block rounded-full bg-surface-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-3 peer-checked:bg-primary-soft peer-checked:font-medium peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-ink";

export function MoodCheckInForm({
  date,
  existing,
}: {
  date: string;
  existing: { mood: number; energy: number | null; emotions: string[]; note: string | null } | null;
}) {
  const [state, action] = useActionState(saveMoodAction, initialFormState);
  const selectedEmotions = new Set(existing?.emotions ?? []);
  const moodDefault = fieldValue(state, "mood", existing?.mood?.toString());
  const energyDefault = fieldValue(state, "energy", existing?.energy?.toString());

  return (
    <form key={`${formKey(state)}-${date}`} action={action} className="space-y-6">
      <FormMessage state={state} />
      <input type="hidden" name="date" value={date} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">How are you feeling?</legend>
        <div className="grid grid-cols-5 gap-2">
          {MOOD_SCALE.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input type="radio" name="mood" value={option.value} defaultChecked={moodDefault === String(option.value)} className="peer sr-only" required />
              <span className="flex flex-col items-center gap-1.5 rounded-xl bg-surface-2 px-1 py-3 text-muted transition-colors hover:bg-surface-3 peer-checked:bg-primary-soft peer-checked:text-fg peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-ink">
                <MoodIcon value={option.value} className="size-7" strokeWidth={1.75} />
                <span className="text-xs font-medium">{option.label}</span>
              </span>
            </label>
          ))}
        </div>
        {fieldError(state, "mood") ? <p className="mt-1.5 text-sm text-danger">Choose how you feel.</p> : null}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Energy <span className="font-normal text-muted">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {ENERGY_SCALE.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input type="radio" name="energy" value={option.value} defaultChecked={energyDefault === String(option.value)} className="peer sr-only" />
              <span className={chip}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          What emotions are there? <span className="font-normal text-muted">(pick any)</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((emotion) => (
            <label key={emotion} className="cursor-pointer">
              <input type="checkbox" name="emotions" value={emotion} defaultChecked={selectedEmotions.has(emotion)} className="peer sr-only" />
              <span className={`${chip} capitalize`}>{emotion}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="mood-note" label="Note" hint="A sentence about why. Longer thoughts belong in your journal." error={fieldError(state, "note")}>
        {(a) => <Textarea {...a} name="note" rows={3} defaultValue={fieldValue(state, "note", existing?.note)} />}
      </Field>
      <SubmitButton pendingLabel="Saving…">{existing ? "Update check-in" : "Save check-in"}</SubmitButton>
    </form>
  );
}

export function MoodReminderForm({ time }: { time: string | null }) {
  const [state, action] = useActionState(saveMoodReminderAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-3">
      <Field
        id="mood-reminder"
        label="Remind me to check in at"
        hint="Shows while the app is open, and as a notification if you allow them in Settings. Clear it to turn the reminder off."
        error={fieldError(state, "time")}
      >
        {(a) => <Input {...a} type="time" name="time" defaultValue={fieldValue(state, "time", time)} className="w-40" />}
      </Field>
      <FormMessage state={state} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">Save reminder</SubmitButton>
    </form>
  );
}
