// ═══════════════════════════════════════════════════════════════
// ZENGO - AuxiliarView v1.5
// Solo lógica + HTML — CSS en archivos separados
// Hallazgos almacenados en tarea.productos[] con es_hallazgo=true
// ═══════════════════════════════════════════════════════════════

const AuxiliarView = {

    tareaActual: null,
    productoSeleccionado: null,

    // ═══ RENDER ═══
    render(container) {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        container.innerHTML = `
        <div class="dashboard-wrapper aux-theme">
            <aside id="sidebar" class="sidebar glass">
                <div class="sidebar-header">
                    <div class="logo">ZEN<span>GO</span></div>
                    <span class="badge-aux">AUX</span>
                    <button class="toggle-btn" onclick="AuxiliarView.toggleSidebar()"><i class="fas fa-bars"></i></button>
                </div>
                <div class="user-card">
                    <div class="user-avatar aux"><i class="fas fa-user"></i></div>
                    <div class="user-info">
                        <span class="user-name">${session.name || 'Auxiliar'}</span>
                        <span class="user-role">AUXILIAR</span>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-section="ciclico" onclick="AuxiliarView.showSection('ciclico')"><i class="fas fa-clipboard-list"></i><span>Mi Ciclico</span></a>
                    <a href="#" class="nav-item" data-section="progreso" onclick="AuxiliarView.showSection('progreso')"><i class="fas fa-chart-pie"></i><span>Progreso</span></a>
                    <div class="nav-spacer"></div>
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()"><i class="fas fa-power-off"></i><span>Cerrar Sesion</span></a>
                </nav>
            </aside>

            <main class="main-content">
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="AuxiliarView.toggleSidebar()"><i class="fas fa-bars"></i></button>
                        <div><h1>Conteo <span class="accent-blue">Ciclico</span></h1><p class="text-dim" id="tarea-info">Cargando...</p></div>
                    </div>
                    <div class="header-stats"><div class="sync-badge online"><div class="dot"></div><span>ONLINE</span></div></div>
                </header>

                <div id="section-ciclico" class="section-content">
                    <div id="sin-tarea" style="display:none;"><div class="empty-state-big"><i class="fas fa-inbox"></i><h2>Sin tarea asignada</h2><p>Espera a que el Jefe te asigne una categoría</p></div></div>
                    <div id="con-tarea" style="display:none;">
                        <section class="search-section glass">
                            <div class="search-bar"><input type="text" id="buscar-producto" placeholder="Buscar por UPC, SKU o descripcion..." onkeyup="AuxiliarView.filtrarProductos(this.value)"><button class="btn-scan" onclick="AuxiliarView.abrirScanner()"><i class="fas fa-barcode"></i></button></div>
                            <button class="btn-hallazgo" onclick="AuxiliarView.reportarHallazgo()"><i class="fas fa-plus"></i> Reportar Hallazgo</button>
                        </section>
                        <section class="progress-section glass">
                            <div class="progress-info"><span id="contados-label">0</span> / <span id="total-label">0</span> productos
                                <span id="hallazgos-pendientes-label" class="hallazgos-warn" style="display:none;"><i class="fas fa-exclamation-triangle"></i> <span id="hallazgos-pend-count">0</span> hallazgo(s) pendiente(s)</span>
                            </div>
                            <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
                        </section>
                        <section class="tabla-section glass">
                            <div class="tabla-scroll"><table class="tabla-ciclico" id="tabla-productos"><thead><tr>
                                <th class="col-num">#</th><th class="col-upc">UPC</th><th class="col-sku">SKU</th>
                                <th class="col-desc">DESCRIPCIÓN</th><th class="col-precio">PRECIO</th>
                                <th class="col-existencia">EXISTENCIA</th><th class="col-cantidad">CANTIDAD</th>
                                <th class="col-ubicacion">UBICACIÓN</th><th class="col-total">TOTAL</th>
                                <th class="col-diferencia">DIFERENCIA</th><th class="col-acciones">+</th>
                            </tr></thead><tbody id="productos-tbody"></tbody></table></div>
                        </section>
                        <div id="finalizar-section" style="display:none;"><button class="btn-finalizar" onclick="AuxiliarView.confirmarFinalizacion()"><i class="fas fa-check-circle"></i> Finalizar Ciclico</button></div>
                    </div>
                </div>

                <div id="section-progreso" class="section-content" style="display:none;">
                    <section class="progreso-detalle glass"><h3><i class="fas fa-chart-pie"></i> Resumen</h3>
                        <div class="stats-grid">
                            <div class="stat-card"><span class="stat-value" id="stat-total">0</span><span class="stat-label">Total</span></div>
                            <div class="stat-card"><span class="stat-value" id="stat-contados">0</span><span class="stat-label">Contados</span></div>
                            <div class="stat-card"><span class="stat-value" id="stat-pendientes">0</span><span class="stat-label">Pendientes</span></div>
                            <div class="stat-card"><span class="stat-value" id="stat-hallazgos">0</span><span class="stat-label">Hallazgos</span></div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
        ${this.renderModals()}`;
        this.cargarTarea();
    },

    // ═══ SYNC ═══
    async syncTareaFromSupabase(auxiliarId) {
        try {
            if (!navigator.onLine || !window.supabaseClient) return null;
            const { data, error } = await window.supabaseClient
                .from('tareas').select('*')
                .eq('auxiliar_id', auxiliarId)
                .in('estado', ['pendiente', 'en_progreso'])
                .limit(1);
            if (error || !data || !data.length) return null;
            await window.db.tareas.put(data[0]);
            return data[0];
        } catch (e) { return null; }
    },

    async syncTareaToSupabase() {
        try {
            if (!navigator.onLine || !window.supabaseClient || !this.tareaActual) return false;
            const { error } = await window.supabaseClient.from('tareas')
                .update({
                    productos: this.tareaActual.productos,
                    productos_contados: this.tareaActual.productos_contados,
                    estado: this.tareaActual.estado,
                    fecha_finalizacion: this.tareaActual.fecha_finalizacion || null
                })
                .eq('id', this.tareaActual.id);
            return !error;
        } catch (e) { return false; }
    },

    // ═══ CARGAR TAREA ═══
    async cargarTarea() {
        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        let miTarea = await this.syncTareaFromSupabase(session.id);
        if (!miTarea) {
            const tareas = await window.db.tareas.toArray();
            miTarea = tareas.find(t => t.auxiliar_id === session.id && (t.estado === 'pendiente' || t.estado === 'en_progreso'));
        }
        if (!miTarea) {
            document.getElementById('sin-tarea').style.display = 'block';
            document.getElementById('con-tarea').style.display = 'none';
            document.getElementById('tarea-info').textContent = 'Sin tarea asignada';
            return;
        }
        this.tareaActual = miTarea;
        if (miTarea.estado === 'pendiente') {
            this.tareaActual.estado = 'en_progreso';
            await window.db.tareas.update(miTarea.id, { estado: 'en_progreso' });
            await this.syncTareaToSupabase();
        }
        document.getElementById('sin-tarea').style.display = 'none';
        document.getElementById('con-tarea').style.display = 'block';
        document.getElementById('tarea-info').textContent = `Categoría: ${miTarea.categoria}`;
        this.renderProductos();
        this.actualizarProgreso();
    },

    // ═══ TABLA EXCEL ═══
    renderProductos(filtro = '') {
        if (!this.tareaActual) return;
        const tbody = document.getElementById('productos-tbody');
        let productos = this.tareaActual.productos || [];

        if (filtro) {
            const f = filtro.toUpperCase();
            productos = productos.filter(p =>
                (p.upc || '').includes(f) || (p.sku || '').toUpperCase().includes(f) ||
                (p.descripcion || '').toUpperCase().includes(f)
            );
        }

        // Ordenar: normales → aprobados → pendientes → rechazados
        const normales = productos.filter(p => !p.es_hallazgo);
        const aprobados = productos.filter(p => p.es_hallazgo && p.hallazgo_estado === 'aprobado');
        const pendientes = productos.filter(p => p.es_hallazgo && p.hallazgo_estado === 'pendiente');
        const rechazados = productos.filter(p => p.es_hallazgo && p.hallazgo_estado === 'rechazado');
        const ordenados = [...normales, ...aprobados, ...pendientes, ...rechazados];

        if (!ordenados.length) { tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">No hay productos</td></tr>'; return; }

        tbody.innerHTML = ordenados.map((p, i) => {
            const realIndex = this.tareaActual.productos.indexOf(p);
            const esH = p.es_hallazgo || false;
            const hEstado = p.hallazgo_estado || '';
            const completo = p.conteos && p.conteos.length > 0;
            const total = p.total || 0;
            const diferencia = total - (p.existencia || 0);

            // Badges
            let badges = '';
            if (esH) {
                badges += '<span class="pill-badge amarillo">HALLAZGO</span>';
                if (p.hallazgo_reportado_por) badges += `<span class="pill-badge celeste">${p.hallazgo_reportado_por}</span>`;
                if (hEstado === 'aprobado' && p.hallazgo_aprobado_por) badges += `<span class="pill-badge purpura">✓ ${p.hallazgo_aprobado_por}</span>`;
                if (hEstado === 'rechazado' && p.hallazgo_rechazado_por) badges += `<span class="pill-badge ${p.hallazgo_rechazado_color || 'purpura'}">✗ ${p.hallazgo_rechazado_por}</span>`;
            }
            if (p.modificaciones) p.modificaciones.forEach(m => { badges += `<span class="pill-badge ${m.color}">${m.nombre}</span>`; });

            // Conteos y ubicaciones
            let cantHtml = '<span class="sin-conteo">—</span>';
            let ubicHtml = '<span class="sin-conteo">—</span>';
            if (completo) {
                cantHtml = p.conteos.map((c, ci) => `<div class="conteo-inline"><span class="conteo-cant">${c.cantidad}</span><button class="btn-edit-mini" onclick="AuxiliarView.editarConteo(${realIndex},${ci})"><i class="fas fa-pen"></i></button><button class="btn-del-mini" onclick="AuxiliarView.eliminarConteo(${realIndex},${ci})"><i class="fas fa-times"></i></button></div>`).join('');
                ubicHtml = p.conteos.map(c => `<div class="ubic-inline">${c.ubicacion}</div>`).join('');
            }

            let diffClass = '';
            if (completo) { if (diferencia < 0) diffClass = 'diff-falta'; else if (diferencia > 0) diffClass = 'diff-sobra'; }

            let rowClass = '';
            if (hEstado === 'pendiente') rowClass = 'row-hallazgo-pendiente';
            else if (hEstado === 'rechazado') rowClass = 'row-hallazgo-rechazado';
            else if (esH && hEstado === 'aprobado') rowClass = 'row-hallazgo-aprobado';
            else if (completo) rowClass = 'row-completo';

            const puedeContar = !esH || hEstado === 'aprobado';
            const btnConteo = puedeContar
                ? `<button class="btn-add-conteo" onclick="AuxiliarView.abrirConteo(${realIndex})"><i class="fas fa-plus"></i></button>`
                : (hEstado === 'pendiente'
                    ? '<span class="icon-pending"><i class="fas fa-clock"></i></span>'
                    : '<span class="icon-rejected"><i class="fas fa-ban"></i></span>');

            return `<tr class="${rowClass}">
                <td class="col-num">${i + 1}</td>
                <td class="col-upc"><code>${p.upc || '—'}</code></td>
                <td class="col-sku">${p.sku || '—'}</td>
                <td class="col-desc" title="${p.descripcion || ''}">${p.descripcion || '—'} ${badges}</td>
                <td class="col-precio">${p.precio ? '₡' + p.precio.toLocaleString() : '—'}</td>
                <td class="col-existencia">${p.existencia || 0}</td>
                <td class="col-cantidad">${cantHtml}</td>
                <td class="col-ubicacion">${ubicHtml}</td>
                <td class="col-total"><strong>${total}</strong></td>
                <td class="col-diferencia ${diffClass}"><strong>${completo ? diferencia : '—'}</strong></td>
                <td class="col-acciones">${btnConteo}</td>
            </tr>`;
        }).join('');
    },

    filtrarProductos(v) { this.renderProductos(v); },

    // ═══ CONTEO ═══
    abrirConteo(index) {
        this.productoSeleccionado = index;
        const p = this.tareaActual.productos[index];
        document.getElementById('conteo-upc').textContent = p.upc || '';
        document.getElementById('conteo-desc').textContent = p.descripcion || '';
        document.getElementById('conteo-cantidad').value = '';
        document.getElementById('conteo-ubicacion').value = '';
        document.getElementById('conteo-modal').style.display = 'flex';
        document.getElementById('conteo-cantidad').focus();
    },

    async guardarConteo() {
        const cantidad = parseInt(document.getElementById('conteo-cantidad').value);
        const ubicacion = document.getElementById('conteo-ubicacion').value.trim();
        if (isNaN(cantidad) || cantidad < 0) { window.ZENGO?.toast('Cantidad inválida', 'error'); return; }
        if (!ubicacion) { window.ZENGO?.toast('Ingresa ubicación', 'error'); return; }

        const p = this.tareaActual.productos[this.productoSeleccionado];
        if (!p.conteos) p.conteos = [];
        p.conteos.push({ cantidad, ubicacion: ubicacion.toUpperCase(), timestamp: new Date().toISOString() });
        p.total = p.conteos.reduce((s, c) => s + c.cantidad, 0);
        p.diferencia = p.total - p.existencia;
        this.tareaActual.productos_contados = this.tareaActual.productos.filter(x => x.conteos && x.conteos.length > 0).length;

        await window.db.tareas.put(this.tareaActual);
        await this.syncTareaToSupabase();
        this.closeModal(); this.renderProductos(); this.actualizarProgreso();
        window.ZENGO?.toast('Conteo guardado ✓', 'success');
    },

    async editarConteo(pi, ci) {
        const p = this.tareaActual.productos[pi];
        const nv = prompt(`Editar cantidad (${p.conteos[ci].ubicacion}):`, p.conteos[ci].cantidad);
        if (nv === null) return;
        p.conteos[ci].cantidad = parseInt(nv) || 0;
        p.total = p.conteos.reduce((s, c) => s + c.cantidad, 0);
        p.diferencia = p.total - p.existencia;
        await window.db.tareas.put(this.tareaActual); await this.syncTareaToSupabase();
        this.renderProductos(); this.actualizarProgreso();
        window.ZENGO?.toast('Editado ✓', 'success');
    },

    async eliminarConteo(pi, ci) {
        if (!await window.ZENGO?.confirm('¿Eliminar conteo?', 'Confirmar')) return;
        const p = this.tareaActual.productos[pi];
        p.conteos.splice(ci, 1);
        p.total = p.conteos.reduce((s, c) => s + c.cantidad, 0);
        p.diferencia = p.total - p.existencia;
        this.tareaActual.productos_contados = this.tareaActual.productos.filter(x => x.conteos && x.conteos.length > 0).length;
        await window.db.tareas.put(this.tareaActual); await this.syncTareaToSupabase();
        this.renderProductos(); this.actualizarProgreso();
        window.ZENGO?.toast('Eliminado', 'success');
    },

    // ═══ HALLAZGOS ═══
    reportarHallazgo() {
        document.getElementById('hallazgo-upc').value = '';
        document.getElementById('hallazgo-sku').value = '';
        document.getElementById('hallazgo-desc').value = '';
        document.getElementById('hallazgo-modal').style.display = 'flex';
    },

    async guardarHallazgo() {
        const upc = document.getElementById('hallazgo-upc').value.trim();
        const desc = document.getElementById('hallazgo-desc').value.trim();
        const sku = document.getElementById('hallazgo-sku').value.trim();
        if (!upc) { window.ZENGO?.toast('Ingresa el UPC', 'error'); return; }

        const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
        this.tareaActual.productos.push({
            upc, sku: sku || '', descripcion: desc || 'Hallazgo', existencia: 0, precio: 0,
            conteos: [], total: 0, diferencia: 0,
            es_hallazgo: true, hallazgo_estado: 'pendiente',
            hallazgo_reportado_por: session.name, hallazgo_reportado_color: 'celeste',
            hallazgo_fecha: new Date().toISOString(), modificaciones: []
        });

        await window.db.tareas.put(this.tareaActual); await this.syncTareaToSupabase();
        this.closeModal(); this.renderProductos(); this.actualizarProgreso();
        window.ZENGO?.toast('Hallazgo reportado — esperando aprobación del Jefe', 'success');
    },

    // ═══ PROGRESO Y FINALIZACION ═══
    actualizarProgreso() {
        if (!this.tareaActual) return;
        const prods = this.tareaActual.productos || [];
        const contables = prods.filter(p => !p.es_hallazgo || p.hallazgo_estado === 'aprobado');
        const total = contables.length;
        const contados = contables.filter(p => p.conteos && p.conteos.length > 0).length;
        const hPend = prods.filter(p => p.es_hallazgo && p.hallazgo_estado === 'pendiente').length;
        const hTotal = prods.filter(p => p.es_hallazgo).length;
        const pct = total > 0 ? Math.round((contados / total) * 100) : 0;

        document.getElementById('contados-label').textContent = contados;
        document.getElementById('total-label').textContent = total;
        document.getElementById('progress-fill').style.width = pct + '%';

        const hw = document.getElementById('hallazgos-pendientes-label');
        if (hPend > 0) { hw.style.display = 'inline'; document.getElementById('hallazgos-pend-count').textContent = hPend; }
        else { hw.style.display = 'none'; }

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-contados').textContent = contados;
        document.getElementById('stat-pendientes').textContent = total - contados;
        document.getElementById('stat-hallazgos').textContent = hTotal;

        document.getElementById('finalizar-section').style.display =
            (contados === total && total > 0 && hPend === 0) ? 'block' : 'none';
    },

    async confirmarFinalizacion() {
        const pend = (this.tareaActual.productos || []).filter(p => p.es_hallazgo && p.hallazgo_estado === 'pendiente');
        if (pend.length > 0) {
            window.ZENGO?.toast(`${pend.length} hallazgo(s) pendiente(s). El Jefe debe aprobarlos.`, 'error', 5000);
            return;
        }
        if (!await window.ZENGO?.confirm('¿Finalizar? Una vez enviado no podrás modificar.\n\n¿Deseas agregar algún hallazgo antes?', 'Confirmar')) return;

        this.tareaActual.estado = 'finalizado_auxiliar';
        this.tareaActual.fecha_finalizacion = new Date().toISOString();
        await window.db.tareas.put(this.tareaActual);
        const synced = await this.syncTareaToSupabase();

        window.ZENGO?.toast(synced ? 'Cíclico finalizado y enviado al Jefe ✓' : 'Finalizado (pendiente sincronizar)', synced ? 'success' : 'warning');

        // Limpiar vista inmediatamente
        this.tareaActual = null;
        document.getElementById('con-tarea').style.display = 'none';
        document.getElementById('sin-tarea').style.display = 'block';
        document.getElementById('tarea-info').textContent = 'Cíclico enviado al Jefe';
        document.getElementById('finalizar-section').style.display = 'none';
    },

    // ═══ SCANNER ═══
    abrirScanner() { document.getElementById('scanner-modal').style.display = 'flex'; this.iniciarCamara(); },
    async iniciarCamara() {
        try {
            const v = document.getElementById('scanner-video');
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            v.srcObject = s; this.scannerStream = s;
        } catch (e) { window.ZENGO?.toast('No se pudo acceder a la cámara', 'error'); }
    },
    cerrarScanner() { if (this.scannerStream) this.scannerStream.getTracks().forEach(t => t.stop()); document.getElementById('scanner-modal').style.display = 'none'; },

    // ═══ UI ═══
    toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); },
    showSection(id) {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        document.getElementById(`section-${id}`).style.display = 'block';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-section="${id}"]`)?.classList.add('active');
    },
    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
        if (this.scannerStream) this.scannerStream.getTracks().forEach(t => t.stop());
    },

    renderModals() {
        return `
        <div id="conteo-modal" class="modal-overlay" style="display:none;"><div class="modal-content glass">
            <div class="modal-header"><h2><i class="fas fa-plus"></i> Agregar Conteo</h2><button class="modal-close" onclick="AuxiliarView.closeModal()"><i class="fas fa-times"></i></button></div>
            <div class="modal-body">
                <div class="conteo-producto-info"><code id="conteo-upc"></code><p id="conteo-desc"></p></div>
                <div class="form-group"><label>Cantidad</label><input type="number" id="conteo-cantidad" min="0" placeholder="0"></div>
                <div class="form-group"><label>Ubicación</label><input type="text" id="conteo-ubicacion" placeholder="Ej: BODEGA, GONDOLA"></div>
            </div>
            <div class="modal-footer"><button class="btn-secondary" onclick="AuxiliarView.closeModal()">Cancelar</button><button class="btn-primary" onclick="AuxiliarView.guardarConteo()"><i class="fas fa-save"></i> Guardar</button></div>
        </div></div>
        <div id="hallazgo-modal" class="modal-overlay" style="display:none;"><div class="modal-content glass">
            <div class="modal-header"><h2><i class="fas fa-exclamation-triangle"></i> Reportar Hallazgo</h2><button class="modal-close" onclick="AuxiliarView.closeModal()"><i class="fas fa-times"></i></button></div>
            <div class="modal-body">
                <p class="text-dim">Producto encontrado fuera de tu cíclico</p>
                <div class="form-group"><label>UPC</label><input type="text" id="hallazgo-upc" placeholder="Código UPC"></div>
                <div class="form-group"><label>SKU (opcional)</label><input type="text" id="hallazgo-sku" placeholder="Código SKU"></div>
                <div class="form-group"><label>Descripción</label><input type="text" id="hallazgo-desc" placeholder="Descripción del producto"></div>
            </div>
            <div class="modal-footer"><button class="btn-secondary" onclick="AuxiliarView.closeModal()">Cancelar</button><button class="btn-primary" onclick="AuxiliarView.guardarHallazgo()"><i class="fas fa-paper-plane"></i> Reportar</button></div>
        </div></div>
        <div id="scanner-modal" class="modal-overlay" style="display:none;"><div class="modal-content glass">
            <div class="modal-header"><h2><i class="fas fa-barcode"></i> Escanear</h2><button class="modal-close" onclick="AuxiliarView.cerrarScanner()"><i class="fas fa-times"></i></button></div>
            <div class="modal-body"><div class="scanner-container"><video id="scanner-video" autoplay playsinline></video></div><p class="text-dim text-center">Apunta al código de barras</p></div>
        </div></div>`;
    }
};

window.AuxiliarView = AuxiliarView;
console.log('✓ AuxiliarView v1.5 cargado');
