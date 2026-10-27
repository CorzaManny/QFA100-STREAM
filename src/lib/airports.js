import { useEffect, useState } from "react";

// Same airports.json the qfa100-dashboard EFB ships:
// { ICAO: [name, city, country, lat, lon, elevationFt, "rwy|rwy"] }
// where each runway reads "04/22 4500 ASP" - idents, length in feet, surface.
let index = null;
let loading = null;

function load() {
  loading ??= fetch(`${import.meta.env.BASE_URL}airports.json`)
    .then((r) => r.json())
    .then((data) => (index = data))
    .catch(() => (loading = null));
  return loading;
}

function lookup(code) {
  const a = index?.[code];
  if (!a) return null;
  const [name, city, country, lat, lon, elev, rwys] = a;
  const runways = (rwys ? rwys.split("|") : []).map((r) => {
    const [ident, lengthFt, surface] = r.trim().split(/\s+/);
    return { ident, lengthFt: Number(lengthFt) || null, surface: (surface || "").replace(/-$/, "") };
  });
  return { icao: code, name, city, country, lat, lon, elev, runways };
}

export function useAirports() {
  const [ready, setReady] = useState(Boolean(index));
  useEffect(() => {
    if (!ready) load().then(() => setReady(Boolean(index)));
  }, [ready]);
  return ready ? lookup : () => null;
}
