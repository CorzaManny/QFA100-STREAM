import Stage from "../components/Stage";
import RouteMap from "../components/RouteMap";
import { BrandHeader } from "../components/Brand";
import { PlaneIcon } from "../components/Icons";
import { AircraftCard, CrewCard, LivePanel, RouteCard, SectorFactCard, WeatherCard } from "../components/cards";
import { PreviewTag, Stat } from "../components/ui";
import { useBroadcast, useSectorView } from "../lib/broadcast";
import { cityFont, dateUTC, hm, num, timeUTC } from "../lib/format";

const PADDING = { top: 220, bottom: 400, left: 720, right: 160 };

// /next - next-sector briefing. Browser Source: 1920 x 1080.
export default function NextSectorScene() {
  const { next, active, preview } = useBroadcast();
  // A ?flight= preview means "show me this sector", not the one after it.
  const view = useSectorView(preview?.flight ? active : next ?? active);

  if (!view) {
    return (
      <Stage width={1920} height={1080} style={{ background: "var(--bg)", display: "grid", placeItems: "center" }}>
        <BrandHeader />
      </Stage>
    );
  }

  const { sector } = view;
  const flying = view.status === "ENROUTE" || view.status === "TAXIING";

  return (
    <Stage width={1920} height={1080} style={{ background: "var(--bg)" }}>
      <RouteMap route={view.route} dep={view.dep} arr={view.arr} progress={view.progress} heading={view.live ? view.heading : null} sunTime={view.sunTime} padding={PADDING} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(3,8,20,0.97) 0px, rgba(3,8,20,0.9) 560px, rgba(3,8,20,0.35) 760px, transparent 980px)," +
            "linear-gradient(0deg, rgba(3,8,20,0.9) 0px, transparent 380px)",
        }}
      />

      <div className="rise" style={{ position: "absolute", left: 60, top: 46, width: 600 }}>
        <BrandHeader />

        <div style={{ marginTop: 44 }}>
          <span className={`pill small ${flying ? "enroute" : "next"}`} style={{ borderRadius: 8 }}>
            {flying ? "NOW FLYING" : "NEXT SECTOR"}
          </span>
        </div>
        <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1, marginTop: 18, letterSpacing: "-0.02em" }}>
          {sector.flight}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginTop: 14,
            fontSize: cityFont((view.dep?.city ?? sector.dep) + (view.arr?.city ?? sector.arr), 38),
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <span>{view.dep?.city ?? sector.dep}</span>
          <PlaneIcon size={44} heading={90} color="var(--blue-bright)" />
          <span>{view.arr?.city ?? sector.arr}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26 }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{sector.dep}</div>
            <div className="subvalue" style={{ fontSize: 18, maxWidth: 270, overflow: "hidden", textOverflow: "ellipsis" }}>
              {view.dep?.name ?? ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{sector.arr}</div>
            <div className="subvalue" style={{ fontSize: 18, maxWidth: 270, overflow: "hidden", textOverflow: "ellipsis" }}>
              {view.arr?.name ?? ""}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, auto)",
            justifyContent: "space-between",
            borderTop: "1px solid var(--line)",
            marginTop: 26,
            paddingTop: 22,
          }}
        >
          <Stat label="Departs (UTC)" value={timeUTC(view.std)} sub={dateUTC(view.std)} size={30} />
          <Stat label="Arrives (UTC)" value={timeUTC(view.sta)} sub={dateUTC(view.sta)} size={30} />
          <Stat label="Distance" value={`${num(view.distanceNm)} nm`} size={30} />
          <Stat label="Block time" value={hm(view.block)} size={30} />
        </div>

        <AircraftCard view={view} style={{ marginTop: 30 }} />
        <CrewCard crew={view.crew} style={{ marginTop: 16 }} />
      </div>

      <div className="rise" style={{ position: "absolute", right: 50, top: 50, animationDelay: "0.2s" }}>
        <LivePanel view={view} />
      </div>

      <div
        className="rise"
        style={{
          position: "absolute",
          left: 700,
          right: 50,
          bottom: 46,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 0.95fr)",
          gap: 18,
          animationDelay: "0.4s",
        }}
      >
        <WeatherCard icao={sector.arr} />
        <SectorFactCard view={view} />
        <RouteCard view={view} />
      </div>
      <PreviewTag view={view} />
    </Stage>
  );
}
