// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Ciclos de Conteo
// Gestiona el ciclo de vida completo de una tarea de inventario
// ═══════════════════════════════════════════════════════════════

import db from '../config/dexie-db.js';
import supabase from '../config/supabase.js';
import { LocationModel } from '../models/LocationModel.js';
import { SyncManager } from './SyncManager.js';

export const CycleController = {
    
    currentCycle: null,
    
    // ═══════════════════════════════════════════════════════════
    // INICIAR CICLO
    // ═══════════════════════════════════════════════════════════
    async startCycle(auxiliarId, tarea) {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        const cycle = {
            id: `cycle_${Date.now()}`,
            tarea_id: tarea?.id || null,
            auxiliar_id: auxiliarId,
            auxiliar_nombre: session.name || 'Auxiliar',
            categoria_id: tarea?.categoria_id || null,
            categoria_nombre: tarea?.categoria || tarea?.categoria_nombre || 'Sin categoría',
            start_time: new Date().toISOString(),
            end_time: null,
            status: 'IN_PROGRESS',
            productos_total: tarea?.productos_total || 0,
            productos_contados: 0,
            precision: 0
        };

        // Guardar en Dexie
        await db.table('tareas').put({
            id: cycle.id,
            ...cycle
        });

        this.currentCycle = cycle;
        
        console.log(`✓ Ciclo iniciado: ${cycle.categoria_nombre}`);
        return cycle;
    },

    // ═══════════════════════════════════════════════════════════
    // PROCESAR ESCANEO
    // ═══════════════════════════════════════════════════════════
    async processScan(upc, cantidad, ubicacion) {
        if (!upc) {
            return { status: 'ERROR', msg: 'UPC vacío' };
        }

        const cleanUpc = upc.trim().toUpperCase();
        const cleanUbicacion = ubicacion?.trim()?.toUpperCase() || 'SIN-UBICACION';
        const cantidadNum = parseInt(cantidad) || 0;

        // Buscar producto en maestro local
        let producto = await db.productos.where('upc').equals(cleanUpc).first();
        
        if (!producto) {
            producto = await db.productos.where('sku').equals(cleanUpc).first();
        }

        // Si no existe en maestro local, es HALLAZGO
        if (!producto) {
            return { 
                status: 'HALLAZGO', 
                msg: 'Producto no está en el maestro',
                upc: cleanUpc
            };
        }

        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');

        // Crear registro de conteo
        const conteo = {
            tarea_id: this.currentCycle?.tarea_id || null,
            cycle_id: this.currentCycle?.id || null,
            producto_sku: producto.sku,
            upc: producto.upc,
            descripcion: producto.descripcion,
            stock_sistema: producto.stock_sistema || 0,
            cantidad_contada: cantidadNum,
            ubicacion: cleanUbicacion,
            diferencia: cantidadNum - (producto.stock_sistema || 0),
            auxiliar_id: session.id,
            auxiliar_nombre: session.name,
            timestamp: new Date().toISOString(),
            sync_status: 'pending'
        };

        // Guardar en Dexie
        const id = await db.conteos.add(conteo);
        conteo.id = id;

        // Actualizar ubicación en histórico
        await db.actualizarUbicacion(producto.upc, cleanUbicacion);

        // Actualizar contador del ciclo
        if (this.currentCycle) {
            this.currentCycle.productos_contados++;
        }

        return { 
            status: 'OK', 
            data: conteo,
            producto: producto
        };
    },

    // ═══════════════════════════════════════════════════════════
    // CERRAR CICLO
    // ═══════════════════════════════════════════════════════════
    async closeCycle() {
        if (!this.currentCycle) {
            return { status: 'ERROR', msg: 'No hay ciclo activo' };
        }

        const cycleId = this.currentCycle.id;
        const endTime = new Date().toISOString();

        // Obtener todos los conteos del ciclo
        const conteos = await db.conteos
            .where('cycle_id')
            .equals(cycleId)
            .toArray();

        // Calcular métricas
        const metrics = this.calculateMetrics(conteos);

        // Actualizar ubicaciones en batch
        await LocationModel.syncBatchLocations(conteos);

        // Generar reporte de diferencias
        const reporte = conteos.map(item => ({
            ...item,
            tipo_ajuste: item.diferencia > 0 ? 'SOBRA' : 
                        item.diferencia < 0 ? 'FALTA' : 'OK'
        }));

        // Actualizar ciclo como completado
        await db.table('tareas').update(cycleId, {
            status: 'COMPLETED',
            end_time: endTime,
            productos_contados: metrics.contados,
            precision: metrics.precision,
            diferencias_total: metrics.diferencias,
            merma_unidades: metrics.mermaUnidades,
            sobra_unidades: metrics.sobraUnidades
        });

        // Guardar reporte en Supabase si hay conexión
        if (navigator.onLine) {
            await this.saveReporteToCloud(reporte, metrics);
        }

        // Limpiar ciclo actual
        const closedCycle = { ...this.currentCycle, ...metrics, end_time: endTime };
        this.currentCycle = null;

        console.log(`✓ Ciclo cerrado. Precisión: ${metrics.precision}%`);
        
        return {
            status: 'OK',
            cycle: closedCycle,
            reporte: reporte,
            metrics: metrics
        };
    },

    // ═══════════════════════════════════════════════════════════
    // CALCULAR MÉTRICAS
    // ═══════════════════════════════════════════════════════════
    calculateMetrics(conteos) {
        const total = conteos.length;
        if (total === 0) {
            return {
                contados: 0,
                total: 0,
                precision: 0,
                diferencias: 0,
                mermaUnidades: 0,
                sobraUnidades: 0,
                mermaMonetaria: 0,
                sobraMonetaria: 0
            };
        }

        let exactos = 0;
        let mermaUnidades = 0;
        let sobraUnidades = 0;
        let mermaMonetaria = 0;
        let sobraMonetaria = 0;

        conteos.forEach(c => {
            const diff = c.diferencia || (c.cantidad_contada - c.stock_sistema);
            
            if (diff === 0) {
                exactos++;
            } else if (diff < 0) {
                mermaUnidades += Math.abs(diff);
                mermaMonetaria += Math.abs(diff) * (c.costo || 0);
            } else {
                sobraUnidades += diff;
                sobraMonetaria += diff * (c.costo || 0);
            }
        });

        return {
            contados: total,
            total: total,
            precision: ((exactos / total) * 100).toFixed(2),
            diferencias: total - exactos,
            exactos: exactos,
            mermaUnidades,
            sobraUnidades,
            mermaMonetaria,
            sobraMonetaria,
            netaUnidades: sobraUnidades - mermaUnidades,
            netaMonetaria: sobraMonetaria - mermaMonetaria
        };
    },

    // ═══════════════════════════════════════════════════════════
    // GUARDAR REPORTE EN LA NUBE
    // ═══════════════════════════════════════════════════════════
    async saveReporteToCloud(reporte, metrics) {
        try {
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
            
            // Guardar resumen del ciclo
            const { error: reporteError } = await supabase
                .from('reportes_ciclico')
                .insert({
                    cycle_id: this.currentCycle?.id,
                    tarea_id: this.currentCycle?.tarea_id,
                    auxiliar_id: session.id,
                    auxiliar_nombre: session.name,
                    categoria: this.currentCycle?.categoria_nombre,
                    fecha: new Date().toISOString().split('T')[0],
                    hora_inicio: this.currentCycle?.start_time,
                    hora_fin: new Date().toISOString(),
                    productos_contados: metrics.contados,
                    precision: parseFloat(metrics.precision),
                    diferencias: metrics.diferencias,
                    merma_unidades: metrics.mermaUnidades,
                    sobra_unidades: metrics.sobraUnidades,
                    merma_monetaria: metrics.mermaMonetaria,
                    sobra_monetaria: metrics.sobraMonetaria
                });

            if (reporteError) {
                console.warn('Error guardando reporte:', reporteError);
            }

            // Sincronizar conteos pendientes
            await SyncManager.syncConteos();

        } catch (err) {
            console.error('Error en saveReporteToCloud:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // PAUSAR CICLO
    // ═══════════════════════════════════════════════════════════
    async pauseCycle() {
        if (!this.currentCycle) return;

        await db.table('tareas').update(this.currentCycle.id, {
            status: 'PAUSED',
            paused_at: new Date().toISOString()
        });

        this.currentCycle.status = 'PAUSED';
        console.log('⏸ Ciclo pausado');
    },

    // ═══════════════════════════════════════════════════════════
    // REANUDAR CICLO
    // ═══════════════════════════════════════════════════════════
    async resumeCycle(cycleId) {
        const cycle = await db.table('tareas').get(cycleId);
        
        if (!cycle) {
            return { status: 'ERROR', msg: 'Ciclo no encontrado' };
        }

        await db.table('tareas').update(cycleId, {
            status: 'IN_PROGRESS',
            resumed_at: new Date().toISOString()
        });

        this.currentCycle = { ...cycle, status: 'IN_PROGRESS' };
        console.log('▶ Ciclo reanudado');
        
        return { status: 'OK', cycle: this.currentCycle };
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER CICLO ACTIVO
    // ═══════════════════════════════════════════════════════════
    async getActiveCycle(auxiliarId) {
        const cycle = await db.table('tareas')
            .where('auxiliar_id')
            .equals(auxiliarId)
            .and(c => c.status === 'IN_PROGRESS' || c.status === 'PAUSED')
            .first();

        if (cycle) {
            this.currentCycle = cycle;
        }

        return cycle;
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER CONTEOS DEL CICLO ACTUAL
    // ═══════════════════════════════════════════════════════════
    async getCurrentConteos() {
        if (!this.currentCycle) return [];

        return await db.conteos
            .where('cycle_id')
            .equals(this.currentCycle.id)
            .toArray();
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER HISTORIAL DE CICLOS
    // ═══════════════════════════════════════════════════════════
    async getCycleHistory(auxiliarId, limit = 10) {
        return await db.table('tareas')
            .where('auxiliar_id')
            .equals(auxiliarId)
            .reverse()
            .limit(limit)
            .toArray();
    }
};

// Exponer al window
window.CycleController = CycleController;