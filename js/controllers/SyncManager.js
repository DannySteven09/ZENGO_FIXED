// ═══════════════════════════════════════════════════════════════
// ZENGO - Gestor de Sincronización
// Maneja cola de sincronización offline/online
// FIX: Agregado MAX_RETRIES para evitar bucles infinitos
// ═══════════════════════════════════════════════════════════════

const SyncManager = {
    isSyncing: false,
    syncInterval: null,
    MAX_RETRIES: 5,

    // ═══════════════════════════════════════════════════════════
    // INICIALIZAR
    // ═══════════════════════════════════════════════════════════
    init() {
        // Escuchar cambios de conectividad
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());

        // Iniciar intervalo de sincronización (cada 30 segundos)
        this.syncInterval = setInterval(() => {
            if (navigator.onLine) {
                this.syncPendientes();
            }
        }, 30000);

        // Sincronización inicial si hay conexión
        if (navigator.onLine) {
            setTimeout(() => this.syncPendientes(), 5000);
        }

        console.log('✓ SyncManager inicializado (MAX_RETRIES: ' + this.MAX_RETRIES + ')');
    },

    // ═══════════════════════════════════════════════════════════
    // EVENTOS DE CONECTIVIDAD
    // ═══════════════════════════════════════════════════════════
    onOnline() {
        console.log('✓ Conexión restaurada');
        window.ZENGO?.toast('Conexión restaurada', 'success');
        this.syncPendientes();
    },

    onOffline() {
        console.log('⚠ Sin conexión');
        window.ZENGO?.toast('Modo offline activado', 'warning');
    },

    // ═══════════════════════════════════════════════════════════
    // AGREGAR A COLA DE SINCRONIZACIÓN
    // ═══════════════════════════════════════════════════════════
    async addToQueue(tabla, accion, datos) {
        try {
            await window.db.sync_queue.add({
                tabla: tabla,
                accion: accion,
                datos: JSON.stringify(datos),
                timestamp: new Date().toISOString(),
                intentos: 0
            });
            console.log(`+ Cola de sync: ${accion} en ${tabla}`);
        } catch (err) {
            console.error('Error agregando a cola:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR PENDIENTES
    // FIX: Items con más de MAX_RETRIES se eliminan de la cola
    // ═══════════════════════════════════════════════════════════
    async syncPendientes() {
        if (this.isSyncing || !navigator.onLine || !window.supabaseClient) return;
        
        this.isSyncing = true;

        try {
            const pendientes = await window.db.sync_queue.toArray();
            
            if (pendientes.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`Sincronizando ${pendientes.length} elementos pendientes...`);
            let syncedCount = 0;
            let failedCount = 0;
            let abandonedCount = 0;

            for (const item of pendientes) {
                try {
                    // FIX: Verificar si superó el máximo de reintentos
                    if ((item.intentos || 0) >= this.MAX_RETRIES) {
                        console.warn(`✗ Abandonando item ${item.id} (${item.accion} en ${item.tabla}): superó ${this.MAX_RETRIES} intentos`);
                        await window.db.sync_queue.delete(item.id);
                        abandonedCount++;
                        continue;
                    }

                    const datos = JSON.parse(item.datos);
                    let success = false;
                    let errorMsg = '';

                    switch (item.accion) {
                        case 'insert': {
                            const { error } = await window.supabaseClient
                                .from(item.tabla)
                                .insert(datos);
                            success = !error;
                            errorMsg = error?.message || '';
                            break;
                        }

                        case 'update': {
                            const { error } = await window.supabaseClient
                                .from(item.tabla)
                                .update(datos.changes || datos)
                                .eq('id', datos.id);
                            success = !error;
                            errorMsg = error?.message || '';
                            break;
                        }

                        case 'upsert': {
                            const { error } = await window.supabaseClient
                                .from(item.tabla)
                                .upsert(datos);
                            success = !error;
                            errorMsg = error?.message || '';
                            break;
                        }

                        case 'delete': {
                            const { error } = await window.supabaseClient
                                .from(item.tabla)
                                .delete()
                                .eq('id', datos.id);
                            success = !error;
                            errorMsg = error?.message || '';
                            break;
                        }
                    }

                    if (success) {
                        await window.db.sync_queue.delete(item.id);
                        syncedCount++;
                        console.log(`✓ Sincronizado: ${item.accion} en ${item.tabla}`);
                    } else {
                        // Incrementar intentos con mensaje de error
                        const newIntentos = (item.intentos || 0) + 1;
                        await window.db.sync_queue.update(item.id, { 
                            intentos: newIntentos,
                            ultimo_error: errorMsg
                        });
                        failedCount++;
                        console.warn(`⚠ Fallo sync (intento ${newIntentos}/${this.MAX_RETRIES}): ${item.accion} en ${item.tabla} - ${errorMsg}`);
                    }

                } catch (err) {
                    console.error(`Error sincronizando item ${item.id}:`, err);
                    // Incrementar intentos también en excepciones
                    const newIntentos = (item.intentos || 0) + 1;
                    await window.db.sync_queue.update(item.id, { 
                        intentos: newIntentos,
                        ultimo_error: err.message
                    }).catch(() => {});
                    failedCount++;
                }
            }

            if (syncedCount > 0 || abandonedCount > 0) {
                console.log(`Sync completado: ${syncedCount} exitosos, ${failedCount} fallidos, ${abandonedCount} abandonados`);
            }

        } catch (err) {
            console.error('Error en sincronización:', err);
        }

        this.isSyncing = false;
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER ESTADO DE SINCRONIZACIÓN
    // ═══════════════════════════════════════════════════════════
    async getStatus() {
        try {
            const pendientes = await window.db.sync_queue.count();
            return {
                online: navigator.onLine,
                pendientes: pendientes,
                syncing: this.isSyncing
            };
        } catch (err) {
            return {
                online: navigator.onLine,
                pendientes: 0,
                syncing: false
            };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // LIMPIAR COLA
    // ═══════════════════════════════════════════════════════════
    async clearQueue() {
        try {
            await window.db.sync_queue.clear();
            console.log('✓ Cola de sincronización limpiada');
        } catch (err) {
            console.error('Error limpiando cola:', err);
        }
    }
};

// Exponer globalmente
window.SyncManager = SyncManager;