const RAD = Math.PI / 180;

// Where the sun is directly overhead at a given moment (low-precision solar
// ephemeris, accurate to well under a degree - plenty for a day/night line).
export function subsolarPoint(ms) {
  const d = ms / 86_400_000 + 2440587.5 - 2451545.0; // days since J2000
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / RAD;
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const lon = ((((ra - gmst * 15) % 360) + 540) % 360) - 180;
  return { lat: dec, lon };
}

// Sun elevation in degrees above the horizon at a point.
export function sunElevation(lat, lon, sub) {
  const s =
    Math.sin(lat * RAD) * Math.sin(sub.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(sub.lat * RAD) * Math.cos((lon - sub.lon) * RAD);
  return Math.asin(Math.max(-1, Math.min(1, s))) / RAD;
}

// What the crew would see out the window: compares the sun now with a moment
// later further along the route, so flying west into dusk reads as a sunset.
export function skyLabel([lon, lat], ms, [lon2, lat2], ms2) {
  const now = sunElevation(lat, lon, subsolarPoint(ms));
  if (now > 6) return "Daylight";
  if (now < -6) return "Night";
  const next = sunElevation(lat2, lon2, subsolarPoint(ms2));
  return next < now ? "Sunset" : "Sunrise";
}
