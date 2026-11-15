import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { COURT_IDS } from "@/lib/constants";
import { chaabiConfigured } from "@/lib/chaabiPayment";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("court_id");
  const date = searchParams.get("date");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!courtId) {
    return Response.json({ error: "court_id is required" }, { status: 400 });
  }

  if (!date && (!startDate || !endDate)) {
    return Response.json(
      { error: "Either date or (start_date and end_date) must be provided" },
      { status: 400 }
    );
  }

  if (!COURT_IDS.includes(Number(courtId) as (typeof COURT_IDS)[number])) {
    return Response.json({ error: "Invalid court_id" }, { status: 400 });
  }

  if (chaabiConfigured()) {
    const { error } = await supabase.rpc("expire_chaabi_checkout_holds");
    if (error) {
      console.error("Checkout hold expiry failed", error.code);
      return Response.json({ error: "Impossible de vérifier les créneaux." }, { status: 503 });
    }
  }

  let query = supabase
    .from("bookings")
    .select("booking_date, time_slot")
    .eq("court_id", Number(courtId))
    .or("status.neq.cancelled,status.is.null");

  if (date) {
    query = query.eq("booking_date", date);
  } else if (startDate && endDate) {
    query = query.gte("booking_date", startDate).lte("booking_date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // If using single date, keep backward compatibility returning array of slots
  if (date) {
    const bookedSlots = (data ?? []).map((row) => row.time_slot);
    return Response.json({ bookedSlots });
  }

  // If using date range, return an object mapping dates to arrays of slots
  const bookedSlotsByDate: Record<string, string[]> = {};
  (data ?? []).forEach((row) => {
    if (!bookedSlotsByDate[row.booking_date]) {
      bookedSlotsByDate[row.booking_date] = [];
    }
    bookedSlotsByDate[row.booking_date].push(row.time_slot);
  });

  return Response.json({ bookedSlotsByDate });
}
