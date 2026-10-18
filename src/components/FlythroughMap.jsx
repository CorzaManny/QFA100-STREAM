import { useEffect, useRef } from "react";
import { mercatorProgress, pointAlong } from "../lib/geo";
import { flythroughTiles, prefetchTiles } from "../lib/prefetch";
import {
  addAirportMarkers,
  addDaylight,
  addPlaneMarker,
  addRouteLayers,
  createMap,
  ease,
  rotatePlane,
  routeBounds,
  setFlown,
  setRoute,
} from "./mapShared";
import { MapCredit } from "./RouteMap";

// Timeline (ms). The flight itself is `flyMs`; its first and last BLEND ms
// ease between the airport orbit cameras and the chase camera.
const INTRO = 3000; // whole-route overview
const SWOOP = 3500; // overview -> orbiting the departure airport
const DEP_HOLD = 7000; // linger at the departure airport
const ARR_HOLD = 8000; // linger at the arrival airport
const PULLBACK = 3500; // arrival orbit -> overview
const HOLD = 4000; // overview again before the loop ends
const BLEND = 3500;
const DEP_ORBIT_DEG = 70;
const ARR_ORBIT_DEG = 80;

const easeSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + ((((b - a) % 360) + 540) % 360 - 180) * k;
const mix = (a, b, k) => ({
  lng: lerp(a.lng, b.lng, k),
  lat: lerp(a.lat, b.lat, k),
  zoom: lerp(a.zoom, b.zoom, k),
  pitch: lerp(a.pitch, b.pitch, k),
  bearing: lerpAngle(a.bearing, b.bearing, k),
});

// A looping, sped-up flight along the planned route: overview -> orbit the
// departure airport -> chase the plane along the route -> orbit the arrival
// airport -> pull back out -> repeat. Calls onLoopEnd after each loop.
// The day/night shading follows the simulated clock (departAt + flight time
// so far), so it shows the light the crew will actually fly through.
export default function FlythroughMap({
  route,
  dep,
  arr,
  departAt,
  blockMs,
  flyMs = 28000,
  padding = 120,
  onProgress,
  onLoopEnd,
  restartKey,
}) {
  const container = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const setup = useRef(null);
  const markers = useRef([]);
  const plane = useRef(null);
  const daylight = useRef(null);
  const report = useRef(onProgress);
  report.current = onProgress;
  const loopEnd = useRef(onLoopEnd);
  loopEnd.current = onLoopEnd;
  const clock = useRef({ departAt, blockMs });
  clock.current = { departAt, blockMs };

  useEffect(() => {
    const m = createMap(container.current);
    map.current = m;
    m.on("load", () => {
      daylight.current = addDaylight(m);
      if (clock.current.departAt) daylight.current(clock.current.departAt);
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
        const flyStart = INTRO + SWOOP + DEP_HOLD;
        const flyEnd = flyStart + s.flyMs;
        const total = flyEnd + ARR_HOLD + PULLBACK + HOLD;
        const elapsed = Math.max(0, now - s.start);
        const t = elapsed % total;
        const loop = Math.floor(elapsed / total);
        if (loop > s.loop) {
          s.loop = loop;
          loopEnd.current?.();
        }

        const p = t < flyStart ? 0 : t < flyEnd ? easeSine((t - flyStart) / s.flyMs) : 1;
        const along = pointAlong(s.route, p);
        s.camHeading = lerpAngle(s.camHeading, along.bearing, Math.min(1, dt / 1100));
        s.planeHeading = lerpAngle(s.planeHeading, along.bearing, Math.min(1, dt / 250));

        const overview = { ...s.fit, zoom: s.fit.zoom + 0.08 * Math.sin(now / 4000), pitch: 0, bearing: 0 };
        // Slow orbits around each airport, close in and pitched.
        const depT = clamp01((t - INTRO) / (SWOOP + DEP_HOLD));
        const depOrbit = {
          lng: s.start0[0],
          lat: s.start0[1],
          zoom: s.orbitZoom + 0.15 * Math.sin(now / 3000),
          pitch: 60,
          bearing: s.depHeading - DEP_ORBIT_DEG * (1 - depT),
        };
        const arrT = clamp01((t - (flyEnd - BLEND)) / (BLEND + ARR_HOLD + PULLBACK));
        const arrOrbit = {
          lng: s.end0[0],
          lat: s.end0[1],
          zoom: s.orbitZoom + 0.15 * Math.sin(now / 3000),
          pitch: 60,
          bearing: s.arrHeading + ARR_ORBIT_DEG * arrT,
        };
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

        let cam;
        if (t < INTRO) cam = overview;
        else if (t < INTRO + SWOOP) cam = mix(overview, depOrbit, ease((t - INTRO) / SWOOP));
        else if (t < flyStart) cam = depOrbit;
        else if (t < flyEnd) {
          const tf = t - flyStart;
          cam = mix(depOrbit, chase, ease(clamp01(tf / BLEND)));
          cam = mix(cam, arrOrbit, ease(clamp01((tf - (s.flyMs - BLEND)) / BLEND)));
        } else if (t < flyEnd + ARR_HOLD) cam = arrOrbit;
        else if (t < flyEnd + ARR_HOLD + PULLBACK) cam = mix(arrOrbit, overview, ease((t - flyEnd - ARR_HOLD) / PULLBACK));
        else cam = overview;

        m.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });

        if (plane.current) {
          plane.current.setLngLat(along.pos);
          rotatePlane(plane.current, s.planeHeading - cam.bearing);
        }
        if (p !== s.drawnP) {
          s.drawnP = p;
          setFlown(m, mercatorProgress(s.route, p));
        }
        const { departAt: t0, blockMs: block } = clock.current;
        if (t0 && block) daylight.current?.(t0 + p * block);
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

    let cancelled = false;
    const apply = () => {
      setup.current = null;
      setRoute(m, route);
      setFlown(m, 0);
      markers.current.forEach((mk) => mk.remove());
      plane.current?.remove();

      const start = route.coords[0];
      const end = route.coords[route.coords.length - 1];
      const cam = m.cameraForBounds(routeBounds(route), { padding, maxZoom: 8 });
      m.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: 0, bearing: 0 });

      markers.current = addAirportMarkers(m, dep, arr, start, end);
      plane.current = addPlaneMarker(m, start, 58);

      const center = cam.center.toArray ? cam.center.toArray() : [cam.center.lng, cam.center.lat];
      const depHeading = pointAlong(route, 0).bearing;
      const chaseZoom = Math.min(7.6, Math.max(5, cam.zoom + 2.3));
      const orbitZoom = Math.min(10, chaseZoom + 2);

      // Hold on the overview until the imagery the camera will fly over is
      // cached, so nothing visibly fills in mid-flight.
      prefetchTiles(flythroughTiles(route, { fitZoom: cam.zoom, chaseZoom, orbitZoom })).then(() => {
        if (cancelled) return;
        setup.current = {
          route,
          flyMs,
          start: performance.now(),
          start0: start,
          end0: end,
          fit: { lng: center[0], lat: center[1], zoom: cam.zoom },
          chaseZoom,
          orbitZoom,
          lead: Math.min(150, Math.max(30, route.total * 0.05)) / (route.total || 1),
          depHeading,
          arrHeading: pointAlong(route, 0.999).bearing,
          camHeading: depHeading,
          planeHeading: depHeading,
          drawnP: null,
          loop: 0,
        };
      });
    };

    if (ready.current) apply();
    else m.once("qfa:ready", apply);
    return () => {
      cancelled = true;
    };
  }, [route, dep?.icao, arr?.icao, flyMs, padding]);

  // Start the sequence again from the overview.
  useEffect(() => {
    if (setup.current) {
      setup.current.start = performance.now();
      setup.current.loop = 0;
    }
  }, [restartKey]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <MapCredit />
    </div>
  );
}
