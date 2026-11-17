"use client";

import Link from "next/link";
import { TextLink } from "@/components/ui/text-link";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { MoodIcon } from "@/components/mood-icon";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { JOURNAL_KIND_LABELS, moodLabel } from "@/lib/constants";
import { deleteEntryAction } from "../actions";
import { JournalEditor, type EditableEntry } from "../journal-editor";

export function EntryView({
  entry,
  dateLabel,
  mood,
}: {
  entry: EditableEntry;
  dateLabel: string;
  mood: { mood: number; emotions: string[]; note: string | null } | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) return <JournalEditor entry={entry} onDone={() => setEditing(false)} />;

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <time dateTime={entry.date}>{dateLabel}</time>
            {entry.kind !== "entry" ? <span className="ml-3">{JOURNAL_KIND_LABELS[entry.kind]}</span> : null}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{entry.title}</h2>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden /> Edit
          </Button>
          <ConfirmButton aria-label="Delete entry" confirmLabel="Delete entry?" onConfirm={() => deleteEntryAction(entry.id)}>
            <Trash2 className="size-4" aria-hidden />
          </ConfirmButton>
        </div>
      </div>
      {entry.prompt ? <p className="mt-5 rounded-xl bg-accent-soft px-4 py-3 font-medium">{entry.prompt}</p> : null}
      <div className="mt-5 max-w-[68ch] text-section leading-relaxed whitespace-pre-wrap">{entry.body}</div>
      {entry.tags.length ? (
        <p className="mt-6 flex flex-wrap gap-x-3 text-sm">
          {entry.tags.map((t) => (
            <Link key={t} href={`/journal?tag=${encodeURIComponent(t)}`} className="text-primary-ink hover:underline">
              #{t}
            </Link>
          ))}
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 px-5 py-4 text-sm">
        {mood ? (
          <>
            <MoodIcon value={mood.mood} className="size-6 text-chart-1" />
            <div className="flex-1">
              <p className="font-medium">Mood that day: {moodLabel(mood.mood)}</p>
              {mood.emotions.length ? <p className="text-muted capitalize">{mood.emotions.join(", ")}</p> : null}
            </div>
            <TextLink href={`/mood?date=${entry.date}`}>
              View check-in
            </TextLink>
          </>
        ) : (
          <>
            <p className="flex-1 text-muted">No mood check-in for this day.</p>
            <TextLink href={`/mood?date=${entry.date}`}>
              Log how you felt
            </TextLink>
          </>
        )}
      </div>
    </article>
  );
}
