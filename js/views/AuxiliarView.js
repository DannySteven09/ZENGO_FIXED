// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista Auxiliar
// Dashboard de conteo con escáner, glassmorphism y sidebar
// ═══════════════════════════════════════════════════════════════

import { ScannerController } from '../controllers/ScannerController.js';
import { AuthController } from '../controllers/AuthController.js';

export const AuxiliarView = {

    // ═══════════════════════════════════════════════════════════
    // RENDERIZADO PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    render(container, data = [], categoriaNombre = 'Sin asignar') {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        container.innerHTML = `
        <div class="dashboard-wrapper aux-theme">
            <!-- ═══════ SIDEBAR ═══════ -->
            <aside id="sidebar" class="sidebar glass">
                <div class="sidebar-header">
                    <div class="logo">ZEN<span>GO</span></div>
                    <button class="toggle-btn" onclick="AuxiliarView.toggleSidebar()">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
                
                <div class="user-card">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info">
                        <span class="user-name">${session.name || 'Auxiliar'}</span>
                        <span class="user-role">AUXILIAR</span>
                    </div>
                </div>
                
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-section="ciclico">
                        <i class="fas fa-clipboard-list"></i> 
                        <span>Cíclico Activo</span>
                    </a>
                    <a href="#" class="nav-item" data-section="consulta" onclick="AuxiliarView.showConsulta()">
                        <i class="fas fa-search"></i> 
                        <span>Modo Consulta</span>
                    </a>
                    <a href="#" class="nav-item" data-section="hallazgos" onclick="AuxiliarView.showHallazgos()">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <span>Mis Hallazgos</span>
                    </a>
                    <a href="#" class="nav-item" data-section="historial" onclick="AuxiliarView.showHistorial()">
                        <i class="fas fa-history"></i> 
                        <span>Historial</span>
                    </a>
                    <div class="nav-spacer"></div>
                    <a href="#" class="nav-item theme-toggle" onclick="AuxiliarView.toggleTheme()">
                        <i class="fas fa-moon"></i>
                        <span>Modo Oscuro</span>
                    </a>
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()">
                        <i class="fas fa-sign-out-alt"></i> 
                        <span>Cerrar Sesión</span>
                    </a>
                </nav>
            </aside>

            <!-- ═══════ CONTENIDO PRINCIPAL ═══════ -->
            <main class="main-content">
                <!-- Header Superior -->
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="AuxiliarView.toggleSidebar()">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div class="category-info">
                            <h2 id="categoria-titulo">${categoriaNombre}</h2>
                            <div id="sync-container" class="sync-badge online">
                                <div id="sync-dot" class="dot"></div>
                                <span id="sync-text">ONLINE</span>
                            </div>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="precision-box glass">
                            <small>PRECISIÓN</small>
                            <span id="precision-absoluta">0%</span>
                        </div>
                        <div class="timer-display glass">
                            <i class="far fa-clock"></i>
                            <span id="timeElapsed">00:00:00</span>
                        </div>
                    </div>
                </header>

                <!-- Métricas -->
                <section class="metrics-grid">
                    <div class="metric-card glass">
                        <div class="metric-icon blue">
                            <i class="fas fa-boxes"></i>
                        </div>
                        <div class="metric-data">
                            <span class="metric-value" id="total-skus">${data.length}</span>
                            <span class="metric-label">SKUs Asignados</span>
                        </div>
                    </div>
                    
                    <div class="metric-card glass">
                        <div class="metric-icon green">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="metric-data">
                            <span class="metric-value" id="contados">0</span>
                            <span class="metric-label">Contados</span>
                        </div>
                    </div>
                    
                    <div class="metric-card glass">
                        <div class="metric-icon orange">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="metric-data">
                            <span class="metric-value" id="pendientes">${data.length}</span>
                            <span class="metric-label">Pendientes</span>
                        </div>
                    </div>
                    
                    <div class="metric-card glass progress-card">
                        <div class="progress-header">
                            <span class="metric-label">AVANCE DEL CÍCLICO</span>
                            <span id="progress-percent" class="progress-value">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div id="bar-fill" class="bar-fill" style="width: 0%"></div>
                        </div>
                    </div>
                </section>

                <!-- ═══════ BOTÓN ESCÁNER CÁMARA ═══════ -->
                <section class="scanner-section">
                    <button class="scan-camera-btn glass" onclick="ScannerController.openCameraScanner()">
                        <div class="scan-icon">
                            <i class="fas fa-camera"></i>
                        </div>
                        <div class="scan-text">
                            <span>ESCANEAR PRODUCTO</span>
                            <small>Toca para abrir la cámara</small>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <p class="scanner-hint">
                        <i class="fas fa-info-circle"></i>
                        También puedes usar un lector láser USB
                    </p>
                </section>

                <!-- Tabla de Productos -->
                <section class="table-section glass">
                    <div class="table-header">
                        <h3><i class="fas fa-list"></i> Productos del Cíclico</h3>
                        <div class="table-actions">
                            <input type="text" id="search-producto" placeholder="Buscar SKU o descripción..." 
                                   class="search-input" oninput="AuxiliarView.filterTable(this.value)">
                            <button class="btn-icon" onclick="AuxiliarView.toggleTableView()">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                    </div>
                    <div class="table-wrapper">
                        <table class="glass-table">
                            <thead>
                                <tr>
                                    <th>PRODUCTO</th>
                                    <th class="text-center">SISTEMA</th>
                                    <th class="text-center">CONTEO</th>
                                    <th class="text-center">UBICACIÓN</th>
                                    <th class="text-center">DIFF</th>
                                    <th class="text-center">ESTADO</th>
                                </tr>
                            </thead>
                            <tbody id="ciclico-body">
                                ${data.length > 0 
                                    ? data.map(item => this.createRowHTML(item)).join('')
                                    : '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><br>No hay productos asignados</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- Botón Finalizar -->
                ${data.length > 0 ? `
                <section class="actions-section">
                    <button class="btn-finalizar glass" onclick="ScannerController.finalizarCiclico()">
                        <i class="fas fa-flag-checkered"></i>
                        FINALIZAR CÍCLICO
                    </button>
                </section>
                ` : ''}
            </main>
        </div>

        <!-- ═══════ MODALES ═══════ -->
        ${this.renderModals()}
        `;

        this.injectStyles();
        this.initTimer();
        this.initNavigation();
        
        // Inicializar escáner con los datos
        ScannerController.init(data);
    },

    // ═══════════════════════════════════════════════════════════
    // MODALES
    // ═══════════════════════════════════════════════════════════
    renderModals() {
        return `
        <!-- Modal de Conteo -->
        <div id="conteo-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass">
                <div class="modal-header">
                    <div>
                        <h2 id="modal-desc">Producto</h2>
                        <span id="modal-upc" class="upc-badge">UPC</span>
                    </div>
                    <button class="modal-close" onclick="AuxiliarView.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="modal-info-row">
                        <div class="info-item">
                            <small>Stock Sistema</small>
                            <strong id="modal-stock">0</strong>
                        </div>
                        <div class="info-item">
                            <small>Conteo Actual</small>
                            <strong id="modal-conteo-actual">0</strong>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label><i class="fas fa-calculator"></i> CANTIDAD FÍSICA</label>
                        <input type="number" id="input-cantidad" placeholder="0" inputmode="numeric" min="0" autofocus>
                    </div>
                    
                    <div class="input-group">
                        <label><i class="fas fa-map-marker-alt"></i> UBICACIÓN</label>
                        <input type="text" id="input-ubicacion" placeholder="Ej: A-12-2" class="allow-scan">
                        <small class="input-hint">Si está en varios lugares, el sistema sumará automáticamente</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AuxiliarView.closeModal()">
                        <i class="fas fa-times"></i> CANCELAR
                    </button>
                    <button class="btn-primary" id="btn-save-conteo">
                        <i class="fas fa-save"></i> GUARDAR
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de Hallazgo -->
        <div id="hallazgo-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass">
                <div class="modal-header warning">
                    <div>
                        <h2><i class="fas fa-exclamation-triangle"></i> Registrar Hallazgo</h2>
                        <span id="hallazgo-upc" class="upc-badge">UPC</span>
                    </div>
                    <button class="modal-close" onclick="AuxiliarView.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label>Tipo de Hallazgo</label>
                        <select id="hallazgo-tipo" class="select-input">
                            <option value="EXCEDENTE">Excedente (más de lo esperado)</option>
                            <option value="NO_CATALOGADO">Producto no catalogado</option>
                            <option value="DAÑADO">Producto dañado</option>
                            <option value="VENCIDO">Producto vencido</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label>Cantidad Encontrada</label>
                        <input type="number" id="hallazgo-cantidad" placeholder="0" min="1" value="1">
                    </div>
                    
                    <div class="input-group">
                        <label>Ubicación</label>
                        <input type="text" id="hallazgo-ubicacion" placeholder="Ej: A-12-2">
                    </div>
                    
                    <div class="input-group">
                        <label>Descripción (opcional)</label>
                        <textarea id="hallazgo-descripcion" rows="2" placeholder="Detalles adicionales..."></textarea>
                    </div>
                    
                    <div class="input-group">
                        <label>Foto (opcional)</label>
                        <div class="foto-upload">
                            <input type="file" id="hallazgo-foto" accept="image/*" capture="environment" 
                                   onchange="AuxiliarView.previewFoto(this)">
                            <div class="foto-placeholder" id="foto-preview">
                                <i class="fas fa-camera"></i>
                                <span>Tomar foto</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AuxiliarView.closeModal()">CANCELAR</button>
                    <button class="btn-warning" onclick="AuxiliarView.saveHallazgo()">
                        <i class="fas fa-paper-plane"></i> ENVIAR HALLAZGO
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de Consulta -->
        <div id="consulta-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass modal-lg">
                <div class="modal-header">
                    <h2><i class="fas fa-search"></i> Modo Consulta</h2>
                    <button class="modal-close" onclick="AuxiliarView.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="consulta-search">
                        <input type="text" id="consulta-input" placeholder="Escanea o ingresa UPC/SKU..." autofocus>
                        <button class="btn-primary" onclick="AuxiliarView.buscarConsulta()">
                            <i class="fas fa-search"></i>
                        </button>
                        <button class="btn-secondary" onclick="ScannerController.openCameraScanner()">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div id="consulta-resultado" class="consulta-resultado">
                        <div class="empty-consulta">
                            <i class="fas fa-barcode"></i>
                            <p>Escanea un producto para ver su información</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // GENERADOR DE FILAS
    // ═══════════════════════════════════════════════════════════
    createRowHTML(item) {
        const conteo = item.conteo || 0;
        const sistema = item.stock_sistema || 0;
        const diff = conteo - sistema;
        const hasConteo = conteo > 0;
        
        let statusClass = 'pending';
        let statusIcon = 'fa-clock';
        let statusText = 'Pendiente';
        
        if (hasConteo) {
            if (diff === 0) {
                statusClass = 'success';
                statusIcon = 'fa-check-circle';
                statusText = 'OK';
            } else {
                statusClass = 'warning';
                statusIcon = 'fa-exclamation-circle';
                statusText = 'Diferencia';
            }
        }

        return `
            <tr id="row-${item.upc}" class="product-row ${hasConteo ? 'row-counted' : ''}" 
                onclick="AuxiliarView.selectProduct('${item.upc}')">
                <td>
                    <div class="prod-info">
                        <strong class="prod-sku">${item.sku || 'N/A'}</strong>
                        <span class="prod-desc">${item.descripcion || 'Sin descripción'}</span>
                        <code class="prod-upc">${item.upc}</code>
                    </div>
                </td>
                <td class="text-center">${sistema}</td>
                <td class="text-center">
                    <span class="conteo-value ${hasConteo ? 'has-value' : ''}">${hasConteo ? conteo : '—'}</span>
                </td>
                <td class="text-center">
                    <span class="ubicacion-badge">${item.ultima_ubicacion || '—'}</span>
                </td>
                <td class="text-center">
                    <span class="diff-value ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'}">
                        ${hasConteo ? (diff > 0 ? '+' : '') + diff : '—'}
                    </span>
                </td>
                <td class="text-center">
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </span>
                </td>
            </tr>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // ACTUALIZACIÓN DE UI
    // ═══════════════════════════════════════════════════════════
    updateProductRow(item) {
        const row = document.getElementById(`row-${item.upc}`);
        if (row) {
            const newHTML = this.createRowHTML(item);
            row.outerHTML = newHTML;
            
            // Animación de actualización
            const newRow = document.getElementById(`row-${item.upc}`);
            if (newRow) {
                newRow.classList.add('flash-update');
                setTimeout(() => newRow.classList.remove('flash-update'), 1000);
            }
        }
        this.updateCounters();
    },

    // Alias para compatibilidad
    updateRow(item) {
        this.updateProductRow(item);
    },

    updateHeaderMetrics(metrics) {
        if (metrics.avance !== undefined) {
            document.getElementById('progress-percent').innerText = `${metrics.avance}%`;
            document.getElementById('bar-fill').style.width = `${metrics.avance}%`;
        }
        if (metrics.precision !== undefined) {
            document.getElementById('precision-absoluta').innerText = `${metrics.precision}%`;
        }
        if (metrics.contados !== undefined) {
            document.getElementById('contados').innerText = metrics.contados;
        }
        if (metrics.totales !== undefined && metrics.contados !== undefined) {
            document.getElementById('pendientes').innerText = metrics.totales - metrics.contados;
        }
    },

    updateCounters() {
        const rows = document.querySelectorAll('.product-row');
        let contados = 0;
        rows.forEach(row => {
            if (row.classList.contains('row-counted')) contados++;
        });
        
        const totales = rows.length;
        const avance = totales > 0 ? ((contados / totales) * 100).toFixed(1) : 0;
        
        document.getElementById('contados').innerText = contados;
        document.getElementById('pendientes').innerText = totales - contados;
        document.getElementById('progress-percent').innerText = `${avance}%`;
        document.getElementById('bar-fill').style.width = `${avance}%`;
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
            text.innerText = 'Modo Claro';
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            text.innerText = 'Modo Oscuro';
        }
    },

    initNavigation() {
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            });
        });
    },

    selectProduct(upc) {
        const product = ScannerController.activeCiclico.find(p => p.upc === upc);
        if (product) {
            ScannerController.currentProduct = product;
            this.renderConteoModal(product);
        }
    },

    filterTable(query) {
        const rows = document.querySelectorAll('.product-row');
        const q = query.toLowerCase();
        
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    },

    // ═══════════════════════════════════════════════════════════
    // MODALES
    // ═══════════════════════════════════════════════════════════
    renderConteoModal(product) {
        document.getElementById('modal-desc').innerText = product.descripcion || 'Producto';
        document.getElementById('modal-upc').innerText = product.upc;
        document.getElementById('modal-stock').innerText = product.stock_sistema || 0;
        document.getElementById('modal-conteo-actual').innerText = product.conteo || 0;
        document.getElementById('input-cantidad').value = '';
        document.getElementById('input-ubicacion').value = product.ultima_ubicacion || '';
        
        document.getElementById('conteo-modal').style.display = 'flex';
        setTimeout(() => document.getElementById('input-cantidad').focus(), 100);

        // Configurar botón guardar
        document.getElementById('btn-save-conteo').onclick = () => {
            const cant = document.getElementById('input-cantidad').value;
            const ubic = document.getElementById('input-ubicacion').value;
            
            if (!cant || cant < 0) {
                window.ZENGO?.toast('Ingresa una cantidad válida', 'error');
                return;
            }
            if (!ubic.trim()) {
                window.ZENGO?.toast('Ingresa la ubicación', 'error');
                return;
            }
            
            ScannerController.saveConteo(cant, ubic);
        };

        // Enter para guardar
        document.getElementById('input-ubicacion').onkeydown = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-save-conteo').click();
            }
        };
    },

    renderHallazgoModal(upc) {
        document.getElementById('hallazgo-upc').innerText = upc;
        document.getElementById('hallazgo-cantidad').value = '1';
        document.getElementById('hallazgo-ubicacion').value = '';
        document.getElementById('hallazgo-descripcion').value = '';
        document.getElementById('hallazgo-tipo').value = 'EXCEDENTE';
        document.getElementById('foto-preview').innerHTML = '<i class="fas fa-camera"></i><span>Tomar foto</span>';
        
        document.getElementById('hallazgo-modal').style.display = 'flex';
    },

    async saveHallazgo() {
        const upc = document.getElementById('hallazgo-upc').innerText;
        const tipo = document.getElementById('hallazgo-tipo').value;
        const cantidad = document.getElementById('hallazgo-cantidad').value;
        const ubicacion = document.getElementById('hallazgo-ubicacion').value;
        const descripcion = document.getElementById('hallazgo-descripcion').value;
        
        // Obtener foto si existe
        let fotoBase64 = null;
        const fotoInput = document.getElementById('hallazgo-foto');
        if (fotoInput.files[0]) {
            fotoBase64 = await this.fileToBase64(fotoInput.files[0]);
        }

        await ScannerController.saveHallazgo({
            upc,
            tipo,
            cantidad,
            ubicacion,
            descripcion,
            foto: fotoBase64
        });
    },

    previewFoto(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('foto-preview').innerHTML = 
                    `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    },

    showConsulta() {
        document.getElementById('consulta-modal').style.display = 'flex';
        document.getElementById('consulta-input').focus();
    },

    async buscarConsulta() {
        const code = document.getElementById('consulta-input').value.trim();
        if (!code) return;

        const resultado = await ScannerController.consultarProducto(code);
        const container = document.getElementById('consulta-resultado');

        if (resultado.encontrado) {
            const p = resultado.producto;
            container.innerHTML = `
                <div class="consulta-card">
                    <div class="consulta-header">
                        <h3>${p.descripcion}</h3>
                        <code>${p.upc}</code>
                    </div>
                    <div class="consulta-grid">
                        <div class="consulta-item">
                            <small>SKU</small>
                            <strong>${p.sku}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Stock Sistema</small>
                            <strong>${p.stock_sistema || 0}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Precio</small>
                            <strong>${window.ZENGO?.formatCurrency(p.precio) || p.precio}</strong>
                        </div>
                        <div class="consulta-item">
                            <small>Categoría</small>
                            <strong>${p.categoria_id || 'N/A'}</strong>
                        </div>
                    </div>
                    ${resultado.ubicaciones.length > 0 ? `
                        <div class="consulta-ubicaciones">
                            <h4><i class="fas fa-map-marker-alt"></i> Historial de Ubicaciones</h4>
                            <div class="ubicaciones-list">
                                ${resultado.ubicaciones.map(u => `<span class="ub-tag">${u}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="consulta-empty">
                    <i class="fas fa-search"></i>
                    <p>Producto no encontrado</p>
                    <small>Verifica el código e intenta de nuevo</small>
                </div>
            `;
        }
    },

    showHallazgos() {
        window.ZENGO?.toast('Cargando hallazgos...', 'info');
        // TODO: Implementar vista de hallazgos
    },

    showHistorial() {
        window.ZENGO?.toast('Cargando historial...', 'info');
        // TODO: Implementar vista de historial
    },

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    },

    // ═══════════════════════════════════════════════════════════
    // CRONÓMETRO
    // ═══════════════════════════════════════════════════════════
    initTimer() {
        let secs = 0;
        if (window.auxTimerInterval) clearInterval(window.auxTimerInterval);
        
        window.auxTimerInterval = setInterval(() => {
            secs++;
            const h = String(Math.floor(secs / 3600)).padStart(2, '0');
            const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            const el = document.getElementById('timeElapsed');
            if (el) el.innerText = `${h}:${m}:${s}`;
        }, 1000);
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS
    // ═══════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('aux-styles')) return;
        const style = document.createElement('style');
        style.id = 'aux-styles';
        style.innerHTML = `
            /* ═══════════════════════════════════════════════════════════
               AUXILIAR VIEW - GLASSMORPHISM DARK/LIGHT
               ═══════════════════════════════════════════════════════════ */
            
            :root {
                --aux-primary: #2563EB;
                --aux-bg: #0a0a0a;
                --aux-card: rgba(255, 255, 255, 0.03);
                --aux-border: rgba(255, 255, 255, 0.08);
                --aux-text: #ffffff;
                --aux-text-dim: rgba(255, 255, 255, 0.5);
            }
            
            .light-mode {
                --aux-bg: #f0f2f5;
                --aux-card: rgba(255, 255, 255, 0.8);
                --aux-border: rgba(0, 0, 0, 0.1);
                --aux-text: #1a1a1a;
                --aux-text-dim: rgba(0, 0, 0, 0.5);
            }
            
            .aux-theme {
                background: var(--aux-bg);
                color: var(--aux-text);
            }
            
            /* ═══════ LAYOUT ═══════ */
            .dashboard-wrapper {
                display: flex;
                min-height: 100vh;
                overflow: hidden;
            }
            
            .dashboard-wrapper.sidebar-collapsed .main-content {
                margin-left: 0;
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
                background: var(--aux-card);
                backdrop-filter: blur(20px);
                border-right: 1px solid var(--aux-border);
                transition: all 0.3s ease;
                z-index: 100;
            }
            
            .sidebar.collapsed {
                width: 80px;
                min-width: 80px;
            }
            
            .sidebar.collapsed .user-card,
            .sidebar.collapsed .nav-item span,
            .sidebar.collapsed .logo span {
                display: none;
            }
            
            .sidebar.collapsed .logo {
                font-size: 20px;
            }
            
            .sidebar-header {
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--aux-border);
            }
            
            .logo {
                font-size: 24px;
                font-weight: 900;
                color: var(--aux-text);
            }
            
            .logo span {
                color: var(--aux-primary);
            }
            
            .toggle-btn {
                background: none;
                border: none;
                color: var(--aux-text-dim);
                font-size: 18px;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.3s;
            }
            
            .toggle-btn:hover {
                background: var(--aux-border);
                color: var(--aux-text);
            }
            
            .user-card {
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid var(--aux-border);
            }
            
            .user-avatar {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: var(--aux-primary);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
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
                font-size: 11px;
                color: var(--aux-primary);
                letter-spacing: 1px;
            }
            
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
                color: var(--aux-text-dim);
                text-decoration: none;
                border-radius: 12px;
                transition: all 0.3s;
                font-size: 14px;
            }
            
            .nav-item:hover {
                background: var(--aux-border);
                color: var(--aux-text);
            }
            
            .nav-item.active {
                background: rgba(37, 99, 235, 0.15);
                color: var(--aux-primary);
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
            
            .nav-item.logout:hover {
                background: rgba(239, 68, 68, 0.1);
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
            
            .sidebar.collapsed ~ .main-content,
            .sidebar-collapsed .main-content {
                margin-left: 80px;
            }
            
            /* ═══════ HEADER ═══════ */
            .top-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 25px;
                border-radius: 16px;
                background: var(--aux-card);
                border: 1px solid var(--aux-border);
            }
            
            .header-left {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .mobile-menu {
                display: none;
                background: none;
                border: none;
                color: var(--aux-text);
                font-size: 20px;
                cursor: pointer;
            }
            
            .category-info h2 {
                font-size: 18px;
                font-weight: 600;
                margin: 0;
            }
            
            .sync-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 1px;
                margin-top: 5px;
            }
            
            .sync-badge.online {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .sync-badge.offline {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }
            
            .sync-badge.syncing {
                background: rgba(59, 130, 246, 0.15);
                color: #3b82f6;
            }
            
            .sync-badge .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: currentColor;
            }
            
            .sync-badge.syncing .dot {
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            
            .header-right {
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .precision-box, .timer-display {
                padding: 10px 20px;
                border-radius: 12px;
                background: var(--aux-card);
                border: 1px solid var(--aux-border);
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .precision-box small {
                font-size: 10px;
                color: var(--aux-text-dim);
                letter-spacing: 1px;
            }
            
            .precision-box span {
                font-size: 24px;
                font-weight: 800;
                color: var(--aux-primary);
            }
            
            .timer-display {
                flex-direction: row;
                gap: 10px;
                font-family: 'JetBrains Mono', monospace;
                font-weight: 600;
            }
            
            /* ═══════ METRICS ═══════ */
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            
            .metric-card {
                padding: 20px;
                border-radius: 16px;
                background: var(--aux-card);
                border: 1px solid var(--aux-border);
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .metric-card.progress-card {
                flex-direction: column;
                align-items: stretch;
            }
            
            .metric-icon {
                width: 50px;
                height: 50px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            
            .metric-icon.blue {
                background: rgba(37, 99, 235, 0.15);
                color: #3b82f6;
            }
            
            .metric-icon.green {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .metric-icon.orange {
                background: rgba(249, 115, 22, 0.15);
                color: #f97316;
            }
            
            .metric-data {
                display: flex;
                flex-direction: column;
            }
            
            .metric-value {
                font-size: 28px;
                font-weight: 800;
            }
            
            .metric-label {
                font-size: 12px;
                color: var(--aux-text-dim);
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .progress-value {
                font-size: 18px;
                font-weight: 700;
                color: var(--aux-primary);
            }
            
            .progress-bar {
                height: 10px;
                background: var(--aux-border);
                border-radius: 5px;
                overflow: hidden;
            }
            
            .bar-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--aux-primary), #60a5fa);
                border-radius: 5px;
                transition: width 0.5s ease;
            }
            
            /* ═══════ SCANNER SECTION ═══════ */
            .scanner-section {
                text-align: center;
            }
            
            .scan-camera-btn {
                width: 100%;
                padding: 20px 30px;
                border-radius: 16px;
                background: linear-gradient(135deg, var(--aux-primary), #1d4ed8);
                border: none;
                color: white;
                display: flex;
                align-items: center;
                gap: 20px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .scan-camera-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
            }
            
            .scan-camera-btn:active {
                transform: scale(0.98);
            }
            
            .scan-icon {
                width: 60px;
                height: 60px;
                border-radius: 16px;
                background: rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
            }
            
            .scan-text {
                flex: 1;
                text-align: left;
            }
            
            .scan-text span {
                display: block;
                font-size: 18px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            
            .scan-text small {
                font-size: 12px;
                opacity: 0.8;
            }
            
            .scanner-hint {
                margin-top: 10px;
                font-size: 12px;
                color: var(--aux-text-dim);
            }
            
            .scanner-hint i {
                margin-right: 5px;
            }
            
            /* ═══════ TABLE ═══════ */
            .table-section {
                background: var(--aux-card);
                border: 1px solid var(--aux-border);
                border-radius: 16px;
                overflow: hidden;
            }
            
            .table-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--aux-border);
            }
            
            .table-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .table-actions {
                display: flex;
                gap: 10px;
            }
            
            .search-input {
                padding: 10px 15px;
                background: var(--aux-border);
                border: 1px solid transparent;
                border-radius: 10px;
                color: var(--aux-text);
                font-size: 13px;
                outline: none;
                width: 200px;
                transition: all 0.3s;
            }
            
            .search-input:focus {
                border-color: var(--aux-primary);
                background: transparent;
            }
            
            .btn-icon {
                padding: 10px;
                background: var(--aux-border);
                border: none;
                border-radius: 10px;
                color: var(--aux-text-dim);
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-icon:hover {
                background: var(--aux-primary);
                color: white;
            }
            
            .table-wrapper {
                overflow-x: auto;
            }
            
            .glass-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .glass-table th {
                text-align: left;
                padding: 15px 20px;
                font-size: 11px;
                font-weight: 600;
                color: var(--aux-text-dim);
                letter-spacing: 1px;
                background: var(--aux-border);
            }
            
            .glass-table td {
                padding: 15px 20px;
                border-bottom: 1px solid var(--aux-border);
            }
            
            .product-row {
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .product-row:hover {
                background: var(--aux-border);
            }
            
            .product-row.row-counted {
                background: rgba(34, 197, 94, 0.05);
            }
            
            .prod-info {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            
            .prod-sku {
                font-weight: 600;
            }
            
            .prod-desc {
                font-size: 12px;
                color: var(--aux-text-dim);
            }
            
            .prod-upc {
                font-size: 10px;
                color: var(--aux-primary);
                background: rgba(37, 99, 235, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                width: fit-content;
            }
            
            .text-center {
                text-align: center;
            }
            
            .conteo-value.has-value {
                font-weight: 700;
                color: var(--aux-primary);
            }
            
            .ubicacion-badge {
                font-size: 11px;
                padding: 4px 8px;
                background: var(--aux-border);
                border-radius: 6px;
            }
            
            .diff-value {
                font-weight: 700;
            }
            
            .diff-value.positive {
                color: #22c55e;
            }
            
            .diff-value.negative {
                color: #ef4444;
            }
            
            .diff-value.neutral {
                color: var(--aux-text-dim);
            }
            
            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .status-badge.pending {
                background: rgba(156, 163, 175, 0.15);
                color: #9ca3af;
            }
            
            .status-badge.success {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }
            
            .status-badge.warning {
                background: rgba(249, 115, 22, 0.15);
                color: #f97316;
            }
            
            .empty-state {
                text-align: center;
                padding: 60px 20px;
                color: var(--aux-text-dim);
            }
            
            .empty-state i {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            /* ═══════ ACTIONS ═══════ */
            .actions-section {
                display: flex;
                justify-content: center;
            }
            
            .btn-finalizar {
                padding: 18px 50px;
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border: none;
                border-radius: 14px;
                color: white;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: all 0.3s;
            }
            
            .btn-finalizar:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
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
                max-width: 450px;
                background: var(--aux-card);
                backdrop-filter: blur(20px);
                border: 1px solid var(--aux-border);
                border-radius: 24px;
                overflow: hidden;
                animation: modalIn 0.3s ease;
            }
            
            .modal-content.modal-lg {
                max-width: 600px;
            }
            
            @keyframes modalIn {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 25px;
                border-bottom: 1px solid var(--aux-border);
            }
            
            .modal-header.warning {
                background: rgba(249, 115, 22, 0.1);
            }
            
            .modal-header h2 {
                margin: 0;
                font-size: 18px;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: var(--aux-text-dim);
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            }
            
            .upc-badge {
                display: inline-block;
                margin-top: 8px;
                padding: 4px 10px;
                background: var(--aux-primary);
                color: white;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .modal-body {
                padding: 25px;
            }
            
            .modal-info-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 25px;
            }
            
            .info-item {
                text-align: center;
                padding: 15px;
                background: var(--aux-border);
                border-radius: 12px;
            }
            
            .info-item small {
                display: block;
                font-size: 11px;
                color: var(--aux-text-dim);
                margin-bottom: 5px;
            }
            
            .info-item strong {
                font-size: 24px;
            }
            
            .input-group {
                margin-bottom: 20px;
            }
            
            .input-group label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--aux-text-dim);
            }
            
            .input-group input,
            .input-group textarea,
            .input-group select {
                width: 100%;
                padding: 15px;
                background: var(--aux-border);
                border: 1px solid transparent;
                border-radius: 12px;
                color: var(--aux-text);
                font-size: 16px;
                font-family: inherit;
                outline: none;
                transition: all 0.3s;
            }
            
            .input-group input:focus,
            .input-group textarea:focus,
            .input-group select:focus {
                border-color: var(--aux-primary);
                background: transparent;
            }
            
            .input-group input[type="number"] {
                font-size: 24px;
                text-align: center;
                font-weight: 700;
            }
            
            .input-hint {
                font-size: 11px;
                color: var(--aux-text-dim);
                margin-top: 5px;
            }
            
            .foto-upload {
                position: relative;
            }
            
            .foto-upload input[type="file"] {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
            }
            
            .foto-placeholder {
                padding: 30px;
                border: 2px dashed var(--aux-border);
                border-radius: 12px;
                text-align: center;
                color: var(--aux-text-dim);
            }
            
            .foto-placeholder i {
                font-size: 32px;
                margin-bottom: 10px;
            }
            
            .foto-placeholder img {
                max-width: 100%;
                border-radius: 8px;
            }
            
            .modal-footer {
                display: flex;
                gap: 15px;
                padding: 20px 25px;
                border-top: 1px solid var(--aux-border);
            }
            
            .modal-footer button {
                flex: 1;
                padding: 15px;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.3s;
            }
            
            .btn-secondary {
                background: transparent;
                border: 1px solid var(--aux-border);
                color: var(--aux-text);
            }
            
            .btn-primary {
                background: var(--aux-primary);
                border: none;
                color: white;
            }
            
            .btn-warning {
                background: #f97316;
                border: none;
                color: white;
            }
            
            .btn-primary:hover,
            .btn-warning:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }
            
            /* ═══════ CONSULTA ═══════ */
            .consulta-search {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .consulta-search input {
                flex: 1;
                padding: 15px;
                background: var(--aux-border);
                border: 1px solid transparent;
                border-radius: 12px;
                color: var(--aux-text);
                font-size: 16px;
                outline: none;
            }
            
            .consulta-search button {
                padding: 15px 20px;
                border-radius: 12px;
                border: none;
                cursor: pointer;
            }
            
            .consulta-resultado {
                min-height: 200px;
            }
            
            .empty-consulta,
            .consulta-empty {
                text-align: center;
                padding: 50px;
                color: var(--aux-text-dim);
            }
            
            .empty-consulta i,
            .consulta-empty i {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            .consulta-card {
                background: var(--aux-border);
                border-radius: 16px;
                padding: 20px;
            }
            
            .consulta-header {
                margin-bottom: 20px;
            }
            
            .consulta-header h3 {
                margin: 0 0 5px 0;
            }
            
            .consulta-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .consulta-item {
                padding: 15px;
                background: var(--aux-card);
                border-radius: 10px;
            }
            
            .consulta-item small {
                display: block;
                font-size: 11px;
                color: var(--aux-text-dim);
                margin-bottom: 5px;
            }
            
            .consulta-ubicaciones h4 {
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .ubicaciones-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .ub-tag {
                padding: 5px 12px;
                background: var(--aux-primary);
                color: white;
                border-radius: 20px;
                font-size: 12px;
            }
            
            /* ═══════ ANIMATIONS ═══════ */
            .flash-update {
                animation: flash 1s ease;
            }
            
            @keyframes flash {
                0% { background: rgba(37, 99, 235, 0.3); }
                100% { background: transparent; }
            }
            
            /* ═══════ RESPONSIVE ═══════ */
            @media (max-width: 1024px) {
                .metrics-grid {
                    grid-template-columns: repeat(2, 1fr);
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
                
                .header-right {
                    justify-content: space-between;
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr 1fr;
                }
                
                .table-header {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .search-input {
                    width: 100%;
                }
            }
            
            @media (max-width: 480px) {
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
                
                .modal-info-row {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer al window
window.AuxiliarView = AuxiliarView;