-- Install after supabase_fix_cancelled_slots.sql and before enabling checkout.
BEGIN;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payment_order_id text,
    ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS payment_transaction_id text;

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

    IF OLD.payment_transaction_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE SQLSTATE 'PT409' USING MESSAGE = 'Cette réservation en ligne doit être rapprochée dans le portail marchand.';
    END IF;

    IF NEW.payment_order_id IS NOT NULL AND NEW.status = 'paid' AND NEW.payment_transaction_id IS NULL THEN
        RAISE SQLSTATE 'PT409' USING MESSAGE = 'Le paiement en ligne doit être confirmé par Chaabi Payment.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_chaabi_booking ON public.bookings;
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
      AND payment_expires_at <= statement_timestamp();
$$;

CREATE OR REPLACE FUNCTION public.record_chaabi_authorization(
    order_id text, amount_cents integer, transaction_id text
)
RETURNS boolean
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
        RETURN false;
    END IF;

    -- A retry for the same authorization receives the same capture instruction.
    IF reservation.status = 'paid' THEN
        RETURN reservation.payment_transaction_id IS NOT DISTINCT FROM transaction_id;
    END IF;

    IF reservation.status IS DISTINCT FROM 'pending'
       OR reservation.payment_expires_at IS NULL
       OR reservation.payment_expires_at <= clock_timestamp()
       OR ((reservation.booking_date::date + reservation.time_slot::time)
           AT TIME ZONE 'Africa/Casablanca') <= clock_timestamp() THEN
        RETURN false;
    END IF;

    UPDATE public.bookings
    SET status = 'paid', payment_transaction_id = transaction_id
    WHERE id = reservation.id;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_chaabi_checkout_holds() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_chaabi_authorization(text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_chaabi_checkout_holds() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_chaabi_authorization(text, integer, text) TO service_role;

COMMIT;
