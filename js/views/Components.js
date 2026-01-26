// ═══════════════════════════════════════════════════════════════
// ZENGO - Componentes Reutilizables
// Elementos UI compartidos entre todas las vistas
// ═══════════════════════════════════════════════════════════════

export const Components = {

    // ═══════════════════════════════════════════════════════════
    // MODAL DE CONSULTA DE PRODUCTO
    // ═══════════════════════════════════════════════════════════
    renderScannerConsult(producto, ubicaciones = []) {
        // Cerrar modal anterior si existe
        document.querySelector('.modal-overlay.scanner-consult')?.remove();

        const ubicacionesArray = Array.isArray(ubicaciones) ? ubicaciones : [ubicaciones].filter(Boolean);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay scanner-consult';
        modal.innerHTML = `
            <div class="modal-content glass glow-accent animate-scaleIn">
                <div class="modal-header">
                    <h3><i class="fas fa-search"></i> Consulta de Inventario</h3>
                    <button class="modal-close" onclick="Components.closeModal(this)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="consult-body">
                    <div class="product-main-info">
                        <div class="product-badges">
                            <span class="type-badge">${producto.tipo || producto.categoria || 'General'}</span>
                            <span class="status-badge ${(producto.estatus === 'ACTIVO' || producto.estatus === 'Activo') ? 'active' : 'inactive'}">
                                ${producto.estatus || 'Activo'}
                            </span>
                        </div>
                        <h2 class="product-sku">${producto.sku || 'N/A'}</h2>
                        <p class="product-desc">${producto.descripcion || 'Sin descripción'}</p>
                        <code class="product-upc">${producto.upc || 'Sin UPC'}</code>
                    </div>

                    <div class="stats-grid-consult">
                        <div class="c-item">
                            <i class="fas fa-boxes"></i>
                            <div>
                                <small>STOCK SISTEMA</small>
                                <span>${producto.stock_sistema || 0}</span>
                            </div>
                        </div>
                        <div class="c-item">
                            <i class="fas fa-tag"></i>
                            <div>
                                <small>PRECIO</small>
                                <span>₡${(producto.precio || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="c-item">
                            <i class="fas fa-layer-group"></i>
                            <div>
                                <small>CATEGORÍA</small>
                                <span>${producto.categoria_id || producto.categoria || 'General'}</span>
                            </div>
                        </div>
                        <div class="c-item">
                            <i class="fas fa-star"></i>
                            <div>
                                <small>PRIORIDAD</small>
                                <span class="${producto.prioridad === 'A' ? 'text-error' : ''}">${producto.prioridad === 'A' ? 'Alta (70%)' : 'Normal'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="location-history-box glass">
                        <div class="icon-loc">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="loc-text">
                            <strong>HISTORIAL DE UBICACIONES</strong>
                            ${ubicacionesArray.length > 0 ? `
                                <div class="ubicaciones-list">
                                    ${ubicacionesArray.map((ub, i) => `
                                        <span class="ub-chip ${i === 0 ? 'current' : ''}">${ub}</span>
                                    `).join('')}
                                </div>
                                <small>La primera es la más reciente. Se actualiza al cerrar cada cíclico.</small>
                            ` : `
                                <p class="no-ubicacion">SIN REGISTRO PREVIO</p>
                                <small>La ubicación se registrará cuando se cuente este producto.</small>
                            `}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Components.closeModal(this)">
                        CERRAR
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.injectConsultStyles();

        // Cerrar con click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Cerrar con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    // ═══════════════════════════════════════════════════════════
    // TOAST / NOTIFICACIONES
    // ═══════════════════════════════════════════════════════════
    showToast(mensaje, tipo = 'success', duracion = 3000) {
        // Contenedor de toasts
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const iconos = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast glass ${tipo}`;
        toast.innerHTML = `
            <i class="fas ${iconos[tipo] || iconos.info}"></i>
            <span>${mensaje}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Animar entrada
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto-remover
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duracion);

        this.injectToastStyles();
        return toast;
    },

    // ═══════════════════════════════════════════════════════════
    // DIÁLOGO DE CONFIRMACIÓN
    // ═══════════════════════════════════════════════════════════
    confirm(mensaje, titulo = 'Confirmar') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay confirm-dialog';
            modal.innerHTML = `
                <div class="modal-content glass animate-scaleIn" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-question-circle"></i> ${titulo}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${mensaje}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="confirm-cancel">Cancelar</button>
                        <button class="btn-primary" id="confirm-accept">Aceptar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#confirm-cancel').onclick = () => {
                modal.remove();
                resolve(false);
            };

            modal.querySelector('#confirm-accept').onclick = () => {
                modal.remove();
                resolve(true);
            };

            // Click fuera = cancelar
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    },

    // ═══════════════════════════════════════════════════════════
    // PROMPT (INPUT)
    // ═══════════════════════════════════════════════════════════
    prompt(mensaje, valorInicial = '', titulo = 'Ingresar valor') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay prompt-dialog';
            modal.innerHTML = `
                <div class="modal-content glass animate-scaleIn" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-edit"></i> ${titulo}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${mensaje}</p>
                        <input type="text" id="prompt-input" class="prompt-input" value="${valorInicial}" autofocus>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="prompt-cancel">Cancelar</button>
                        <button class="btn-primary" id="prompt-accept">Aceptar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('#prompt-input');
            input.focus();
            input.select();

            const submit = () => {
                const value = input.value.trim();
                modal.remove();
                resolve(value || null);
            };

            modal.querySelector('#prompt-cancel').onclick = () => {
                modal.remove();
                resolve(null);
            };

            modal.querySelector('#prompt-accept').onclick = submit;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submit();
            });
        });
    },

    // ═══════════════════════════════════════════════════════════
    // LOADING SPINNER
    // ═══════════════════════════════════════════════════════════
    showLoading(mensaje = 'Cargando...') {
        this.hideLoading(); // Remover anterior

        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'modal-overlay loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${mensaje}</p>
            </div>
        `;

        document.body.appendChild(overlay);
        this.injectLoadingStyles();
    },

    hideLoading() {
        document.getElementById('loading-overlay')?.remove();
    },

    // ═══════════════════════════════════════════════════════════
    // BADGE DE CONEXIÓN
    // ═══════════════════════════════════════════════════════════
    renderConnectionBadge(containerId = 'sync-container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const updateStatus = () => {
            const isOnline = navigator.onLine;
            container.className = `sync-badge ${isOnline ? 'online' : 'offline'}`;
            container.innerHTML = `
                <div class="dot"></div>
                <span>${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            `;
        };

        updateStatus();
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
    },

    // ═══════════════════════════════════════════════════════════
    // TABLA GENÉRICA
    // ═══════════════════════════════════════════════════════════
    renderTable(data, columns, options = {}) {
        const { emptyMessage = 'Sin datos', onRowClick = null } = options;

        if (!data || data.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>${emptyMessage}</p>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col.header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map((row, index) => `
                        <tr ${onRowClick ? `onclick="${onRowClick}(${index})"` : ''}>
                            ${columns.map(col => `
                                <td class="${col.class || ''}">
                                    ${col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // BARRA DE PROGRESO
    // ═══════════════════════════════════════════════════════════
    renderProgressBar(porcentaje, color = 'primary') {
        const clampedPercent = Math.max(0, Math.min(100, porcentaje));
        return `
            <div class="progress-bar-component">
                <div class="progress-fill ${color}" style="width: ${clampedPercent}%"></div>
                <span class="progress-text">${clampedPercent.toFixed(1)}%</span>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════
    // CERRAR MODAL (HELPER)
    // ═══════════════════════════════════════════════════════════
    closeModal(element) {
        element?.closest('.modal-overlay')?.remove();
    },

    // ═══════════════════════════════════════════════════════════
    // ESTILOS INYECTADOS
    // ═══════════════════════════════════════════════════════════
    injectConsultStyles() {
        if (document.getElementById('consult-component-styles')) return;
        const style = document.createElement('style');
        style.id = 'consult-component-styles';
        style.innerHTML = `
            .scanner-consult .modal-content {
                max-width: 500px;
            }
            
            .glow-accent {
                border-color: rgba(var(--accent-rgb, 200, 16, 46), 0.3);
                box-shadow: 0 0 40px rgba(var(--accent-rgb, 200, 16, 46), 0.2);
            }
            
            .product-main-info {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
                margin-bottom: 20px;
            }
            
            .product-badges {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .type-badge {
                padding: 4px 12px;
                background: rgba(255,255,255,0.1);
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .status-badge.active {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }
            
            .status-badge.inactive {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }
            
            .product-sku {
                font-size: 28px;
                font-weight: 800;
                margin: 0 0 10px 0;
            }
            
            .product-desc {
                color: rgba(255,255,255,0.7);
                margin: 0 0 10px 0;
            }
            
            .product-upc {
                background: rgba(255,255,255,0.1);
                padding: 5px 15px;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .stats-grid-consult {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .c-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 15px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
            }
            
            .c-item i {
                font-size: 20px;
                color: rgba(255,255,255,0.4);
            }
            
            .c-item small {
                display: block;
                font-size: 10px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 3px;
            }
            
            .c-item span {
                font-weight: 600;
            }
            
            .location-history-box {
                display: flex;
                gap: 15px;
                padding: 20px;
                border-radius: 12px;
                background: rgba(var(--accent-rgb, 200, 16, 46), 0.1);
                border: 1px dashed rgba(var(--accent-rgb, 200, 16, 46), 0.3);
            }
            
            .icon-loc {
                font-size: 24px;
                color: var(--accent, #C8102E);
            }
            
            .loc-text strong {
                display: block;
                margin-bottom: 10px;
                font-size: 12px;
            }
            
            .loc-text small {
                display: block;
                margin-top: 10px;
                font-size: 11px;
                color: rgba(255,255,255,0.4);
            }
            
            .ubicaciones-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .ub-chip {
                padding: 5px 12px;
                background: rgba(255,255,255,0.1);
                border-radius: 20px;
                font-size: 12px;
            }
            
            .ub-chip.current {
                background: var(--accent, #C8102E);
                color: white;
            }
            
            .no-ubicacion {
                color: rgba(255,255,255,0.4);
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    },

    injectToastStyles() {
        if (document.getElementById('toast-component-styles')) return;
        const style = document.createElement('style');
        style.id = 'toast-component-styles';
        style.innerHTML = `
            #toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            
            .toast {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 20px;
                border-radius: 12px;
                background: rgba(30, 30, 30, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
                color: white;
                font-size: 14px;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                pointer-events: auto;
                max-width: 350px;
            }
            
            .toast.show {
                transform: translateX(0);
            }
            
            .toast.success {
                border-left: 4px solid #22c55e;
            }
            
            .toast.success i { color: #22c55e; }
            
            .toast.error {
                border-left: 4px solid #ef4444;
            }
            
            .toast.error i { color: #ef4444; }
            
            .toast.warning {
                border-left: 4px solid #f59e0b;
            }
            
            .toast.warning i { color: #f59e0b; }
            
            .toast.info {
                border-left: 4px solid #3b82f6;
            }
            
            .toast.info i { color: #3b82f6; }
            
            .toast span {
                flex: 1;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                cursor: pointer;
                padding: 0;
            }
            
            @media (max-width: 480px) {
                #toast-container {
                    left: 10px;
                    right: 10px;
                }
                
                .toast {
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    },

    injectLoadingStyles() {
        if (document.getElementById('loading-component-styles')) return;
        const style = document.createElement('style');
        style.id = 'loading-component-styles';
        style.innerHTML = `
            .loading-overlay {
                background: rgba(0, 0, 0, 0.8);
            }
            
            .loading-content {
                text-align: center;
                color: white;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: var(--accent, #C8102E);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .prompt-input {
                width: 100%;
                padding: 12px 15px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: white;
                font-size: 15px;
                margin-top: 15px;
                outline: none;
            }
            
            .prompt-input:focus {
                border-color: var(--accent, #C8102E);
            }
            
            .progress-bar-component {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .progress-fill.primary { background: var(--accent, #C8102E); }
            .progress-fill.success { background: #22c55e; }
            .progress-fill.warning { background: #f59e0b; }
            
            .progress-text {
                position: absolute;
                right: 0;
                top: -20px;
                font-size: 11px;
                color: rgba(255,255,255,0.7);
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer al window para uso global
window.Components = Components;