import { endOfMonth, format, parse, startOfMonth } from "date-fns";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { COURTS, DATE_FORMAT } from "@/lib/constants";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");

  if (monthParam && !/^\d{4}-\d{2}$/.test(monthParam)) {
    return Response.json({ error: "month must be in yyyy-MM format" }, { status: 400 });
  }

  const monthDate = monthParam
    ? parse(`${monthParam}-01`, DATE_FORMAT, new Date())
    : new Date();

  const from = format(startOfMonth(monthDate), DATE_FORMAT);
  const to = format(endOfMonth(monthDate), DATE_FORMAT);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("court_id, status, total_price")
    .gte("booking_date", from)
    .lte("booking_date", to);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  let paidCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let revenue = 0;
  const byCourtCounts = new Map<number, number>();

  for (const row of rows) {
    if (row.status === "paid") {
      paidCount++;
      revenue += row.total_price;
    } else if (row.status === "cancelled") {
      cancelledCount++;
    } else {
      pendingCount++;
    }

    if (row.status !== "cancelled") {
      byCourtCounts.set(row.court_id, (byCourtCounts.get(row.court_id) ?? 0) + 1);
    }
  }

  const byCourt = COURTS.map((court) => ({
    court_id: court.id,
    court_name: court.name,
    count: byCourtCounts.get(court.id) ?? 0,
  }));

  return Response.json({
    month: format(monthDate, "yyyy-MM"),
    totalBookings: paidCount + pendingCount,
    paidCount,
    pendingCount,
    cancelledCount,
    revenue,
    byCourt,
  });
}
