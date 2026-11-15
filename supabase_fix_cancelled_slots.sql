-- Apply in Supabase before deploying the booking API changes.
BEGIN;

-- Remove only the previous unconditional court/date/slot uniqueness.
DO $$
DECLARE
    slot_constraint record;
BEGIN
    FOR slot_constraint IN
        SELECT c.conname
        FROM pg_constraint AS c
        WHERE c.conrelid = 'public.bookings'::regclass
          AND c.contype = 'u'
          AND (
              SELECT array_agg(a.attname::text ORDER BY a.attname)
              FROM pg_attribute AS a
              WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['booking_date', 'court_id', 'time_slot']
    LOOP
        EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', slot_constraint.conname);
    END LOOP;
END;
$$;

DROP INDEX IF EXISTS public.bookings_court_id_booking_date_time_slot_key;
DROP INDEX IF EXISTS public.bookings_court_slot_idx;
DROP INDEX IF EXISTS public.unique_active_booking;

CREATE UNIQUE INDEX unique_active_booking
ON public.bookings (court_id, booking_date, time_slot)
WHERE status IS DISTINCT FROM 'cancelled';

-- Restore reference uniqueness for databases that ran the previous script.
-- An existing duplicate aborts the transaction so it can be resolved first.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_booking_ref
ON public.bookings (booking_ref);

CREATE OR REPLACE FUNCTION public.enforce_booking_weekly_quota()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    week_start date := date_trunc('week', NEW.booking_date::date::timestamp)::date;
    booking_email text := lower(btrim(NEW.email));
    phone_digits text := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
BEGIN
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Serialize inserts for this week. Either the email or phone may match,
    -- so locking by the pair could let overlapping identities race.
    PERFORM pg_advisory_xact_lock(1381253967, week_start - DATE '2000-01-01');

    IF (
        SELECT count(*)
        FROM public.bookings AS b
        WHERE b.status IS DISTINCT FROM 'cancelled'
          AND b.booking_date::date >= week_start
          AND b.booking_date::date < week_start + 7
          AND (
              lower(btrim(b.email)) = booking_email
              OR (
                  length(phone_digits) >= 9
                  AND right(regexp_replace(b.phone, '[^0-9]', '', 'g'), 9) = right(phone_digits, 9)
              )
          )
    ) >= 2 THEN
        RAISE SQLSTATE 'PT429' USING MESSAGE = 'Weekly booking limit reached';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_weekly_quota ON public.bookings;
CREATE TRIGGER enforce_booking_weekly_quota
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_weekly_quota();

COMMIT;
