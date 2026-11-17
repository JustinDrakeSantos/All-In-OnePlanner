import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { exportUserData } from "@/server/data/export";
import { todayInTimeZone } from "@/lib/dates";

/** Downloads everything the signed-in user has entered, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const data = await exportUserData(user.id);
  const filename = `all-in-planner-export-${todayInTimeZone(user.timezone)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
