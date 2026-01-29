// ═══════════════════════════════════════════════════════════════
// ZENGO - Configuración Dexie (IndexedDB)
// Base de datos local para funcionamiento offline
// ═══════════════════════════════════════════════════════════════

import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/+esm';

const db = new Dexie('ZengoDB');

// Definir esquema de tablas
db.version(2).stores({
    // Productos del inventario
    productos: '++id, upc, sku, descripcion, categoria_id, stock_sistema, precio, tipo, estatus, prioridad, synced',
    
    // Tareas asignadas a auxiliares
    tareas: 'id, categoria, auxiliar_id, estado, fecha_asignacion',
    
    // Hallazgos reportados por auxiliares
    hallazgos: '++id, upc, auxiliar_id, tarea_id, estado, timestamp',
    
    // Conteos individuales (histórico)
    conteos: '++id, upc, cantidad, ubicacion, auxiliar_id, tarea_id, timestamp, synced',
    
    // Ubicaciones históricas
    ubicaciones: '++id, upc, ubicacion, timestamp',
    
    // Cola de sincronización
    sync_queue: '++id, tabla, accion, datos, timestamp'
});

// Migración de versión 1 a 2
db.version(1).stores({
    productos: '++id, upc, sku, descripcion, categoria_id, stock_sistema, precio, synced',
    conteos: '++id, upc, cantidad, ubicacion, auxiliar_id, timestamp, synced',
    ubicaciones: '++id, upc, ubicacion, timestamp',
    sync_queue: '++id, tabla, accion, datos, timestamp'
});

// Hooks para debugging
db.on('ready', () => {
    console.log('✓ Dexie: Base de datos lista');
});

db.on('blocked', () => {
    console.warn('⚠ Dexie: Base de datos bloqueada');
});

// Métodos helper
db.clearAll = async function() {
    await db.productos.clear();
    await db.tareas.clear();
    await db.hallazgos.clear();
    await db.conteos.clear();
    await db.ubicaciones.clear();
    await db.sync_queue.clear();
    console.log('✓ Dexie: Todas las tablas limpiadas');
};

db.getStats = async function() {
    return {
        productos: await db.productos.count(),
        tareas: await db.tareas.count(),
        hallazgos: await db.hallazgos.count(),
        conteos: await db.conteos.count(),
        ubicaciones: await db.ubicaciones.count(),
        sync_queue: await db.sync_queue.count()
    };
};

export default db;
