// Shared rules for client-side booking management (lookup / cancel).
// Server-only helpers: used by Route Handlers under src/app/api/manage/**.

export const CANCEL_CUTOFF_HOURS = 2;
export const CLUB_TIMEZONE = "Africa/Casablanca";

export interface PublicBooking {
  booking_ref: string;
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  status: "pending" | "paid" | "cancelled";
  other_players?: string[] | null;
  cancellable: boolean;
  cancel_reason: string | null;
}

export const PUBLIC_BOOKING_COLUMNS =
  "booking_ref, court_id, booking_date, time_slot, player_count, total_price, full_name, phone, email, status, other_players";

/** Keeps digits only and compares the last 9 (ignores +212 / 0 prefixes and spacing). */
export function phonesMatch(a: string, b: string): boolean {
  const da = (a || "").replace(/\D/g, "");
  const db = (b || "").replace(/\D/g, "");
  if (da.length < 9 || db.length < 9) return false;
  return da.slice(-9) === db.slice(-9);
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

export function evaluateCancellation(booking: {
  booking_date: string;
  time_slot: string;
  status: string | null;
}): { cancellable: boolean; reason: string | null } {
  const status = booking.status ?? "pending";
  if (status === "cancelled") return { cancellable: false, reason: "Cette réservation est déjà annulée." };
  if (status === "paid") {
    return {
      cancellable: false,
      reason: "Cette réservation est déjà réglée. Merci de contacter le club pour toute modification.",
    };
  }
  const minutesLeft = slotMinutes(booking.booking_date, booking.time_slot) - clubNowMinutes();
  if (minutesLeft <= CANCEL_CUTOFF_HOURS * 60) {
    return {
      cancellable: false,
      reason: `L'annulation en ligne n'est possible que jusqu'à ${CANCEL_CUTOFF_HOURS}h avant le début du créneau. Merci de contacter le club.`,
    };
  }
  return { cancellable: true, reason: null };
}

export function toPublicBooking(row: Record<string, any>): PublicBooking {
  const { cancellable, reason } = evaluateCancellation(row as any);
  return {
    booking_ref: row.booking_ref,
    court_id: row.court_id,
    booking_date: row.booking_date,
    time_slot: row.time_slot,
    player_count: row.player_count,
    total_price: row.total_price,
    full_name: row.full_name,
    status: row.status ?? "pending",
    other_players: row.other_players ?? [],
    cancellable,
    cancel_reason: reason,
  };
}

// Very small in-memory throttle to slow down ref/phone guessing. Per-instance only;
// good enough as a first line of defence on a single-club site.
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimited(key: string, max = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
