import { MAX_BOOKING_DAYS } from "./constants";

const CLUB_TIMEZONE = "Africa/Casablanca";

/**
 * Returns the club's current calendar date (at 00:00:00 local club time),
 * safe from server UTC differences.
 */
export function getClubToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

export function isBeyondBookingWindow(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = getClubToday();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MAX_BOOKING_DAYS);
  return target > maxDate;
}

/** Minutes since epoch of the club's current wall-clock time (timezone-safe on UTC servers). */
function clubNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const hour = get("hour") % 24;
  return Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute")) / 60000;
}

function slotMinutes(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
}

export function minutesUntilSlot(date: string, time: string): number {
  return slotMinutes(date, time) - clubNowMinutes();
}

export function hasSlotStarted(date: string, time: string): boolean {
  return minutesUntilSlot(date, time) <= 0;
}
