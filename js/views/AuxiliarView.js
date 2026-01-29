// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista Auxiliar
// Dashboard de conteo cíclico con múltiples ubicaciones
// CORREGIDO: Sin TIPO/ESTATUS, con TOTAL CONTADO, DIFERENCIA, hallazgos
// ═══════════════════════════════════════════════════════════════

import { ScannerController } from '../controllers/ScannerController.js';
import { AuthController } from '../controllers/AuthController.js';
import db from '../config/dexie-db.js';

export const AuxiliarView = {
    
    tareaActual: null,
    productos: [],
    productoActualIndex: null,

    // ═══════════════════════════════════════════════════════════
    // RENDERIZADO PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    render(container) {
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
                    <a href="#" class="nav-item active" data-section="ciclico" onclick="AuxiliarView.showSection('ciclico')">
                        <i class="fas fa-clipboard-list"></i> 
                        <span>Mi Cíclico</span>
                    </a>
                    <a href="#" class="nav-item" data-section="consulta" onclick="AuxiliarView.showConsultaModal()">
                        <i class="fas fa-search"></i> 
                        <span>Modo Consulta</span>
                    </a>
                    <div class="nav-spacer"></div>
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()">
                        <i class="fas fa-sign-out-alt"></i> 
                        <span>Cerrar Sesión</span>
                    </a>
                </nav>
            </aside>

            <!-- ═══════ CONTENIDO PRINCIPAL ═══════ -->
            <main class="main-content">
                <!-- Header -->
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="AuxiliarView.toggleSidebar()">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div class="category-info">
                            <h2 id="categoria-titulo">Cargando...</h2>
                            <div id="sync-container" class="sync-badge online">
                                <div class="dot"></div>
                                <span>ONLINE</span>
                            </div>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="timer-display glass">
                            <i class="far fa-clock"></i>
                            <span id="timeElapsed">00:00:00</span>
                        </div>
                    </div>
                </header>

                <!-- Sección Cíclico -->
                <div id="section-ciclico" class="section-content">
                    <!-- Métricas -->
                    <section class="metrics-grid">
                        <div class="metric-card glass">
                            <div class="metric-icon blue"><i class="fas fa-boxes"></i></div>
                            <div class="metric-data">
                                <span class="metric-value" id="total-lineas">0</span>
                                <span class="metric-label">Líneas Total</span>
                            </div>
                        </div>
                        <div class="metric-card glass">
                            <div class="metric-icon green"><i class="fas fa-check-circle"></i></div>
                            <div class="metric-data">
                                <span class="metric-value" id="lineas-contadas">0</span>
                                <span class="metric-label">Contadas</span>
                            </div>
                        </div>
                        <div class="metric-card glass">
                            <div class="metric-icon orange"><i class="fas fa-clock"></i></div>
                            <div class="metric-data">
                                <span class="metric-value" id="lineas-pendientes">0</span>
                                <span class="metric-label">Pendientes</span>
                            </div>
                        </div>
                        <div class="metric-card glass progress-card">
                            <div class="progress-header">
                                <span class="metric-label">AVANCE</span>
                                <span id="progress-percent" class="progress-value">0%</span>
                            </div>
                            <div class="progress-bar">
                                <div id="bar-fill" class="bar-fill" style="width: 0%"></div>
                            </div>
                        </div>
                    </section>

                    <!-- Barra de búsqueda y escáner -->
                    <section class="search-section glass">
                        <div class="search-row">
                            <div class="search-input-wrapper">
                                <i class="fas fa-search"></i>
                                <input type="text" id="search-producto" placeholder="Buscar por SKU, UPC o descripción..." 
                                       oninput="AuxiliarView.filterTable(this.value)">
                            </div>
                            <button class="btn-camera" onclick="AuxiliarView.openCameraScanner()">
                                <i class="fas fa-camera"></i>
                                <span>Escanear</span>
                            </button>
                            <button class="btn-hallazgo" onclick="AuxiliarView.reportarHallazgo()">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Hallazgo</span>
                            </button>
                        </div>
                    </section>

                    <!-- Tabla del Cíclico -->
                    <section class="table-section glass">
                        <div class="table-wrapper">
                            <table class="ciclico-table">
                                <thead>
                                    <tr>
                                        <th>SKU</th>
                                        <th>DESCRIPCIÓN</th>
                                        <th class="text-center">EXISTENCIA</th>
                                        <th class="text-center">TOTAL CONTADO</th>
                                        <th class="text-center">DIFERENCIA</th>
                                        <th>UBICACIONES</th>
                                        <th class="text-center">ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody id="ciclico-body">
                                    <tr>
                                        <td colspan="7" class="loading-state">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Cargando cíclico...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <!-- Botón Finalizar -->
                    <section class="actions-section" id="finalizar-section" style="display: none;">
                        <button class="btn-finalizar glass" id="btn-finalizar" onclick="AuxiliarView.intentarFinalizar()" disabled>
                            <i class="fas fa-flag-checkered"></i>
                            FINALIZAR CÍCLICO
                        </button>
                    </section>
                </div>
            </main>
        </div>

        <!-- ═══════ MODALES ═══════ -->
        ${this.renderModals()}
        `;

        this.injectStyles();
        this.loadTareaAsignada();
        this.initTimer();
    },

    // ═══════════════════════════════════════════════════════════
    // CARGAR TAREA ASIGNADA
    // ═══════════════════════════════════════════════════════════
    async loadTareaAsignada() {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        try {
            const tareas = await db.tareas.toArray();
            const miTarea = tareas.find(t => 
                t.auxiliar_id === session.id && 
                (t.estado === 'pendiente' || t.estado === 'en_progreso')
            );

            if (!miTarea) {
                document.getElementById('categoria-titulo').textContent = 'Sin tarea asignada';
                document.getElementById('ciclico-body').innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No tienes ningún cíclico asignado</p>
                            <small>Espera a que el Jefe te asigne una categoría</small>
                        </td>
                    </tr>
                `;
                return;
            }

            this.tareaActual = miTarea;
            this.productos = miTarea.productos || [];

            if (miTarea.estado === 'pendiente') {
                miTarea.estado = 'en_progreso';
                miTarea.hora_inicio = new Date().toISOString();
                await db.tareas.put(miTarea);
            }

            document.getElementById('categoria-titulo').textContent = miTarea.categoria || 'Cíclico';
            this.renderTabla();
            this.updateMetrics();

        } catch (err) {
            console.error('Error cargando tarea:', err);
            document.getElementById('ciclico-body').innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error al cargar el cíclico</p>
                    </td>
                </tr>
            `;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // RENDERIZAR TABLA
    // ═══════════════════════════════════════════════════════════
    renderTabla() {
        const tbody = document.getElementById('ciclico-body');
        
        if (this.productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No hay productos en este cíclico</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.productos.map((p, index) => this.renderFila(p, index)).join('');
    },

    renderFila(producto, index) {
        const existencia = producto.existencia || 0;
        const totalContado = producto.total_contado || 0;
        const diferencia = totalContado - existencia;
        const tieneConteo = producto.conteos && producto.conteos.length > 0;
        
        const ubicaciones = producto.conteos && producto.conteos.length > 0
            ? producto.conteos.map(c => `${c.ubicacion} (${c.cantidad})`).join(', ')
            : '—';

        let diffClass = 'neutral';
        if (tieneConteo) {
            diffClass = diferencia > 0 ? 'positive' : diferencia < 0 ? 'negative' : 'exact';
        }

        const esHallazgo = producto.es_hallazgo || false;
        const hallazgoAprobadoPor = producto.hallazgo_aprobado_por || null;

        return `
            <tr id="row-${index}" class="${tieneConteo ? 'row-contada' : ''} ${esHallazgo ? 'row-hallazgo' : ''}" data-index="${index}">
                <td>
                    <div class="sku-cell">
                        <code class="sku-code">${producto.sku || 'N/A'}</code>
                        <small class="upc-small">${producto.upc || ''}</small>
                    </div>
                </td>
                <td>
                    <span class="descripcion-text">${producto.descripcion || 'Sin descripción'}</span>
                    ${esHallazgo ? `<span class="hallazgo-badge">${hallazgoAprobadoPor}</span>` : ''}
                </td>
                <td class="text-center">${existencia}</td>
                <td class="text-center">
                    <span class="total-contado ${tieneConteo ? 'has-value' : ''}">${tieneConteo ? totalContado : '—'}</span>
                </td>
                <td class="text-center">
                    <span class="diferencia ${diffClass}">${tieneConteo ? (diferencia > 0 ? '+' : '') + diferencia : '—'}</span>
                </td>
                <td>
                    <span class="ubicaciones-cell">${ubicaciones}</span>
                </td>
                <td class="text-center">
                    <button class="btn-contar" onclick="AuxiliarView.abrirModalConteo(${index})">
                        <i class="fas fa-${tieneConteo ? 'edit' : 'plus'}"></i>
                        ${tieneConteo ? 'Editar' : 'Contar'}
                    </button>
                </td>
            </tr>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // MODAL DE CONTEO
    // ═══════════════════════════════════════════════════════════
    abrirModalConteo(index) {
        const producto = this.productos[index];
        if (!producto) return;

        this.productoActualIndex = index;

        document.getElementById('modal-sku').textContent = producto.sku || 'N/A';
        document.getElementById('modal-descripcion').textContent = producto.descripcion || '';
        document.getElementById('modal-upc').textContent = producto.upc || '';
        document.getElementById('modal-existencia').textContent = producto.existencia || 0;

        this.renderConteosExistentes(producto.conteos || []);

        document.getElementById('input-cantidad').value = '';
        document.getElementById('input-ubicacion').value = '';

        document.getElementById('conteo-modal').style.display = 'flex';
        setTimeout(() => document.getElementById('input-cantidad').focus(), 100);
    },

    renderConteosExistentes(conteos) {
        const container = document.getElementById('conteos-existentes');
        
        if (conteos.length === 0) {
            container.innerHTML = '<p class="no-conteos">Sin conteos registrados</p>';
            return;
        }

        const total = conteos.reduce((sum, c) => sum + (c.cantidad || 0), 0);

        container.innerHTML = `
            <div class="conteos-list">
                ${conteos.map((c, i) => `
                    <div class="conteo-item">
                        <span class="conteo-ubicacion">${c.ubicacion}</span>
                        <span class="conteo-cantidad">${c.cantidad} uds</span>
                        <button class="btn-remove-conteo" onclick="AuxiliarView.eliminarConteo(${i})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="conteos-total">
                <strong>Total: ${total} unidades</strong>
            </div>
        `;
    },

    async agregarConteo() {
        const cantidad = parseInt(document.getElementById('input-cantidad').value);
        const ubicacion = document.getElementById('input-ubicacion').value.trim().toUpperCase();

        if (isNaN(cantidad) || cantidad < 0) {
            window.ZENGO?.toast('Ingresa una cantidad válida (0 o más)', 'error');
            return;
        }

        if (!ubicacion) {
            window.ZENGO?.toast('Ingresa la ubicación', 'error');
            return;
        }

        const producto = this.productos[this.productoActualIndex];
        if (!producto.conteos) producto.conteos = [];

        producto.conteos.push({ cantidad, ubicacion, timestamp: new Date().toISOString() });

        producto.total_contado = producto.conteos.reduce((sum, c) => sum + (c.cantidad || 0), 0);
        producto.diferencia = producto.total_contado - (producto.existencia || 0);

        await this.guardarTarea();

        this.renderConteosExistentes(producto.conteos);
        this.renderTabla();
        this.updateMetrics();

        document.getElementById('input-cantidad').value = '';
        document.getElementById('input-ubicacion').value = '';
        document.getElementById('input-cantidad').focus();

        window.ZENGO?.toast(`Agregado: ${cantidad} en ${ubicacion}`, 'success');
    },

    async eliminarConteo(conteoIndex) {
        const producto = this.productos[this.productoActualIndex];
        if (!producto.conteos) return;

        producto.conteos.splice(conteoIndex, 1);

        producto.total_contado = producto.conteos.reduce((sum, c) => sum + (c.cantidad || 0), 0);
        producto.diferencia = producto.total_contado - (producto.existencia || 0);

        await this.guardarTarea();
        this.renderConteosExistentes(producto.conteos);
        this.renderTabla();
        this.updateMetrics();
    },

    cerrarModalConteo() {
        document.getElementById('conteo-modal').style.display = 'none';
    },

    // ═══════════════════════════════════════════════════════════
    // GUARDAR TAREA
    // ═══════════════════════════════════════════════════════════
    async guardarTarea() {
        if (!this.tareaActual) return;

        this.tareaActual.productos = this.productos;
        this.tareaActual.productos_contados = this.productos.filter(p => p.conteos && p.conteos.length > 0).length;

        await db.tareas.put(this.tareaActual);
    },

    // ═══════════════════════════════════════════════════════════
    // ACTUALIZAR MÉTRICAS
    // ═══════════════════════════════════════════════════════════
    updateMetrics() {
        const total = this.productos.length;
        const contadas = this.productos.filter(p => p.conteos && p.conteos.length > 0).length;
        const pendientes = total - contadas;
        const avance = total > 0 ? ((contadas / total) * 100).toFixed(1) : 0;

        document.getElementById('total-lineas').textContent = total;
        document.getElementById('lineas-contadas').textContent = contadas;
        document.getElementById('lineas-pendientes').textContent = pendientes;
        document.getElementById('progress-percent').textContent = `${avance}%`;
        document.getElementById('bar-fill').style.width = `${avance}%`;

        const finalizarSection = document.getElementById('finalizar-section');
        const btnFinalizar = document.getElementById('btn-finalizar');

        // Mostrar siempre la sección si hay productos
        if (total > 0) {
            finalizarSection.style.display = 'flex';
            // Solo habilitar si TODAS las líneas tienen al menos un conteo
            btnFinalizar.disabled = contadas !== total;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // BÚSQUEDA Y FILTRO
    // ═══════════════════════════════════════════════════════════
    filterTable(query) {
        const rows = document.querySelectorAll('#ciclico-body tr[data-index]');
        const q = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    },

    // ═══════════════════════════════════════════════════════════
    // ESCÁNER DE CÁMARA
    // ═══════════════════════════════════════════════════════════
    openCameraScanner() {
        this.mostrarPromptEscaneo();
    },

    async mostrarPromptEscaneo() {
        const codigo = await window.ZENGO?.prompt('Ingresa el código escaneado:', '', 'Escanear Producto');
        if (!codigo) return;

        const codigoLimpio = codigo.trim().toUpperCase();

        const index = this.productos.findIndex(p => 
            (p.upc && p.upc.toUpperCase() === codigoLimpio) || 
            (p.sku && p.sku.toUpperCase() === codigoLimpio)
        );

        if (index !== -1) {
            this.abrirModalConteo(index);
            
            const row = document.getElementById(`row-${index}`);
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row?.classList.add('flash-highlight');
            setTimeout(() => row?.classList.remove('flash-highlight'), 2000);
        } else {
            // Producto no encontrado en el cíclico
            const reportar = await window.ZENGO?.confirm(
                `El código "${codigoLimpio}" no está en tu cíclico.\n¿Deseas reportarlo como hallazgo?`,
                'Producto no encontrado'
            );
            
            if (reportar) {
                this.abrirModalHallazgo(codigoLimpio);
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // HALLAZGOS
    // ═══════════════════════════════════════════════════════════
    reportarHallazgo() {
        this.abrirModalHallazgo('');
    },

    abrirModalHallazgo(upc = '') {
        document.getElementById('hallazgo-upc').value = upc;
        document.getElementById('hallazgo-descripcion').value = '';
        document.getElementById('hallazgo-cantidad').value = '1';
        document.getElementById('hallazgo-ubicacion').value = '';
        
        document.getElementById('hallazgo-modal').style.display = 'flex';
        
        if (!upc) {
            setTimeout(() => document.getElementById('hallazgo-upc').focus(), 100);
        } else {
            setTimeout(() => document.getElementById('hallazgo-cantidad').focus(), 100);
        }
    },

    async enviarHallazgo() {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        
        const upc = document.getElementById('hallazgo-upc').value.trim().toUpperCase();
        const descripcion = document.getElementById('hallazgo-descripcion').value.trim();
        const cantidad = parseInt(document.getElementById('hallazgo-cantidad').value) || 1;
        const ubicacion = document.getElementById('hallazgo-ubicacion').value.trim().toUpperCase();

        if (!upc) {
            window.ZENGO?.toast('Ingresa el UPC o SKU del producto', 'error');
            return;
        }

        if (!ubicacion) {
            window.ZENGO?.toast('Ingresa la ubicación', 'error');
            return;
        }

        try {
            await db.hallazgos.add({
                upc,
                descripcion: descripcion || 'Hallazgo reportado',
                cantidad,
                ubicacion,
                auxiliar_id: session.id,
                auxiliar_nombre: session.name,
                tarea_id: this.tareaActual?.id,
                categoria: this.tareaActual?.categoria,
                estado: 'pendiente',
                timestamp: new Date().toISOString()
            });

            window.ZENGO?.toast('Hallazgo reportado. El Jefe lo revisará.', 'success');
            this.cerrarModalHallazgo();

        } catch (err) {
            console.error('Error guardando hallazgo:', err);
            window.ZENGO?.toast('Error al reportar hallazgo', 'error');
        }
    },

    cerrarModalHallazgo() {
        document.getElementById('hallazgo-modal').style.display = 'none';
    },

    // ═══════════════════════════════════════════════════════════
    // FINALIZAR CÍCLICO
    // ═══════════════════════════════════════════════════════════
    async intentarFinalizar() {
        const pendientes = this.productos.filter(p => !p.conteos || p.conteos.length === 0);
        
        if (pendientes.length > 0) {
            window.ZENGO?.toast(`Faltan ${pendientes.length} líneas por contar`, 'error');
            return;
        }

        // Preguntar si hay hallazgos pendientes
        const tieneHallazgos = await window.ZENGO?.confirm(
            '¿Tienes algún hallazgo pendiente por reportar?\n\nSi hay productos no catalogados o diferencias que reportar, hazlo ahora.',
            'Antes de finalizar'
        );

        if (tieneHallazgos) {
            this.reportarHallazgo();
            return;
        }

        // Confirmar finalización
        const confirmar = await window.ZENGO?.confirm(
            '¿Confirmas que has completado el conteo y no hay más hallazgos?\n\nEsta acción cerrará el cíclico.',
            'Finalizar Cíclico'
        );

        if (!confirmar) return;

        await this.finalizarCiclico();
    },

    async finalizarCiclico() {
        if (!this.tareaActual) return;

        try {
            this.tareaActual.estado = 'completado';
            this.tareaActual.hora_fin = new Date().toISOString();
            this.tareaActual.productos = this.productos;

            await db.tareas.put(this.tareaActual);

            window.ZENGO?.toast('¡Cíclico finalizado correctamente!', 'success');

            // Recargar vista
            setTimeout(() => {
                this.tareaActual = null;
                this.productos = [];
                this.loadTareaAsignada();
            }, 1500);

        } catch (err) {
            console.error('Error finalizando:', err);
            window.ZENGO?.toast('Error al finalizar cíclico', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // MODO CONSULTA
    // ═══════════════════════════════════════════════════════════
    showConsultaModal() {
        document.getElementById('consulta-modal').style.display = 'flex';
        document.getElementById('consulta-input').focus();
    },

    async buscarConsulta() {
        const code = document.getElementById('consulta-input').value.trim().toUpperCase();
        if (!code) return;

        try {
            let producto = await db.productos.where('upc').equals(code).first();
            if (!producto) {
                producto = await db.productos.where('sku').equals(code).first();
            }

            const container = document.getElementById('consulta-resultado');

            if (producto) {
                // En modo consulta SÍ mostramos TIPO y ESTATUS
                container.innerHTML = `
                    <div class="consulta-card">
                        <div class="consulta-header">
                            <h3>${producto.descripcion || 'Producto'}</h3>
                            <code class="upc-badge">${producto.upc}</code>
                        </div>
                        <div class="consulta-grid">
                            <div class="consulta-item"><small>SKU</small><strong>${producto.sku || 'N/A'}</strong></div>
                            <div class="consulta-item"><small>Existencia</small><strong>${producto.stock_sistema || 0}</strong></div>
                            <div class="consulta-item"><small>Precio</small><strong>₡${(producto.precio || 0).toLocaleString()}</strong></div>
                            <div class="consulta-item"><small>Categoría</small><strong>${producto.categoria_id || 'General'}</strong></div>
                            <div class="consulta-item"><small>Tipo</small><strong>${producto.tipo || '—'}</strong></div>
                            <div class="consulta-item"><small>Estatus</small><strong>${producto.estatus || '—'}</strong></div>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-consulta">
                        <i class="fas fa-search"></i>
                        <p>Producto no encontrado</p>
                    </div>
                `;
            }
        } catch (err) {
            console.error('Error en consulta:', err);
        }
    },

    cerrarConsultaModal() {
        document.getElementById('consulta-modal').style.display = 'none';
    },

    // ═══════════════════════════════════════════════════════════
    // UTILIDADES
    // ═══════════════════════════════════════════════════════════
    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    },

    showSection(sectionId) {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        document.getElementById(`section-${sectionId}`).style.display = 'block';
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    },

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
    // MODALES
    // ═══════════════════════════════════════════════════════════
    renderModals() {
        return `
        <!-- Modal de Conteo -->
        <div id="conteo-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass">
                <div class="modal-header">
                    <div>
                        <h2 id="modal-sku">SKU</h2>
                        <p id="modal-descripcion" class="modal-subtitle"></p>
                        <code id="modal-upc" class="upc-badge"></code>
                    </div>
                    <button class="modal-close" onclick="AuxiliarView.cerrarModalConteo()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="modal-info-row">
                        <div class="info-item">
                            <small>Existencia Sistema</small>
                            <strong id="modal-existencia">0</strong>
                        </div>
                    </div>
                    
                    <div class="conteos-section">
                        <h4>Conteos Registrados</h4>
                        <div id="conteos-existentes">
                            <p class="no-conteos">Sin conteos registrados</p>
                        </div>
                    </div>
                    
                    <div class="nuevo-conteo-section">
                        <h4>Agregar Conteo</h4>
                        <div class="input-row">
                            <div class="input-group">
                                <label>Cantidad</label>
                                <input type="number" id="input-cantidad" placeholder="0" min="0" inputmode="numeric">
                            </div>
                            <div class="input-group">
                                <label>Ubicación</label>
                                <input type="text" id="input-ubicacion" placeholder="Ej: A-12-3">
                            </div>
                            <button class="btn-add-conteo" onclick="AuxiliarView.agregarConteo()">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <small class="input-hint">Si el producto está en varias ubicaciones, agrega cada una</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AuxiliarView.cerrarModalConteo()">
                        CERRAR
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de Hallazgo -->
        <div id="hallazgo-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content glass">
                <div class="modal-header warning">
                    <div>
                        <h2><i class="fas fa-exclamation-triangle"></i> Reportar Hallazgo</h2>
                        <p class="modal-subtitle">Producto no catalogado o inesperado</p>
                    </div>
                    <button class="modal-close" onclick="AuxiliarView.cerrarModalHallazgo()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label>UPC / SKU del producto</label>
                        <input type="text" id="hallazgo-upc" placeholder="Escanea o ingresa el código">
                    </div>
                    <div class="input-group">
                        <label>Descripción (opcional)</label>
                        <input type="text" id="hallazgo-descripcion" placeholder="Describe el producto">
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>Cantidad encontrada</label>
                            <input type="number" id="hallazgo-cantidad" value="1" min="1">
                        </div>
                        <div class="input-group">
                            <label>Ubicación</label>
                            <input type="text" id="hallazgo-ubicacion" placeholder="Ej: A-12-3">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AuxiliarView.cerrarModalHallazgo()">
                        CANCELAR
                    </button>
                    <button class="btn-warning" onclick="AuxiliarView.enviarHallazgo()">
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
                    <button class="modal-close" onclick="AuxiliarView.cerrarConsultaModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="consulta-search">
                        <input type="text" id="consulta-input" placeholder="Escanea o ingresa UPC/SKU...">
                        <button class="btn-primary" onclick="AuxiliarView.buscarConsulta()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <div id="consulta-resultado" class="consulta-resultado">
                        <div class="empty-consulta">
                            <i class="fas fa-barcode"></i>
                            <p>Escanea un producto para ver información</p>
                            <small>Aquí verás TIPO y ESTATUS del producto</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS
    // ═══════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('aux-styles-v2')) return;
        const style = document.createElement('style');
        style.id = 'aux-styles-v2';
        style.innerHTML = `
            :root {
                --aux-primary: #2563EB;
                --aux-bg: #0a0a0a;
                --aux-card: rgba(255, 255, 255, 0.03);
                --aux-border: rgba(255, 255, 255, 0.08);
                --aux-text: #ffffff;
                --aux-text-dim: rgba(255, 255, 255, 0.5);
            }
            
            .aux-theme { background: var(--aux-bg); color: var(--aux-text); }
            
            .dashboard-wrapper { display: flex; min-height: 100vh; }
            
            /* Sidebar */
            .sidebar { width: 260px; height: 100vh; position: fixed; left: 0; top: 0; background: var(--aux-card); backdrop-filter: blur(20px); border-right: 1px solid var(--aux-border); z-index: 100; display: flex; flex-direction: column; }
            .sidebar.collapsed { width: 80px; }
            .sidebar.collapsed .user-card, .sidebar.collapsed .nav-item span { display: none; }
            .sidebar-header { padding: 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--aux-border); }
            .logo { font-size: 24px; font-weight: 900; }
            .logo span { color: var(--aux-primary); }
            .toggle-btn { margin-left: auto; background: none; border: none; color: var(--aux-text-dim); font-size: 18px; cursor: pointer; }
            .user-card { padding: 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--aux-border); }
            .user-avatar { width: 40px; height: 40px; border-radius: 12px; background: var(--aux-primary); display: flex; align-items: center; justify-content: center; color: white; }
            .user-info { display: flex; flex-direction: column; }
            .user-name { font-weight: 600; font-size: 14px; }
            .user-role { font-size: 10px; color: var(--aux-primary); letter-spacing: 1px; }
            .sidebar-nav { padding: 15px 10px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
            .nav-item { padding: 12px 15px; display: flex; align-items: center; gap: 12px; color: var(--aux-text-dim); text-decoration: none; border-radius: 12px; font-size: 14px; }
            .nav-item:hover { background: var(--aux-border); color: var(--aux-text); }
            .nav-item.active { background: rgba(37, 99, 235, 0.15); color: var(--aux-primary); }
            .nav-item i { width: 20px; text-align: center; }
            .nav-spacer { flex: 1; }
            .nav-item.logout { color: #ef4444; }
            
            /* Main */
            .main-content { flex: 1; margin-left: 260px; padding: 25px; display: flex; flex-direction: column; gap: 20px; }
            .sidebar.collapsed ~ .main-content { margin-left: 80px; }
            
            .top-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-radius: 16px; background: var(--aux-card); border: 1px solid var(--aux-border); }
            .header-left { display: flex; align-items: center; gap: 15px; }
            .mobile-menu { display: none; background: none; border: none; color: var(--aux-text); font-size: 20px; cursor: pointer; }
            .category-info h2 { font-size: 18px; margin: 0; }
            .sync-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; background: rgba(34, 197, 94, 0.15); color: #22c55e; margin-top: 5px; }
            .sync-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
            .timer-display { padding: 10px 20px; border-radius: 12px; background: var(--aux-card); border: 1px solid var(--aux-border); display: flex; align-items: center; gap: 10px; font-family: monospace; }
            
            /* Metrics */
            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .metric-card { padding: 20px; border-radius: 16px; background: var(--aux-card); border: 1px solid var(--aux-border); display: flex; align-items: center; gap: 15px; }
            .metric-card.progress-card { flex-direction: column; align-items: stretch; }
            .metric-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
            .metric-icon.blue { background: rgba(37, 99, 235, 0.15); color: #3b82f6; }
            .metric-icon.green { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .metric-icon.orange { background: rgba(249, 115, 22, 0.15); color: #f97316; }
            .metric-value { font-size: 28px; font-weight: 800; display: block; }
            .metric-label { font-size: 12px; color: var(--aux-text-dim); }
            .progress-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .progress-value { font-size: 18px; font-weight: 700; color: var(--aux-primary); }
            .progress-bar { height: 10px; background: var(--aux-border); border-radius: 5px; }
            .bar-fill { height: 100%; background: var(--aux-primary); border-radius: 5px; transition: width 0.3s; }
            
            /* Search */
            .search-section { padding: 15px 20px; border-radius: 16px; background: var(--aux-card); border: 1px solid var(--aux-border); }
            .search-row { display: flex; gap: 10px; align-items: center; }
            .search-input-wrapper { flex: 1; position: relative; }
            .search-input-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--aux-text-dim); }
            .search-input-wrapper input { width: 100%; padding: 12px 15px 12px 45px; background: var(--aux-border); border: 1px solid transparent; border-radius: 10px; color: var(--aux-text); font-size: 14px; outline: none; }
            .search-input-wrapper input:focus { border-color: var(--aux-primary); }
            .btn-camera, .btn-hallazgo { padding: 12px 20px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; }
            .btn-camera { background: var(--aux-primary); color: white; }
            .btn-hallazgo { background: #f97316; color: white; }
            
            /* Table */
            .table-section { border-radius: 16px; background: var(--aux-card); border: 1px solid var(--aux-border); overflow: hidden; }
            .table-wrapper { overflow-x: auto; }
            .ciclico-table { width: 100%; border-collapse: collapse; min-width: 800px; }
            .ciclico-table th { text-align: left; padding: 15px; font-size: 11px; color: var(--aux-text-dim); background: var(--aux-border); font-weight: 600; }
            .ciclico-table td { padding: 15px; border-bottom: 1px solid var(--aux-border); }
            .ciclico-table tr:hover { background: rgba(255,255,255,0.02); }
            .ciclico-table tr.row-contada { background: rgba(34, 197, 94, 0.05); }
            .ciclico-table tr.row-hallazgo { background: rgba(124, 58, 237, 0.08); }
            .text-center { text-align: center; }
            
            .sku-cell { display: flex; flex-direction: column; }
            .sku-code { font-weight: 600; background: var(--aux-border); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
            .upc-small { font-size: 10px; color: var(--aux-text-dim); margin-top: 3px; }
            .descripcion-text { font-size: 13px; }
            .hallazgo-badge { display: inline-block; margin-left: 8px; padding: 2px 8px; background: #7C3AED; color: white; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .total-contado { font-weight: 600; }
            .total-contado.has-value { color: var(--aux-primary); }
            .diferencia { font-weight: 700; }
            .diferencia.positive { color: #22c55e; }
            .diferencia.negative { color: #ef4444; }
            .diferencia.exact { color: #22c55e; }
            .diferencia.neutral { color: var(--aux-text-dim); }
            .ubicaciones-cell { font-size: 12px; color: var(--aux-text-dim); }
            .btn-contar { padding: 8px 15px; background: var(--aux-primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }
            .btn-contar:hover { opacity: 0.9; }
            
            .flash-highlight { animation: flashHighlight 2s ease; }
            @keyframes flashHighlight { 0%, 100% { background: transparent; } 50% { background: rgba(37, 99, 235, 0.3); } }
            
            /* Actions */
            .actions-section { display: flex; justify-content: center; padding: 20px 0; }
            .btn-finalizar { padding: 18px 50px; background: linear-gradient(135deg, #22c55e, #16a34a); border: none; border-radius: 14px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 12px; }
            .btn-finalizar:disabled { opacity: 0.5; cursor: not-allowed; }
            .btn-finalizar:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3); }
            
            /* Modals */
            .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .modal-content { width: 100%; max-width: 500px; background: var(--aux-card); backdrop-filter: blur(20px); border: 1px solid var(--aux-border); border-radius: 20px; }
            .modal-content.modal-lg { max-width: 600px; }
            .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 25px; border-bottom: 1px solid var(--aux-border); }
            .modal-header.warning { background: rgba(249, 115, 22, 0.1); }
            .modal-header h2 { margin: 0; font-size: 18px; }
            .modal-subtitle { margin: 5px 0 0; font-size: 13px; color: var(--aux-text-dim); }
            .modal-close { background: none; border: none; color: var(--aux-text-dim); font-size: 20px; cursor: pointer; }
            .upc-badge { display: inline-block; margin-top: 8px; padding: 4px 10px; background: var(--aux-primary); color: white; border-radius: 6px; font-size: 11px; }
            .modal-body { padding: 25px; }
            .modal-footer { display: flex; gap: 15px; padding: 20px 25px; border-top: 1px solid var(--aux-border); }
            
            .modal-info-row { display: flex; gap: 15px; margin-bottom: 20px; }
            .info-item { flex: 1; text-align: center; padding: 15px; background: var(--aux-border); border-radius: 12px; }
            .info-item small { display: block; font-size: 11px; color: var(--aux-text-dim); margin-bottom: 5px; }
            .info-item strong { font-size: 24px; }
            
            .conteos-section, .nuevo-conteo-section { margin-bottom: 20px; }
            .conteos-section h4, .nuevo-conteo-section h4 { font-size: 13px; color: var(--aux-text-dim); margin: 0 0 10px; }
            .no-conteos { color: var(--aux-text-dim); font-size: 13px; font-style: italic; }
            .conteos-list { display: flex; flex-direction: column; gap: 8px; }
            .conteo-item { display: flex; align-items: center; gap: 10px; padding: 10px 15px; background: var(--aux-border); border-radius: 8px; }
            .conteo-ubicacion { flex: 1; font-weight: 600; }
            .conteo-cantidad { color: var(--aux-primary); font-weight: 600; }
            .btn-remove-conteo { background: none; border: none; color: #ef4444; cursor: pointer; padding: 5px; }
            .conteos-total { margin-top: 10px; text-align: right; color: var(--aux-primary); }
            
            .input-row { display: flex; gap: 10px; align-items: flex-end; }
            .input-group { flex: 1; }
            .input-group label { display: block; font-size: 12px; color: var(--aux-text-dim); margin-bottom: 6px; }
            .input-group input { width: 100%; padding: 12px 15px; background: var(--aux-border); border: 1px solid transparent; border-radius: 10px; color: var(--aux-text); font-size: 15px; outline: none; }
            .input-group input:focus { border-color: var(--aux-primary); }
            .input-hint { font-size: 11px; color: var(--aux-text-dim); margin-top: 8px; display: block; }
            .btn-add-conteo { padding: 12px 15px; background: #22c55e; color: white; border: none; border-radius: 10px; cursor: pointer; }
            
            .btn-primary { background: var(--aux-primary); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; flex: 1; }
            .btn-secondary { background: var(--aux-border); color: var(--aux-text); border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; flex: 1; }
            .btn-warning { background: #f97316; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
            
            /* Consulta */
            .consulta-search { display: flex; gap: 10px; margin-bottom: 20px; }
            .consulta-search input { flex: 1; padding: 15px; background: var(--aux-border); border: 1px solid transparent; border-radius: 12px; color: var(--aux-text); font-size: 15px; outline: none; }
            .consulta-search input:focus { border-color: var(--aux-primary); }
            .consulta-resultado { min-height: 150px; }
            .consulta-card { background: var(--aux-border); border-radius: 16px; padding: 20px; }
            .consulta-header { margin-bottom: 15px; }
            .consulta-header h3 { margin: 0 0 5px; }
            .consulta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .consulta-item { padding: 12px; background: var(--aux-card); border-radius: 8px; }
            .consulta-item small { display: block; font-size: 10px; color: var(--aux-text-dim); margin-bottom: 3px; }
            .empty-consulta { text-align: center; padding: 40px; color: var(--aux-text-dim); }
            .empty-consulta i { font-size: 40px; margin-bottom: 15px; }
            
            .empty-state, .loading-state { text-align: center; padding: 40px; color: var(--aux-text-dim); }
            .empty-state i, .loading-state i { font-size: 40px; margin-bottom: 15px; }
            
            /* Responsive */
            @media (max-width: 1024px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
            @media (max-width: 768px) {
                .sidebar { transform: translateX(-100%); }
                .sidebar.collapsed { transform: translateX(0); width: 260px; }
                .main-content { margin-left: 0; }
                .mobile-menu { display: block; }
                .metrics-grid { grid-template-columns: 1fr 1fr; }
                .search-row { flex-wrap: wrap; }
                .search-input-wrapper { width: 100%; }
                .btn-camera span, .btn-hallazgo span { display: none; }
            }
        `;
        document.head.appendChild(style);
    }
};

window.AuxiliarView = AuxiliarView;
