// ═══════════════════════════════════════════════════════════════
// ZENGO - Service Worker
// Permite funcionamiento offline y carga rápida
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'zengo-v1.0.0';

// Archivos a cachear para funcionamiento offline
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    
    // CSS
    '/css/main.css',
    '/css/glassmorphism.css',
    '/css/components.css',
    
    // JS - Config
    '/js/app.js',
    '/js/config/supabase.js',
    '/js/config/dexie-db.js',
    
    // JS - Models
    '/js/models/AuthModel.js',
    '/js/models/InventoryModel.js',
    '/js/models/LocationModel.js',
    
    // JS - Controllers
    '/js/controllers/AuthController.js',
    '/js/controllers/AdminController.js',
    '/js/controllers/CycleController.js',
    '/js/controllers/ScannerController.js',
    '/js/controllers/SyncManager.js',
    
    // JS - Views
    '/js/views/LoginView.js',
    '/js/views/AdminView.js',
    '/js/views/JefeView.js',
    '/js/views/AuxiliarView.js',
    '/js/views/Components.js',
    
    // Assets
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png'
];

// CDNs externos (se cachean en tiempo de ejecución)
const EXTERNAL_URLS = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com'
];

// ═══════════════════════════════════════════════════════════════
// INSTALACIÓN - Cachear archivos estáticos
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando archivos estáticos');
                // Cachear uno por uno para evitar fallos
                return Promise.allSettled(
                    STATIC_ASSETS.map(url => 
                        cache.add(url).catch(err => 
                            console.warn(`[SW] No se pudo cachear: ${url}`, err)
                        )
                    )
                );
            })
            .then(() => {
                console.log('[SW] ✓ Instalación completada');
                return self.skipWaiting(); // Activar inmediatamente
            })
    );
});

// ═══════════════════════════════════════════════════════════════
// ACTIVACIÓN - Limpiar cachés antiguos
// ═══════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log(`[SW] Eliminando caché antiguo: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] ✓ Activación completada');
                return self.clients.claim(); // Tomar control inmediato
            })
    );
});

// ═══════════════════════════════════════════════════════════════
// FETCH - Interceptar peticiones
// ═══════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar peticiones a Supabase (siempre online)
    if (url.hostname.includes('supabase')) {
        return;
    }

    // Estrategia: Cache First, Network Fallback
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Si está en caché, devolver
                if (cachedResponse) {
                    // Actualizar en background (stale-while-revalidate)
                    if (navigator.onLine) {
                        fetchAndCache(request);
                    }
                    return cachedResponse;
                }

                // Si no está en caché, buscar en red
                return fetchAndCache(request);
            })
            .catch(() => {
                // Si falla todo, mostrar página offline para navegación
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503 });
            })
    );
});

// ═══════════════════════════════════════════════════════════════
// HELPER - Fetch y cachear
// ═══════════════════════════════════════════════════════════════
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        
        // Solo cachear respuestas válidas
        if (response && response.status === 200) {
            const responseClone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            
            // No cachear peticiones POST ni APIs
            if (request.method === 'GET' && !request.url.includes('/api/')) {
                cache.put(request, responseClone);
            }
        }
        
        return response;
    } catch (error) {
        console.warn('[SW] Fetch falló:', request.url);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// SYNC - Sincronización en background (opcional)
// ═══════════════════════════════════════════════════════════════
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-conteos') {
        console.log('[SW] Sincronizando conteos en background...');
        event.waitUntil(syncConteos());
    }
});

async function syncConteos() {
    // Notificar a la app que sincronice
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_CONTEOS' });
    });
}

// ═══════════════════════════════════════════════════════════════
// PUSH - Notificaciones (opcional para futuro)
// ═══════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'ZENGO', {
            body: data.body || 'Nueva notificación',
            icon: '/assets/img/icon-192.png',
            badge: '/assets/img/icon-192.png',
            vibrate: [200, 100, 200],
            data: data.data
        })
    );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.openWindow('/')
    );
});

// ═══════════════════════════════════════════════════════════════
// MENSAJE - Comunicación con la app
// ═══════════════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Caché limpiado');
        });
    }
});

console.log('[SW] Service Worker cargado');
