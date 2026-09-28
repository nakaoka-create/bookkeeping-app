// バージョンを上げるたびに CACHE_NAME を変えると、旧キャッシュが確実に破棄される
const CACHE_NAME = 'bookkeeping-v8';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// ネットワーク優先：オンラインなら常に最新を取得してキャッシュを更新し、
// オフライン（取得失敗）のときだけキャッシュを返す。
// 同一オリジンのGETのみ対象。Firebase/Google等の外部通信には介入しない。
self.addEventListener('fetch', function(event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(function(res) {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function() {
      return caches.match(req).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
