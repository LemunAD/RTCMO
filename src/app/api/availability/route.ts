import { supabase } from "@/lib/supabase";
import { COURT_IDS } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("court_id");
  const date = searchParams.get("date");

  if (!courtId || !date) {
    return Response.json(
      { error: "court_id and date are required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (!COURT_IDS.includes(Number(courtId) as (typeof COURT_IDS)[number])) {
    return Response.json({ error: "Invalid court_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("time_slot")
    .eq("court_id", Number(courtId))
    .eq("booking_date", date);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const bookedSlots = (data ?? []).map((row) => row.time_slot);

  return Response.json({ bookedSlots });
}
