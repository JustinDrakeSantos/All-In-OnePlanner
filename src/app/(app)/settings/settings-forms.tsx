"use client";

import { Bell, BellOff, Upload } from "lucide-react";
import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { initialFormState } from "@/lib/forms";
import { parseLegacyEvents, type ImportedEvent } from "@/lib/legacy-import";
import { mlToDisplay, volumeUnit, type UnitSystem } from "@/lib/units";
import {
  changePasswordAction,
  deleteAccountAction,
  importLegacyEventsAction,
  updateProfileAction,
} from "./actions";

export function ProfileForm({
  profile,
  timeZones,
}: {
  profile: {
    name: string;
    email: string;
    timezone: string;
    unitSystem: UnitSystem;
    waterGoalMl: number;
    stepGoal: number;
    moodReminderTime: string | null;
  };
  timeZones: string[];
}) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const [units, setUnits] = useState<UnitSystem>(profile.unitSystem);
  const detected = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );

  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="profile-name" label="Name" error={fieldError(state, "name")}>
          {(a) => <Input {...a} name="name" autoComplete="name" defaultValue={fieldValue(state, "name", profile.name)} />}
        </Field>
        <Field id="profile-email" label="Email" hint="Used to log in and for password resets.">
          {(a) => <Input {...a} value={profile.email} readOnly disabled />}
        </Field>
        <Field
          id="profile-timezone"
          label="Time zone"
          error={fieldError(state, "timezone")}
          hint={detected && detected !== profile.timezone ? `Your browser reports ${detected}.` : "Decides when “today” starts."}
        >
          {(a) => (
            <Select {...a} name="timezone" defaultValue={fieldValue(state, "timezone", profile.timezone)}>
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>{tz.replaceAll("_", " ")}</option>
              ))}
            </Select>
          )}
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Units</legend>
          <div className="flex h-10 items-center gap-4 text-sm">
            {(["imperial", "metric"] as const).map((u) => (
              <label key={u} className="flex items-center gap-2">
                <input type="radio" name="unitSystem" value={u} checked={units === u} onChange={() => setUnits(u)} className="size-4 accent-[var(--primary-ink)]" />
                {u === "imperial" ? "Imperial (lb, oz, mi)" : "Metric (kg, ml, km)"}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="profile-water" label={`Daily water goal (${volumeUnit(units)})`} error={fieldError(state, "waterGoal")}>
          {(a) => (
            <Input
              {...a}
              key={units}
              type="number"
              name="waterGoal"
              min={1}
              inputMode="decimal"
              defaultValue={fieldValue(state, "waterGoal", String(mlToDisplay(profile.waterGoalMl, units)))}
            />
          )}
        </Field>
        <Field id="profile-steps" label="Daily step goal" error={fieldError(state, "stepGoal")}>
          {(a) => <Input {...a} type="number" name="stepGoal" min={100} step={100} inputMode="numeric" defaultValue={fieldValue(state, "stepGoal", String(profile.stepGoal))} />}
        </Field>
        <Field id="profile-mood-time" label="Daily mood check-in reminder" hint="Leave empty for no reminder." error={fieldError(state, "moodReminderTime")}>
          {(a) => <Input {...a} type="time" name="moodReminderTime" defaultValue={fieldValue(state, "moodReminderTime", profile.moodReminderTime)} />}
        </Field>
      </div>
      <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
    </form>
  );
}

const subscribeNoop = () => () => {};

export function NotificationSettings() {
  const supported = useSyncExternalStore(subscribeNoop, () => "Notification" in window, () => true);
  const initial = useSyncExternalStore(
    subscribeNoop,
    () => ("Notification" in window ? Notification.permission : "denied"),
    () => "default" as NotificationPermission,
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const current = permission ?? initial;

  if (!supported) return <p className="text-sm text-muted">This browser doesn&apos;t support notifications. Reminders still appear inside the app.</p>;
  if (current === "granted") {
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <Bell className="size-4" aria-hidden /> Notifications are on for this browser.
      </p>
    );
  }
  if (current === "denied") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <BellOff className="size-4" aria-hidden /> Notifications are blocked. You can allow them in your browser&apos;s site settings.
      </p>
    );
  }
  return (
    <Button variant="secondary" onClick={async () => setPermission(await Notification.requestPermission())}>
      <Bell className="size-4" aria-hidden /> Allow notifications
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pw-current" label="Current password" error={fieldError(state, "currentPassword")}>
          {(a) => <Input {...a} type="password" name="currentPassword" autoComplete="current-password" />}
        </Field>
        <Field id="pw-new" label="New password" error={fieldError(state, "password")}>
          {(a) => <Input {...a} type="password" name="password" autoComplete="new-password" minLength={8} />}
        </Field>
        <Field id="pw-confirm" label="Confirm new password" error={fieldError(state, "confirmPassword")}>
          {(a) => <Input {...a} type="password" name="confirmPassword" autoComplete="new-password" />}
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Saving…">Change password</SubmitButton>
    </form>
  );
}

const LEGACY_SNIPPET = `copy(localStorage.getItem("events"))`;

export function LegacyImport() {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<{ events: ImportedEvent[]; skipped: number } | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const analyze = (text: string) => {
    setMessage(null);
    try {
      const result = parseLegacyEvents(text);
      setPreview(result);
      if (result.events.length === 0) setMessage({ tone: "error", text: "No events were found in that data." });
    } catch {
      setPreview(null);
      setMessage({ tone: "error", text: "That doesn't look like the saved events from the original planner." });
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>Open the original planner&apos;s calendar page in the same browser and at the same address you used before.</li>
        <li>
          Open the browser&apos;s developer console (F12) and run <code className="rounded bg-surface-2 px-1.5 py-0.5 text-fg">{LEGACY_SNIPPET}</code>
        </li>
        <li>Paste the result below, or upload a saved .json file.</li>
      </ol>
      <Field id="legacy-data" label="Saved events">
        {(a) => (
          <Textarea
            {...a}
            rows={4}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setPreview(null);
            }}
            placeholder='[{"title":"Meeting","date":1741420800000,"startTime":540,"endTime":600,"color":"#2563EB"}]'
            className="font-mono text-xs"
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ring-input ring-inset hover:bg-surface-2 has-focus-visible:ring-2 has-focus-visible:ring-primary">
          <Upload className="size-4" aria-hidden /> Upload file
          <input
            type="file"
            accept="application/json,.json,.txt"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              setRaw(text);
              analyze(text);
            }}
          />
        </label>
        <Button size="sm" variant="secondary" onClick={() => analyze(raw)} disabled={!raw.trim()}>
          Check data
        </Button>
        {preview && preview.events.length > 0 ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await importLegacyEventsAction(preview.events);
                if (result.ok) {
                  setMessage({
                    tone: "success",
                    text: `Imported ${result.added} ${result.added === 1 ? "event" : "events"}${result.duplicates ? `; ${result.duplicates} already on your calendar were skipped` : ""}.`,
                  });
                  setPreview(null);
                  setRaw("");
                } else {
                  setMessage({ tone: "error", text: result.error });
                }
              })
            }
          >
            {pending ? "Importing…" : `Import ${preview.events.length} ${preview.events.length === 1 ? "event" : "events"}`}
          </Button>
        ) : null}
      </div>
      {preview && preview.events.length > 0 ? (
        <p className="text-muted">
          Found {preview.events.length} {preview.events.length === 1 ? "event" : "events"}
          {preview.skipped ? ` (${preview.skipped} unreadable ${preview.skipped === 1 ? "entry" : "entries"} will be skipped)` : ""}, from{" "}
          {[...preview.events].sort((a, b) => a.date.localeCompare(b.date))[0].date} to{" "}
          {[...preview.events].sort((a, b) => b.date.localeCompare(a.date))[0].date}. Dates are read in this browser&apos;s time zone, exactly as the old calendar showed them.
        </p>
      ) : null}
      {message ? (
        <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-danger" : "text-success"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="delete-password" label="Your password" error={fieldError(state, "password")}>
          {(a) => <Input {...a} type="password" name="password" autoComplete="current-password" />}
        </Field>
        <Field id="delete-confirm" label="Type DELETE to confirm" error={fieldError(state, "confirm")}>
          {(a) => <Input {...a} name="confirm" autoComplete="off" defaultValue={fieldValue(state, "confirm")} />}
        </Field>
      </div>
      <SubmitButton variant="danger" pendingLabel="Deleting…">Delete my account and data</SubmitButton>
    </form>
  );
}
