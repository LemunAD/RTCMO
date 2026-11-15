import type { BookingStatus } from "./types";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "En attente", paid: "Payé", cancelled: "Annulé",
};
export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#F59E0B", paid: "#10B981", cancelled: "#EF4444",
};
