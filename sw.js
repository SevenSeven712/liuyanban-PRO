// Service Worker disabled to prevent caching issues.
self.addEventListener('install', function(e) {
    self.skipWaiting();
});
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        }).then(function() {
            self.clients.claim();
        })
    );
});
// 不拦截任何请求，直接走网络
self.addEventListener('fetch', function(e) {
    return;
});
