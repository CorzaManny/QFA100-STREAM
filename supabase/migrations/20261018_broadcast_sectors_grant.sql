-- The anon role had no table privilege on sectors, so the
-- "sectors readable by anyone" policy alone wasn't enough for the
-- overlays. Read-only; the schedule holds nothing sensitive.
grant select on public.sectors to anon;
