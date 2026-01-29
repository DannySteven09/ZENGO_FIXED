// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Autenticación
// Con usuarios demo expandidos para pruebas
// ═══════════════════════════════════════════════════════════════

import supabase from '../config/supabase.js';

export const AuthModel = {
    
    // Usuarios demo expandidos
    DEMO_USERS: [
        // Administrador
        { 
            id: 1, 
            email: 'admin@demo.com', 
            password: '123', 
            nombre: 'Administrador', 
            apellido: 'Sistema',
            role: 'ADMIN',
            role_id: 1
        },
        // Jefe de Bodega
        { 
            id: 2, 
            email: 'jefe@demo.com', 
            password: '123', 
            nombre: 'Roberto', 
            apellido: 'Jiménez',
            role: 'JEFE',
            role_id: 2
        },
        // Auxiliares
        { 
            id: 3, 
            email: 'auxiliar1@demo.com', 
            password: '123', 
            nombre: 'María', 
            apellido: 'López',
            role: 'AUXILIAR',
            role_id: 3
        },
        { 
            id: 4, 
            email: 'auxiliar2@demo.com', 
            password: '123', 
            nombre: 'Carlos', 
            apellido: 'Ruiz',
            role: 'AUXILIAR',
            role_id: 3
        },
        { 
            id: 5, 
            email: 'auxiliar3@demo.com', 
            password: '123', 
            nombre: 'Ana', 
            apellido: 'Mora',
            role: 'AUXILIAR',
            role_id: 3
        },
        { 
            id: 6, 
            email: 'auxiliar4@demo.com', 
            password: '123', 
            nombre: 'Pedro', 
            apellido: 'Sánchez',
            role: 'AUXILIAR',
            role_id: 3
        },
        // Alias para compatibilidad con auxiliar@demo.com
        { 
            id: 3, 
            email: 'auxiliar@demo.com', 
            password: '123', 
            nombre: 'María', 
            apellido: 'López',
            role: 'AUXILIAR',
            role_id: 3
        }
    ],

    /**
     * Obtener lista de auxiliares disponibles (para asignación)
     */
    getAuxiliares() {
        return this.DEMO_USERS.filter(u => u.role === 'AUXILIAR' && u.email !== 'auxiliar@demo.com');
    },

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
                        nombre: user.nombre,
                        apellido: user.apellido,
                        role: this.mapRole(user.role_id),
                        role_id: user.role_id
                    };
                }
            }

            // Fallback: Usuarios demo
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
                name: `${user.nombre} ${user.apellido || ''}`.trim(),
                nombre: user.nombre,
                apellido: user.apellido,
                role: user.role,
                role_id: user.role_id
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
    },

    /**
     * Obtener usuario por ID
     */
    getUserById(id) {
        return this.DEMO_USERS.find(u => u.id === id) || null;
    }
};

// Exponer al window
window.AuthModel = AuthModel;
