"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { journalSchema } from "@/lib/schemas";
import { requireUser } from "@/server/auth/current-user";
import { createEntry, deleteEntry, updateEntry } from "@/server/data/journal";

const idSchema = z.string().min(1).max(64);

export async function createEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(journalSchema, formData);
  if (!parsed.ok) return parsed.state;
  const entry = await createEntry(user.id, parsed.data);
  redirect(`/journal/${entry.id}`);
}

export async function updateEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("This entry couldn't be found.");
  const parsed = parseForm(journalSchema, formData);
  if (!parsed.ok) return parsed.state;
  const entry = await updateEntry(user.id, id.data, parsed.data);
  if (!entry) return failure("This entry couldn't be found. It may have been deleted.");
  refresh();
  return success("Entry saved.");
}

export async function deleteEntryAction(entryId: string): Promise<void> {
  const user = await requireUser();
  await deleteEntry(user.id, idSchema.parse(entryId));
  redirect("/journal");
}
