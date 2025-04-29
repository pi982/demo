const CACHE_NAME = 'attendance-cache-v10';
const urlsToCache = [
    '/demo/',
    '/demon/index.html',
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

self.addEventListener('sync', event => {
    if (event.tag === 'syncAttendance') {
        event.waitUntil(checkOfflineRecordsAndNotify());
    }
});

async function checkOfflineRecordsAndNotify() {
    try {
        // Mở IndexedDB (đảm bảo rằng hàm openAttendanceDB() có sẵn trong Service Worker)
        const db = await openAttendanceDB();
        const transaction = db.transaction("offlineAttendance", "readonly");
        const store = transaction.objectStore("offlineAttendance");

        // Lấy toàn bộ bản ghi offline
        const records = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Lỗi truy xuất bản ghi offline từ IndexedDB");
        });

        // Nếu có bản ghi offline, hiển thị thông báo push
        if (records && records.length > 0) {
            await self.registration.showNotification("Thông báo đồng bộ", {
                body: `Có ${records.length} bản ghi offline cần đồng bộ!`,
                icon: "/images/icon.png",
                vibrate: [200, 100, 200]
            });

            // Nếu muốn, sau khi thông báo bạn có thể gọi fetch gửi lên server và xoá dữ liệu offline sau khi đồng bộ thành công.
            // Ví dụ:
            //
            // const combinedRecords = processRecords(records); // Giả sử hàm xử lý dữ liệu offline
            // await fetch(webAppUrl, {
            //     method: "POST",
            //     mode: "no-cors",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ records: combinedRecords })
            // });
            // clearOfflineAttendanceStore();
        }
    } catch (err) {
        console.error("Lỗi khi kiểm tra/dồng bộ offline attendance:", err);
        // Tùy chọn: thông báo lỗi cho người dùng nếu cần
        await self.registration.showNotification("Lỗi đồng bộ", {
            body: "Có lỗi xảy ra khi kiểm tra bản ghi offline.",
            icon: "/images/icon.png"
        });
    }
}

