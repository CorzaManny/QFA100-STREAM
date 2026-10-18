-- Expose the broadcast-safe parts of each sector's SimBrief OFP (aircraft,
-- registration, runways, cruise level, pax, navlog waypoints) and the team
-- callsign/aircraft from Admin -> SimBrief, so the overlays can draw the
-- planned route and track the right VATSIM callsign. Fuel figures, weights
-- and the OFP PDF link stay private.

create or replace view public.broadcast_briefing as
  select
    sector_id,
    wf_notes,
    case when ofp is null then null else jsonb_build_object(
      'dep', ofp -> 'dep',
      'arr', ofp -> 'arr',
      'acft', ofp -> 'acft',
      'reg', ofp -> 'reg',
      'cruise', ofp -> 'cruise',
      'depRwy', ofp -> 'depRwy',
      'arrRwy', ofp -> 'arrRwy',
      'pax', ofp -> 'pax',
      'ete', ofp -> 'ete',
      'navlog', ofp -> 'navlog'
    ) end as ofp
  from public.briefings
  where coalesce(wf_notes, '') <> '' or ofp is not null;

create or replace view public.broadcast_config as
  select
    coalesce(nullif(trim(rules ->> 'callsign'), ''), 'QFA100') as callsign,
    coalesce(nullif(trim(rules ->> 'aircraft'), ''), 'B738') as aircraft
  from public.settings
  where id = 1;

grant select on public.broadcast_briefing to anon, authenticated;
grant select on public.broadcast_config to anon, authenticated;
