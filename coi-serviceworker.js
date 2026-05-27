/* coi-serviceworker — enables SharedArrayBuffer on GitHub Pages
   by injecting Cross-Origin-Isolation headers via service worker.
   Required for transformers.js WASM threading and WebGPU.
   Source pattern: https://github.com/gzuidhof/coi-serviceworker */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', function (event) {
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 0) return response
        const newHeaders = new Headers(response.headers)
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      })
      .catch(e => console.error(e))
  )
})
