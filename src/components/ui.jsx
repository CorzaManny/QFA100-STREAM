export function Stat({ label, value, sub, size = 30, align = "left" }) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: size, marginTop: 6 }}>
        {value}
      </div>
      {sub && <div className="subvalue">{sub}</div>}
    </div>
  );
}

export function StatusPill({ status, small }) {
  return (
    <span className={`pill ${status.toLowerCase()} ${small ? "small" : ""}`}>
      <span className="dot" />
      {status}
    </span>
  );
}

// How the programme is running against WorldFlight's published schedule -
// nothing at all when no time has been stamped recently enough to say.
export function ScheduleChip({ schedule, small }) {
  if (!schedule) return null;
  const color = schedule.tone === "bad" ? "var(--amber)" : "var(--green)";
  return (
    <span
      className="label"
      style={{
        color,
        border: `1px solid ${color}`,
        borderRadius: 7,
        padding: small ? "3px 8px" : "6px 12px",
        fontSize: small ? 12 : 14,
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      {schedule.text}
    </span>
  );
}

export function CardHead({ icon, children }) {
  return (
    <div className="card-head">
      {icon}
      {children}
    </div>
  );
}

export function PreviewTag({ view }) {
  return view?.preview ? <div className="preview-tag">PREVIEW</div> : null;
}
