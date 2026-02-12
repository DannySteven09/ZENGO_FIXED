// ═══════════════════════════════════════════════════════════════
// ZENGO - Configuración Dexie (IndexedDB)
// Base de datos local para funcionamiento offline
// Alineado con esquema Supabase (Feb 2026)
// ═══════════════════════════════════════════════════════════════

// Usar Dexie global del CDN
const db = new Dexie('ZengoDB');

// ═══════════════════════════════════════════════════════════════
// ESQUEMA v3 → v4: Alineación con Supabase real
// Cambios:
//   productos: categoria_id → categoria, stock_sistema → existencia
//              eliminados: prioridad, synced (no existen en Supabase)
//              agregados: valor, created_at
//   conteos:   agregado synced como campo (no índice)
//   usuarios:  ya estaba correcto desde v3
// ═══════════════════════════════════════════════════════════════
db.version(3).stores({
    productos: '++id, upc, sku, descripcion, categoria_id, stock_sistema, precio, tipo, estatus, prioridad, synced',
    tareas: 'id, categoria, auxiliar_id, estado, fecha_asignacion',
    hallazgos: '++id, upc, auxiliar_id, tarea_id, estado, timestamp',
    conteos: '++id, upc, cantidad, ubicacion, auxiliar_id, tarea_id, timestamp, synced',
    ubicaciones: '++id, upc, ubicacion, timestamp',
    sync_queue: '++id, tabla, accion, datos, timestamp',
    usuarios: 'id, email, nombre, apellido, role_id, activo, fecha_creacion'
});

db.version(4).stores({
    // Alineado con Supabase: productos(id, upc, sku, descripcion, categoria, existencia, precio, valor, estatus, tipo, created_at)
    productos: '++id, upc, sku, descripcion, categoria, existencia, precio, tipo, estatus',
    // Alineado con Supabase: tareas(id, categoria, auxiliar_id, auxiliar_nombre, productos_total, productos_contados, estado, ...)
    tareas: 'id, categoria, auxiliar_id, estado, fecha_asignacion',
    // Alineado con Supabase: hallazgos(id, upc, tipo, descripcion, cantidad, ubicacion, reportado_por, estado, ...)
    hallazgos: '++id, upc, auxiliar_id, tarea_id, estado, timestamp',
    // Alineado con Supabase: conteos_realizados (Dexie usa nombre corto "conteos")
    conteos: '++id, upc, cantidad, ubicacion, auxiliar_id, tarea_id, timestamp',
    // Alineado con Supabase: ubicaciones_historico
    ubicaciones: '++id, upc, ubicacion, timestamp',
    // Cola de sincronización (solo local)
    sync_queue: '++id, tabla, accion, datos, timestamp',
    // Alineado con Supabase: profiles
    usuarios: 'id, email, nombre, apellido, role_id, activo, fecha_creacion'
}).upgrade(tx => {
    // Migrar datos existentes de productos: renombrar campos
    return tx.table('productos').toCollection().modify(producto => {
        // Si tiene stock_sistema pero no existencia, migrar
        if (producto.stock_sistema !== undefined && producto.existencia === undefined) {
            producto.existencia = producto.stock_sistema;
        }
        // Si tiene categoria_id pero no categoria, migrar
        if (producto.categoria_id !== undefined && producto.categoria === undefined) {
            producto.categoria = producto.categoria_id;
        }
        // Limpiar campos obsoletos
        delete producto.stock_sistema;
        delete producto.categoria_id;
        delete producto.prioridad;
        delete producto.synced;
    });
});

// ═══════════════════════════════════════════════════════════════
// HOOKS DE DEBUG
// ═══════════════════════════════════════════════════════════════
db.on('ready', () => {
    console.log('✓ Dexie: Base de datos lista (v4)');
});

db.on('blocked', () => {
    console.warn('⚠ Dexie: Base de datos bloqueada');
});

// ═══════════════════════════════════════════════════════════════
// MÉTODOS HELPER (incluye usuarios)
// ═══════════════════════════════════════════════════════════════
db.clearAll = async function() {
    await db.productos.clear();
    await db.tareas.clear();
    await db.hallazgos.clear();
    await db.conteos.clear();
    await db.ubicaciones.clear();
    await db.sync_queue.clear();
    await db.usuarios.clear();
    console.log('✓ Dexie: Todas las tablas limpiadas (incluye usuarios)');
};

db.getStats = async function() {
    return {
        productos: await db.productos.count(),
        tareas: await db.tareas.count(),
        hallazgos: await db.hallazgos.count(),
        conteos: await db.conteos.count(),
        ubicaciones: await db.ubicaciones.count(),
        sync_queue: await db.sync_queue.count(),
        usuarios: await db.usuarios.count()
    };
};

// Exponer globalmente
window.db = db;