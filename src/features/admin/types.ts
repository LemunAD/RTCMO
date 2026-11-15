export type BookingStatus = "pending" | "paid" | "cancelled";
export type PaymentResolution = "captured" | "refunded" | "voided";

export interface Booking {
  id: number;
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  phone: string;
  email: string;
  booking_ref: string;
  status: BookingStatus;
  created_at: string;
  other_players?: string[];
  payment_order_id?: string | null;
  payment_transaction_id?: string | null;
  payment_resolution?: PaymentResolution | null;
}

export interface Stats {
  overview: {
    todayBookings: number; todayRevenue: number;
    weekBookings: number;  weekRevenue: number;
    monthBookings: number; monthRevenue: number;
    totalBookings: number; totalRevenue: number;
    upcomingBookings: number;
  };
  courtUtilization: Record<number, number>;
  todaySchedule: Booking[];
  recentActivity: Booking[];
}

export interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  paymentConfigured: boolean;
}
