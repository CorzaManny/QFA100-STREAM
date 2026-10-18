import { useEffect, useRef } from "react";
import { mercatorProgress, pointAlong } from "../lib/geo";
import { addAirportMarkers, addPlaneMarker, addRouteLayers, createMap, ease, rotatePlane, routeBounds, setFlown, setRoute } from "./mapShared";
import { MapCredit } from "./RouteMap";

const INTRO = 2500;
const SWOOP = 3000;
const PULLBACK = 3000;
const HOLD = 4500;

const easeSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + ((((b - a) % 360) + 540) % 360 - 180) * k;

// A looping, sped-up flight along the planned route: overview -> swoop into
// a pitched chase camera -> fly the route -> pull back out -> repeat.
export default function FlythroughMap({ route, dep, arr, flyMs = 28000, padding = 120, onProgress }) {
  const container = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const setup = useRef(null);
  const markers = useRef([]);
  const plane = useRef(null);
  const report = useRef(onProgress);
  report.current = onProgress;

  useEffect(() => {
    const m = createMap(container.current);
    map.current = m;
    m.on("load", () => {
      addRouteLayers(m);
      ready.current = true;
      m.fire("qfa:ready");
    });

    let raf;
    let last = performance.now();
    let lastReport = 0;
    const frame = (now) => {
      const s = setup.current;
      if (s) {
        const dt = Math.min(100, now - last);
        const total = INTRO + SWOOP + s.flyMs + PULLBACK + HOLD;
        const t = (now - s.start) % total;

        let p;
        let follow; // 0 = overview camera, 1 = chase camera
        if (t < INTRO) [p, follow] = [0, 0];
        else if (t < INTRO + SWOOP) [p, follow] = [0, ease((t - INTRO) / SWOOP)];
        else if (t < INTRO + SWOOP + s.flyMs) [p, follow] = [easeSine((t - INTRO - SWOOP) / s.flyMs), 1];
        else if (t < INTRO + SWOOP + s.flyMs + PULLBACK) [p, follow] = [1, 1 - ease((t - INTRO - SWOOP - s.flyMs) / PULLBACK)];
        else [p, follow] = [1, 0];

        const along = pointAlong(s.route, p);
        s.camHeading = lerpAngle(s.camHeading, along.bearing, Math.min(1, dt / 1100));
        s.planeHeading = lerpAngle(s.planeHeading, along.bearing, Math.min(1, dt / 250));

        // Chase camera sits a little ahead of the plane, with slow sway,
        // tilt and zoom "breathing" so it never feels static.
        const ahead = pointAlong(s.route, Math.min(1, p + s.lead)).pos;
        const chase = {
          lng: ahead[0],
          lat: ahead[1],
          zoom: s.chaseZoom + 0.3 * Math.sin(now / 3700),
          pitch: 54 + 6 * Math.sin(now / 5100),
          bearing: s.camHeading + 14 * Math.sin(now / 6300),
        };
        const overview = { lng: s.fit.lng, lat: s.fit.lat, zoom: s.fit.zoom + 0.08 * Math.sin(now / 4000), pitch: 0, bearing: 0 };
        const bearing = lerpAngle(overview.bearing, chase.bearing, follow);

        m.jumpTo({
          center: [lerp(overview.lng, chase.lng, follow), lerp(overview.lat, chase.lat, follow)],
          zoom: lerp(overview.zoom, chase.zoom, follow),
          pitch: lerp(overview.pitch, chase.pitch, follow),
          bearing,
        });

        if (plane.current) {
          plane.current.setLngLat(along.pos);
          rotatePlane(plane.current, s.planeHeading - bearing);
        }
        if (p !== s.drawnP) {
          s.drawnP = p;
          setFlown(m, mercatorProgress(s.route, p));
        }
        if (now - lastReport > 120) {
          lastReport = now;
          report.current?.(p);
        }
      }
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      m.remove();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !route || !dep || !arr) return;

    const apply = () => {
      setRoute(m, route);
      markers.current.forEach((mk) => mk.remove());
      plane.current?.remove();

      const start = route.coords[0];
      const end = route.coords[route.coords.length - 1];
      const cam = m.cameraForBounds(routeBounds(route), { padding, maxZoom: 8 });
      m.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: 0, bearing: 0 });

      markers.current = addAirportMarkers(m, dep, arr, start, end);
      plane.current = addPlaneMarker(m, start, 58);

      const center = cam.center.toArray ? cam.center.toArray() : [cam.center.lng, cam.center.lat];
      const heading = pointAlong(route, 0).bearing;
      setup.current = {
        route,
        flyMs,
        start: performance.now(),
        fit: { lng: center[0], lat: center[1], zoom: cam.zoom },
        chaseZoom: Math.min(7.6, Math.max(5, cam.zoom + 2.3)),
        lead: Math.min(150, Math.max(30, route.total * 0.05)) / (route.total || 1),
        camHeading: heading,
        planeHeading: heading,
        drawnP: null,
      };
    };

    if (ready.current) apply();
    else m.once("qfa:ready", apply);
  }, [route, dep?.icao, arr?.icao, flyMs, padding]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <MapCredit />
    </div>
  );
}
