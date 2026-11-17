import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { upcomingReminders } from "@/server/data/reminders";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const reminders = await upcomingReminders(user);
  return NextResponse.json({ reminders }, { headers: { "Cache-Control": "no-store" } });
}
