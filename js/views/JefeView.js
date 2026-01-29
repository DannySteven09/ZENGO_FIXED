// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista Jefe de Bodega
// Dashboard de supervisión con asignación de categorías y hallazgos
// CORREGIDO: Línea 427 loadAuxiliares - ID cambiado a auxiliares-count
// ═══════════════════════════════════════════════════════════════

import { AuthController } from '../controllers/AuthController.js';
import { AuthModel } from '../models/AuthModel.js';
import { ScannerController } from '../controllers/ScannerController.js';
import supabase from '../config/supabase.js';
import db from '../config/dexie-db.js';

export const JefeView = {

    asignacionActual: {
        categoriaId: null,
        categoriaNombre: null,
        categoriaProductos: 0,
        auxiliarId: null,
        auxiliarNombre: null
    },

    render(container, state = {}) {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        const defaultState = {
            precision: 0,
            progresoGlobal: 0,
            categoriasActivas: [],
            hallazgos: [],
            ranking: [],
            auxiliaresActivos: [],
            tareasActivas: []
        };
        
        state = { ...defaultState, ...state };

        container.innerHTML = `
        <div class="dashboard-wrapper jefe-theme">
            <aside id="sidebar" class="sidebar glass">
                <div class="sidebar-header">
                    <div class="logo">ZEN<span>GO</span></div>
                    <span class="badge-boss">JEFE</span>
                    <button class="toggle-btn" onclick="JefeView.toggleSidebar()">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
                
                <div class="user-card">
                    <div class="user-avatar jefe">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="user-info">
                        <span class="user-name">${session.name || 'Jefe de Bodega'}</span>
                        <span class="user-role">SUPERVISOR</span>
                    </div>
                </div>
                
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-section="mando" onclick="JefeView.showSection('mando')">
                        <i class="fas fa-satellite-dish"></i> 
                        <span>Mando Central</span>
                    </a>
                    <a href="#" class="nav-item" data-section="asignar" onclick="JefeView.showSection('asignar')">
                        <i class="fas fa-tasks"></i> 
                        <span>Asignar Tareas</span>
                    </a>
                    <a href="#" class="nav-item badge-parent" data-section="hallazgos" onclick="JefeView.showSection('hallazgos')">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <span>Hallazgos</span>
                        <span class="badge-alert" id="hallazgos-count">0</span>
                    </a>
                    <a href="#" class="nav-item" data-section="consulta" onclick="JefeView.showConsultaModal()">
                        <i class="fas fa-search"></i> 
                        <span>Modo Consulta</span>
                    </a>
                    <a href="#" class="nav-item" data-section="reportes" onclick="JefeView.showSection('reportes')">
                        <i class="fas fa-chart-bar"></i> 
                        <span>Reportes</span>
                    </a>
                    <div class="nav-spacer"></div>
                    <a href="#" class="nav-item theme-toggle" onclick="JefeView.toggleTheme()">
                        <i class="fas fa-moon"></i>
                        <span>Modo Oscuro</span>
                    </a>
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()">
                        <i class="fas fa-power-off"></i> 
                        <span>Cerrar Turno</span>
                    </a>
                </nav>
            </aside>

            <main class="main-content">
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="JefeView.toggleSidebar()">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div>
                            <h1>Panel de <span class="accent-purple">Supervisión</span></h1>
                            <p class="text-dim">Control de Cíclicos y Asignaciones</p>
                        </div>
                    </div>
                    <div class="header-stats">
                        <div id="sync-container" class="sync-badge online">
                            <div id="sync-dot" class="dot"></div>
                            <span id="sync-text">ONLINE</span>
                        </div>
                        <button class="btn-refresh" onclick="JefeView.refreshAll()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </header>

                <div id="section-mando" class="section-content">
                    <section class="quick-metrics">
                        <div class="qm-card glass">
                            <div class="qm-icon purple"><i class="fas fa-layer-group"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="total-categorias">0</span>
                                <span class="qm-label">Categorías Cargadas</span>
                            </div>
                        </div>
                        <div class="qm-card glass">
                            <div class="qm-icon blue"><i class="fas fa-clipboard-list"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="tareas-activas">0</span>
                                <span class="qm-label">Tareas Asignadas</span>
                            </div>
                        </div>
                        <div class="qm-card glass">
                            <div class="qm-icon orange"><i class="fas fa-exclamation-circle"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="hallazgos-pendientes">0</span>
                                <span class="qm-label">Hallazgos Pendientes</span>
                            </div>
                        </div>
                        <div class="qm-card glass">
                            <div class="qm-icon green"><i class="fas fa-users"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="auxiliares-count">0</span>
                                <span class="qm-label">Auxiliares Disponibles</span>
                            </div>
                        </div>
                    </section>

                    <section class="categorias-resumen glass">
                        <div class="section-header">
                            <h3><i class="fas fa-th-large"></i> Categorías del Inventario</h3>
                            <span class="text-dim" id="productos-total-label">0 productos totales</span>
                        </div>
                        <div class="categorias-grid" id="categorias-mando">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando categorías...</p>
                            </div>
                        </div>
                    </section>

                    <section class="tareas-activas glass">
                        <div class="section-header">
                            <h3><i class="fas fa-tasks"></i> Tareas en Progreso</h3>
                        </div>
                        <div class="tareas-list" id="tareas-list">
                            <div class="empty-state small">
                                <i class="fas fa-clipboard-check"></i>
                                <p>No hay tareas asignadas</p>
                                <button class="btn-primary small" onclick="JefeView.showSection('asignar')">
                                    <i class="fas fa-plus"></i> Asignar Tarea
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <div id="section-asignar" class="section-content" style="display:none;">
                    <section class="asignar-section">
                        <div class="section-header">
                            <h2><i class="fas fa-tasks"></i> Asignar Categoría a Auxiliar</h2>
                        </div>
                        <div class="asignar-grid">
                            <div class="asignar-card glass">
                                <h4><i class="fas fa-folder"></i> 1. Seleccionar Categoría</h4>
                                <div class="categorias-asignar" id="categorias-disponibles">
                                    <div class="loading-state">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <p>Cargando categorías...</p>
                                    </div>
                                </div>
                            </div>
                            <div class="asignar-card glass">
                                <h4><i class="fas fa-user"></i> 2. Seleccionar Auxiliar</h4>
                                <div class="auxiliares-list" id="auxiliares-disponibles">
                                    <div class="loading-state">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <p>Cargando auxiliares...</p>
                                    </div>
                                </div>
                            </div>
                            <div class="asignar-card glass wide">
                                <h4><i class="fas fa-clipboard-check"></i> 3. Confirmar Asignación</h4>
                                <div class="asignar-resumen" id="asignar-resumen">
                                    <div class="resumen-empty">
                                        <i class="fas fa-arrow-up"></i>
                                        <p>Selecciona una categoría y un auxiliar</p>
                                    </div>
                                </div>
                                <div class="asignar-actions">
                                    <button class="btn-secondary" onclick="JefeView.limpiarAsignacion()">
                                        <i class="fas fa-eraser"></i> Limpiar
                                    </button>
                                    <button class="btn-primary" id="btn-confirmar-asignacion" onclick="JefeView.confirmarAsignacion()" disabled>
                                        <i class="fas fa-paper-plane"></i> Asignar Tarea
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div id="section-hallazgos" class="section-content" style="display:none;">
                    <section class="hallazgos-section">
                        <div class="section-header">
                            <h2><i class="fas fa-exclamation-triangle"></i> Gestión de Hallazgos</h2>
                        </div>
                        <div class="hallazgos-container glass" id="hallazgos-container">
                            <div class="empty-state">
                                <i class="fas fa-check-circle"></i>
                                <p>No hay hallazgos pendientes</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div id="section-reportes" class="section-content" style="display:none;">
                    <section class="reportes-section">
                        <div class="section-header">
                            <h2><i class="fas fa-chart-bar"></i> Reportes</h2>
                        </div>
                        <div class="reportes-grid">
                            <div class="reporte-card glass" onclick="JefeView.exportarCiclicos()">
                                <div class="reporte-icon"><i class="fas fa-file-excel"></i></div>
                                <h4>Exportar Cíclicos</h4>
                                <p>Descargar todos los conteos realizados</p>
                            </div>
                            <div class="reporte-card glass" onclick="JefeView.exportarDiferencias()">
                                <div class="reporte-icon orange"><i class="fas fa-balance-scale"></i></div>
                                <h4>Reporte de Diferencias</h4>
                                <p>Productos con discrepancias</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
        ${this.renderModals()}
        `;

        this.injectStyles();
        this.loadDashboardData();
    },

    async loadDashboardData() {
        await this.loadCategorias();
        await this.loadTareas();
        await this.loadHallazgos();
        this.loadAuxiliares();
    },

    async refreshAll() {
        window.ZENGO?.toast('Actualizando datos...', 'info');
        await this.loadDashboardData();
        window.ZENGO?.toast('Datos actualizados', 'success');
    },

    async loadCategorias() {
        try {
            const productos = await db.productos.toArray();
            
            if (productos.length === 0) {
                document.getElementById('categorias-mando').innerHTML = '<div class="empty-state"><i class="fas fa-database"></i><p>No hay productos cargados</p><small>El administrador debe cargar el Excel primero</small></div>';
                document.getElementById('categorias-disponibles').innerHTML = '<div class="empty-state small"><i class="fas fa-inbox"></i><p>Sin categorías disponibles</p></div>';
                return;
            }

            const categorias = new Map();
            productos.forEach(p => {
                const cat = p.categoria_id || p.categoria || 'GENERAL';
                if (!categorias.has(cat)) {
                    categorias.set(cat, { nombre: cat, productos: [], existencia: 0 });
                }
                categorias.get(cat).productos.push(p);
                categorias.get(cat).existencia += p.stock_sistema || 0;
            });

            const categoriasArray = Array.from(categorias.values()).sort((a, b) => b.productos.length - a.productos.length);

            document.getElementById('total-categorias').textContent = categoriasArray.length;
            document.getElementById('productos-total-label').textContent = productos.length + ' productos totales';

            const tareasAsignadas = await this.getTareasActivas();
            const categoriasAsignadas = new Set(tareasAsignadas.map(t => t.categoria));

            const colores = ['#C8102E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];
            
            document.getElementById('categorias-mando').innerHTML = categoriasArray.map((cat, i) => {
                const color = colores[i % colores.length];
                const asignada = categoriasAsignadas.has(cat.nombre);
                return '<div class="categoria-card-mini ' + (asignada ? 'asignada' : '') + '" style="border-left: 4px solid ' + color + '"><div class="cat-header"><span class="cat-name">' + cat.nombre + '</span>' + (asignada ? '<span class="badge-asignada">Asignada</span>' : '') + '</div><div class="cat-stats"><span><i class="fas fa-boxes"></i> ' + cat.productos.length + ' líneas</span><span><i class="fas fa-cubes"></i> ' + cat.existencia.toLocaleString() + ' uds</span></div></div>';
            }).join('');

            const categoriasDisponibles = categoriasArray.filter(c => !categoriasAsignadas.has(c.nombre));
            
            if (categoriasDisponibles.length === 0) {
                document.getElementById('categorias-disponibles').innerHTML = '<div class="empty-state small"><i class="fas fa-check-circle text-success"></i><p>Todas las categorías están asignadas</p></div>';
            } else {
                document.getElementById('categorias-disponibles').innerHTML = categoriasDisponibles.map((cat, i) => {
                    const color = colores[i % colores.length];
                    return '<div class="categoria-item" data-id="' + cat.nombre + '" onclick="JefeView.selectCategoria(\'' + cat.nombre + '\', ' + cat.productos.length + ')" style="border-left: 4px solid ' + color + '"><div class="cat-info"><strong>' + cat.nombre + '</strong><small>' + cat.productos.length + ' líneas • ' + cat.existencia.toLocaleString() + ' unidades</small></div><i class="fas fa-chevron-right"></i></div>';
                }).join('');
            }
        } catch (err) {
            console.error('Error cargando categorías:', err);
        }
    },

    loadAuxiliares() {
        const auxiliares = AuthModel.getAuxiliares();
        
        const countEl = document.getElementById('auxiliares-count');
        if (countEl) {
            countEl.textContent = auxiliares.length;
        }

        const container = document.getElementById('auxiliares-disponibles');
        if (container) {
            container.innerHTML = auxiliares.map(aux => '<div class="auxiliar-item" data-id="' + aux.id + '" onclick="JefeView.selectAuxiliar(' + aux.id + ', \'' + aux.nombre + ' ' + aux.apellido + '\')"><div class="aux-avatar">' + aux.nombre.charAt(0) + '</div><div class="aux-info"><strong>' + aux.nombre + ' ' + aux.apellido + '</strong><small>' + aux.email + '</small></div><i class="fas fa-chevron-right"></i></div>').join('');
        }
    },

    async loadTareas() {
        try {
            const tareas = await db.tareas.toArray();
            const tareasActivas = tareas.filter(t => t.estado !== 'completado' && t.estado !== 'cancelado');

            document.getElementById('tareas-activas').textContent = tareasActivas.length;

            const container = document.getElementById('tareas-list');
            if (tareasActivas.length === 0) {
                container.innerHTML = '<div class="empty-state small"><i class="fas fa-clipboard-check"></i><p>No hay tareas asignadas</p><button class="btn-primary small" onclick="JefeView.showSection(\'asignar\')"><i class="fas fa-plus"></i> Asignar Tarea</button></div>';
                return;
            }

            container.innerHTML = tareasActivas.map(t => '<div class="tarea-row" data-id="' + t.id + '"><div class="tarea-info"><strong>' + t.categoria + '</strong><small>' + (t.productos_total || 0) + ' líneas • Asignado a: ' + t.auxiliar_nombre + '</small></div><div class="tarea-status"><span class="status-badge ' + (t.estado || 'pendiente') + '">' + (t.estado === 'en_progreso' ? 'En Progreso' : 'Pendiente') + '</span></div><div class="tarea-actions"><button class="btn-icon-sm danger" onclick="JefeView.cancelarTarea(\'' + t.id + '\')" title="Cancelar"><i class="fas fa-times"></i></button></div></div>').join('');
        } catch (err) {
            console.error('Error cargando tareas:', err);
        }
    },

    async getTareasActivas() {
        try {
            const tareas = await db.tareas.toArray();
            return tareas.filter(t => t.estado !== 'completado' && t.estado !== 'cancelado');
        } catch (err) {
            return [];
        }
    },

    async loadHallazgos() {
        try {
            const hallazgos = await db.hallazgos.where('estado').equals('pendiente').toArray();
            
            document.getElementById('hallazgos-count').textContent = hallazgos.length;
            document.getElementById('hallazgos-pendientes').textContent = hallazgos.length;

            const container = document.getElementById('hallazgos-container');
            
            if (hallazgos.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle text-success"></i><p>No hay hallazgos pendientes</p></div>';
                return;
            }

            container.innerHTML = '<table class="hallazgos-table"><thead><tr><th>UPC</th><th>DESCRIPCIÓN</th><th>CANTIDAD</th><th>UBICACIÓN</th><th>REPORTADO POR</th><th>FECHA</th><th>ACCIONES</th></tr></thead><tbody>' + hallazgos.map(h => '<tr data-id="' + h.id + '"><td><code>' + (h.upc || '-') + '</code></td><td>' + (h.descripcion || 'Sin descripción') + '</td><td class="text-center">' + (h.cantidad || 0) + '</td><td>' + (h.ubicacion || '-') + '</td><td>' + (h.auxiliar_nombre || 'Desconocido') + '</td><td class="mono">' + new Date(h.timestamp).toLocaleDateString('es-CR') + '</td><td><div class="hallazgo-actions"><button class="btn-approve" onclick="JefeView.aprobarHallazgo(\'' + h.id + '\')" title="Aprobar"><i class="fas fa-check"></i></button><button class="btn-reject" onclick="JefeView.rechazarHallazgo(\'' + h.id + '\')" title="Rechazar"><i class="fas fa-times"></i></button></div></td></tr>').join('') + '</tbody></table>';
        } catch (err) {
            console.error('Error cargando hallazgos:', err);
        }
    },

    selectCategoria(nombre, productosCount) {
        this.asignacionActual.categoriaId = nombre;
        this.asignacionActual.categoriaNombre = nombre;
        this.asignacionActual.categoriaProductos = productosCount;
        document.querySelectorAll('.categoria-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector('.categoria-item[data-id="' + nombre + '"]');
        if (el) el.classList.add('selected');
        this.updateResumenAsignacion();
    },

    selectAuxiliar(id, nombre) {
        this.asignacionActual.auxiliarId = id;
        this.asignacionActual.auxiliarNombre = nombre;
        document.querySelectorAll('.auxiliar-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector('.auxiliar-item[data-id="' + id + '"]');
        if (el) el.classList.add('selected');
        this.updateResumenAsignacion();
    },

    updateResumenAsignacion() {
        const { categoriaNombre, categoriaProductos, auxiliarId, auxiliarNombre } = this.asignacionActual;
        const container = document.getElementById('asignar-resumen');
        const btnConfirmar = document.getElementById('btn-confirmar-asignacion');

        if (categoriaNombre && auxiliarId) {
            container.innerHTML = '<div class="resumen-preview"><div class="resumen-item categoria"><i class="fas fa-folder"></i><div><strong>' + categoriaNombre + '</strong><small>' + categoriaProductos + ' líneas de productos</small></div></div><div class="resumen-arrow"><i class="fas fa-arrow-right"></i></div><div class="resumen-item auxiliar"><i class="fas fa-user"></i><div><strong>' + auxiliarNombre + '</strong><small>Auxiliar asignado</small></div></div></div>';
            btnConfirmar.disabled = false;
        } else {
            container.innerHTML = '<div class="resumen-empty"><i class="fas fa-arrow-up"></i><p>Selecciona una categoría y un auxiliar</p></div>';
            btnConfirmar.disabled = true;
        }
    },

    async confirmarAsignacion() {
        const { categoriaId, categoriaNombre, categoriaProductos, auxiliarId, auxiliarNombre } = this.asignacionActual;
        
        if (!categoriaId || !auxiliarId) {
            window.ZENGO?.toast('Selecciona categoría y auxiliar', 'error');
            return;
        }

        try {
            const productos = await db.productos.where('categoria_id').equals(categoriaId).toArray();

            const tareaId = 'tarea_' + Date.now();
            await db.tareas.put({
                id: tareaId,
                categoria: categoriaNombre,
                categoria_id: categoriaId,
                auxiliar_id: auxiliarId,
                auxiliar_nombre: auxiliarNombre,
                productos_total: productos.length,
                productos_contados: 0,
                estado: 'pendiente',
                fecha_asignacion: new Date().toISOString(),
                productos: productos.map(p => ({
                    upc: p.upc,
                    sku: p.sku,
                    descripcion: p.descripcion,
                    existencia: p.stock_sistema || 0,
                    conteos: [],
                    total_contado: 0,
                    diferencia: 0 - (p.stock_sistema || 0),
                    es_hallazgo: false,
                    hallazgo_aprobado_por: null
                }))
            });

            if (navigator.onLine) {
                await supabase.from('tareas').insert({
                    id: tareaId,
                    categoria: categoriaNombre,
                    asignado_a: auxiliarId,
                    auxiliar_nombre: auxiliarNombre,
                    productos_total: productos.length,
                    estado: 'pendiente',
                    fecha_asignacion: new Date().toISOString()
                });
            }

            window.ZENGO?.toast('Categoría "' + categoriaNombre + '" asignada a ' + auxiliarNombre, 'success');
            this.limpiarAsignacion();
            await this.loadDashboardData();
            this.showSection('mando');
        } catch (err) {
            console.error('Error asignando:', err);
            window.ZENGO?.toast('Error al asignar tarea', 'error');
        }
    },

    limpiarAsignacion() {
        this.asignacionActual = { categoriaId: null, categoriaNombre: null, categoriaProductos: 0, auxiliarId: null, auxiliarNombre: null };
        document.querySelectorAll('.categoria-item, .auxiliar-item').forEach(el => el.classList.remove('selected'));
        this.updateResumenAsignacion();
    },

    async cancelarTarea(tareaId) {
        const confirmado = await window.ZENGO?.confirm('¿Cancelar esta tarea?', 'Confirmar cancelación');
        if (!confirmado) return;
        try {
            await db.tareas.update(tareaId, { estado: 'cancelado' });
            window.ZENGO?.toast('Tarea cancelada', 'success');
            await this.loadDashboardData();
        } catch (err) {
            window.ZENGO?.toast('Error al cancelar', 'error');
        }
    },

    async aprobarHallazgo(hallazgoId) {
        try {
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
            const hallazgo = await db.hallazgos.get(parseInt(hallazgoId));
            if (!hallazgo) { window.ZENGO?.toast('Hallazgo no encontrado', 'error'); return; }

            const tareas = await db.tareas.toArray();
            const tarea = tareas.find(t => t.auxiliar_id === hallazgo.auxiliar_id && t.estado !== 'completado');

            if (tarea) {
                tarea.productos.push({
                    upc: hallazgo.upc || 'HALL-' + hallazgoId,
                    sku: hallazgo.sku || 'HALLAZGO',
                    descripcion: hallazgo.descripcion || 'Producto de hallazgo',
                    existencia: 0,
                    conteos: [],
                    total_contado: 0,
                    diferencia: 0,
                    es_hallazgo: true,
                    hallazgo_aprobado_por: session.name || 'Jefe'
                });
                tarea.productos_total = tarea.productos.length;
                await db.tareas.put(tarea);
            }

            await db.hallazgos.update(parseInt(hallazgoId), { estado: 'aprobado', aprobado_por: session.name, fecha_aprobacion: new Date().toISOString() });
            window.ZENGO?.toast('Hallazgo aprobado y agregado al cíclico', 'success');
            await this.loadHallazgos();
        } catch (err) {
            console.error('Error aprobando hallazgo:', err);
            window.ZENGO?.toast('Error al aprobar hallazgo', 'error');
        }
    },

    async rechazarHallazgo(hallazgoId) {
        const confirmado = await window.ZENGO?.confirm('¿Rechazar este hallazgo?', 'Confirmar rechazo');
        if (!confirmado) return;
        try {
            await db.hallazgos.update(parseInt(hallazgoId), { estado: 'rechazado' });
            window.ZENGO?.toast('Hallazgo rechazado', 'success');
            await this.loadHallazgos();
        } catch (err) {
            window.ZENGO?.toast('Error al rechazar', 'error');
        }
    },

    showSection(sectionId) {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        const section = document.getElementById('section-' + sectionId);
        if (section) section.style.display = 'block';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector('[data-section="' + sectionId + '"]');
        if (navItem) navItem.classList.add('active');
        if (sectionId === 'asignar') this.loadCategorias();
        if (sectionId === 'hallazgos') this.loadHallazgos();
    },

    toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); },
    toggleTheme() { document.body.classList.toggle('light-mode'); },
    showConsultaModal() { document.getElementById('consulta-modal').style.display = 'flex'; document.getElementById('jefe-consulta-input')?.focus(); },
    closeModal() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); },

    renderModals() {
        return '<div id="consulta-modal" class="modal-overlay" style="display:none;"><div class="modal-content glass modal-lg"><div class="modal-header"><h2><i class="fas fa-search"></i> Modo Consulta</h2><button class="modal-close" onclick="JefeView.closeModal()"><i class="fas fa-times"></i></button></div><div class="modal-body"><div class="consulta-search"><input type="text" id="jefe-consulta-input" placeholder="Escanea o ingresa UPC/SKU..."><button class="btn-primary" onclick="JefeView.buscarProducto()"><i class="fas fa-search"></i></button></div><div id="jefe-consulta-resultado" class="consulta-resultado"><div class="empty-consulta"><i class="fas fa-barcode"></i><p>Escanea un producto para ver información</p></div></div></div></div></div>';
    },

    async buscarProducto() {
        const code = document.getElementById('jefe-consulta-input').value.trim();
        if (!code) return;
        try {
            const cleanCode = code.toUpperCase();
            let producto = await db.productos.where('upc').equals(cleanCode).first();
            if (!producto) producto = await db.productos.where('sku').equals(cleanCode).first();
            const container = document.getElementById('jefe-consulta-resultado');
            if (producto) {
                container.innerHTML = '<div class="consulta-card"><div class="consulta-header"><h3>' + (producto.descripcion || 'Producto') + '</h3><code class="upc-badge">' + producto.upc + '</code></div><div class="consulta-grid"><div class="consulta-item"><small>SKU</small><strong>' + producto.sku + '</strong></div><div class="consulta-item"><small>Existencia</small><strong>' + (producto.stock_sistema || 0) + '</strong></div><div class="consulta-item"><small>Precio</small><strong>₡' + (producto.precio || 0).toLocaleString() + '</strong></div><div class="consulta-item"><small>Categoría</small><strong>' + (producto.categoria_id || 'General') + '</strong></div><div class="consulta-item"><small>Tipo</small><strong>' + (producto.tipo || '-') + '</strong></div><div class="consulta-item"><small>Estatus</small><strong>' + (producto.estatus || '-') + '</strong></div></div></div>';
            } else {
                container.innerHTML = '<div class="empty-consulta"><i class="fas fa-search"></i><p>Producto no encontrado</p></div>';
            }
        } catch (err) { console.error('Error buscando:', err); }
    },

    async exportarCiclicos() { window.ZENGO?.toast('Generando reporte...', 'info'); },
    async exportarDiferencias() { window.ZENGO?.toast('Generando reporte de diferencias...', 'info'); },

    injectStyles() {
        if (document.getElementById('jefe-styles-v2')) return;
        const style = document.createElement('style');
        style.id = 'jefe-styles-v2';
        style.innerHTML = ':root{--jefe-purple:#7C3AED;--jefe-purple-glow:rgba(124,58,237,0.2);--jefe-bg:#020205;--jefe-card:rgba(255,255,255,0.03);--jefe-border:rgba(255,255,255,0.08);--jefe-text:#fff;--jefe-text-dim:rgba(255,255,255,0.5)}.jefe-theme{background:var(--jefe-bg);color:var(--jefe-text)}.accent-purple{color:var(--jefe-purple)}.text-success{color:#22c55e}.text-dim{color:var(--jefe-text-dim)}.dashboard-wrapper{display:flex;min-height:100vh}.sidebar{width:260px;height:100vh;position:fixed;left:0;top:0;background:var(--jefe-card);backdrop-filter:blur(20px);border-right:1px solid var(--jefe-border);z-index:100;display:flex;flex-direction:column}.sidebar.collapsed{width:80px}.sidebar.collapsed .user-card,.sidebar.collapsed .nav-item span,.sidebar.collapsed .badge-boss,.sidebar.collapsed .badge-alert{display:none}.sidebar-header{padding:20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--jefe-border)}.logo{font-size:24px;font-weight:900}.logo span{color:var(--jefe-purple)}.badge-boss{background:var(--jefe-purple);color:#fff;font-size:9px;padding:3px 8px;border-radius:4px;font-weight:700}.toggle-btn{margin-left:auto;background:0 0;border:none;color:var(--jefe-text-dim);font-size:18px;cursor:pointer;padding:8px;border-radius:8px}.user-card{padding:20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--jefe-border)}.user-avatar{width:45px;height:45px;border-radius:12px;display:flex;align-items:center;justify-content:center}.user-avatar.jefe{background:linear-gradient(135deg,var(--jefe-purple),#5b21b6);color:#fff}.user-info{display:flex;flex-direction:column}.user-name{font-weight:600;font-size:14px}.user-role{font-size:10px;color:var(--jefe-purple);letter-spacing:1px}.sidebar-nav{padding:15px 10px;display:flex;flex-direction:column;gap:5px;flex:1}.nav-item{padding:12px 15px;display:flex;align-items:center;gap:12px;color:var(--jefe-text-dim);text-decoration:none;border-radius:12px;font-size:14px;position:relative}.nav-item:hover{background:var(--jefe-border);color:var(--jefe-text)}.nav-item.active{background:rgba(124,58,237,0.15);color:var(--jefe-purple)}.nav-item i{width:20px;text-align:center}.nav-spacer{flex:1}.nav-item.logout{color:#ef4444}.badge-alert{position:absolute;right:10px;background:#ef4444;color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700}.main-content{flex:1;margin-left:260px;padding:25px;display:flex;flex-direction:column;gap:25px}.sidebar.collapsed~.main-content{margin-left:80px}.top-header{display:flex;justify-content:space-between;align-items:center;padding:20px 25px;border-radius:16px;background:var(--jefe-card);border:1px solid var(--jefe-border)}.header-left{display:flex;align-items:center;gap:15px}.header-left h1{font-size:22px;margin:0}.mobile-menu{display:none;background:0 0;border:none;color:#fff;font-size:20px;cursor:pointer}.header-stats{display:flex;gap:15px;align-items:center}.sync-badge{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:10px;font-weight:700}.sync-badge.online{background:rgba(34,197,94,0.15);color:#22c55e}.sync-badge .dot{width:8px;height:8px;border-radius:50%;background:currentColor}.btn-refresh{padding:10px 15px;background:var(--jefe-border);border:none;border-radius:10px;color:var(--jefe-text-dim);cursor:pointer}.btn-refresh:hover{background:var(--jefe-purple);color:#fff}.quick-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.qm-card{padding:20px;border-radius:16px;background:var(--jefe-card);border:1px solid var(--jefe-border);display:flex;align-items:center;gap:15px}.qm-icon{width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px}.qm-icon.purple{background:rgba(124,58,237,0.15);color:var(--jefe-purple)}.qm-icon.blue{background:rgba(59,130,246,0.15);color:#3b82f6}.qm-icon.orange{background:rgba(249,115,22,0.15);color:#f97316}.qm-icon.green{background:rgba(34,197,94,0.15);color:#22c55e}.qm-value{font-size:28px;font-weight:800;display:block}.qm-label{font-size:12px;color:var(--jefe-text-dim)}.categorias-resumen,.tareas-activas{padding:25px;border-radius:16px;background:var(--jefe-card);border:1px solid var(--jefe-border)}.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.section-header h2,.section-header h3{margin:0;font-size:16px;display:flex;align-items:center;gap:10px}.categorias-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px}.categoria-card-mini{padding:15px;background:var(--jefe-border);border-radius:12px}.categoria-card-mini.asignada{opacity:.6}.cat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.cat-name{font-weight:600}.badge-asignada{font-size:9px;padding:2px 6px;background:var(--jefe-purple);color:#fff;border-radius:4px}.cat-stats{display:flex;gap:15px;font-size:12px;color:var(--jefe-text-dim)}.cat-stats i{margin-right:5px}.tareas-list{display:flex;flex-direction:column;gap:10px}.tarea-row{display:flex;align-items:center;gap:15px;padding:15px;background:var(--jefe-border);border-radius:12px}.tarea-info{flex:1}.tarea-info strong{display:block}.tarea-info small{font-size:12px;color:var(--jefe-text-dim)}.status-badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600}.status-badge.pendiente{background:rgba(249,115,22,0.15);color:#f97316}.status-badge.en_progreso{background:rgba(59,130,246,0.15);color:#3b82f6}.btn-icon-sm{padding:6px 10px;background:0 0;border:1px solid var(--jefe-border);border-radius:6px;color:var(--jefe-text-dim);cursor:pointer}.btn-icon-sm.danger:hover{background:#ef4444;color:#fff;border-color:#ef4444}.asignar-section{padding:0}.asignar-grid{display:grid;grid-template-columns:1fr 1fr;gap:25px}.asignar-card{padding:25px;border-radius:16px;background:var(--jefe-card);border:1px solid var(--jefe-border)}.asignar-card.wide{grid-column:1/-1}.asignar-card h4{margin:0 0 20px;font-size:14px;display:flex;align-items:center;gap:10px;color:var(--jefe-text-dim)}.categorias-asignar,.auxiliares-list{display:flex;flex-direction:column;gap:10px;max-height:300px;overflow-y:auto}.categoria-item,.auxiliar-item{padding:15px;background:var(--jefe-border);border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:12px;border:2px solid transparent;transition:all .2s}.categoria-item:hover,.auxiliar-item:hover{background:rgba(124,58,237,0.1)}.categoria-item.selected,.auxiliar-item.selected{border-color:var(--jefe-purple);background:rgba(124,58,237,0.15)}.categoria-item .cat-info{flex:1}.categoria-item strong{display:block}.categoria-item small{font-size:11px;color:var(--jefe-text-dim)}.aux-avatar{width:40px;height:40px;border-radius:10px;background:var(--jefe-purple);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}.aux-info{flex:1}.aux-info strong{display:block}.aux-info small{font-size:11px;color:var(--jefe-text-dim)}.asignar-resumen{min-height:80px}.resumen-empty{text-align:center;padding:20px;color:var(--jefe-text-dim)}.resumen-preview{display:flex;align-items:center;justify-content:center;gap:20px;padding:20px}.resumen-item{display:flex;align-items:center;gap:12px;padding:15px 20px;background:var(--jefe-border);border-radius:12px}.resumen-item i{font-size:20px;color:var(--jefe-purple)}.resumen-item strong{display:block}.resumen-item small{font-size:11px;color:var(--jefe-text-dim)}.resumen-arrow{color:var(--jefe-purple);font-size:24px}.asignar-actions{display:flex;gap:15px;margin-top:20px;justify-content:flex-end}.btn-primary{background:var(--jefe-purple);color:#fff;border:none;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px}.btn-primary:disabled{opacity:.5;cursor:not-allowed}.btn-primary.small{padding:8px 15px;font-size:12px}.btn-secondary{background:var(--jefe-border);color:var(--jefe-text);border:none;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer}.hallazgos-container{padding:25px;border-radius:16px;background:var(--jefe-card);border:1px solid var(--jefe-border);overflow-x:auto}.hallazgos-table{width:100%;border-collapse:collapse;min-width:700px}.hallazgos-table th{text-align:left;padding:12px;font-size:11px;color:var(--jefe-text-dim);border-bottom:1px solid var(--jefe-border)}.hallazgos-table td{padding:12px;border-bottom:1px solid var(--jefe-border)}.hallazgos-table code{background:var(--jefe-border);padding:2px 6px;border-radius:4px;font-size:11px}.hallazgo-actions{display:flex;gap:8px}.btn-approve,.btn-reject{padding:8px 12px;border:none;border-radius:8px;cursor:pointer}.btn-approve{background:#22c55e;color:#fff}.btn-reject{background:#ef4444;color:#fff}.mono{font-family:"JetBrains Mono",monospace;font-size:12px}.text-center{text-align:center}.reportes-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}.reporte-card{padding:25px;border-radius:16px;background:var(--jefe-card);border:1px solid var(--jefe-border);cursor:pointer;text-align:center;transition:all .3s}.reporte-card:hover{transform:translateY(-5px);border-color:var(--jefe-purple)}.reporte-icon{width:60px;height:60px;margin:0 auto 15px;border-radius:16px;background:rgba(124,58,237,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--jefe-purple)}.reporte-icon.orange{background:rgba(249,115,22,0.15);color:#f97316}.reporte-card h4{margin:0 0 10px}.reporte-card p{margin:0;font-size:12px;color:var(--jefe-text-dim)}.empty-state{text-align:center;padding:40px;color:var(--jefe-text-dim)}.empty-state.small{padding:20px}.empty-state i{font-size:40px;margin-bottom:15px;opacity:.3}.loading-state{text-align:center;padding:30px;color:var(--jefe-text-dim)}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}.modal-content{width:100%;max-width:500px;background:var(--jefe-card);backdrop-filter:blur(20px);border:1px solid var(--jefe-border);border-radius:20px}.modal-content.modal-lg{max-width:600px}.modal-header{display:flex;justify-content:space-between;align-items:center;padding:25px;border-bottom:1px solid var(--jefe-border)}.modal-header h2{margin:0;display:flex;align-items:center;gap:10px}.modal-close{background:0 0;border:none;color:var(--jefe-text-dim);font-size:20px;cursor:pointer}.modal-body{padding:25px}.consulta-search{display:flex;gap:10px;margin-bottom:20px}.consulta-search input{flex:1;padding:15px;background:var(--jefe-border);border:1px solid transparent;border-radius:12px;color:var(--jefe-text);font-size:15px;outline:0}.consulta-search input:focus{border-color:var(--jefe-purple)}.consulta-card{background:var(--jefe-border);border-radius:16px;padding:20px}.consulta-header{margin-bottom:15px}.consulta-header h3{margin:0 0 5px}.upc-badge{display:inline-block;padding:4px 10px;background:var(--jefe-purple);color:#fff;border-radius:6px;font-size:12px}.consulta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.consulta-item{padding:12px;background:var(--jefe-card);border-radius:8px}.consulta-item small{display:block;font-size:10px;color:var(--jefe-text-dim);margin-bottom:3px}.empty-consulta{text-align:center;padding:40px;color:var(--jefe-text-dim)}.empty-consulta i{font-size:40px;margin-bottom:15px}@media (max-width:1024px){.quick-metrics{grid-template-columns:repeat(2,1fr)}.asignar-grid{grid-template-columns:1fr}}@media (max-width:768px){.sidebar{transform:translateX(-100%)}.sidebar.collapsed{transform:translateX(0);width:260px}.main-content{margin-left:0}.mobile-menu{display:block}.quick-metrics{grid-template-columns:1fr}}';
        document.head.appendChild(style);
    }
};

window.JefeView = JefeView;
