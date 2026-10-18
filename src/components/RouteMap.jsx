import { useEffect, useRef } from "react";
import { mercatorProgress, pointAlong } from "../lib/geo";
import { airportTiles, prefetchTiles } from "../lib/prefetch";
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

export function MapCredit() {
  return <div className="map-credit">Imagery: Esri, Maxar, Earthstar Geographics · Night lights: NASA</div>;
}

// `sunTime` (ms) sets the day/night shading - the moment the shown plane
// position corresponds to.
export default function RouteMap({ route, dep, arr, progress = 0, heading, sunTime, padding = 80, compact = false, focus = "route" }) {
  const container = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const markers = useRef([]);
  const plane = useRef(null);
  const daylight = useRef(null);
  const tween = useRef({ from: 0, to: 0, start: 0, duration: 1 });
  const shown = useRef(0);
  const latest = useRef({ route, progress, heading, sunTime });
  latest.current = { route, progress, heading, sunTime };

  useEffect(() => {
    const m = createMap(container.current);
    map.current = m;
    m.on("load", () => {
      daylight.current = addDaylight(m);
      addRouteLayers(m, compact);
      ready.current = true;
      m.fire("qfa:ready");
    });

    let raf;
    let drawn = null;
    const frame = () => {
      const { route: r, heading: h, sunTime: sun } = latest.current;
      if (sun) daylight.current?.(sun);
      if (ready.current && r) {
        const tw = tween.current;
        const t = Math.min(1, Math.max(0, (performance.now() - tw.start) / tw.duration));
        shown.current = tw.from + (tw.to - tw.from) * ease(t);
        if (drawn == null || drawn.route !== r || drawn.p !== shown.current) {
          drawn = { route: r, p: shown.current };
          const along = pointAlong(r, shown.current);
          setFlown(m, mercatorProgress(r, shown.current));
          if (plane.current) {
            plane.current.setLngLat(along.pos);
            rotatePlane(plane.current, t >= 1 && h != null ? h : along.bearing);
          }
        }
        if (focus === "arrival") m.setBearing((m.getBearing() + 0.025) % 360);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      m.remove();
    };
  }, [compact, focus]);

  // New route: redraw everything and fly the plane in from the departure.
  useEffect(() => {
    const m = map.current;
    if (!m || !route || !dep || !arr) return;

    const apply = () => {
      setRoute(m, route);
      markers.current.forEach((mk) => mk.remove());
      plane.current?.remove();

      const start = route.coords[0];
      const end = route.coords[route.coords.length - 1];

      if (focus === "arrival") {
        m.setPaintProperty("imagery", "raster-brightness-max", 1);
        m.setPaintProperty("tint", "fill-opacity", 0.12);
        m.jumpTo({ center: end, zoom: 12.6, pitch: 55, bearing: -20, padding: { left: 760, top: 0, right: 0, bottom: 120 } });
        prefetchTiles(airportTiles(end, 10, 13, 4));
      } else {
        const cam = m.cameraForBounds(routeBounds(route), { padding, maxZoom: 9 });
        m.jumpTo({ center: cam.center, zoom: cam.zoom - (compact ? 0.3 : 0.7) });
        m.easeTo({ center: cam.center, zoom: cam.zoom, duration: compact ? 2500 : 4500, easing: (t) => 1 - (1 - t) ** 3 });
        markers.current = addAirportMarkers(m, dep, arr, start, end);
        plane.current = addPlaneMarker(m, start, compact ? 34 : 54);
      }

      tween.current = { from: 0, to: latest.current.progress, start: performance.now() + 600, duration: 3800 };
    };

    if (ready.current) apply();
    else m.once("qfa:ready", apply);
  }, [route, dep?.icao, arr?.icao, padding, compact, focus]);

  // Progress updates after the intro: glide to the new position.
  useEffect(() => {
    const tw = tween.current;
    if (performance.now() < tw.start + tw.duration) {
      tw.to = progress;
      return;
    }
    tween.current = { from: shown.current, to: progress, start: performance.now(), duration: 1500 };
  }, [progress]);

  return (
    <div style={{ position: "absolute", inset: 0 }} className={compact ? "compact" : ""}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <MapCredit />
    </div>
  );
}
