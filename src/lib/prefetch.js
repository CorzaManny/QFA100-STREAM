import { TILE_SOURCES } from "../components/mapShared";

const RAD = Math.PI / 180;

function tileOf(lon, lat, z) {
  const n = 2 ** z;
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  const x = Math.floor(((wrapped + 180) / 360) * n);
  const clampedLat = Math.max(-85.05, Math.min(85.05, lat));
  const y = Math.floor(((1 - Math.log(Math.tan(clampedLat * RAD) + 1 / Math.cos(clampedLat * RAD)) / Math.PI) / 2) * n);
  return [Math.min(n - 1, Math.max(0, x)), Math.min(n - 1, Math.max(0, y))];
}

function addAround(set, lon, lat, z, radius) {
  const n = 2 ** z;
  const [cx, cy] = tileOf(lon, lat, z);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy;
      if (y >= 0 && y < n) set.add(`${z}/${(((cx + dx) % n) + n) % n}/${y}`);
    }
  }
}

// Every tile the fly-through camera will look at: the whole-route overview,
// a corridor along the route at the chase zooms, and close in around both
// airports for the orbits.
export function flythroughTiles(route, { fitZoom, chaseZoom, orbitZoom }) {
  const set = new Set();
  const [start, end] = [route.coords[0], route.coords[route.coords.length - 1]];

  for (const z of [Math.floor(fitZoom), Math.ceil(fitZoom)]) {
    for (const c of route.coords) addAround(set, c[0], c[1], z, 1);
  }
  for (let z = Math.max(0, Math.floor(chaseZoom) - 2); z <= Math.ceil(chaseZoom); z++) {
    for (const c of route.coords) addAround(set, c[0], c[1], z, 2);
  }
  for (let z = Math.floor(orbitZoom) - 1; z <= Math.ceil(orbitZoom); z++) {
    addAround(set, start[0], start[1], z, 3);
    addAround(set, end[0], end[1], z, 3);
  }
  return set;
}

export function airportTiles([lon, lat], minZoom, maxZoom, radius = 3) {
  const set = new Set();
  for (let z = minZoom; z <= maxZoom; z++) addAround(set, lon, lat, z, radius);
  return set;
}

function urlsFor(tiles) {
  const urls = new Set();
  for (const key of tiles) {
    const [z, x, y] = key.split("/").map(Number);
    for (const src of TILE_SOURCES) {
      // Above a source's max zoom MapLibre overzooms its max-zoom parent tile.
      const dz = Math.max(0, z - src.maxzoom);
      urls.add(src.url.replace("{z}", z - dz).replace("{x}", x >> dz).replace("{y}", y >> dz));
    }
  }
  return [...urls];
}

// Waits briefly for the tile service worker so the downloads land in its
// cache (otherwise NASA's no-store tiles wouldn't be kept).
async function swReady() {
  if (!("serviceWorker" in navigator)) return;
  const timeout = (ms) => new Promise((r) => setTimeout(r, ms));
  await Promise.race([navigator.serviceWorker.ready, timeout(3000)]);
  if (!navigator.serviceWorker.controller) {
    await Promise.race([new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true })), timeout(2000)]);
  }
}

// Downloads the tiles a few at a time; resolves when done or after
// `timeoutMs`, whichever comes first, so a slow network never stalls a scene.
export async function prefetchTiles(tiles, { concurrency = 8, timeoutMs = 25_000 } = {}) {
  await swReady();
  const queue = urlsFor(tiles);
  const worker = async () => {
    while (queue.length) {
      const url = queue.pop();
      try {
        await fetch(url, { mode: "cors" });
      } catch {
        // a missing tile just loads normally later
      }
    }
  };
  const all = Promise.all(Array.from({ length: concurrency }, worker));
  await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
}
