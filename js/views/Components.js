// ═══════════════════════════════════════════════════════════════
// ZENGO - Componentes Reutilizables
// ═══════════════════════════════════════════════════════════════

const Components = {

    // Modal genérico
    modal(id, title, content, footer = '') {
        return `
            <div id="${id}" class="modal-overlay" style="display:none;">
                <div class="modal-content glass">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="Components.closeModal('${id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;
    },

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    },

    // Card de métrica
    metricCard(icon, value, label, sublabel = '', type = '') {
        return `
            <div class="metric-card glass ${type}">
                <div class="metric-header">
                    <i class="fas fa-${icon}"></i>
                </div>
                <span class="metric-value">${value}</span>
                <span class="metric-label">${label}</span>
                ${sublabel ? `<small class="metric-sub">${sublabel}</small>` : ''}
            </div>
        `;
    },

    // Botón con icono
    button(text, icon, onclick, type = 'primary') {
        return `
            <button class="btn-${type}" onclick="${onclick}">
                <i class="fas fa-${icon}"></i> ${text}
            </button>
        `;
    },

    // Empty state
    emptyState(icon, message, submessage = '') {
        return `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <p>${message}</p>
                ${submessage ? `<small>${submessage}</small>` : ''}
            </div>
        `;
    },

    // Loading state
    loadingState(message = 'Cargando...') {
        return `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>${message}</p>
            </div>
        `;
    },

    // Badge
    badge(text, type = 'default') {
        return `<span class="badge badge-${type}">${text}</span>`;
    },

    // Progress bar
    progressBar(value, max = 100, showLabel = true) {
        const percent = Math.round((value / max) * 100);
        return `
            <div class="progress-container">
                ${showLabel ? `<span class="progress-label">${percent}%</span>` : ''}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }
};

// Exponer globalmente
window.Components = Components;
