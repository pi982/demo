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

self.addEventListener('fetch', event => {
    // Chỉ xử lý các request GET
    if (event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            // Tìm phản hồi đã lưu trong cache (nếu có)
            return cache.match(event.request).then(cachedResponse => {
                // Đồng thời bắt đầu request từ mạng
                const networkFetch = fetch(event.request)
                    .then(networkResponse => {
                        // Nếu fetch thành công và response là hợp lệ, cập nhật cache
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error("Lỗi fetch từ network:", error);
                        // Nếu network fetch thất bại, fallback về cachedResponse nếu có
                        return cachedResponse;
                    });
                
                // Trả về cachedResponse nếu có, hoặc chờ networkFetch nếu không có cachedResponse
                return cachedResponse || networkFetch;
            });
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

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'offlineNotification') {
        // Kiểm tra biến cờ: chỉ hiển thị thông báo nếu chưa hiển thị lần nào
        if (!hasShownOfflineNotification) {
            self.registration.showNotification("Mất kết nối", {
                body: "Bạn đang mất kết nối Internet. Vui lòng kiểm tra lại.",
                icon: "/demo/images/icon.png",
                tag: "offline-notification"
            });
            hasShownOfflineNotification = true;
        } else {
            console.log("Thông báo offline đã được hiển thị rồi.");
        }
    }
});



