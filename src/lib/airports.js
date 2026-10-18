import { useEffect, useState } from "react";

// Same airports.json the qfa100-dashboard EFB ships:
// { ICAO: [name, city, country, lat, lon, elevationFt, "rwy|rwy"] }
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
  const [name, city, country, lat, lon, elev] = a;
  return { icao: code, name, city, country, lat, lon, elev };
}

export function useAirports() {
  const [ready, setReady] = useState(Boolean(index));
  useEffect(() => {
    if (!ready) load().then(() => setReady(Boolean(index)));
  }, [ready]);
  return ready ? lookup : () => null;
}
