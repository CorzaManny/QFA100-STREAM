export const EVENT_NAME = "WorldFlight 2026";
export const EVENT_TAGLINE = "Starlight Foundation";

const logoSrc = `${import.meta.env.BASE_URL}qfa100-logo.png`;

// The team logo PNG sits on black, so `screen` blending drops the black and
// leaves just the artwork over whatever is behind it.
function Logo({ size }) {
  return (
    <img
      src={logoSrc}
      alt=""
      style={{ width: size, height: size, objectFit: "contain", mixBlendMode: "screen", flex: "none" }}
    />
  );
}

function Wordmark({ scale = 1 }) {
  return (
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontSize: 34 * scale, fontWeight: 900, letterSpacing: "-0.01em" }}>QFA100</div>
      <div style={{ fontSize: 11 * scale, fontWeight: 700, letterSpacing: "0.32em", marginTop: 5 * scale, opacity: 0.85 }}>
        VIRTUAL AIRLINE
      </div>
    </div>
  );
}

// Red block used at the left of the status bar.
export function BrandTile({ height = 110 }) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 30px 0 10px",
        background: "linear-gradient(110deg, #5a0000 0%, #b30000 45%, #e10600 100%)",
        borderRadius: "14px 0 0 14px",
        position: "relative",
        overflow: "hidden",
        flex: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 55%)",
        }}
      />
      <Logo size={height - 6} />
      <Wordmark scale={0.9} />
    </div>
  );
}

// Logo + wordmark + event name, for the full-screen scenes.
export function BrandHeader({ scale = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 * scale }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * scale }}>
        <Logo size={96 * scale} />
        <Wordmark scale={scale} />
      </div>
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--line-strong)", margin: `${14 * scale}px 0` }} />
      <div style={{ fontSize: 14 * scale, fontWeight: 600, letterSpacing: "0.3em", color: "var(--soft)", lineHeight: 1.7 }}>
        {EVENT_NAME.toUpperCase()}
        <br />
        {EVENT_TAGLINE.toUpperCase()}
      </div>
    </div>
  );
}
