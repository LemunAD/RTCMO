This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Configuration

Copy `.env.example` to `.env.local` and fill in your Supabase project's URL/anon key, plus an admin password and session secret for the admin panel (see comments in the file for details).

Apply `supabase_fix_cancelled_slots.sql` in Supabase before deploying the booking API. It installs the weekly booking limit and enforces unique active slots and booking references. If it fails because of duplicate references or active slots, reconcile the affected rows before rerunning it.

## Chaabi Payment

1. In the sandbox database, apply `supabase_fix_cancelled_slots.sql`, `supabase_lock_bookings.sql`, and then `supabase_chaabi_payments.sql`. Deploy with `SUPABASE_SERVICE_ROLE_KEY` set so the server can manage the locked bookings table.
2. Set `CHAABI_GATEWAY_URL`, `CHAABI_CLIENT_ID`, and `CHAABI_STORE_KEY` for the same merchant environment. Set `CHAABI_SITE_URL` to the public HTTPS origin of the deployment. Chaabi Payment must be able to POST to `/api/payments/chaabi/callback` without a deployment login or redirect. Keep the store key server-side.
3. Set `CHAABI_PAYMENTS_ENABLED=true`. Test approved, declined, retried, and abandoned payments against the sandbox tenant before enabling production credentials. Check that approved transactions reach **POST** in Merchant Center.

Checkout uses CMI's hosted `PreAuth` flow with ver3 signatures. The bank's signed authorization updates the reservation and the callback returns `ACTION=POSTAUTH` to request capture. The return page reads the reservation status. Check Merchant Center for capture and settlement confirmation, or to handle refunds and voids. The booking screen retains the slot for 15 minutes. Availability and new bookings release expired holds, and a late authorization cannot capture them.

Leave payment disabled to keep payment at the club. When disabling an active integration, keep the merchant configuration in place until outstanding checkout holds and callbacks are reconciled.

## Admin panel

Reservations can be reviewed and cancelled at `/admin`. It's gated by `ADMIN_PASSWORD` (a single shared password, no per-user accounts) and is not linked from the public site or search-indexed — visit the URL directly.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
