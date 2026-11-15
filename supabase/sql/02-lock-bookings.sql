-- ============================================================
-- Lock down the bookings table.
-- After this, ONLY server code using the service role key can read/write
-- bookings. The public anon key (visible in the browser) gets no access.
-- Run in Supabase Dashboard -> SQL Editor.
-- RUN ONLY AFTER deploying the code that uses SUPABASE_SERVICE_ROLE_KEY
-- (and after adding that variable to your hosting environment).
-- ============================================================

-- 1. Remove every existing policy on bookings (names unknown, so loop).
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN (
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'bookings'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', p.policyname);
    END LOOP;
END $$;

-- 2. Enable RLS and force it. With no policies, anon/authenticated roles are denied.
--    The service role bypasses RLS, so the Next.js API routes keep working.
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. Belt and braces: revoke direct table privileges from the public roles.
REVOKE ALL ON public.bookings FROM anon, authenticated;

-- To verify afterwards:
--   select * from pg_policies where tablename = 'bookings';   -- should return 0 rows
