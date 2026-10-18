// Cache-first store for map tiles. NASA's night-lights tiles are served with
// no-store, so without this every page load (or OBS scene refresh) refetches
// them and the map visibly fills in. Imagery never changes, so cached tiles
// are served straight from disk.
const CACHE = "qfa100-tiles-v1";
const HOSTS = ["server.arcgisonline.com", "gibs.earthdata.nasa.gov"];
const MAX_ENTRIES = 6000;
let puts = 0;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(key);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !HOSTS.includes(new URL(request.url).hostname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request.url);
      if (hit) return hit;
      const response = await fetch(request.url, { mode: "cors" });
      if (response.ok) {
        event.waitUntil(
          cache.put(request.url, response.clone()).then(() => (++puts % 250 === 0 ? trim(cache) : undefined))
        );
      }
      return response;
    })()
  );
});
