import SplitFlap from "./SplitFlap";
import { BrandHeader } from "./Brand";
import { ScheduleChip } from "./ui";
import { useBroadcast } from "../lib/broadcast";
import { useAirports } from "../lib/airports";
import { timeUTC, useNow } from "../lib/format";

const BEFORE = 2;
const ROWS = 13;
const LATE_MS = 15 * 60_000;

const COLUMNS = [
  { key: "date", label: "Date", width: 6 },
  { key: "flight", label: "Flight", width: 6 },
  { key: "from", label: "From", width: 4 },
  { key: "to", label: "To", width: 4 },
  { key: "dest", label: "Destination", width: 13 },
  { key: "std", label: "Sched dep", width: 5 },
  { key: "off", label: "Off blocks", width: 5 },
  { key: "sta", label: "Sched arr", width: 5 },
  { key: "on", label: "On blocks", width: 5 },
  { key: "status", label: "Status", width: 12 },
];
const CELL = 25; // flap width + gap, see .flap in theme.css
const COLUMN_GAP = 14;

const ms = (iso) => (iso ? new Date(iso).getTime() : null);
const day = (t) =>
  new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const shortCity = (apt, code) => (apt?.city ?? code).replace(/\s*\(.*\)\s*/g, "").trim();

// Two sectors either side would leave the board short at the start or end
// of the schedule, so slide the window to keep it full.
function windowAround(count, anchor) {
  let start = Math.max(0, anchor - BEFORE);
  const end = Math.min(count, start + ROWS);
  start = Math.max(0, end - ROWS);
  return [start, end];
}

function rowFor(sector, actual, relation, lookup, now) {
  const std = ms(sector.std);
  const sta = ms(sector.sta);
  const off = ms(actual?.off_blocks);
  const on = ms(actual?.on_blocks);

  let status;
  let tone;
  if (actual?.skipped) [status, tone] = ["CANCELLED", "red"];
  else if (on || actual?.completed_at || relation === "past") [status, tone] = ["LANDED", "green"];
  else if (off) [status, tone] = ["DEPARTED", "blue"];
  else if (relation === "boarding") [status, tone] = ["NOW BOARDING", "amber"];
  else if (now > std + LATE_MS) [status, tone] = ["DELAYED", "red"];
  else [status, tone] = ["SCHEDULED", "muted"];

  const stamp = (t) => (t ? timeUTC(t) : relation === "past" ? "--:--" : "");
  return {
    id: sector.id,
    boarding: relation === "boarding",
    cells: {
      date: day(std),
      flight: sector.flight,
      from: sector.dep,
      to: sector.arr,
      dest: shortCity(lookup(sector.arr), sector.arr),
      std: timeUTC(std),
      off: stamp(off),
      sta: timeUTC(sta),
      on: stamp(on),
      status,
    },
    tones: {
      status: tone,
      off: off && off - std > LATE_MS ? "amber" : "",
      on: on && on - sta > LATE_MS ? "amber" : "",
      std: "muted",
      sta: "muted",
      date: "muted",
    },
  };
}

export default function DepartureBoard({ anchorId }) {
  const { sectors, actuals, schedule } = useBroadcast();
  const lookup = useAirports();
  const now = useNow(1000);

  const sorted = [...sectors].sort((a, b) => ms(a.std) - ms(b.std));
  const anchor = Math.max(0, sorted.findIndex((s) => s.id === anchorId));
  const [start, end] = windowAround(sorted.length, anchor);
  const rows = sorted
    .slice(start, end)
    .map((s, i) => rowFor(s, actuals[s.id], start + i < anchor ? "past" : start + i === anchor ? "boarding" : "next", lookup, now));

  const flown = sorted.filter((s) => {
    const a = actuals[s.id];
    return !a?.skipped && (Boolean(a?.on_blocks) || Boolean(a?.completed_at));
  }).length;
  const clock = new Date(now).toLocaleTimeString("en-GB", { timeZone: "UTC" });

  return (
    <div style={{ position: "absolute", inset: 0, padding: "46px 60px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandHeader scale={0.85} />
        <div style={{ textAlign: "right" }}>
          <div className="label" style={{ fontSize: 15, color: "var(--blue-bright)" }}>
            Flight schedule · UTC
          </div>
          <div className="value" style={{ fontSize: 54, fontWeight: 800, marginTop: 4 }}>
            {clock}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 34, padding: "22px 26px", flex: 1 }}>
        <div style={{ display: "flex", gap: COLUMN_GAP, paddingLeft: 18, marginBottom: 14 }}>
          {COLUMNS.map((c) => (
            <div key={c.key} className="label" style={{ width: c.width * CELL - 3, fontSize: 13 }}>
              {c.label}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          {rows.map((row, r) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                gap: COLUMN_GAP,
                padding: "4px 0 4px 14px",
                borderLeft: `4px solid ${row.boarding ? "var(--amber)" : "transparent"}`,
                background: row.boarding ? "rgba(255,181,71,0.09)" : "transparent",
                borderRadius: 6,
              }}
            >
              {COLUMNS.map((c, ci) => (
                <SplitFlap key={c.key} text={row.cells[c.key]} width={c.width} delay={r * 110 + ci * 45} tone={row.tones[c.key] ?? ""} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* How the relay stands: what has been flown, and whether the
          programme is running to WorldFlight's published times. */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 14,
          color: "var(--muted)",
          letterSpacing: "0.04em",
        }}
      >
        <span>
          SECTOR {anchor + 1} OF {sorted.length} · {flown} FLOWN · {sorted.length - flown} TO GO
        </span>
        <ScheduleChip schedule={schedule} small />
      </div>
    </div>
  );
}
