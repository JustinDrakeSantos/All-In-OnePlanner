"use client";

import { MapPin } from "lucide-react";
import { useCallback, useState } from "react";
import { formatMinutes, relativeDayLabel } from "@/lib/dates";
import type { EventData } from "./calendar-data";
import { EventDialog, type EventDraft } from "./event-dialog";

/** Which event is happening now and which is next, for today's schedule. */
function nowAndNext(events: EventData[], now?: { today: string; minute: number }) {
  if (!now) return { nowIds: new Set<string>(), nextId: null as string | null };
  const timedToday = events.filter((e) => e.date === now.today && !e.allDay);
  const nowIds = new Set(timedToday.filter((e) => e.startMinute <= now.minute && now.minute < e.endMinute).map((e) => e.id));
  const next = timedToday.find((e) => e.startMinute > now.minute);
  return { nowIds, nextId: next?.id ?? null };
}

/** A vertical list of events; clicking one opens the editor. */
export function AgendaList({
  events,
  today,
  showDate = false,
  now,
  empty,
}: {
  events: EventData[];
  today: string;
  showDate?: boolean;
  /** When given, marks the event in progress ("Now") and the following one ("Next"). */
  now?: { today: string; minute: number };
  empty: React.ReactNode;
}) {
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const close = useCallback(() => setDraft(null), []);

  if (events.length === 0) return <>{empty}</>;
  const { nowIds, nextId } = nowAndNext(events, now);

  return (
    <>
      <ul className="space-y-1">
        {events.map((event) => {
          const marker = nowIds.has(event.id) ? "Now" : event.id === nextId ? "Next" : null;
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => setDraft({ mode: "edit", event })}
                data-tone={event.color}
                className="tone-soft flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors"
              >
                <span className={`${showDate ? "w-24" : "w-[4.5rem]"} shrink-0 text-meta text-muted tabular-nums`}>
                  {showDate ? <span className="block font-medium text-fg">{relativeDayLabel(event.date, today)}</span> : null}
                  {event.allDay ? "All day" : formatMinutes(event.startMinute)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm leading-5 font-medium">{event.title}</span>
                    {marker ? (
                      <span
                        className={
                          marker === "Now"
                            ? "shrink-0 rounded bg-secondary px-1.5 text-micro leading-4 font-semibold text-secondary-fg"
                            : "shrink-0 rounded bg-surface/80 px-1.5 text-micro leading-4 font-semibold text-fg"
                        }
                      >
                        {marker}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1 truncate text-meta text-muted">
                    {!event.allDay ? <span className="tabular-nums">until {formatMinutes(event.endMinute)}</span> : null}
                    {event.location ? (
                      <>
                        <MapPin className="ml-1 size-3 shrink-0" aria-hidden />
                        <span className="truncate">{event.location}</span>
                      </>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <EventDialog draft={draft} onClose={close} />
    </>
  );
}
