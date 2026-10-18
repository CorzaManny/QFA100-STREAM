import Stage from "../components/Stage";
import RouteMap from "../components/RouteMap";
import StatusBar from "../components/StatusBar";
import { LivePanel } from "../components/cards";
import { PreviewTag } from "../components/ui";
import { useBroadcast, useSectorView } from "../lib/broadcast";

const PADDING = { top: 230, bottom: 230, left: 160, right: 160 };

// /map - full-screen animated route map. Browser Source: 1920 x 1080.
export default function MapScene() {
  const { active } = useBroadcast();
  const view = useSectorView(active);

  return (
    <Stage width={1920} height={1080} style={{ background: "var(--bg)" }}>
      {view && (
        <RouteMap route={view.route} dep={view.dep} arr={view.arr} progress={view.progress} heading={view.live ? view.heading : null} padding={PADDING} />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(2,6,17,0.75) 0%, transparent 22%, transparent 75%, rgba(2,6,17,0.8) 100%)",
        }}
      />
      <div className="rise" style={{ position: "absolute", left: 30, right: 30, top: 30 }}>
        <StatusBar view={view} />
      </div>
      {view && (
        <div className="rise" style={{ position: "absolute", right: 30, bottom: 30, animationDelay: "0.3s" }}>
          <LivePanel view={view} />
        </div>
      )}
      <PreviewTag view={view} />
    </Stage>
  );
}
