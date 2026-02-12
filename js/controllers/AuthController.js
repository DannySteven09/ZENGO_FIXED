// ═══════════════════════════════════════════════════════════════
// ZENGO - Controlador de Autenticación
// ═══════════════════════════════════════════════════════════════

const AuthController = {
    currentUser: null,

    async login(email, password) {
        this.showLoading(true);
        
        const userData = await window.AuthModel.validateCredentials(email, password);

        this.showLoading(false);

        if (userData) {
            this.currentUser = userData;
            localStorage.setItem('zengo_session', JSON.stringify(userData));
            this.initSession(userData);
        } else {
            this.showError("Usuario o contraseña incorrectos");
        }
    },

    initSession(user) {
        this.currentUser = user;
        const container = document.getElementById('app-container');
        const body = document.body;

        body.classList.remove('admin-mode', 'jefe-mode', 'aux-mode');

        const initialState = this.getInitialState(user.role);

        switch (user.role) {
            case 'ADMIN':
                body.classList.add('admin-mode');
                window.AdminView.render(container, initialState);
                break;

            case 'JEFE':
                body.classList.add('jefe-mode');
                window.JefeView.render(container, initialState);
                break;

            case 'AUXILIAR':
                body.classList.add('aux-mode');
                window.AuxiliarView.render(container, [], 'Sin categoría asignada');
                break;

            default:
                console.error("Rol no reconocido:", user.role);
                this.logout();
        }
    },

    getInitialState(role) {
        switch (role) {
            case 'ADMIN':
                return {
                    diffTotal: 0,
                    precision: 0,
                    lineasContadas: 0,
                    lineasTotales: 0,
                    logs: [],
                    ranking: []
                };
            case 'JEFE':
                return {
                    tareasActivas: [],
                    hallazgosPendientes: [],
                    auxiliaresActivos: [],
                    zonas: []
                };
            case 'AUXILIAR':
                return {
                    tareaActual: null,
                    productos: [],
                    progreso: 0
                };
            default:
                return {};
        }
    },

    logout() {
        window.AuthModel.logout();
        localStorage.removeItem('zengo_session');
        this.currentUser = null;
        location.reload();
    },

    checkExistingSession() {
        const savedSession = localStorage.getItem('zengo_session');
        if (savedSession) {
            try {
                const user = JSON.parse(savedSession);
                if (user && user.id && user.role) {
                    this.initSession(user);
                    return true;
                }
            } catch (e) {
                localStorage.removeItem('zengo_session');
            }
        }
        return false;
    },

    showLoading(show) {
        let loader = document.getElementById('login-loader');
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'login-loader';
                loader.innerHTML = `
                    <div class="loader-overlay">
                        <div class="spinner"></div>
                        <p>Verificando credenciales...</p>
                    </div>
                `;
                loader.style.cssText = `
                    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center;
                    flex-direction: column; gap: 20px; z-index: 9999; color: white;
                `;
                document.body.appendChild(loader);
            }
        } else if (loader) {
            loader.remove();
        }
    },

    showError(message) {
        let errorEl = document.getElementById('login-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'login-error';
            errorEl.style.cssText = `
                background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444;
                color: #ef4444; padding: 12px 20px; border-radius: 8px;
                margin-bottom: 20px; text-align: center; animation: shake 0.5s;
            `;
            const form = document.getElementById('login-form');
            if (form) form.insertBefore(errorEl, form.firstChild);
        }
        errorEl.textContent = message;
        
        setTimeout(() => errorEl?.remove(), 4000);
    },

    getUser() {
        return this.currentUser;
    },

    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'ADMIN') return true;
        return false;
    }
};

// Exponer globalmente
window.AuthController = AuthController;
