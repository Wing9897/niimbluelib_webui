const CACHE = "niimbo-shell-v3";

const SHELL = [
  "index.html",
  "styles.css",
  "main.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "lib/niimbluelib.min.js",
  "lib/xlsx.full.min.js",
];

function shellUrl(path) {
  return new URL(path, self.location).href;
}

function relativePath(url) {
  const base = new URL("./", self.location);
  if (url.origin !== base.origin) return null;
  if (!url.pathname.startsWith(base.pathname)) return null;
  let rel = decodeURIComponent(url.pathname.slice(base.pathname.length));
  if (rel.endsWith("/")) rel = rel.slice(0, -1);
  return rel;
}

function acceptable(path, response) {
  if (!response || !response.ok) return false;
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (path.endsWith(".png")) return type.includes("image/png");
  if (path.endsWith(".css")) return type.includes("text/css");
  if (path.endsWith(".js")) return type.includes("javascript");
  if (path.endsWith(".webmanifest")) return type.includes("json");
  if (path.endsWith(".html")) return type.includes("text/html");
  return false;
}

async function cacheShell(cache) {
  await Promise.all(
    SHELL.map(async (path) => {
      const response = await fetch(shellUrl(path), { cache: "reload" });
      if (acceptable(path, response)) await cache.put(shellUrl(path), response);
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cacheShell(cache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  const rel = relativePath(url);
  if (rel === null) return;

  const isDocument = request.mode === "navigate" || rel === "" || rel === "index.html";
  if (!isDocument && !SHELL.includes(rel)) return;

  event.respondWith(networkFirst(request, isDocument ? "index.html" : rel));
});

async function networkFirst(request, path) {
  const cache = await caches.open(CACHE);
  const cacheKey = shellUrl(path);
  try {
    const response = await fetch(request);
    if (acceptable(path, response)) await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    return new Response("離線時打不開，請先連線開啟一次。", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
