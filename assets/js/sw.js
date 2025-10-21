/* =========================================================
   tenrusl — Service Worker (cache bust for latest JS)
   ========================================================= */

const VERSION = "v1.0.0-tenrusl-vectorizer-5"; // bump
const CORE_CACHE = `tenrusl-core-${VERSION}`;
const RUNTIME_CACHE = `tenrusl-runtime-${VERSION}`;

const OFFLINE_URL = "/pages/offline.html"; // optional

const PRECACHE = [
    "/",
    "/index.html",
    "/manifest.webmanifest",

    // CSS
    "/assets/css/theme.css",
    "/assets/css/chrome.css",
    "/assets/css/header.css",
    "/assets/css/footer.css",
    "/assets/css/app.css",

    // JS (layout + app)
    "/assets/js/theme.js",
    "/assets/js/language.js",
    "/assets/js/header.js",
    "/assets/js/footer.js",
    "/assets/js/app.js",

    // Modules in /assets/modules
    "/assets/modules/preview.js",
    "/assets/modules/export-zip.js",
    "/assets/modules/storage.js",
    "/assets/modules/parse-svg.js",
    "/assets/modules/precision.js",
    "/assets/modules/warnings.js",
    "/assets/modules/map-to-vectordrawable.js",
    "/assets/modules/normalize-transform.js",
    "/assets/modules/optimize.js",

    // i18n
    "/assets/i18n/en.json",
    "/assets/i18n/id.json",

    // Icons
    "/assets/images/icon.svg",

    // Offline
    "/pages/offline.html",
];

async function safePrecache() {
    const cache = await caches.open(CORE_CACHE);
    await Promise.allSettled(
        PRECACHE.map(async (url) => {
            try {
                const res = await fetch(url, { cache: "no-cache", credentials: "same-origin" });
                if (res && res.ok) await cache.put(url, res.clone());
            } catch {}
        })
    );
}

async function cacheFirst(cacheName, request) {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    const net = await fetch(request);
    if (net && net.ok) (await caches.open(cacheName)).put(request, net.clone());
    return net;
}

async function networkFirst(cacheName, request) {
    try {
        const net = await fetch(request);
        if (net && net.ok) (await caches.open(cacheName)).put(request, net.clone());
        return net;
    } catch {
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) return cached;
        throw new Error("networkFirst: offline & no cache");
    }
}

async function staleWhileRevalidate(cacheName, request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreVary: true });
    const fetching = fetch(request)
        .then((net) => {
            if (net && net.ok) cache.put(request, net.clone());
            return net;
        })
        .catch(() => null);
    return cached || (await fetching) || new Response("", { status: 504, statusText: "offline" });
}

function isSameOrigin(req) {
    try {
        return new URL(req.url).origin === self.location.origin;
    } catch {
        return false;
    }
}
function isAnalyticsOrAds(url) {
    const u = typeof url === "string" ? url : url.href;
    return /googletagmanager\.com|google-analytics\.com|doubleclick\.net|googlesyndication\.com/i.test(u);
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            await safePrecache();
            await self.skipWaiting();
        })()
    );
});
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter((k) => ![CORE_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});
self.addEventListener("message", (event) => {
    const { type } = event.data || {};
    if (type === "SKIP_WAITING") self.skipWaiting();
    else if (type === "CLEAR_CACHES") {
        event.waitUntil(
            (async () => {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
            })()
        );
    }
});
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    if (isAnalyticsOrAds(req.url)) return;

    const dest = req.destination;
    const isNav =
        req.mode === "navigate" ||
        (dest === "" && req.headers.get("accept")?.includes("text/html")) ||
        dest === "document";

    if (isNav) {
        event.respondWith(
            (async () => {
                try {
                    return await networkFirst(RUNTIME_CACHE, req);
                } catch {
                    return (
                        (await caches.match(OFFLINE_URL)) ||
                        (await caches.match("/index.html")) ||
                        new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
                    );
                }
            })()
        );
        return;
    }

    if (isSameOrigin(req) && ["script", "style", "image", "font", "worker"].includes(dest)) {
        event.respondWith(staleWhileRevalidate(RUNTIME_CACHE, req));
        return;
    }
    if (dest === "script") {
        event.respondWith(staleWhileRevalidate(RUNTIME_CACHE, req));
        return;
    }

    if (isSameOrigin(req)) event.respondWith(cacheFirst(RUNTIME_CACHE, req));
    else event.respondWith(staleWhileRevalidate(RUNTIME_CACHE, req));
});
