import "server-only";
import { minutesNowInTimeZone, todayInTimeZone, type ISODate } from "@/lib/dates";
import type { CurrentUser } from "@/server/auth/current-user";

/** "Today" and the current minute in the user's own time zone. */
export function userClock(user: CurrentUser, now: Date = new Date()): { today: ISODate; nowMinute: number } {
  return { today: todayInTimeZone(user.timezone, now), nowMinute: minutesNowInTimeZone(user.timezone, now) };
}
