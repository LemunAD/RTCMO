import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { COURT_IDS } from "@/lib/constants";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const courtId = searchParams.get("court_id");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "15")));

  // Build count query
  let countQuery = supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true });

  // Build data query
  let dataQuery = supabaseAdmin
    .from("bookings")
    .select("id, court_id, booking_date, time_slot, player_count, total_price, full_name, phone, email, booking_ref, status, created_at, other_players")
    .order("booking_date", { ascending: false })
    .order("time_slot", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Apply filters to both queries
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Invalid date format" }, { status: 400 });
    }
    countQuery = countQuery.eq("booking_date", date);
    dataQuery = dataQuery.eq("booking_date", date);
  }

  if (courtId) {
    if (!COURT_IDS.includes(Number(courtId) as (typeof COURT_IDS)[number])) {
      return Response.json({ error: "Invalid court_id" }, { status: 400 });
    }
    countQuery = countQuery.eq("court_id", Number(courtId));
    dataQuery = dataQuery.eq("court_id", Number(courtId));
  }

  if (status && ["pending", "paid", "cancelled"].includes(status)) {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  }

  if (search) {
    const safeSearch = search.replace(/[,()]/g, "");
    if (safeSearch) {
      const filter = `full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,booking_ref.ilike.%${safeSearch}%`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }
  }

  const [{ count }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  return Response.json({
    bookings: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
