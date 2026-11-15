# Deployment and payment operations

## Application and database

1. Use the repository's Node.js version from [`.nvmrc`](../.nvmrc). Configure environment variables from [`.env.example`](../.env.example). Use separate Supabase projects and Chaabi merchant settings for sandbox and production.
2. Follow the [database setup](../supabase/README.md) for the target Supabase project. Set the correct site URL and allowed redirect URLs in Supabase Auth for email verification and password recovery.
3. Keep `CHAABI_PAYMENTS_ENABLED=false` on production until the sandbox flow is verified. Sanity-check booking availability, verified-player booking, and staff access against the intended deployment.

## Chaabi sandbox and rollout

1. Apply [the Chaabi SQL script](../supabase/sql/03-chaabi-payments.sql) before configuring merchant credentials. If an earlier sandbox build marked authorizations paid, reapply the current script with checkout disabled. Its legacy rows return to pending review if they have no recorded reconciliation.
2. Use `CHAABI_GATEWAY_URL`, `CHAABI_CLIENT_ID`, and `CHAABI_STORE_KEY` from the same merchant environment. Set `CHAABI_SITE_URL` to the deployment's public HTTPS origin. Chaabi Payment must be able to POST directly to `/api/payments/chaabi/callback` without a deployment login or redirect. Store the merchant key server-side.
3. Enable checkout in the sandbox and test approved, declined, retried, and abandoned payments. Verify that an approved transaction reaches **POST** in Merchant Center. Record **Capture vérifiée** in RTCMO and check that the customer sees a confirmed booking.
4. Verify a void or refund in Merchant Center, record it in RTCMO, and check that the slot can be booked again. Enable production checkout after the sandbox passes.

## Staff reconciliation

In `/admin`, open **Réservations → Paiements à rapprocher**. Match the order, transaction, and amount in Merchant Center. Record **Capture vérifiée** for an order at **POST**. Staff initiate refunds and voids in Merchant Center and record the confirmed outcome on the corresponding RTCMO booking to release the slot.

The callback verifies bank authorization and requests capture. RTCMO retains authorized slots for staff review, and unpaid holds without authorization expire after 15 minutes. To disable checkout, set `CHAABI_PAYMENTS_ENABLED=false` and retain the existing merchant configuration until outstanding holds and callbacks are reconciled.
