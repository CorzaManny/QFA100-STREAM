import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { subsolarPoint } from "../lib/sun";

export const TILE_SOURCES = [
  { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maxzoom: 18 },
  {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
    maxzoom: 8,
  },
];

// Night-time look without an API key: Esri World Imagery, darkened and
// desaturated, under NASA's Black Marble city-lights layer.
const STYLE = {
  version: 8,
  sources: {
    imagery: { type: "raster", tiles: [TILE_SOURCES[0].url], tileSize: 256, maxzoom: TILE_SOURCES[0].maxzoom },
    lights: { type: "raster", tiles: [TILE_SOURCES[1].url], tileSize: 256, maxzoom: TILE_SOURCES[1].maxzoom },
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
        "raster-fade-duration": 250,
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
    // Keep every tile from the loop in memory so later loops never refetch.
    maxTileCacheSize: 4000,
    center: [134, -25],
    zoom: 3,
  });
}

const MAX_LAT = 85.0511;
const DAYLIGHT_SIZE = 400;
const RAD = Math.PI / 180;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Day/night shading for a moment in time: night shade with a soft twilight
// edge and a warm glow along the terminator. Drawn per pixel into a canvas in
// Web Mercator (so it lines up with the map) and placed under the city
// lights, so they still glow on the night side. Returns setTime(ms).
export function addDaylight(m, beforeLayerId = "lights") {
  const canvas = document.createElement("canvas");
  canvas.width = DAYLIGHT_SIZE;
  canvas.height = DAYLIGHT_SIZE;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(DAYLIGHT_SIZE, DAYLIGHT_SIZE);
  const rows = Array.from({ length: DAYLIGHT_SIZE }, (_, y) => {
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / DAYLIGHT_SIZE)));
    return [Math.sin(lat), Math.cos(lat)];
  });
  const lons = Array.from({ length: DAYLIGHT_SIZE }, (_, x) => -180 + (360 * (x + 0.5)) / DAYLIGHT_SIZE);
  const cosCol = new Float32Array(DAYLIGHT_SIZE);

  m.addSource("daylight", {
    type: "canvas",
    canvas,
    animate: false,
    coordinates: [
      [-180, MAX_LAT],
      [180, MAX_LAT],
      [180, -MAX_LAT],
      [-180, -MAX_LAT],
    ],
  });
  m.addLayer({ id: "daylight", type: "raster", source: "daylight", paint: { "raster-fade-duration": 0 } }, beforeLayerId);

  let drawnMinute = null;
  let drawnAt = 0;
  return (ms) => {
    const minute = Math.round(ms / 60_000);
    const now = performance.now();
    if (minute === drawnMinute || now - drawnAt < 50) return;
    drawnMinute = minute;
    drawnAt = now;

    const sub = subsolarPoint(ms);
    const sinD = Math.sin(sub.lat * RAD);
    const cosD = Math.cos(sub.lat * RAD);
    for (let x = 0; x < DAYLIGHT_SIZE; x++) cosCol[x] = Math.cos((lons[x] - sub.lon) * RAD);

    const px = image.data;
    let i = 0;
    for (let y = 0; y < DAYLIGHT_SIZE; y++) {
      const [sinL, cosL] = rows[y];
      for (let x = 0; x < DAYLIGHT_SIZE; x++, i += 4) {
        const elev = Math.asin(sinL * sinD + cosL * cosD * cosCol[x]) / RAD;
        const night = 0.6 * smoothstep(2, -12, elev);
        const glow = 0.3 * Math.max(0, 1 - Math.abs(elev + 1) / 7);
        const a = night + glow * (1 - night);
        if (a <= 0.001) {
          px[i + 3] = 0;
          continue;
        }
        const g = (glow * (1 - night)) / a;
        px[i] = 2 + (255 - 2) * g;
        px[i + 1] = 6 + (125 - 6) * g;
        px[i + 2] = 20 + (45 - 20) * g;
        px[i + 3] = a * 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    // A paused canvas source only re-uploads while playing.
    const source = m.getSource("daylight");
    source.play();
    requestAnimationFrame(() => source.pause());
  };
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
