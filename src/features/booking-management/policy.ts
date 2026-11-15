import { minutesUntilSlot } from "@/features/booking/date-policy";
import { chaabiConfigured } from "@/features/payments/chaabi";
import type { ManagedBooking } from "./types";

export const CANCEL_CUTOFF_HOURS = 24;

export function publicBookingColumns() {
  const columns = "booking_ref, court_id, booking_date, time_slot, player_count, total_price, full_name, phone, email, status, other_players";
  return chaabiConfigured() ? `${columns}, payment_transaction_id` as const : columns;
}

/** Keeps digits only and compares the last 9 (ignores +212 / 0 prefixes and spacing). */
export function phonesMatch(a: string | null, b: string | null): boolean {
  const da = (a || "").replace(/\D/g, "");
  const db = (b || "").replace(/\D/g, "");
  if (da.length < 9 || db.length < 9) return false;
  return da.slice(-9) === db.slice(-9);
}

export function evaluateCancellation(booking: {
  booking_date: string;
  time_slot: string;
  status: string | null;
  payment_transaction_id?: string | null;
}): { cancellable: boolean; reason: string | null } {
  const status = booking.status ?? "pending";
  if (status === "cancelled") return { cancellable: false, reason: "Cette réservation est déjà annulée." };
  if (status === "paid") {
    return {
      cancellable: false,
      reason: "Cette réservation est déjà réglée. Merci de contacter le club pour toute modification.",
    };
  }
  if (booking.payment_transaction_id) {
    return {
      cancellable: false,
      reason: "Le paiement est en cours de vérification. Merci de contacter le club pour toute modification.",
    };
  }
  const minutesLeft = minutesUntilSlot(booking.booking_date, booking.time_slot);
  if (minutesLeft <= CANCEL_CUTOFF_HOURS * 60) {
    return {
      cancellable: false,
      reason: `L'annulation en ligne n'est possible que jusqu'à ${CANCEL_CUTOFF_HOURS}h avant le début du créneau. Merci de contacter le club.`,
    };
  }
  return { cancellable: true, reason: null };
}

export type BookingRow = Omit<ManagedBooking, "status" | "payment_authorized" | "cancellable" | "cancel_reason"> & {
  status: ManagedBooking["status"] | null;
  email: string | null;
  phone: string | null;
  payment_transaction_id?: string | null;
};

export function toPublicBooking(row: BookingRow): ManagedBooking {
  const { cancellable, reason } = evaluateCancellation(row);
  return {
    booking_ref: row.booking_ref,
    court_id: row.court_id,
    booking_date: row.booking_date,
    time_slot: row.time_slot,
    player_count: row.player_count,
    total_price: row.total_price,
    full_name: row.full_name,
    status: row.status ?? "pending",
    payment_authorized: (row.status ?? "pending") === "pending" && Boolean(row.payment_transaction_id),
    other_players: row.other_players ?? [],
    cancellable,
    cancel_reason: reason,
  };
}
