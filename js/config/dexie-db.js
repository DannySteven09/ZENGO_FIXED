// ═══════════════════════════════════════════════════════════════
// ZENGO - Base de Datos Local (Dexie.js / IndexedDB)
// Persistencia Offline para Conteos Cíclicos
// ═══════════════════════════════════════════════════════════════

const db = new Dexie("ZengoDB");

// Schema de la base de datos local
db.version(1).stores({
    // Productos del catálogo (se sincroniza desde Supabase)
    productos: 'sku, upc, descripcion, categoria_id, precio, costo, stock_sistema',
    
    // Conteos realizados (pendientes de sincronizar)
    conteos: '++id, tarea_id, producto_sku, upc, cantidad_contada, ubicacion, timestamp, sync_status, auxiliar_id',
    
    // Historial de ubicaciones (Modo Consulta)
    ubicaciones_historico: 'upc, *ubicaciones, ultima_actualizacion',
    
    // Tareas asignadas al auxiliar
    tareas: 'id, titulo, categoria, estado, fecha_asignacion, productos_total',
    
    // Hallazgos reportados (pendientes de sincronizar)
    hallazgos: '++id, upc, descripcion, cantidad, ubicacion, foto_base64, timestamp, sync_status, auxiliar_id',
    
    // Cola de sincronización
    sync_queue: '++id, tabla, registro_id, accion, timestamp, intentos'
});

// ═══════════════════════════════════════════════════════════════
// MÉTODOS HELPER
// ═══════════════════════════════════════════════════════════════

// Guardar conteo con estado pendiente
db.guardarConteo = async function(conteo) {
    return await this.conteos.add({
        ...conteo,
        timestamp: new Date().toISOString(),
        sync_status: 'pending'
    });
};

// Obtener conteos pendientes de sincronizar
db.getPendientes = async function() {
    return await this.conteos.where('sync_status').equals('pending').toArray();
};

// Marcar como sincronizado
db.marcarSincronizado = async function(id) {
    return await this.conteos.update(id, { sync_status: 'synced' });
};

// Guardar ubicación en histórico
db.actualizarUbicacion = async function(upc, nuevaUbicacion) {
    const registro = await this.ubicaciones_historico.get(upc);
    if (registro) {
        const ubicaciones = registro.ubicaciones || [];
        if (!ubicaciones.includes(nuevaUbicacion)) {
            ubicaciones.push(nuevaUbicacion);
        }
        return await this.ubicaciones_historico.update(upc, { 
            ubicaciones, 
            ultima_actualizacion: new Date().toISOString() 
        });
    } else {
        return await this.ubicaciones_historico.add({
            upc,
            ubicaciones: [nuevaUbicacion],
            ultima_actualizacion: new Date().toISOString()
        });
    }
};

// Obtener histórico de ubicaciones
db.getUbicaciones = async function(upc) {
    const registro = await this.ubicaciones_historico.get(upc);
    return registro ? registro.ubicaciones : [];
};

// Limpiar datos antiguos (más de 7 días sincronizados)
db.limpiarAntiguos = async function() {
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return await this.conteos
        .where('sync_status').equals('synced')
        .and(c => c.timestamp < hace7Dias)
        .delete();
};

export default db;