/**
 * Service Worker for Sumanglam Banking Software
 * Provides offline capability and static asset caching
 */

const CACHE_NAME = 'sumanglam-banking-v1.0';
const STATIC_CACHE_NAME = 'sumanglam-static-v1.0';

// Assets to cache for offline use
const STATIC_ASSETS = [
    './',
    './index.html',
    './assets/styles.css',
    './js/app.js',
    './js/db.js',
    './js/auth.js',
    './js/ui/router.js',
    './js/ui/operators.js',
    './js/ui/accounts.js',
    './js/ui/loans.js',
    './js/ui/deposits.js',
    './js/ui/reports.js',
    './js/ui/system.js',
    './vendor/dexie.min.js'
];

// URLs that should always be fetched from network
const NETWORK_ONLY = [
    // Add any external APIs or resources here
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached successfully');
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache static assets:', error);
            })
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Delete old caches
                        if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                // Claim control of all clients immediately
                return self.clients.claim();
            })
    );
});

/**
 * Fetch Event Handler
 */
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle network-only resources
    if (NETWORK_ONLY.some(pattern => url.pathname.includes(pattern))) {
        event.respondWith(fetch(request));
        return;
    }
    
    // Use cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Return cached version
                    return cachedResponse;
                }
                
                // Fetch from network
                return fetch(request)
                    .then(networkResponse => {
                        // Check if valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // Clone the response as it can only be consumed once
                        const responseToCache = networkResponse.clone();
                        
                        // Cache the fetched resource for static assets
                        if (isStaticAsset(url.pathname)) {
                            caches.open(STATIC_CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, responseToCache);
                                });
                        }
                        
                        return networkResponse;
                    })
                    .catch(error => {
                        console.log('Service Worker: Fetch failed, serving offline fallback');
                        
                        // Return offline fallback for HTML pages
                        if (request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                        
                        // For other resources, return a simple error response
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/**
 * Background Sync (for future implementation)
 */
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'banking-data-sync') {
        // Implement background sync for banking data if needed
        event.waitUntil(
            syncBankingData()
        );
    }
});

/**
 * Push Notifications (for future implementation)
 */
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'Sumanglam Banking notification',
        icon: './assets/icon-192.png',
        badge: './assets/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open Banking App',
                icon: './assets/action-icon.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: './assets/close-icon.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Sumanglam Banking', options)
    );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // Open the banking application
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

/**
 * Message Handler (for communication with main thread)
 */
self.addEventListener('message', event => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

/**
 * Utility Functions
 */

/**
 * Check if URL is a static asset that should be cached
 */
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => pathname.endsWith(ext)) || 
           pathname === '/' || 
           pathname === '/index.html';
}

/**
 * Sync banking data (placeholder for future implementation)
 */
async function syncBankingData() {
    try {
        console.log('Service Worker: Syncing banking data...');
        
        // This could implement background sync for:
        // - Pending transactions
        // - Offline form submissions
        // - Data synchronization with server
        
        // For now, just log the action
        console.log('Service Worker: Banking data sync completed');
        
        return Promise.resolve();
    } catch (error) {
        console.error('Service Worker: Banking data sync failed:', error);
        throw error;
    }
}

/**
 * Cache update check
 */
function checkForUpdates() {
    return self.registration.update();
}

// Periodic cache cleanup (run every 24 hours)
setInterval(() => {
    console.log('Service Worker: Running periodic cache cleanup');
    
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.startsWith('sumanglam-') && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
                console.log('Service Worker: Cleaning up old cache:', cacheName);
                caches.delete(cacheName);
            }
        });
    });
}, 24 * 60 * 60 * 1000); // 24 hours

console.log('Service Worker: Script loaded and ready');

// Export cache name for debugging
self.CURRENT_CACHE = CACHE_NAME;