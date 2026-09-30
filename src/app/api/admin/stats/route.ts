import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { format, startOfWeek, startOfMonth } from "date-fns";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // Fetch all bookings (non-cancelled) for aggregate stats
  const { data: allBookings } = await supabaseAdmin
    .from("bookings")
    .select("id, court_id, booking_date, time_slot, player_count, total_price, full_name, phone, email, booking_ref, status, created_at")
    .order("booking_date", { ascending: false })
    .order("time_slot", { ascending: true });

  const bookings = allBookings ?? [];

  const active = bookings.filter(b => (b.status ?? "pending") !== "cancelled");

  const todayBookings = active.filter(b => b.booking_date === today);
  const weekBookings = active.filter(b => b.booking_date >= weekStart);
  const monthBookings = active.filter(b => b.booking_date >= monthStart);
  const upcomingBookings = active.filter(b => b.booking_date >= today);

  const sum = (arr: typeof bookings) => arr.reduce((s, b) => s + (b.total_price || 0), 0);

  // Court utilization for today
  const courtUtilization: Record<number, number> = {};
  for (const b of todayBookings) {
    courtUtilization[b.court_id] = (courtUtilization[b.court_id] || 0) + 1;
  }

  // Today's schedule sorted by time
  const todaySchedule = todayBookings
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  // Recent activity (last 10 bookings by creation date)
  const recentActivity = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return Response.json({
    overview: {
      todayBookings: todayBookings.length,
      todayRevenue: sum(todayBookings),
      weekBookings: weekBookings.length,
      weekRevenue: sum(weekBookings),
      monthBookings: monthBookings.length,
      monthRevenue: sum(monthBookings),
      totalBookings: active.length,
      totalRevenue: sum(active),
      upcomingBookings: upcomingBookings.length,
    },
    courtUtilization,
    todaySchedule,
    recentActivity,
  });
}
