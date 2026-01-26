// ═══════════════════════════════════════════════════════════════
// ZENGO - Configuración de Supabase
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = "https://rialsyihreilemweovta.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WNyHOiV9pCY-G2OnWET8lQ_F2KIx8vJ";

// Crear cliente de Supabase (usando el objeto global del CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabaseClient;