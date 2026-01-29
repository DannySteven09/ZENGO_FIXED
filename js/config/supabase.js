// ═══════════════════════════════════════════════════════════════
// ZENGO - Configuración de Supabase
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = "https://rialsyihreilemweovta.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWxzeWlocmVpbGVtd2VvdnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MTQxMTIsImV4cCI6MjA1MjI5MDExMn0.zbmhbsGprfwUhMN1RhZFqyXnGNzWKpDDWYIv3CAPqjA";

// Usar el objeto global de Supabase cargado desde el CDN en index.html
// El CDN crea window.supabase con el método createClient
let supabaseClient = null;

try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✓ Supabase conectado');
    } else {
        console.warn('⚠ Supabase CDN no disponible, funcionando en modo offline');
        // Crear un cliente mock para evitar errores
        supabaseClient = createMockClient();
    }
} catch (err) {
    console.warn('⚠ Error inicializando Supabase:', err.message);
    supabaseClient = createMockClient();
}

// Cliente mock para modo offline
function createMockClient() {
    return {
        from: (table) => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
            delete: () => Promise.resolve({ data: null, error: null }),
            upsert: () => Promise.resolve({ data: null, error: null }),
            eq: function() { return this; },
            in: function() { return this; },
            order: function() { return this; },
            limit: function() { return this; },
            single: function() { return this; }
        }),
        auth: {
            signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Offline mode' } }),
            signOut: () => Promise.resolve({ error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null })
        },
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: '' } })
            })
        }
    };
}

export default supabaseClient;