// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Administración
// Gestiona carga de datos, reportes y operaciones administrativas
// ═══════════════════════════════════════════════════════════════

import db from '../config/dexie-db.js';
import supabase from '../config/supabase.js';
import { InventoryModel } from '../models/InventoryModel.js';

export const AdminController = {

    // ═══════════════════════════════════════════════════════════
    // IMPORTAR ARCHIVO NETSUITE
    // ═══════════════════════════════════════════════════════════
    async handleNetsuiteImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv'
        ];
        
        const extension = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(extension)) {
            window.ZENGO?.toast('Formato no válido. Usa Excel o CSV', 'error');
            return;
        }

        window.ZENGO?.toast('Procesando archivo...', 'info');

        try {
            // Usar InventoryModel para procesar
            const result = await InventoryModel.processFile(file);

            // Mostrar resumen
            this.showImportSummary(result);

            window.ZENGO?.toast(`✓ ${result.items.length} productos cargados`, 'success');

            // Actualizar vista si existe
            if (typeof AdminView !== 'undefined') {
                AdminView.refreshData?.();
            }

        } catch (error) {
            console.error('Error importando:', error);
            window.ZENGO?.toast('Error al procesar archivo: ' + error, 'error');
        }

        // Limpiar input
        event.target.value = '';
    },

    // ═══════════════════════════════════════════════════════════
    // MOSTRAR RESUMEN DE IMPORTACIÓN
    // ═══════════════════════════════════════════════════════════
    showImportSummary(result) {
        const { items, stats, categories } = result;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content glass" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-check-circle text-success"></i> Importación Exitosa</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="import-stats">
                        <div class="stat-row">
                            <span>Total productos</span>
                            <strong>${stats.total.toLocaleString()}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Alta prioridad (70%)</span>
                            <strong class="text-error">${stats.highPriority.toLocaleString()}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Baja prioridad (30%)</span>
                            <strong>${stats.lowPriority.toLocaleString()}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Valor total inventario</span>
                            <strong>₡${stats.totalValue.toLocaleString()}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Categorías detectadas</span>
                            <strong>${stats.categories}</strong>
                        </div>
                    </div>
                    
                    <div class="categories-preview">
                        <h4>Categorías:</h4>
                        <div class="cat-tags">
                            ${categories.slice(0, 10).map(([nombre, count]) => 
                                `<span class="cat-tag">${nombre} (${count})</span>`
                            ).join('')}
                            ${categories.length > 10 ? `<span class="cat-tag">+${categories.length - 10} más</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Entendido
                    </button>
                </div>
            </div>
        `;

        // Estilos inline para el modal
        const style = document.createElement('style');
        style.innerHTML = `
            .import-stats { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
            .stat-row { display: flex; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; }
            .categories-preview h4 { margin-bottom: 10px; font-size: 14px; }
            .cat-tags { display: flex; flex-wrap: wrap; gap: 8px; }
            .cat-tag { padding: 4px 10px; background: rgba(200, 16, 46, 0.2); border-radius: 15px; font-size: 11px; }
        `;
        modal.appendChild(style);

        document.body.appendChild(modal);
    },

    // ═══════════════════════════════════════════════════════════
    // EXPORTAR DIFERENCIAS
    // ═══════════════════════════════════════════════════════════
    async exportDiferencias() {
        window.ZENGO?.toast('Generando reporte...', 'info');

        try {
            // Obtener conteos con diferencias
            const conteos = await db.conteos.toArray();
            
            // Filtrar solo los que tienen diferencia
            const conDiferencia = conteos.filter(c => {
                const diff = (c.cantidad_contada || 0) - (c.stock_sistema || 0);
                return diff !== 0;
            });

            if (conDiferencia.length === 0) {
                window.ZENGO?.toast('No hay diferencias registradas', 'info');
                return;
            }

            // Preparar datos para Excel
            const dataExport = conDiferencia.map(c => ({
                'UPC': c.upc,
                'SKU': c.producto_sku || c.sku,
                'DESCRIPCIÓN': c.descripcion || '',
                'STOCK SISTEMA': c.stock_sistema || 0,
                'CONTEO FÍSICO': c.cantidad_contada || 0,
                'DIFERENCIA': (c.cantidad_contada || 0) - (c.stock_sistema || 0),
                'TIPO': (c.cantidad_contada || 0) > (c.stock_sistema || 0) ? 'SOBRA' : 'FALTA',
                'UBICACIÓN': c.ubicacion || '',
                'RESPONSABLE': c.auxiliar_nombre || '',
                'FECHA': new Date(c.timestamp).toLocaleDateString('es-CR'),
                'HORA': new Date(c.timestamp).toLocaleTimeString('es-CR')
            }));

            // Crear workbook
            const ws = XLSX.utils.json_to_sheet(dataExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Diferencias');

            // Ajustar anchos de columna
            ws['!cols'] = [
                { wch: 15 }, // UPC
                { wch: 12 }, // SKU
                { wch: 35 }, // Descripción
                { wch: 12 }, // Stock
                { wch: 12 }, // Conteo
                { wch: 10 }, // Diferencia
                { wch: 8 },  // Tipo
                { wch: 12 }, // Ubicación
                { wch: 15 }, // Responsable
                { wch: 12 }, // Fecha
                { wch: 10 }  // Hora
            ];

            // Descargar
            const fecha = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `ZENGO_Diferencias_${fecha}.xlsx`);

            window.ZENGO?.toast(`✓ Reporte exportado (${conDiferencia.length} registros)`, 'success');

        } catch (error) {
            console.error('Error exportando:', error);
            window.ZENGO?.toast('Error al generar reporte', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // EXPORTAR REPORTE COMPLETO
    // ═══════════════════════════════════════════════════════════
    async exportReporteCompleto() {
        window.ZENGO?.toast('Generando reporte completo...', 'info');

        try {
            const productos = await db.productos.toArray();
            const conteos = await db.conteos.toArray();

            // Mapear conteos por UPC
            const conteoMap = new Map();
            conteos.forEach(c => {
                if (!conteoMap.has(c.upc)) {
                    conteoMap.set(c.upc, { cantidad: 0, ubicacion: '' });
                }
                conteoMap.get(c.upc).cantidad += c.cantidad_contada || 0;
                conteoMap.get(c.upc).ubicacion = c.ubicacion || conteoMap.get(c.upc).ubicacion;
            });

            // Combinar productos con conteos
            const dataExport = productos.map(p => {
                const conteo = conteoMap.get(p.upc);
                const cantidadFisica = conteo?.cantidad || 0;
                const diferencia = cantidadFisica - (p.stock_sistema || 0);

                return {
                    'UPC': p.upc,
                    'SKU': p.sku,
                    'DESCRIPCIÓN': p.descripcion,
                    'CATEGORÍA': p.categoria_id || p.categoria,
                    'STOCK SISTEMA': p.stock_sistema || 0,
                    'CONTEO FÍSICO': cantidadFisica,
                    'DIFERENCIA': diferencia,
                    'TIPO AJUSTE': diferencia > 0 ? 'SOBRA' : diferencia < 0 ? 'FALTA' : 'OK',
                    'PRECIO': p.precio || 0,
                    'VALOR DIFERENCIA': diferencia * (p.precio || 0),
                    'UBICACIÓN': conteo?.ubicacion || '',
                    'PRIORIDAD': p.prioridad || 'B',
                    'ESTATUS': p.estatus || 'ACTIVO'
                };
            });

            // Crear workbook con múltiples hojas
            const wb = XLSX.utils.book_new();

            // Hoja 1: Todos los productos
            const wsAll = XLSX.utils.json_to_sheet(dataExport);
            XLSX.utils.book_append_sheet(wb, wsAll, 'Inventario Completo');

            // Hoja 2: Solo diferencias
            const wsDiff = XLSX.utils.json_to_sheet(dataExport.filter(d => d.DIFERENCIA !== 0));
            XLSX.utils.book_append_sheet(wb, wsDiff, 'Diferencias');

            // Hoja 3: Resumen por categoría
            const resumenCat = this.calcularResumenCategoria(dataExport);
            const wsResumen = XLSX.utils.json_to_sheet(resumenCat);
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Categorías');

            // Descargar
            const fecha = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `ZENGO_ReporteCompleto_${fecha}.xlsx`);

            window.ZENGO?.toast('✓ Reporte completo exportado', 'success');

        } catch (error) {
            console.error('Error:', error);
            window.ZENGO?.toast('Error al generar reporte', 'error');
        }
    },

    calcularResumenCategoria(data) {
        const categorias = new Map();

        data.forEach(item => {
            const cat = item.CATEGORÍA || 'SIN CATEGORÍA';
            
            if (!categorias.has(cat)) {
                categorias.set(cat, {
                    'CATEGORÍA': cat,
                    'TOTAL SKUs': 0,
                    'CONTADOS': 0,
                    'PENDIENTES': 0,
                    'CON DIFERENCIA': 0,
                    'MERMA UNIDADES': 0,
                    'SOBRA UNIDADES': 0,
                    'VALOR MERMA': 0,
                    'VALOR SOBRA': 0
                });
            }

            const catData = categorias.get(cat);
            catData['TOTAL SKUs']++;
            
            if (item['CONTEO FÍSICO'] > 0) {
                catData['CONTADOS']++;
            } else {
                catData['PENDIENTES']++;
            }

            if (item.DIFERENCIA !== 0) {
                catData['CON DIFERENCIA']++;
                
                if (item.DIFERENCIA < 0) {
                    catData['MERMA UNIDADES'] += Math.abs(item.DIFERENCIA);
                    catData['VALOR MERMA'] += Math.abs(item['VALOR DIFERENCIA']);
                } else {
                    catData['SOBRA UNIDADES'] += item.DIFERENCIA;
                    catData['VALOR SOBRA'] += item['VALOR DIFERENCIA'];
                }
            }
        });

        return Array.from(categorias.values());
    },

    // ═══════════════════════════════════════════════════════════
    // EXPORTAR PARA NETSUITE
    // ═══════════════════════════════════════════════════════════
    async exportForNetSuite() {
        window.ZENGO?.toast('Generando archivo para NetSuite...', 'info');

        try {
            const conteos = await db.conteos.where('sync_status').equals('synced').toArray();
            
            // Agrupar por UPC (sumar cantidades)
            const agrupados = new Map();
            conteos.forEach(c => {
                if (!agrupados.has(c.upc)) {
                    agrupados.set(c.upc, {
                        upc: c.upc,
                        sku: c.producto_sku || c.sku,
                        cantidad: 0
                    });
                }
                agrupados.get(c.upc).cantidad += c.cantidad_contada || 0;
            });

            // Formato NetSuite
            const dataNetSuite = Array.from(agrupados.values()).map(item => ({
                'Item': item.sku,
                'Location': 'BODEGA_PRINCIPAL',
                'Quantity': item.cantidad,
                'Memo': `Conteo ZENGO ${new Date().toISOString().split('T')[0]}`
            }));

            // Crear CSV
            const headers = ['Item', 'Location', 'Quantity', 'Memo'];
            const csvContent = [
                headers.join(','),
                ...dataNetSuite.map(row => headers.map(h => `"${row[h]}"`).join(','))
            ].join('\n');

            // Descargar
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NetSuite_Import_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            window.ZENGO?.toast('✓ Archivo NetSuite generado', 'success');

        } catch (error) {
            console.error('Error:', error);
            window.ZENGO?.toast('Error al generar archivo', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER ESTADÍSTICAS DEL DASHBOARD
    // ═══════════════════════════════════════════════════════════
    async getDashboardStats() {
        try {
            const productos = await db.productos.toArray();
            const conteos = await db.conteos.toArray();
            const hallazgos = await db.hallazgos.where('sync_status').equals('pending').toArray();

            // Calcular métricas
            let diferenciaNeta = 0;
            let mermaMonetaria = 0;
            let sobraMonetaria = 0;
            let lineasContadas = 0;
            const productosContados = new Set();

            conteos.forEach(c => {
                productosContados.add(c.upc);
                const diff = (c.cantidad_contada || 0) - (c.stock_sistema || 0);
                diferenciaNeta += diff;

                const precio = c.precio || 0;
                if (diff < 0) {
                    mermaMonetaria += Math.abs(diff) * precio;
                } else if (diff > 0) {
                    sobraMonetaria += diff * precio;
                }
            });

            lineasContadas = productosContados.size;
            const precision = productos.length > 0 
                ? ((lineasContadas / productos.length) * 100).toFixed(1) 
                : 0;

            return {
                diffTotal: diferenciaNeta,
                precision: precision,
                lineasContadas: lineasContadas,
                lineasTotales: productos.length,
                mermaMonetaria: mermaMonetaria,
                sobraMonetaria: sobraMonetaria,
                hallazgosPendientes: hallazgos.length,
                tareasActivas: 0, // Se obtiene de Supabase
                auxiliaresActivos: 0 // Se obtiene de Supabase
            };

        } catch (error) {
            console.error('Error obteniendo stats:', error);
            return {
                diffTotal: 0,
                precision: 0,
                lineasContadas: 0,
                lineasTotales: 0,
                mermaMonetaria: 0,
                sobraMonetaria: 0
            };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER LOGS DE AUDITORÍA
    // ═══════════════════════════════════════════════════════════
    async getAuditLogs(limit = 50) {
        try {
            // Obtener de Supabase si hay conexión
            if (navigator.onLine) {
                const { data } = await supabase
                    .from('conteos_realizados')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(limit);

                return data || [];
            }

            // Fallback a Dexie
            return await db.conteos
                .orderBy('timestamp')
                .reverse()
                .limit(limit)
                .toArray();

        } catch (error) {
            console.warn('Error obteniendo logs:', error);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER RANKING DE AUXILIARES
    // ═══════════════════════════════════════════════════════════
    async getRanking() {
        try {
            const conteos = await db.conteos.toArray();

            // Agrupar por auxiliar
            const auxiliares = new Map();

            conteos.forEach(c => {
                const id = c.auxiliar_id || 'unknown';
                const nombre = c.auxiliar_nombre || 'Desconocido';

                if (!auxiliares.has(id)) {
                    auxiliares.set(id, {
                        id,
                        nombre,
                        conteos: 0,
                        exactos: 0,
                        categorias: new Set()
                    });
                }

                const aux = auxiliares.get(id);
                aux.conteos++;
                aux.categorias.add(c.categoria || 'General');

                const diff = (c.cantidad_contada || 0) - (c.stock_sistema || 0);
                if (diff === 0) aux.exactos++;
            });

            // Calcular precisión y ordenar
            return Array.from(auxiliares.values())
                .map(a => ({
                    ...a,
                    precision: a.conteos > 0 ? ((a.exactos / a.conteos) * 100).toFixed(1) : 0,
                    categoria: Array.from(a.categorias).join(', ')
                }))
                .sort((a, b) => b.precision - a.precision);

        } catch (error) {
            console.warn('Error obteniendo ranking:', error);
            return [];
        }
    },

    // ═══════════════════════════════════════════════════════════
    // LIMPIAR DATOS LOCALES
    // ═══════════════════════════════════════════════════════════
    async clearLocalData() {
        const confirmed = await window.ZENGO?.confirm(
            '¿Estás seguro de eliminar todos los datos locales? Esta acción no se puede deshacer.',
            'Limpiar Datos'
        );

        if (!confirmed) return;

        try {
            await db.productos.clear();
            await db.conteos.clear();
            await db.hallazgos.clear();
            await db.ubicaciones_historico.clear();
            await db.tareas.clear();
            await db.sync_queue.clear();

            window.ZENGO?.toast('Datos locales eliminados', 'success');
            location.reload();

        } catch (error) {
            console.error('Error limpiando datos:', error);
            window.ZENGO?.toast('Error al limpiar datos', 'error');
        }
    }
};

// Exponer al window
window.AdminController = AdminController;