import Stage from "../components/Stage";
import RouteMap from "../components/RouteMap";
import { BrandHeader } from "../components/Brand";
import { ArrivalInfo } from "../components/cards";
import { PreviewTag, Stat, StatusPill } from "../components/ui";
import { PlaneIcon } from "../components/Icons";
import { useBroadcast, useSectorView } from "../lib/broadcast";
import { countdown, dateUTC, hm, timeUTC } from "../lib/format";

// /turnaround - arrival / turnaround screen over a slow aerial orbit of the
// destination airport. Browser Source: 1920 x 1080.
export default function TurnaroundScene() {
  const { current, previous, active, sectors } = useBroadcast();
  const arriving = current ?? previous ?? active;
  const view = useSectorView(arriving);
  const sorted = [...sectors].sort((a, b) => new Date(a.std) - new Date(b.std));
  const following = arriving ? sorted[sorted.findIndex((s) => s.id === arriving.id) + 1] ?? null : null;
  const nextView = useSectorView(following);

  if (!view) return <Stage width={1920} height={1080} style={{ background: "var(--bg)" }} />;

  const { sector } = view;
  const landed = view.status === "ARRIVED";
  const turnaround = nextView ? nextView.std - view.eta : null;

  return (
    <Stage width={1920} height={1080} style={{ background: "var(--bg)" }}>
      <RouteMap route={view.route} dep={view.dep} arr={view.arr} progress={view.progress} focus="arrival" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(3,8,20,0.96) 0px, rgba(3,8,20,0.82) 520px, rgba(3,8,20,0.15) 980px, transparent 1300px)," +
            "linear-gradient(0deg, rgba(3,8,20,0.92) 0px, transparent 300px)," +
            "linear-gradient(180deg, rgba(255,140,60,0.10), transparent 40%)",
        }}
      />

      <div className="rise" style={{ position: "absolute", left: 60, top: 50, width: 640 }}>
        <BrandHeader />
        <div style={{ marginTop: 60 }}>
          <StatusPill status={landed ? "ARRIVED" : "ARRIVING SOON"} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 22 }}>
          <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.02em" }}>{sector.flight}</div>
          <div style={{ paddingBottom: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{view.arr?.city ?? sector.arr}</div>
            <div className="subvalue" style={{ fontSize: 22 }}>
              {sector.arr}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 70, marginTop: 40 }}>
          <Stat label={landed ? "On blocks (UTC)" : "Est. arrival (UTC)"} value={timeUTC(view.eta)} sub={dateUTC(view.eta)} size={46} />
          {landed ? (
            <Stat label="Flight time" value={hm(view.block)} size={46} />
          ) : (
            <Stat label="Time to go" value={hm(view.remaining)} size={46} />
          )}
        </div>
      </div>

      <div className="rise" style={{ position: "absolute", right: 60, top: 60, width: 480, animationDelay: "0.2s" }}>
        <ArrivalInfo view={view} />
      </div>

      {nextView && (
        <div
          className="panel rise"
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            bottom: 50,
            padding: "26px 36px",
            display: "flex",
            alignItems: "center",
            gap: 50,
            animationDelay: "0.4s",
          }}
        >
          <div className="label" style={{ color: "var(--blue-bright)", fontSize: 15 }}>
            Next departure
          </div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>{nextView.sector.flight}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, fontWeight: 700 }}>
            {nextView.dep?.city ?? nextView.sector.dep}
            <PlaneIcon size={32} heading={90} color="var(--blue-bright)" />
            {nextView.arr?.city ?? nextView.sector.arr}
          </div>
          <div style={{ flex: 1 }} />
          <Stat label="STD (UTC)" value={timeUTC(nextView.std)} size={30} />
          <Stat label="Turnaround" value={turnaround == null ? "--" : turnaround > 86_400_000 ? countdown(turnaround) : hm(turnaround)} size={30} />
          <Stat label="Crew" value={nextView.crew.map((c) => c.display_name).join(" · ") || "TBA"} size={22} />
        </div>
      )}
      <PreviewTag view={view} />
    </Stage>
  );
}
