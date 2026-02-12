// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Ciclos
// Maneja conteos cíclicos y registro de hallazgos
// ═══════════════════════════════════════════════════════════════

const CycleController = {

    // ═══════════════════════════════════════════════════════════
    // REGISTRAR CONTEO
    // ═══════════════════════════════════════════════════════════
    async registrarConteo(upc, cantidad, ubicacion, tareaId, auxiliarId) {
        try {
            const timestamp = new Date().toISOString();

            // Guardar en Dexie
            const conteoId = await window.db.conteos.add({
                upc: upc,
                cantidad: cantidad,
                ubicacion: ubicacion,
                tarea_id: tareaId,
                auxiliar_id: auxiliarId,
                timestamp: timestamp
            });

            // Guardar ubicación
            await window.LocationModel.saveLocation(upc, ubicacion, auxiliarId);

            // Actualizar tarea si existe
            if (tareaId) {
                await this.actualizarProgresoTarea(tareaId, upc, cantidad);
            }

            // Agregar a cola de sync
            await window.SyncManager.addToQueue('conteos_realizados', 'insert', {
                upc: upc,
                cantidad_contada: cantidad,
                ubicacion: ubicacion,
                tarea_id: tareaId,
                auxiliar_id: auxiliarId,
                timestamp: timestamp
            });

            return { success: true, id: conteoId };

        } catch (err) {
            console.error('Error registrando conteo:', err);
            return { success: false, error: err.message };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // REGISTRAR HALLAZGO
    // ═══════════════════════════════════════════════════════════
    async registrarHallazgo(datos) {
        try {
            const timestamp = new Date().toISOString();

            const hallazgoId = await window.db.hallazgos.add({
                upc: datos.upc,
                descripcion: datos.descripcion || '',
                cantidad: datos.cantidad || 0,
                ubicacion: datos.ubicacion || '',
                tarea_id: datos.tareaId,
                auxiliar_id: datos.auxiliarId,
                auxiliar_nombre: datos.auxiliarNombre || '',
                estado: 'pendiente',
                timestamp: timestamp
            });

            // Agregar a cola de sync
            await window.SyncManager.addToQueue('hallazgos', 'insert', {
                upc: datos.upc,
                descripcion: datos.descripcion,
                cantidad: datos.cantidad,
                ubicacion: datos.ubicacion,
                tarea_id: datos.tareaId,
                auxiliar_id: datos.auxiliarId,
                estado: 'pendiente',
                timestamp: timestamp
            });

            window.ZENGO?.toast('Hallazgo reportado', 'success');
            return { success: true, id: hallazgoId };

        } catch (err) {
            console.error('Error registrando hallazgo:', err);
            return { success: false, error: err.message };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ACTUALIZAR PROGRESO DE TAREA
    // ═══════════════════════════════════════════════════════════
    async actualizarProgresoTarea(tareaId, upc, cantidad) {
        try {
            const tarea = await window.db.tareas.get(tareaId);
            if (!tarea) return;

            // Buscar producto en la tarea
            const productos = tarea.productos || [];
            const productoIndex = productos.findIndex(p => p.upc === upc);

            if (productoIndex !== -1) {
                // Agregar conteo al producto
                productos[productoIndex].conteos = productos[productoIndex].conteos || [];
                productos[productoIndex].conteos.push({
                    cantidad: cantidad,
                    timestamp: new Date().toISOString()
                });

                // Calcular total contado
                const totalContado = productos[productoIndex].conteos.reduce((acc, c) => acc + c.cantidad, 0);
                productos[productoIndex].total_contado = totalContado;
                productos[productoIndex].diferencia = totalContado - (productos[productoIndex].existencia || 0);
            }

            // Calcular productos contados (al menos un conteo)
            const productosContados = productos.filter(p => p.conteos && p.conteos.length > 0).length;

            // Actualizar tarea
            await window.db.tareas.update(tareaId, {
                productos: productos,
                productos_contados: productosContados,
                estado: productosContados >= productos.length ? 'completado' : 'en_progreso'
            });

        } catch (err) {
            console.error('Error actualizando progreso:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER TAREA DEL AUXILIAR
    // ═══════════════════════════════════════════════════════════
    async getTareaActiva(auxiliarId) {
        try {
            const tareas = await window.db.tareas
                .where('auxiliar_id')
                .equals(auxiliarId)
                .toArray();

            // Buscar tarea en progreso o pendiente
            const tareaActiva = tareas.find(t => 
                t.estado === 'en_progreso' || t.estado === 'pendiente'
            );

            return tareaActiva || null;

        } catch (err) {
            console.error('Error obteniendo tarea:', err);
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // INICIAR TAREA
    // ═══════════════════════════════════════════════════════════
    async iniciarTarea(tareaId) {
        try {
            await window.db.tareas.update(tareaId, {
                estado: 'en_progreso',
                fecha_inicio: new Date().toISOString()
            });

            window.ZENGO?.toast('Tarea iniciada', 'success');
            return true;

        } catch (err) {
            console.error('Error iniciando tarea:', err);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // FINALIZAR TAREA
    // ═══════════════════════════════════════════════════════════
    async finalizarTarea(tareaId) {
        try {
            const tarea = await window.db.tareas.get(tareaId);
            if (!tarea) return false;

            // Verificar si hay productos sin contar
            const productos = tarea.productos || [];
            const sinContar = productos.filter(p => !p.conteos || p.conteos.length === 0);

            if (sinContar.length > 0) {
                const confirmado = await window.ZENGO?.confirm(
                    `Hay ${sinContar.length} productos sin contar. ¿Deseas finalizar de todos modos?`,
                    'Confirmar finalización'
                );
                if (!confirmado) return false;
            }

            await window.db.tareas.update(tareaId, {
                estado: 'completado',
                fecha_fin: new Date().toISOString()
            });

            // Sincronizar ubicaciones
            await window.LocationModel.syncToCloud();

            window.ZENGO?.toast('Tarea finalizada', 'success');
            return true;

        } catch (err) {
            console.error('Error finalizando tarea:', err);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER RESUMEN DE CONTEOS
    // FIX: Usa 'existencia' (campo real en Supabase/Dexie)
    //      en vez de 'stock_sistema' que no existe
    // ═══════════════════════════════════════════════════════════
    async getResumenConteos(tareaId = null) {
        try {
            let conteos;
            
            if (tareaId) {
                conteos = await window.db.conteos.where('tarea_id').equals(tareaId).toArray();
            } else {
                conteos = await window.db.conteos.toArray();
            }

            const productos = await window.db.productos.toArray();
            const productosMap = new Map(productos.map(p => [p.upc, p]));

            let totalDiferencia = 0;
            let mermaUnidades = 0;
            let sobraUnidades = 0;
            let mermaMonetaria = 0;
            let sobraMonetaria = 0;

            conteos.forEach(c => {
                const prod = productosMap.get(c.upc);
                if (prod) {
                    // FIX: usar 'existencia' que es el campo real
                    const diferencia = (c.cantidad || 0) - (prod.existencia || 0);
                    totalDiferencia += diferencia;

                    if (diferencia < 0) {
                        mermaUnidades += Math.abs(diferencia);
                        mermaMonetaria += Math.abs(diferencia) * (prod.precio || 0);
                    } else if (diferencia > 0) {
                        sobraUnidades += diferencia;
                        sobraMonetaria += diferencia * (prod.precio || 0);
                    }
                }
            });

            return {
                totalConteos: conteos.length,
                totalDiferencia,
                mermaUnidades,
                sobraUnidades,
                mermaMonetaria,
                sobraMonetaria
            };

        } catch (err) {
            console.error('Error obteniendo resumen:', err);
            return {
                totalConteos: 0,
                totalDiferencia: 0,
                mermaUnidades: 0,
                sobraUnidades: 0,
                mermaMonetaria: 0,
                sobraMonetaria: 0
            };
        }
    }
};

// Exponer globalmente
window.CycleController = CycleController;