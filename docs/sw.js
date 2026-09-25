const CACHE="jpstock-v1-4-1";
const SHELL=["./","index.html","style.css?v=1.4.1","app.js?v=1.4.1","manifest.webmanifest","icons/icon-192.png?v=1.4.1","icons/icon-512.png?v=1.4.1"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function networkFirst(req){try{const r=await fetch(req,{cache:"no-store"});if(r.ok)(await caches.open(CACHE)).put(req,r.clone());return r}catch(e){return(await caches.match(req))||Response.error()}}
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(e.request.mode==="navigate"||u.pathname.endsWith(".json"))e.respondWith(networkFirst(e.request));else e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))});
