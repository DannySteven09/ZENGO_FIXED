// ═══════════════════════════════════════════════════════════════
// ZENGO - Modelo de Inventario
// Procesa archivos Excel de NetSuite
// Categoría = Primera palabra de DESCRIPCION
// ═══════════════════════════════════════════════════════════════

const InventoryModel = {
    rawItems: [],
    categories: new Map(),
    stats: {
        total: 0,
        totalValue: 0,
        categories: 0
    },

    // ═══════════════════════════════════════════════════════════
    // PROCESAR ARCHIVO EXCEL
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
                    
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    const json = XLSX.utils.sheet_to_json(worksheet, { 
                        defval: '',
                        raw: false 
                    });
                    
                    if (json.length === 0) {
                        reject('El archivo está vacío');
                        return;
                    }

                    console.log('✓ Archivo leído:', json.length, 'filas');
                    console.log('Columnas:', Object.keys(json[0]));

                    const mappedData = this.mapColumns(json);
                    this.rawItems = this.processItems(mappedData);
                    
                    const syncResult = await this.saveToBoth();

                    resolve({
                        items: this.rawItems,
                        stats: this.stats,
                        categories: Array.from(this.categories.entries()),
                        syncResult: syncResult
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

    async processExcel(file) {
        return this.processFile(file);
    },

    // ═══════════════════════════════════════════════════════════
    // MAPEAR COLUMNAS DEL EXCEL
    // ═══════════════════════════════════════════════════════════
    mapColumns(data) {
        const columnMappings = {
            upc: ['CODIGO UPC', 'UPC', 'CODIGO_UPC'],
            sku: ['CODIGO SKU', 'SKU', 'CODIGO_SKU'],
            descripcion: ['DESCRIPCION', 'DESCRIPTION', 'DESC'],
            existencia: ['EXISTENCIA', 'STOCK', 'CANTIDAD', 'QTY'],
            precio: ['PRECIO FINAL', 'PRECIO', 'PRICE'],
            estatus: ['ESTATUS', 'STATUS'],
            tipo: ['TIPO', 'TYPE']
        };

        const fileColumns = Object.keys(data[0] || {});
        
        const columnMap = {};
        for (const [field, possibleNames] of Object.entries(columnMappings)) {
            for (const col of fileColumns) {
                const normalizedCol = col.toUpperCase().trim();
                if (possibleNames.some(name => normalizedCol === name || normalizedCol.includes(name))) {
                    columnMap[field] = col;
                    break;
                }
            }
        }

        console.log('Columnas mapeadas:', columnMap);

        return data.map(row => ({
            upc: String(row[columnMap.upc] || '').trim(),
            sku: String(row[columnMap.sku] || '').trim(),
            descripcion: String(row[columnMap.descripcion] || '').trim(),
            existencia: parseInt(row[columnMap.existencia]) || 0,
            precio: parseFloat(String(row[columnMap.precio] || '0').replace(/[^0-9.-]/g, '')) || 0,
            estatus: String(row[columnMap.estatus] || '').trim(),
            tipo: String(row[columnMap.tipo] || '').trim()
        }));
    },

    // ═══════════════════════════════════════════════════════════
    // PROCESAR ITEMS - Categoría = Primera palabra de descripción
    // ═══════════════════════════════════════════════════════════
    processItems(data) {
        const validItems = data.filter(item => item.upc && item.descripcion);
        
        this.categories.clear();
        let totalValue = 0;

        const processedItems = validItems.map((item, index) => {
            // CATEGORIA = Primera palabra de DESCRIPCION
            const categoria = this.extraerCategoria(item.descripcion);
            
            if (!this.categories.has(categoria)) {
                this.categories.set(categoria, 0);
            }
            this.categories.set(categoria, this.categories.get(categoria) + 1);

            const valor = item.existencia * item.precio;
            totalValue += valor;

            return {
                id: index + 1,
                upc: item.upc,
                sku: item.sku,
                descripcion: item.descripcion,
                categoria: categoria,
                existencia: item.existencia,
                precio: item.precio,
                valor: valor,
                estatus: item.estatus,
                tipo: item.tipo
            };
        });

        this.stats = {
            total: processedItems.length,
            totalValue: totalValue,
            categories: this.categories.size
        };

        console.log('✓ Productos procesados:', this.stats.total);
        console.log('✓ Categorías:', this.stats.categories);

        return processedItems;
    },

    // ═══════════════════════════════════════════════════════════
    // EXTRAER CATEGORIA - Primera palabra de descripción
    // ═══════════════════════════════════════════════════════════
    extraerCategoria(descripcion) {
        if (!descripcion) return 'GENERAL';
        
        const palabras = descripcion.trim().split(/\s+/);
        let categoria = palabras[0] || 'GENERAL';
        
        categoria = categoria.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, '');
        
        return categoria || 'GENERAL';
    },

    // ═══════════════════════════════════════════════════════════
    // GUARDAR EN SUPABASE + DEXIE (con confirmación real)
    // ═══════════════════════════════════════════════════════════
    async saveToBoth() {
        const result = { supabaseOk: false, dexieOk: false, supabaseCount: 0, dexieCount: 0 };

        // --- PASO 1: Supabase ---
        try {
            if (navigator.onLine && window.supabaseClient) {
                // Limpiar tabla remota antes de insertar
                await window.supabaseClient.from('productos').delete().neq('id', 0);

                // Preparar datos para Supabase (sin campo 'id' — lo genera Supabase)
                const registros = this.rawItems.map(item => ({
                    upc: item.upc,
                    sku: item.sku,
                    descripcion: item.descripcion,
                    categoria: item.categoria,
                    existencia: item.existencia,
                    precio: item.precio,
                    valor: item.valor,
                    estatus: item.estatus,
                    tipo: item.tipo
                }));

                // Insertar en lotes de 100
                const BATCH_SIZE = 100;
                let insertados = 0;

                for (let i = 0; i < registros.length; i += BATCH_SIZE) {
                    const lote = registros.slice(i, i + BATCH_SIZE);
                    const { data, error } = await window.supabaseClient
                        .from('productos')
                        .insert(lote)
                        .select();

                    if (error) {
                        console.error('Error Supabase lote', i, ':', error.message);
                        throw error;
                    }
                    insertados += (data ? data.length : lote.length);
                }

                result.supabaseOk = true;
                result.supabaseCount = insertados;
                console.log('✓ Supabase: insertados', insertados, 'productos');
            }
        } catch (err) {
            console.error('✗ Error guardando en Supabase:', err);
            result.supabaseOk = false;
        }

        // --- PASO 2: Dexie (local) ---
        try {
            if (!window.db || !window.db.productos) {
                console.error('Dexie no disponible');
            } else {
                await window.db.productos.clear();
                await window.db.productos.bulkPut(this.rawItems);
                const count = await window.db.productos.count();
                result.dexieOk = count > 0;
                result.dexieCount = count;
                console.log('✓ Dexie: guardados', count, 'productos');
            }
        } catch (err) {
            console.error('✗ Error guardando en Dexie:', err);
            result.dexieOk = false;
        }

        return result;
    },

    // ═══════════════════════════════════════════════════════════
    // CONSULTAS
    // ═══════════════════════════════════════════════════════════
    async getProductos() {
        try {
            if (!window.db) return [];
            return await window.db.productos.toArray();
        } catch (err) {
            return [];
        }
    },

    async getProductoByUpc(upc) {
        try {
            if (!window.db) return null;
            return await window.db.productos.where('upc').equals(upc).first();
        } catch (err) {
            return null;
        }
    },

    async buscarProducto(termino) {
        try {
            if (!window.db) return [];
            const productos = await window.db.productos.toArray();
            const t = termino.toUpperCase();
            return productos.filter(p => 
                p.upc.includes(t) || 
                p.sku.toUpperCase().includes(t) || 
                p.descripcion.toUpperCase().includes(t)
            );
        } catch (err) {
            return [];
        }
    },

    async getCategorias() {
        try {
            if (!window.db) return [];
            
            const productos = await window.db.productos.toArray();
            if (productos.length === 0) return [];

            const cats = new Map();
            
            productos.forEach(p => {
                const cat = p.categoria || 'GENERAL';
                if (!cats.has(cat)) {
                    cats.set(cat, { 
                        nombre: cat, 
                        productos: [], 
                        existencia: 0
                    });
                }
                cats.get(cat).productos.push(p);
                cats.get(cat).existencia += p.existencia || 0;
            });

            return Array.from(cats.values()).sort((a, b) => b.productos.length - a.productos.length);
        } catch (err) {
            console.error('Error getCategorias:', err);
            return [];
        }
    },

    async getProductosPorCategoria(categoria) {
        try {
            if (!window.db) return [];
            const productos = await window.db.productos.toArray();
            return productos.filter(p => p.categoria === categoria);
        } catch (err) {
            return [];
        }
    }
};

window.InventoryModel = InventoryModel;
console.log('✓ InventoryModel cargado');
