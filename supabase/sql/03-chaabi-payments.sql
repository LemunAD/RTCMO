-- Install after 01-booking-constraints.sql and 02-lock-bookings.sql.
BEGIN;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payment_order_id text,
    ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS payment_transaction_id text,
    ADD COLUMN IF NOT EXISTS payment_resolution text,
    ADD COLUMN IF NOT EXISTS payment_reconciled_at timestamptz;

DROP TRIGGER IF EXISTS guard_chaabi_booking ON public.bookings;

-- Earlier sandbox builds recorded authorization as paid without checking capture.
UPDATE public.bookings
SET status = 'pending'
WHERE status = 'paid' AND payment_transaction_id IS NOT NULL AND payment_resolution IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_order_id
ON public.bookings (payment_order_id) WHERE payment_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_transaction_id
ON public.bookings (payment_transaction_id) WHERE payment_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_payment_expiry
ON public.bookings (payment_expires_at) WHERE status = 'pending' AND payment_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_chaabi_booking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.payment_transaction_id IS NOT NULL THEN
            RAISE SQLSTATE 'PT409' USING MESSAGE = 'Cette réservation en ligne doit être rapprochée dans le portail marchand.';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.payment_transaction_id IS NOT NULL
       AND NEW.status IS DISTINCT FROM OLD.status
       AND (
           NEW.payment_resolution IS NOT DISTINCT FROM OLD.payment_resolution
           OR NEW.payment_reconciled_at IS NULL
           OR NOT COALESCE(
               (NEW.status = 'paid' AND NEW.payment_resolution = 'captured')
               OR (NEW.status = 'cancelled' AND NEW.payment_resolution IN ('refunded', 'voided')),
               false
           )
       ) THEN
        RAISE SQLSTATE 'PT409' USING MESSAGE = 'Cette réservation en ligne doit être rapprochée dans le portail marchand.';
    END IF;

    IF NEW.payment_order_id IS NOT NULL AND NEW.status = 'paid'
       AND (NEW.payment_transaction_id IS NULL OR NEW.payment_resolution IS DISTINCT FROM 'captured') THEN
        RAISE SQLSTATE 'PT409' USING MESSAGE = 'Confirmez la capture dans le portail marchand avant de marquer la réservation payée.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER guard_chaabi_booking
BEFORE UPDATE OF status OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_chaabi_booking();

CREATE OR REPLACE FUNCTION public.expire_chaabi_checkout_holds()
RETURNS void
LANGUAGE sql
SET search_path = ''
AS $$
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE status = 'pending'
      AND payment_order_id IS NOT NULL
      AND payment_transaction_id IS NULL
      AND payment_expires_at <= statement_timestamp();
$$;

DROP FUNCTION IF EXISTS public.record_chaabi_authorization(text, integer, text);
CREATE OR REPLACE FUNCTION public.record_chaabi_authorization(
    order_id text, amount_cents integer, transaction_id text
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    reservation public.bookings%ROWTYPE;
BEGIN
    SELECT * INTO reservation
    FROM public.bookings
    WHERE payment_order_id = order_id
    FOR UPDATE;

    IF NOT FOUND OR (reservation.total_price * 100) IS DISTINCT FROM amount_cents
       OR transaction_id IS NULL OR length(transaction_id) NOT BETWEEN 1 AND 64 THEN
        RETURN 'FAILURE';
    END IF;

    IF reservation.payment_transaction_id IS NOT NULL THEN
        IF reservation.payment_transaction_id IS DISTINCT FROM transaction_id THEN
            RETURN 'FAILURE';
        END IF;
        IF reservation.payment_resolution IS NOT NULL THEN
            RETURN 'APPROVED';
        END IF;
        RETURN 'ACTION=POSTAUTH';
    END IF;

    IF reservation.status IS DISTINCT FROM 'pending'
       OR reservation.payment_expires_at IS NULL
       OR reservation.payment_expires_at <= clock_timestamp()
       OR ((reservation.booking_date::date + reservation.time_slot::time)
           AT TIME ZONE 'Africa/Casablanca') <= clock_timestamp() THEN
        RETURN 'FAILURE';
    END IF;

    UPDATE public.bookings
    SET payment_transaction_id = transaction_id
    WHERE id = reservation.id;

    RETURN 'ACTION=POSTAUTH';
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_chaabi_payment(
    booking_id text, order_id text, transaction_id text, resolution text
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    reservation public.bookings%ROWTYPE;
BEGIN
    IF resolution IS NULL OR resolution NOT IN ('captured', 'refunded', 'voided') THEN
        RETURN false;
    END IF;

    SELECT * INTO reservation
    FROM public.bookings
    WHERE payment_order_id = order_id AND id::text = booking_id
    FOR UPDATE;

    IF NOT FOUND OR reservation.payment_transaction_id IS NULL
       OR reservation.payment_transaction_id IS DISTINCT FROM transaction_id THEN
        RETURN false;
    END IF;

    IF reservation.payment_resolution = resolution THEN
        RETURN true;
    END IF;

    IF reservation.status = 'pending' AND resolution = 'captured' THEN
        UPDATE public.bookings
        SET status = 'paid', payment_resolution = resolution, payment_reconciled_at = clock_timestamp()
        WHERE id = reservation.id;
        RETURN true;
    END IF;

    IF (reservation.status = 'pending' AND resolution IN ('voided', 'refunded'))
       OR (reservation.status = 'paid' AND resolution = 'refunded') THEN
        UPDATE public.bookings
        SET status = 'cancelled', payment_resolution = resolution, payment_reconciled_at = clock_timestamp()
        WHERE id = reservation.id;
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_chaabi_checkout_holds() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_chaabi_authorization(text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_chaabi_payment(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_chaabi_checkout_holds() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_chaabi_authorization(text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_chaabi_payment(text, text, text, text) TO service_role;

COMMIT;
