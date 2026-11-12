/* 電気・設備の計算ツール集 Service Worker (v1)
   同フォルダの全HTML・manifest・アイコン・共通アセットをキャッシュし、
   オフラインでも開けるようにする（cache-first）。 */
var CACHE_NAME = 'denki-tools-v1';
var ASSETS = [
  './',
  './index.html',
  './voltage-drop.html',
  './capacitor.html',
  './illuminance.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './pwa.css',
  './pwa.js',
  './voice-parse.js',
  './voice.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) { return caches.delete(key); }
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') { return; }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (cached) {
      if (cached) { return cached; }
      return fetch(request).then(function (response) {
        // 取得できた同一オリジンの応答はキャッシュに追加する
        if (response && response.ok && new URL(request.url).origin === self.location.origin) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        // オフラインで未キャッシュのページ遷移はトップへフォールバック
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});
