const CACHE_NAME = "geoapp-shell-phase8-landmarks-v1";
const scopeUrl = new URL(self.registration.scope);
const shellUrl = scopeUrl.href;
const manifestUrl = new URL("asset-manifest.json", scopeUrl).href;

async function precacheApplication() {
  const manifestResponse = await fetch(manifestUrl, { cache: "no-cache" });

  if (!manifestResponse.ok) {
    throw new Error("GeoApp-Assetmanifest konnte nicht geladen werden.");
  }

  const manifest = await manifestResponse.json();
  const assetUrls = new Set([
    shellUrl,
    manifestUrl,
    new URL("assets/visual/v1/flags/de.svg", scopeUrl).href
  ]);

  const shellEntryKeys = new Set(["index.html", "src/geo/GeoMap.tsx"]);
  for (const [key, entry] of Object.entries(manifest)) {
    if (!shellEntryKeys.has(key)) continue;
    if (!entry || typeof entry !== "object") continue;
    for (const path of [
      entry.file,
      ...(Array.isArray(entry.css) ? entry.css : []),
      ...(Array.isArray(entry.assets) ? entry.assets : [])
    ]) {
      if (typeof path === "string") {
        assetUrls.add(new URL(path, scopeUrl).href);
      }
    }
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([...assetUrls]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplication().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("geoapp-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== scopeUrl.origin) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          if (request.mode === "navigate") {
            const shell = await caches.match(shellUrl, { ignoreVary: true });
            if (shell) return shell;
          }
          throw new Error("Offline und Ressource nicht im GeoApp-Cache.");
        });
    })
  );
});
