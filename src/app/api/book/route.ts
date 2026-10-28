import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { format, startOfWeek, endOfWeek } from "date-fns";
import {
  COURT_IDS,
  TIME_SLOTS,
  getBookingPrice,
} from "@/lib/constants";
import {
  phonesMatch,
  isPastClubDate,
  isBeyondBookingWindow,
  MAX_WEEKLY_BOOKINGS,
  MAX_BOOKING_DAYS,
} from "@/lib/bookingPolicy";
import { getUserFromRequest } from "@/lib/userAuth";

interface BookingPayload {
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  total_price: number;
  full_name: string;
  phone: string;
  email: string;
  other_players?: string[];
}

function generateRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "RTM-";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (user && !user.email_confirmed_at) {
    return Response.json(
      { error: "Veuillez d'abord confirmer votre adresse e-mail avant de réserver." },
      { status: 403 }
    );
  }

  let body: BookingPayload;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Basic validation
  const required: (keyof BookingPayload)[] = [
    "court_id",
    "booking_date",
    "time_slot",
    "player_count",
    "full_name",
    "phone",
    "email",
  ];
  for (const field of required) {
    if (!body[field] && body[field] !== 0) {
      return Response.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  if (!body.full_name.trim()) {
    return Response.json(
      { error: "Le nom complet est obligatoire." },
      { status: 400 }
    );
  }

  if (![2, 4].includes(body.player_count)) {
    return Response.json(
      { error: "player_count must be 2 or 4" },
      { status: 400 }
    );
  }

  if (!COURT_IDS.includes(body.court_id as (typeof COURT_IDS)[number])) {
    return Response.json({ error: "Invalid court_id" }, { status: 400 });
  }

  if (!(TIME_SLOTS as readonly string[]).includes(body.time_slot)) {
    return Response.json({ error: "Invalid time_slot" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.booking_date)) {
    return Response.json({ error: "Invalid booking_date format" }, { status: 400 });
  }

  if (isPastClubDate(body.booking_date)) {
    return Response.json(
      { error: "La date sélectionnée est déjà passée." },
      { status: 400 }
    );
  }

  if (isBeyondBookingWindow(body.booking_date)) {
    return Response.json(
      {
        error: `Les réservations ne sont ouvertes que pour les ${MAX_BOOKING_DAYS} prochains jours (2 semaines).`,
        code: "BEYOND_BOOKING_WINDOW",
      },
      { status: 400 }
    );
  }

  // Weekly booking limit: maximum 2 bookings per week (Monday to Sunday) per user
  const [by, bm, bd] = body.booking_date.split("-").map(Number);
  const targetDate = new Date(by, bm - 1, bd);
  const weekStart = format(startOfWeek(targetDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(targetDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: weekBookings, error: weekQueryError } = await supabase
    .from("bookings")
    .select("id, email, phone, status, booking_date")
    .gte("booking_date", weekStart)
    .lte("booking_date", weekEnd)
    .or("status.neq.cancelled,status.is.null");

  if (weekQueryError) {
    return Response.json({ error: weekQueryError.message }, { status: 500 });
  }

  const normalizedEmail = body.email.trim().toLowerCase();
  const userBookingsThisWeek = (weekBookings ?? []).filter((b) => {
    const emailMatch = (b.email || "").trim().toLowerCase() === normalizedEmail;
    const phoneMatch = phonesMatch(b.phone, body.phone);
    return emailMatch || phoneMatch;
  });

  if (userBookingsThisWeek.length >= MAX_WEEKLY_BOOKINGS) {
    return Response.json(
      {
        error:
          "Limite atteinte : vous ne pouvez réserver que 2 créneaux par semaine au maximum.",
        code: "WEEKLY_LIMIT_REACHED",
      },
      { status: 400 }
    );
  }

  const bookingRef = generateRef();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      court_id: body.court_id,
      booking_date: body.booking_date,
      time_slot: body.time_slot,
      player_count: body.player_count,
      total_price: getBookingPrice(body.booking_date),
      full_name: body.full_name.trim(),
      phone: body.phone.trim(),
      email: normalizedEmail,
      address: "",
      other_players: [],
      booking_ref: bookingRef,
      status: "pending",
    })
    .select("id, booking_ref")
    .single();

  if (error) {
    // UNIQUE constraint violation → slot already taken
    if (error.code === "23505") {
      return Response.json(
        {
          error:
            "Ce créneau vient d'être réservé par quelqu'un d'autre. Veuillez en choisir un autre.",
          code: "SLOT_TAKEN",
        },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    bookingRef: data.booking_ref,
    bookingId: data.id,
  });
}
