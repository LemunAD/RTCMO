# Supabase database setup

These scripts update an existing `public.bookings` table. The original table definition is managed in Supabase and is absent from the repository. For a new development or sandbox project, get the current schema from the project owner and restore it before applying these scripts. Start with a schema that already has the `status` and `other_players` columns.

Apply the scripts in order using the SQL Editor for the intended project.

| Order | Script | Purpose |
| --- | --- | --- |
| 1 | [Booking constraints](sql/01-booking-constraints.sql) | Uniqueness for booking references and active slots, plus the weekly booking quota |
| 2 | [Lock bookings](sql/02-lock-bookings.sql) | Restrict table access to the service role |
| 3 | [Chaabi payments](sql/03-chaabi-payments.sql) | Checkout holds, authorization, and staff reconciliation |

Before step 2, configure the deployment with `SUPABASE_SERVICE_ROLE_KEY` and verify a server-side booking against the intended project. Step 2 removes existing `bookings` policies and revokes public access. If step 1 fails because of duplicate references or active slots, reconcile the affected rows before rerunning it. Apply step 3 before setting Chaabi credentials or enabling checkout.

Keep live database credentials in the deployment environment. See the [deployment guide](../docs/deployment.md) for rollout checks.
