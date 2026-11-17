"use client";

import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Label, Select, Textarea, ToneSwatches } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { PRIORITY_LABELS, RECURRENCE_LABELS, STATUS_LABELS, TONES } from "@/lib/constants";
import { relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { initialFormState, type FormState } from "@/lib/forms";
import {
  createListAction,
  createTaskAction,
  deleteListAction,
  deleteTaskAction,
  toggleTaskAction,
  updateTaskAction,
} from "./actions";
import type { ListOption, TaskRowData } from "./task-data";

// ---------------------------------------------------------------------------
// A single task with a checkbox and an edit dialog
// ---------------------------------------------------------------------------

/** "yesterday" or "Wed, Mar 12", for use mid-sentence. */
function dueLabel(dueDate: string, today: string) {
  const label = relativeDayLabel(dueDate, today);
  return label === "Yesterday" ? "yesterday" : label;
}

export function TaskRow({
  task,
  today,
  lists,
  compact = false,
}: {
  task: TaskRowData;
  today: string;
  lists: ListOption[];
  compact?: boolean;
}) {
  const [done, setDone] = useOptimistic(task.status === "done");
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const overdue = !done && task.dueDate !== null && task.dueDate < today;

  // Optimistic check-off. React reverts the checkbox if the action fails, and the
  // toast explains why instead of the error reaching the page's error boundary.
  const setCompleted = (next: boolean, announce = true) =>
    startTransition(async () => {
      setDone(next);
      try {
        await toggleTaskAction(task.id, next);
        if (!next || !announce) return;
        // Undo would leave the next occurrence of a repeating task behind, so it's offered for one-off tasks only.
        toast.show(
          task.recurrence === "none"
            ? { message: `Completed “${task.title}”`, action: { label: "Undo", onAction: () => setCompleted(false, false) } }
            : { message: `Completed. The next “${task.title}” is scheduled.` },
        );
      } catch (error) {
        unstable_rethrow(error);
        toast.error(`Couldn't update “${task.title}”. Check your connection and try again.`);
      }
    });

  const meta: React.ReactNode[] = [];
  if (task.dueDate && (overdue || !compact || task.dueDate !== today)) {
    meta.push(
      <span key="due" className={overdue ? "font-medium text-danger" : undefined}>
        {overdue ? `Was due ${dueLabel(task.dueDate, today)}` : relativeDayLabel(task.dueDate, today)}
      </span>,
    );
  }
  if (task.priority === "high") meta.push(<span key="p" className="font-medium text-fg">High priority</span>);
  if (task.listName && !compact) {
    meta.push(
      <span key="list" className="inline-flex items-center gap-1.5">
        <span data-tone={task.listColor ?? "glacier"} className="tone-dot size-2 rounded-full" aria-hidden />
        {task.listName}
      </span>,
    );
  }
  if (task.recurrence !== "none") {
    meta.push(
      <span key="r" className="inline-flex items-center gap-1">
        <Repeat className="size-3" aria-hidden />
        {RECURRENCE_LABELS[task.recurrence]}
      </span>,
    );
  }
  if (task.status === "in_progress" && !done) meta.push(<span key="s">In progress</span>);

  return (
    <li className="group flex items-start gap-3 py-2.5">
      <Checkbox
        className="mt-0.5"
        checked={done}
        onChange={(event) => setCompleted(event.target.checked)}
        aria-label={`${task.title}: mark as ${done ? "not done" : "done"}`}
      />
      <div className={cn("min-w-0 flex-1 transition-opacity duration-300", done && "opacity-55")}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "relative text-left text-panel leading-snug decoration-muted/70 transition-colors hover:text-primary-ink after:absolute after:-inset-y-1.5 after:-inset-x-1 after:content-['']",
            done && "line-through",
          )}
        >
          {task.title}
        </button>
        {meta.length ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-muted">{meta}</p>
        ) : null}
        {task.notes && !compact ? <p className="mt-1 line-clamp-2 text-sm text-muted">{task.notes}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="-my-1 grid size-9 shrink-0 place-items-center rounded-lg text-subtle transition hover:bg-surface-2 hover:text-fg md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        aria-label={`Edit “${task.title}”`}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit task">
        <EditTaskForm task={task} lists={lists} onDone={() => setEditing(false)} />
      </Dialog>
    </li>
  );
}

function EditTaskForm({ task, lists, onDone }: { task: TaskRowData; lists: ListOption[]; onDone: () => void }) {
  const [state, action] = useActionState(updateTaskAction, initialFormState);
  const toast = useToast();

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={task.id} />
      <TaskFields state={state} lists={lists} task={task} showStatus />
      <div className="flex items-center justify-between gap-2 pt-2">
        <ConfirmButton
          aria-label="Delete task"
          confirmLabel="Delete this task?"
          onConfirm={async () => {
            await deleteTaskAction(task.id);
            onDone();
            toast.show({ message: `Deleted “${task.title}”` });
          }}
        >
          <Trash2 className="size-4" aria-hidden /> Delete
        </ConfirmButton>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function TaskFields({
  state,
  lists,
  task,
  defaultDueDate,
  defaultListId,
  showStatus = false,
}: {
  state: FormState;
  lists: ListOption[];
  task?: TaskRowData;
  defaultDueDate?: string;
  defaultListId?: string;
  showStatus?: boolean;
}) {
  const key = task?.id ?? "new";
  return (
    <>
      <Field id={`title-${key}`} label="Title" error={fieldError(state, "title")}>
        {(a) => <Input {...a} name="title" required defaultValue={fieldValue(state, "title", task?.title)} />}
      </Field>
      <Field id={`notes-${key}`} label="Notes" error={fieldError(state, "notes")}>
        {(a) => <Textarea {...a} name="notes" rows={3} defaultValue={fieldValue(state, "notes", task?.notes)} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`due-${key}`} label="Due date" error={fieldError(state, "dueDate")}>
          {(a) => <Input {...a} type="date" name="dueDate" defaultValue={fieldValue(state, "dueDate", task?.dueDate ?? defaultDueDate)} />}
        </Field>
        <Field id={`priority-${key}`} label="Priority" error={fieldError(state, "priority")}>
          {(a) => (
            <Select {...a} name="priority" defaultValue={fieldValue(state, "priority", task?.priority ?? "medium")}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id={`list-${key}`} label="List" error={fieldError(state, "listId")}>
          {(a) => (
            <Select {...a} name="listId" defaultValue={fieldValue(state, "listId", task?.listId ?? defaultListId ?? "")}>
              <option value="">No list</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id={`repeat-${key}`} label="Repeats" error={fieldError(state, "recurrence")}>
          {(a) => (
            <Select {...a} name="recurrence" defaultValue={fieldValue(state, "recurrence", task?.recurrence ?? "none")}>
              {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        {showStatus ? (
          <Field id={`status-${key}`} label="Status" error={fieldError(state, "status")}>
            {(a) => (
              <Select {...a} name="status" defaultValue={fieldValue(state, "status", task?.status ?? "todo")}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Adding tasks
// ---------------------------------------------------------------------------

/** One-line quick add with a "More options" dialog for notes, lists, and repeats. */
export function QuickAddTask({
  lists,
  defaultDueDate,
  defaultListId,
  placeholder = "Add a task…",
}: {
  lists: ListOption[];
  defaultDueDate?: string;
  defaultListId?: string;
  placeholder?: string;
}) {
  const [state, action] = useActionState(createTaskAction, initialFormState);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="@container">
      {/* Sized by its container, not the screen: one row in a wide card, two rows in a narrow one. */}
      <form key={formKey(state)} action={action} className="flex flex-col gap-2 @xl:flex-row @xl:items-start">
        <div className="min-w-0 flex-1">
          <Label htmlFor="quick-task" className="sr-only">New task</Label>
          <Input
            id="quick-task"
            name="title"
            placeholder={placeholder}
            defaultValue={fieldValue(state, "title")}
            aria-invalid={fieldError(state, "title") ? true : undefined}
            required
          />
        </div>
        <div className="flex gap-2">
          <Label htmlFor="quick-task-due" className="sr-only">Due date</Label>
          <Input id="quick-task-due" type="date" name="dueDate" className="min-w-0 flex-1 @xl:w-auto @xl:flex-none" defaultValue={fieldValue(state, "dueDate", defaultDueDate)} />
          <Label htmlFor="quick-task-priority" className="sr-only">Priority</Label>
          <Select id="quick-task-priority" name="priority" className="w-32 shrink-0" defaultValue={fieldValue(state, "priority", "medium")}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <input type="hidden" name="listId" value={defaultListId ?? ""} />
          <SubmitButton aria-label="Add task">
            <Plus className="size-4" aria-hidden /> <span className="hidden @md:inline">Add</span>
          </SubmitButton>
        </div>
      </form>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <FormMessage state={state} className="py-1" />
        <button
          type="button"
          className="relative ml-auto text-xs font-medium text-primary-ink hover:underline after:absolute after:-inset-2 after:content-['']"
          onClick={() => setDetailsOpen(true)}
        >
          More options
        </button>
      </div>
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} title="New task">
        <NewTaskForm lists={lists} defaultDueDate={defaultDueDate} defaultListId={defaultListId} onDone={() => setDetailsOpen(false)} />
      </Dialog>
    </div>
  );
}

function NewTaskForm({
  lists,
  defaultDueDate,
  defaultListId,
  onDone,
}: {
  lists: ListOption[];
  defaultDueDate?: string;
  defaultListId?: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(createTaskAction, initialFormState);
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);
  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <FormMessage state={state} />
      <TaskFields state={state} lists={lists} defaultDueDate={defaultDueDate} defaultListId={defaultListId} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <SubmitButton pendingLabel="Adding…">Add task</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function NewListForm() {
  const [state, action] = useActionState(createListAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-3">
      <Field id="new-list-name" label="New list" error={fieldError(state, "name")}>
        {(a) => <Input {...a} name="name" placeholder="e.g. Errands" defaultValue={fieldValue(state, "name")} />}
      </Field>
      <ToneSwatches name="color" defaultValue="glacier" options={TONES} />
      <FormMessage state={state} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Creating…">
        <Plus className="size-4" aria-hidden /> Create list
      </SubmitButton>
    </form>
  );
}

export function DeleteListButton({ listId, name }: { listId: string; name: string }) {
  return (
    <ConfirmButton
      size="icon"
      className="text-subtle"
      aria-label={`Delete the ${name} list`}
      confirmLabel="Delete list?"
      onConfirm={() => deleteListAction(listId)}
    >
      <Trash2 className="size-4" aria-hidden />
    </ConfirmButton>
  );
}
