// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Autenticación
// ═══════════════════════════════════════════════════════════════

import supabase from '../config/supabase.js';

export const AuthModel = {
    
    // Usuarios demo (fallback si no hay conexión o tabla)
    DEMO_USERS: [
        { id: 1, email: 'admin@demo.com', password: '123', nombre: 'Administrador', role: 'ADMIN' },
        { id: 2, email: 'jefe@demo.com', password: '123', nombre: 'Jefe Bodega', role: 'JEFE' },
        { id: 3, email: 'auxiliar@demo.com', password: '123', nombre: 'María López', role: 'AUXILIAR' }
    ],

    /**
     * Valida credenciales contra Supabase o fallback demo
     */
    async validateCredentials(email, password) {
        try {
            // Intentar con Supabase primero
            const { data: user, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    email,
                    nombre,
                    apellido,
                    role_id,
                    roles (nombre)
                `)
                .eq('email', email)
                .single();

            if (!error && user) {
                // Validar con Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (!authError && authData.user) {
                    return {
                        id: user.id,
                        email: user.email,
                        name: `${user.nombre} ${user.apellido || ''}`.trim(),
                        role: this.mapRole(user.role_id)
                    };
                }
            }

            // Fallback: Usuarios demo (para desarrollo)
            return this.validateDemo(email, password);

        } catch (err) {
            console.warn("Supabase no disponible, usando modo demo:", err.message);
            return this.validateDemo(email, password);
        }
    },

    /**
     * Validación con usuarios demo
     */
    validateDemo(email, password) {
        const user = this.DEMO_USERS.find(u => u.email === email && u.password === password);
        if (user) {
            return {
                id: user.id,
                email: user.email,
                name: user.nombre,
                role: user.role
            };
        }
        return null;
    },

    /**
     * Mapear role_id a nombre de rol
     */
    mapRole(roleId) {
        const roles = { 1: 'ADMIN', 2: 'JEFE', 3: 'AUXILIAR' };
        return roles[roleId] || 'AUXILIAR';
    },

    /**
     * Cerrar sesión
     */
    async logout() {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn("Error al cerrar sesión en Supabase");
        }
        localStorage.removeItem('zengo_session');
    }
};