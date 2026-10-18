import { BrandTile } from "./Brand";
import FlightProgress from "./FlightProgress";
import { StatusPill } from "./ui";
import { aircraftShort } from "../lib/aircraft";
import { altitude, countdown, hm, num, timeUTC } from "../lib/format";

function Airport({ apt, code, align = "left" }) {
  return (
    <div style={{ textAlign: align, flex: "none" }}>
      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{code}</div>
      <div className="subvalue" style={{ fontSize: 17, marginTop: 6 }}>
        {apt?.city ?? ""}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div style={{ flex: "none" }}>
      <div className="label" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div className="value" style={{ fontSize: 26, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

export default function StatusBar({ view, height = 110 }) {
  if (!view) return null;
  const { sector, status } = view;
  const enroute = status === "ENROUTE" || status === "TAXIING";
  const left =
    status === "ARRIVED"
      ? `Landed ${timeUTC(view.eta)} UTC`
      : enroute
        ? `${hm(view.elapsed)} elapsed`
        : `Departs in ${countdown(view.untilDeparture)}`;
  const right = status === "ARRIVED" ? "" : enroute ? `${hm(view.remaining)} remaining` : `Block ${hm(view.block)}`;

  return (
    <div className="panel" style={{ height, display: "flex", alignItems: "center", gap: 26, paddingRight: 26 }}>
      <BrandTile height={height - 2} />

      <div style={{ flex: "none" }}>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{sector.flight}</div>
        <div className="subvalue" style={{ fontSize: 17, marginTop: 8 }}>
          {[aircraftShort(view.aircraft), view.reg].filter(Boolean).join("  |  ")}
        </div>
      </div>

      <div className="divider-v" style={{ margin: "22px 0" }} />

      <Airport apt={view.dep} code={sector.dep} />
      <div style={{ flex: 1, minWidth: 360, padding: "0 10px" }}>
        <FlightProgress progress={view.progress} left={left} right={right} />
      </div>
      <Airport apt={view.arr} code={sector.arr} align="right" />

      <div className="divider-v" style={{ margin: "22px 0" }} />

      <Mini label="Alt" value={view.alt != null ? altitude(view.alt) : "--"} />
      <Mini label="Spd" value={view.gs != null ? `${num(view.gs)} kt` : "--"} />
      <Mini label={status === "ARRIVED" ? "On blocks" : "ETA (UTC)"} value={timeUTC(view.eta)} />

      <StatusPill status={status} />
    </div>
  );
}
