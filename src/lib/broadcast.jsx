import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useVatsimPilot } from "./vatsim";
import { useAirports } from "./airports";
import { useNow } from "./format";
import { buildRoute, pointAlong, projectOntoRoute, distNm, unwrapNear } from "./geo";

const BroadcastContext = createContext(null);
const MINUTE = 60_000;

const isDone = (a) => Boolean(a?.on_blocks || a?.completed_at || a?.skipped);

// ?flight=WF2601&progress=0.55 pins a sector (and optionally a simulated
// progress) so the overlays can be previewed before/between real flights.
function readPreview() {
  const q = new URLSearchParams(window.location.search);
  const flight = q.get("flight")?.toUpperCase() || null;
  const progress = q.has("progress") ? Math.min(1, Math.max(0, Number(q.get("progress")))) : null;
  return flight || progress != null ? { flight, progress } : null;
}

// Mirrors the dashboard's currentSector(): the sector the live aircraft has
// filed on VATSIM, else one stamped off-blocks, else whichever the clock says
// is airborne. Adds "next" as the first sector after the last one flown.
function pickSectors({ sectors, actuals, pilot, overrideId, previewFlight, now }) {
  const sorted = [...sectors].sort((a, b) => new Date(a.std) - new Date(b.std));
  const pinned = previewFlight
    ? sorted.findIndex((s) => s.flight === previewFlight)
    : overrideId
      ? sorted.findIndex((s) => s.id === overrideId)
      : -1;
  if (pinned !== -1) {
    return { current: sorted[pinned], next: sorted[pinned + 1] ?? null, previous: sorted[pinned - 1] ?? null, active: sorted[pinned] };
  }

  const open = (s) => !isDone(actuals[s.id]);
  let current = null;

  const fp = pilot?.flight_plan;
  if (fp?.departure && fp?.arrival) {
    const filed = sorted.filter((s) => open(s) && s.dep === fp.departure && s.arr === fp.arrival);
    if (filed.length) {
      current = filed.reduce((a, b) =>
        Math.abs(new Date(a.std) - now) <= Math.abs(new Date(b.std) - now) ? a : b
      );
    }
  }
  current ??= sorted.find((s) => actuals[s.id]?.off_blocks && open(s)) ?? null;
  current ??= sorted.find((s) => open(s) && new Date(s.std) <= now && now <= new Date(s.sta)) ?? null;

  let next;
  if (current) {
    next = sorted[sorted.indexOf(current) + 1] ?? null;
  } else {
    const lastDone = sorted.findLastIndex((s) => isDone(actuals[s.id]));
    next =
      lastDone >= 0
        ? sorted.slice(lastDone + 1).find(open) ?? null
        : sorted.find((s) => open(s) && new Date(s.sta) > now) ?? null;
  }
  const anchor = current ?? next;
  const previous = anchor ? sorted[sorted.indexOf(anchor) - 1] ?? null : sorted.at(-1) ?? null;
  return { current, next, previous, active: anchor };
}

export async function setBroadcastOverride({ sectorId, autoMode, scene }) {
  const patch = { id: 1, updated_at: new Date().toISOString() };
  if (sectorId !== undefined) patch.override_sector_id = sectorId;
  if (autoMode !== undefined) patch.auto_mode = autoMode;
  if (scene !== undefined) patch.scene = scene;
  const { error } = await supabase.from("broadcast_state").upsert(patch);
  if (error) throw error;
}

export function BroadcastProvider({ children }) {
  const [data, setData] = useState({
    loading: true,
    sectors: [],
    actuals: {},
    crew: {},
    briefings: {},
    state: { auto_mode: true, override_sector_id: null, scene: "overlay" },
    config: { callsign: "QFA100", aircraft: "B738" },
  });
  const preview = useMemo(readPreview, []);
  const now = useNow(15_000);

  const load = useCallback(async () => {
    const [sectors, actuals, crew, briefings, state, config] = await Promise.all([
      supabase.from("sectors").select("*").order("std"),
      supabase.from("sector_actuals").select("*"),
      supabase.from("broadcast_crew").select("sector_id, duty, display_name"),
      supabase.from("broadcast_briefing").select("sector_id, wf_notes, ofp"),
      supabase.from("broadcast_state").select("*").eq("id", 1).maybeSingle(),
      supabase.from("broadcast_config").select("*").maybeSingle(),
    ]);

    const byId = (rows) => Object.fromEntries((rows ?? []).map((r) => [r.sector_id, r]));
    const crewBySector = {};
    const order = ["Captain", "First Officer", "Relief Pilot", "Observer"];
    for (const row of [...(crew.data ?? [])].sort((a, b) => order.indexOf(a.duty) - order.indexOf(b.duty))) {
      (crewBySector[row.sector_id] ??= []).push(row);
    }

    setData((prev) => ({
      loading: false,
      sectors: sectors.data ?? prev.sectors,
      actuals: actuals.data ? byId(actuals.data) : prev.actuals,
      crew: crew.data ? crewBySector : prev.crew,
      briefings: briefings.data ? byId(briefings.data) : prev.briefings,
      state: state.data ?? prev.state,
      config: config.data ?? prev.config,
    }));
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("broadcast")
      .on("postgres_changes", { event: "*", schema: "public", table: "sectors" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sector_actuals" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "broadcast_state" }, load)
      .subscribe();
    // The crew/briefing/config views can't be published to Realtime.
    const id = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(id);
    };
  }, [load]);

  const pilot = useVatsimPilot(preview ? null : data.config.callsign);

  const picked = useMemo(
    () =>
      pickSectors({
        sectors: data.sectors,
        actuals: data.actuals,
        pilot,
        overrideId: data.state.auto_mode ? null : data.state.override_sector_id,
        previewFlight: preview?.flight,
        now,
      }),
    [data.sectors, data.actuals, data.state, pilot, preview, now]
  );

  const value = useMemo(() => ({ ...data, ...picked, pilot, preview, refresh: load }), [data, picked, pilot, preview, load]);
  return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>;
}

export const useBroadcast = () => useContext(BroadcastContext);

// Everything a graphic needs about one sector, derived in one place so the
// status bar, map and briefing screens never disagree.
export function useSectorView(sector) {
  const ctx = useBroadcast();
  const lookup = useAirports();
  const now = useNow(1000);

  const dep = sector ? lookup(sector.dep) : null;
  const arr = sector ? lookup(sector.arr) : null;
  const briefing = sector ? ctx.briefings[sector.id] : null;
  const ofp = briefing?.ofp && briefing.ofp.dep === sector?.dep && briefing.ofp.arr === sector?.arr ? briefing.ofp : null;

  // Keyed on the navlog's contents: the data reloads every 30s with fresh
  // objects, and a new route identity would restart every map animation.
  const navKey = ofp?.navlog ? JSON.stringify(ofp.navlog) : "";
  const route = useMemo(
    () => (dep && arr ? buildRoute([dep.lon, dep.lat], [arr.lon, arr.lat], ofp?.navlog) : null),
    [dep?.icao, arr?.icao, navKey]
  );

  if (!sector) return null;

  const actual = ctx.actuals[sector.id] ?? null;
  const std = new Date(sector.std).getTime();
  const sta = new Date(sector.sta).getTime();
  const block = sta - std;
  const offBlocks = actual?.off_blocks ? new Date(actual.off_blocks).getTime() : null;
  const onBlocks = actual?.on_blocks ? new Date(actual.on_blocks).getTime() : null;

  const fp = ctx.pilot?.flight_plan;
  const isCurrent = ctx.current?.id === sector.id;
  const pilot =
    isCurrent && ctx.pilot && (!fp?.departure || (fp.departure === sector.dep && fp.arrival === sector.arr))
      ? ctx.pilot
      : null;
  const previewProgress = ctx.preview?.progress != null && isCurrent ? ctx.preview.progress : null;

  const near = (apt, p) => apt && distNm([apt.lon, apt.lat], [p.longitude, p.latitude]) < 8;

  let status;
  let progress = 0;
  if (previewProgress != null) {
    progress = previewProgress;
    status = progress <= 0 ? "BOARDING" : progress >= 1 ? "ARRIVED" : "ENROUTE";
  } else if (isDone(actual)) {
    progress = 1;
    status = "ARRIVED";
  } else if (pilot) {
    if (pilot.groundspeed < 40 && near(arr, pilot)) {
      progress = 1;
      status = "ARRIVED";
    } else if (pilot.groundspeed < 40 && (near(dep, pilot) || !offBlocks)) {
      status = offBlocks ? "TAXIING" : "BOARDING";
    } else {
      progress = route ? projectOntoRoute(route, [pilot.longitude, pilot.latitude]) : 0;
      status = "ENROUTE";
    }
  } else if (offBlocks) {
    progress = Math.min(0.99, Math.max(0, (now - offBlocks) / block));
    status = "ENROUTE";
  } else {
    status = now >= std - 45 * MINUTE ? "BOARDING" : "SCHEDULED";
  }

  const planned = route?.total ?? null;
  let eta = sta;
  if (status === "ARRIVED") eta = onBlocks ?? (previewProgress != null ? now : sta);
  else if (previewProgress != null) eta = now + (1 - progress) * block;
  else if (pilot && pilot.groundspeed >= 80 && planned) eta = now + (((1 - progress) * planned) / pilot.groundspeed) * 3_600_000;
  else if (offBlocks) eta = offBlocks + block;

  const enroute = status === "ENROUTE" || status === "TAXIING";
  const elapsed = enroute ? (offBlocks && previewProgress == null ? now - offBlocks : progress * block) : 0;
  const remaining = status === "ARRIVED" ? 0 : enroute ? Math.max(0, eta - now) : block;

  const along = route ? pointAlong(route, progress) : null;
  const livePos = pilot && route ? unwrapNear([pilot.longitude, pilot.latitude], route.coords[0]) : null;

  let alt = null;
  let gs = null;
  let hdg = null;
  if (pilot) {
    alt = pilot.altitude;
    gs = pilot.groundspeed;
    hdg = pilot.heading;
  } else if (previewProgress != null && enroute) {
    alt = Number(ofp?.cruise) || 36000;
    gs = planned ? Math.round(planned / (block / 3_600_000)) : null;
    hdg = along ? Math.round(along.bearing) : null;
  }

  return {
    sector,
    dep,
    arr,
    route,
    ofp,
    crew: ctx.crew[sector.id] ?? [],
    notes: briefing?.wf_notes || sector.notes || "",
    aircraft: ofp?.acft || ctx.config.aircraft,
    reg: ofp?.reg || null,
    std,
    sta,
    block,
    departsAt: offBlocks ?? std,
    eta,
    elapsed,
    remaining,
    progress,
    status,
    live: Boolean(pilot),
    preview: previewProgress != null,
    position: livePos ?? along?.pos ?? null,
    heading: pilot ? pilot.heading : along?.bearing ?? 0,
    alt,
    gs,
    hdg,
    distanceNm: planned,
    remainingNm: planned != null ? (1 - progress) * planned : null,
    untilDeparture: std - now,
    // The moment the shown plane position corresponds to, for day/night
    // shading: now while really flying, otherwise projected from departure.
    sunTime:
      status === "ARRIVED" ? eta : enroute && previewProgress == null ? now : (offBlocks ?? std) + progress * block,
  };
}
