-- Run this once in the Supabase SQL editor for this project (Dashboard ->
-- SQL Editor -> New query -> paste -> Run). It's written to be safe to
-- run more than once.

alter table public.bookings
  add column if not exists status text not null default 'pending',
  add column if not exists other_players text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_status_check check (status in ('pending', 'paid', 'cancelled'));
  end if;
end $$;

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_booking_date_idx on public.bookings (booking_date);
