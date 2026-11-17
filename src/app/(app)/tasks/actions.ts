"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { taskListSchema, taskSchema } from "@/lib/schemas";
import { requireUser } from "@/server/auth/current-user";
import {
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  listBelongsToUser,
  setTaskDone,
  updateTask,
} from "@/server/data/tasks";
import { userClock } from "@/server/today";

const idSchema = z.string().min(1).max(64);

async function checkedListId(userId: string, listId: string | null): Promise<string | null | false> {
  if (!listId) return null;
  return (await listBelongsToUser(userId, listId)) ? listId : false;
}

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(taskSchema, formData);
  if (!parsed.ok) return parsed.state;

  const listId = await checkedListId(user.id, parsed.data.listId);
  if (listId === false) return failure("That list no longer exists.");

  await createTask(user.id, { ...parsed.data, listId }, userClock(user).today);
  refresh();
  return success(`Added “${parsed.data.title}”.`);
}

export async function updateTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("This task couldn't be found.");
  const parsed = parseForm(taskSchema, formData);
  if (!parsed.ok) return parsed.state;

  const listId = await checkedListId(user.id, parsed.data.listId);
  if (listId === false) return failure("That list no longer exists.");

  const updated = await updateTask(user.id, id.data, { ...parsed.data, listId }, userClock(user).today);
  if (!updated) return failure("This task couldn't be found. It may have been deleted.");
  refresh();
  return success("Task saved.");
}

export async function toggleTaskAction(taskId: string, done: boolean): Promise<void> {
  const user = await requireUser();
  const id = idSchema.parse(taskId);
  await setTaskDone(user.id, id, z.boolean().parse(done), userClock(user).today);
  refresh();
}

export async function deleteTaskAction(taskId: string): Promise<void> {
  const user = await requireUser();
  await deleteTask(user.id, idSchema.parse(taskId));
  refresh();
}

export async function createListAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(taskListSchema, formData);
  if (!parsed.ok) return parsed.state;
  const created = await createTaskList(user.id, parsed.data);
  if (!created) {
    return failure("You already have a list with that name.", {
      fieldErrors: { name: "Choose a different name." },
      values: { name: parsed.data.name },
    });
  }
  refresh();
  return success(`Created the “${parsed.data.name}” list.`);
}

export async function deleteListAction(listId: string): Promise<void> {
  const user = await requireUser();
  await deleteTaskList(user.id, idSchema.parse(listId));
  refresh();
}
