import Stage from "../components/Stage";
import StatusBar from "../components/StatusBar";
import { PreviewTag } from "../components/ui";
import { useBroadcast, useSectorView } from "../lib/broadcast";

// /overlay - transparent top bar. Browser Source: 1920 x 150.
export default function OverlayBar() {
  const { active } = useBroadcast();
  const view = useSectorView(active);
  return (
    <Stage width={1920} height={150}>
      <div className="rise" style={{ position: "absolute", left: 20, right: 20, top: 20 }}>
        <StatusBar view={view} />
      </div>
      <PreviewTag view={view} />
    </Stage>
  );
}
