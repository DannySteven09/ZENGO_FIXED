// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Ubicaciones
// Gestiona historial de ubicaciones de productos
// ═══════════════════════════════════════════════════════════════

const LocationModel = {
    
    // ═══════════════════════════════════════════════════════════
    // GUARDAR UBICACIÓN
    // ═══════════════════════════════════════════════════════════
    async saveLocation(upc, ubicacion, auxiliarId = null) {
        try {
            await window.db.ubicaciones.add({
                upc: upc,
                ubicacion: ubicacion,
                auxiliar_id: auxiliarId,
                timestamp: new Date().toISOString()
            });
            
            // También actualizar el producto
            const producto = await window.db.productos.where('upc').equals(upc).first();
            if (producto) {
                await window.db.productos.update(producto.id, { ubicacion: ubicacion });
            }
            
            return true;
        } catch (err) {
            console.error('Error guardando ubicación:', err);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER HISTORIAL DE UBICACIONES
    // ═══════════════════════════════════════════════════════════
    async getHistorial(upc) {
        try {
            const ubicaciones = await window.db.ubicaciones
                .where('upc')
                .equals(upc)
                .toArray();
            
            // Ordenar por fecha descendente
            return ubicaciones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (err) {
            console.error('Error obteniendo historial:', err);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER ÚLTIMA UBICACIÓN
    // ═══════════════════════════════════════════════════════════
    async getUltimaUbicacion(upc) {
        try {
            const historial = await this.getHistorial(upc);
            return historial.length > 0 ? historial[0].ubicacion : null;
        } catch (err) {
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER TODAS LAS UBICACIONES ÚNICAS
    // ═══════════════════════════════════════════════════════════
    async getUbicacionesUnicas(upc) {
        try {
            const historial = await this.getHistorial(upc);
            const unicas = [...new Set(historial.map(h => h.ubicacion))];
            return unicas.filter(u => u && u.trim() !== '');
        } catch (err) {
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR CON SUPABASE
    // ═══════════════════════════════════════════════════════════
    async syncToCloud() {
        if (!navigator.onLine || !window.supabaseClient) return false;
        
        try {
            const ubicaciones = await window.db.ubicaciones.toArray();
            
            if (ubicaciones.length > 0) {
                const { error } = await window.supabaseClient
                    .from('ubicaciones_historico')
                    .upsert(ubicaciones.map(u => ({
                        upc: u.upc,
                        ubicacion: u.ubicacion,
                        auxiliar_id: u.auxiliar_id,
                        timestamp: u.timestamp
                    })));
                    
                if (error) throw error;
            }
            
            return true;
        } catch (err) {
            console.error('Error sincronizando ubicaciones:', err);
            return false;
        }
    }
};

// Exponer globalmente
window.LocationModel = LocationModel;
