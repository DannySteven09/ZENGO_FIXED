-- ═══════════════════════════════════════════════════════════════════════════════
-- ZENGO - Script SQL para Supabase
-- Sistema de Inventario Cíclico - Office Depot
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUCCIONES:
-- 1. Ir a Supabase → SQL Editor
-- 2. Copiar todo este script
-- 3. Ejecutar (Run)
-- 4. Verificar que no haya errores
--
-- NOTA: Este script BORRA todas las tablas existentes y las crea de nuevo
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 1: ELIMINAR TABLAS EXISTENTES (en orden correcto por dependencias)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS conteos_realizados CASCADE;
DROP TABLE IF EXISTS hallazgos CASCADE;
DROP TABLE IF EXISTS reportes_ciclico CASCADE;
DROP TABLE IF EXISTS tareas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS ubicaciones_historico CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 2: CREAR TABLAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ROLES (Admin, Jefe, Auxiliar)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#000000',
    permisos JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (usuarios del sistema)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    role_id INTEGER REFERENCES roles(id) DEFAULT 3,
    avatar_url TEXT,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORÍAS de productos
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    productos_count INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTOS (catálogo maestro)
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    upc VARCHAR(50) UNIQUE NOT NULL,
    sku VARCHAR(50) UNIQUE,
    descripcion TEXT NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    stock_sistema INTEGER DEFAULT 0,
    precio DECIMAL(12,2) DEFAULT 0,
    costo DECIMAL(12,2) DEFAULT 0,
    prioridad VARCHAR(1) DEFAULT 'B', -- A = 70% (alta), B = 30% (baja)
    tipo VARCHAR(50) DEFAULT 'ESTANDAR',
    estatus VARCHAR(20) DEFAULT 'ACTIVO',
    ubicacion_default VARCHAR(50),
    ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TAREAS asignadas a auxiliares
CREATE TABLE tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200),
    categoria_id INTEGER REFERENCES categorias(id),
    categoria VARCHAR(100),
    asignado_a UUID REFERENCES profiles(id),
    auxiliar_nombre VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, en_progreso, completada, cancelada
    prioridad VARCHAR(10) DEFAULT 'normal', -- alta, normal, baja
    productos_total INTEGER DEFAULT 0,
    productos_contados INTEGER DEFAULT 0,
    fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    completada_at TIMESTAMPTZ,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTEOS realizados
CREATE TABLE conteos_realizados (
    id SERIAL PRIMARY KEY,
    tarea_id INTEGER REFERENCES tareas(id),
    producto_sku VARCHAR(50),
    upc VARCHAR(50),
    cantidad_contada INTEGER NOT NULL,
    stock_sistema INTEGER DEFAULT 0,
    diferencia INTEGER GENERATED ALWAYS AS (cantidad_contada - stock_sistema) STORED,
    ubicacion VARCHAR(50),
    auxiliar_id UUID REFERENCES profiles(id),
    auxiliar_nombre VARCHAR(200),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    dispositivo VARCHAR(200),
    sync_status VARCHAR(20) DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HALLAZGOS (productos no catalogados, dañados, etc.)
CREATE TABLE hallazgos (
    id SERIAL PRIMARY KEY,
    upc VARCHAR(50),
    tipo VARCHAR(50) NOT NULL, -- EXCEDENTE, NO_CATALOGADO, DAÑADO, VENCIDO, OTRO
    descripcion TEXT,
    cantidad INTEGER DEFAULT 1,
    ubicacion VARCHAR(50),
    foto_url TEXT,
    reportado_por UUID REFERENCES profiles(id),
    auxiliar_nombre VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobado, rechazado
    validado_por UUID REFERENCES profiles(id),
    validado_at TIMESTAMPTZ,
    notas_validacion TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORTES de cíclicos completados
CREATE TABLE reportes_ciclico (
    id SERIAL PRIMARY KEY,
    cycle_id VARCHAR(100),
    tarea_id INTEGER REFERENCES tareas(id),
    auxiliar_id UUID REFERENCES profiles(id),
    auxiliar_nombre VARCHAR(200),
    categoria VARCHAR(100),
    fecha DATE DEFAULT CURRENT_DATE,
    hora_inicio TIMESTAMPTZ,
    hora_fin TIMESTAMPTZ,
    duracion_segundos INTEGER,
    total_productos INTEGER DEFAULT 0,
    productos_contados INTEGER DEFAULT 0,
    diferencias INTEGER DEFAULT 0,
    precision_porcentaje DECIMAL(5,2) DEFAULT 0,
    merma_unidades INTEGER DEFAULT 0,
    sobra_unidades INTEGER DEFAULT 0,
    merma_monetaria DECIMAL(12,2) DEFAULT 0,
    sobra_monetaria DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UBICACIONES HISTÓRICAS
CREATE TABLE ubicaciones_historico (
    id SERIAL PRIMARY KEY,
    upc VARCHAR(50) UNIQUE NOT NULL,
    ubicacion VARCHAR(50),
    ubicaciones TEXT[], -- Array de ubicaciones históricas
    ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por VARCHAR(200)
);

-- LOG DE AUDITORÍA
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    accion VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    registro_id INTEGER,
    usuario_id UUID,
    usuario_nombre VARCHAR(200),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 3: CREAR ÍNDICES para mejor rendimiento
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_productos_upc ON productos(upc);
CREATE INDEX idx_productos_sku ON productos(sku);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_conteos_tarea ON conteos_realizados(tarea_id);
CREATE INDEX idx_conteos_upc ON conteos_realizados(upc);
CREATE INDEX idx_conteos_timestamp ON conteos_realizados(timestamp);
CREATE INDEX idx_hallazgos_estado ON hallazgos(estado);
CREATE INDEX idx_hallazgos_tipo ON hallazgos(tipo);
CREATE INDEX idx_tareas_estado ON tareas(estado);
CREATE INDEX idx_tareas_asignado ON tareas(asignado_a);
CREATE INDEX idx_ubicaciones_upc ON ubicaciones_historico(upc);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 4: INSERTAR DATOS INICIALES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Roles del sistema
INSERT INTO roles (id, nombre, descripcion, color) VALUES
(1, 'ADMIN', 'Administrador del sistema con acceso total', '#C8102E'),
(2, 'JEFE', 'Jefe de bodega - Supervisor de operaciones', '#7C3AED'),
(3, 'AUXILIAR', 'Auxiliar de bodega - Ejecutor de conteos', '#2563EB');

-- Categorías de ejemplo
INSERT INTO categorias (nombre, descripcion, color) VALUES
('PAPEL', 'Papelería y suministros de oficina', '#3B82F6'),
('TONER', 'Cartuchos de tinta y tóner', '#10B981'),
('TECNOLOGIA', 'Equipos electrónicos y accesorios', '#8B5CF6'),
('MOBILIARIO', 'Muebles de oficina', '#F59E0B'),
('ESCOLAR', 'Artículos escolares', '#EC4899'),
('ARCHIVO', 'Folders, carpetas y archivo', '#6366F1');

-- Usuarios demo (contraseña: 123)
-- NOTA: Estos usuarios funcionan con el fallback del AuthModel
-- Para auth real, crear usuarios en Supabase Auth

INSERT INTO profiles (id, email, nombre, apellido, role_id) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@demo.com', 'Administrador', 'Sistema', 1),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'jefe@demo.com', 'Carlos', 'Rodríguez', 2),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'auxiliar@demo.com', 'María', 'López', 3);

-- Productos de ejemplo para testing
INSERT INTO productos (upc, sku, descripcion, categoria_id, stock_sistema, precio, costo, prioridad) VALUES
('7501234567890', 'PAP-001', 'Resma de papel bond carta 500 hojas', 1, 150, 5500, 3300, 'A'),
('7501234567891', 'PAP-002', 'Resma de papel bond oficio 500 hojas', 1, 80, 6200, 3720, 'A'),
('7501234567892', 'TON-001', 'Tóner HP 85A Negro Original', 2, 25, 45000, 27000, 'A'),
('7501234567893', 'TON-002', 'Cartucho HP 664 Negro', 2, 40, 12500, 7500, 'A'),
('7501234567894', 'TEC-001', 'Mouse inalámbrico Logitech M185', 3, 35, 15900, 9540, 'B'),
('7501234567895', 'TEC-002', 'Teclado USB básico español', 3, 20, 8500, 5100, 'B'),
('7501234567896', 'MOB-001', 'Silla ejecutiva ergonómica negra', 4, 10, 125000, 75000, 'A'),
('7501234567897', 'ESC-001', 'Cuaderno profesional 100 hojas', 5, 200, 2800, 1680, 'B'),
('7501234567898', 'ESC-002', 'Lapicero BIC cristal azul caja x12', 5, 100, 3500, 2100, 'B'),
('7501234567899', 'ARC-001', 'Folder manila carta paquete x100', 6, 50, 8900, 5340, 'B');

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 5: HABILITAR ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos_realizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE hallazgos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_ciclico ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicaciones_historico ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo (ajustar en producción)
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Lectura pública" ON profiles FOR SELECT USING (true);
CREATE POLICY "Lectura productos" ON productos FOR SELECT USING (true);
CREATE POLICY "Lectura tareas" ON tareas FOR SELECT USING (true);
CREATE POLICY "Lectura conteos" ON conteos_realizados FOR SELECT USING (true);
CREATE POLICY "Lectura hallazgos" ON hallazgos FOR SELECT USING (true);
CREATE POLICY "Lectura reportes" ON reportes_ciclico FOR SELECT USING (true);
CREATE POLICY "Lectura ubicaciones" ON ubicaciones_historico FOR SELECT USING (true);

-- Permitir inserción
CREATE POLICY "Insertar conteos" ON conteos_realizados FOR INSERT WITH CHECK (true);
CREATE POLICY "Insertar hallazgos" ON hallazgos FOR INSERT WITH CHECK (true);
CREATE POLICY "Insertar reportes" ON reportes_ciclico FOR INSERT WITH CHECK (true);
CREATE POLICY "Insertar ubicaciones" ON ubicaciones_historico FOR INSERT WITH CHECK (true);
CREATE POLICY "Insertar tareas" ON tareas FOR INSERT WITH CHECK (true);
CREATE POLICY "Insertar productos" ON productos FOR INSERT WITH CHECK (true);

-- Permitir actualización
CREATE POLICY "Actualizar tareas" ON tareas FOR UPDATE USING (true);
CREATE POLICY "Actualizar hallazgos" ON hallazgos FOR UPDATE USING (true);
CREATE POLICY "Actualizar productos" ON productos FOR UPDATE USING (true);
CREATE POLICY "Actualizar ubicaciones" ON ubicaciones_historico FOR UPDATE USING (true);
CREATE POLICY "Actualizar conteos" ON conteos_realizados FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 6: CREAR FUNCIONES Y TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Función para actualizar timestamp de modificación
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tareas_updated_at
    BEFORE UPDATE ON tareas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar conteo de productos por categoría
CREATE OR REPLACE FUNCTION update_categoria_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE categorias SET productos_count = productos_count + 1 WHERE id = NEW.categoria_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE categorias SET productos_count = productos_count - 1 WHERE id = OLD.categoria_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.categoria_id != NEW.categoria_id THEN
        UPDATE categorias SET productos_count = productos_count - 1 WHERE id = OLD.categoria_id;
        UPDATE categorias SET productos_count = productos_count + 1 WHERE id = NEW.categoria_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_categoria_count
    AFTER INSERT OR UPDATE OR DELETE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_categoria_count();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 7: CREAR VISTAS ÚTILES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vista de dashboard para Admin
CREATE OR REPLACE VIEW vista_dashboard_admin AS
SELECT 
    (SELECT COUNT(*) FROM productos) as total_productos,
    (SELECT COUNT(*) FROM conteos_realizados WHERE DATE(timestamp) = CURRENT_DATE) as conteos_hoy,
    (SELECT COUNT(*) FROM hallazgos WHERE estado = 'pendiente') as hallazgos_pendientes,
    (SELECT COUNT(*) FROM tareas WHERE estado = 'en_progreso') as tareas_activas,
    (SELECT COALESCE(SUM(diferencia), 0) FROM conteos_realizados WHERE DATE(timestamp) = CURRENT_DATE) as diferencia_neta_hoy,
    (SELECT COUNT(DISTINCT auxiliar_id) FROM conteos_realizados WHERE DATE(timestamp) = CURRENT_DATE) as auxiliares_activos_hoy;

-- Vista de ranking de auxiliares
CREATE OR REPLACE VIEW vista_ranking_auxiliares AS
SELECT 
    p.id,
    p.nombre,
    p.apellido,
    COUNT(c.id) as total_conteos,
    COUNT(CASE WHEN c.diferencia = 0 THEN 1 END) as conteos_exactos,
    ROUND(
        CASE WHEN COUNT(c.id) > 0 
        THEN (COUNT(CASE WHEN c.diferencia = 0 THEN 1 END)::DECIMAL / COUNT(c.id) * 100)
        ELSE 0 END, 2
    ) as precision_porcentaje
FROM profiles p
LEFT JOIN conteos_realizados c ON p.id = c.auxiliar_id AND DATE(c.timestamp) = CURRENT_DATE
WHERE p.role_id = 3
GROUP BY p.id, p.nombre, p.apellido
ORDER BY precision_porcentaje DESC, total_conteos DESC;

-- Vista de tareas con detalles
CREATE OR REPLACE VIEW vista_tareas_detalle AS
SELECT 
    t.*,
    c.nombre as categoria_nombre,
    p.nombre as auxiliar_nombre_profile,
    (SELECT COUNT(*) FROM conteos_realizados WHERE tarea_id = t.id) as conteos_realizados
FROM tareas t
LEFT JOIN categorias c ON t.categoria_id = c.id
LEFT JOIN profiles p ON t.asignado_a = p.id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 8: CREAR STORAGE BUCKET PARA FOTOS (ejecutar en Supabase Dashboard)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- NOTA: Esto debe hacerse manualmente en el Dashboard de Supabase:
-- 1. Ir a Storage
-- 2. Crear nuevo bucket llamado "zengo-fotos"
-- 3. Marcar como público (Public bucket)
-- 4. Policies: Permitir INSERT y SELECT para authenticated users
--
-- O ejecutar esto en SQL (puede no funcionar en todos los planes):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('zengo-fotos', 'zengo-fotos', true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar que todo se creó correctamente
SELECT 'Tablas creadas:' as info, COUNT(*) as cantidad FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Roles insertados:' as info, COUNT(*) as cantidad FROM roles;
SELECT 'Usuarios demo:' as info, COUNT(*) as cantidad FROM profiles;
SELECT 'Productos demo:' as info, COUNT(*) as cantidad FROM productos;
SELECT 'Categorías:' as info, COUNT(*) as cantidad FROM categorias;

-- Mensaje final
SELECT '✅ ZENGO Database Setup Complete!' as status;
