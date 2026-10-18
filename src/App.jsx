import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BroadcastProvider } from "./lib/broadcast";
import OverlayBar from "./pages/OverlayBar";
import MapScene from "./pages/MapScene";
import NextSectorScene from "./pages/NextSectorScene";
import TurnaroundScene from "./pages/TurnaroundScene";
import CompactMap from "./pages/CompactMap";
import BoardingScene from "./pages/BoardingScene";
import ControlDashboard from "./pages/ControlDashboard";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <BroadcastProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/control" replace />} />
          <Route path="/overlay" element={<OverlayBar />} />
          <Route path="/map" element={<MapScene />} />
          <Route path="/next" element={<NextSectorScene />} />
          <Route path="/turnaround" element={<TurnaroundScene />} />
          <Route path="/compact" element={<CompactMap />} />
          <Route path="/boarding" element={<BoardingScene />} />
          <Route path="/control" element={<ControlDashboard />} />
        </Routes>
      </BroadcastProvider>
    </BrowserRouter>
  );
}
