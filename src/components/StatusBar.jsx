import { BrandTile } from "./Brand";
import FlightProgress from "./FlightProgress";
import { ScheduleChip, StatusPill } from "./ui";
import { aircraftShort } from "../lib/aircraft";
import { useBroadcast } from "../lib/broadcast";
import { altitude, countdown, hm, machText, num, timeUTC } from "../lib/format";

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

function Mini({ label, value, sub }) {
  return (
    <div style={{ flex: "none" }}>
      <div className="label" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div className="value" style={{ fontSize: 26, marginTop: 6 }}>
        {value}
      </div>
      {sub && (
        <div className="subvalue" style={{ fontSize: 13, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function StatusBar({ view, height = 110 }) {
  const { schedule } = useBroadcast();
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
    <div className="panel" style={{ height, display: "flex", alignItems: "center", gap: 24, paddingRight: 24 }}>
      <BrandTile height={height - 2} />

      <div style={{ flex: "none" }}>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{sector.flight}</div>
        <div className="subvalue" style={{ fontSize: 16, marginTop: 8 }}>
          {[`Sector ${view.number} of ${view.count}`, aircraftShort(view.aircraft), view.reg].filter(Boolean).join("  |  ")}
        </div>
      </div>

      <div className="divider-v" style={{ margin: "22px 0" }} />

      <Airport apt={view.dep} code={sector.dep} />
      <div style={{ flex: 1, minWidth: 320, padding: "0 10px" }}>
        <FlightProgress progress={view.progress} left={left} right={right} />
      </div>
      <Airport apt={view.arr} code={sector.arr} align="right" />

      <div className="divider-v" style={{ margin: "22px 0" }} />

      {/* The simulator sends airspeed, Mach and fuel; VATSIM sends none of
          them, so each line falls back to what the feed in use knows. */}
      <Mini
        label="Alt"
        value={view.alt != null ? altitude(view.alt) : "--"}
        sub={view.ias != null ? `${num(view.ias)} kt IAS` : undefined}
      />
      <Mini
        label="Spd"
        value={view.gs != null ? `${num(view.gs)} kt` : "--"}
        sub={machText(view.mach) || undefined}
      />
      <Mini
        label={status === "ARRIVED" ? "On blocks" : "ETA (UTC)"}
        value={timeUTC(view.eta)}
        sub={view.phase ? view.phase.toLowerCase() : undefined}
      />

      <div style={{ display: "grid", gap: 8, justifyItems: "center", flex: "none" }}>
        <StatusPill status={status} />
        <ScheduleChip schedule={schedule} small />
      </div>
    </div>
  );
}
