import { isPublicCachePath, isSafeCacheResponse, isVersionedStaticPath, isIconPath } from "./sw-policy.js";

const CACHE_PREFIX = "coserve-public-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const PRECACHE = ["/en/offline", "/hi/offline", "/en/manifest.webmanifest", "/hi/manifest.webmanifest", "/icons/coserve-192.png", "/icons/coserve-512.png"];

async function cacheApproved(request, response) {
  if (isSafeCacheResponse(response)) await (await caches.open(CACHE_NAME)).put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const path of PRECACHE) {
      const response = await fetch(path);
      if (isSafeCacheResponse(response)) await cache.put(path, response);
    }
  })());
});
self.addEventListener("activate", (event) => { event.waitUntil(Promise.all([caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))), self.clients.claim()])); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (isVersionedStaticPath(url.pathname) || isIconPath(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheApproved(request, response))));
    return;
  }
  if (request.mode !== "navigate") return;
  if (!isPublicCachePath(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname.startsWith("/hi/") ? "/hi/offline" : "/en/offline")));
    return;
  }
  event.respondWith(fetch(request).then((response) => cacheApproved(request, response)).catch(async () => (await caches.match(request)) || caches.match(url.pathname.startsWith("/hi/") ? "/hi/offline" : "/en/offline")));
});
