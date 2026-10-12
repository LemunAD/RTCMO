-- ============================================================
-- Migration: Allow Re-booking of Cancelled Slots
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Dynamically drop any table-level unique constraints on bookings
--    so cancelled rows don't block new reservations for the same slot.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass
          AND contype = 'u'
    ) LOOP
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Drop any existing indexes if they exist
DROP INDEX IF EXISTS unique_active_booking;
DROP INDEX IF EXISTS bookings_court_id_booking_date_time_slot_key;
DROP INDEX IF EXISTS bookings_court_slot_idx;

-- 3. Create a partial unique index:
--    Ensures that only ONE active ('pending' or 'paid') booking can exist per court/date/slot.
--    Cancelled bookings will no longer trigger uniqueness conflicts!
CREATE UNIQUE INDEX unique_active_booking
ON bookings (court_id, booking_date, time_slot)
WHERE status != 'cancelled';
