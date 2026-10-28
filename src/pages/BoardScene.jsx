import { useEffect, useState } from "react";
import Stage from "../components/Stage";
import DepartureBoard, { BOARD_BACKGROUND } from "../components/DepartureBoard";
import { BrandHeader } from "../components/Brand";
import { useBroadcast } from "../lib/broadcast";

const DEFAULT_EVERY_S = 60;

// ?every=<seconds> re-ticks faster or slower than the default minute; it is
// clamped so a typo can't spin the whole board continuously.
function retickMs() {
  const q = new URLSearchParams(window.location.search);
  const s = q.has("every") ? Number(q.get("every")) : DEFAULT_EVERY_S;
  return Math.min(900, Math.max(10, Number.isFinite(s) && s > 0 ? s : DEFAULT_EVERY_S)) * 1000;
}

// /board - the split-flap departures board on its own, re-ticking about once
// a minute so it stays alive on screen between the other scenes. The same
// board also plays inside /boarding. Browser Source: 1920 x 1080.
export default function BoardScene() {
  const { sectors, active, loading, preview } = useBroadcast();
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), retickMs());
    return () => clearInterval(id);
  }, []);

  if (loading || !sectors.length) {
    return (
      <Stage width={1920} height={1080} style={{ background: BOARD_BACKGROUND, display: "grid", placeItems: "center" }}>
        <BrandHeader />
      </Stage>
    );
  }

  return (
    <Stage width={1920} height={1080} style={{ background: BOARD_BACKGROUND }}>
      <DepartureBoard anchorId={active?.id} cycle={cycle} />
      {preview && <div className="preview-tag">PREVIEW</div>}
    </Stage>
  );
}
