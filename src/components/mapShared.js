import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createMap(container) {
  return new maplibregl.Map({
    container,
    style: STYLE,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    // Keeps the last frame in the buffer once the map goes idle, so capture
    // pipelines never grab a cleared (blank) canvas.
    preserveDrawingBuffer: true,
    center: [134, -25],
    zoom: 3,
  });
}

const FLOWN = "#a9ccff";
const GLOW = "#3d84ff";
const CLEAR = "rgba(0,0,0,0)";
const reveal = (color, upTo) => ["step", ["line-progress"], color, Math.min(1.0001, Math.max(0.00001, upTo)), CLEAR];

// Dashed full route, plus a glowing solid line for the part flown so far.
// The flown line is the whole route revealed with a line-gradient, so moving
// the plane is a cheap paint update rather than re-tiling GeoJSON (which
// lags behind the plane at fly-through speeds).
export function addRouteLayers(m, compact = false) {
  m.addSource("route-full", { type: "geojson", data: line([]) });
  m.addSource("route-flown", { type: "geojson", data: line([]), lineMetrics: true });
  const layout = { "line-cap": "round", "line-join": "round" };
  m.addLayer({
    id: "route-full",
    type: "line",
    source: "route-full",
    layout,
    paint: { "line-color": "#9cc3ff", "line-width": compact ? 2 : 3, "line-opacity": 0.75, "line-dasharray": [1.5, 2] },
  });
  m.addLayer({
    id: "route-glow",
    type: "line",
    source: "route-flown",
    layout,
    paint: { "line-gradient": reveal(GLOW, 0), "line-width": compact ? 10 : 18, "line-blur": compact ? 6 : 12, "line-opacity": 0.6 },
  });
  m.addLayer({
    id: "route-flown",
    type: "line",
    source: "route-flown",
    layout,
    paint: { "line-gradient": reveal(FLOWN, 0), "line-width": compact ? 3 : 4.5 },
  });
}

export function setRoute(m, route) {
  m.getSource("route-full").setData(line(route.coords));
  m.getSource("route-flown").setData(line(route.coords));
}

// `progress` is a mercator line-progress fraction (see mercatorProgress).
export function setFlown(m, progress) {
  m.setPaintProperty("route-glow", "line-gradient", reveal(GLOW, progress));
  m.setPaintProperty("route-flown", "line-gradient", reveal(FLOWN, progress));
}

function airportElement(apt, side) {
  const el = document.createElement("div");
  el.className = "apt-marker";
  el.innerHTML = `<div class="ring"></div><div class="core"></div><div class="apt-label ${side}"><b></b><span></span></div>`;
  el.querySelector("b").textContent = apt.icao;
  el.querySelector("span").textContent = apt.city || apt.name;
  return el;
}

// Both airport markers, each label on the side facing away from the other
// airport in the current view.
export function addAirportMarkers(m, dep, arr, start, end) {
  const a = m.project(start);
  const b = m.project(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const vertical = Math.abs(dx) < Math.abs(dy) * 0.6;
  const depSide = vertical ? "right" : dx > 0 ? (dy < 0 ? "below" : "left") : "right";
  const arrSide = vertical ? "right" : dx > 0 ? "right" : "left";
  return [
    new maplibregl.Marker({ element: airportElement(dep, depSide) }).setLngLat(start).addTo(m),
    new maplibregl.Marker({ element: airportElement(arr, arrSide) }).setLngLat(end).addTo(m),
  ];
}

// The plane icon lives in a child <svg> so it can be rotated without
// clobbering the translate() maplibre puts on the marker element.
export function addPlaneMarker(m, at, size) {
  const el = document.createElement("div");
  el.className = "plane-marker";
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="#fff" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  return new maplibregl.Marker({ element: el }).setLngLat(at).addTo(m);
}

export const rotatePlane = (marker, deg) => {
  marker.getElement().firstChild.style.transform = `rotate(${deg}deg)`;
};

export function routeBounds(route) {
  const start = route.coords[0];
  return route.coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(start, start));
}
