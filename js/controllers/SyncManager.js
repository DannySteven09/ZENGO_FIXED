// ═══════════════════════════════════════════════════════════════
// ZENGO - Gestor de Sincronización
// Maneja sincronización bidireccional Dexie ↔ Supabase
// ═══════════════════════════════════════════════════════════════

import db from '../config/dexie-db.js';
import supabase from '../config/supabase.js';

export const SyncManager = {
    isOnline: navigator.onLine,
    isSyncing: false,
    syncInterval: null,
    retryQueue: [],
    MAX_RETRIES: 3,
    SYNC_INTERVAL_MS: 30000, // 30 segundos

    // ═══════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════
    init() {
        // Escuchar cambios de conexión
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));

        // Ciclo de sincronización automática
        this.syncInterval = setInterval(() => this.syncAll(), this.SYNC_INTERVAL_MS);
        
        // Estado inicial
        this.handleConnectionChange(navigator.onLine);
        
        // Limpiar datos antiguos cada hora
        setInterval(() => this.cleanOldData(), 3600000);
        
        console.log('✓ SyncManager inicializado');
    },

    // ═══════════════════════════════════════════════════════════
    // MANEJO DE CONEXIÓN
    // ═══════════════════════════════════════════════════════════
    async handleConnectionChange(status) {
        this.isOnline = status;
        this.updateStatusIndicator(status);
        
        if (status) {
            console.log('🌐 Conexión restaurada - Iniciando sincronización...');
            window.ZENGO?.toast('Conexión restaurada', 'success', 2000);
            await this.syncAll();
        } else {
            console.warn('📴 Modo Offline - Datos se guardarán localmente');
            window.ZENGO?.toast('Modo offline activado', 'info', 2000);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZACIÓN PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    async syncAll() {
        if (!this.isOnline || this.isSyncing) return;
        
        this.isSyncing = true;
        this.updateStatusIndicator(true, true); // Mostrar "sincronizando"
        
        try {
            await Promise.all([
                this.syncConteos(),
                this.syncHallazgos(),
                this.processRetryQueue()
            ]);
            
            console.log('✓ Sincronización completa');
        } catch (err) {
            console.error('✗ Error en sincronización:', err);
        } finally {
            this.isSyncing = false;
            this.updateStatusIndicator(this.isOnline, false);
        }
    },

    // Alias para compatibilidad
    async syncPendientes() {
        return this.syncAll();
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR CONTEOS
    // ═══════════════════════════════════════════════════════════
    async syncConteos() {
        const pendientes = await db.conteos
            .where('sync_status')
            .equals('pending')
            .toArray();

        if (pendientes.length === 0) return;

        console.log(`📤 Sincronizando ${pendientes.length} conteos...`);

        for (const conteo of pendientes) {
            try {
                const { error } = await supabase
                    .from('conteos_realizados')
                    .insert({
                        tarea_id: conteo.tarea_id,
                        producto_sku: conteo.producto_sku,
                        upc: conteo.upc,
                        cantidad_contada: conteo.cantidad_contada,
                        ubicacion: conteo.ubicacion,
                        auxiliar_id: conteo.auxiliar_id,
                        timestamp: conteo.timestamp,
                        dispositivo: navigator.userAgent.substring(0, 100)
                    });

                if (error) {
                    await this.handleSyncError(conteo, 'conteos', error);
                } else {
                    await db.conteos.update(conteo.id, { 
                        sync_status: 'synced',
                        synced_at: new Date().toISOString()
                    });
                }
            } catch (err) {
                await this.handleSyncError(conteo, 'conteos', err);
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR HALLAZGOS
    // ═══════════════════════════════════════════════════════════
    async syncHallazgos() {
        const pendientes = await db.hallazgos
            .where('sync_status')
            .equals('pending')
            .toArray();

        if (pendientes.length === 0) return;

        console.log(`📤 Sincronizando ${pendientes.length} hallazgos...`);

        for (const hallazgo of pendientes) {
            try {
                // Si tiene foto, subirla primero
                let fotoUrl = null;
                if (hallazgo.foto_base64) {
                    fotoUrl = await this.uploadFoto(hallazgo.foto_base64, hallazgo.upc);
                }

                const { error } = await supabase
                    .from('hallazgos')
                    .insert({
                        upc: hallazgo.upc,
                        tipo: hallazgo.tipo || 'OTRO',
                        descripcion: hallazgo.descripcion,
                        cantidad: hallazgo.cantidad,
                        ubicacion: hallazgo.ubicacion,
                        foto_url: fotoUrl,
                        reportado_por: hallazgo.auxiliar_id,
                        timestamp: hallazgo.timestamp
                    });

                if (error) {
                    await this.handleSyncError(hallazgo, 'hallazgos', error);
                } else {
                    await db.hallazgos.update(hallazgo.id, { 
                        sync_status: 'synced',
                        synced_at: new Date().toISOString()
                    });
                }
            } catch (err) {
                await this.handleSyncError(hallazgo, 'hallazgos', err);
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SUBIR FOTO A STORAGE
    // ═══════════════════════════════════════════════════════════
    async uploadFoto(base64Data, upc) {
        try {
            // Convertir base64 a blob
            const response = await fetch(base64Data);
            const blob = await response.blob();
            
            const filename = `hallazgos/${upc}_${Date.now()}.jpg`;
            
            const { data, error } = await supabase.storage
                .from('zengo-fotos')
                .upload(filename, blob, {
                    contentType: 'image/jpeg'
                });

            if (error) throw error;

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from('zengo-fotos')
                .getPublicUrl(filename);

            return urlData.publicUrl;
        } catch (err) {
            console.warn('Error subiendo foto:', err);
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // MANEJO DE ERRORES Y REINTENTOS
    // ═══════════════════════════════════════════════════════════
    async handleSyncError(registro, tabla, error) {
        console.warn(`Error sincronizando ${tabla}:`, error.message);
        
        // Agregar a cola de reintentos
        await db.sync_queue.add({
            tabla: tabla,
            registro_id: registro.id,
            accion: 'INSERT',
            timestamp: new Date().toISOString(),
            intentos: 1,
            ultimo_error: error.message
        });
    },

    async processRetryQueue() {
        const pendientes = await db.sync_queue
            .where('intentos')
            .below(this.MAX_RETRIES)
            .toArray();

        for (const item of pendientes) {
            try {
                let registro;
                if (item.tabla === 'conteos') {
                    registro = await db.conteos.get(item.registro_id);
                } else if (item.tabla === 'hallazgos') {
                    registro = await db.hallazgos.get(item.registro_id);
                }

                if (!registro) {
                    await db.sync_queue.delete(item.id);
                    continue;
                }

                // Reintentar sincronización
                if (item.tabla === 'conteos') {
                    await this.retrySyncConteo(registro, item);
                } else if (item.tabla === 'hallazgos') {
                    await this.retrySyncHallazgo(registro, item);
                }
            } catch (err) {
                // Incrementar intentos
                await db.sync_queue.update(item.id, {
                    intentos: item.intentos + 1,
                    ultimo_error: err.message
                });
            }
        }
    },

    async retrySyncConteo(conteo, queueItem) {
        const { error } = await supabase
            .from('conteos_realizados')
            .insert({
                tarea_id: conteo.tarea_id,
                producto_sku: conteo.producto_sku,
                upc: conteo.upc,
                cantidad_contada: conteo.cantidad_contada,
                ubicacion: conteo.ubicacion,
                auxiliar_id: conteo.auxiliar_id,
                timestamp: conteo.timestamp
            });

        if (!error) {
            await db.conteos.update(conteo.id, { sync_status: 'synced' });
            await db.sync_queue.delete(queueItem.id);
        } else {
            throw error;
        }
    },

    async retrySyncHallazgo(hallazgo, queueItem) {
        const { error } = await supabase
            .from('hallazgos')
            .insert({
                upc: hallazgo.upc,
                tipo: hallazgo.tipo,
                descripcion: hallazgo.descripcion,
                cantidad: hallazgo.cantidad,
                ubicacion: hallazgo.ubicacion,
                reportado_por: hallazgo.auxiliar_id,
                timestamp: hallazgo.timestamp
            });

        if (!error) {
            await db.hallazgos.update(hallazgo.id, { sync_status: 'synced' });
            await db.sync_queue.delete(queueItem.id);
        } else {
            throw error;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // DESCARGAR DATOS DEL SERVIDOR
    // ═══════════════════════════════════════════════════════════
    async downloadProductos(categoriaId = null) {
        try {
            let query = supabase
                .from('productos')
                .select('sku, upc, descripcion, categoria_id, precio, costo, stock_sistema');

            if (categoriaId) {
                query = query.eq('categoria_id', categoriaId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Guardar en Dexie
            await db.productos.clear();
            await db.productos.bulkPut(data);
            
            console.log(`✓ ${data.length} productos descargados`);
            return data.length;
        } catch (err) {
            console.error('Error descargando productos:', err);
            return 0;
        }
    },

    async downloadTareas(auxiliarId) {
        try {
            const { data, error } = await supabase
                .from('tareas')
                .select('*')
                .eq('asignado_a', auxiliarId)
                .in('estado', ['pendiente', 'en_progreso']);

            if (error) throw error;

            await db.tareas.clear();
            await db.tareas.bulkPut(data);
            
            console.log(`✓ ${data.length} tareas descargadas`);
            return data;
        } catch (err) {
            console.error('Error descargando tareas:', err);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // LIMPIEZA DE DATOS ANTIGUOS
    // ═══════════════════════════════════════════════════════════
    async cleanOldData() {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const cutoff = sevenDaysAgo.toISOString();

            // Eliminar conteos sincronizados de más de 7 días
            const oldConteos = await db.conteos
                .where('sync_status')
                .equals('synced')
                .filter(c => c.synced_at < cutoff)
                .toArray();

            if (oldConteos.length > 0) {
                await db.conteos.bulkDelete(oldConteos.map(c => c.id));
                console.log(`🧹 ${oldConteos.length} conteos antiguos eliminados`);
            }

            // Eliminar hallazgos sincronizados de más de 7 días
            const oldHallazgos = await db.hallazgos
                .where('sync_status')
                .equals('synced')
                .filter(h => h.synced_at < cutoff)
                .toArray();

            if (oldHallazgos.length > 0) {
                await db.hallazgos.bulkDelete(oldHallazgos.map(h => h.id));
                console.log(`🧹 ${oldHallazgos.length} hallazgos antiguos eliminados`);
            }

            // Eliminar items fallidos de la cola con max reintentos
            await db.sync_queue
                .where('intentos')
                .aboveOrEqual(this.MAX_RETRIES)
                .delete();

        } catch (err) {
            console.warn('Error limpiando datos antiguos:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // INDICADOR DE ESTADO
    // ═══════════════════════════════════════════════════════════
    updateStatusIndicator(isOnline, isSyncing = false) {
        const dot = document.getElementById('sync-dot');
        const text = document.getElementById('sync-text');
        const container = document.getElementById('sync-container');

        if (!dot || !text) return;

        // Remover clases anteriores
        container?.classList.remove('online', 'offline', 'syncing');
        dot.classList.remove('online', 'offline', 'syncing');

        if (isSyncing) {
            container?.classList.add('syncing');
            dot.classList.add('syncing');
            text.innerText = 'SYNC...';
        } else if (isOnline) {
            container?.classList.add('online');
            dot.classList.add('online');
            text.innerText = 'ONLINE';
        } else {
            container?.classList.add('offline');
            dot.classList.add('offline');
            text.innerText = 'OFFLINE';
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ESTADÍSTICAS
    // ═══════════════════════════════════════════════════════════
    async getStats() {
        const conteosPendientes = await db.conteos.where('sync_status').equals('pending').count();
        const hallazgosPendientes = await db.hallazgos.where('sync_status').equals('pending').count();
        const colaReintentos = await db.sync_queue.count();

        return {
            conteosPendientes,
            hallazgosPendientes,
            colaReintentos,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing
        };
    }
};