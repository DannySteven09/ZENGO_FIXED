// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Autenticación
// Persistencia real: Supabase (cloud) + Dexie (offline)
// SIN datos quemados - todo viene de base de datos
// ═══════════════════════════════════════════════════════════════

const AuthModel = {

    // Cache en memoria para evitar consultas repetidas en la misma sesión
    _usersCache: null,
    _cacheTimestamp: null,
    CACHE_TTL: 30000, // 30 segundos

    // ═══════════════════════════════════════════════════════════
    // MAPEO DE ROLES
    // ═══════════════════════════════════════════════════════════
    ROLES: { 1: 'ADMIN', 2: 'JEFE', 3: 'AUXILIAR' },

    mapRole(roleId) {
        return this.ROLES[roleId] || 'AUXILIAR';
    },

    getRoleId(role) {
        const map = { 'ADMIN': 1, 'JEFE': 2, 'AUXILIAR': 3 };
        return map[role] || 3;
    },

    // ═══════════════════════════════════════════════════════════
    // INICIALIZAR - Cargar usuarios de Supabase a Dexie
    // Se llama al arrancar la app
    // ═══════════════════════════════════════════════════════════
    async init() {
        try {
            if (navigator.onLine && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('activo', true)
                    .order('id');

                if (!error && data && data.length > 0) {
                    // Limpiar tabla local y cargar datos frescos de Supabase
                    await window.db.usuarios.clear();
                    const usuarios = data.map(u => ({
                        id: u.id,
                        email: u.email,
                        password: u.password,
                        nombre: u.nombre,
                        apellido: u.apellido || '',
                        role_id: u.role_id,
                        activo: u.activo,
                        fecha_creacion: u.fecha_creacion
                    }));
                    await window.db.usuarios.bulkPut(usuarios);
                    console.log(`✓ AuthModel: ${usuarios.length} usuarios sincronizados desde Supabase`);
                    return;
                }
            }
            // Si no hay conexión o falló, verificar que Dexie tenga datos
            const count = await window.db.usuarios.count();
            console.log(`✓ AuthModel: ${count} usuarios en cache local (Dexie)`);
        } catch (err) {
            console.warn('⚠ AuthModel.init:', err.message);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // VALIDAR CREDENCIALES (LOGIN)
    // Intenta Supabase primero, fallback a Dexie
    // ═══════════════════════════════════════════════════════════
    async validateCredentials(email, password) {
        try {
            // 1. Intentar contra Supabase
            if (navigator.onLine && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password)
                    .eq('activo', true)
                    .single();

                if (!error && data) {
                    // Actualizar cache local con este usuario
                    await this._saveToLocal(data);
                    return this._formatUser(data);
                }
            }

            // 2. Fallback: buscar en Dexie (modo offline)
            return await this._validateOffline(email, password);

        } catch (err) {
            console.warn('⚠ validateCredentials - usando fallback offline:', err.message);
            return await this._validateOffline(email, password);
        }
    },

    // Validación offline contra Dexie
    async _validateOffline(email, password) {
        try {
            const user = await window.db.usuarios
                .where('email').equals(email)
                .first();

            if (user && user.password === password && user.activo !== false) {
                return this._formatUser(user);
            }
        } catch (err) {
            console.error('Error validación offline:', err);
        }
        return null;
    },

    // Formatear usuario para la sesión
    _formatUser(data) {
        return {
            id: data.id,
            email: data.email,
            name: `${data.nombre} ${data.apellido || ''}`.trim(),
            nombre: data.nombre,
            apellido: data.apellido || '',
            role: this.mapRole(data.role_id),
            role_id: data.role_id
        };
    },

    // Guardar/actualizar usuario en Dexie local
    async _saveToLocal(userData) {
        try {
            await window.db.usuarios.put({
                id: userData.id,
                email: userData.email,
                password: userData.password,
                nombre: userData.nombre,
                apellido: userData.apellido || '',
                role_id: userData.role_id,
                activo: userData.activo,
                fecha_creacion: userData.fecha_creacion
            });
        } catch (err) {
            console.warn('Error guardando en local:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER TODOS LOS USUARIOS
    // ═══════════════════════════════════════════════════════════
    async getAllUsers() {
        try {
            // Intentar desde Supabase
            if (navigator.onLine && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .order('id');

                if (!error && data) {
                    // Actualizar cache local
                    await window.db.usuarios.clear();
                    await window.db.usuarios.bulkPut(data.map(u => ({
                        id: u.id,
                        email: u.email,
                        password: u.password,
                        nombre: u.nombre,
                        apellido: u.apellido || '',
                        role_id: u.role_id,
                        activo: u.activo,
                        fecha_creacion: u.fecha_creacion
                    })));
                    // Retornar con role mapeado
                    return data.map(u => ({
                        ...u,
                        role: this.mapRole(u.role_id)
                    }));
                }
            }

            // Fallback: Dexie local
            const local = await window.db.usuarios.toArray();
            return local.map(u => ({
                ...u,
                role: this.mapRole(u.role_id)
            }));

        } catch (err) {
            console.error('Error getAllUsers:', err);
            // Último recurso: Dexie
            const local = await window.db.usuarios.toArray();
            return local.map(u => ({
                ...u,
                role: this.mapRole(u.role_id)
            }));
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER AUXILIARES (para asignación de tareas)
    // ═══════════════════════════════════════════════════════════
    async getAuxiliares() {
        const users = await this.getAllUsers();
        return users.filter(u => u.role === 'AUXILIAR' && u.activo !== false);
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER USUARIO POR ID
    // ═══════════════════════════════════════════════════════════
    async getUserById(id) {
        try {
            if (navigator.onLine && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    return { ...data, role: this.mapRole(data.role_id) };
                }
            }
            // Fallback Dexie
            const user = await window.db.usuarios.get(id);
            if (user) return { ...user, role: this.mapRole(user.role_id) };
            return null;
        } catch (err) {
            console.error('Error getUserById:', err);
            const user = await window.db.usuarios.get(id);
            if (user) return { ...user, role: this.mapRole(user.role_id) };
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // CREAR USUARIO
    // ═══════════════════════════════════════════════════════════
    async addUser(userData) {
        const newUser = {
            email: userData.email,
            password: userData.password || '123',
            nombre: userData.nombre,
            apellido: userData.apellido || '',
            role_id: this.getRoleId(userData.role),
            activo: true
        };

        try {
            if (navigator.onLine && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .insert(newUser)
                    .select()
                    .single();

                if (error) throw new Error(error.message);

                // Guardar en Dexie también
                await this._saveToLocal(data);
                return { ...data, role: this.mapRole(data.role_id) };
            }

            // Modo offline: guardar en Dexie + cola de sincronización
            const localId = await window.db.usuarios.add({
                ...newUser,
                fecha_creacion: new Date().toISOString()
            });
            await window.SyncManager.addToQueue('profiles', 'insert', newUser);
            return { ...newUser, id: localId, role: this.mapRole(newUser.role_id) };

        } catch (err) {
            console.error('Error addUser:', err);
            throw err;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ACTUALIZAR USUARIO
    // ═══════════════════════════════════════════════════════════
    async updateUser(userId, userData) {
        const changes = {};
        if (userData.nombre !== undefined) changes.nombre = userData.nombre;
        if (userData.apellido !== undefined) changes.apellido = userData.apellido;
        if (userData.email !== undefined) changes.email = userData.email;
        if (userData.password) changes.password = userData.password;
        if (userData.role) changes.role_id = this.getRoleId(userData.role);
        if (userData.activo !== undefined) changes.activo = userData.activo;

        try {
            if (navigator.onLine && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .update(changes)
                    .eq('id', userId)
                    .select()
                    .single();

                if (error) throw new Error(error.message);

                // Actualizar Dexie
                await this._saveToLocal(data);
                return { ...data, role: this.mapRole(data.role_id) };
            }

            // Modo offline
            await window.db.usuarios.update(userId, changes);
            await window.SyncManager.addToQueue('profiles', 'update', { id: userId, changes });
            const updated = await window.db.usuarios.get(userId);
            return updated ? { ...updated, role: this.mapRole(updated.role_id) } : null;

        } catch (err) {
            console.error('Error updateUser:', err);
            throw err;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ELIMINAR USUARIO (soft delete - marca activo = false)
    // ═══════════════════════════════════════════════════════════
    async deleteUser(userId) {
        try {
            if (navigator.onLine && window.supabaseClient) {
                const { error } = await window.supabaseClient
                    .from('profiles')
                    .update({ activo: false })
                    .eq('id', userId);

                if (error) throw new Error(error.message);

                // Actualizar en Dexie
                await window.db.usuarios.update(userId, { activo: false });
                return true;
            }

            // Modo offline
            await window.db.usuarios.update(userId, { activo: false });
            await window.SyncManager.addToQueue('profiles', 'update', {
                id: userId,
                changes: { activo: false }
            });
            return true;

        } catch (err) {
            console.error('Error deleteUser:', err);
            throw err;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // CERRAR SESIÓN
    // ═══════════════════════════════════════════════════════════
    async logout() {
        localStorage.removeItem('zengo_session');
    }
};

// Exponer globalmente
window.AuthModel = AuthModel;