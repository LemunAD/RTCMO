export interface ManagedBooking {
  booking_ref: string;
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  status: "pending" | "paid" | "cancelled";
  payment_authorized: boolean;
  other_players?: string[] | null;
  cancellable: boolean;
  cancel_reason: string | null;
}
