// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista Jefe de Bodega
// Dashboard de supervisión con mapa de calor y gestión de hallazgos
// ═══════════════════════════════════════════════════════════════

import { AuthController } from '../controllers/AuthController.js';
import { ScannerController } from '../controllers/ScannerController.js';
import supabase from '../config/supabase.js';
import db from '../config/dexie-db.js';

export const JefeView = {

    // ═══════════════════════════════════════════════════════════
    // RENDERIZADO PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    render(container, state = {}) {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        // Estado por defecto
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
            <!-- ═══════ SIDEBAR ═══════ -->
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
                        <span class="badge-alert" id="hallazgos-count">${state.hallazgos.length || 0}</span>
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

            <!-- ═══════ CONTENIDO PRINCIPAL ═══════ -->
            <main class="main-content">
                <!-- Header -->
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="JefeView.toggleSidebar()">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div>
                            <h1>Panel de <span class="accent-purple">Supervisión</span></h1>
                            <p class="text-dim">Cíclicos en Progreso: <strong>${state.categoriasActivas.length}</strong></p>
                        </div>
                    </div>
                    <div class="header-stats">
                        <div id="sync-container" class="sync-badge online">
                            <div id="sync-dot" class="dot"></div>
                            <span id="sync-text">ONLINE</span>
                        </div>
                        <div class="stat-item glass">
                            <small>PRECISIÓN NETA</small>
                            <span class="${state.precision >= 95 ? 'text-success' : state.precision >= 85 ? 'text-warning' : 'text-error'}">
                                ${state.precision}%
                            </span>
                        </div>
                        <div class="stat-item glass">
                            <small>PROGRESO TIENDA</small>
                            <span class="text-purple">${state.progresoGlobal}%</span>
                        </div>
                    </div>
                </header>

                <!-- Sección Mando Central -->
                <div id="section-mando" class="section-content">
                    <!-- Métricas rápidas -->
                    <section class="quick-metrics">
                        <div class="qm-card glass">
                            <div class="qm-icon purple"><i class="fas fa-users"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="aux-activos">${state.auxiliaresActivos.length || 0}</span>
                                <span class="qm-label">Auxiliares Activos</span>
                            </div>
                        </div>
                        <div class="qm-card glass">
                            <div class="qm-icon blue"><i class="fas fa-clipboard-list"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="tareas-activas">${state.tareasActivas.length || 0}</span>
                                <span class="qm-label">Tareas en Progreso</span>
                            </div>
                        </div>
                        <div class="qm-card glass">
                            <div class="qm-icon orange"><i class="fas fa-exclamation-circle"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="hallazgos-pendientes">${state.hallazgos.length || 0}</span>
                                <span class="qm-label">Hallazgos Pendientes</span>
                            </div>
                        </div>
                        <div class="qm-card glass">
                            <div class="qm-icon green"><i class="fas fa-check-double"></i></div>
                            <div class="qm-data">
                                <span class="qm-value" id="tareas-completadas">0</span>
                                <span class="qm-label">Completadas Hoy</span>
                            </div>
                        </div>
                    </section>

                    <!-- Mapa de Calor -->
                    <section class="heat-map-section glass">
                        <div class="section-header">
                            <h3><i class="fas fa-fire"></i> Mapa de Calor Operativo</h3>
                            <div class="section-actions">
                                <button class="btn-icon" onclick="JefeView.refreshHeatMap()">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="heat-grid-container" id="heat-map-container">
                            ${this.renderHeatMap(state.categoriasActivas)}
                        </div>
                    </section>

                    <!-- Grid de Acciones -->
                    <div class="action-grid">
                        <!-- Hallazgos Recientes -->
                        <section class="findings-card glass">
                            <div class="section-header">
                                <h3><i class="fas fa-bell"></i> Hallazgos Recientes</h3>
                                <a href="#" class="view-all" onclick="JefeView.showSection('hallazgos')">Ver todos →</a>
                            </div>
                            <div class="findings-list" id="findings-list">
                                ${this.renderHallazgosPreview(state.hallazgos.slice(0, 5))}
                            </div>
                        </section>

                        <!-- Ranking -->
                        <section class="ranking-card glass">
                            <div class="section-header">
                                <h3><i class="fas fa-trophy"></i> Ranking de Auxiliares</h3>
                            </div>
                            <div class="ranking-list" id="ranking-list">
                                ${this.renderRanking(state.ranking)}
                            </div>
                            <button class="btn-export-excel" onclick="JefeView.exportDistribucion()">
                                <i class="fas fa-file-excel"></i> Generar Distribución
                            </button>
                        </section>
                    </div>
                </div>

                <!-- Sección Asignar Tareas -->
                <div id="section-asignar" class="section-content" style="display:none;">
                    ${this.renderAsignarSection()}
                </div>

                <!-- Sección Hallazgos -->
                <div id="section-hallazgos" class="section-content" style="display:none;">
                    ${this.renderHallazgosSection(state.hallazgos)}
                </div>

                <!-- Sección Reportes -->
                <div id="section-reportes" class="section-content" style="display:none;">
                    ${this.renderReportesSection()}
                </div>
            </main>
        </div>

        <!-- ═══════ MODALES ═══════ -->
        ${this.renderModals()}
        `;

        this.injectStyles();
        this.loadDashboardData();
    },

    // ═══════════════════════════════════════════════════════════
    // RENDERIZADO DE COMPONENTES
    // ═══════════════════════════════════════════════════════════
    renderHeatMap(categorias = []) {
        if (categorias.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-map"></i>
                    <p>No hay cíclicos activos</p>
                    <button class="btn-primary" onclick="JefeView.showSection('asignar')">
                        <i class="fas fa-plus"></i> Asignar Tarea
                    </button>
                </div>
            `;
        }

        return `
            <table class="heat-table">
                <thead>
                    <tr>
                        <th>CATEGORÍA</th>
                        <th>RESPONSABLE</th>
                        <th>INICIO</th>
                        <th>TIEMPO</th>
                        <th>PROGRESO</th>
                        <th>PRECISIÓN</th>
                        <th>ESTADO</th>
                        <th>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    ${categorias.map(cat => `
                        <tr class="heat-row ${this.getHeatClass(cat.progreso)}" data-id="${cat.id}">
                            <td>
                                <div class="cat-info">
                                    <strong>${cat.nombre || cat.categoria}</strong>
                                    <small>${cat.productos_total || 0} SKUs</small>
                                </div>
                            </td>
                            <td>
                                <div class="user-pill">
                                    <i class="fas fa-user"></i> 
                                    ${cat.auxiliar || cat.auxiliar_nombre || 'Sin asignar'}
                                </div>
                            </td>
                            <td class="mono">${cat.hora_inicio || '--:--'}</td>
                            <td class="mono time-cell">
                                <i class="fas fa-clock"></i>
                                ${cat.tiempo || cat.duracion || '00:00'}
                            </td>
                            <td>
                                <div class="prog-bar-container">
                                    <div class="prog-fill" style="width: ${cat.progreso || 0}%"></div>
                                </div>
                                <small class="prog-text">${cat.progreso || 0}%</small>
                            </td>
                            <td>
                                <span class="precision-badge ${(cat.precision || 0) >= 95 ? 'high' : (cat.precision || 0) >= 85 ? 'mid' : 'low'}">
                                    ${cat.precision || 0}%
                                </span>
                            </td>
                            <td>
                                <span class="status-indicator ${cat.estado || 'activo'}">
                                    <span class="status-dot"></span>
                                    ${this.getStatusText(cat.estado)}
                                </span>
                            </td>
                            <td>
                                <div class="row-actions">
                                    <button class="btn-action-sm" onclick="JefeView.verDetalleTarea('${cat.id}')" title="Ver detalles">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-action-sm warning" onclick="JefeView.pausarTarea('${cat.id}')" title="Pausar">
                                        <i class="fas fa-pause"></i>
                                    </button>
                                    <button class="btn-action-sm danger" onclick="JefeView.cancelarTarea('${cat.id}')" title="Cancelar">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    getHeatClass(progreso) {
        if (progreso >= 90) return 'heat-complete';
        if (progreso >= 70) return 'heat-high';
        if (progreso >= 40) return 'heat-mid';
        return 'heat-low';
    },

    getStatusText(estado) {
        const estados = {
            'activo': 'En Progreso',
            'en_progreso': 'En Progreso',
            'pausado': 'Pausado',
            'completado': 'Completado',
            'pendiente': 'Pendiente'
        };
        return estados[estado] || 'Activo';
    },

    renderHallazgosPreview(hallazgos = []) {
        if (hallazgos.length === 0) {
            return `
                <div class="empty-state small">
                    <i class="fas fa-check-circle"></i>
                    <p>Sin hallazgos pendientes</p>
                </div>
            `;
        }

        return hallazgos.map(h => `
            <div class="finding-row" data-id="${h.id}">
                <div class="f-icon ${h.tipo?.toLowerCase() || 'otro'}">
                    <i class="fas fa-${this.getHallazgoIcon(h.tipo)}"></i>
                </div>
                <div class="f-info">
                    <span class="f-upc">${h.upc || h.sku}</span>
                    <small>${h.descripcion || h.tipo || 'Hallazgo'}</small>
                    <small class="f-meta">Por: ${h.responsable || h.auxiliar_nombre || 'Desconocido'} • ${this.formatTime(h.timestamp)}</small>
                </div>
                <div class="f-actions">
                    <button class="btn-reject" onclick="JefeView.rechazarHallazgo('${h.id}')" title="Rechazar">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-approve" onclick="JefeView.aprobarHallazgo('${h.id}')" title="Aprobar">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    getHallazgoIcon(tipo) {
        const iconos = {
            'EXCEDENTE': 'plus-circle',
            'NO_CATALOGADO': 'question-circle',
            'DAÑADO': 'box-open',
            'VENCIDO': 'calendar-times',
            'OTRO': 'tag'
        };
        return iconos[tipo] || 'tag';
    },

    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    },

    renderRanking(ranking = []) {
        if (ranking.length === 0) {
            return `
                <div class="empty-state small">
                    <i class="fas fa-medal"></i>
                    <p>Sin datos de ranking</p>
                </div>
            `;
        }

        return ranking.map((u, i) => `
            <div class="rank-item ${i < 3 ? 'top-' + (i + 1) : ''}">
                <span class="rank-num">${i + 1}</span>
                <div class="rank-avatar">
                    ${i === 0 ? '<i class="fas fa-crown crown"></i>' : ''}
                    <span>${(u.nombre || 'U').charAt(0)}</span>
                </div>
                <div class="rank-info">
                    <span class="rank-name">${u.nombre || 'Usuario'}</span>
                    <small>${u.conteos || 0} conteos hoy</small>
                </div>
                <div class="rank-score">
                    <span class="score-value">${u.precision || 0}%</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${u.precision || 0}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderAsignarSection() {
        return `
            <section class="asignar-section">
                <div class="section-header">
                    <h2><i class="fas fa-tasks"></i> Asignar Tareas de Conteo</h2>
                </div>
                
                <div class="asignar-grid">
                    <!-- Selección de Categoría -->
                    <div class="asignar-card glass">
                        <h4><i class="fas fa-folder"></i> Seleccionar Categoría</h4>
                        <div class="categorias-grid" id="categorias-disponibles">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando categorías...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Selección de Auxiliar -->
                    <div class="asignar-card glass">
                        <h4><i class="fas fa-user"></i> Seleccionar Auxiliar</h4>
                        <div class="auxiliares-list" id="auxiliares-disponibles">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando auxiliares...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Resumen y Confirmar -->
                    <div class="asignar-card glass wide">
                        <h4><i class="fas fa-clipboard-check"></i> Resumen de Asignación</h4>
                        <div class="asignar-resumen" id="asignar-resumen">
                            <div class="resumen-empty">
                                <i class="fas fa-arrow-left"></i>
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
        `;
    },

    renderHallazgosSection(hallazgos = []) {
        return `
            <section class="hallazgos-section">
                <div class="section-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Gestión de Hallazgos</h2>
                    <div class="section-actions">
                        <select id="filter-tipo-hallazgo" class="select-input" onchange="JefeView.filterHallazgos()">
                            <option value="">Todos los tipos</option>
                            <option value="EXCEDENTE">Excedentes</option>
                            <option value="NO_CATALOGADO">No catalogados</option>
                            <option value="DAÑADO">Dañados</option>
                            <option value="VENCIDO">Vencidos</option>
                            <option value="OTRO">Otros</option>
                        </select>
                        <button class="btn-secondary" onclick="JefeView.exportHallazgos()">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                    </div>
                </div>
                
                <div class="hallazgos-stats">
                    <div class="stat-card glass">
                        <span class="stat-value" id="total-hallazgos">${hallazgos.length}</span>
                        <span class="stat-label">Total Pendientes</span>
                    </div>
                    <div class="stat-card glass">
                        <span class="stat-value text-success" id="aprobados-hoy">0</span>
                        <span class="stat-label">Aprobados Hoy</span>
                    </div>
                    <div class="stat-card glass">
                        <span class="stat-value text-error" id="rechazados-hoy">0</span>
                        <span class="stat-label">Rechazados Hoy</span>
                    </div>
                </div>
                
                <div class="hallazgos-table glass" id="hallazgos-full-container">
                    ${this.renderHallazgosTable(hallazgos)}
                </div>
            </section>
        `;
    },

    renderHallazgosTable(hallazgos = []) {
        if (hallazgos.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay hallazgos pendientes de validación</p>
                </div>
            `;
        }

        return `
            <table class="hallazgos-table">
                <thead>
                    <tr>
                        <th>TIPO</th>
                        <th>UPC / SKU</th>
                        <th>DESCRIPCIÓN</th>
                        <th>CANTIDAD</th>
                        <th>UBICACIÓN</th>
                        <th>REPORTADO POR</th>
                        <th>FECHA/HORA</th>
                        <th>FOTO</th>
                        <th>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    ${hallazgos.map(h => `
                        <tr class="hallazgo-row" data-id="${h.id}">
                            <td>
                                <span class="tipo-badge ${(h.tipo || 'otro').toLowerCase()}">
                                    <i class="fas fa-${this.getHallazgoIcon(h.tipo)}"></i>
                                    ${h.tipo || 'Otro'}
                                </span>
                            </td>
                            <td><code>${h.upc || h.sku || '-'}</code></td>
                            <td class="desc-cell">${h.descripcion || '-'}</td>
                            <td class="text-center">${h.cantidad || 1}</td>
                            <td><span class="ubicacion-badge">${h.ubicacion || '-'}</span></td>
                            <td>
                                <div class="user-mini">
                                    <span>${h.auxiliar_nombre || h.responsable || 'Desconocido'}</span>
                                </div>
                            </td>
                            <td class="mono">${new Date(h.timestamp).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td class="text-center">
                                ${h.foto_url || h.foto_base64 ? 
                                    `<button class="btn-icon-sm" onclick="JefeView.verFoto('${h.id}')"><i class="fas fa-image"></i></button>` : 
                                    '<span class="text-dim">—</span>'}
                            </td>
                            <td>
                                <div class="row-actions">
                                    <button class="btn-approve" onclick="JefeView.aprobarHallazgo('${h.id}')" title="Aprobar">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn-reject" onclick="JefeView.rechazarHallazgo('${h.id}')" title="Rechazar">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderReportesSection() {
        return `
            <section class="reportes-section">
                <div class="section-header">
                    <h2><i class="fas fa-chart-bar"></i> Reportes y Análisis</h2>
                </div>
                
                <div class="reportes-grid">
                    <div class="reporte-card glass" onclick="JefeView.generarReporteDiferencias()">
                        <div class="reporte-icon"><i class="fas fa-balance-scale"></i></div>
                        <h4>Reporte de Diferencias</h4>
                        <p>Comparativo físico vs sistema por categoría</p>
                    </div>
                    
                    <div class="reporte-card glass" onclick="JefeView.generarReporteProductividad()">
                        <div class="reporte-icon"><i class="fas fa-tachometer-alt"></i></div>
                        <h4>Productividad por Auxiliar</h4>
                        <p>Tiempo, precisión y volumen de conteos</p>
                    </div>
                    
                    <div class="reporte-card glass" onclick="JefeView.generarReporteMerma()">
                        <div class="reporte-icon"><i class="fas fa-chart-pie"></i></div>
                        <h4>Análisis de Merma</h4>
                        <p>Top SKUs con mayor diferencia negativa</p>
                    </div>
                    
                    <div class="reporte-card glass" onclick="JefeView.exportarNetSuite()">
                        <div class="reporte-icon green"><i class="fas fa-file-excel"></i></div>
                        <h4>Exportar a NetSuite</h4>
                        <p>Generar archivo para carga masiva</p>
                    </div>
                </div>
                
                <div class="reporte-preview glass" id="reporte-preview">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>Selecciona un reporte para previsualizar</p>
                    </div>
                </div>
            </section>
        `;
    },

    renderModals() {
        return `
            <!-- Modal Consulta -->
            <div id="consulta-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content glass modal-lg">
                    <div class="modal-header">
                        <h2><i class="fas fa-search"></i> Modo Consulta</h2>
                        <button class="modal-close" onclick="JefeView.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="consulta-search">
                            <input type="text" id="jefe-consulta-input" placeholder="Escanea o ingresa UPC/SKU..." autofocus>
                            <button class="btn-primary" onclick="JefeView.buscarProducto()">
                                <i class="fas fa-search"></i>
                            </button>
                            <button class="btn-secondary" onclick="ScannerController.openCameraScanner()">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <div id="jefe-consulta-resultado" class="consulta-resultado">
                            <div class="empty-consulta">
                                <i class="fas fa-barcode"></i>
                                <p>Escanea un producto para ver información</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Detalle Tarea -->
            <div id="detalle-tarea-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content glass modal-lg">
                    <div class="modal-header">
                        <h2><i class="fas fa-clipboard-list"></i> Detalle de Tarea</h2>
                        <button class="modal-close" onclick="JefeView.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="detalle-tarea-content">
                    </div>
                </div>
            </div>

            <!-- Modal Foto Hallazgo -->
            <div id="foto-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content glass">
                    <div class="modal-header">
                        <h3><i class="fas fa-image"></i> Foto del Hallazgo</h3>
                        <button class="modal-close" onclick="JefeView.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body foto-container" id="foto-content">
                    </div>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // FUNCIONES DE INTERFAZ
    // ═══════════════════════════════════════════════════════════
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const wrapper = document.querySelector('.dashboard-wrapper');
        sidebar.classList.toggle('collapsed');
        wrapper.classList.toggle('sidebar-collapsed');
    },

    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const icon = document.querySelector('.theme-toggle i');
        const text = document.querySelector('.theme-toggle span');
        
        if (document.body.classList.contains('light-mode')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            text.textContent = 'Modo Claro';
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            text.textContent = 'Modo Oscuro';
        }
    },

    showSection(sectionId) {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        const section = document.getElementById(`section-${sectionId}`);
        if (section) section.style.display = 'block';
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

        // Cargar datos específicos de la sección
        if (sectionId === 'asignar') this.loadAsignarData();
        if (sectionId === 'hallazgos') this.loadHallazgos();
    },

    showConsultaModal() {
        document.getElementById('consulta-modal').style.display = 'flex';
        document.getElementById('jefe-consulta-input').focus();
    },

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    },

    // ═══════════════════════════════════════════════════════════
    // FUNCIONES DE DATOS
    // ═══════════════════════════════════════════════════════════
    async loadDashboardData() {
        try {
            // Cargar tareas activas
            const { data: tareas } = await supabase
                .from('tareas')
                .select('*')
                .in('estado', ['pendiente', 'en_progreso']);

            if (tareas) {
                document.getElementById('heat-map-container').innerHTML = this.renderHeatMap(tareas);
                document.getElementById('tareas-activas').textContent = tareas.length;
            }

            // Cargar hallazgos pendientes
            const { data: hallazgos } = await supabase
                .from('hallazgos')
                .select('*')
                .eq('estado', 'pendiente')
                .order('timestamp', { ascending: false });

            if (hallazgos) {
                document.getElementById('findings-list').innerHTML = this.renderHallazgosPreview(hallazgos.slice(0, 5));
                document.getElementById('hallazgos-count').textContent = hallazgos.length;
                document.getElementById('hallazgos-pendientes').textContent = hallazgos.length;
            }

            // Cargar ranking
            const { data: auxiliares } = await supabase
                .from('profiles')
                .select('*')
                .eq('role_id', 3);

            if (auxiliares) {
                const ranking = auxiliares.map(a => ({
                    ...a,
                    precision: Math.floor(Math.random() * 15 + 85), // Demo
                    conteos: Math.floor(Math.random() * 50 + 10) // Demo
                })).sort((a, b) => b.precision - a.precision);

                document.getElementById('ranking-list').innerHTML = this.renderRanking(ranking);
                document.getElementById('aux-activos').textContent = auxiliares.length;
            }

        } catch (err) {
            console.warn('Error cargando datos:', err);
        }
    },

    async loadAsignarData() {
        // Cargar categorías disponibles
        try {
            const { data: categorias } = await supabase
                .from('categorias')
                .select('*');

            const container = document.getElementById('categorias-disponibles');
            if (categorias && categorias.length > 0) {
                container.innerHTML = categorias.map(c => `
                    <div class="categoria-item" onclick="JefeView.selectCategoria(${c.id}, '${c.nombre}')">
                        <i class="fas fa-folder"></i>
                        <span>${c.nombre}</span>
                        <small>${c.productos_count || 0} SKUs</small>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-dim">No hay categorías disponibles</p>';
            }

            // Cargar auxiliares
            const { data: auxiliares } = await supabase
                .from('profiles')
                .select('*')
                .eq('role_id', 3);

            const auxContainer = document.getElementById('auxiliares-disponibles');
            if (auxiliares && auxiliares.length > 0) {
                auxContainer.innerHTML = auxiliares.map(a => `
                    <div class="auxiliar-item" onclick="JefeView.selectAuxiliar(${a.id}, '${a.nombre}')">
                        <div class="aux-avatar">${(a.nombre || 'U').charAt(0)}</div>
                        <div class="aux-info">
                            <span>${a.nombre || 'Sin nombre'}</span>
                            <small>${a.email}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                auxContainer.innerHTML = '<p class="text-dim">No hay auxiliares disponibles</p>';
            }

        } catch (err) {
            console.warn('Error cargando datos de asignación:', err);
        }
    },

    async loadHallazgos() {
        try {
            const { data: hallazgos } = await supabase
                .from('hallazgos')
                .select('*')
                .eq('estado', 'pendiente')
                .order('timestamp', { ascending: false });

            const container = document.getElementById('hallazgos-full-container');
            if (container) {
                container.innerHTML = this.renderHallazgosTable(hallazgos || []);
            }

        } catch (err) {
            console.warn('Error cargando hallazgos:', err);
        }
    },

    // Estado temporal para asignación
    asignacionActual: {
        categoriaId: null,
        categoriaNombre: null,
        auxiliarId: null,
        auxiliarNombre: null
    },

    selectCategoria(id, nombre) {
        this.asignacionActual.categoriaId = id;
        this.asignacionActual.categoriaNombre = nombre;
        
        document.querySelectorAll('.categoria-item').forEach(el => el.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
        
        this.updateResumenAsignacion();
    },

    selectAuxiliar(id, nombre) {
        this.asignacionActual.auxiliarId = id;
        this.asignacionActual.auxiliarNombre = nombre;
        
        document.querySelectorAll('.auxiliar-item').forEach(el => el.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
        
        this.updateResumenAsignacion();
    },

    updateResumenAsignacion() {
        const { categoriaId, categoriaNombre, auxiliarId, auxiliarNombre } = this.asignacionActual;
        const container = document.getElementById('asignar-resumen');
        const btnConfirmar = document.getElementById('btn-confirmar-asignacion');

        if (categoriaId && auxiliarId) {
            container.innerHTML = `
                <div class="resumen-item">
                    <i class="fas fa-folder"></i>
                    <span>Categoría: <strong>${categoriaNombre}</strong></span>
                </div>
                <div class="resumen-item">
                    <i class="fas fa-user"></i>
                    <span>Auxiliar: <strong>${auxiliarNombre}</strong></span>
                </div>
            `;
            btnConfirmar.disabled = false;
        } else {
            container.innerHTML = `
                <div class="resumen-empty">
                    <i class="fas fa-arrow-left"></i>
                    <p>Selecciona una categoría y un auxiliar</p>
                </div>
            `;
            btnConfirmar.disabled = true;
        }
    },

    async confirmarAsignacion() {
        const { categoriaId, categoriaNombre, auxiliarId, auxiliarNombre } = this.asignacionActual;
        
        if (!categoriaId || !auxiliarId) {
            window.ZENGO?.toast('Selecciona categoría y auxiliar', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('tareas').insert({
                categoria_id: categoriaId,
                categoria: categoriaNombre,
                asignado_a: auxiliarId,
                auxiliar_nombre: auxiliarNombre,
                estado: 'pendiente',
                fecha_asignacion: new Date().toISOString()
            });

            if (error) throw error;

            window.ZENGO?.toast(`Tarea asignada a ${auxiliarNombre}`, 'success');
            this.limpiarAsignacion();
            this.showSection('mando');

        } catch (err) {
            window.ZENGO?.toast('Error al asignar tarea', 'error');
            console.error(err);
        }
    },

    limpiarAsignacion() {
        this.asignacionActual = { categoriaId: null, categoriaNombre: null, auxiliarId: null, auxiliarNombre: null };
        document.querySelectorAll('.categoria-item, .auxiliar-item').forEach(el => el.classList.remove('selected'));
        this.updateResumenAsignacion();
    },

    // Hallazgos
    async aprobarHallazgo(id) {
        try {
            await supabase.from('hallazgos').update({ estado: 'aprobado' }).eq('id', id);
            window.ZENGO?.toast('Hallazgo aprobado', 'success');
            this.loadHallazgos();
            this.loadDashboardData();
        } catch (err) {
            window.ZENGO?.toast('Error al aprobar', 'error');
        }
    },

    async rechazarHallazgo(id) {
        const confirmado = await window.ZENGO?.confirm('¿Rechazar este hallazgo?', 'Confirmar rechazo');
        if (!confirmado) return;

        try {
            await supabase.from('hallazgos').update({ estado: 'rechazado' }).eq('id', id);
            window.ZENGO?.toast('Hallazgo rechazado', 'success');
            this.loadHallazgos();
            this.loadDashboardData();
        } catch (err) {
            window.ZENGO?.toast('Error al rechazar', 'error');
        }
    },

    // Consulta
    async buscarProducto() {
        const code = document.getElementById('jefe-consulta-input').value.trim();
        if (!code) return;

        const resultado = await ScannerController.consultarProducto(code);
        const container = document.getElementById('jefe-consulta-resultado');

        if (resultado.encontrado) {
            const p = resultado.producto;
            container.innerHTML = `
                <div class="consulta-card">
                    <div class="consulta-header">
                        <h3>${p.descripcion || 'Producto'}</h3>
                        <code class="upc-badge">${p.upc}</code>
                    </div>
                    <div class="consulta-grid">
                        <div class="consulta-item"><small>SKU</small><strong>${p.sku || 'N/A'}</strong></div>
                        <div class="consulta-item"><small>Stock</small><strong>${p.stock_sistema || 0}</strong></div>
                        <div class="consulta-item"><small>Precio</small><strong>₡${(p.precio || 0).toLocaleString()}</strong></div>
                        <div class="consulta-item"><small>Categoría</small><strong>${p.categoria_id || 'General'}</strong></div>
                    </div>
                    ${resultado.ubicaciones.length > 0 ? `
                        <div class="ubicaciones-section">
                            <h4><i class="fas fa-map-marker-alt"></i> Ubicaciones</h4>
                            <div class="ubicaciones-tags">
                                ${resultado.ubicaciones.map(u => `<span class="ub-tag">${u}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            container.innerHTML = `<div class="empty-consulta"><i class="fas fa-search"></i><p>Producto no encontrado</p></div>`;
        }
    },

    // Exportaciones
    exportDistribucion() {
        window.ZENGO?.toast('Generando reporte de distribución...', 'info');
        // TODO: Implementar exportación real
    },

    exportarNetSuite() {
        window.ZENGO?.toast('Generando archivo para NetSuite...', 'info');
        // TODO: Implementar exportación CSV
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS
    // ═══════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('jefe-styles')) return;
        const style = document.createElement('style');
        style.id = 'jefe-styles';
        style.innerHTML = `
            /* ═══════════════════════════════════════════════════════════
               JEFE VIEW - GLASSMORPHISM + PÚRPURA
               ═══════════════════════════════════════════════════════════ */
            
            :root {
                --jefe-purple: #7C3AED;
                --jefe-purple-glow: rgba(124, 58, 237, 0.2);
                --jefe-bg: #020205;
                --jefe-card: rgba(255, 255, 255, 0.03);
                --jefe-border: rgba(255, 255, 255, 0.08);
            }
            
            .jefe-theme {
                background: var(--jefe-bg);
                color: #ffffff;
            }
            
            .accent-purple {
                color: var(--jefe-purple);
                text-shadow: 0 0 20px var(--jefe-purple-glow);
            }
            
            .text-purple { color: var(--jefe-purple); }
            .text-success { color: #22c55e; }
            .text-warning { color: #f59e0b; }
            .text-error { color: #ef4444; }
            
            /* ═══════ LAYOUT ═══════ */
            .dashboard-wrapper {
                display: flex;
                min-height: 100vh;
            }
            
            /* ═══════ SIDEBAR ═══════ */
            .sidebar {
                width: 260px;
                min-width: 260px;
                height: 100vh;
                position: fixed;
                left: 0;
                top: 0;
                display: flex;
                flex-direction: column;
                background: var(--jefe-card);
                backdrop-filter: blur(20px);
                border-right: 1px solid var(--jefe-border);
                transition: all 0.3s ease;
                z-index: 100;
            }
            
            .sidebar.collapsed {
                width: 80px;
                min-width: 80px;
            }
            
            .sidebar.collapsed .user-card,
            .sidebar.collapsed .nav-item span,
            .sidebar.collapsed .badge-boss,
            .sidebar.collapsed .badge-alert {
                display: none;
            }
            
            .sidebar-header {
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid var(--jefe-border);
            }
            
            .logo {
                font-size: 24px;
                font-weight: 900;
            }
            
            .logo span {
                color: var(--jefe-purple);
            }
            
            .badge-boss {
                background: var(--jefe-purple);
                color: white;
                font-size: 9px;
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: 700;
            }
            
            .toggle-btn {
                margin-left: auto;
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 18px;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
            }
            
            .user-card {
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid var(--jefe-border);
            }
            
            .user-avatar {
                width: 45px;
                height: 45px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .user-avatar.jefe {
                background: linear-gradient(135deg, var(--jefe-purple), #5b21b6);
                box-shadow: 0 5px 20px var(--jefe-purple-glow);
            }
            
            .user-info {
                display: flex;
                flex-direction: column;
            }
            
            .user-name { font-weight: 600; font-size: 14px; }
            .user-role { font-size: 10px; color: var(--jefe-purple); letter-spacing: 1px; }
            
            .sidebar-nav {
                padding: 15px 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                flex: 1;
            }
            
            .nav-item {
                padding: 12px 15px;
                display: flex;
                align-items: center;
                gap: 12px;
                color: rgba(255,255,255,0.5);
                text-decoration: none;
                border-radius: 12px;
                transition: all 0.3s;
                font-size: 14px;
                position: relative;
            }
            
            .nav-item:hover {
                background: var(--jefe-border);
                color: white;
            }
            
            .nav-item.active {
                background: rgba(124, 58, 237, 0.15);
                color: var(--jefe-purple);
            }
            
            .nav-item i { width: 20px; text-align: center; }
            .nav-spacer { flex: 1; }
            .nav-item.logout { color: #ef4444; }
            
            .badge-alert {
                position: absolute;
                right: 10px;
                background: #ef4444;
                color: white;
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 700;
            }
            
            /* ═══════ MAIN CONTENT ═══════ */
            .main-content {
                flex: 1;
                margin-left: 260px;
                padding: 25px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 25px;
                transition: margin-left 0.3s;
            }
            
            .sidebar.collapsed ~ .main-content {
                margin-left: 80px;
            }
            
            /* ═══════ HEADER ═══════ */
            .top-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
            }
            
            .header-left {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .header-left h1 { font-size: 22px; margin: 0; }
            .text-dim { color: rgba(255,255,255,0.5); margin: 5px 0 0 0; font-size: 13px; }
            
            .mobile-menu {
                display: none;
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
            
            .header-stats {
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .sync-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
            }
            
            .sync-badge.online {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .sync-badge .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: currentColor;
            }
            
            .stat-item {
                padding: 10px 20px;
                border-radius: 12px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                text-align: center;
            }
            
            .stat-item small {
                display: block;
                font-size: 10px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 5px;
            }
            
            .stat-item span {
                font-size: 24px;
                font-weight: 800;
            }
            
            /* ═══════ QUICK METRICS ═══════ */
            .quick-metrics {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            
            .qm-card {
                padding: 20px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .qm-icon {
                width: 50px;
                height: 50px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            
            .qm-icon.purple { background: rgba(124, 58, 237, 0.15); color: var(--jefe-purple); }
            .qm-icon.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
            .qm-icon.orange { background: rgba(249, 115, 22, 0.15); color: #f97316; }
            .qm-icon.green { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            
            .qm-value {
                font-size: 28px;
                font-weight: 800;
                display: block;
            }
            
            .qm-label {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }
            
            /* ═══════ HEAT MAP ═══════ */
            .heat-map-section {
                padding: 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
            }
            
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .section-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .heat-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0 8px;
            }
            
            .heat-table th {
                text-align: left;
                padding: 12px;
                font-size: 11px;
                color: rgba(255,255,255,0.4);
                font-weight: 600;
            }
            
            .heat-table td {
                padding: 15px;
                background: var(--jefe-border);
                border: none;
            }
            
            .heat-table tr td:first-child { border-radius: 12px 0 0 12px; }
            .heat-table tr td:last-child { border-radius: 0 12px 12px 0; }
            
            .heat-row:hover td {
                background: rgba(124, 58, 237, 0.1);
            }
            
            .heat-row.heat-complete td { border-left: 3px solid #22c55e; }
            .heat-row.heat-high td { border-left: 3px solid #3b82f6; }
            .heat-row.heat-mid td { border-left: 3px solid #f59e0b; }
            .heat-row.heat-low td { border-left: 3px solid #ef4444; }
            
            .cat-info strong { display: block; }
            .cat-info small { font-size: 11px; color: rgba(255,255,255,0.4); }
            
            .user-pill {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 5px 12px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                border-radius: 20px;
                font-size: 12px;
            }
            
            .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
            
            .time-cell {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--jefe-purple);
            }
            
            .prog-bar-container {
                width: 100%;
                height: 6px;
                background: rgba(0,0,0,0.3);
                border-radius: 3px;
                position: relative;
            }
            
            .prog-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--jefe-purple), #a78bfa);
                border-radius: 3px;
                box-shadow: 0 0 10px var(--jefe-purple-glow);
            }
            
            .prog-text {
                font-size: 11px;
                color: var(--jefe-purple);
                margin-left: 10px;
            }
            
            .precision-badge {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 700;
            }
            
            .precision-badge.high { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .precision-badge.mid { background: rgba(249, 115, 22, 0.15); color: #f59e0b; }
            .precision-badge.low { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
            }
            
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #22c55e;
                animation: pulse 2s infinite;
            }
            
            .status-indicator.pausado .status-dot { background: #f59e0b; animation: none; }
            .status-indicator.completado .status-dot { background: #3b82f6; animation: none; }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .row-actions {
                display: flex;
                gap: 8px;
            }
            
            .btn-action-sm {
                padding: 6px 10px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                border-radius: 6px;
                color: rgba(255,255,255,0.7);
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-action-sm:hover { background: var(--jefe-purple); color: white; }
            .btn-action-sm.warning:hover { background: #f59e0b; }
            .btn-action-sm.danger:hover { background: #ef4444; }
            
            /* ═══════ ACTION GRID ═══════ */
            .action-grid {
                display: grid;
                grid-template-columns: 1.5fr 1fr;
                gap: 25px;
            }
            
            .findings-card, .ranking-card {
                padding: 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
            }
            
            .view-all {
                font-size: 12px;
                color: var(--jefe-purple);
                text-decoration: none;
            }
            
            /* Findings */
            .findings-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .finding-row {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: var(--jefe-border);
                border-radius: 12px;
            }
            
            .f-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            
            .f-icon.excedente { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .f-icon.no_catalogado { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
            .f-icon.dañado { background: rgba(249, 115, 22, 0.15); color: #f97316; }
            .f-icon.vencido { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            .f-icon.otro { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
            
            .f-info {
                flex: 1;
            }
            
            .f-upc {
                font-weight: 600;
                display: block;
            }
            
            .f-info small {
                display: block;
                font-size: 11px;
                color: rgba(255,255,255,0.5);
            }
            
            .f-meta {
                margin-top: 3px;
            }
            
            .f-actions {
                display: flex;
                gap: 8px;
            }
            
            .btn-approve, .btn-reject {
                padding: 8px 12px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-approve { background: #22c55e; color: white; }
            .btn-reject { background: #ef4444; color: white; }
            
            .btn-approve:hover { transform: scale(1.1); }
            .btn-reject:hover { transform: scale(1.1); }
            
            /* Ranking */
            .ranking-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .rank-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: var(--jefe-border);
                border-radius: 12px;
            }
            
            .rank-item.top-1 {
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 193, 7, 0.05));
                border: 1px solid rgba(255, 215, 0, 0.3);
            }
            
            .rank-item.top-2 {
                background: linear-gradient(135deg, rgba(192, 192, 192, 0.15), rgba(192, 192, 192, 0.05));
            }
            
            .rank-item.top-3 {
                background: linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(205, 127, 50, 0.05));
            }
            
            .rank-num {
                width: 28px;
                height: 28px;
                border-radius: 8px;
                background: var(--jefe-card);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 14px;
            }
            
            .rank-item.top-1 .rank-num { background: #ffd700; color: #000; }
            .rank-item.top-2 .rank-num { background: #c0c0c0; color: #000; }
            .rank-item.top-3 .rank-num { background: #cd7f32; color: #fff; }
            
            .rank-avatar {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: var(--jefe-purple);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                position: relative;
            }
            
            .rank-avatar .crown {
                position: absolute;
                top: -10px;
                font-size: 14px;
                color: #ffd700;
            }
            
            .rank-info { flex: 1; }
            .rank-name { font-weight: 600; display: block; font-size: 14px; }
            .rank-info small { font-size: 11px; color: rgba(255,255,255,0.5); }
            
            .rank-score { text-align: right; }
            .score-value { font-size: 18px; font-weight: 800; color: var(--jefe-purple); }
            
            .score-bar {
                width: 60px;
                height: 4px;
                background: var(--jefe-card);
                border-radius: 2px;
                margin-top: 5px;
            }
            
            .score-fill {
                height: 100%;
                background: var(--jefe-purple);
                border-radius: 2px;
            }
            
            .btn-export-excel {
                width: 100%;
                padding: 14px;
                background: #1D6F42;
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s;
            }
            
            .btn-export-excel:hover {
                background: #166534;
                transform: translateY(-2px);
            }
            
            /* ═══════ EMPTY STATE ═══════ */
            .empty-state {
                text-align: center;
                padding: 40px;
                color: rgba(255,255,255,0.4);
            }
            
            .empty-state.small { padding: 20px; }
            
            .empty-state i {
                font-size: 40px;
                margin-bottom: 15px;
                opacity: 0.3;
            }
            
            .loading-state {
                text-align: center;
                padding: 30px;
                color: rgba(255,255,255,0.5);
            }
            
            /* ═══════ BUTTONS ═══════ */
            .btn-primary {
                background: var(--jefe-purple);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-secondary {
                background: var(--jefe-border);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
            }
            
            .btn-icon {
                padding: 8px 12px;
                background: var(--jefe-border);
                border: none;
                border-radius: 8px;
                color: rgba(255,255,255,0.7);
                cursor: pointer;
            }
            
            /* ═══════ MODALS ═══════ */
            .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .modal-content {
                width: 100%;
                max-width: 500px;
                background: var(--jefe-card);
                backdrop-filter: blur(20px);
                border: 1px solid var(--jefe-border);
                border-radius: 20px;
            }
            
            .modal-content.modal-lg { max-width: 700px; }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px;
                border-bottom: 1px solid var(--jefe-border);
            }
            
            .modal-header h2 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 20px;
                cursor: pointer;
            }
            
            .modal-body { padding: 25px; }
            
            /* Consulta */
            .consulta-search {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .consulta-search input {
                flex: 1;
                padding: 15px;
                background: var(--jefe-border);
                border: 1px solid transparent;
                border-radius: 12px;
                color: white;
                font-size: 15px;
                outline: none;
            }
            
            .consulta-search input:focus {
                border-color: var(--jefe-purple);
            }
            
            .consulta-card {
                background: var(--jefe-border);
                border-radius: 16px;
                padding: 25px;
            }
            
            .consulta-header h3 { margin: 0 0 10px 0; }
            
            .upc-badge {
                background: var(--jefe-purple);
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
            }
            
            .consulta-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin: 20px 0;
            }
            
            .consulta-item {
                padding: 15px;
                background: var(--jefe-card);
                border-radius: 10px;
            }
            
            .consulta-item small {
                display: block;
                font-size: 11px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 5px;
            }
            
            .ubicaciones-section h4 {
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .ubicaciones-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .ub-tag {
                padding: 5px 12px;
                background: var(--jefe-purple);
                color: white;
                border-radius: 20px;
                font-size: 12px;
            }
            
            .empty-consulta {
                text-align: center;
                padding: 50px;
                color: rgba(255,255,255,0.4);
            }
            
            .empty-consulta i {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            /* ═══════ ASIGNAR ═══════ */
            .asignar-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
            }
            
            .asignar-card {
                padding: 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
            }
            
            .asignar-card.wide {
                grid-column: 1 / -1;
            }
            
            .asignar-card h4 {
                margin: 0 0 20px 0;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
            }
            
            .categorias-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            
            .categoria-item, .auxiliar-item {
                padding: 15px;
                background: var(--jefe-border);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s;
                border: 2px solid transparent;
            }
            
            .categoria-item:hover, .auxiliar-item:hover {
                background: rgba(124, 58, 237, 0.1);
            }
            
            .categoria-item.selected, .auxiliar-item.selected {
                border-color: var(--jefe-purple);
                background: rgba(124, 58, 237, 0.15);
            }
            
            .categoria-item i { margin-right: 10px; color: var(--jefe-purple); }
            .categoria-item small { display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 5px; }
            
            .auxiliares-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .auxiliar-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .aux-avatar {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: var(--jefe-purple);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
            }
            
            .aux-info span { display: block; font-weight: 600; }
            .aux-info small { font-size: 11px; color: rgba(255,255,255,0.5); }
            
            .asignar-resumen {
                min-height: 100px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .resumen-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 15px;
                background: var(--jefe-border);
                border-radius: 12px;
            }
            
            .resumen-item i { color: var(--jefe-purple); }
            
            .resumen-empty {
                text-align: center;
                padding: 30px;
                color: rgba(255,255,255,0.4);
            }
            
            .asignar-actions {
                display: flex;
                gap: 15px;
                margin-top: 20px;
                justify-content: flex-end;
            }
            
            .asignar-actions button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* ═══════ HALLAZGOS SECTION ═══════ */
            .hallazgos-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 25px;
            }
            
            .stat-card {
                padding: 20px;
                border-radius: 12px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                text-align: center;
            }
            
            .stat-value {
                font-size: 32px;
                font-weight: 800;
                display: block;
            }
            
            .stat-label {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }
            
            .hallazgos-table {
                padding: 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
            }
            
            .hallazgos-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .hallazgos-table th {
                text-align: left;
                padding: 12px;
                font-size: 11px;
                color: rgba(255,255,255,0.4);
                border-bottom: 1px solid var(--jefe-border);
            }
            
            .hallazgos-table td {
                padding: 12px;
                border-bottom: 1px solid var(--jefe-border);
            }
            
            .tipo-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .tipo-badge.excedente { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .tipo-badge.no_catalogado { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
            .tipo-badge.dañado { background: rgba(249, 115, 22, 0.15); color: #f97316; }
            .tipo-badge.vencido { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            .tipo-badge.otro { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
            
            .ubicacion-badge {
                padding: 4px 8px;
                background: var(--jefe-border);
                border-radius: 6px;
                font-size: 11px;
            }
            
            .btn-icon-sm {
                padding: 6px 10px;
                background: var(--jefe-border);
                border: none;
                border-radius: 6px;
                color: rgba(255,255,255,0.7);
                cursor: pointer;
            }
            
            /* ═══════ REPORTES ═══════ */
            .reportes-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 25px;
            }
            
            .reporte-card {
                padding: 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                cursor: pointer;
                transition: all 0.3s;
                text-align: center;
            }
            
            .reporte-card:hover {
                transform: translateY(-5px);
                border-color: var(--jefe-purple);
            }
            
            .reporte-icon {
                width: 60px;
                height: 60px;
                margin: 0 auto 15px;
                border-radius: 16px;
                background: rgba(124, 58, 237, 0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: var(--jefe-purple);
            }
            
            .reporte-icon.green {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .reporte-card h4 { margin: 0 0 10px 0; font-size: 14px; }
            .reporte-card p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.5); }
            
            .reporte-preview {
                padding: 25px;
                border-radius: 16px;
                background: var(--jefe-card);
                border: 1px solid var(--jefe-border);
                min-height: 300px;
            }
            
            /* ═══════ RESPONSIVE ═══════ */
            @media (max-width: 1200px) {
                .quick-metrics { grid-template-columns: repeat(2, 1fr); }
                .action-grid { grid-template-columns: 1fr; }
                .reportes-grid { grid-template-columns: repeat(2, 1fr); }
            }
            
            @media (max-width: 768px) {
                .sidebar {
                    transform: translateX(-100%);
                }
                
                .sidebar.collapsed {
                    transform: translateX(0);
                    width: 260px;
                }
                
                .main-content {
                    margin-left: 0;
                }
                
                .mobile-menu {
                    display: block;
                }
                
                .top-header {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .header-stats {
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                .quick-metrics { grid-template-columns: 1fr; }
                .asignar-grid { grid-template-columns: 1fr; }
                .hallazgos-stats { grid-template-columns: 1fr; }
                .reportes-grid { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer al window
window.JefeView = JefeView;