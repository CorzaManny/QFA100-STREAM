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
