import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// The forecast for an airport, out of the dashboard's own cache
// (taf_cache, refreshed server-side). The source does not allow browser
// requests, which is why this goes through the database rather than straight
// out to the weather service the way the METAR does.
const MAX_AGE_MS = 12 * 60 * 60_000;

export function useTaf(icao) {
  const [taf, setTaf] = useState(null);

  useEffect(() => {
    if (!icao) return;
    let cancelled = false;
    setTaf(null);
    const load = async () => {
      const { data, error } = await supabase
        .from("broadcast_taf")
        .select("raw, fetched_at")
        .eq("icao", icao)
        .maybeSingle();
      if (cancelled || error || !data?.raw) return;
      if (Date.now() - new Date(data.fetched_at).getTime() > MAX_AGE_MS) return;
      setTaf({ raw: String(data.raw).replace(/\s+/g, " ").trim(), at: new Date(data.fetched_at).getTime() });
    };
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [icao]);

  return taf;
}

// "TAF YSSY 271700Z 2718/2824 ..." -> the body, without the station and the
// issue stamp, so it reads as a forecast rather than a header on screen.
export function tafBody(raw) {
  if (!raw) return "";
  return raw
    .replace(/^TAF\s+(AMD\s+|COR\s+)?/i, "")
    .replace(/^[A-Z]{4}\s+/, "")
    .replace(/^\d{6}Z\s+/, "")
    .trim();
}
