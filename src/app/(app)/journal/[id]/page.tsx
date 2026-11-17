import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageBody, PageSkeleton } from "@/components/ui/misc";
import { formatLongDate } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { getEntry } from "@/server/data/journal";
import { moodOn } from "@/server/data/mood";
import { EntryView } from "./entry-view";

export const metadata: Metadata = { title: "Journal entry" };

export default function EntryPage({ params }: PageProps<"/journal/[id]">) {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <Link href="/journal" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> Journal
        </Link>
      </div>
      <Suspense fallback={<PageSkeleton layout="single" />}>
        <Entry params={params} />
      </Suspense>
    </>
  );
}

async function Entry({ params }: { params: PageProps<"/journal/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await getEntry(user.id, id);
  if (!entry) notFound();
  const mood = await moodOn(user.id, entry.date);

  return (
    <PageBody className="max-w-3xl pt-4">
      <EntryView
        entry={{ id: entry.id, date: entry.date, kind: entry.kind, title: entry.title, body: entry.body, prompt: entry.prompt, tags: entry.tags }}
        dateLabel={formatLongDate(entry.date)}
        mood={mood ? { mood: mood.mood, emotions: mood.emotions, note: mood.note } : null}
      />
    </PageBody>
  );
}
