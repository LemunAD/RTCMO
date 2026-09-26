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

Also run the SQL migration(s) in `supabase/migrations/` once against your Supabase project (Dashboard -> SQL Editor -> paste the file's contents -> Run) — they add columns the admin dashboard depends on (booking `status`, teammate `other_players`).

## Admin panel

Reservations can be reviewed at `/admin`: a stats dashboard (bookings and paid revenue for a selected month, plus a per-court breakdown) sits above an Upcoming/Past reservations list. Each booking's status (pending/paid/cancelled) is editable inline — marking a booking "cancelled" keeps it in the list instead of deleting it. It's gated by `ADMIN_PASSWORD` (a single shared password, no per-user accounts) and is not linked from the public site or search-indexed — visit the URL directly.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
