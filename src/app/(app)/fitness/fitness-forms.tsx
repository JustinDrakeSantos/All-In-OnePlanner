"use client";

import { Check, Trash2 } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select, Textarea, ToneSwatches } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { INTENSITY_LABELS, MEAL_TYPE_LABELS, TONES, WORKOUT_TYPE_LABELS, type Tone } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { initialFormState } from "@/lib/forms";
import { distanceUnit, volumeUnit, weightUnit, type UnitSystem } from "@/lib/units";
import {
  addMealAction,
  addWaterAction,
  createHabitAction,
  deleteHabitAction,
  logMetricsAction,
  logWorkoutAction,
  setWorkoutDoneAction,
  toggleHabitAction,
} from "./actions";

export function WorkoutForm({ today, units }: { today: string; units: UnitSystem }) {
  const [state, action] = useActionState(logWorkoutAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="w-type" label="Type" error={fieldError(state, "type")}>
          {(a) => (
            <Select {...a} name="type" defaultValue={fieldValue(state, "type", "run")}>
              {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="w-date" label="Date" error={fieldError(state, "date")}>
          {(a) => <Input {...a} type="date" name="date" required defaultValue={fieldValue(state, "date", today)} />}
        </Field>
        <Field id="w-duration" label="Minutes" error={fieldError(state, "durationMin")}>
          {(a) => <Input {...a} type="number" name="durationMin" min={1} max={1440} inputMode="numeric" required defaultValue={fieldValue(state, "durationMin", "30")} />}
        </Field>
        <Field id="w-title" label="Title" hint="Optional" error={fieldError(state, "title")}>
          {(a) => <Input {...a} name="title" placeholder="e.g. Morning run" defaultValue={fieldValue(state, "title")} />}
        </Field>
        <Field id="w-intensity" label="Intensity" error={fieldError(state, "intensity")}>
          {(a) => (
            <Select {...a} name="intensity" defaultValue={fieldValue(state, "intensity", "moderate")}>
              {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="w-distance" label={`Distance (${distanceUnit(units)})`} hint="Optional" error={fieldError(state, "distance")}>
          {(a) => <Input {...a} type="number" name="distance" min={0} step="0.01" inputMode="decimal" defaultValue={fieldValue(state, "distance")} />}
        </Field>
      </div>
      <Field id="w-notes" label="Notes" error={fieldError(state, "notes")}>
        {(a) => <Textarea {...a} name="notes" rows={2} defaultValue={fieldValue(state, "notes")} />}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="planned" />
          Plan it for later (not done yet)
        </label>
        <SubmitButton pendingLabel="Saving…">Save workout</SubmitButton>
      </div>
    </form>
  );
}

export function WorkoutDoneToggle({ id, completed, title }: { id: string; completed: boolean; title: string }) {
  const [done, setDone] = useOptimistic(completed);
  const [, startTransition] = useTransition();
  const toast = useToast();
  return (
    <Checkbox
      className="mt-0.5"
      checked={done}
      aria-label={`${title}: mark as ${done ? "not done" : "done"}`}
      onChange={(e) => {
        const next = e.target.checked;
        startTransition(async () => {
          setDone(next);
          try {
            await setWorkoutDoneAction(id, next);
            if (next) toast.show({ message: `Marked “${title}” as done` });
          } catch (error) {
            unstable_rethrow(error);
            toast.error(`Couldn't update “${title}”. Try again.`);
          }
        });
      }}
    />
  );
}

export function MealForm({ date }: { date: string }) {
  const [state, action] = useActionState(addMealAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr_7rem]">
        <Field id="meal-type" label="Meal" error={fieldError(state, "mealType")}>
          {(a) => (
            <Select {...a} name="mealType" defaultValue={fieldValue(state, "mealType", "breakfast")}>
              {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="meal-desc" label="What did you eat?" error={fieldError(state, "description")}>
          {(a) => <Input {...a} name="description" required defaultValue={fieldValue(state, "description")} />}
        </Field>
        <Field id="meal-cal" label="Calories" hint="Optional" error={fieldError(state, "calories")}>
          {(a) => <Input {...a} type="number" name="calories" min={0} inputMode="numeric" defaultValue={fieldValue(state, "calories")} />}
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Adding…">Add meal</SubmitButton>
    </form>
  );
}

export function WaterCustomForm({ date, units }: { date: string; units: UnitSystem }) {
  const [state, action] = useActionState(addWaterAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="flex items-end gap-2">
      <input type="hidden" name="date" value={date} />
      <Field id="water-amount" label={`Other amount (${volumeUnit(units)})`} error={fieldError(state, "amount")}>
        {(a) => <Input {...a} type="number" name="amount" min={1} inputMode="decimal" className="w-28" defaultValue={fieldValue(state, "amount")} />}
      </Field>
      <SubmitButton size="md" variant="outline" pendingLabel="Adding…">Add</SubmitButton>
    </form>
  );
}

export function MetricsForm({ today, units }: { today: string; units: UnitSystem }) {
  const [state, action] = useActionState(logMetricsAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id="m-date" label="Date" error={fieldError(state, "date")}>
          {(a) => <Input {...a} type="date" name="date" max={today} required defaultValue={fieldValue(state, "date", today)} />}
        </Field>
        <Field id="m-weight" label={`Weight (${weightUnit(units)})`} error={fieldError(state, "weight")}>
          {(a) => <Input {...a} type="number" name="weight" step="0.1" min={1} inputMode="decimal" defaultValue={fieldValue(state, "weight")} />}
        </Field>
        <Field id="m-steps" label="Steps" error={fieldError(state, "steps")}>
          {(a) => <Input {...a} type="number" name="steps" min={0} inputMode="numeric" defaultValue={fieldValue(state, "steps")} />}
        </Field>
        <Field id="m-sleep" label="Sleep (hours)" error={fieldError(state, "sleepHours")}>
          {(a) => <Input {...a} type="number" name="sleepHours" step="0.25" min={0} max={24} inputMode="decimal" defaultValue={fieldValue(state, "sleepHours")} />}
        </Field>
      </div>
      <p className="text-xs text-muted">Fill in any of the three. Logging again for the same day updates only what you enter.</p>
      <FormMessage state={state} />
      <SubmitButton size="sm" pendingLabel="Saving…">Save measurements</SubmitButton>
    </form>
  );
}

export function HabitForm() {
  const [state, action] = useActionState(createHabitAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field id="habit-name" label="New habit" error={fieldError(state, "name")}>
          {(a) => <Input {...a} name="name" placeholder="e.g. Stretch for 10 minutes" defaultValue={fieldValue(state, "name")} />}
        </Field>
        <Field id="habit-target" label="Days per week" error={fieldError(state, "targetPerWeek")}>
          {(a) => (
            <Select {...a} name="targetPerWeek" defaultValue={fieldValue(state, "targetPerWeek", "7")}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n === 7 ? "Every day" : `${n} days`}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <ToneSwatches name="color" defaultValue="glacier" options={TONES} />
      <FormMessage state={state} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Adding…">Add habit</SubmitButton>
    </form>
  );
}

/** One day's check box for a habit, updated optimistically. */
export function HabitDayToggle({
  habitId,
  habitName,
  date,
  done,
  tone,
  today,
  showLabel = false,
}: {
  habitId: string;
  habitName: string;
  date: string;
  done: boolean;
  tone: Tone;
  today: string;
  showLabel?: boolean;
}) {
  const [checked, setChecked] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const future = date > today;
  return (
    <button
      type="button"
      disabled={future}
      aria-pressed={checked}
      aria-label={`${habitName}, ${formatDate(date, { weekday: "long", month: "short", day: "numeric" })}: ${checked ? "done" : "not done"}`}
      onClick={() =>
        startTransition(async () => {
          setChecked(!checked);
          try {
            await toggleHabitAction(habitId, date);
          } catch (error) {
            unstable_rethrow(error);
            toast.error(`Couldn't update “${habitName}”. Try again.`);
          }
        })
      }
      data-tone={tone}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-30",
        checked ? "tone-solid animate-pop" : "bg-surface ring-1 ring-input ring-inset hover:ring-primary",
        date === today && !checked && "ring-2 ring-primary",
      )}
    >
      {checked ? <Check className="size-4" strokeWidth={3} aria-hidden /> : showLabel ? <span className="text-micro text-muted">{formatDate(date, { weekday: "narrow" })}</span> : null}
    </button>
  );
}

export function DeleteHabitButton({ habitId, name }: { habitId: string; name: string }) {
  return (
    <ConfirmButton size="icon" className="text-subtle" aria-label={`Delete habit ${name}`} confirmLabel="Delete?" onConfirm={() => deleteHabitAction(habitId)}>
      <Trash2 className="size-4" aria-hidden />
    </ConfirmButton>
  );
}
