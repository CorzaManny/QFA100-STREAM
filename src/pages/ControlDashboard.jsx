import { useState } from "react";
import { useBroadcast, setBroadcastOverride } from "../lib/broadcast";
import { useAuth } from "../lib/useAuth";
import { dateUTC, timeUTC } from "../lib/format";
import { BrandHeader } from "../components/Brand";

const SCENES = [
  { id: "overlay", label: "Status bar", size: "1920 × 150" },
  { id: "map", label: "Route map", size: "1920 × 1080" },
  { id: "next", label: "Next sector", size: "1920 × 1080" },
  { id: "turnaround", label: "Turnaround", size: "1920 × 1080" },
  { id: "compact", label: "Compact map", size: "800 × 320" },
];

const button = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid var(--line-strong)",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const input = { ...button, cursor: "text", fontWeight: 500, background: "rgba(0,0,0,0.3)" };

function Shell({ children }) {
  return (
    <div style={{ height: "100vh", overflowY: "auto" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 28px 80px" }}>{children}</div>
    </div>
  );
}

export default function ControlDashboard() {
  const { user, loading: authLoading, signIn, signOut, error: authError } = useAuth();
  const { sectors, actuals, current, next, active, state, config, pilot, loading } = useBroadcast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (authLoading) return <Shell>Loading…</Shell>;
  if (!user) return <LoginForm onSubmit={signIn} error={authError} />;

  const act = async (patch) => {
    setBusy(true);
    setError(null);
    try {
      await setBroadcastOverride(patch);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...sectors].sort((a, b) => new Date(a.std) - new Date(b.std));

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandHeader scale={0.8} />
        <button style={button} onClick={signOut}>
          Sign out
        </button>
      </div>

      {error && (
        <div className="panel" style={{ padding: 14, marginTop: 20, borderColor: "var(--red)", color: "#ff8a8a" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 30 }}>
        <section className="panel" style={{ padding: 22 }}>
          <div className="label">Mode</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
            {state.auto_mode ? "Automatic" : "Manual override"}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
            Automatic follows the same logic as the dashboard: the sector {config.callsign} has filed on VATSIM, then
            off-blocks stamps, then the schedule. Pick a sector below to override it if WorldFlight runs off schedule.
          </p>
          <button
            style={{ ...button, background: state.auto_mode ? button.background : "var(--blue)" }}
            disabled={busy}
            onClick={() => act({ autoMode: !state.auto_mode })}
          >
            {state.auto_mode ? "Switch to manual" : "Return to automatic"}
          </button>
        </section>

        <section className="panel" style={{ padding: 22 }}>
          <div className="label">On air now</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
            {active ? `${active.flight} · ${active.dep} → ${active.arr}` : "Nothing scheduled"}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: "10px 0 0" }}>
            {current ? "In progress" : "Up next"} · VATSIM {config.callsign}:{" "}
            {pilot ? `online, ${pilot.flight_plan?.departure ?? "?"} → ${pilot.flight_plan?.arrival ?? "?"}` : "offline"}
            <br />
            Next sector: {next ? `${next.flight} at ${timeUTC(new Date(next.std).getTime())} UTC` : "—"}
          </p>
        </section>
      </div>

      <section className="panel" style={{ padding: 22, marginTop: 18 }}>
        <div className="label" style={{ marginBottom: 14 }}>
          OBS browser sources
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {SCENES.map((s) => (
            <div key={s.id} className="panel" style={{ padding: 14, background: state.scene === s.id ? "rgba(61,132,255,0.18)" : undefined }}>
              <div style={{ fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 10px" }}>
                /{s.id} · {s.size}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a style={{ ...button, padding: "6px 10px", fontSize: 13, textDecoration: "none" }} href={`${import.meta.env.BASE_URL}${s.id}`} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button style={{ ...button, padding: "6px 10px", fontSize: 13 }} disabled={busy} onClick={() => act({ scene: s.id })}>
                  Cue
                </button>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 0 }}>
          "Cue" just records which scene is meant to be live for whoever is driving OBS — each URL is its own Browser Source.
        </p>
      </section>

      <section className="panel" style={{ padding: 22, marginTop: 18 }}>
        <div className="label" style={{ marginBottom: 14 }}>
          Schedule
        </div>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {sorted.map((s) => {
              const a = actuals[s.id];
              const done = a?.on_blocks || a?.completed_at || a?.skipped;
              const isActive = active?.id === s.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 150px 1fr auto auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: isActive ? "rgba(61,132,255,0.18)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isActive ? "var(--blue)" : "var(--line)"}`,
                    opacity: done ? 0.5 : 1,
                  }}
                >
                  <strong>{s.flight}</strong>
                  <span>
                    {s.dep} → {s.arr}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    {dateUTC(new Date(s.std).getTime())} · {timeUTC(new Date(s.std).getTime())}Z
                    {done ? " · flown" : a?.off_blocks ? " · off blocks" : ""}
                  </span>
                  <a
                    style={{ ...button, padding: "6px 10px", fontSize: 13, textDecoration: "none" }}
                    href={`${import.meta.env.BASE_URL}next?flight=${s.flight}&progress=0.45`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview
                  </a>
                  <button
                    style={{ ...button, padding: "6px 10px", fontSize: 13 }}
                    disabled={busy}
                    onClick={() => act({ sectorId: s.id, autoMode: false })}
                  >
                    Put on air
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Shell>
  );
}

function LoginForm({ onSubmit, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password);
        }}
        style={{ display: "grid", gap: 14, width: 380, padding: 30 }}
      >
        <BrandHeader scale={0.6} />
        <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>Sign in with your QFA100 dashboard account.</div>
        <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={{ ...button, background: "var(--blue)", border: "none" }} type="submit">
          Sign in
        </button>
        {error && <div style={{ color: "#ff8a8a", fontSize: 13 }}>{error}</div>}
      </form>
    </div>
  );
}
