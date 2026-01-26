// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista Administrador
// Dashboard ejecutivo con métricas, auditoría y gestión
// ═══════════════════════════════════════════════════════════════

import { AuthController } from '../controllers/AuthController.js';
import { ScannerController } from '../controllers/ScannerController.js';
import supabase from '../config/supabase.js';

export const AdminView = {

    // ═══════════════════════════════════════════════════════════
    // RENDERIZADO PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    render(container, state = {}) {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        // Estado por defecto
        const defaultState = {
            diffTotal: 0,
            precision: 0,
            lineasContadas: 0,
            lineasTotales: 0,
            mermaMonetaria: 0,
            sobraMonetaria: 0,
            logs: [],
            ranking: [],
            tareasActivas: 0,
            auxiliaresActivos: 0
        };
        
        state = { ...defaultState, ...state };

        container.innerHTML = `
        <div class="dashboard-wrapper admin-theme">
            <!-- ═══════ SIDEBAR ═══════ -->
            <aside id="sidebar" class="sidebar glass">
                <div class="sidebar-header">
                    <div class="logo">ZEN<span>GO</span></div>
                    <span class="badge-role">ADMIN</span>
                    <button class="toggle-btn" onclick="AdminView.toggleSidebar()">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
                
                <div class="user-card">
                    <div class="user-avatar admin">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="user-info">
                        <span class="user-name">${session.name || 'Administrador'}</span>
                        <span class="user-role">ADMINISTRADOR</span>
                    </div>
                </div>
                
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-section="dashboard" onclick="AdminView.showSection('dashboard')">
                        <i class="fas fa-chart-line"></i> 
                        <span>Consola Global</span>
                    </a>
                    
                    <label class="nav-item clickable">
                        <i class="fas fa-file-upload"></i> 
                        <span>Cargar NetSuite</span>
                        <input type="file" id="excel-input" hidden accept=".xlsx,.xls,.csv" 
                               onchange="AdminController.handleNetsuiteImport(event)">
                    </label>
                    
                    <a href="#" class="nav-item" data-section="consulta" onclick="AdminView.showConsultaModal()">
                        <i class="fas fa-search"></i> 
                        <span>Modo Consulta</span>
                    </a>
                    
                    <a href="#" class="nav-item" data-section="merma" onclick="AdminView.showSection('merma')">
                        <i class="fas fa-chart-pie"></i> 
                        <span>Análisis Merma</span>
                    </a>
                    
                    <a href="#" class="nav-item" data-section="auditoria" onclick="AdminView.showSection('auditoria')">
                        <i class="fas fa-history"></i> 
                        <span>Auditoría Completa</span>
                    </a>
                    
                    <a href="#" class="nav-item" data-section="usuarios" onclick="AdminView.showSection('usuarios')">
                        <i class="fas fa-users-cog"></i> 
                        <span>Gestión Usuarios</span>
                    </a>
                    
                    <a href="#" class="nav-item" data-section="config" onclick="AdminView.showSection('config')">
                        <i class="fas fa-cog"></i> 
                        <span>Configuración</span>
                    </a>
                    
                    <div class="nav-spacer"></div>
                    
                    <a href="#" class="nav-item theme-toggle" onclick="AdminView.toggleTheme()">
                        <i class="fas fa-moon"></i>
                        <span>Modo Oscuro</span>
                    </a>
                    
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()">
                        <i class="fas fa-power-off"></i> 
                        <span>Cerrar Sesión</span>
                    </a>
                </nav>
            </aside>

            <!-- ═══════ CONTENIDO PRINCIPAL ═══════ -->
            <main class="main-content">
                <!-- Header -->
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="AdminView.toggleSidebar()">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div>
                            <h1>Panel de <span class="accent-red">Administración</span></h1>
                            <p class="text-dim">Consolidado de Diferencias y Auditoría en Tiempo Real</p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <div id="sync-container" class="sync-badge online">
                            <div id="sync-dot" class="dot"></div>
                            <span id="sync-text">ONLINE</span>
                        </div>
                        <button class="btn-action" onclick="AdminView.refreshData()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn-export" onclick="AdminController.exportDiferencias()">
                            <i class="fas fa-file-excel"></i> EXPORTAR REPORTE
                        </button>
                    </div>
                </header>

                <!-- Sección Dashboard -->
                <div id="section-dashboard" class="section-content">
                    <!-- Métricas Principales -->
                    <section class="metrics-grid">
                        <div class="metric-card glass glow-red">
                            <div class="metric-header">
                                <i class="fas fa-balance-scale"></i>
                                <span class="metric-trend ${state.diffTotal < 0 ? 'negative' : 'positive'}">
                                    <i class="fas fa-${state.diffTotal < 0 ? 'arrow-down' : 'arrow-up'}"></i>
                                </span>
                            </div>
                            <span class="metric-value ${state.diffTotal < 0 ? 'text-error' : 'text-success'}">
                                ${state.diffTotal > 0 ? '+' : ''}${state.diffTotal.toLocaleString()}
                            </span>
                            <span class="metric-label">Diferencia Neta Total</span>
                            <small class="metric-sub">Unidades físicas vs Sistema</small>
                        </div>
                        
                        <div class="metric-card glass">
                            <div class="metric-header">
                                <i class="fas fa-bullseye"></i>
                            </div>
                            <span class="metric-value">${state.precision}%</span>
                            <span class="metric-label">Precisión de Tienda</span>
                            <div class="progress-bar">
                                <div class="fill ${state.precision >= 95 ? 'green' : state.precision >= 85 ? 'yellow' : 'red'}" 
                                     style="width: ${state.precision}%"></div>
                            </div>
                        </div>
                        
                        <div class="metric-card glass">
                            <div class="metric-header">
                                <i class="fas fa-clipboard-check"></i>
                            </div>
                            <span class="metric-value">${state.lineasContadas.toLocaleString()}</span>
                            <span class="metric-label">Líneas Auditadas</span>
                            <small class="metric-sub">De ${state.lineasTotales.toLocaleString()} totales</small>
                        </div>
                        
                        <div class="metric-card glass glow-warning">
                            <div class="metric-header">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <span class="metric-value text-error">-₡${state.mermaMonetaria.toLocaleString()}</span>
                            <span class="metric-label">Merma Monetaria</span>
                            <small class="metric-sub">Valor estimado de pérdida</small>
                        </div>
                    </section>

                    <!-- Segunda fila de métricas -->
                    <section class="metrics-grid secondary">
                        <div class="metric-card-mini glass">
                            <i class="fas fa-tasks"></i>
                            <div>
                                <span class="mini-value">${state.tareasActivas}</span>
                                <span class="mini-label">Tareas Activas</span>
                            </div>
                        </div>
                        <div class="metric-card-mini glass">
                            <i class="fas fa-users"></i>
                            <div>
                                <span class="mini-value">${state.auxiliaresActivos}</span>
                                <span class="mini-label">Auxiliares Activos</span>
                            </div>
                        </div>
                        <div class="metric-card-mini glass">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <span class="mini-value">${state.hallazgosPendientes || 0}</span>
                                <span class="mini-label">Hallazgos Pendientes</span>
                            </div>
                        </div>
                        <div class="metric-card-mini glass">
                            <i class="fas fa-chart-line"></i>
                            <div>
                                <span class="mini-value text-success">+₡${state.sobraMonetaria?.toLocaleString() || 0}</span>
                                <span class="mini-label">Sobra Monetaria</span>
                            </div>
                        </div>
                    </section>

                    <!-- Grid Principal -->
                    <div class="admin-main-grid">
                        <!-- Logs de Auditoría -->
                        <section class="audit-section glass">
                            <div class="section-header">
                                <h3><i class="fas fa-fingerprint"></i> Logs de Auditoría Operativa</h3>
                                <div class="section-actions">
                                    <input type="text" placeholder="Filtrar..." class="filter-input" 
                                           oninput="AdminView.filterLogs(this.value)">
                                    <button class="btn-icon" onclick="AdminView.exportLogs()">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="table-holder" id="logs-container">
                                ${this.renderLogsTable(state.logs)}
                            </div>
                        </section>

                        <!-- Ranking -->
                        <section class="ranking-section glass">
                            <div class="section-header">
                                <h3><i class="fas fa-trophy"></i> Ranking de Precisión</h3>
                            </div>
                            <div class="rank-list" id="ranking-container">
                                ${this.renderRanking(state.ranking)}
                            </div>
                        </section>
                    </div>
                </div>

                <!-- Sección Merma -->
                <div id="section-merma" class="section-content" style="display:none;">
                    ${this.renderMermaSection(state)}
                </div>

                <!-- Sección Auditoría -->
                <div id="section-auditoria" class="section-content" style="display:none;">
                    ${this.renderAuditoriaSection(state)}
                </div>

                <!-- Sección Usuarios -->
                <div id="section-usuarios" class="section-content" style="display:none;">
                    ${this.renderUsuariosSection()}
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
    renderLogsTable(logs = []) {
        if (logs.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No hay logs de auditoría</p>
                </div>
            `;
        }

        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>HORA</th>
                        <th>RESPONSABLE</th>
                        <th>ACCIÓN</th>
                        <th>SKU / PRODUCTO</th>
                        <th>DETALLES</th>
                        <th>ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr class="log-row" data-id="${log.id}">
                            <td class="mono">${log.hora || new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td><span class="badge-user">${log.usuario || log.auxiliar_nombre || 'Sistema'}</span></td>
                            <td><strong>${log.accion || log.tipo || 'Conteo'}</strong></td>
                            <td>
                                <div class="sku-cell">
                                    <code>${log.sku || log.producto_sku || '-'}</code>
                                    <small>${log.upc || ''}</small>
                                </div>
                            </td>
                            <td class="details-cell">${log.detalles || log.cantidad_contada ? `Cant: ${log.cantidad_contada}` : '-'}</td>
                            <td>
                                <span class="status-tag ${log.status === 'Aprobado' || log.sync_status === 'synced' ? 'success' : 'pending'}">
                                    ${log.status || (log.sync_status === 'synced' ? 'Sincronizado' : 'Pendiente')}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
                <span class="rank-pos">${i + 1}</span>
                <div class="rank-avatar">
                    ${i === 0 ? '<i class="fas fa-crown"></i>' : ''}
                    <span>${(u.nombre || 'Usuario').charAt(0)}</span>
                </div>
                <div class="rank-info">
                    <strong>${u.nombre || 'Usuario'}</strong>
                    <small>${u.categoria || 'General'} • ${u.conteos || 0} conteos</small>
                </div>
                <div class="rank-stats">
                    <span class="rank-precision">${u.precision || 0}%</span>
                    <div class="mini-bar">
                        <div class="mini-fill" style="width: ${u.precision || 0}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderMermaSection(state) {
        return `
            <section class="merma-analysis">
                <div class="section-header">
                    <h2><i class="fas fa-chart-pie"></i> Análisis de Merma y Diferencias</h2>
                </div>
                
                <div class="merma-grid">
                    <div class="merma-card glass">
                        <h4>Resumen Monetario</h4>
                        <div class="merma-stats">
                            <div class="stat-row negative">
                                <span>Merma (Faltantes)</span>
                                <strong>-₡${(state.mermaMonetaria || 0).toLocaleString()}</strong>
                            </div>
                            <div class="stat-row positive">
                                <span>Sobra (Excedentes)</span>
                                <strong>+₡${(state.sobraMonetaria || 0).toLocaleString()}</strong>
                            </div>
                            <div class="stat-row total">
                                <span>Diferencia Neta</span>
                                <strong class="${(state.mermaMonetaria - state.sobraMonetaria) > 0 ? 'text-error' : 'text-success'}">
                                    ₡${((state.sobraMonetaria || 0) - (state.mermaMonetaria || 0)).toLocaleString()}
                                </strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="merma-card glass">
                        <h4>Top 10 SKUs con Mayor Merma</h4>
                        <div class="top-merma-list" id="top-merma">
                            <div class="empty-state small">
                                <p>Cargando datos...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="merma-card glass wide">
                        <h4>Merma por Categoría</h4>
                        <div class="category-chart" id="category-chart">
                            <div class="empty-state small">
                                <i class="fas fa-chart-bar"></i>
                                <p>Gráfico de categorías</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    },

    renderAuditoriaSection(state) {
        return `
            <section class="auditoria-full">
                <div class="section-header">
                    <h2><i class="fas fa-history"></i> Auditoría Completa</h2>
                    <div class="section-actions">
                        <input type="date" id="audit-date-from" class="date-input">
                        <input type="date" id="audit-date-to" class="date-input">
                        <button class="btn-primary" onclick="AdminView.filterAuditoria()">
                            <i class="fas fa-filter"></i> Filtrar
                        </button>
                        <button class="btn-secondary" onclick="AdminView.exportAuditoria()">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                    </div>
                </div>
                
                <div class="audit-filters">
                    <select id="audit-filter-user" class="select-input">
                        <option value="">Todos los usuarios</option>
                    </select>
                    <select id="audit-filter-action" class="select-input">
                        <option value="">Todas las acciones</option>
                        <option value="conteo">Conteos</option>
                        <option value="hallazgo">Hallazgos</option>
                        <option value="login">Inicios de sesión</option>
                    </select>
                </div>
                
                <div class="audit-table-full glass" id="audit-full-container">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Selecciona un rango de fechas para ver la auditoría</p>
                    </div>
                </div>
            </section>
        `;
    },

    renderUsuariosSection() {
        return `
            <section class="usuarios-gestion">
                <div class="section-header">
                    <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
                    <button class="btn-primary" onclick="AdminView.showNuevoUsuarioModal()">
                        <i class="fas fa-user-plus"></i> Nuevo Usuario
                    </button>
                </div>
                
                <div class="usuarios-grid" id="usuarios-container">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>Cargando usuarios...</p>
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
                        <button class="modal-close" onclick="AdminView.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="consulta-search">
                            <input type="text" id="admin-consulta-input" placeholder="Escanea o ingresa UPC/SKU..." autofocus>
                            <button class="btn-primary" onclick="AdminView.buscarProducto()">
                                <i class="fas fa-search"></i>
                            </button>
                            <button class="btn-secondary" onclick="ScannerController.openCameraScanner()">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <div id="admin-consulta-resultado" class="consulta-resultado">
                            <div class="empty-consulta">
                                <i class="fas fa-barcode"></i>
                                <p>Escanea un producto para ver información completa</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Detalle Producto -->
            <div id="producto-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content glass glow-red">
                    <div class="modal-header">
                        <h3><i class="fas fa-box"></i> Detalle de Producto</h3>
                        <button class="modal-close" onclick="AdminView.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="producto-detalle-content">
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="AdminView.closeModal()">CERRAR</button>
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
        // Ocultar todas las secciones
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        
        // Mostrar la seleccionada
        const section = document.getElementById(`section-${sectionId}`);
        if (section) section.style.display = 'block';
        
        // Actualizar navegación
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    },

    showConsultaModal() {
        document.getElementById('consulta-modal').style.display = 'flex';
        document.getElementById('admin-consulta-input').focus();
    },

    async buscarProducto() {
        const code = document.getElementById('admin-consulta-input').value.trim();
        if (!code) return;

        const resultado = await ScannerController.consultarProducto(code);
        const container = document.getElementById('admin-consulta-resultado');

        if (resultado.encontrado) {
            const p = resultado.producto;
            container.innerHTML = `
                <div class="consulta-card admin">
                    <div class="consulta-header">
                        <h3>${p.descripcion || 'Producto'}</h3>
                        <div class="consulta-badges">
                            <code class="upc-badge">${p.upc}</code>
                            <span class="status-tag ${p.activo !== false ? 'success' : 'error'}">
                                ${p.activo !== false ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="consulta-grid">
                        <div class="consulta-item">
                            <small>SKU</small>
                            <strong>${p.sku || 'N/A'}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Stock Sistema</small>
                            <strong>${p.stock_sistema || 0}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Precio</small>
                            <strong>₡${(p.precio || 0).toLocaleString()}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Costo</small>
                            <strong>₡${(p.costo || 0).toLocaleString()}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Categoría</small>
                            <strong>${p.categoria_id || 'General'}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Tipo</small>
                            <strong>${p.tipo || 'Estándar'}</strong>
                        </div>
                    </div>
                    
                    ${resultado.ubicaciones.length > 0 ? `
                        <div class="location-box glass">
                            <i class="fas fa-map-marker-alt"></i>
                            <div>
                                <strong>HISTORIAL DE UBICACIONES</strong>
                                <div class="ubicaciones-tags">
                                    ${resultado.ubicaciones.map(u => `<span class="ub-tag">${u}</span>`).join('')}
                                </div>
                                <small>Se actualiza al finalizar cada cíclico</small>
                            </div>
                        </div>
                    ` : `
                        <div class="location-box glass empty">
                            <i class="fas fa-map-marker-alt"></i>
                            <div>
                                <strong>UBICACIÓN</strong>
                                <p class="text-dim">Sin ubicación registrada</p>
                            </div>
                        </div>
                    `}
                    
                    <div class="consulta-actions">
                        <button class="btn-secondary" onclick="AdminView.verHistorialProducto('${p.upc}')">
                            <i class="fas fa-history"></i> Ver Historial
                        </button>
                        <button class="btn-primary" onclick="AdminView.editarProducto('${p.upc}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="consulta-empty">
                    <i class="fas fa-search"></i>
                    <p>Producto no encontrado</p>
                    <small>Código: ${code}</small>
                </div>
            `;
        }
    },

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    },

    filterLogs(query) {
        const rows = document.querySelectorAll('.log-row');
        const q = query.toLowerCase();
        
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    },

    async refreshData() {
        window.ZENGO?.toast('Actualizando datos...', 'info');
        await this.loadDashboardData();
        window.ZENGO?.toast('Datos actualizados', 'success');
    },

    // ═══════════════════════════════════════════════════════════
    // CARGA DE DATOS
    // ═══════════════════════════════════════════════════════════
    async loadDashboardData() {
        try {
            // Cargar logs recientes
            const { data: logs } = await supabase
                .from('conteos_realizados')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (logs) {
                document.getElementById('logs-container').innerHTML = this.renderLogsTable(logs);
            }

            // Cargar ranking
            const { data: ranking } = await supabase
                .from('profiles')
                .select('nombre, role_id')
                .eq('role_id', 3) // Auxiliares
                .limit(10);

            // Por ahora ranking básico, después se calculará con precisión real
            if (ranking) {
                const rankingConPrecision = ranking.map(u => ({
                    ...u,
                    precision: Math.floor(Math.random() * 15 + 85), // Demo
                    conteos: Math.floor(Math.random() * 100 + 20) // Demo
                })).sort((a, b) => b.precision - a.precision);

                document.getElementById('ranking-container').innerHTML = this.renderRanking(rankingConPrecision);
            }

        } catch (err) {
            console.warn('Error cargando datos del dashboard:', err);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS
    // ═══════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('admin-styles')) return;
        const style = document.createElement('style');
        style.id = 'admin-styles';
        style.innerHTML = `
            /* ═══════════════════════════════════════════════════════════
               ADMIN VIEW - GLASSMORPHISM + ROJO OFFICE DEPOT
               ═══════════════════════════════════════════════════════════ */
            
            :root {
                --admin-red: #C8102E;
                --admin-red-glow: rgba(200, 16, 46, 0.25);
                --admin-bg: #050505;
                --admin-card: rgba(255, 255, 255, 0.03);
                --admin-border: rgba(255, 255, 255, 0.08);
                --admin-text: #ffffff;
                --admin-text-dim: rgba(255, 255, 255, 0.5);
            }
            
            .light-mode {
                --admin-bg: #f5f5f5;
                --admin-card: rgba(255, 255, 255, 0.9);
                --admin-border: rgba(0, 0, 0, 0.1);
                --admin-text: #1a1a1a;
                --admin-text-dim: rgba(0, 0, 0, 0.5);
            }
            
            .admin-theme {
                background: var(--admin-bg);
                color: var(--admin-text);
            }
            
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
                background: var(--admin-card);
                backdrop-filter: blur(20px);
                border-right: 1px solid var(--admin-border);
                transition: all 0.3s ease;
                z-index: 100;
            }
            
            .sidebar.collapsed {
                width: 80px;
                min-width: 80px;
            }
            
            .sidebar.collapsed .user-card,
            .sidebar.collapsed .nav-item span,
            .sidebar.collapsed .badge-role {
                display: none;
            }
            
            .sidebar-header {
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid var(--admin-border);
            }
            
            .logo {
                font-size: 24px;
                font-weight: 900;
                color: var(--admin-text);
            }
            
            .logo span {
                color: var(--admin-red);
            }
            
            .badge-role {
                background: var(--admin-red);
                color: white;
                font-size: 9px;
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            
            .toggle-btn {
                margin-left: auto;
                background: none;
                border: none;
                color: var(--admin-text-dim);
                font-size: 18px;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.3s;
            }
            
            .toggle-btn:hover {
                background: var(--admin-border);
                color: var(--admin-text);
            }
            
            .user-card {
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid var(--admin-border);
            }
            
            .user-avatar {
                width: 45px;
                height: 45px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
            }
            
            .user-avatar.admin {
                background: linear-gradient(135deg, var(--admin-red), #a00d24);
                box-shadow: 0 5px 20px var(--admin-red-glow);
            }
            
            .user-info {
                display: flex;
                flex-direction: column;
            }
            
            .user-name {
                font-weight: 600;
                font-size: 14px;
            }
            
            .user-role {
                font-size: 10px;
                color: var(--admin-red);
                letter-spacing: 1px;
                font-weight: 600;
            }
            
            .sidebar-nav {
                padding: 15px 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                flex: 1;
                overflow-y: auto;
            }
            
            .nav-item {
                padding: 12px 15px;
                display: flex;
                align-items: center;
                gap: 12px;
                color: var(--admin-text-dim);
                text-decoration: none;
                border-radius: 12px;
                transition: all 0.3s;
                font-size: 14px;
                cursor: pointer;
            }
            
            .nav-item:hover {
                background: var(--admin-border);
                color: var(--admin-text);
            }
            
            .nav-item.active {
                background: rgba(200, 16, 46, 0.15);
                color: var(--admin-red);
            }
            
            .nav-item.clickable {
                cursor: pointer;
            }
            
            .nav-item.clickable input {
                display: none;
            }
            
            .nav-item i {
                width: 20px;
                text-align: center;
            }
            
            .nav-spacer {
                flex: 1;
            }
            
            .nav-item.logout {
                color: #ef4444;
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
                background: var(--admin-card);
                border: 1px solid var(--admin-border);
            }
            
            .header-left {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .header-left h1 {
                font-size: 22px;
                margin: 0;
            }
            
            .accent-red {
                color: var(--admin-red);
                text-shadow: 0 0 20px var(--admin-red-glow);
            }
            
            .text-dim {
                color: var(--admin-text-dim);
                font-size: 13px;
                margin: 5px 0 0 0;
            }
            
            .header-actions {
                display: flex;
                gap: 12px;
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
                letter-spacing: 1px;
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
            
            .btn-action {
                padding: 10px 12px;
                background: var(--admin-border);
                border: none;
                border-radius: 10px;
                color: var(--admin-text);
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-action:hover {
                background: var(--admin-red);
            }
            
            .btn-export {
                background: linear-gradient(135deg, var(--admin-red), #a00d24);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            }
            
            .btn-export:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px var(--admin-red-glow);
            }
            
            .mobile-menu {
                display: none;
                background: none;
                border: none;
                color: var(--admin-text);
                font-size: 20px;
                cursor: pointer;
            }
            
            /* ═══════ METRICS ═══════ */
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            
            .metrics-grid.secondary {
                grid-template-columns: repeat(4, 1fr);
            }
            
            .metric-card {
                padding: 25px;
                border-radius: 16px;
                background: var(--admin-card);
                border: 1px solid var(--admin-border);
                display: flex;
                flex-direction: column;
            }
            
            .metric-card.glow-red {
                border-color: rgba(200, 16, 46, 0.3);
                box-shadow: 0 0 40px var(--admin-red-glow);
            }
            
            .metric-card.glow-warning {
                border-color: rgba(249, 115, 22, 0.3);
                box-shadow: 0 0 40px rgba(249, 115, 22, 0.15);
            }
            
            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .metric-header i {
                font-size: 24px;
                color: var(--admin-text-dim);
            }
            
            .metric-trend {
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 6px;
            }
            
            .metric-trend.positive {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .metric-trend.negative {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }
            
            .metric-value {
                font-size: 36px;
                font-weight: 800;
                line-height: 1;
                margin-bottom: 5px;
            }
            
            .metric-label {
                font-size: 13px;
                color: var(--admin-text-dim);
                font-weight: 500;
            }
            
            .metric-sub {
                font-size: 11px;
                color: var(--admin-text-dim);
                margin-top: 5px;
            }
            
            .text-success { color: #22c55e; }
            .text-error { color: #ef4444; }
            
            .progress-bar {
                height: 6px;
                background: var(--admin-border);
                border-radius: 3px;
                margin-top: 10px;
                overflow: hidden;
            }
            
            .progress-bar .fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.5s;
            }
            
            .fill.red { background: var(--admin-red); }
            .fill.green { background: #22c55e; }
            .fill.yellow { background: #f59e0b; }
            
            /* Mini metrics */
            .metric-card-mini {
                padding: 20px;
                border-radius: 12px;
                background: var(--admin-card);
                border: 1px solid var(--admin-border);
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .metric-card-mini i {
                font-size: 24px;
                color: var(--admin-text-dim);
            }
            
            .mini-value {
                font-size: 24px;
                font-weight: 800;
                display: block;
            }
            
            .mini-label {
                font-size: 12px;
                color: var(--admin-text-dim);
            }
            
            /* ═══════ MAIN GRID ═══════ */
            .admin-main-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 25px;
            }
            
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 15px;
                border-bottom: 1px solid var(--admin-border);
                margin-bottom: 15px;
            }
            
            .section-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .section-actions {
                display: flex;
                gap: 10px;
            }
            
            .filter-input {
                padding: 8px 12px;
                background: var(--admin-border);
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--admin-text);
                font-size: 12px;
                outline: none;
            }
            
            .filter-input:focus {
                border-color: var(--admin-red);
            }
            
            .btn-icon {
                padding: 8px 10px;
                background: var(--admin-border);
                border: none;
                border-radius: 8px;
                color: var(--admin-text-dim);
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-icon:hover {
                background: var(--admin-red);
                color: white;
            }
            
            /* ═══════ AUDIT TABLE ═══════ */
            .audit-section, .ranking-section {
                padding: 25px;
                border-radius: 16px;
                background: var(--admin-card);
                border: 1px solid var(--admin-border);
            }
            
            .table-holder {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .admin-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            
            .admin-table th {
                text-align: left;
                padding: 12px;
                font-size: 11px;
                font-weight: 600;
                color: var(--admin-text-dim);
                letter-spacing: 0.5px;
                border-bottom: 1px solid var(--admin-border);
                position: sticky;
                top: 0;
                background: var(--admin-card);
            }
            
            .admin-table td {
                padding: 12px;
                border-bottom: 1px solid var(--admin-border);
            }
            
            .admin-table tr:hover {
                background: var(--admin-border);
            }
            
            .mono {
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
            }
            
            .badge-user {
                background: var(--admin-border);
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 500;
            }
            
            .sku-cell {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .sku-cell code {
                font-size: 12px;
                color: var(--admin-red);
            }
            
            .sku-cell small {
                font-size: 10px;
                color: var(--admin-text-dim);
            }
            
            .status-tag {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 600;
            }
            
            .status-tag.success {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .status-tag.pending {
                background: rgba(249, 115, 22, 0.15);
                color: #f97316;
            }
            
            .status-tag.error {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }
            
            /* ═══════ RANKING ═══════ */
            .rank-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .rank-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-radius: 12px;
                background: var(--admin-border);
                transition: all 0.3s;
            }
            
            .rank-item:hover {
                transform: translateX(5px);
            }
            
            .rank-item.top-1 {
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 193, 7, 0.05));
                border: 1px solid rgba(255, 215, 0, 0.3);
            }
            
            .rank-item.top-2 {
                background: linear-gradient(135deg, rgba(192, 192, 192, 0.15), rgba(192, 192, 192, 0.05));
                border: 1px solid rgba(192, 192, 192, 0.3);
            }
            
            .rank-item.top-3 {
                background: linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(205, 127, 50, 0.05));
                border: 1px solid rgba(205, 127, 50, 0.3);
            }
            
            .rank-pos {
                width: 28px;
                height: 28px;
                border-radius: 8px;
                background: var(--admin-border);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 14px;
                color: var(--admin-text-dim);
            }
            
            .rank-item.top-1 .rank-pos { background: #ffd700; color: #000; }
            .rank-item.top-2 .rank-pos { background: #c0c0c0; color: #000; }
            .rank-item.top-3 .rank-pos { background: #cd7f32; color: #fff; }
            
            .rank-avatar {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: var(--admin-red);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                position: relative;
            }
            
            .rank-avatar i {
                position: absolute;
                top: -8px;
                font-size: 14px;
                color: #ffd700;
            }
            
            .rank-info {
                flex: 1;
            }
            
            .rank-info strong {
                display: block;
                font-size: 14px;
            }
            
            .rank-info small {
                font-size: 11px;
                color: var(--admin-text-dim);
            }
            
            .rank-stats {
                text-align: right;
            }
            
            .rank-precision {
                font-size: 18px;
                font-weight: 800;
                color: var(--admin-red);
            }
            
            .mini-bar {
                width: 60px;
                height: 4px;
                background: var(--admin-border);
                border-radius: 2px;
                margin-top: 5px;
            }
            
            .mini-fill {
                height: 100%;
                background: var(--admin-red);
                border-radius: 2px;
            }
            
            /* ═══════ EMPTY STATE ═══════ */
            .empty-state {
                text-align: center;
                padding: 40px;
                color: var(--admin-text-dim);
            }
            
            .empty-state.small {
                padding: 20px;
            }
            
            .empty-state i {
                font-size: 40px;
                margin-bottom: 15px;
                opacity: 0.3;
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
                background: var(--admin-card);
                backdrop-filter: blur(20px);
                border: 1px solid var(--admin-border);
                border-radius: 20px;
                animation: modalIn 0.3s ease;
            }
            
            .modal-content.modal-lg {
                max-width: 700px;
            }
            
            .modal-content.glow-red {
                border-color: rgba(200, 16, 46, 0.3);
                box-shadow: 0 0 50px var(--admin-red-glow);
            }
            
            @keyframes modalIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px;
                border-bottom: 1px solid var(--admin-border);
            }
            
            .modal-header h2, .modal-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: var(--admin-text-dim);
                font-size: 20px;
                cursor: pointer;
            }
            
            .modal-body {
                padding: 25px;
            }
            
            .modal-footer {
                padding: 20px 25px;
                border-top: 1px solid var(--admin-border);
                display: flex;
                gap: 15px;
                justify-content: flex-end;
            }
            
            /* Consulta */
            .consulta-search {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .consulta-search input {
                flex: 1;
                padding: 15px;
                background: var(--admin-border);
                border: 1px solid transparent;
                border-radius: 12px;
                color: var(--admin-text);
                font-size: 15px;
                outline: none;
            }
            
            .consulta-search input:focus {
                border-color: var(--admin-red);
            }
            
            .consulta-search button {
                padding: 15px 20px;
                border-radius: 12px;
                border: none;
                cursor: pointer;
                font-weight: 600;
            }
            
            .btn-primary {
                background: var(--admin-red);
                color: white;
            }
            
            .btn-secondary {
                background: var(--admin-border);
                color: var(--admin-text);
            }
            
            .consulta-card {
                background: var(--admin-border);
                border-radius: 16px;
                padding: 25px;
            }
            
            .consulta-header {
                margin-bottom: 20px;
            }
            
            .consulta-header h3 {
                margin: 0 0 10px 0;
            }
            
            .consulta-badges {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .upc-badge {
                background: var(--admin-red);
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
            }
            
            .consulta-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .consulta-item {
                padding: 15px;
                background: var(--admin-card);
                border-radius: 10px;
            }
            
            .consulta-item small {
                display: block;
                font-size: 11px;
                color: var(--admin-text-dim);
                margin-bottom: 5px;
            }
            
            .location-box {
                display: flex;
                align-items: flex-start;
                gap: 15px;
                padding: 20px;
                border-radius: 12px;
                background: rgba(200, 16, 46, 0.1);
                border: 1px dashed var(--admin-red);
                margin-bottom: 20px;
            }
            
            .location-box i {
                font-size: 24px;
                color: var(--admin-red);
            }
            
            .location-box.empty {
                opacity: 0.5;
            }
            
            .ubicaciones-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }
            
            .ub-tag {
                padding: 5px 12px;
                background: var(--admin-red);
                color: white;
                border-radius: 20px;
                font-size: 12px;
            }
            
            .consulta-actions {
                display: flex;
                gap: 15px;
            }
            
            .consulta-actions button {
                flex: 1;
                padding: 12px;
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            .consulta-empty, .empty-consulta {
                text-align: center;
                padding: 50px;
                color: var(--admin-text-dim);
            }
            
            .consulta-empty i, .empty-consulta i {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.3;
            }
            
            /* ═══════ RESPONSIVE ═══════ */
            @media (max-width: 1200px) {
                .metrics-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .admin-main-grid {
                    grid-template-columns: 1fr;
                }
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
                    align-items: stretch;
                }
                
                .header-actions {
                    flex-wrap: wrap;
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
                
                .consulta-grid {
                    grid-template-columns: 1fr 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer al window
window.AdminView = AdminView;