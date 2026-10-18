import { useEffect, useState } from "react";

// Tracks the team callsign (Admin -> SimBrief in the dashboard, default
// QFA100) on the public VATSIM feed - the same way the dashboard does, so
// both agree on where the aeroplane is.
const FEED = "https://data.vatsim.net/v3/vatsim-data.json";

export function useVatsimPilot(callsign) {
  const [pilot, setPilot] = useState(null);

  useEffect(() => {
    if (!callsign) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const feed = await (await fetch(FEED, { cache: "no-store" })).json();
        const match = feed.pilots?.find((p) => p.callsign?.toUpperCase() === callsign) ?? null;
        if (!cancelled) setPilot(match);
      } catch {
        // keep last sample if the feed hiccups
      }
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [callsign]);

  return pilot;
}
