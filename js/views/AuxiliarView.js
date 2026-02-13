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
                    <a href="#" class="nav-item" onclick="AuxiliarView.showConsultaModal()"><i class="fas fa-search"></i><span>Modo Consulta</span></a>
                    <div class="nav-spacer"></div>
                    <a href="#" class="nav-item theme-toggle" onclick="AuxiliarView.toggleTheme()"><i class="fas fa-moon"></i><span>Modo Oscuro</span></a>
                    <a href="#" class="nav-item logout" onclick="AuthController.logout()"><i class="fas fa-power-off"></i><span>Cerrar Sesion</span></a>
                </nav>
            </aside>

            <main class="main-content">
                <header class="top-header glass">
                    <div class="header-left">
                        <button class="mobile-menu" onclick="AuxiliarView.toggleSidebar()"><i class="fas fa-bars"></i></button>
                        <div><h1>Conteo <span class="accent-blue">Ciclico</span></h1><p class="text-dim" id="tarea-info">Cargando...</p></div>
                    </div>
                    <div class="header-stats">
                        <div class="cronometro-badge"><i class="fas fa-stopwatch"></i><span id="cronometro" class="cronometro-time">00:00:00</span></div>
                        <div class="sync-badge online"><div class="dot"></div><span>ONLINE</span></div>
                    </div>
                </header>

                <div id="section-ciclico" class="section-content">
                    <div id="sin-tarea" style="display:none;"><div class="empty-state-big"><i class="fas fa-inbox"></i><h2>Sin tarea asignada</h2><p>Espera a que el Jefe te asigne una categoría</p></div></div>
                    <div id="con-tarea" style="display:none;">
                        <section class="search-section glass">
                            <div class="search-bar"><input type="text" id="buscar-producto" placeholder="Buscar por UPC, SKU o descripcion..." onkeyup="AuxiliarView.filtrarProductos(this.value)"><button class="btn-scan" onclick="AuxiliarView.abrirScanner()"><i class="fas fa-camera"></i></button></div>
                            <button class="btn-hallazgo" onclick="AuxiliarView.reportarHallazgo()"><i class="fas fa-plus"></i> Reportar Hallazgo</button>
                        </section>
                        <section class="kpi-grid">
                            <div class="kpi-card glass">
                                <div class="kpi-header"><span class="kpi-label">Progreso</span><i class="fas fa-clipboard-check kpi-icon blue"></i></div>
                                <div class="kpi-body">
                                    <span class="kpi-categoria" id="kpi-categoria">—</span>
                                    <div class="kpi-progress-detail"><span id="contados-label">0</span> / <span id="total-label">0</span> productos · <span id="kpi-pct">0</span>%</div>
                                    <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
                                    <span id="hallazgos-pendientes-label" class="hallazgos-warn" style="display:none;"><i class="fas fa-exclamation-triangle"></i> <span id="hallazgos-pend-count">0</span> hallazgo(s) pendiente(s)</span>
                                </div>
                            </div>
                            <div class="kpi-card glass">
                                <div class="kpi-header"><span class="kpi-label">Precision</span><i class="fas fa-bullseye kpi-icon green"></i></div>
                                <div class="kpi-body">
                                    <div class="kpi-precision-row"><span class="kpi-precision-label">Absoluta</span><span class="kpi-precision-value" id="kpi-precision-abs">—</span></div>
                                    <div class="kpi-precision-row"><span class="kpi-precision-label">Neta</span><span class="kpi-precision-value" id="kpi-precision-net">—</span></div>
                                </div>
                            </div>
                            <div class="kpi-card glass">
                                <div class="kpi-header"><span class="kpi-label">Diferencias</span><i class="fas fa-exchange-alt kpi-icon orange"></i></div>
                                <div class="kpi-body kpi-diff-body">
                                    <div class="kpi-diff"><span class="kpi-diff-value text-success" id="kpi-sobrantes">+0</span><span class="kpi-diff-label">Sobrantes</span></div>
                                    <div class="kpi-diff-divider"></div>
                                    <div class="kpi-diff"><span class="kpi-diff-value text-error" id="kpi-faltantes">-0</span><span class="kpi-diff-label">Faltantes</span></div>
                                </div>
                            </div>
                            <div class="kpi-card glass">
                                <div class="kpi-header"><span class="kpi-label">Mi Ranking</span><i class="fas fa-trophy kpi-icon purple"></i></div>
                                <div class="kpi-body kpi-ranking-body">
                                    <span class="kpi-ranking-pos" id="kpi-ranking-pos">—</span>
                                    <span class="kpi-ranking-score" id="kpi-ranking-score">Score: —</span>
                                </div>
                            </div>
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

            const remota = data[0];
            const local = await window.db.tareas.get(remota.id);

            if (!local) {
                await window.db.tareas.put(remota);
                return remota;
            }

            const localContados = local.productos_contados || 0;
            const remotaContados = remota.productos_contados || 0;
            const localHallazgos = (local.productos || []).filter(p => p.es_hallazgo).length;
            const remotaHallazgos = (remota.productos || []).filter(p => p.es_hallazgo).length;
            const remotaResueltos = (remota.productos || []).filter(p => p.es_hallazgo && p.hallazgo_estado !== 'pendiente').length;
            const localResueltos = (local.productos || []).filter(p => p.es_hallazgo && p.hallazgo_estado !== 'pendiente').length;

            if (remotaContados >= localContados && remotaResueltos >= localResueltos) {
                await window.db.tareas.put(remota);
                return remota;
            }

            // Local tiene más progreso → mantener local, pero aplicar decisiones del jefe
            if (remotaResueltos > localResueltos) {
                for (const rp of (remota.productos || [])) {
                    if (rp.es_hallazgo && rp.hallazgo_estado !== 'pendiente') {
                        const li = local.productos.findIndex(p => p.upc === rp.upc && p.es_hallazgo);
                        if (li !== -1) {
                            local.productos[li].hallazgo_estado = rp.hallazgo_estado;
                            local.productos[li].hallazgo_aprobado_por = rp.hallazgo_aprobado_por;
                            local.productos[li].hallazgo_rechazado_por = rp.hallazgo_rechazado_por;
                        }
                    }
                }
                await window.db.tareas.put(local);
            }
            return local;
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
        this.cargarRanking();
        // Si ya tiene cronómetro iniciado, restaurar
        if (miTarea.cronometro_inicio) this.iniciarCronometro();
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
            if (completo) { if (diferencia < 0) diffClass = 'diff-falta'; else if (diferencia > 0) diffClass = 'diff-sobra'; else diffClass = 'diff-cero'; }

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
        const ubicUpper = ubicacion.toUpperCase();
        const existente = p.conteos.findIndex(c => c.ubicacion === ubicUpper);
        if (existente !== -1) {
            if (!await window.ZENGO?.confirm(`Ya existe un conteo en ${ubicUpper} con cantidad ${p.conteos[existente].cantidad}. ¿Reemplazar?`, 'Duplicado detectado')) return;
            p.conteos[existente].cantidad = cantidad;
            p.conteos[existente].timestamp = new Date().toISOString();
        } else {
            p.conteos.push({ cantidad, ubicacion: ubicUpper, timestamp: new Date().toISOString() });
        }
        p.total = p.conteos.reduce((s, c) => s + c.cantidad, 0);
        p.diferencia = p.total - p.existencia;
        this.tareaActual.productos_contados = this.tareaActual.productos.filter(x => x.conteos && x.conteos.length > 0).length;

        // Iniciar cronómetro en primer conteo
        if (!this.cronometroInicio) this.iniciarCronometro();

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
    cronometroInterval: null,
    cronometroInicio: null,

    iniciarCronometro() {
        if (this.cronometroInterval) return;
        if (!this.tareaActual) return;
        // Restaurar inicio guardado o marcar ahora
        if (this.tareaActual.cronometro_inicio) {
            this.cronometroInicio = new Date(this.tareaActual.cronometro_inicio).getTime();
        } else {
            this.cronometroInicio = Date.now();
            this.tareaActual.cronometro_inicio = new Date().toISOString();
            window.db.tareas.put(this.tareaActual);
        }
        this.cronometroInterval = setInterval(() => this.actualizarCronometro(), 1000);
        this.actualizarCronometro();
    },

    actualizarCronometro() {
        if (!this.cronometroInicio) return;
        const elapsed = Math.floor((Date.now() - this.cronometroInicio) / 1000);
        const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        const el = document.getElementById('cronometro');
        if (el) el.textContent = `${h}:${m}:${s}`;
    },

    detenerCronometro() {
        if (this.cronometroInterval) { clearInterval(this.cronometroInterval); this.cronometroInterval = null; }
        this.cronometroInicio = null;
    },

    calcularPrecision() {
        if (!this.tareaActual) return { absoluta: 0, neta: 0, score: 0 };
        const prods = this.tareaActual.productos || [];
        const contados = prods.filter(p => p.conteos && p.conteos.length > 0 && (!p.es_hallazgo || p.hallazgo_estado === 'aprobado'));
        if (!contados.length) return { absoluta: 0, neta: 0, score: 0 };

        let sumTeorico = 0, sumAbsError = 0, sumNetError = 0;
        contados.forEach(p => {
            const teorico = p.existencia || 0;
            const fisico = p.total || 0;
            sumTeorico += teorico;
            sumAbsError += Math.abs(fisico - teorico);
            sumNetError += (fisico - teorico);
        });

        const absoluta = sumTeorico > 0 ? Math.max(0, (1 - sumAbsError / sumTeorico) * 100) : 100;
        const neta = sumTeorico > 0 ? Math.max(0, (1 - Math.abs(sumNetError) / sumTeorico) * 100) : 100;
        const score = absoluta * 0.6 + neta * 0.4;
        return { absoluta: Math.round(absoluta * 10) / 10, neta: Math.round(neta * 10) / 10, score: Math.round(score * 10) / 10 };
    },

    actualizarProgreso() {
        if (!this.tareaActual) return;
        const prods = this.tareaActual.productos || [];
        const contables = prods.filter(p => !p.es_hallazgo || p.hallazgo_estado === 'aprobado');
        const total = contables.length;
        const contados = contables.filter(p => p.conteos && p.conteos.length > 0).length;
        const hPend = prods.filter(p => p.es_hallazgo && p.hallazgo_estado === 'pendiente').length;
        const pct = total > 0 ? Math.round((contados / total) * 100) : 0;

        // KPI Progreso
        document.getElementById('contados-label').textContent = contados;
        document.getElementById('total-label').textContent = total;
        document.getElementById('kpi-pct').textContent = pct;
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('kpi-categoria').textContent = this.tareaActual.categoria || '—';

        // Hallazgos pendientes
        const hw = document.getElementById('hallazgos-pendientes-label');
        if (hPend > 0) { hw.style.display = 'inline'; document.getElementById('hallazgos-pend-count').textContent = hPend; }
        else { hw.style.display = 'none'; }

        // KPI Precisión
        const prec = this.calcularPrecision();
        document.getElementById('kpi-precision-abs').textContent = contados > 0 ? prec.absoluta + '%' : '—';
        document.getElementById('kpi-precision-net').textContent = contados > 0 ? prec.neta + '%' : '—';

        // KPI Diferencias (sobrantes/faltantes)
        let sobrantes = 0, faltantes = 0;
        contables.forEach(p => {
            if (p.conteos && p.conteos.length > 0) {
                const dif = (p.total || 0) - (p.existencia || 0);
                if (dif > 0) sobrantes += dif;
                else if (dif < 0) faltantes += Math.abs(dif);
            }
        });
        document.getElementById('kpi-sobrantes').textContent = '+' + sobrantes;
        document.getElementById('kpi-faltantes').textContent = '-' + faltantes;

        // Finalizar
        document.getElementById('finalizar-section').style.display =
            (contados === total && total > 0 && hPend === 0) ? 'block' : 'none';
    },

    async actualizarRankingUsuario(prec) {
        try {
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
            const usuario = await window.db.usuarios.get(session.id);
            if (!usuario) return;

            const hist = usuario.precision_historica || { absoluta_acum: 0, neta_acum: 0, score: 0 };
            const ciclos = (usuario.ciclicos_completados || 0) + 1;

            // Promedio acumulado
            const absAcum = ((hist.absoluta_acum * (ciclos - 1)) + prec.absoluta) / ciclos;
            const netAcum = ((hist.neta_acum * (ciclos - 1)) + prec.neta) / ciclos;
            const scoreAcum = Math.round((absAcum * 0.6 + netAcum * 0.4) * 10) / 10;

            const nuevaHist = {
                absoluta_acum: Math.round(absAcum * 10) / 10,
                neta_acum: Math.round(netAcum * 10) / 10,
                score: scoreAcum
            };

            // Guardar en Dexie
            await window.db.usuarios.update(session.id, {
                precision_historica: nuevaHist,
                ciclicos_completados: ciclos
            });

            // Guardar en Supabase
            try {
                if (navigator.onLine && window.supabaseClient) {
                    await window.supabaseClient.from('profiles').update({
                        precision_historica: nuevaHist,
                        ciclicos_completados: ciclos
                    }).eq('id', session.id);
                } else {
                    await window.SyncManager?.addToQueue('profiles', 'update', {
                        id: session.id,
                        changes: { precision_historica: nuevaHist, ciclicos_completados: ciclos }
                    });
                }
            } catch (e) { console.warn('Sync ranking falló:', e); }
        } catch (e) { console.warn('Error actualizando ranking:', e); }
    },

    async cargarRanking() {
        try {
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
            const auxiliares = await window.AuthModel?.getAuxiliares() || [];
            const conScore = auxiliares.filter(a => a.precision_historica && a.ciclicos_completados > 0)
                .sort((a, b) => (b.precision_historica?.score || 0) - (a.precision_historica?.score || 0));
            const miPos = conScore.findIndex(a => a.id === session.id);
            const posEl = document.getElementById('kpi-ranking-pos');
            const scoreEl = document.getElementById('kpi-ranking-score');
            if (miPos !== -1) {
                posEl.textContent = '#' + (miPos + 1);
                scoreEl.textContent = 'Score: ' + (conScore[miPos].precision_historica?.score || 0) + '%';
            } else {
                posEl.textContent = '—';
                scoreEl.textContent = 'Sin datos';
            }
        } catch (e) {
            document.getElementById('kpi-ranking-pos').textContent = '—';
            document.getElementById('kpi-ranking-score').textContent = 'Sin datos';
        }
    },

    async confirmarFinalizacion() {
        const pend = (this.tareaActual.productos || []).filter(p => p.es_hallazgo && p.hallazgo_estado === 'pendiente');
        if (pend.length > 0) {
            window.ZENGO?.toast(`${pend.length} hallazgo(s) pendiente(s). El Jefe debe aprobarlos.`, 'error', 5000);
            return;
        }
        if (!await window.ZENGO?.confirm('¿Finalizar? Una vez enviado no podrás modificar.\n\n¿Deseas agregar algún hallazgo antes?', 'Confirmar')) return;

        this.detenerCronometro();
        this.tareaActual.estado = 'finalizado_auxiliar';
        this.tareaActual.fecha_finalizacion = new Date().toISOString();

        // Calcular precisión del cíclico
        const prec = this.calcularPrecision();
        this.tareaActual.precision_absoluta = prec.absoluta;
        this.tareaActual.precision_neta = prec.neta;
        this.tareaActual.precision_score = prec.score;

        await window.db.tareas.put(this.tareaActual);
        const synced = await this.syncTareaToSupabase();

        // Actualizar ranking del auxiliar
        await this.actualizarRankingUsuario(prec);

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
    toggleTheme() { document.body.classList.toggle('light-mode'); },
    showSection(id) {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        document.getElementById(`section-${id}`).style.display = 'block';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-section="${id}"]`)?.classList.add('active');
    },
    showConsultaModal() { document.getElementById('aux-consulta-modal').style.display = 'flex'; },

    async buscarProductoConsulta() {
        const t = document.getElementById('aux-consulta-input').value.trim();
        if (!t) return;
        const r = await window.InventoryModel.buscarProducto(t);
        document.getElementById('aux-consulta-resultado').innerHTML = r.length
            ? `<div class="consulta-card"><h4>${r[0].descripcion}</h4><div class="consulta-grid"><div><small>UPC</small><code>${r[0].upc}</code></div><div><small>SKU</small><strong>${r[0].sku}</strong></div><div><small>Existencia</small><strong>${r[0].existencia}</strong></div><div><small>Categoria</small><strong>${r[0].categoria}</strong></div></div></div>`
            : '<div class="empty-state"><p>No encontrado</p></div>';
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
        <div id="aux-consulta-modal" class="modal-overlay" style="display:none;"><div class="modal-content glass">
            <div class="modal-header"><h2><i class="fas fa-search"></i> Consulta</h2><button class="modal-close" onclick="AuxiliarView.closeModal()"><i class="fas fa-times"></i></button></div>
            <div class="modal-body"><div class="search-bar"><input type="text" id="aux-consulta-input" placeholder="UPC, SKU o descripcion..."><button class="btn-primary" onclick="AuxiliarView.buscarProductoConsulta()"><i class="fas fa-search"></i></button></div><div id="aux-consulta-resultado"></div></div>
        </div></div>
        <div id="scanner-modal" class="modal-overlay" style="display:none;"><div class="modal-content glass">
            <div class="modal-header"><h2><i class="fas fa-barcode"></i> Escanear</h2><button class="modal-close" onclick="AuxiliarView.cerrarScanner()"><i class="fas fa-times"></i></button></div>
            <div class="modal-body"><div class="scanner-container"><video id="scanner-video" autoplay playsinline></video></div><p class="text-dim text-center">Apunta al código de barras</p></div>
        </div></div>`;
    }
};

window.AuxiliarView = AuxiliarView;
console.log('✓ AuxiliarView v1.5 cargado');
