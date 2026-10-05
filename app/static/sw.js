/* Paramount Academy Lite v2 - service worker.
   - Static files: cache first.
   - Student pages (/s..., /receipt/...): network first, fall back to the last saved copy.
   - Course files: served from cache only if the student tapped "Save offline". */
const VERSION = "v2.0";
const STATIC = "tpa-static-" + VERSION;
const PAGES = "tpa-pages";
const FILES = "tpa-files";
const SHELL = ["/static/app.css?v=2.0", "/static/app.js?v=2.0", "/static/theme.js?v=2.0", "/static/offline.html",
               "/static/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith("tpa-static-") && k !== STATIC).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

const offlinePage = () => caches.match("/static/offline.html");
const isStudentPage = (p) => p === "/s" || p.startsWith("/s/") || p.startsWith("/receipt/");

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/static/") || url.pathname === "/manifest.webmanifest") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  if (url.pathname.startsWith("/files/") || url.pathname === "/upi-qr") {
    e.respondWith(caches.open(FILES).then((c) => c.match(url.pathname)).then((hit) => hit || fetch(req).then((res) => {
      if (url.pathname === "/upi-qr" && res.ok) { const copy = res.clone(); caches.open(FILES).then((c) => c.put(url.pathname, copy)); }
      return res;
    })));
    return;
  }

  if (req.mode !== "navigate") return;

  if (isStudentPage(url.pathname)) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(url.pathname + url.search, copy));
        }
        return res;
      }).catch(() => caches.open(PAGES)
        .then((c) => c.match(url.pathname + url.search))
        .then((hit) => hit || offlinePage()))
    );
    return;
  }

  e.respondWith(fetch(req).catch(offlinePage));
});
