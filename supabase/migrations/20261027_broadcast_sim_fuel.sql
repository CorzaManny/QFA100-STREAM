-- More of the EFB's data for the overlays.
--
-- Three things the broadcast was not reading yet:
--   1. The simulator's own report (sim_status, written by the vPilot bridge
--      every couple of seconds). It knows the phase of flight, IAS, Mach,
--      vertical speed, fuel on board, the FMC's ETA and the block times -
--      none of which the 15-second public VATSIM feed carries.
--   2. The planning side of each SimBrief OFP: fuel, payload, the alternate
--      and the cost index. Weights and fuel are not sensitive for a charity
--      flight sim event, and they are the numbers an audience asks about.
--      The OFP PDF link still stays private.
--   3. The forecasts the dashboard already caches (taf_cache), so the
--      briefing screens can show a TAF beside the METAR.
--
-- Still private, as before: accounts, VATSIM CIDs, handover notes, the tech
-- log, ops chat, and anything that identifies a person beyond the crew names
-- the published roster already shows.

create or replace view public.broadcast_briefing as
  select
    sector_id,
    wf_notes,
    case when ofp is null then null else jsonb_build_object(
      'dep', ofp -> 'dep',
      'arr', ofp -> 'arr',
      'altn', ofp -> 'altn',
      'acft', ofp -> 'acft',
      'reg', ofp -> 'reg',
      'cruise', ofp -> 'cruise',
      'costIndex', ofp -> 'costIndex',
      'depRwy', ofp -> 'depRwy',
      'arrRwy', ofp -> 'arrRwy',
      'route', ofp -> 'route',
      'pax', ofp -> 'pax',
      'cargo', ofp -> 'cargo',
      'payload', ofp -> 'payload',
      'blockFuel', ofp -> 'blockFuel',
      'tripFuel', ofp -> 'tripFuel',
      'taxiFuel', ofp -> 'taxiFuel',
      'altnFuel', ofp -> 'altnFuel',
      'reserveFuel', ofp -> 'reserveFuel',
      'zfw', ofp -> 'zfw',
      'tow', ofp -> 'tow',
      'ldw', ofp -> 'ldw',
      'maxTow', ofp -> 'maxTow',
      'units', ofp -> 'units',
      'ete', ofp -> 'ete',
      'schedOut', ofp -> 'schedOut',
      'generated', ofp -> 'generated',
      'navlog', ofp -> 'navlog'
    ) end as ofp
  from public.briefings
  where coalesce(wf_notes, '') <> '' or ofp is not null;

-- Callsign and aircraft as before, plus the two timing rules the overlays
-- need to work out how the programme is running (turnaround and taxi-in).
create or replace view public.broadcast_config as
  select
    coalesce(nullif(trim(rules ->> 'callsign'), ''), 'QFA100') as callsign,
    coalesce(nullif(trim(rules ->> 'aircraft'), ''), 'B738') as aircraft,
    coalesce((rules ->> 'turnaroundMinutes')::int, 45) as turnaround_minutes,
    coalesce((rules ->> 'taxiInMinutes')::int, 5) as taxi_in_minutes
  from public.settings
  where id = 1;

-- The simulator's own report, exactly as the bridge publishes it
-- (see the dashboard's docs/API.md). One row, or none when nothing has
-- reported yet; updated_at is what decides whether it is still live.
create or replace view public.broadcast_sim as
  select status, updated_at
  from public.sim_status
  where id = 1;

-- Forecasts the dashboard has already fetched. Plain public weather.
create or replace view public.broadcast_taf as
  select icao, raw, fetched_at
  from public.taf_cache;

grant select on public.broadcast_briefing to anon, authenticated;
grant select on public.broadcast_config to anon, authenticated;
grant select on public.broadcast_sim to anon, authenticated;
grant select on public.broadcast_taf to anon, authenticated;
