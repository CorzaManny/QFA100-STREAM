import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { pointAlong, routeSlice } from "../lib/geo";

// Night-time look without an API key: Esri World Imagery, darkened and
// desaturated, under NASA's Black Marble city-lights layer.
const STYLE = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 18,
    },
    lights: {
      type: "raster",
      tiles: [
        "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
      ],
      tileSize: 256,
      maxzoom: 8,
    },
    tint: {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[[-540, -85], [540, -85], [540, 85], [-540, 85], [-540, -85]]] },
      },
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#020611" } },
    {
      id: "imagery",
      type: "raster",
      source: "imagery",
      paint: { "raster-brightness-max": 1, "raster-saturation": -0.2, "raster-contrast": 0.15 },
    },
    { id: "tint", type: "fill", source: "tint", paint: { "fill-color": "#0b2a66", "fill-opacity": 0.32 } },
    {
      id: "lights",
      type: "raster",
      source: "lights",
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.42, 7, 0.32, 10, 0.08],
        "raster-contrast": 0.25,
        "raster-fade-duration": 0,
      },
    },
  ],
};

const line = (coordinates) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } });
const empty = line([]);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function airportMarker(apt, side) {
  const el = document.createElement("div");
  el.className = "apt-marker";
  el.innerHTML = `<div class="ring"></div><div class="core"></div><div class="apt-label ${side}"><b></b><span></span></div>`;
  el.querySelector("b").textContent = apt.icao;
  el.querySelector("span").textContent = apt.city || apt.name;
  return el;
}

export default function RouteMap({ route, dep, arr, progress = 0, heading, padding = 80, compact = false, focus = "route" }) {
  const container = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const markers = useRef([]);
  const plane = useRef(null);
  const tween = useRef({ from: 0, to: 0, start: 0, duration: 1 });
  const shown = useRef(0);
  const latest = useRef({ route, progress, heading });
  latest.current = { route, progress, heading };

  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Keeps the last frame in the buffer once the map goes idle, so
      // capture pipelines never grab a cleared (blank) canvas.
      preserveDrawingBuffer: true,
      center: [134, -25],
      zoom: 3,
    });
    map.current = m;
    m.on("load", () => {
      m.addSource("route-full", { type: "geojson", data: empty });
      m.addSource("route-flown", { type: "geojson", data: empty });
      m.addLayer({
        id: "route-full",
        type: "line",
        source: "route-full",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#9cc3ff", "line-width": compact ? 2 : 3, "line-opacity": 0.75, "line-dasharray": [1.5, 2] },
      });
      m.addLayer({
        id: "route-glow",
        type: "line",
        source: "route-flown",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#3d84ff", "line-width": compact ? 10 : 18, "line-blur": compact ? 6 : 12, "line-opacity": 0.6 },
      });
      m.addLayer({
        id: "route-flown",
        type: "line",
        source: "route-flown",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#a9ccff", "line-width": compact ? 3 : 4.5 },
      });
      ready.current = true;
      m.fire("qfa:ready");
    });

    let raf;
    let drawn = null;
    const frame = () => {
      const { route: r, heading: h } = latest.current;
      if (ready.current && r) {
        const tw = tween.current;
        const t = Math.min(1, Math.max(0, (performance.now() - tw.start) / tw.duration));
        shown.current = tw.from + (tw.to - tw.from) * ease(t);
        // Re-tiling GeoJSON every frame starves MapLibre's worker, so only
        // push a new line when the plane has visibly moved.
        if (drawn == null || drawn.route !== r || Math.abs(drawn.p - shown.current) > 0.0004 || (t >= 1 && drawn.p !== shown.current)) {
          drawn = { route: r, p: shown.current };
          const along = pointAlong(r, shown.current);
          m.getSource("route-flown")?.setData(line(routeSlice(r, shown.current)));
          if (plane.current) {
            plane.current.setLngLat(along.pos);
            const bearing = t >= 1 && h != null ? h : along.bearing;
            plane.current.getElement().firstChild.style.transform = `rotate(${bearing}deg)`;
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
      m.getSource("route-full").setData(line(route.coords));
      markers.current.forEach((mk) => mk.remove());
      plane.current?.remove();

      const start = route.coords[0];
      const end = route.coords[route.coords.length - 1];
      const bounds = route.coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(start, start));

      if (focus === "arrival") {
        m.setPaintProperty("imagery", "raster-brightness-max", 1);
        m.setPaintProperty("tint", "fill-opacity", 0.12);
        m.jumpTo({ center: end, zoom: 12.6, pitch: 55, bearing: -20, padding: { left: 760, top: 0, right: 0, bottom: 120 } });
      } else {
        const cam = m.cameraForBounds(bounds, { padding, maxZoom: 9 });
        m.jumpTo({ center: cam.center, zoom: cam.zoom - (compact ? 0.3 : 0.7) });
        m.easeTo({ center: cam.center, zoom: cam.zoom, duration: compact ? 2500 : 4500, easing: (t) => 1 - (1 - t) ** 3 });
      }

      // Put each label on the side facing away from the other airport.
      const a = m.project(start);
      const b = m.project(end);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const vertical = Math.abs(dx) < Math.abs(dy) * 0.6;
      const depSide = vertical ? "right" : dx > 0 ? (dy < 0 ? "below" : "left") : "right";
      const arrSide = vertical ? "right" : dx > 0 ? "right" : "left";

      if (focus !== "arrival") {
        markers.current = [
          new maplibregl.Marker({ element: airportMarker(dep, depSide) }).setLngLat(start).addTo(m),
          new maplibregl.Marker({ element: airportMarker(arr, arrSide) }).setLngLat(end).addTo(m),
        ];
        const el = document.createElement("div");
        el.className = "plane-marker";
        const size = compact ? 34 : 54;
        el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="#fff" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
        plane.current = new maplibregl.Marker({ element: el }).setLngLat(start).addTo(m);
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
      <div className="map-credit">Imagery: Esri, Maxar, Earthstar Geographics · Night lights: NASA</div>
    </div>
  );
}
