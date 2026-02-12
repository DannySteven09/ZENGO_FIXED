// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Scanner
// Maneja escaneo de códigos y búsqueda de productos
// ═══════════════════════════════════════════════════════════════

const ScannerController = {
    isScanning: false,
    currentStream: null,

    // ═══════════════════════════════════════════════════════════
    // BUSCAR PRODUCTO POR CÓDIGO
    // ═══════════════════════════════════════════════════════════
    async consultarProducto(codigo) {
        if (!codigo) {
            return { encontrado: false, producto: null, ubicaciones: [] };
        }

        codigo = codigo.trim().toUpperCase();

        try {
            // Buscar primero por UPC
            let producto = await window.db.productos.where('upc').equals(codigo).first();
            
            // Si no encuentra, buscar por SKU
            if (!producto) {
                producto = await window.db.productos.where('sku').equals(codigo).first();
            }

            // Búsqueda parcial si no encuentra exacto
            if (!producto) {
                const todos = await window.db.productos.toArray();
                producto = todos.find(p => 
                    p.upc?.includes(codigo) || 
                    p.sku?.includes(codigo) ||
                    p.descripcion?.toUpperCase().includes(codigo)
                );
            }

            if (producto) {
                // Obtener ubicaciones históricas
                const ubicaciones = await window.LocationModel.getUbicacionesUnicas(producto.upc);
                
                return {
                    encontrado: true,
                    producto: producto,
                    ubicaciones: ubicaciones
                };
            }

            return { encontrado: false, producto: null, ubicaciones: [] };

        } catch (err) {
            console.error('Error consultando producto:', err);
            return { encontrado: false, producto: null, ubicaciones: [] };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ABRIR CÁMARA PARA ESCANEO
    // ═══════════════════════════════════════════════════════════
    async openCameraScanner(callback) {
        if (this.isScanning) {
            this.closeScanner();
            return;
        }

        // Crear modal de cámara
        const modal = document.createElement('div');
        modal.id = 'camera-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content glass" style="max-width: 500px; padding: 0; overflow: hidden;">
                <div class="modal-header" style="padding: 15px 20px;">
                    <h3><i class="fas fa-camera"></i> Escanear Código</h3>
                    <button class="modal-close" onclick="ScannerController.closeScanner()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="camera-container" style="position: relative; background: #000;">
                    <video id="scanner-video" autoplay playsinline style="width: 100%; display: block;"></video>
                    <div class="scan-overlay" style="
                        position: absolute; top: 50%; left: 50%;
                        transform: translate(-50%, -50%);
                        width: 80%; height: 100px;
                        border: 2px solid var(--admin-red);
                        border-radius: 10px;
                        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
                    "></div>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.6); font-size: 14px;">
                        <i class="fas fa-info-circle"></i> Coloca el código de barras dentro del recuadro
                    </p>
                    <div style="margin-top: 15px;">
                        <input type="text" id="manual-code-input" placeholder="O ingresa el código manualmente..." 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
                                      background: rgba(255,255,255,0.05); color: white; font-size: 16px;">
                    </div>
                    <button onclick="ScannerController.submitManualCode()" class="btn-primary" style="margin-top: 10px; width: 100%;">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                </div>
            </div>
        `;

        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.9);
        `;

        document.body.appendChild(modal);

        // Guardar callback para cuando se escanee
        this.scanCallback = callback;

        // Intentar abrir cámara
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            this.currentStream = stream;
            const video = document.getElementById('scanner-video');
            video.srcObject = stream;
            this.isScanning = true;

            // Aquí iría la lógica de detección de código de barras
            // Por ahora solo mostramos la cámara

        } catch (err) {
            console.warn('No se pudo acceder a la cámara:', err);
            // Mostrar solo input manual
            const videoContainer = modal.querySelector('.camera-container');
            if (videoContainer) {
                videoContainer.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.5);">
                        <i class="fas fa-camera-slash" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Cámara no disponible</p>
                        <small>Usa el campo de texto para ingresar el código</small>
                    </div>
                `;
            }
        }

        // Enter en input manual
        document.getElementById('manual-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitManualCode();
            }
        });
    },

    // ═══════════════════════════════════════════════════════════
    // ENVIAR CÓDIGO MANUAL
    // ═══════════════════════════════════════════════════════════
    submitManualCode() {
        const input = document.getElementById('manual-code-input');
        const code = input?.value?.trim();
        
        if (code) {
            this.closeScanner();
            if (this.scanCallback) {
                this.scanCallback(code);
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // CERRAR SCANNER
    // ═══════════════════════════════════════════════════════════
    closeScanner() {
        // Detener stream de cámara
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }

        // Remover modal
        const modal = document.getElementById('camera-modal');
        if (modal) modal.remove();

        this.isScanning = false;
        this.scanCallback = null;
    },

    // ═══════════════════════════════════════════════════════════
    // PROCESAR CÓDIGO ESCANEADO
    // ═══════════════════════════════════════════════════════════
    async processScannedCode(code) {
        const result = await this.consultarProducto(code);
        return result;
    }
};

// Exponer globalmente
window.ScannerController = ScannerController;
