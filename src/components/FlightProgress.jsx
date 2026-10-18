import { PlaneIcon } from "./Icons";

export default function FlightProgress({ progress, left, right, height = 8, planeSize = 38 }) {
  const pct = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(2)}%`;
  return (
    <div style={{ width: "100%" }}>
      {(left || right) && (
        <div
          className="tabular"
          style={{ display: "flex", justifyContent: "space-between", fontSize: 17, color: "var(--soft)", marginBottom: 12 }}
        >
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
      <div style={{ position: "relative", height, borderRadius: height, background: "rgba(140,170,220,0.18)" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            right: "auto",
            width: pct,
            borderRadius: height,
            background: "linear-gradient(90deg, #1d5fd6, #4c8dff 70%, #8fbcff)",
            boxShadow: "0 0 14px rgba(76,141,255,0.8)",
            transition: "width 1.2s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: pct,
            top: "50%",
            transform: "translate(-50%, -50%)",
            transition: "left 1.2s ease",
            filter: "drop-shadow(0 0 6px rgba(110,166,255,0.9))",
          }}
        >
          <PlaneIcon size={planeSize} heading={90} />
        </div>
      </div>
    </div>
  );
}
