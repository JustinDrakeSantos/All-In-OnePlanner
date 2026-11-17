import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader, PageSkeleton } from "@/components/ui/misc";
import { JOURNAL_PROMPTS, type JournalKind } from "@/lib/constants";
import { isISODate } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { userClock } from "@/server/today";
import { JournalEditor } from "../journal-editor";

export const metadata: Metadata = { title: "New journal entry" };

export default function NewEntryPage({ searchParams }: PageProps<"/journal/new">) {
  return (
    <>
      <PageHeader title="New entry" description="Only you can see your journal." />
      <Suspense fallback={<PageSkeleton layout="single" />}>
        <NewEntry searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewEntry({ searchParams }: { searchParams: PageProps<"/journal/new">["searchParams"] }) {
  const user = await requireUser();
  const { today } = userClock(user);
  const params = await searchParams;
  const kind: JournalKind = params.kind === "gratitude" || params.kind === "reflection" ? params.kind : "entry";
  // Only accept prompts from the built-in list so a link can't inject arbitrary text.
  const prompt =
    typeof params.prompt === "string" && (JOURNAL_PROMPTS[kind] as readonly string[]).includes(params.prompt) ? params.prompt : null;
  const date = isISODate(params.date) ? params.date : today;

  return (
    <PageBody className="max-w-3xl">
      <JournalEditor defaults={{ date, kind, prompt }} />
    </PageBody>
  );
}
