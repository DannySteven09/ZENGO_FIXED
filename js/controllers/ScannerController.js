// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Escáner
// Soporta: Lector Láser USB + Cámara (html5-qrcode)
// ═══════════════════════════════════════════════════════════════

import db from '../config/dexie-db.js';
import supabase from '../config/supabase.js';
import { AuxiliarView } from '../views/AuxiliarView.js';
import { SyncManager } from './SyncManager.js';

export const ScannerController = {
    currentProduct: null,
    scanBuffer: "",
    bufferTimeout: null,
    startTime: null,
    activeCiclico: [],
    tareaActual: null,
    html5QrCode: null,
    isCameraActive: false,
    lastScan: null,
    DEBOUNCE_MS: 500, // Evitar escaneos duplicados

    // ═══════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════
    init(dataAsignada, tarea = null) {
        this.activeCiclico = dataAsignada || [];
        this.tareaActual = tarea;
        this.startTime = new Date();
        
        // Escuchar lector láser USB
        this.initLaserScanner();
        
        // Inyectar estilos del escáner
        this.injectStyles();
        
        console.log('✓ ScannerController inicializado');
        console.log(`  - Productos asignados: ${this.activeCiclico.length}`);
    },

    // ═══════════════════════════════════════════════════════════
    // LECTOR LÁSER USB
    // ═══════════════════════════════════════════════════════════
    initLaserScanner() {
        window.addEventListener('keydown', (e) => {
            // Ignorar si está en un input (excepto el de ubicación en modal)
            if (e.target.tagName === 'INPUT' && !e.target.classList.contains('allow-scan')) {
                return;
            }

            // Enter = fin de código
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.scanBuffer.length >= 6) {
                    this.processScan(this.scanBuffer.trim());
                }
                this.scanBuffer = "";
                clearTimeout(this.bufferTimeout);
            } else if (e.key.length === 1) {
                // Acumular caracteres
                this.scanBuffer += e.key;
                
                // Limpiar buffer si pasan 100ms sin teclas (anti-ruido)
                clearTimeout(this.bufferTimeout);
                this.bufferTimeout = setTimeout(() => {
                    this.scanBuffer = "";
                }, 100);
            }
        });
    },

    // ═══════════════════════════════════════════════════════════
    // CÁMARA (html5-qrcode)
    // ═══════════════════════════════════════════════════════════
    async openCameraScanner() {
        // Verificar si la librería está disponible
        if (typeof Html5Qrcode === 'undefined') {
            window.ZENGO?.toast('Cargando escáner...', 'info');
            await this.loadHtml5QrCodeLibrary();
        }

        // Crear modal de cámara
        this.renderCameraModal();

        try {
            this.html5QrCode = new Html5Qrcode("camera-preview");
            
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Cámara trasera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.777
                },
                (decodedText) => this.onCameraScan(decodedText),
                (errorMessage) => {} // Ignorar errores de no-detección
            );

            this.isCameraActive = true;
            console.log('✓ Cámara iniciada');
        } catch (err) {
            console.error('Error iniciando cámara:', err);
            window.ZENGO?.toast('No se pudo acceder a la cámara', 'error');
            this.closeCameraScanner();
        }
    },

    async loadHtml5QrCodeLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof Html5Qrcode !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    onCameraScan(code) {
        // Debounce para evitar duplicados
        const now = Date.now();
        if (this.lastScan && this.lastScan.code === code && (now - this.lastScan.time) < this.DEBOUNCE_MS) {
            return;
        }
        this.lastScan = { code, time: now };

        // Vibrar si está disponible
        if (navigator.vibrate) navigator.vibrate(100);

        // Procesar
        this.processScan(code);
        
        // Cerrar cámara después de escanear
        this.closeCameraScanner();
    },

    async closeCameraScanner() {
        if (this.html5QrCode && this.isCameraActive) {
            try {
                await this.html5QrCode.stop();
            } catch (err) {
                console.warn('Error deteniendo cámara:', err);
            }
            this.isCameraActive = false;
        }

        // Remover modal
        const modal = document.getElementById('camera-scanner-modal');
        if (modal) modal.remove();
    },

    renderCameraModal() {
        // Remover modal anterior si existe
        document.getElementById('camera-scanner-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'camera-scanner-modal';
        modal.innerHTML = `
            <div class="camera-overlay" onclick="ScannerController.closeCameraScanner()"></div>
            <div class="camera-container glass">
                <div class="camera-header">
                    <h3><i class="fas fa-camera"></i> Escanear Código</h3>
                    <button class="close-camera" onclick="ScannerController.closeCameraScanner()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="camera-preview"></div>
                <div class="camera-hint">
                    <i class="fas fa-barcode"></i>
                    Apunta al código de barras
                </div>
                <div class="camera-actions">
                    <button class="btn-manual" onclick="ScannerController.showManualInput()">
                        <i class="fas fa-keyboard"></i> Ingresar manual
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    showManualInput() {
        this.closeCameraScanner();
        
        const modal = document.createElement('div');
        modal.id = 'manual-input-modal';
        modal.innerHTML = `
            <div class="camera-overlay" onclick="this.parentElement.remove()"></div>
            <div class="manual-container glass">
                <h3><i class="fas fa-keyboard"></i> Ingreso Manual</h3>
                <input type="text" id="manual-upc" placeholder="Ingresa el UPC o SKU" 
                       class="manual-input" autofocus maxlength="20">
                <div class="manual-actions">
                    <button class="btn-cancel" onclick="this.closest('#manual-input-modal').remove()">
                        Cancelar
                    </button>
                    <button class="btn-confirm" onclick="ScannerController.processManualInput()">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Enter para confirmar
        document.getElementById('manual-upc').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.processManualInput();
            }
        });
    },

    processManualInput() {
        const input = document.getElementById('manual-upc');
        const code = input?.value?.trim();
        
        if (code && code.length >= 3) {
            document.getElementById('manual-input-modal')?.remove();
            this.processScan(code);
        } else {
            window.ZENGO?.toast('Ingresa un código válido', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // PROCESAMIENTO DE ESCANEO
    // ═══════════════════════════════════════════════════════════
    async processScan(code) {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;

        console.log(`🔍 Escaneado: ${cleanCode}`);

        // Buscar en cíclico asignado (por UPC o SKU)
        const product = this.activeCiclico.find(p => 
            p.upc === cleanCode || 
            p.sku === cleanCode ||
            p.upc?.includes(cleanCode) ||
            p.sku?.includes(cleanCode)
        );

        if (product) {
            this.currentProduct = product;
            this.playSound('success');
            AuxiliarView.renderConteoModal(product);
        } else {
            // Es un HALLAZGO (no está en la lista)
            this.playSound('warning');
            this.handleHallazgo(cleanCode);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // GUARDAR CONTEO
    // ═══════════════════════════════════════════════════════════
    async saveConteo(cantidad, ubicacion) {
        if (!this.currentProduct) {
            window.ZENGO?.toast('No hay producto seleccionado', 'error');
            return;
        }

        try {
            const cantNum = parseInt(cantidad) || 0;
            const ubicacionClean = ubicacion?.trim()?.toUpperCase() || 'SIN-UBICACION';
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');

            // Actualizar en lista local (suma para multi-ubicación)
            const index = this.activeCiclico.findIndex(p => 
                p.upc === this.currentProduct.upc || p.sku === this.currentProduct.sku
            );
            
            if (index !== -1) {
                this.activeCiclico[index].conteo = (this.activeCiclico[index].conteo || 0) + cantNum;
                this.activeCiclico[index].ultima_ubicacion = ubicacionClean;
            }

            // Guardar en Dexie
            await db.conteos.add({
                tarea_id: this.tareaActual?.id || null,
                producto_sku: this.currentProduct.sku,
                upc: this.currentProduct.upc,
                cantidad_contada: cantNum,
                ubicacion: ubicacionClean,
                auxiliar_id: session.id,
                auxiliar_nombre: session.name,
                timestamp: new Date().toISOString(),
                sync_status: 'pending'
            });

            // Actualizar histórico de ubicaciones
            await db.actualizarUbicacion(this.currentProduct.upc, ubicacionClean);

            // Actualizar vista
            AuxiliarView.updateProductRow(this.activeCiclico[index]);
            this.updateMetrics();
            
            // Feedback
            this.playSound('success');
            window.ZENGO?.toast(`${cantNum} unidades registradas`, 'success', 1500);

            // Limpiar y cerrar
            this.currentProduct = null;
            AuxiliarView.closeModal();

            // Intentar sincronizar si hay conexión
            if (navigator.onLine) {
                SyncManager.syncPendientes();
            }

        } catch (error) {
            console.error('Error guardando conteo:', error);
            window.ZENGO?.toast('Error al guardar', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // HALLAZGOS
    // ═══════════════════════════════════════════════════════════
    async handleHallazgo(upc) {
        const confirmed = await window.ZENGO?.confirm(
            `El código <strong>${upc}</strong> no está en este cíclico.<br>¿Registrar como HALLAZGO?`,
            '⚠️ Producto no encontrado'
        );

        if (confirmed) {
            AuxiliarView.renderHallazgoModal(upc);
        }
    },

    async saveHallazgo(data) {
        try {
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');

            await db.hallazgos.add({
                upc: data.upc,
                tipo: data.tipo || 'OTRO',
                descripcion: data.descripcion || '',
                cantidad: parseInt(data.cantidad) || 1,
                ubicacion: data.ubicacion?.toUpperCase() || '',
                foto_base64: data.foto || null,
                auxiliar_id: session.id,
                auxiliar_nombre: session.name,
                timestamp: new Date().toISOString(),
                sync_status: 'pending'
            });

            window.ZENGO?.toast('Hallazgo registrado', 'success');
            AuxiliarView.closeModal();

            if (navigator.onLine) {
                SyncManager.syncPendientes();
            }

        } catch (error) {
            console.error('Error guardando hallazgo:', error);
            window.ZENGO?.toast('Error al guardar hallazgo', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // MODO CONSULTA
    // ═══════════════════════════════════════════════════════════
    async consultarProducto(code) {
        const cleanCode = code.trim().toUpperCase();
        
        // Buscar en Dexie primero
        let producto = await db.productos.where('upc').equals(cleanCode).first();
        
        if (!producto) {
            producto = await db.productos.where('sku').equals(cleanCode).first();
        }

        // Si no está local, buscar en Supabase
        if (!producto && navigator.onLine) {
            const { data } = await supabase
                .from('productos')
                .select('*')
                .or(`upc.eq.${cleanCode},sku.eq.${cleanCode}`)
                .single();
            producto = data;
        }

        // Obtener histórico de ubicaciones
        const ubicaciones = await db.getUbicaciones(cleanCode);

        return {
            producto,
            ubicaciones,
            encontrado: !!producto
        };
    },

    // ═══════════════════════════════════════════════════════════
    // MÉTRICAS
    // ═══════════════════════════════════════════════════════════
    updateMetrics() {
        const totales = this.activeCiclico.length;
        if (totales === 0) return;

        const contados = this.activeCiclico.filter(p => (p.conteo || 0) > 0).length;
        const porcentajeAvance = ((contados / totales) * 100).toFixed(1);
        
        // Precisión: SKUs donde conteo === stock_sistema
        let skusPerfectos = 0;
        this.activeCiclico.forEach(p => {
            if ((p.conteo || 0) === (p.stock_sistema || 0)) {
                skusPerfectos++;
            }
        });
        
        const precisionAbsoluta = ((skusPerfectos / totales) * 100).toFixed(1);

        // Actualizar vista
        AuxiliarView.updateHeaderMetrics?.({
            avance: porcentajeAvance,
            precision: precisionAbsoluta,
            contados,
            totales
        });
    },

    getMetrics() {
        const totales = this.activeCiclico.length;
        const contados = this.activeCiclico.filter(p => (p.conteo || 0) > 0).length;
        
        let diferencias = 0;
        let mermaUnidades = 0;
        let sobraUnidades = 0;

        this.activeCiclico.forEach(p => {
            const diff = (p.conteo || 0) - (p.stock_sistema || 0);
            if (diff !== 0) diferencias++;
            if (diff < 0) mermaUnidades += Math.abs(diff);
            if (diff > 0) sobraUnidades += diff;
        });

        return {
            totales,
            contados,
            pendientes: totales - contados,
            avance: totales > 0 ? ((contados / totales) * 100).toFixed(1) : 0,
            diferencias,
            mermaUnidades,
            sobraUnidades,
            duracion: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
        };
    },

    // ═══════════════════════════════════════════════════════════
    // FINALIZAR CÍCLICO
    // ═══════════════════════════════════════════════════════════
    async finalizarCiclico() {
        const metrics = this.getMetrics();
        
        const confirmed = await window.ZENGO?.confirm(
            `<strong>Resumen del conteo:</strong><br>
            • Productos contados: ${metrics.contados}/${metrics.totales}<br>
            • Diferencias encontradas: ${metrics.diferencias}<br>
            • Duración: ${Math.floor(metrics.duracion / 60)} min<br><br>
            ¿Finalizar y enviar a auditoría?`,
            'Finalizar Cíclico'
        );

        if (!confirmed) return;

        try {
            const session = JSON.parse(localStorage.getItem('zengo_session') || '{}');
            const endTime = new Date();

            const reporte = {
                tarea_id: this.tareaActual?.id,
                auxiliar_id: session.id,
                auxiliar_nombre: session.name,
                categoria: this.tareaActual?.categoria || 'Sin categoría',
                fecha: endTime.toISOString().split('T')[0],
                hora_inicio: this.startTime?.toISOString(),
                hora_fin: endTime.toISOString(),
                duracion_segundos: metrics.duracion,
                total_productos: metrics.totales,
                productos_contados: metrics.contados,
                diferencias: metrics.diferencias,
                precision_porcentaje: metrics.totales > 0 
                    ? ((metrics.totales - metrics.diferencias) / metrics.totales * 100).toFixed(2)
                    : 0,
                merma_unidades: metrics.mermaUnidades,
                sobra_unidades: metrics.sobraUnidades
            };

            // Guardar en Supabase
            if (navigator.onLine) {
                const { error } = await supabase
                    .from('reportes_ciclico')
                    .insert(reporte);

                if (error) throw error;

                // Actualizar estado de tarea
                if (this.tareaActual?.id) {
                    await supabase
                        .from('tareas')
                        .update({ estado: 'completada', completada_at: endTime.toISOString() })
                        .eq('id', this.tareaActual.id);
                }
            }

            window.ZENGO?.toast('Cíclico finalizado correctamente', 'success');
            
            // Recargar para volver al dashboard
            setTimeout(() => location.reload(), 1500);

        } catch (error) {
            console.error('Error finalizando cíclico:', error);
            window.ZENGO?.toast('Error al finalizar', 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════
    // AUDIO FEEDBACK
    // ═══════════════════════════════════════════════════════════
    playSound(type) {
        const sounds = {
            success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+PfnBkYXJ+jZ2hoJR+bGNgbn2Qo6ehlYFuYmFtfI6gpaOXgm9jYm5+kKGlpJaAb2JjcH+RoqsA',
            warning: 'data:audio/wav;base64,UklGRl9vT19teleQUAAAAFBBWQBERVNDAAAAAFJJRkYAAAAA',
            error: 'data:audio/wav;base64,UklGRl9vT19teleQUAAAAAAAAAAAAAA='
        };

        try {
            // Usar Web Audio API para mejor compatibilidad
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'success') {
                oscillator.frequency.value = 880; // A5
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
            } else if (type === 'warning') {
                oscillator.frequency.value = 440; // A4
                oscillator.type = 'triangle';
                gainNode.gain.value = 0.4;
            } else {
                oscillator.frequency.value = 220; // A3
                oscillator.type = 'sawtooth';
                gainNode.gain.value = 0.3;
            }

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (err) {
            // Fallback silencioso
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS
    // ═══════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('scanner-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'scanner-styles';
        style.innerHTML = `
            /* Modal de cámara */
            #camera-scanner-modal {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .camera-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
            }
            
            .camera-container {
                position: relative;
                width: 90%;
                max-width: 500px;
                background: rgba(15, 23, 42, 0.95);
                border-radius: 20px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .camera-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .camera-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .close-camera {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            }
            
            #camera-preview {
                width: 100%;
                min-height: 300px;
                background: #000;
            }
            
            #camera-preview video {
                width: 100% !important;
                height: auto !important;
            }
            
            .camera-hint {
                text-align: center;
                padding: 15px;
                color: rgba(255,255,255,0.5);
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .camera-actions {
                padding: 15px;
                display: flex;
                justify-content: center;
            }
            
            .btn-manual {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                color: white;
                padding: 12px 25px;
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            }
            
            .btn-manual:hover {
                background: rgba(255,255,255,0.2);
            }
            
            /* Modal de ingreso manual */
            #manual-input-modal {
                position: fixed;
                inset: 0;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .manual-container {
                position: relative;
                width: 90%;
                max-width: 400px;
                padding: 30px;
                background: rgba(15, 23, 42, 0.95);
                border-radius: 20px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .manual-container h3 {
                margin: 0 0 20px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .manual-input {
                width: 100%;
                padding: 15px;
                font-size: 18px;
                text-align: center;
                background: rgba(255,255,255,0.05);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: white;
                outline: none;
                letter-spacing: 2px;
            }
            
            .manual-input:focus {
                border-color: var(--admin-red, #C8102E);
            }
            
            .manual-actions {
                display: flex;
                gap: 15px;
                margin-top: 20px;
            }
            
            .manual-actions button {
                flex: 1;
                padding: 12px;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .manual-actions .btn-cancel {
                background: transparent;
                border: 1px solid rgba(255,255,255,0.2);
                color: white;
            }
            
            .manual-actions .btn-confirm {
                background: var(--admin-red, #C8102E);
                border: none;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer al window para onclick inline
window.ScannerController = ScannerController;