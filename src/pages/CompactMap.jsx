import Stage from "../components/Stage";
import RouteMap from "../components/RouteMap";
import FlightProgress from "../components/FlightProgress";
import { PreviewTag, StatusPill } from "../components/ui";
import { useBroadcast, useSectorView } from "../lib/broadcast";
import { altitude, countdown, hm, kg, machText, num, timeUTC } from "../lib/format";

const PADDING = { top: 50, bottom: 50, left: 60, right: 60 };

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span className="label" style={{ fontSize: 12 }}>
        {label}
      </span>
      <span className="value" style={{ fontSize: 24 }}>
        {value}
      </span>
    </div>
  );
}

// /compact - corner map. Browser Source: 800 x 320.
export default function CompactMap() {
  const { active, schedule } = useBroadcast();
  const view = useSectorView(active);
  if (!view) return null;

  const enroute = view.status === "ENROUTE" || view.status === "TAXIING";
  const footer =
    view.status === "ARRIVED" ? "Arrived" : enroute ? `${hm(view.remaining)} remaining` : `Departs in ${countdown(view.untilDeparture)}`;

  return (
    <Stage width={800} height={320}>
      <div className="rise" style={{ position: "absolute", inset: 10, display: "flex", gap: 14 }}>
        <div className="panel" style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <RouteMap
            route={view.route}
            dep={view.dep}
            arr={view.arr}
            progress={view.progress}
            heading={view.live ? view.heading : null}
            sunTime={view.sunTime}
            padding={PADDING}
            compact
          />
        </div>
        <div className="panel" style={{ width: 280, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{view.sector.flight}</span>
            <StatusPill status={view.status} small />
          </div>
          <Row label="Alt" value={view.alt != null ? altitude(view.alt) : "--"} />
          <Row label="Spd" value={view.gs != null ? `${num(view.gs)} kt` : "--"} />
          {/* Only the simulator feed knows the Mach number and the fuel. */}
          {view.mach != null && <Row label="Mach" value={machText(view.mach)} />}
          {view.fuelKg != null && <Row label="Fuel" value={kg(view.fuelKg)} />}
          <Row label={view.status === "ARRIVED" ? "On blk" : "ETA"} value={timeUTC(view.eta)} />
          <div style={{ marginTop: "auto" }}>
            <FlightProgress progress={view.progress} height={6} planeSize={0} />
            <div style={{ fontSize: 15, color: "var(--soft)", marginTop: 10 }}>
              {footer}
              {schedule?.tone === "bad" ? ` · ${schedule.text.toLowerCase()}` : ""}
            </div>
          </div>
        </div>
      </div>
      <PreviewTag view={view} />
    </Stage>
  );
}
