// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Scanner v2.0
// Escaneo real con QuaggaJS + búsqueda de productos
// ═══════════════════════════════════════════════════════════════

const ScannerController = {
    isScanning: false,
    scanCallback: null,

    // ═══ BUSCAR PRODUCTO EN TODA LA BD ═══
    async consultarProducto(codigo) {
        if (!codigo) return { encontrado: false, producto: null, ubicaciones: [] };
        codigo = codigo.trim().toUpperCase();

        try {
            let producto = await window.db.productos.where('upc').equals(codigo).first();
            if (!producto) producto = await window.db.productos.where('sku').equals(codigo).first();
            if (!producto) {
                const todos = await window.db.productos.toArray();
                producto = todos.find(p =>
                    p.upc?.includes(codigo) || p.sku?.toUpperCase().includes(codigo) ||
                    p.descripcion?.toUpperCase().includes(codigo)
                );
            }

            if (producto) {
                // Solo ubicaciones canónicas: las guardadas al momento de aprobado_jefe
                const ubicaciones = await window.LocationModel.getUbicacionesUnicas(producto.upc);
                return { encontrado: true, producto, ubicaciones };
            }
            return { encontrado: false, producto: null, ubicaciones: [] };
        } catch (err) {
            console.error('Error consultando producto:', err);
            return { encontrado: false, producto: null, ubicaciones: [] };
        }
    },

    // ═══ BUSCAR MÚLTIPLES RESULTADOS ═══
    async buscarProductos(termino) {
        if (!termino) return [];
        termino = termino.trim().toUpperCase();
        try {
            const todos = await window.db.productos.toArray();
            return todos.filter(p =>
                p.upc?.includes(termino) || p.sku?.toUpperCase().includes(termino) ||
                p.descripcion?.toUpperCase().includes(termino)
            ).slice(0, 50);
        } catch (e) { return []; }
    },

    // ═══ INICIAR QUAGGA EN UN CONTENEDOR ═══
    // continuous=true: no detiene la cámara tras cada detección (modo consulta)
    startQuagga(containerId, onDetected, continuous = false) {
        if (typeof Quagga === 'undefined') {
            console.warn('QuaggaJS no disponible');
            return false;
        }

        // Limpiar cualquier instancia previa antes de reinicializar
        try { Quagga.stop(); Quagga.offDetected(); } catch(e) {}

        Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: document.getElementById(containerId),
                constraints: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            },
            decoder: {
                readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader']
            },
            locate: true,
            frequency: 10
        }, (err) => {
            if (err) {
                console.warn('Quagga init error:', err);
                return;
            }
            Quagga.start();
            this.isScanning = true;
        });

        // Detección con filtro de confianza
        let lastCode = null;
        let codeCount = 0;

        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            if (!code) return;

            // Requiere 3 lecturas consecutivas del mismo código para confirmar
            if (code === lastCode) {
                codeCount++;
                if (codeCount >= 3) {
                    if (!continuous) this.stopQuagga();
                    onDetected(code);
                    lastCode = null;
                    codeCount = 0;
                }
            } else {
                lastCode = code;
                codeCount = 1;
            }
        });

        return true;
    },

    // ═══ DETENER QUAGGA ═══
    stopQuagga() {
        try {
            if (typeof Quagga !== 'undefined' && this.isScanning) {
                Quagga.stop();
                Quagga.offDetected();
            }
        } catch (e) {}
        this.isScanning = false;
    },

    // ═══ ESCANEO PARA CÍCLICO (auxiliar) ═══
    abrirScannerCiclico(productos, onFound, onNotFound) {
        const overlay = document.createElement('div');
        overlay.id = 'scanner-ciclico-overlay';
        overlay.className = 'scanner-overlay-ciclico';
        overlay.innerHTML = `
            <div class="scanner-ciclico-panel glass">
                <div class="scanner-ciclico-header">
                    <span><i class="fas fa-camera"></i> Escanear producto</span>
                    <button onclick="ScannerController.cerrarScannerCiclico()"><i class="fas fa-times"></i></button>
                </div>
                <div id="scanner-ciclico-video" class="scanner-ciclico-video">
                    <div class="scanner-scan-line"></div>
                </div>
                <div class="scanner-ciclico-status" id="scanner-ciclico-status">
                    <i class="fas fa-barcode"></i> Apunta al codigo de barras
                </div>
                <div class="scanner-ciclico-manual">
                    <input type="text" id="scanner-ciclico-input" placeholder="O ingresa el codigo manualmente...">
                    <button onclick="ScannerController.buscarManualCiclico()"><i class="fas fa-search"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._ciclicoProductos = productos;
        this._ciclicoOnFound = onFound;
        this._ciclicoOnNotFound = onNotFound;

        document.getElementById('scanner-ciclico-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.buscarManualCiclico();
        });

        const started = this.startQuagga('scanner-ciclico-video', (code) => {
            this._procesarCodigoCiclico(code);
        });

        if (!started) {
            document.getElementById('scanner-ciclico-video').innerHTML =
                '<div class="scanner-no-camera"><i class="fas fa-camera-slash"></i><p>Camara no disponible</p></div>';
        }
    },

    buscarManualCiclico() {
        const code = document.getElementById('scanner-ciclico-input')?.value.trim();
        if (code) this._procesarCodigoCiclico(code);
    },

    _procesarCodigoCiclico(code) {
        const prods = this._ciclicoProductos || [];
        const idx = prods.findIndex(p => p.upc === code);

        if (idx !== -1) {
            // Capturar referencia ANTES de cerrar (cerrarScannerCiclico la anula)
            const onFound = this._ciclicoOnFound;
            this._mostrarCapturaExito(code, () => {
                this.cerrarScannerCiclico();
                if (onFound) onFound(idx, code);
            });
        } else {
            const statusEl = document.getElementById('scanner-ciclico-status');
            if (statusEl) {
                statusEl.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> UPC <code>${code}</code> no pertenece a este ciclico`;
                statusEl.className = 'scanner-ciclico-status not-found';
            }
            if (this._ciclicoOnNotFound) this._ciclicoOnNotFound(code);
        }
    },

    _mostrarCapturaExito(code, callback) {
        // Flash verde en el contenedor de video
        const videoEl = document.getElementById('scanner-ciclico-video');
        if (videoEl) {
            videoEl.classList.add('capture-flash');

            // Badge de confirmación en el centro del video
            const badge = document.createElement('div');
            badge.className = 'scanner-capture-badge';
            badge.innerHTML = `<i class="fas fa-check-circle"></i> ${code}`;
            videoEl.appendChild(badge);

            // Limpiar flash tras animación
            setTimeout(() => videoEl.classList.remove('capture-flash'), 560);
        }

        // Actualizar texto de estado
        const statusEl = document.getElementById('scanner-ciclico-status');
        if (statusEl) {
            statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success);"></i> Capturado: <code>${code}</code>`;
        }

        // Ejecutar callback tras la duración de la animación
        setTimeout(() => { if (callback) callback(); }, 650);
    },

    cerrarScannerCiclico() {
        this.stopQuagga();
        const overlay = document.getElementById('scanner-ciclico-overlay');
        if (overlay) overlay.remove();
        this._ciclicoProductos = null;
        this._ciclicoOnFound = null;
        this._ciclicoOnNotFound = null;
    },

    // ═══ ESCANEO PARA MODO CONSULTA ═══
    iniciarScannerConsulta(containerId, onDetected) {
        const started = this.startQuagga(containerId, onDetected, true);
        if (!started) {
            const el = document.getElementById(containerId);
            if (el) el.innerHTML = '<div class="scanner-no-camera"><i class="fas fa-camera-slash"></i><p>Camara no disponible</p></div>';
        }
        return started;
    },

    detenerScannerConsulta() {
        this.stopQuagga();
    },

    // ═══ RENDER DETALLE DE PRODUCTO (compartido por las 3 vistas) ═══
    renderConsultaDetalle(p, ubicaciones = []) {
        return `
        <div class="consulta-detalle-v2">
            <div class="consulta-detalle-titulo">Resultado de consulta</div>
            <div class="consulta-detalle-grid">
                <div class="consulta-field">
                    <span class="consulta-field-label">UPC</span>
                    <span class="consulta-field-value mono">${p.upc || '—'}</span>
                </div>
                <div class="consulta-field">
                    <span class="consulta-field-label">SKU / NetSuite</span>
                    <span class="consulta-field-value">${p.sku || '—'}</span>
                </div>
                <div class="consulta-field">
                    <span class="consulta-field-label">Precio</span>
                    <span class="consulta-field-value consulta-precio">₡${(p.precio || 0).toLocaleString()}</span>
                </div>
                <div class="consulta-field">
                    <span class="consulta-field-label">Cantidad en sistema</span>
                    <span class="consulta-field-value">${p.existencia || 0} <small>uds</small></span>
                </div>
                <div class="consulta-field wide">
                    <span class="consulta-field-label">Descripción</span>
                    <span class="consulta-field-value">${p.descripcion || '—'}</span>
                </div>
                <div class="consulta-field">
                    <span class="consulta-field-label">Estatus</span>
                    <span class="consulta-field-value">${p.estatus || '—'}</span>
                </div>
                <div class="consulta-field">
                    <span class="consulta-field-label">Tipo</span>
                    <span class="consulta-field-value">${p.tipo || '—'}</span>
                </div>
            </div>
            ${ubicaciones.length ? `
            <div class="consulta-ubicaciones">
                <span class="consulta-field-label">Ubicaciones registradas</span>
                <div class="consulta-ubic-tags">
                    ${ubicaciones.map(u => `<span class="consulta-ubic-tag">${u}</span>`).join('')}
                </div>
            </div>` : ''}
        </div>`;
    }
};

window.ScannerController = ScannerController;
console.log('✓ ScannerController v2.0 cargado');
