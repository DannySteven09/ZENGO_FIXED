// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista de Login
// Glassmorphism + Paleta Rojo Office Depot
// ═══════════════════════════════════════════════════════════════

export const LoginView = {
    render(container) {
        container.innerHTML = `
            <div class="login-wrapper">
                <!-- Fondo animado -->
                <div class="login-bg-animation"></div>
                
                <div class="login-card glass">
                    <div class="login-header">
                        <div class="brand-logo">ZEN<span>GO</span></div>
                        <p>High Performance Inventory</p>
                    </div>
                    
                    <form id="login-form" class="login-form">
                        <div id="login-error-container"></div>
                        
                        <div class="input-group">
                            <i class="fas fa-envelope"></i>
                            <input type="email" id="email" placeholder="Correo electrónico" required autocomplete="email">
                        </div>
                        
                        <div class="input-group">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="password" placeholder="Contraseña" required autocomplete="current-password">
                            <button type="button" class="toggle-pass" onclick="LoginView.togglePassword()">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        
                        <button type="submit" class="login-btn">
                            <span>ENTRAR</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>
                    
                    <div class="login-footer">
                        <p>Acceso rápido (Demo):</p>
                        <div class="demo-badges">
                            <span class="badge-admin" onclick="LoginView.fillDemo('admin@demo.com', '123')">
                                <i class="fas fa-user-shield"></i> Admin
                            </span>
                            <span class="badge-jefe" onclick="LoginView.fillDemo('jefe@demo.com', '123')">
                                <i class="fas fa-user-tie"></i> Jefe
                            </span>
                            <span class="badge-aux" onclick="LoginView.fillDemo('auxiliar@demo.com', '123')">
                                <i class="fas fa-user"></i> Auxiliar
                            </span>
                        </div>
                    </div>
                    
                    <div class="login-brand">
                        <small>Powered by</small>
                        <span>Office Depot</span>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
    },

    // Llenar campos demo
    fillDemo(email, pass) {
        document.getElementById('email').value = email;
        document.getElementById('password').value = pass;
        // Efecto visual
        document.getElementById('email').classList.add('filled');
        document.getElementById('password').classList.add('filled');
    },

    // Mostrar/ocultar contraseña
    togglePassword() {
        const input = document.getElementById('password');
        const icon = document.querySelector('.toggle-pass i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    },

    injectStyles() {
        if (document.getElementById('login-styles')) return;
        const style = document.createElement('style');
        style.id = 'login-styles';
        style.innerHTML = `
            /* ═══════════════════════════════════════════════════════════
               LOGIN - GLASSMORPHISM ZENGO
               ═══════════════════════════════════════════════════════════ */
            
            .login-wrapper {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%);
            }
            
            /* Fondo animado sutil */
            .login-bg-animation {
                position: absolute;
                inset: 0;
                background: 
                    radial-gradient(circle at 20% 80%, rgba(200, 16, 46, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(200, 16, 46, 0.1) 0%, transparent 50%);
                animation: bgPulse 8s ease-in-out infinite alternate;
            }
            
            @keyframes bgPulse {
                0% { opacity: 0.5; transform: scale(1); }
                100% { opacity: 1; transform: scale(1.1); }
            }
            
            /* Card principal */
            .login-card {
                width: 100%;
                max-width: 420px;
                padding: 50px 40px;
                text-align: center;
                position: relative;
                z-index: 10;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 24px;
                box-shadow: 
                    0 25px 50px rgba(0, 0, 0, 0.5),
                    0 0 100px rgba(200, 16, 46, 0.1);
                animation: cardIn 0.8s ease-out;
            }
            
            @keyframes cardIn {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            /* Logo */
            .brand-logo {
                font-size: 48px;
                font-weight: 900;
                letter-spacing: -3px;
                color: #ffffff;
                margin-bottom: 5px;
            }
            
            .brand-logo span {
                color: var(--admin-red, #C8102E);
                text-shadow: 0 0 30px rgba(200, 16, 46, 0.5);
            }
            
            .login-header p {
                color: rgba(255, 255, 255, 0.4);
                font-size: 14px;
                font-weight: 300;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 40px;
            }
            
            /* Formulario */
            .login-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .input-group {
                position: relative;
            }
            
            .input-group i:first-child {
                position: absolute;
                left: 18px;
                top: 50%;
                transform: translateY(-50%);
                color: rgba(255, 255, 255, 0.3);
                font-size: 14px;
                transition: color 0.3s;
            }
            
            .input-group input {
                width: 100%;
                padding: 18px 50px 18px 50px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                color: #ffffff;
                font-size: 15px;
                font-family: inherit;
                outline: none;
                transition: all 0.3s ease;
            }
            
            .input-group input::placeholder {
                color: rgba(255, 255, 255, 0.3);
            }
            
            .input-group input:focus {
                border-color: var(--admin-red, #C8102E);
                background: rgba(255, 255, 255, 0.08);
                box-shadow: 0 0 20px rgba(200, 16, 46, 0.2);
            }
            
            .input-group input:focus + i,
            .input-group input:focus ~ i:first-child {
                color: var(--admin-red, #C8102E);
            }
            
            .input-group input.filled {
                animation: fillPulse 0.3s ease;
            }
            
            @keyframes fillPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            /* Toggle password */
            .toggle-pass {
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.3);
                cursor: pointer;
                padding: 5px;
                transition: color 0.3s;
            }
            
            .toggle-pass:hover {
                color: var(--admin-red, #C8102E);
            }
            
            /* Botón Login */
            .login-btn {
                background: linear-gradient(135deg, var(--admin-red, #C8102E) 0%, #a00d24 100%);
                color: white;
                padding: 18px 30px;
                border: none;
                border-radius: 14px;
                font-size: 15px;
                font-weight: 800;
                font-family: inherit;
                letter-spacing: 1px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                transition: all 0.3s ease;
                margin-top: 10px;
            }
            
            .login-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 30px rgba(200, 16, 46, 0.4);
            }
            
            .login-btn:active {
                transform: translateY(-1px);
            }
            
            .login-btn i {
                transition: transform 0.3s;
            }
            
            .login-btn:hover i {
                transform: translateX(5px);
            }
            
            /* Footer demo badges */
            .login-footer {
                margin-top: 35px;
                padding-top: 25px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .login-footer p {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.3);
                margin-bottom: 15px;
            }
            
            .demo-badges {
                display: flex;
                justify-content: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .demo-badges span {
                background: rgba(255, 255, 255, 0.03);
                padding: 8px 14px;
                border-radius: 10px;
                cursor: pointer;
                border: 1px solid rgba(255, 255, 255, 0.08);
                font-size: 12px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.6);
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.3s ease;
            }
            
            .demo-badges span:hover {
                transform: translateY(-2px);
            }
            
            .demo-badges .badge-admin:hover {
                background: rgba(200, 16, 46, 0.2);
                border-color: var(--admin-red, #C8102E);
                color: #fff;
            }
            
            .demo-badges .badge-jefe:hover {
                background: rgba(124, 58, 237, 0.2);
                border-color: #7C3AED;
                color: #fff;
            }
            
            .demo-badges .badge-aux:hover {
                background: rgba(37, 99, 235, 0.2);
                border-color: #2563EB;
                color: #fff;
            }
            
            /* Branding inferior */
            .login-brand {
                margin-top: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            }
            
            .login-brand small {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.2);
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            
            .login-brand span {
                font-size: 13px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.4);
            }
            
            /* Error container */
            #login-error-container:not(:empty) {
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #f87171;
                padding: 12px 16px;
                border-radius: 10px;
                font-size: 13px;
                animation: shake 0.5s ease;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            /* Responsive */
            @media (max-width: 480px) {
                .login-card {
                    margin: 20px;
                    padding: 40px 25px;
                }
                
                .brand-logo {
                    font-size: 38px;
                }
                
                .demo-badges {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .demo-badges span {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer al window para los onclick inline
window.LoginView = LoginView;