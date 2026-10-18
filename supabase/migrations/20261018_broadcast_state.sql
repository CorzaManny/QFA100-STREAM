-- QFA100 broadcast overlay support.
--
-- The OBS Browser Sources load these pages anonymously (publishable/anon
-- key, no login), but every existing EFB table (sectors, sector_actuals,
-- roster, profiles, briefings) is RLS-locked to authenticated crew via
-- is_member()/can_edit()/etc. Rather than loosening those policies (which
-- would expose crew accounts, VATSIM CIDs, internal handover notes, etc to
-- anyone who opens the overlay URLs), this migration:
--   1. Adds a broadcast_state table (publicly readable, writable only by
--      admin/dispatcher/operations) that drives which sector/scene is live.
--   2. Grants the public a direct, anonymous read of `sectors` and
--      `sector_actuals` - both already free of anything sensitive, and
--      exactly what a flight-tracker overlay is meant to show.
--   3. Exposes crew names and the public-facing sector note through two
--      narrow views (broadcast_crew, broadcast_briefing) instead of the
--      underlying roster/profiles/briefings tables, so nothing else on
--      those rows (role, vatsim_cid, handover, ofp, etc) is exposed.

create table if not exists public.broadcast_state (
  id integer primary key default 1 check (id = 1),
  auto_mode boolean not null default true,
  override_sector_id uuid references public.sectors (id),
  scene text not null default 'overlay'
    check (scene in ('overlay', 'map', 'next', 'turnaround', 'compact')),
  updated_at timestamptz not null default now()
);

insert into public.broadcast_state (id)
values (1)
on conflict (id) do nothing;

alter table public.broadcast_state enable row level security;

create policy "broadcast_state readable by anyone"
  on public.broadcast_state
  for select
  using (true);

create policy "broadcast_state writable by operations roles"
  on public.broadcast_state
  for all
  using (public.can_edit())
  with check (public.can_edit());

-- Public read of the schedule and live status (no sensitive columns here).
create policy "sectors readable by anyone"
  on public.sectors
  for select
  to anon
  using (true);

create policy "sector_actuals readable by anyone"
  on public.sector_actuals
  for select
  to anon
  using (true);

-- Narrow, owner-scoped views so anon callers never touch roster/profiles
-- or briefings directly. Views run with the privileges of their owner
-- (the migration role, which bypasses RLS) rather than the calling anon
-- role, so these stay readable without granting anon any new table access.
create or replace view public.broadcast_crew as
  select r.sector_id, r.duty, p.display_name
  from public.roster r
  join public.profiles p on p.id = r.user_id
  where public.roster_published();

create or replace view public.broadcast_briefing as
  select sector_id, wf_notes
  from public.briefings
  where coalesce(wf_notes, '') <> '';

grant select on public.broadcast_crew to anon, authenticated;
grant select on public.broadcast_briefing to anon, authenticated;

-- Supabase Realtime: none of these tables were in the publication yet.
alter publication supabase_realtime add table public.broadcast_state;
alter publication supabase_realtime add table public.sectors;
alter publication supabase_realtime add table public.sector_actuals;
