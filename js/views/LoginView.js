// ═══════════════════════════════════════════════════════════════
// ZENGO - Vista de Login
// Pantalla de autenticación con diseño glassmorphism
// ═══════════════════════════════════════════════════════════════

const LoginView = {

    render(container) {
        container.innerHTML = `
        <div class="login-wrapper">
            <div class="login-bg">
                <div class="bg-shape shape-1"></div>
                <div class="bg-shape shape-2"></div>
                <div class="bg-shape shape-3"></div>
            </div>
            
            <div class="login-container">
                <div class="login-card glass">
                    <div class="login-header">
                        <div class="logo-big">ZEN<span>GO</span></div>
                        <p class="tagline">High Performance Inventory</p>
                    </div>
                    
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="email">
                                <i class="fas fa-user"></i>
                                Usuario
                            </label>
                            <input type="email" id="email" name="email" 
                                   placeholder="correo@ejemplo.com" 
                                   autocomplete="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">
                                <i class="fas fa-lock"></i>
                                Contraseña
                            </label>
                            <div class="password-wrapper">
                                <input type="password" id="password" name="password" 
                                       placeholder="••••••••" 
                                       autocomplete="current-password" required>
                                <button type="button" class="toggle-password" onclick="LoginView.togglePassword()">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-login">
                            <span>Iniciar Sesión</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>
                    
                    <div class="demo-users">
                        <p>Usuarios de prueba:</p>
                        <div class="demo-buttons">
                            <button type="button" onclick="LoginView.fillDemo('admin@zengo.com', '123')">
                                <i class="fas fa-user-shield"></i> Admin
                            </button>
                            <button type="button" onclick="LoginView.fillDemo('jefe@zengo.com', '123')">
                                <i class="fas fa-user-tie"></i> Jefe
                            </button>
                            <button type="button" onclick="LoginView.fillDemo('auxiliar@zengo.com', '123')">
                                <i class="fas fa-user"></i> Auxiliar
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="login-footer">
                    <p>Office Depot Costa Rica</p>
                    <span>v1.0.0</span>
                </div>
            </div>
        </div>
        `;

        this.injectStyles();
    },

    fillDemo(email, password) {
        document.getElementById('email').value = email;
        document.getElementById('password').value = password;
    },

    togglePassword() {
        const input = document.getElementById('password');
        const icon = document.querySelector('.toggle-password i');
        
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
            .login-wrapper {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                background: #020202;
            }

            .login-bg {
                position: absolute;
                inset: 0;
                overflow: hidden;
            }

            .bg-shape {
                position: absolute;
                border-radius: 50%;
                filter: blur(80px);
                opacity: 0.5;
            }

            .shape-1 {
                width: 600px;
                height: 600px;
                background: linear-gradient(135deg, #C8102E, #a00d24);
                top: -200px;
                right: -200px;
                animation: float1 15s ease-in-out infinite;
            }

            .shape-2 {
                width: 400px;
                height: 400px;
                background: linear-gradient(135deg, #7C3AED, #5b21b6);
                bottom: -100px;
                left: -100px;
                animation: float2 12s ease-in-out infinite;
            }

            .shape-3 {
                width: 300px;
                height: 300px;
                background: linear-gradient(135deg, #2563EB, #1d4ed8);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: float3 10s ease-in-out infinite;
            }

            @keyframes float1 {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                50% { transform: translate(-50px, 50px) rotate(10deg); }
            }

            @keyframes float2 {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                50% { transform: translate(30px, -30px) rotate(-10deg); }
            }

            @keyframes float3 {
                0%, 100% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
            }

            .login-container {
                position: relative;
                z-index: 10;
                width: 100%;
                max-width: 420px;
                padding: 20px;
            }

            .login-card {
                padding: 40px;
                border-radius: 24px;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .login-header {
                text-align: center;
                margin-bottom: 40px;
            }

            .logo-big {
                font-size: 48px;
                font-weight: 900;
                letter-spacing: -3px;
                margin-bottom: 10px;
            }

            .logo-big span {
                color: #C8102E;
                text-shadow: 0 0 30px rgba(200, 16, 46, 0.5);
            }

            .tagline {
                font-size: 12px;
                letter-spacing: 3px;
                color: rgba(255, 255, 255, 0.4);
                text-transform: uppercase;
            }

            .login-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .form-group label {
                font-size: 12px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.6);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .form-group input {
                width: 100%;
                padding: 15px 18px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(255, 255, 255, 0.05);
                color: white;
                font-size: 15px;
                transition: all 0.3s ease;
            }

            .form-group input:focus {
                outline: none;
                border-color: #C8102E;
                box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.2);
            }

            .form-group input::placeholder {
                color: rgba(255, 255, 255, 0.3);
            }

            .password-wrapper {
                position: relative;
            }

            .password-wrapper input {
                padding-right: 50px;
            }

            .toggle-password {
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                cursor: pointer;
                padding: 5px;
            }

            .toggle-password:hover {
                color: white;
            }

            .btn-login {
                width: 100%;
                padding: 16px;
                border-radius: 12px;
                border: none;
                background: linear-gradient(135deg, #C8102E, #a00d24);
                color: white;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s ease;
                margin-top: 10px;
            }

            .btn-login:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(200, 16, 46, 0.4);
            }

            .btn-login:active {
                transform: translateY(0);
            }

            .demo-users {
                margin-top: 30px;
                padding-top: 25px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }

            .demo-users p {
                text-align: center;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                margin-bottom: 15px;
            }

            .demo-buttons {
                display: flex;
                gap: 10px;
            }

            .demo-buttons button {
                flex: 1;
                padding: 10px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(255, 255, 255, 0.03);
                color: rgba(255, 255, 255, 0.6);
                font-size: 11px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                transition: all 0.2s;
            }

            .demo-buttons button:hover {
                background: rgba(255, 255, 255, 0.08);
                color: white;
                border-color: rgba(255, 255, 255, 0.2);
            }

            .demo-buttons button i {
                font-size: 16px;
            }

            .login-footer {
                text-align: center;
                margin-top: 30px;
                color: rgba(255, 255, 255, 0.3);
                font-size: 11px;
            }

            .login-footer span {
                display: block;
                margin-top: 5px;
                font-family: 'JetBrains Mono', monospace;
            }

            @media (max-width: 480px) {
                .login-card {
                    padding: 30px 25px;
                }

                .logo-big {
                    font-size: 40px;
                }

                .demo-buttons {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exponer globalmente
window.LoginView = LoginView;