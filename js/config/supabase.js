// ═══════════════════════════════════════════════════════════════
// ZENGO - Configuración de Supabase
// Key actualizada: iat:1769284195 (Feb 2026)
// MockClient con encadenamiento completo para modo offline
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = "https://rialsyihreilemweovta.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWxzeWlocmVpbGVtd2VvdnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODQxOTUsImV4cCI6MjA4NDg2MDE5NX0.yxIuUyniS32JKSlHVi5TNl3qMObev9d8jzdoiamcGRM";

let supabaseClient = null;

// Esperar a que Supabase CDN cargue
function initSupabase() {
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✓ Supabase conectado');
        } else {
            console.warn('⚠ Supabase CDN no disponible, funcionando en modo offline');
            supabaseClient = createMockClient();
        }
    } catch (err) {
        console.warn('⚠ Error inicializando Supabase:', err.message);
        supabaseClient = createMockClient();
    }
}

// ═══════════════════════════════════════════════════════════════
// MOCK CLIENT PARA MODO OFFLINE
// FIX: Encadenamiento completo — cada método retorna un objeto
//      con todos los métodos disponibles + Promise (thenable).
//      Soporta patrones como:
//        .from('x').select('*').eq('a',1).eq('b',2).single()
//        .from('x').insert(data).select().single()
//        .from('x').update(data).eq('id',1).select().single()
//        .from('x').delete().neq('id',0)
// ═══════════════════════════════════════════════════════════════
function createMockClient() {
    // Crea un objeto chainable que también es un Promise (thenable)
    function createChain(resolveValue) {
        const defaultValue = resolveValue || { data: null, error: null };

        const chain = {
            select: () => createChain(defaultValue),
            insert: () => createChain(defaultValue),
            update: () => createChain(defaultValue),
            delete: () => createChain(defaultValue),
            upsert: () => createChain(defaultValue),
            eq: () => createChain(defaultValue),
            neq: () => createChain(defaultValue),
            gt: () => createChain(defaultValue),
            lt: () => createChain(defaultValue),
            gte: () => createChain(defaultValue),
            lte: () => createChain(defaultValue),
            in: () => createChain(defaultValue),
            is: () => createChain(defaultValue),
            or: () => createChain(defaultValue),
            order: () => createChain(defaultValue),
            limit: () => createChain(defaultValue),
            range: () => createChain(defaultValue),
            single: () => createChain(defaultValue),
            maybeSingle: () => createChain(defaultValue),
            // Thenable: permite usar await directamente
            then: (resolve, reject) => {
                return Promise.resolve(defaultValue).then(resolve, reject);
            },
            catch: (fn) => Promise.resolve(defaultValue).catch(fn)
        };

        return chain;
    }

    return {
        from: (table) => createChain({ data: [], error: null }),
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

// Inicializar inmediatamente
initSupabase();

// Exponer globalmente
window.supabaseClient = supabaseClient;