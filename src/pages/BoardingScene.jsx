import { useMemo, useState } from "react";
import Stage from "../components/Stage";
import FlythroughMap from "../components/FlythroughMap";
import FlightProgress from "../components/FlightProgress";
import { BrandHeader } from "../components/Brand";
import { PlaneIcon, RouteIcon } from "../components/Icons";
import { CardHead, PreviewTag, Stat } from "../components/ui";
import { useBroadcast, useSectorView } from "../lib/broadcast";
import { projectOntoRoute } from "../lib/geo";
import { aircraftName } from "../lib/aircraft";
import { altitude, countdown, dateUTC, hm, num, timeUTC } from "../lib/format";

const PADDING = { top: 220, bottom: 300, left: 780, right: 160 };
const WAYPOINT_NAMES = { TOC: "Top of climb", TOD: "Top of descent" };

// A simple climb / cruise / descent profile for the fly-through readout.
function simulatedAltitude(p, cruise) {
  if (p <= 0 || p >= 1) return 0;
  if (p < 0.12) return cruise * (p / 0.12);
  if (p > 0.85) return cruise * (1 - (p - 0.85) / 0.15);
  return cruise;
}

function phaseOf(p) {
  if (p <= 0) return "Ready for departure";
  if (p >= 1) return "Arrived";
  if (p < 0.12) return "Climbing";
  if (p > 0.85) return "Descending";
  return "Cruising";
}

// /boarding - "Now boarding" sequence with a sped-up fly-through of the
// planned route. Browser Source: 1920 x 1080.
export default function BoardingScene() {
  const { current, next, active, preview } = useBroadcast();
  const upcoming = useSectorView(preview?.flight ? active : current ?? next);
  const following = useSectorView(next);
  // Once the current sector is airborne, boarding is for the next one.
  const view =
    upcoming && (preview?.flight || upcoming.status === "SCHEDULED" || upcoming.status === "BOARDING")
      ? upcoming
      : following ?? upcoming;

  const [sim, setSim] = useState(0);

  const waypoints = useMemo(() => {
    if (!view?.route || !view.ofp?.navlog) return [];
    return view.ofp.navlog
      .filter((w) => w.ident !== view.sector.dep && w.ident !== view.sector.arr)
      .map((w) => ({ ident: w.ident, f: projectOntoRoute(view.route, [w.lon, w.lat]) }));
  }, [view?.route, view?.ofp?.navlog, view?.sector.dep, view?.sector.arr]);

  if (!view) {
    return (
      <Stage width={1920} height={1080} style={{ background: "var(--bg)", display: "grid", placeItems: "center" }}>
        <BrandHeader />
      </Stage>
    );
  }

  const { sector } = view;
  const cruise = Number(view.ofp?.cruise) || 36000;
  const nextWpt = waypoints.find((w) => w.f > sim + 0.002);
  const alt = simulatedAltitude(sim, cruise);
  const boarding = view.status === "BOARDING";

  return (
    <Stage width={1920} height={1080} style={{ background: "var(--bg)" }}>
      <FlythroughMap route={view.route} dep={view.dep} arr={view.arr} padding={PADDING} onProgress={setSim} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(3,8,20,0.96) 0px, rgba(3,8,20,0.85) 560px, rgba(3,8,20,0.3) 800px, transparent 1000px)," +
            "linear-gradient(0deg, rgba(3,8,20,0.92) 0px, transparent 300px)",
        }}
      />

      <div className="rise" style={{ position: "absolute", left: 60, top: 46, width: 660 }}>
        <BrandHeader />

        <div style={{ marginTop: 56 }}>
          <span className="pill boarding" style={{ fontSize: 26, padding: "10px 24px", gap: 14 }}>
            <span className="dot" style={{ width: 14, height: 14 }} />
            NOW BOARDING
          </span>
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 1, marginTop: 22, letterSpacing: "-0.02em" }}>
          {sector.flight}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 14, fontSize: 40, fontWeight: 700 }}>
          <span>{view.dep?.city ?? sector.dep}</span>
          <PlaneIcon size={46} heading={90} color="var(--blue-bright)" />
          <span>{view.arr?.city ?? sector.arr}</span>
        </div>
        <div className="subvalue" style={{ fontSize: 20, marginTop: 10 }}>
          {sector.dep} · {view.dep?.name ?? ""}
          <br />
          {sector.arr} · {view.arr?.name ?? ""}
        </div>

        <div style={{ display: "flex", gap: 60, marginTop: 40 }}>
          <Stat label="Departs (UTC)" value={timeUTC(view.std)} sub={dateUTC(view.std)} size={46} />
          <Stat label={boarding ? "Doors close in" : "Departs in"} value={countdown(view.untilDeparture)} size={46} />
        </div>
      </div>

      <div className="panel rise" style={{ position: "absolute", right: 50, top: 50, width: 560, padding: "22px 28px", animationDelay: "0.2s" }}>
        <CardHead icon={<RouteIcon />}>Route preview · {phaseOf(sim)}</CardHead>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 18, columnGap: 24, marginTop: 18 }}>
          <Stat label="Distance flown" value={`${num(sim * (view.distanceNm ?? 0))} nm`} size={28} />
          <Stat label="Altitude" value={alt ? altitude(alt) : "Ground"} size={28} />
          <Stat label="Flight time" value={`${hm(sim * view.block)} / ${hm(view.block)}`} size={28} />
          <Stat
            label="Next waypoint"
            value={sim >= 1 ? sector.arr : nextWpt ? WAYPOINT_NAMES[nextWpt.ident] ?? nextWpt.ident : sector.arr}
            size={28}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <FlightProgress progress={sim} height={6} planeSize={30} />
        </div>
      </div>

      <div
        className="panel rise"
        style={{
          position: "absolute",
          left: 60,
          right: 50,
          bottom: 46,
          padding: "24px 34px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 30,
          animationDelay: "0.4s",
        }}
      >
        <Stat label="Aircraft" value={aircraftName(view.aircraft)} sub={view.reg ?? undefined} size={26} />
        <Stat label="Flight time" value={hm(view.block)} size={26} />
        <Stat label="Distance" value={`${num(view.distanceNm)} nm`} size={26} />
        <Stat label="Cruise" value={view.ofp?.cruise ? `FL${Math.round(view.ofp.cruise / 100)}` : "--"} size={26} />
        <Stat label="Departure runway" value={view.ofp?.depRwy || "--"} size={26} />
        <Stat
          label="Crew"
          value={view.crew.length ? view.crew.map((c) => c.display_name).join(" · ") : "To be announced"}
          size={22}
        />
      </div>
      <PreviewTag view={view} />
    </Stage>
  );
}
