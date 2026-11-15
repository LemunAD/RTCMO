# RTCMO Padel

Court reservations for the Royal Tennis Club de Mohammédia. Players can book and manage court time. Staff manage bookings and reconcile Chaabi Payment transactions from the admin panel.

## Local development

Use Node.js 24 and npm.

1. Run `npm ci`.
2. Copy [`.env.example`](.env.example) to `.env.local` and set the Supabase URL, anon key, service-role key, and admin credentials.
3. Follow the [database setup](supabase/README.md) for a development Supabase project. Leave Chaabi checkout disabled unless you are testing with sandbox credentials.
4. Run `npm run dev` and open [localhost:3000](http://localhost:3000). The staff panel is at [localhost:3000/admin](http://localhost:3000/admin).

## Repository structure

| Path | Contents |
| --- | --- |
| [`src/app/`](src/app) | Next.js pages, layouts, and API routes |
| [`src/features/`](src/features) | Booking, player self-service, admin, and payment code |
| [`src/lib/`](src/lib) | Shared Supabase clients, authentication, and HTTP utilities |
| [`public/`](public) | Images served by the app |
| [`assets/`](assets) | Original design assets |
| [`supabase/sql/`](supabase/sql) | Ordered SQL scripts for the existing bookings schema |
| [`docs/`](docs) | Deployment and operations notes |

## Checks

Run `npm run lint`, `npm run typecheck`, `npm run build`, then `npm run test:smoke`. The smoke test starts the production build locally and checks key routes, authentication gates, and public assets with placeholder credentials.

See the [deployment guide](docs/deployment.md) for environment setup, Chaabi sandbox testing, and staff payment reconciliation.
