import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { randomInt } from "node:crypto";
import { isValid } from "date-fns";
import {
  COURT_IDS,
  TIME_SLOTS,
  getBookingPrice,
  parseBookingDate,
} from "@/lib/constants";
import {
  hasSlotStarted,
  isBeyondBookingWindow,
  MAX_BOOKING_DAYS,
} from "@/lib/bookingPolicy";
import { getUserFromRequest } from "@/lib/userAuth";
import {
  CHAABI_HOLD_MS,
  chaabiConfigured,
  chaabiPaymentsEnabled,
  createChaabiCheckout,
  getChaabiConfig,
} from "@/lib/chaabiPayment";

interface BookingPayload {
  court_id: number;
  booking_date: string;
  time_slot: string;
  player_count: number;
  full_name: string;
  phone: string;
}

function generateRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "RTM-";
  for (let i = 0; i < 6; i++) {
    ref += chars[randomInt(chars.length)];
  }
  return ref;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.email) {
    return Response.json({ error: "Veuillez vous connecter avant de réserver." }, { status: 401 });
  }
  if (!user.email_confirmed_at) {
    return Response.json(
      {
        error: "Veuillez d'abord confirmer votre adresse e-mail avant de réserver.",
        code: "EMAIL_NOT_CONFIRMED",
      },
      { status: 403 }
    );
  }

  let body: Partial<BookingPayload> | null;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid booking payload" }, { status: 400 });
  }

  if (typeof body.full_name !== "string" || !body.full_name.trim()) {
    return Response.json(
      { error: "Le nom complet est obligatoire." },
      { status: 400 }
    );
  }

  if (typeof body.phone !== "string" || body.phone.replace(/\D/g, "").length < 9) {
    return Response.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  }

  if (body.player_count !== 2 && body.player_count !== 4) {
    return Response.json(
      { error: "player_count must be 2 or 4" },
      { status: 400 }
    );
  }

  if (!COURT_IDS.includes(body.court_id as (typeof COURT_IDS)[number])) {
    return Response.json({ error: "Invalid court_id" }, { status: 400 });
  }

  if (typeof body.time_slot !== "string" || !(TIME_SLOTS as readonly string[]).includes(body.time_slot)) {
    return Response.json({ error: "Invalid time_slot" }, { status: 400 });
  }

  if (
    typeof body.booking_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.booking_date) ||
    !isValid(parseBookingDate(body.booking_date))
  ) {
    return Response.json({ error: "Invalid booking_date format" }, { status: 400 });
  }

  if (hasSlotStarted(body.booking_date, body.time_slot)) {
    return Response.json(
      { error: "Le créneau sélectionné est déjà passé." },
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

  const booking = {
    court_id: body.court_id,
    booking_date: body.booking_date,
    time_slot: body.time_slot,
    player_count: body.player_count,
    total_price: getBookingPrice(body.booking_date),
    full_name: body.full_name.trim(),
    phone: body.phone.trim(),
    email: user.email.trim().toLowerCase(),
    address: "",
    other_players: [],
    status: "pending",
  };

  const chaabi = chaabiPaymentsEnabled() ? getChaabiConfig() : null;
  if (chaabiPaymentsEnabled() && !chaabi) {
    return Response.json({ error: "Le paiement en ligne est temporairement indisponible." }, { status: 503 });
  }
  if (chaabi && booking.email.length > 64) {
    return Response.json({ error: "Votre adresse e-mail est trop longue pour le paiement en ligne." }, { status: 400 });
  }

  if (chaabiConfigured()) {
    const { error } = await supabase.rpc("expire_chaabi_checkout_holds");
    if (error) {
      console.error("Checkout hold expiry failed", error.code);
      return Response.json({ error: "Impossible de vérifier ce créneau." }, { status: 503 });
    }
  }

  const checkout = chaabi ? createChaabiCheckout(chaabi, booking) : null;
  const payment = checkout ? {
    payment_order_id: checkout.order,
    payment_expires_at: new Date(Date.now() + CHAABI_HOLD_MS).toISOString(),
  } : {};

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...booking, ...payment, booking_ref: generateRef() })
      .select("id, booking_ref")
      .single();

    if (!error) {
      if (checkout) {
        return Response.json({ success: true, checkout: { action: checkout.action, fields: checkout.fields } });
      }
      return Response.json({ success: true, bookingRef: data.booking_ref, bookingId: data.id });
    }

    if (error.code === "PT429") {
      return Response.json(
        {
          error: "Limite atteinte : vous ne pouvez réserver que 2 créneaux par semaine au maximum.",
          code: "WEEKLY_LIMIT_REACHED",
        },
        { status: 400 }
      );
    }

    if (error.code === "23505" && error.details?.startsWith("Key (booking_ref)=")) {
      continue;
    }

    if (error.code === "23505" && error.message.includes('"unique_active_booking"')) {
      return Response.json(
        {
          error: "Ce créneau vient d'être réservé par quelqu'un d'autre. Veuillez en choisir un autre.",
          code: "SLOT_TAKEN",
        },
        { status: 409 }
      );
    }

    console.error("Booking insert failed", error.code);
    break;
  }

  return Response.json({ error: "Impossible de créer la réservation." }, { status: 500 });
}
