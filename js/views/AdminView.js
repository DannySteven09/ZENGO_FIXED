// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista Administrador
// Dashboard + Gestión de Usuarios (CRUD real contra BD)
// ═══════════════════════════════════════════════════════════════

const AdminView = {

    render(container, state = {}) {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        state = { 
            diffTotal: 0, precision: 0, lineasContadas: 0, lineasTotales: 0,
            mermaMonetaria: 0, sobraMonetaria: 0, logs: [], ranking: [],
            tareasActivas: 0, auxiliaresActivos: 0,
            ...state 
        };

        container.innerHTML = `
        <div class="dashboard-wrapper admin-theme">
            <aside id="sidebar" class="sidebar glass">
                <div class="sidebar-header">
                    <div class="logo">ZEN<span>GO</span></div>
                    <span class="badge-role">ADMIN</span>
                    <button class="toggle-btn" onclick="AdminView.toggleSidebar()"><i class="fas fa-bars"></i></button>
                </div>
                <div class="user-card">
                    <div class="user-avatar admin"><i class="fas fa-user-shield"></i></div>
                    <div class="user-info">
                        <span class="user-name">${session.name || 'Administrador'}</span>
                        <span class="user-role">ADMINISTRADOR</span>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-section="dashboard" onclick="AdminView.showSection('dashboard')">
                        <i class="fas fa-chart-line"></i> <span>Consola Global</span>
                    </a>
                    <label class="nav-item clickable">
                        <i class="fas fa-file-upload"></i> <span>Cargar NetSuite</span>
                        <input type="file" id="excel-input" hidden accept=".xlsx,.xls,.csv" onchange="AdminController.handleNetsuiteImport(event)">
                    </label>
                    <a href="#" class="nav-item" data-section="consulta" onclick="AdminView.showConsultaModal()">
                        <i class="fas fa-search"></i> <span>Modo Consulta</span>
                    </a>
                    <a href="#" class="nav-item" data-section="merma" onclick="AdminView.showSection('merma')">
                        <i class="fas fa-chart-pie"></i> <span>Análisis Merma</span>
                    </a>
                    <a href="#" class="nav-item" data-section="auditoria" onclick="AdminView.showSection('auditoria')">
                        <i class="fas fa-history"></i> <span>Auditoría</span>
                    </a>
                    <a href="#" class="nav-item" data-section="usuarios" onclick="AdminView.showSection('usuarios')">
                        <i class="fas fa-users-cog"></i> <span>Gestión Usuarios</span>
                    </a>
                    <a href="#" class="nav-item" data-section="config" onclick="AdminView.showSection('config')">
                        <i class="fas fa-cog"></i> <span>Configuración</span>
                    </a>
                    <div class="nav-spacer"></div>
                    <a href="#" class="nav-item theme-toggle" onclick="AdminView.toggleTheme()">
                        <i class="fas fa-moon"></i> <span>Modo Oscuro</span>
                    </a>
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()">
                        <i class="fas fa-power-off"></i> <span>Cerrar Sesión</span>
                    </a>
                </nav>
            </aside>
            <main class="main-content">
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="AdminView.toggleSidebar()"><i class="fas fa-bars"></i></button>
                        <div>
                            <h1>Panel de <span class="accent-red">Administración</span></h1>
                            <p class="text-dim">Consolidado de Diferencias y Auditoría</p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <div id="sync-container" class="sync-badge online">
                            <div id="sync-dot" class="dot"></div>
                            <span id="sync-text">ONLINE</span>
                        </div>
                        <button class="btn-action" onclick="AdminView.refreshData()"><i class="fas fa-sync-alt"></i></button>
                        <button class="btn-export" onclick="AdminController.exportDiferencias()">
                            <i class="fas fa-file-excel"></i> EXPORTAR
                        </button>
                    </div>
                </header>

                <!-- Dashboard -->
                <div id="section-dashboard" class="section-content">
                    <section class="metrics-grid">
                        <div class="metric-card glass glow-red">
                            <div class="metric-header"><i class="fas fa-balance-scale"></i></div>
                            <span class="metric-value" id="metric-diff">${state.diffTotal}</span>
                            <span class="metric-label">Diferencia Neta</span>
                        </div>
                        <div class="metric-card glass">
                            <div class="metric-header"><i class="fas fa-bullseye"></i></div>
                            <span class="metric-value" id="metric-precision">${state.precision}%</span>
                            <span class="metric-label">Precisión</span>
                        </div>
                        <div class="metric-card glass">
                            <div class="metric-header"><i class="fas fa-clipboard-check"></i></div>
                            <span class="metric-value" id="metric-lineas">${state.lineasContadas}</span>
                            <span class="metric-label">Líneas Auditadas</span>
                        </div>
                        <div class="metric-card glass glow-warning">
                            <div class="metric-header"><i class="fas fa-dollar-sign"></i></div>
                            <span class="metric-value text-error" id="metric-merma">-₡${state.mermaMonetaria.toLocaleString()}</span>
                            <span class="metric-label">Merma Monetaria</span>
                        </div>
                    </section>
                    <section class="metrics-grid secondary">
                        <div class="metric-card-mini glass">
                            <i class="fas fa-tasks"></i>
                            <div><span class="mini-value" id="mini-tareas">${state.tareasActivas}</span><span class="mini-label">Tareas</span></div>
                        </div>
                        <div class="metric-card-mini glass">
                            <i class="fas fa-users"></i>
                            <div><span class="mini-value" id="mini-auxiliares">${state.auxiliaresActivos}</span><span class="mini-label">Auxiliares</span></div>
                        </div>
                        <div class="metric-card-mini glass">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div><span class="mini-value" id="mini-hallazgos">0</span><span class="mini-label">Hallazgos</span></div>
                        </div>
                        <div class="metric-card-mini glass">
                            <i class="fas fa-chart-line"></i>
                            <div><span class="mini-value text-success" id="mini-sobra">+₡${(state.sobraMonetaria || 0).toLocaleString()}</span><span class="mini-label">Sobra</span></div>
                        </div>
                    </section>
                    <div class="admin-main-grid">
                        <section class="audit-section glass">
                            <div class="section-header">
                                <h3><i class="fas fa-fingerprint"></i> Logs de Auditoría</h3>
                                <input type="text" placeholder="Filtrar..." class="filter-input" oninput="AdminView.filterLogs(this.value)">
                            </div>
                            <div class="table-holder" id="logs-container">${this.renderLogsTable(state.logs)}</div>
                        </section>
                        <section class="ranking-section glass">
                            <div class="section-header"><h3><i class="fas fa-trophy"></i> Ranking</h3></div>
                            <div class="rank-list" id="ranking-container">${this.renderRanking(state.ranking)}</div>
                        </section>
                    </div>
                </div>

                <!-- Usuarios CRUD -->
                <div id="section-usuarios" class="section-content" style="display:none;">
                    <section class="usuarios-gestion">
                        <div class="section-header">
                            <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
                            <button class="btn-primary" onclick="AdminView.showNuevoUsuarioModal()">
                                <i class="fas fa-user-plus"></i> Nuevo Usuario
                            </button>
                        </div>
                        <div class="usuarios-stats">
                            <div class="stat-card glass"><i class="fas fa-user-shield"></i><span class="stat-num" id="count-admins">0</span><span>Admins</span></div>
                            <div class="stat-card glass"><i class="fas fa-user-tie"></i><span class="stat-num" id="count-jefes">0</span><span>Jefes</span></div>
                            <div class="stat-card glass"><i class="fas fa-user"></i><span class="stat-num" id="count-auxiliares">0</span><span>Auxiliares</span></div>
                        </div>
                        <div class="usuarios-table glass">
                            <table class="admin-table">
                                <thead><tr><th>USUARIO</th><th>EMAIL</th><th>ROL</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
                                <tbody id="usuarios-tbody"><tr><td colspan="5" class="text-center">Cargando...</td></tr></tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <!-- Otras secciones -->
                <div id="section-merma" class="section-content" style="display:none;">
                    <section class="glass" style="padding:30px;">
                        <h2><i class="fas fa-chart-pie"></i> Análisis de Merma</h2>
                        <p class="text-dim">Próximamente: Gráficos y análisis detallado</p>
                    </section>
                </div>
                <div id="section-auditoria" class="section-content" style="display:none;">
                    <section class="glass" style="padding:30px;">
                        <h2><i class="fas fa-history"></i> Auditoría Completa</h2>
                        <p class="text-dim">Registros completos de todas las operaciones</p>
                    </section>
                </div>
                <div id="section-config" class="section-content" style="display:none;">
                    <section class="glass" style="padding:30px;">
                        <h2><i class="fas fa-cog"></i> Configuración</h2>
                        <div style="margin-top:20px;">
                            <button class="btn-primary" onclick="SyncManager.syncPendientes()"><i class="fas fa-sync"></i> Forzar Sync</button>
                            <button class="btn-danger" onclick="AdminView.limpiarDB()" style="margin-left:10px;"><i class="fas fa-trash"></i> Limpiar BD Local</button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
        ${this.renderModals()}
        `;
        this.injectStyles();
        this.loadDashboardData();
        this.loadUsuarios();
    },

    // ═══════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ═══════════════════════════════════════════════════════════
    renderLogsTable(logs = []) {
        if (logs.length === 0) return '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>No hay logs</p></div>';
        return `<table class="admin-table"><thead><tr><th>HORA</th><th>USUARIO</th><th>ACCIÓN</th><th>SKU</th></tr></thead><tbody>${logs.map(l => `<tr><td class="mono">${l.hora||''}</td><td>${l.usuario||'Sistema'}</td><td>${l.accion||'Conteo'}</td><td><code>${l.sku||'-'}</code></td></tr>`).join('')}</tbody></table>`;
    },

    renderRanking(ranking = []) {
        if (ranking.length === 0) return '<div class="empty-state small"><i class="fas fa-medal"></i><p>Sin datos</p></div>';
        return ranking.map((u, i) => `<div class="rank-item ${i<3?'top-'+(i+1):''}"><span class="rank-pos">${i+1}</span><div class="rank-avatar">${i===0?'<i class="fas fa-crown"></i>':''}<span>${(u.nombre||'U').charAt(0)}</span></div><div class="rank-info"><strong>${u.nombre||'Usuario'}</strong><small>${u.conteos||0} conteos</small></div><span class="rank-precision">${u.precision||0}%</span></div>`).join('');
    },

    renderModals() {
        return `
        <div id="consulta-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass">
                <div class="modal-header"><h2><i class="fas fa-search"></i> Consulta</h2><button class="modal-close" onclick="AdminView.closeModal()"><i class="fas fa-times"></i></button></div>
                <div class="modal-body">
                    <div class="consulta-search"><input type="text" id="admin-consulta-input" placeholder="UPC/SKU..."><button class="btn-primary" onclick="AdminView.buscarProducto()"><i class="fas fa-search"></i></button></div>
                    <div id="admin-consulta-resultado"><div class="empty-state"><i class="fas fa-barcode"></i><p>Escanea un producto</p></div></div>
                </div>
            </div>
        </div>
        <div id="usuario-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass">
                <div class="modal-header"><h2 id="usuario-modal-title"><i class="fas fa-user-plus"></i> Nuevo Usuario</h2><button class="modal-close" onclick="AdminView.closeModal()"><i class="fas fa-times"></i></button></div>
                <div class="modal-body">
                    <form id="usuario-form">
                        <input type="hidden" id="usuario-id">
                        <div class="form-group"><label>Nombre</label><input type="text" id="usuario-nombre" required></div>
                        <div class="form-group"><label>Apellido</label><input type="text" id="usuario-apellido"></div>
                        <div class="form-group"><label>Email</label><input type="email" id="usuario-email" required></div>
                        <div class="form-group"><label>Contraseña</label><input type="password" id="usuario-password" placeholder="Dejar vacío para mantener"></div>
                        <div class="form-group"><label>Rol</label><select id="usuario-role" required><option value="">Seleccionar...</option><option value="ADMIN">Administrador</option><option value="JEFE">Jefe de Bodega</option><option value="AUXILIAR">Auxiliar</option></select></div>
                    </form>
                </div>
                <div class="modal-footer"><button class="btn-secondary" onclick="AdminView.closeModal()">Cancelar</button><button class="btn-primary" onclick="AdminView.guardarUsuario()"><i class="fas fa-save"></i> Guardar</button></div>
            </div>
        </div>`;
    },

    // ═══════════════════════════════════════════════════════════
    // CRUD USUARIOS (async - consulta BD real)
    // ═══════════════════════════════════════════════════════════
    async loadUsuarios() {
        try {
            const usuarios = await window.AuthModel.getAllUsers();
            const tbody = document.getElementById('usuarios-tbody');
            if (!tbody) return;

            // Contar por rol (solo activos)
            const activos = usuarios.filter(u => u.activo !== false);
            document.getElementById('count-admins').textContent = activos.filter(u => u.role === 'ADMIN').length;
            document.getElementById('count-jefes').textContent = activos.filter(u => u.role === 'JEFE').length;
            document.getElementById('count-auxiliares').textContent = activos.filter(u => u.role === 'AUXILIAR').length;

            if (activos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">Sin usuarios</td></tr>';
                return;
            }

            tbody.innerHTML = activos.map(u => `
                <tr data-id="${u.id}">
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-mini ${u.role.toLowerCase()}">${(u.nombre || 'U').charAt(0)}</div>
                            <span>${u.nombre} ${u.apellido || ''}</span>
                        </div>
                    </td>
                    <td><code>${u.email}</code></td>
                    <td><span class="role-badge ${u.role.toLowerCase()}">${u.role}</span></td>
                    <td><span class="status-badge ${u.activo !== false ? 'active' : 'inactive'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="AdminView.editarUsuario(${u.id})"><i class="fas fa-edit"></i></button>
                            ${u.id !== 1 ? `<button class="btn-icon delete" onclick="AdminView.eliminarUsuario(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            const tbody = document.getElementById('usuarios-tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error al cargar usuarios</td></tr>';
        }
    },

    showNuevoUsuarioModal() {
        document.getElementById('usuario-modal-title').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
        document.getElementById('usuario-form').reset();
        document.getElementById('usuario-id').value = '';
        document.getElementById('usuario-modal').style.display = 'flex';
    },

    async editarUsuario(userId) {
        const u = await window.AuthModel.getUserById(userId);
        if (!u) return;
        document.getElementById('usuario-modal-title').innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
        document.getElementById('usuario-id').value = u.id;
        document.getElementById('usuario-nombre').value = u.nombre;
        document.getElementById('usuario-apellido').value = u.apellido || '';
        document.getElementById('usuario-email').value = u.email;
        document.getElementById('usuario-password').value = '';
        document.getElementById('usuario-role').value = u.role;
        document.getElementById('usuario-modal').style.display = 'flex';
    },

    async guardarUsuario() {
        const id = document.getElementById('usuario-id').value;
        const nombre = document.getElementById('usuario-nombre').value.trim();
        const apellido = document.getElementById('usuario-apellido').value.trim();
        const email = document.getElementById('usuario-email').value.trim();
        const password = document.getElementById('usuario-password').value;
        const role = document.getElementById('usuario-role').value;

        if (!nombre || !email || !role) {
            window.ZENGO?.toast('Completa los campos requeridos', 'error');
            return;
        }

        const userData = { nombre, apellido, email, role };
        if (password) userData.password = password;

        if (id) {
            await window.AdminController.actualizarUsuario(parseInt(id), userData);
        } else {
            userData.password = password || '123';
            await window.AdminController.crearUsuario(userData);
        }

        this.closeModal();
        this.loadUsuarios();
    },

    async eliminarUsuario(userId) {
        const result = await window.AdminController.eliminarUsuario(userId);
        if (result) this.loadUsuarios();
    },

    // ═══════════════════════════════════════════════════════════
    // UI FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); },
    toggleTheme() { document.body.classList.toggle('light-mode'); },

    showSection(sectionId) {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        const section = document.getElementById(`section-${sectionId}`);
        if (section) section.style.display = 'block';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
        if (sectionId === 'usuarios') this.loadUsuarios();
    },

    showConsultaModal() { document.getElementById('consulta-modal').style.display = 'flex'; document.getElementById('admin-consulta-input')?.focus(); },
    closeModal() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); },
    filterLogs(q) { document.querySelectorAll('.log-row').forEach(r => r.style.display = r.innerText.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'); },
    async refreshData() { window.ZENGO?.toast('Actualizando...', 'info'); await this.loadDashboardData(); window.ZENGO?.toast('Actualizado', 'success'); },

    async buscarProducto() {
        const code = document.getElementById('admin-consulta-input')?.value?.trim();
        if (!code) return;
        const resultado = await window.ScannerController.consultarProducto(code);
        const container = document.getElementById('admin-consulta-resultado');
        if (resultado.encontrado) {
            const p = resultado.producto;
            container.innerHTML = `<div class="consulta-card"><h4>${p.descripcion || 'Producto'}</h4><div class="consulta-grid"><div><small>UPC</small><code>${p.upc}</code></div><div><small>Stock</small><strong>${p.stock_sistema || 0}</strong></div><div><small>Categoría</small><strong>${p.categoria_id || 'General'}</strong></div><div><small>Precio</small><strong>₡${(p.precio || 0).toLocaleString()}</strong></div></div></div>`;
        } else { container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No encontrado</p></div>'; }
    },

    async loadDashboardData() {
        try {
            const productos = await window.db.productos.toArray();
            const conteos = await window.db.conteos.toArray();
            const tareas = await window.db.tareas.toArray();
            const hallazgos = await window.db.hallazgos.where('estado').equals('pendiente').toArray();
            const lineasTotales = productos.length;
            const lineasContadas = conteos.length;
            let mermaUnidades = 0, sobraUnidades = 0, mermaMonetaria = 0, sobraMonetaria = 0;
            const productosMap = new Map(productos.map(p => [p.upc, p]));
            conteos.forEach(c => {
                const prod = productosMap.get(c.upc);
                if (prod) {
                    const diff = (c.cantidad || 0) - (prod.stock_sistema || 0);
                    if (diff < 0) { mermaUnidades += Math.abs(diff); mermaMonetaria += Math.abs(diff) * (prod.precio || 0); }
                    else if (diff > 0) { sobraUnidades += diff; sobraMonetaria += diff * (prod.precio || 0); }
                }
            });
            const diffTotal = sobraUnidades - mermaUnidades;
            const precision = lineasTotales > 0 ? Math.round(((lineasTotales - Math.abs(diffTotal)) / lineasTotales) * 100) : 0;
            document.getElementById('metric-diff').textContent = diffTotal;
            document.getElementById('metric-precision').textContent = precision + '%';
            document.getElementById('metric-lineas').textContent = lineasContadas;
            document.getElementById('metric-merma').textContent = '-₡' + mermaMonetaria.toLocaleString();
            document.getElementById('mini-tareas').textContent = tareas.filter(t => t.estado !== 'completado').length;

            // Auxiliares ahora viene de BD (async)
            const auxiliares = await window.AuthModel.getAuxiliares();
            document.getElementById('mini-auxiliares').textContent = auxiliares.length;
            document.getElementById('mini-hallazgos').textContent = hallazgos.length;
            document.getElementById('mini-sobra').textContent = '+₡' + sobraMonetaria.toLocaleString();

            const logs = conteos.slice(-15).reverse().map(c => ({ hora: new Date(c.timestamp).toLocaleTimeString(), usuario: 'Auxiliar', accion: 'Conteo', sku: c.upc }));
            document.getElementById('logs-container').innerHTML = this.renderLogsTable(logs);

            const ranking = auxiliares.map(a => ({ nombre: a.nombre, precision: Math.floor(Math.random() * 15 + 85), conteos: Math.floor(Math.random() * 50 + 10) })).sort((a, b) => b.precision - a.precision);
            document.getElementById('ranking-container').innerHTML = this.renderRanking(ranking);
        } catch (err) { console.error('Error dashboard:', err); }
    },

    async limpiarDB() {
        const ok = await window.ZENGO?.confirm('¿Eliminar TODOS los datos locales?', 'Confirmar');
        if (!ok) return;
        await window.db.clearAll();
        window.ZENGO?.toast('BD limpiada', 'success');
        this.loadDashboardData();
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS (inyectados una sola vez)
    // ═══════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('admin-styles')) return;
        const style = document.createElement('style');
        style.id = 'admin-styles';
        style.innerHTML = `
:root { --admin-red: #C8102E; --admin-red-glow: rgba(200, 16, 46, 0.25); }
.admin-theme { background: #050505; color: white; }
.accent-red { color: var(--admin-red); }
.dashboard-wrapper { display: flex; min-height: 100vh; }
.sidebar { width: 260px; height: 100vh; position: fixed; left: 0; top: 0; display: flex; flex-direction: column; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,0.08); z-index: 100; transition: all 0.3s; }
.sidebar.collapsed { width: 80px; }
.sidebar.collapsed .user-card, .sidebar.collapsed .nav-item span, .sidebar.collapsed .badge-role { display: none; }
.sidebar-header { padding: 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.logo { font-size: 24px; font-weight: 900; }
.logo span { color: var(--admin-red); }
.badge-role { background: var(--admin-red); color: white; font-size: 9px; padding: 3px 8px; border-radius: 4px; font-weight: 700; }
.toggle-btn { background: none; border: none; color: white; cursor: pointer; margin-left: auto; }
.user-card { padding: 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.user-avatar { width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.user-avatar.admin { background: linear-gradient(135deg, var(--admin-red), #a00d24); }
.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 600; }
.user-role { font-size: 11px; color: rgba(255,255,255,0.5); }
.sidebar-nav { padding: 15px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-radius: 10px; color: rgba(255,255,255,0.6); text-decoration: none; transition: all 0.2s; cursor: pointer; }
.nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
.nav-item.active { background: rgba(200,16,46,0.15); color: var(--admin-red); }
.nav-item.logout { color: #ef4444; }
.nav-item.clickable { cursor: pointer; }
.nav-spacer { flex: 1; }
.main-content { margin-left: 260px; flex: 1; padding: 30px; }
.sidebar.collapsed + .main-content { margin-left: 80px; }
.top-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-radius: 16px; margin-bottom: 30px; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
.header-left { display: flex; align-items: center; gap: 20px; }
.header-left h1 { font-size: 24px; font-weight: 700; }
.text-dim { color: rgba(255,255,255,0.5); font-size: 13px; }
.mobile-menu { display: none; background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
.header-actions { display: flex; align-items: center; gap: 15px; }
.sync-badge { display: flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.sync-badge.online { background: rgba(34,197,94,0.15); color: #22c55e; }
.sync-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.btn-action { background: rgba(255,255,255,0.1); border: none; color: white; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; }
.btn-export { background: var(--admin-red); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px; }
.metrics-grid.secondary { grid-template-columns: repeat(4, 1fr); }
.metric-card { padding: 25px; border-radius: 16px; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
.metric-card.glow-red { border-color: rgba(200,16,46,0.3); box-shadow: 0 0 30px rgba(200,16,46,0.1); }
.metric-card.glow-warning { border-color: rgba(245,158,11,0.3); }
.metric-header { margin-bottom: 15px; }
.metric-header i { font-size: 24px; color: var(--admin-red); }
.metric-value { font-size: 32px; font-weight: 700; display: block; margin-bottom: 5px; }
.metric-label { font-size: 13px; color: rgba(255,255,255,0.6); }
.metric-card-mini { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); }
.metric-card-mini i { font-size: 20px; color: var(--admin-red); }
.mini-value { font-size: 20px; font-weight: 700; display: block; }
.mini-label { font-size: 11px; color: rgba(255,255,255,0.5); }
.admin-main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header h3, .section-header h2 { font-size: 16px; display: flex; align-items: center; gap: 10px; }
.filter-input { padding: 8px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 13px; }
.audit-section, .ranking-section { padding: 25px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th { text-align: left; padding: 12px 15px; font-size: 11px; color: rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.08); }
.admin-table td { padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.rank-list { display: flex; flex-direction: column; gap: 10px; }
.rank-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.rank-item.top-1 { background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); }
.rank-pos { font-weight: 700; width: 25px; }
.rank-avatar { width: 35px; height: 35px; border-radius: 8px; background: var(--admin-red); display: flex; align-items: center; justify-content: center; font-weight: 700; position: relative; }
.rank-avatar i { position: absolute; top: -8px; font-size: 12px; color: gold; }
.rank-info { flex: 1; }
.rank-info strong { display: block; font-size: 14px; }
.rank-info small { font-size: 11px; color: rgba(255,255,255,0.5); }
.rank-precision { font-weight: 700; color: #22c55e; }
.empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.4); }
.empty-state i { font-size: 40px; margin-bottom: 15px; display: block; }
.empty-state.small { padding: 20px; }
.usuarios-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
.stat-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 25px; border-radius: 16px; text-align: center; }
.stat-card i { font-size: 28px; color: var(--admin-red); }
.stat-num { font-size: 36px; font-weight: 700; }
.usuarios-table { padding: 20px; border-radius: 16px; }
.user-cell { display: flex; align-items: center; gap: 12px; }
.user-avatar-mini { width: 35px; height: 35px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.user-avatar-mini.admin { background: linear-gradient(135deg, #C8102E, #a00d24); }
.user-avatar-mini.jefe { background: linear-gradient(135deg, #7C3AED, #5b21b6); }
.user-avatar-mini.auxiliar { background: linear-gradient(135deg, #2563EB, #1d4ed8); }
.role-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.role-badge.admin { background: rgba(200,16,46,0.2); color: #C8102E; }
.role-badge.jefe { background: rgba(124,58,237,0.2); color: #7C3AED; }
.role-badge.auxiliar { background: rgba(37,99,235,0.2); color: #2563EB; }
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; }
.status-badge.active { background: rgba(34,197,94,0.15); color: #22c55e; }
.status-badge.inactive { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-buttons { display: flex; gap: 8px; }
.btn-icon { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon.edit { background: rgba(59,130,246,0.15); color: #3b82f6; }
.btn-icon.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-content { width: 90%; max-width: 500px; border-radius: 20px; background: rgba(20,20,20,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.modal-close { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 20px; cursor: pointer; }
.modal-body { padding: 25px; }
.modal-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 20px 25px; border-top: 1px solid rgba(255,255,255,0.08); }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.form-group input, .form-group select { width: 100%; padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 14px; }
.form-group select option { background: #1a1a1a; color: white; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--admin-red); }
.btn-primary { background: var(--admin-red); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-secondary { background: rgba(255,255,255,0.1); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-danger { background: rgba(239,68,68,0.2); color: #ef4444; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.consulta-search { display: flex; gap: 10px; margin-bottom: 20px; }
.consulta-search input { flex: 1; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 16px; }
.consulta-card { padding: 20px; border-radius: 16px; background: rgba(255,255,255,0.05); }
.consulta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
.consulta-grid > div { padding: 12px; background: rgba(255,255,255,0.03); border-radius: 10px; }
.consulta-grid small { display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 5px; }
.text-success { color: #22c55e !important; }
.text-error { color: #ef4444 !important; }
.text-center { text-align: center; }
code { background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 12px; }
@media (max-width: 1200px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } .admin-main-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .sidebar { transform: translateX(-100%); } .sidebar.collapsed { transform: translateX(0); width: 260px; } .main-content { margin-left: 0; } .mobile-menu { display: block; } .metrics-grid { grid-template-columns: 1fr; } .usuarios-stats { grid-template-columns: 1fr; } }
        `;
        document.head.appendChild(style);
    }
};

window.AdminView = AdminView;