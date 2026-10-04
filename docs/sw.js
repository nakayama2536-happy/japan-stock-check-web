const CACHE_PREFIX = "jpstock-v";
const CACHE = "jpstock-v1-12-0-evidence-workflows";
const SHELL = ["./", "index.html", "style.css?v=1.12.0", "decision-experience.css?v=1.12.0", "decision-experience.js?v=1.12.0", "active-universe.js?v=1.12.0", "quality-details.css?v=1.12.0", "quality-details.js?v=1.12.0", "app.js?v=1.12.0","deep-dive-bundle.js?v=1.12.0","review-history.js?v=1.12.0", "evidence-workflows.js?v=1.12.0", "evidence-workflows-ui.js?v=1.12.0", "evidence-workflows.css?v=1.12.0", "manifest.webmanifest", "icons/icon-192.png?v=1.12.0", "icons/icon-512.png?v=1.12.0"];
function isDynamic(url) { return url.pathname.endsWith(".json"); }

// Cache contract: COM-CACHE-002/003, revision 1 (2026-09-27).
// This namespace prevents accidental cross-app use; it is not an origin security boundary.
const CACHE_BUSTER_PARAM = "t";
const APP_SCOPE = new URL(self.registration.scope);
function inAppScope(url) {
  return url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname);
}
function dynamicKey(request) {
  const url = new URL(request.url);
  // Only the app-specific documented freshness nonce is discarded.
  // Keep ticker, period, revision and ALL other query parameters.
  url.searchParams.delete(CACHE_BUSTER_PARAM);
  return new Request(url.href, {method: "GET", headers: request.headers});
}
async function ownMatch(key) {
  try { return await (await caches.open(CACHE)).match(key); }
  catch (_) { return undefined; }
}
async function storeResponse(key, response) {
  // A storage/quota failure must not discard a successful network response.
  if (!response.ok || response.redirected) return;
  try { await (await caches.open(CACHE)).put(key, response.clone()); }
  catch (_) { /* Cache is best effort; never touch localStorage/IndexedDB. */ }
}
async function networkFirst(request, cacheKey = request) {
  let response;
  try { response = await fetch(request, {cache: "no-store"}); }
  catch (_) { return (await ownMatch(cacheKey)) || Response.error(); }
  // Do not disguise HTTP errors as success or overwrite the last cached value.
  await storeResponse(cacheKey, response);
  return response;
}
async function shellFirst(request) {
  const cached = await ownMatch(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await storeResponse(request, response);
    return response;
  } catch (_) { return Response.error(); }
}
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  // Other applications and external resources are not intercepted or cached.
  if (request.method !== "GET" || !inAppScope(url)) return;
  if (isDynamic(url)) {
    const canonicalKey = dynamicKey(request);
    event.respondWith(networkFirst(request, canonicalKey));
  } else if (request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(shellFirst(request));
  }
});
