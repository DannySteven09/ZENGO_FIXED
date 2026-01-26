// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Ubicaciones
// Gestiona el historial de ubicaciones de productos
// ═══════════════════════════════════════════════════════════════

import db from '../config/dexie-db.js';
import supabase from '../config/supabase.js';

export const LocationModel = {
    TABLE_NAME: 'ubicaciones_historico',

    // ═══════════════════════════════════════════════════════════
    // OBTENER UBICACIÓN HISTÓRICA
    // ═══════════════════════════════════════════════════════════
    async getHistoricalLocation(upc) {
        if (!upc) return null;
        
        const cleanUpc = String(upc).trim().toUpperCase();

        try {
            // Buscar en Dexie primero
            const localResult = await db.ubicaciones_historico
                .where('upc')
                .equals(cleanUpc)
                .first();

            if (localResult) {
                return localResult.ubicaciones || [localResult.ubicacion];
            }

            // Si no está local y hay conexión, buscar en Supabase
            if (navigator.onLine) {
                const { data } = await supabase
                    .from('ubicaciones_historico')
                    .select('ubicaciones, ubicacion')
                    .eq('upc', cleanUpc)
                    .single();

                if (data) {
                    return data.ubicaciones || [data.ubicacion];
                }
            }

            return null;
        } catch (error) {
            console.warn('Error recuperando ubicación:', error.message);
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER TODAS LAS UBICACIONES (array)
    // ═══════════════════════════════════════════════════════════
    async getAllLocations(upc) {
        if (!upc) return [];
        
        const cleanUpc = String(upc).trim().toUpperCase();

        try {
            const record = await db.ubicaciones_historico
                .where('upc')
                .equals(cleanUpc)
                .first();

            if (record && record.ubicaciones) {
                return Array.isArray(record.ubicaciones) 
                    ? record.ubicaciones 
                    : [record.ubicaciones];
            }

            return [];
        } catch (error) {
            console.warn('Error obteniendo ubicaciones:', error.message);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ACTUALIZAR UBICACIÓN
    // ═══════════════════════════════════════════════════════════
    async updateLocation(upc, nuevaUbicacion, responsable = null) {
        if (!upc || !nuevaUbicacion) return false;

        const cleanUpc = String(upc).trim().toUpperCase();
        const cleanUbicacion = String(nuevaUbicacion).trim().toUpperCase();
        const timestamp = new Date().toISOString();
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');

        try {
            // Obtener registro existente
            const existing = await db.ubicaciones_historico
                .where('upc')
                .equals(cleanUpc)
                .first();

            let ubicaciones = [];
            
            if (existing && existing.ubicaciones) {
                ubicaciones = Array.isArray(existing.ubicaciones) 
                    ? [...existing.ubicaciones] 
                    : [existing.ubicaciones];
            }

            // Agregar nueva ubicación si no existe
            if (!ubicaciones.includes(cleanUbicacion)) {
                ubicaciones.unshift(cleanUbicacion); // Nueva al inicio
                
                // Mantener máximo 5 ubicaciones
                if (ubicaciones.length > 5) {
                    ubicaciones = ubicaciones.slice(0, 5);
                }
            } else {
                // Si ya existe, moverla al inicio
                ubicaciones = ubicaciones.filter(u => u !== cleanUbicacion);
                ubicaciones.unshift(cleanUbicacion);
            }

            const data = {
                upc: cleanUpc,
                ubicacion: cleanUbicacion, // Última ubicación
                ubicaciones: ubicaciones,   // Historial
                ultima_actualizacion: timestamp,
                actualizado_por: responsable || session.name || 'Sistema'
            };

            // Guardar en Dexie
            await db.ubicaciones_historico.put(data);

            // Sincronizar con Supabase si hay conexión
            if (navigator.onLine) {
                await this.syncToCloud(data);
            }

            console.log(`✓ Ubicación actualizada: ${cleanUpc} → ${cleanUbicacion}`);
            return true;

        } catch (error) {
            console.error('Error actualizando ubicación:', error);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR BATCH (al cerrar cíclico)
    // ═══════════════════════════════════════════════════════════
    async syncBatchLocations(listaConteos) {
        if (!listaConteos || listaConteos.length === 0) {
            return { updated: 0, message: 'No hay conteos para procesar' };
        }

        // Filtrar conteos con ubicación válida
        const validConteos = listaConteos.filter(item => 
            item.ubicacion && 
            item.ubicacion.trim() !== '' &&
            item.upc
        );

        if (validConteos.length === 0) {
            return { updated: 0, message: 'No hay ubicaciones nuevas para respaldar' };
        }

        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        const timestamp = new Date().toISOString();
        let updatedCount = 0;

        // Procesar cada conteo
        for (const item of validConteos) {
            try {
                const cleanUpc = String(item.upc).trim().toUpperCase();
                const cleanUbicacion = String(item.ubicacion).trim().toUpperCase();

                // Obtener ubicaciones existentes
                const existing = await db.ubicaciones_historico
                    .where('upc')
                    .equals(cleanUpc)
                    .first();

                let ubicaciones = [];
                if (existing && existing.ubicaciones) {
                    ubicaciones = Array.isArray(existing.ubicaciones)
                        ? [...existing.ubicaciones]
                        : [existing.ubicaciones];
                }

                // Agregar nueva si no existe
                if (!ubicaciones.includes(cleanUbicacion)) {
                    ubicaciones.unshift(cleanUbicacion);
                    if (ubicaciones.length > 5) {
                        ubicaciones = ubicaciones.slice(0, 5);
                    }
                }

                await db.ubicaciones_historico.put({
                    upc: cleanUpc,
                    ubicacion: cleanUbicacion,
                    ubicaciones: ubicaciones,
                    ultima_actualizacion: timestamp,
                    actualizado_por: session.name || 'Sistema'
                });

                updatedCount++;
            } catch (err) {
                console.warn(`Error actualizando ${item.upc}:`, err.message);
            }
        }

        // Sincronizar con Supabase si hay conexión
        if (navigator.onLine && updatedCount > 0) {
            await this.syncAllToCloud();
        }

        console.log(`✓ ${updatedCount} ubicaciones actualizadas`);
        return { 
            updated: updatedCount, 
            message: `Se actualizaron ${updatedCount} ubicaciones` 
        };
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR CON SUPABASE
    // ═══════════════════════════════════════════════════════════
    async syncToCloud(data) {
        try {
            const { error } = await supabase
                .from('ubicaciones_historico')
                .upsert({
                    upc: data.upc,
                    ubicacion: data.ubicacion,
                    ubicaciones: data.ubicaciones,
                    ultima_actualizacion: data.ultima_actualizacion,
                    actualizado_por: data.actualizado_por
                }, { onConflict: 'upc' });

            if (error) {
                console.warn('Error sincronizando ubicación:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.warn('Error en syncToCloud:', err);
            return false;
        }
    },

    async syncAllToCloud() {
        try {
            const allLocations = await db.ubicaciones_historico.toArray();
            
            if (allLocations.length === 0) return;

            // Subir en lotes de 100
            const batchSize = 100;
            for (let i = 0; i < allLocations.length; i += batchSize) {
                const batch = allLocations.slice(i, i + batchSize);
                
                await supabase
                    .from('ubicaciones_historico')
                    .upsert(batch.map(loc => ({
                        upc: loc.upc,
                        ubicacion: loc.ubicacion,
                        ubicaciones: loc.ubicaciones,
                        ultima_actualizacion: loc.ultima_actualizacion,
                        actualizado_por: loc.actualizado_por
                    })), { onConflict: 'upc' });
            }

            console.log(`✓ Ubicaciones sincronizadas con Supabase`);
        } catch (err) {
            console.error('Error en syncAllToCloud:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // BUSCAR PRODUCTOS POR UBICACIÓN
    // ═══════════════════════════════════════════════════════════
    async findByLocation(ubicacion) {
        if (!ubicacion) return [];

        const cleanUbicacion = String(ubicacion).trim().toUpperCase();

        try {
            // Buscar en Dexie
            const results = await db.ubicaciones_historico
                .filter(item => {
                    if (item.ubicacion === cleanUbicacion) return true;
                    if (item.ubicaciones && item.ubicaciones.includes(cleanUbicacion)) return true;
                    return false;
                })
                .toArray();

            return results.map(r => r.upc);
        } catch (err) {
            console.warn('Error buscando por ubicación:', err);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER MAPA DE UBICACIONES (para visualización)
    // ═══════════════════════════════════════════════════════════
    async getLocationMap() {
        try {
            const allLocations = await db.ubicaciones_historico.toArray();
            
            // Agrupar por ubicación
            const map = new Map();
            
            allLocations.forEach(item => {
                const loc = item.ubicacion;
                if (!loc) return;
                
                if (!map.has(loc)) {
                    map.set(loc, { ubicacion: loc, productos: [], count: 0 });
                }
                
                map.get(loc).productos.push(item.upc);
                map.get(loc).count++;
            });

            return Array.from(map.values())
                .sort((a, b) => b.count - a.count);
        } catch (err) {
            console.warn('Error generando mapa:', err);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // LIMPIAR UBICACIONES ANTIGUAS
    // ═══════════════════════════════════════════════════════════
    async cleanOldLocations(daysOld = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const cutoffISO = cutoffDate.toISOString();

            const oldRecords = await db.ubicaciones_historico
                .filter(item => item.ultima_actualizacion < cutoffISO)
                .toArray();

            if (oldRecords.length > 0) {
                await db.ubicaciones_historico.bulkDelete(oldRecords.map(r => r.upc));
                console.log(`🧹 ${oldRecords.length} ubicaciones antiguas eliminadas`);
            }

            return oldRecords.length;
        } catch (err) {
            console.warn('Error limpiando ubicaciones:', err);
            return 0;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ESTADÍSTICAS
    // ═══════════════════════════════════════════════════════════
    async getStats() {
        try {
            const all = await db.ubicaciones_historico.toArray();
            const uniqueLocations = new Set(all.map(a => a.ubicacion));

            return {
                totalProductos: all.length,
                ubicacionesUnicas: uniqueLocations.size,
                ultimaActualizacion: all.length > 0 
                    ? all.sort((a, b) => b.ultima_actualizacion?.localeCompare(a.ultima_actualizacion))[0]?.ultima_actualizacion
                    : null
            };
        } catch (err) {
            return { totalProductos: 0, ubicacionesUnicas: 0, ultimaActualizacion: null };
        }
    }
};

// Exponer al window
window.LocationModel = LocationModel;