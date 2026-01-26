# ZENGO - Sistema de Inventario Cíclico

Sistema de inventario digital para Office Depot que reemplaza los dispositivos Zebra.

## 🚀 Instalación Rápida

### Paso 1: Configurar Supabase

1. Ir a [Supabase](https://supabase.com) y abrir tu proyecto
2. Ir a **SQL Editor**
3. Copiar TODO el contenido de `database/supabase_schema.sql`
4. Pegar y ejecutar (botón **Run**)
5. Verificar que no haya errores

### Paso 2: Crear Storage Bucket (manual)

1. En Supabase, ir a **Storage**
2. Click en **New bucket**
3. Nombre: `zengo-fotos`
4. Marcar **Public bucket**
5. Guardar

### Paso 3: Ejecutar en Local

**Opción A: Live Server (VS Code)**
1. Instalar extensión "Live Server" en VS Code
2. Abrir la carpeta ZENGO en VS Code
3. Click derecho en `index.html` → "Open with Live Server"
4. Se abre en `http://localhost:5500`

**Opción B: Python**
```bash
cd ZENGO
python -m http.server 8080
# Abrir http://localhost:8080
```

**Opción C: Node.js**
```bash
npx serve .
# Abrir la URL que muestra
```

## 🔐 Usuarios Demo

| Email | Password | Rol |
|-------|----------|-----|
| admin@demo.com | 123 | Administrador |
| jefe@demo.com | 123 | Jefe de Bodega |
| auxiliar@demo.com | 123 | Auxiliar |

## 📁 Estructura del Proyecto

```
ZENGO/
├── index.html          # Página principal
├── manifest.json       # Configuración PWA
├── sw.js              # Service Worker (offline)
├── database/
│   └── supabase_schema.sql  # Script para crear BD
├── assets/
│   ├── img/           # Iconos
│   └── sounds/        # Sonidos
├── css/
│   ├── main.css
│   ├── glassmorphism.css
│   └── components.css
└── js/
    ├── app.js         # Entrada principal
    ├── config/
    │   ├── supabase.js
    │   └── dexie-db.js
    ├── controllers/
    │   ├── AuthController.js
    │   ├── AdminController.js
    │   ├── ScannerController.js
    │   ├── CycleController.js
    │   └── SyncManager.js
    ├── models/
    │   ├── AuthModel.js
    │   ├── InventoryModel.js
    │   └── LocationModel.js
    └── views/
        ├── LoginView.js
        ├── AdminView.js
        ├── JefeView.js
        ├── AuxiliarView.js
        └── Components.js
```

## 🎨 Colores por Rol

- **Admin**: Rojo `#C8102E`
- **Jefe**: Púrpura `#7C3AED`
- **Auxiliar**: Azul `#2563EB`

## ⚙️ Credenciales Supabase

Las credenciales ya están configuradas en `js/config/supabase.js`:

```javascript
const SUPABASE_URL = "https://rialsyihreilemweovta.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";
```

## 📱 Funcionalidades

### Administrador
- Ver dashboard global
- Cargar archivo Excel de NetSuite
- Exportar reportes de diferencias
- Ver logs de auditoría
- Ranking de auxiliares

### Jefe de Bodega
- Asignar tareas a auxiliares
- Mapa de calor de operaciones
- Aprobar/rechazar hallazgos
- Ver ranking en tiempo real

### Auxiliar
- Escanear productos (cámara o láser USB)
- Registrar conteos
- Reportar hallazgos con foto
- Modo consulta de productos
- Trabajar offline

## 🔄 Sincronización

El sistema funciona offline-first:
1. Los datos se guardan primero en IndexedDB (Dexie.js)
2. Cuando hay conexión, se sincronizan con Supabase
3. Si falla, se agregan a cola de reintentos

## ❓ Solución de Problemas

**Error: "supabase is not defined"**
- Verificar que los CDN cargan correctamente
- Revisar la consola del navegador

**No carga el login**
- Verificar que `index.html` esté en la raíz
- Usar Live Server, no abrir directamente el archivo

**Cámara no funciona**
- Debe usarse HTTPS o localhost
- Dar permisos de cámara en el navegador

---

**Desarrollado para Office Depot Costa Rica**
