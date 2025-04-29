const CACHE_NAME = 'attendance-cache-v10';
const urlsToCache = [
    '/demo/',
    '/demo/index.html',
    '/demo/styles.css',
    '/demo/main.js',
    '/demo/manifest.json',
    '/demo/html5-qrcode.min.js',
    '/demo/images/logo.jpg',
    '/demo/images/icon.png'
];

self.addEventListener('install', event => {
    console.log('Service Worker đang được cài đặt...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Mở cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting(); // Bỏ qua trạng thái chờ và kích hoạt ngay lập tức
});



// Xử lý riêng cho các request:
// - Request method khác GET (ví dụ POST) sẽ được chuyển thẳng ra mạng
// - Request điều hướng (navigate) được ưu tiên mạng rồi fallback về cache nếu không có mạng
// - Các GET request thông thường dùng chiến lược cache-first
self.addEventListener('fetch', event => {
    const request = event.request;

    // Với các request không phải GET (ví dụ như POST dùng để đăng nhập hay gửi dữ liệu),
    // chúng ta chuyển thẳng ra mạng để không can thiệp bởi cache.
    if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
    }

    // Nếu là request điều hướng (trang HTML) thì dùng chiến lược network-first,
    // nếu không có mạng thì fallback về cached index.html.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Các GET request thông thường: trả về cache nếu có, nếu không thì network.
    event.respondWith(
        caches.match(request).then(response => {
            return response || fetch(request);
        })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.map(key => {
                    if (!cacheWhitelist.includes(key)) {
                        console.log('Xoá cache cũ:', key);
                        return caches.delete(key);
                    }
                })
            )
        )
    );
});


