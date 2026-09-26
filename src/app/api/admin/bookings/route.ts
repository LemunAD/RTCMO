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
  const search = searchParams.get("search")?.trim();

  let query = supabaseAdmin
    .from("bookings")
    .select(
      "id, court_id, booking_date, time_slot, player_count, total_price, full_name, phone, email, booking_ref, created_at"
    )
    .order("booking_date", { ascending: false })
    .order("time_slot", { ascending: true });

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Invalid date format" }, { status: 400 });
    }
    query = query.eq("booking_date", date);
  }

  if (courtId) {
    if (!COURT_IDS.includes(Number(courtId) as (typeof COURT_IDS)[number])) {
      return Response.json({ error: "Invalid court_id" }, { status: 400 });
    }
    query = query.eq("court_id", Number(courtId));
  }

  if (search) {
    // Strip PostgREST filter-syntax metacharacters so the search term can't
    // inject extra .or() conditions.
    const safeSearch = search.replace(/[,()]/g, "");
    if (safeSearch) {
      query = query.or(
        `full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,booking_ref.ilike.%${safeSearch}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ bookings: data ?? [] });
}
