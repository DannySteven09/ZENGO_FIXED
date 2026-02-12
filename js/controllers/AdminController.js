// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Administración
// Gestiona carga de datos, reportes y operaciones administrativas
// ═══════════════════════════════════════════════════════════════

const AdminController = {

    // ═══════════════════════════════════════════════════════════
    // IMPORTAR ARCHIVO NETSUITE
    // ═══════════════════════════════════════════════════════════
    async handleNetsuiteImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const extension = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(extension)) {
            window.ZENGO?.toast('Formato no válido. Usa Excel o CSV', 'error');
            return;
        }

        window.ZENGO?.toast('Procesando archivo...', 'info');

        try {
            const result = await window.InventoryModel.processFile(file);
            const sync = result.syncResult || { supabaseOk: false, dexieOk: false };

            if (sync.supabaseOk && sync.dexieOk) {
                window.ZENGO?.toast('Base de datos cargada correctamente y sincronizada', 'success', 5000);
            } else if (sync.dexieOk && !sync.supabaseOk) {
                window.ZENGO?.toast('Guardado local OK. Pendiente sincronizar con Supabase', 'warning', 5000);
            } else {
                window.ZENGO?.toast('Error al guardar los productos', 'error');
            }

            this.showImportSummary(result);

            if (typeof window.AdminView !== 'undefined') {
                window.AdminView.refreshData?.();
            }

        } catch (error) {
            console.error('Error importando:', error);
            window.ZENGO?.toast('Error al procesar archivo: ' + error, 'error');
        }

        event.target.value = '';
    },

    // ═══════════════════════════════════════════════════════════
    // MOSTRAR RESUMEN DE IMPORTACIÓN
    // ═══════════════════════════════════════════════════════════
    showImportSummary(result) {
        const { items, stats, categories, syncResult } = result;
        const sync = syncResult || { supabaseOk: false, dexieOk: false, supabaseCount: 0, dexieCount: 0 };
        const existenciaTotal = items.reduce((acc, p) => acc + (p.existencia || 0), 0);

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

                    <div class="save-status">
                        <div class="save-item ${sync.dexieOk ? 'success' : 'error'}">
                            <i class="fas fa-database"></i>
                            <span>Dexie (local): ${sync.dexieOk ? sync.dexieCount + ' productos guardados' : 'Error al guardar'}</span>
                            <i class="fas fa-${sync.dexieOk ? 'check' : 'times'}"></i>
                        </div>
                        <div class="save-item ${sync.supabaseOk ? 'success' : 'pending'}">
                            <i class="fas fa-cloud"></i>
                            <span>Supabase: ${sync.supabaseOk ? sync.supabaseCount + ' productos sincronizados' : 'Pendiente de sincronizar'}</span>
                            <i class="fas fa-${sync.supabaseOk ? 'check' : 'clock'}"></i>
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

        this.injectModalStyles();
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.8);
        `;

        document.body.appendChild(modal);
    },

    injectModalStyles() {
        if (document.getElementById('admin-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'admin-modal-styles';
        style.innerHTML = `
            .import-stats { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
            .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 10px; }
            .stat-row.highlight { background: rgba(200, 16, 46, 0.15); border: 1px solid rgba(200, 16, 46, 0.3); }
            .stat-row span { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.7); }
            .stat-row strong { font-family: 'JetBrains Mono', monospace; font-size: 16px; }
            .categories-preview { margin-bottom: 24px; }
            .categories-preview h4 { margin-bottom: 16px; font-size: 14px; display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.6); }
            .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
            .cat-card { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; }
            .cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .cat-name { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
            .cat-count { font-size: 11px; padding: 2px 8px; border-radius: 10px; color: white; font-weight: 600; }
            .cat-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
            .cat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
            .cat-percent { font-size: 11px; color: rgba(255,255,255,0.5); }
            .save-status { display: flex; flex-direction: column; gap: 8px; }
            .save-item { display: flex; align-items: center; gap: 12px; padding: 10px 15px; border-radius: 8px; font-size: 13px; }
            .save-item.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
            .save-item.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            .save-item.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            .save-item span { flex: 1; }
        `;
        document.head.appendChild(style);
    },

    verDashboard() {
        window.AdminView?.showSection?.('dashboard');
    },

    // ═══════════════════════════════════════════════════════════
    // EXPORTAR DIFERENCIAS
    // FIX: Usa 'existencia' (campo real en Supabase/Dexie)
    //      en vez de 'stock_sistema' que no existe
    // ═══════════════════════════════════════════════════════════
    async exportDiferencias() {
        try {
            const conteos = await window.db.conteos.toArray();
            const productos = await window.db.productos.toArray();

            const productosMap = new Map(productos.map(p => [p.upc, p]));

            const diferencias = conteos.map(c => {
                const prod = productosMap.get(c.upc) || {};
                const existenciaSistema = prod.existencia || 0;
                const cantidadContada = c.cantidad || 0;
                return {
                    UPC: c.upc,
                    SKU: prod.sku || '',
                    Descripcion: prod.descripcion || '',
                    Categoria: prod.categoria || '',
                    'Stock Sistema': existenciaSistema,
                    'Conteo Físico': cantidadContada,
                    Diferencia: cantidadContada - existenciaSistema,
                    Ubicacion: c.ubicacion || '',
                    Fecha: new Date(c.timestamp).toLocaleString('es-CR')
                };
            });

            const ws = XLSX.utils.json_to_sheet(diferencias);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Diferencias');
            
            XLSX.writeFile(wb, `ZENGO_Diferencias_${new Date().toISOString().split('T')[0]}.xlsx`);

            window.ZENGO?.toast('Reporte exportado', 'success');

        } catch (err) {
            console.error('Error exportando:', err);
            window.ZENGO?.toast('Error al exportar', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // CRUD DE USUARIOS (delega a AuthModel)
    // ═══════════════════════════════════════════════════════════
    async crearUsuario(userData) {
        try {
            const nuevoUsuario = await window.AuthModel.addUser(userData);
            window.ZENGO?.toast('Usuario creado exitosamente', 'success');
            return nuevoUsuario;
        } catch (err) {
            console.error('Error creando usuario:', err);
            window.ZENGO?.toast('Error al crear usuario: ' + err.message, 'error');
            return null;
        }
    },

    async actualizarUsuario(userId, userData) {
        try {
            const usuario = await window.AuthModel.updateUser(userId, userData);
            window.ZENGO?.toast('Usuario actualizado', 'success');
            return usuario;
        } catch (err) {
            console.error('Error actualizando usuario:', err);
            window.ZENGO?.toast('Error al actualizar: ' + err.message, 'error');
            return null;
        }
    },

    async eliminarUsuario(userId) {
        try {
            const confirmado = await window.ZENGO?.confirm(
                '¿Estás seguro de desactivar este usuario?',
                'Confirmar desactivación'
            );
            
            if (!confirmado) return false;

            await window.AuthModel.deleteUser(userId);
            window.ZENGO?.toast('Usuario desactivado', 'success');
            return true;
        } catch (err) {
            console.error('Error eliminando usuario:', err);
            window.ZENGO?.toast('Error al desactivar: ' + err.message, 'error');
            return false;
        }
    }
};

// Exponer globalmente
window.AdminController = AdminController;