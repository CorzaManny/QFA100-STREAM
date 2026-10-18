const EARTH_NM = 3440.065;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export function distNm([lon1, lat1], [lon2, lat2]) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_NM * Math.asin(Math.sqrt(h));
}

function greatCirclePoint([lon1, lat1], [lon2, lat2], t) {
  const p1 = rad(lat1);
  const l1 = rad(lon1);
  const p2 = rad(lat2);
  const l2 = rad(lon2);
  const d =
    2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d === 0) return [lon1, lat1];
  const a = Math.sin((1 - t) * d) / Math.sin(d);
  const b = Math.sin(t * d) / Math.sin(d);
  const x = a * Math.cos(p1) * Math.cos(l1) + b * Math.cos(p2) * Math.cos(l2);
  const y = a * Math.cos(p1) * Math.sin(l1) + b * Math.cos(p2) * Math.sin(l2);
  const z = a * Math.sin(p1) + b * Math.sin(p2);
  return [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.sqrt(x * x + y * y)))];
}

export function bearing([lon1, lat1], [lon2, lat2]) {
  const p1 = rad(lat1);
  const p2 = rad(lat2);
  const dl = rad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Keeps longitudes continuous so routes across the antimeridian (e.g.
// Kamchatka -> Alaska) draw the short way instead of across the whole map.
function unwrap(coords) {
  const out = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    let [lon, lat] = coords[i];
    const prev = out[i - 1][0];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push([lon, lat]);
  }
  return out;
}

export function unwrapNear(point, ref) {
  let [lon, lat] = point;
  while (lon - ref[0] > 180) lon -= 360;
  while (lon - ref[0] < -180) lon += 360;
  return [lon, lat];
}

// The planned route: dep -> SimBrief navlog waypoints -> arr when an OFP
// exists for the sector, otherwise a great circle. Each leg is densified so
// it curves naturally on the Mercator map.
export function buildRoute(dep, arr, navlog) {
  const waypoints = [dep];
  for (const p of navlog ?? []) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) waypoints.push([p.lon, p.lat]);
  }
  waypoints.push(arr);

  const dense = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const steps = Math.max(1, Math.ceil(distNm(a, b) / 25));
    for (let s = 1; s <= steps; s++) dense.push(greatCirclePoint(a, b, s / steps));
  }
  const coords = unwrap(dense);

  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) cumulative.push(cumulative[i - 1] + distNm(coords[i - 1], coords[i]));
  return { coords, cumulative, total: cumulative[cumulative.length - 1] };
}

export function pointAlong(route, fraction) {
  const { coords, cumulative, total } = route;
  if (coords.length < 2 || total === 0) return { pos: coords[0], bearing: 0, index: 0 };
  const target = Math.min(1, Math.max(0, fraction)) * total;
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < target) i++;
  const segLen = cumulative[i] - cumulative[i - 1] || 1;
  const t = (target - cumulative[i - 1]) / segLen;
  const a = coords[i - 1];
  const b = coords[i];
  const pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { pos, bearing: bearing(a, b), index: i };
}

// Fraction of the route flown, by snapping a live position onto the route.
export function projectOntoRoute(route, point) {
  const p = unwrapNear(point, route.coords[0]);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < route.coords.length; i++) {
    const d = distNm(route.coords[i], p);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return route.total ? route.cumulative[best] / route.total : 0;
}

const mercator = ([lon, lat]) => [lon / 360, Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) / (2 * Math.PI)];
const planar = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// MapLibre's ['line-progress'] measures along the projected (Mercator) line,
// not in nautical miles, so convert a distance fraction to that scale.
export function mercatorProgress(route, fraction) {
  if (!route.mercator) {
    const pts = route.coords.map(mercator);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + planar(pts[i - 1], pts[i]));
    route.mercator = { pts, cum, total: cum[cum.length - 1] || 1 };
  }
  const { pts, cum, total } = route.mercator;
  const { pos, index } = pointAlong(route, fraction);
  if (index < 1) return 0;
  return (cum[index - 1] + planar(pts[index - 1], mercator(pos))) / total;
}
