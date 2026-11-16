# RTCMO Padel

RTCMO Padel is the French-language court booking site for the Royal Tennis Club de Mohammédia. Players reserve one of three padel courts. Club staff manage the schedule, bookings, and payments.

## How a booking works

1. **Sign in.** A player creates an account and verifies their email, or signs in with an existing verified account.
2. **Choose a court and time.** The calendar shows available 90-minute slots in a daily or weekly view. Players can book up to 14 days ahead and hold up to two active bookings per calendar week, Monday through Sunday.
3. **Review and confirm.** The player chooses singles or doubles and checks their contact information. The price is per court in either format. It costs **200 MAD on weekdays** and **240 MAD on weekends**.
4. **Manage the reservation.** Players can cancel an unpaid booking from the confirmation screen or **Espace Joueur** any time before play starts. They can also look up a reservation using its reference and the phone number used to book it. For paid bookings or payments under review, players contact the club.

## Payments and staff operations

Staff sign in separately at `/admin` to see the court schedule, search reservations, and manage booking statuses. RTCMO supports two payment modes.

- **Pay at the club** is the default. Confirming the booking reserves the slot and gives the player a reference. Staff mark the reservation paid after collecting payment.
- **Pay online with Chaabi Payment** sends the player to Chaabi’s hosted checkout. RTCMO holds the slot for 15 minutes while waiting for authorization. A verified authorization keeps the slot reserved and requests capture. Staff verify capture in Merchant Center, then record it in RTCMO to confirm payment. If staff confirm a refund or void in Merchant Center, recording it in RTCMO releases the slot.

See the [deployment and payment guide](docs/deployment.md) for sandbox setup and the staff reconciliation steps.

## How the app is built

Next.js serves the pages and booking API. Supabase Auth handles player accounts, and PostgreSQL in Supabase stores bookings. The booking API checks the player’s session and calculates the price. The database prevents two active reservations for the same court and time and enforces the weekly limit.

| If you need to work on… | Start here |
| --- | --- |
| A page or API endpoint | [`src/app/`](src/app) |
| The booking flow, calendar, or pricing | [`src/features/booking/`](src/features/booking) |
| Player lookup, history, or cancellation | [`src/features/booking-management/`](src/features/booking-management) |
| The staff dashboard and booking tools | [`src/features/admin/`](src/features/admin) |
| Chaabi checkout and callback signing | [`src/features/payments/`](src/features/payments), [payment API routes](src/app/api/payments/chaabi) |
| Shared authentication and Supabase clients | [`src/lib/`](src/lib) |
| Database setup and SQL scripts | [`supabase/`](supabase) |

## Run locally

1. Use **Node.js 24** and run `npm ci`.
2. Copy [`.env.example`](.env.example) to `.env.local`. Fill in the development Supabase URL, anon key, service-role key, and admin credentials. Leave `CHAABI_PAYMENTS_ENABLED=false` for pay-at-club development.
3. Prepare the development database using the [Supabase setup guide](supabase/README.md). The SQL scripts require the existing `bookings` schema. Get that schema from the project owner if you’re starting with an empty database.
4. Run `npm run dev`. Open [localhost:3000](http://localhost:3000) for the booking site or [localhost:3000/admin](http://localhost:3000/admin) for the staff panel.

## Verify changes locally

```sh
npm run lint
npm run typecheck
npm run build
npm run test:smoke
```

The smoke test starts the production build locally and checks key pages, protected API routes, and public assets with placeholder credentials. Use the Chaabi sandbox to verify checkout and capture.
