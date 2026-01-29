// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Inventario
// Procesa archivos Excel/CSV de NetSuite y clasifica productos
// CORREGIDO: Usa categorías reales sin normalización
// ═══════════════════════════════════════════════════════════════

import db from '../config/dexie-db.js';
import supabase from '../config/supabase.js';

export const InventoryModel = {
    rawItems: [],
    categories: new Map(),
    stats: {
        total: 0,
        highPriority: 0,
        lowPriority: 0,
        totalValue: 0,
        categories: 0
    },

    // ═══════════════════════════════════════════════════════════
    // PROCESAR ARCHIVO EXCEL/CSV
    // ═══════════════════════════════════════════════════════════
    async processFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject('No se proporcionó archivo');
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Tomar primera hoja
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Convertir a JSON
                    const json = XLSX.utils.sheet_to_json(worksheet, { 
                        defval: '',
                        raw: false 
                    });
                    
                    if (json.length === 0) {
                        reject('El archivo está vacío');
                        return;
                    }

                    console.log(`✓ Archivo leído: ${json.length} filas`);

                    // Detectar y mapear columnas
                    const mappedData = this.mapColumns(json);
                    
                    // Limpiar y clasificar
                    this.rawItems = this.cleanAndClassify(mappedData);
                    
                    // Guardar en Dexie
                    await this.saveToLocal();
                    
                    // Subir a Supabase si hay conexión
                    if (navigator.onLine) {
                        await this.syncToCloud();
                    }

                    resolve({
                        items: this.rawItems,
                        stats: this.stats,
                        categories: Array.from(this.categories.entries())
                    });

                } catch (error) {
                    console.error('Error procesando archivo:', error);
                    reject('Error procesando el archivo: ' + error.message);
                }
            };

            reader.onerror = () => reject('Error al leer el archivo');
            reader.readAsArrayBuffer(file);
        });
    },

    // Alias para compatibilidad
    async processExcel(file) {
        return this.processFile(file);
    },

    // ═══════════════════════════════════════════════════════════
    // MAPEAR COLUMNAS (detecta diferentes formatos)
    // ═══════════════════════════════════════════════════════════
    mapColumns(data) {
        // Posibles nombres de columnas de NetSuite
        const columnMappings = {
            upc: ['CODIGO UPC', 'UPC', 'CODIGO_UPC', 'COD UPC', 'BARCODE', 'EAN'],
            sku: ['CODIGO SKU', 'SKU', 'CODIGO_SKU', 'COD SKU', 'ITEM', 'CODIGO'],
            descripcion: ['DESCRIPCION', 'DESCRIPTION', 'DESC', 'NOMBRE', 'NAME', 'PRODUCTO'],
            stock: ['EXISTENCIA', 'STOCK', 'CANTIDAD', 'QTY', 'INVENTORY', 'DISPONIBLE', 'ON HAND'],
            precio: ['PRECIO FINAL', 'PRECIO', 'PRICE', 'PRECIO VENTA', 'PVP', 'UNIT PRICE'],
            costo: ['COSTO', 'COST', 'COSTO UNITARIO', 'UNIT COST', 'AVG COST'],
            categoria: ['CATEGORIA', 'CATEGORY', 'DEPARTAMENTO', 'DEPARTMENT', 'CLASE', 'CLASS'],
            estatus: ['ESTATUS', 'STATUS', 'ESTADO', 'ACTIVO'],
            tipo: ['TIPO', 'TYPE'],
            ubicacion: ['UBICACION', 'LOCATION', 'BIN', 'LOCALIZACION']
        };

        // Obtener las columnas del archivo
        const fileColumns = Object.keys(data[0] || {});
        
        // Encontrar coincidencias
        const columnMap = {};
        for (const [field, possibleNames] of Object.entries(columnMappings)) {
            for (const col of fileColumns) {
                const normalizedCol = col.toUpperCase().trim();
                if (possibleNames.some(name => normalizedCol.includes(name) || name.includes(normalizedCol))) {
                    columnMap[field] = col;
                    break;
                }
            }
        }

        console.log('Columnas mapeadas:', columnMap);

        // Transformar datos
        return data.map(row => ({
            upc: String(row[columnMap.upc] || '').trim(),
            sku: String(row[columnMap.sku] || '').trim(),
            descripcion: String(row[columnMap.descripcion] || 'SIN DESCRIPCIÓN').trim(),
            stock_sistema: parseInt(row[columnMap.stock]) || 0,
            precio: parseFloat(String(row[columnMap.precio] || '0').replace(/[^0-9.-]/g, '')) || 0,
            costo: parseFloat(String(row[columnMap.costo] || '0').replace(/[^0-9.-]/g, '')) || 0,
            categoria_raw: String(row[columnMap.categoria] || '').trim(),
            estatus: String(row[columnMap.estatus] || 'ACTIVO').trim().toUpperCase(),
            tipo: String(row[columnMap.tipo] || '').trim(),
            ubicacion_inicial: String(row[columnMap.ubicacion] || '').trim()
        }));
    },

    // ═══════════════════════════════════════════════════════════
    // LIMPIAR Y CLASIFICAR (SIN normalización de categorías)
    // ═══════════════════════════════════════════════════════════
    cleanAndClassify(data) {
        // Filtrar items válidos (con UPC o SKU)
        const validItems = data.filter(item => item.upc || item.sku);

        // Calcular valor total para clasificación ABC
        const totalValue = validItems.reduce((acc, item) => {
            return acc + (item.stock_sistema * item.precio);
        }, 0);

        // Ordenar por valor (mayor a menor)
        const sortedData = [...validItems].sort((a, b) => {
            const valA = a.stock_sistema * a.precio;
            const valB = b.stock_sistema * b.precio;
            return valB - valA;
        });

        let accumulatedValue = 0;
        let highPriorityCount = 0;
        this.categories.clear();

        const classifiedItems = sortedData.map((item, index) => {
            // ═══════════════════════════════════════════════════════
            // CATEGORÍA: Primera palabra de la descripción (SIN NORMALIZAR)
            // ═══════════════════════════════════════════════════════
            let categoria = item.categoria_raw;
            if (!categoria) {
                // Tomar la primera palabra de la descripción
                categoria = item.descripcion.split(' ')[0].toUpperCase();
            }
            
            // Limpiar caracteres especiales pero NO normalizar
            categoria = categoria.replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, '').trim();
            if (!categoria) categoria = 'GENERAL';

            // Contar por categoría
            this.categories.set(categoria, (this.categories.get(categoria) || 0) + 1);

            // Calcular valor del item
            const itemValue = item.stock_sistema * item.precio;
            accumulatedValue += itemValue;

            // Clasificación ABC (70/30) - REMOVIDO del resumen según instrucciones
            const isHighPriority = accumulatedValue <= (totalValue * 0.70);
            if (isHighPriority) highPriorityCount++;

            // Generar UPC si no tiene
            const finalUpc = item.upc || `GEN-${item.sku || index}`;

            return {
                upc: finalUpc,
                sku: item.sku || `SKU-${index}`,
                descripcion: item.descripcion,
                categoria_id: categoria,
                categoria: categoria,
                stock_sistema: item.stock_sistema,
                precio: item.precio,
                costo: item.costo || item.precio * 0.6,
                valor_inventario: itemValue,
                prioridad: isHighPriority ? 'A' : 'B',
                estatus: item.estatus,
                tipo: item.tipo,
                ubicacion: item.ubicacion_inicial || null,
                conteo: null,
                ultima_actualizacion: new Date().toISOString()
            };
        });

        // Actualizar estadísticas
        this.stats = {
            total: classifiedItems.length,
            highPriority: highPriorityCount,
            lowPriority: classifiedItems.length - highPriorityCount,
            totalValue: totalValue,
            categories: this.categories.size
        };

        console.log(`✓ Clasificación completada:`, this.stats);
        console.log(`✓ Categorías detectadas:`, Array.from(this.categories.entries()));

        return classifiedItems;
    },

    // ═══════════════════════════════════════════════════════════
    // GUARDAR EN DEXIE (LOCAL)
    // ═══════════════════════════════════════════════════════════
    async saveToLocal() {
        try {
            // Limpiar tabla anterior
            await db.productos.clear();
            
            // Insertar nuevos productos
            await db.productos.bulkPut(this.rawItems);
            
            console.log(`✓ ${this.rawItems.length} productos guardados localmente`);
            return true;
        } catch (err) {
            console.error('Error guardando en Dexie:', err);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAR CON SUPABASE
    // ═══════════════════════════════════════════════════════════
    async syncToCloud() {
        try {
            // Subir en lotes de 100 (más seguro)
            const batchSize = 100;
            const batches = [];
            
            for (let i = 0; i < this.rawItems.length; i += batchSize) {
                batches.push(this.rawItems.slice(i, i + batchSize));
            }

            let totalInserted = 0;

            for (const batch of batches) {
                const { error } = await supabase
                    .from('productos')
                    .upsert(batch.map(p => ({
                        upc: p.upc,
                        sku: p.sku,
                        descripcion: p.descripcion,
                        stock_sistema: p.stock_sistema,
                        precio: p.precio,
                        costo: p.costo,
                        prioridad: p.prioridad,
                        estatus: p.estatus,
                        tipo: p.tipo
                    })), { onConflict: 'upc' });

                if (error) {
                    console.warn('Error en batch:', error.message);
                } else {
                    totalInserted += batch.length;
                }
            }

            console.log(`✓ ${totalInserted} productos sincronizados con Supabase`);
            return true;
        } catch (err) {
            console.error('Error sincronizando con Supabase:', err);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // BUSCAR PRODUCTO
    // ═══════════════════════════════════════════════════════════
    async findProduct(code) {
        const cleanCode = String(code).trim().toUpperCase();
        
        // Buscar en local primero
        let producto = await db.productos.where('upc').equals(cleanCode).first();
        
        if (!producto) {
            producto = await db.productos.where('sku').equals(cleanCode).first();
        }

        // Si no está local y hay conexión, buscar en Supabase
        if (!producto && navigator.onLine) {
            const { data } = await supabase
                .from('productos')
                .select('*')
                .or(`upc.eq.${cleanCode},sku.eq.${cleanCode}`)
                .single();
            producto = data;
        }

        return producto;
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER PRODUCTOS POR CATEGORÍA
    // ═══════════════════════════════════════════════════════════
    async getByCategory(categoriaId) {
        return await db.productos
            .where('categoria_id')
            .equals(categoriaId)
            .toArray();
    },

    // ═══════════════════════════════════════════════════════════
    // OBTENER CATEGORÍAS CON CONTEOS
    // ═══════════════════════════════════════════════════════════
    async getCategories() {
        const productos = await db.productos.toArray();
        const cats = new Map();
        
        productos.forEach(p => {
            const cat = p.categoria_id || p.categoria || 'GENERAL';
            if (!cats.has(cat)) {
                cats.set(cat, { count: 0, existencia: 0, valor: 0 });
            }
            const catData = cats.get(cat);
            catData.count++;
            catData.existencia += p.stock_sistema || 0;
            catData.valor += (p.stock_sistema || 0) * (p.precio || 0);
        });

        return Array.from(cats.entries()).map(([nombre, data]) => ({
            id: nombre,
            nombre: nombre,
            productos_count: data.count,
            existencia_total: data.existencia,
            valor_total: data.valor
        })).sort((a, b) => b.productos_count - a.productos_count);
    },

    // ═══════════════════════════════════════════════════════════
    // EXPORTAR A CSV
    // ═══════════════════════════════════════════════════════════
    exportToCSV(items, filename = 'zengo_export.csv') {
        const headers = ['UPC', 'SKU', 'DESCRIPCION', 'CATEGORIA', 'STOCK_SISTEMA', 'CONTEO', 'DIFERENCIA', 'PRECIO', 'PRIORIDAD'];
        
        const csvContent = [
            headers.join(','),
            ...items.map(item => [
                item.upc,
                item.sku,
                `"${(item.descripcion || '').replace(/"/g, '""')}"`,
                item.categoria_id,
                item.stock_sistema,
                item.conteo || 0,
                (item.conteo || 0) - item.stock_sistema,
                item.precio,
                item.prioridad
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    },

    // ═══════════════════════════════════════════════════════════
    // ESTADÍSTICAS
    // ═══════════════════════════════════════════════════════════
    getStats() {
        return this.stats;
    }
};

// Exponer al window
window.InventoryModel = InventoryModel;