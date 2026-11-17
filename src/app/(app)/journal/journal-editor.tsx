"use client";

import Link from "next/link";
import { Shuffle } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { JOURNAL_KIND_LABELS, JOURNAL_PROMPTS, type JournalKind } from "@/lib/constants";
import { initialFormState } from "@/lib/forms";
import { createEntryAction, updateEntryAction } from "./actions";

export interface EditableEntry {
  id: string;
  date: string;
  kind: JournalKind;
  title: string;
  body: string;
  prompt: string | null;
  tags: string[];
}

const PLACEHOLDERS: Record<JournalKind, string> = {
  entry: "Write freely. What's on your mind?",
  gratitude: "1. \n2. \n3. ",
  reflection: "What happened, how did it feel, and what will you take from it?",
};

export function JournalEditor({
  entry,
  defaults,
  onDone,
}: {
  entry?: EditableEntry;
  defaults?: { date: string; kind: JournalKind; prompt: string | null };
  onDone?: () => void;
}) {
  const [state, action] = useActionState(entry ? updateEntryAction : createEntryAction, initialFormState);
  const [kind, setKind] = useState<JournalKind>(entry?.kind ?? defaults?.kind ?? "entry");
  const [prompt, setPrompt] = useState<string | null>(entry?.prompt ?? defaults?.prompt ?? null);

  useEffect(() => {
    if (entry && state.status === "success") onDone?.();
  }, [entry, state, onDone]);

  const shufflePrompt = () => {
    const options = JOURNAL_PROMPTS[kind].filter((p) => p !== prompt);
    setPrompt(options[Math.floor(Math.random() * options.length)] ?? null);
  };

  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <input type="hidden" name="prompt" value={prompt ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem_10rem]">
        <Field id="journal-title" label="Title" error={fieldError(state, "title")}>
          {(a) => <Input {...a} name="title" placeholder="Untitled entry" defaultValue={fieldValue(state, "title", entry?.title)} />}
        </Field>
        <Field id="journal-kind" label="Type" error={fieldError(state, "kind")}>
          {(a) => (
            <Select {...a} name="kind" value={kind} onChange={(e) => setKind(e.target.value as JournalKind)}>
              {Object.entries(JOURNAL_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="journal-date" label="Date" error={fieldError(state, "date")}>
          {(a) => <Input {...a} type="date" name="date" required defaultValue={fieldValue(state, "date", entry?.date ?? defaults?.date)} />}
        </Field>
      </div>

      <div className="rounded-xl bg-accent-soft px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Prompt</p>
            <p className="mt-0.5 leading-snug font-medium">{prompt ?? "None. Write freely."}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={shufflePrompt}>
              <Shuffle className="size-4" aria-hidden /> {prompt ? "Another" : "Give me one"}
            </Button>
            {prompt ? (
              <Button size="sm" variant="ghost" onClick={() => setPrompt(null)}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Field id="journal-body" label="Entry" error={fieldError(state, "body")}>
        {(a) => (
          <Textarea
            {...a}
            name="body"
            required
            rows={14}
            className="min-h-72 text-base"
            placeholder={PLACEHOLDERS[kind]}
            defaultValue={fieldValue(state, "body", entry?.body)}
          />
        )}
      </Field>
      <Field id="journal-tags" label="Tags" hint="Separate with commas, e.g. school, family, self-care" error={fieldError(state, "tags")}>
        {(a) => <Input {...a} name="tags" defaultValue={fieldValue(state, "tags", entry?.tags.join(", "))} />}
      </Field>
      <div className="flex justify-end gap-2">
        {entry ? (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : (
          <Link href="/journal" className={buttonClasses({ variant: "ghost" })}>
            Cancel
          </Link>
        )}
        <SubmitButton pendingLabel="Saving…">{entry ? "Save changes" : "Save entry"}</SubmitButton>
      </div>
    </form>
  );
}
