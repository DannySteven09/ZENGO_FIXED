// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Administración
// Gestiona carga de datos, reportes y operaciones administrativas
// CORREGIDO: Sin alta/baja prioridad en resumen
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
    // MOSTRAR RESUMEN DE IMPORTACIÓN (CORREGIDO)
    // ═══════════════════════════════════════════════════════════
    showImportSummary(result) {
        const { items, stats, categories } = result;

        // Calcular existencia total
        const existenciaTotal = items.reduce((acc, p) => acc + (p.stock_sistema || 0), 0);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content glass" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-check-circle text-success"></i> Importación Exitosa</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Estadísticas principales -->
                    <div class="import-stats">
                        <div class="stat-row highlight">
                            <span><i class="fas fa-boxes"></i> Total productos</span>
                            <strong>${stats.total.toLocaleString()}</strong>
                        </div>
                        <div class="stat-row">
                            <span><i class="fas fa-layer-group"></i> Categorías detectadas</span>
                            <strong>${stats.categories}</strong>
                        </div>
                        <div class="stat-row">
                            <span><i class="fas fa-cubes"></i> Existencia total</span>
                            <strong>${existenciaTotal.toLocaleString()} unidades</strong>
                        </div>
                        <div class="stat-row">
                            <span><i class="fas fa-coins"></i> Valor total inventario</span>
                            <strong>₡${stats.totalValue.toLocaleString()}</strong>
                        </div>
                    </div>
                    
                    <!-- Grid de categorías -->
                    <div class="categories-preview">
                        <h4><i class="fas fa-th-large"></i> Productos por Categoría:</h4>
                        <div class="cat-grid">
                            ${categories.map(([nombre, count], index) => {
                                const colores = ['#C8102E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];
                                const color = colores[index % colores.length];
                                const porcentaje = ((count / stats.total) * 100).toFixed(1);
                                return `
                                    <div class="cat-card" style="border-left: 4px solid ${color}">
                                        <div class="cat-header">
                                            <span class="cat-name">${nombre}</span>
                                            <span class="cat-count" style="background: ${color}">${count}</span>
                                        </div>
                                        <div class="cat-bar">
                                            <div class="cat-bar-fill" style="width: ${porcentaje}%; background: ${color}"></div>
                                        </div>
                                        <span class="cat-percent">${porcentaje}%</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Confirmación de guardado -->
                    <div class="save-status">
                        <div class="save-item success">
                            <i class="fas fa-database"></i>
                            <span>Guardado en Dexie (local)</span>
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="save-item ${navigator.onLine ? 'success' : 'pending'}">
                            <i class="fas fa-cloud"></i>
                            <span>Sincronizado con Supabase</span>
                            <i class="fas fa-${navigator.onLine ? 'check' : 'clock'}"></i>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cerrar
                    </button>
                    <button class="btn-primary" onclick="AdminController.verDashboard(); this.closest('.modal-overlay').remove()">
                        <i class="fas fa-chart-pie"></i> Ver Dashboard
                    </button>
                </div>
            </div>
        `;

        // Estilos para el modal
        const style = document.createElement('style');
        style.innerHTML = `
            .import-stats { 
                display: flex; 
                flex-direction: column; 
                gap: 12px; 
                margin-bottom: 24px; 
            }
            .stat-row { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                padding: 12px 16px; 
                background: rgba(255,255,255,0.05); 
                border-radius: 10px; 
            }
            .stat-row.highlight {
                background: rgba(200, 16, 46, 0.15);
                border: 1px solid rgba(200, 16, 46, 0.3);
            }
            .stat-row span {
                display: flex;
                align-items: center;
                gap: 10px;
                color: rgba(255,255,255,0.7);
            }
            .stat-row strong {
                font-family: 'JetBrains Mono', monospace;
                font-size: 16px;
            }
            .categories-preview { 
                margin-bottom: 24px;
            }
            .categories-preview h4 { 
                margin-bottom: 16px; 
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: rgba(255,255,255,0.6);
            }
            .cat-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 12px;
            }
            .cat-card {
                background: rgba(255,255,255,0.03);
                border-radius: 8px;
                padding: 12px;
            }
            .cat-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .cat-name {
                font-weight: 600;
                font-size: 13px;
            }
            .cat-count {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                color: white;
            }
            .cat-bar {
                height: 4px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 4px;
            }
            .cat-bar-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.5s ease;
            }
            .cat-percent {
                font-size: 10px;
                color: rgba(255,255,255,0.4);
            }
            .save-status {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 16px;
                background: rgba(255,255,255,0.02);
                border-radius: 10px;
            }
            .save-item {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 13px;
            }
            .save-item.success {
                color: #10B981;
            }
            .save-item.pending {
                color: #F59E0B;
            }
            .save-item span {
                flex: 1;
            }
            .modal-footer {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            .btn-primary {
                background: #C8102E;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .btn-secondary {
                background: rgba(255,255,255,0.1);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
            }
        `;
        modal.appendChild(style);

        document.body.appendChild(modal);
    },

    // Ver dashboard después de importar
    verDashboard() {
        if (typeof AdminView !== 'undefined' && AdminView.showSection) {
            AdminView.showSection('dashboard');
        }
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

            // Obtener categorías
            const categorias = await InventoryModel.getCategories();

            return {
                diffTotal: diferenciaNeta,
                precision: precision,
                lineasContadas: lineasContadas,
                lineasTotales: productos.length,
                mermaMonetaria: mermaMonetaria,
                sobraMonetaria: sobraMonetaria,
                hallazgosPendientes: hallazgos.length,
                tareasActivas: 0,
                auxiliaresActivos: 0,
                categorias: categorias
            };

        } catch (error) {
            console.error('Error obteniendo stats:', error);
            return {
                diffTotal: 0,
                precision: 0,
                lineasContadas: 0,
                lineasTotales: 0,
                mermaMonetaria: 0,
                sobraMonetaria: 0,
                categorias: []
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