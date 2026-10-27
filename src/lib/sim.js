import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// The simulator's own report, written to the EFB by the vPilot bridge every
// couple of seconds (the dashboard's docs/API.md describes the document).
// It carries what the public VATSIM feed cannot: the phase of flight, IAS,
// Mach, vertical speed, fuel on board, the FMC's own ETA and the block times.
// Read through the broadcast_sim view, polled fast enough to animate.
const POLL_MS = 2000;
// A report older than this is a stale snapshot, not a live aeroplane - the
// same two minutes the dashboard allows.
const STALE_MS = 2 * 60_000;

const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
const time = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? Date.parse(v) : null);
const code = (v) => (typeof v === "string" ? v.trim().toUpperCase().slice(0, 4) : "");

const PHASES = [
  "PREFLIGHT", "TAXI_OUT", "TAKEOFF", "CLIMB", "CRUISE", "DESCENT", "APPROACH", "LANDING", "TAXI_IN", "ARRIVED",
];

// The stored document into the shape the overlays use. null when there is no
// usable position in it.
export function parseSimStatus(d, at = Date.now()) {
  const p = d?.position ?? {};
  const stampedAt = time(d?.updatedAt);
  const lat = num(p.latitude);
  const lon = num(p.longitude);
  if (stampedAt == null || lat == null || lon == null) return null;

  const gs = num(p.groundSpeedKt);
  const onGround = typeof p.onGround === "boolean" ? p.onGround : gs != null && gs < 40;
  const blocks = d?.blocks ?? {};

  return {
    source: "SIM",
    at: stampedAt,
    // Also catches a timestamp from the future, which means a wrong clock.
    online: Math.abs(at - stampedAt) < STALE_MS,
    callsign: typeof d.callsign === "string" ? d.callsign.trim().toUpperCase() : "",
    flight: typeof d.sector?.flight === "string" ? d.sector.flight.toUpperCase() : "",
    dep: code(d.sector?.departure),
    arr: code(d.sector?.arrival),
    altn: code(d.sector?.alternate),
    pilotFlying: typeof d.crew?.pilotFlying === "string" ? d.crew.pilotFlying : "",
    lat,
    lon,
    alt: num(p.altitudeFt),
    gs,
    hdg: num(p.headingDeg),
    vs: num(p.verticalSpeedFpm),
    // A parked aeroplane reads the wind as airspeed; show nothing instead.
    ias: onGround && (gs == null || gs < 1) ? 0 : num(p.indicatedAirspeedKt),
    mach: num(p.mach),
    onGround,
    fuelKg: num(d.fuel?.onBoardKg),
    flownNm: num(d.progress?.distanceFlownNm),
    remainingNm: num(d.progress?.distanceRemainingNm),
    eta: time(d.progress?.eta),
    phase: PHASES.includes(d.phase) ? d.phase.replace("_", " ") : null,
    out: time(blocks.out),
    off: time(blocks.off),
    on: time(blocks.on),
    in: time(blocks.in),
    touchdownFpm: num(blocks.touchdownFpm),
    fuelOutKg: num(blocks.fuelOutKg),
    fuelInKg: num(blocks.fuelInKg),
  };
}

export function useSimStatus(enabled = true) {
  const [sim, setSim] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const poll = async () => {
      const { data, error } = await supabase.from("broadcast_sim").select("status").maybeSingle();
      // No bridge running, or the view is not in the database yet: the
      // overlays fall back to VATSIM, so a failure here is not worth a word.
      if (cancelled || error) return;
      const next = parseSimStatus(data?.status);
      // A bridge that is running but not moving republishes the same
      // snapshot; keeping the old object stops every overlay re-rendering
      // for nothing.
      setSim((prev) => (prev && next && prev.at === next.at ? prev : next));
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  // Freshness is re-judged on every render by whoever uses it, because a
  // report goes stale while sitting still.
  return sim;
}

export const simLive = (sim, now = Date.now()) => Boolean(sim && Math.abs(now - sim.at) < STALE_MS);
