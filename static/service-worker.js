const CACHE_NAME = 'static-cache';

const CACHED_URLS = [
    '/',
    '/styles/styles.css',
    '/scripts/main.js',
    '/manifest.json',
    '/service-worker.js',
    '/scripts/html5-qrcode.min.js',
    '/img/icon-192.webp',
    '/img/search-icon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(CACHED_URLS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (CACHED_URLS.includes(url.pathname)) {
        event.respondWith(caches.match(event.request));
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return Promise.reject(new TypeError('Failed to fetch'));
        })
    );
});
