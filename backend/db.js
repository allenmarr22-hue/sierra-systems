const fs = require('fs');
const path = require('path');

// Guardar los métodos originales de fs para el bypass
const originalReadFile = fs.readFile;
const originalReadFileSync = fs.readFileSync;
const originalWriteFile = fs.writeFile;
const originalWriteFileSync = fs.writeFileSync;

const dataFilePath = path.resolve(__dirname, 'data.json');

// Detectar variables de entorno de MySQL en Railway o entornos locales
const useMySQL = !!(
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL ||
    process.env.MYSQLHOST ||
    process.env.MYSQL_PRIVATE_URL
);

let pool = null;
let isInitialized = false;
let inMemoryState = null;

if (useMySQL) {
    const mysql = require('mysql2/promise');
    const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PRIVATE_URL;

    console.log('[DB-Adapter] ℹ️ Conexión MySQL detectada. Configurando pool...');
    
    if (connectionUri) {
        pool = mysql.createPool(connectionUri);
    } else {
        pool = mysql.createPool({
            host: process.env.MYSQLHOST,
            port: parseInt(process.env.MYSQLPORT || '3306', 10),
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLDATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    // Arrancar la inicialización de inmediato en segundo plano
    ensureInitialized();
} else {
    console.log('[DB-Adapter] 📁 Usando base de datos plana local (data.json).');
    isInitialized = true;
}

// Inicialización asíncrona de la base de datos
async function ensureInitialized() {
    if (isInitialized) return;
    try {
        console.log('[DB-Adapter] 🔄 Inicializando conexión con MySQL...');
        
        // Crear tabla para serializar el estado en un registro LONGTEXT
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sierra_systems_state (
                id INT PRIMARY KEY,
                db_json LONGTEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Leer el estado actual
        const [rows] = await pool.query('SELECT db_json FROM sierra_systems_state WHERE id = 1');
        
        if (rows.length > 0) {
            inMemoryState = JSON.parse(rows[0].db_json);
            console.log('[DB-Adapter] 🟢 Base de datos MySQL sincronizada e importada con éxito.');
        } else {
            console.log('[DB-Adapter] ⚠️ MySQL vacío. Migrando datos locales iniciales...');
            let defaultData = {
                config: {
                    companyName: "AS Sierra Systems",
                    adminUser: "admin",
                    adminPass: "123456",
                    adminName: "Allenmar"
                },
                businesses: [],
                modules: [
                    { id: "agenda", name: "Agenda de Citas", price: "$ 95.000", status: "active" },
                    { id: "menu_comida", name: "Menú Digital", price: "$ 50.000", status: "active" }
                ],
                users: [],
                notifications: []
            };

            // Intentar leer el data.json local si existe para migrarlo
            try {
                if (originalReadFileSync && fs.existsSync(dataFilePath)) {
                    const localData = originalReadFileSync(dataFilePath, 'utf8');
                    defaultData = JSON.parse(localData);
                    console.log('[DB-Adapter] 📤 Migración exitosa de data.json local a MySQL Railway.');
                }
            } catch (err) {
                console.warn('[DB-Adapter] ⚠️ No se pudo migrar el archivo local, usando configuración inicial por defecto.');
            }

            await pool.query(
                'INSERT INTO sierra_systems_state (id, db_json) VALUES (?, ?)',
                [1, JSON.stringify(defaultData)]
            );
            inMemoryState = defaultData;
            console.log('[DB-Adapter] 🟢 Registro de estado inicial creado en MySQL Railway.');
        }
        isInitialized = true;
    } catch (error) {
        console.error('[DB-Adapter] ❌ Error crítico inicializando MySQL:', error.message);
        console.log('[DB-Adapter] ⚠️ Cayendo de forma segura en almacenamiento local (data.json)...');
        isInitialized = true; // Continuar en local
    }
}

// Helper para esperar la inicialización de MySQL si aún está conectando
async function waitForInit() {
    if (!useMySQL) return;
    let attempts = 0;
    while (!isInitialized && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
    }
}

// ============================================================
// VIRTUAL FILE SYSTEM HOOKS (Interceptores Transparentes)
// ============================================================

// Interceptar Lectura Síncrona
fs.readFileSync = function (file, options) {
    const resolvedPath = path.resolve(file);
    if (resolvedPath === dataFilePath && useMySQL) {
        if (inMemoryState) {
            return typeof options === 'string' || (options && options.encoding)
                ? JSON.stringify(inMemoryState, null, 4)
                : Buffer.from(JSON.stringify(inMemoryState, null, 4), 'utf-8');
        } else {
            // Intento síncrono fallback
            console.warn('[DB-Adapter] ⚠️ Lectura síncrona antes de iniciar MySQL. Usando archivo local.');
        }
    }
    return originalReadFileSync.apply(this, arguments);
};

// Interceptar Lectura Asíncrona
fs.readFile = function (file, options, callback) {
    let cb = callback;
    let opt = options;
    if (typeof options === 'function') {
        cb = options;
        opt = {};
    }

    const resolvedPath = path.resolve(file);
    if (resolvedPath === dataFilePath && useMySQL) {
        waitForInit().then(() => {
            if (inMemoryState) {
                const dataStr = JSON.stringify(inMemoryState, null, 4);
                cb(null, typeof opt === 'string' || (opt && opt.encoding) ? dataStr : Buffer.from(dataStr, 'utf-8'));
            } else {
                originalReadFile(file, opt, cb);
            }
        }).catch(err => {
            console.error('[DB-Adapter] Error esperando inicialización:', err);
            originalReadFile(file, opt, cb);
        });
        return;
    }
    return originalReadFile.apply(this, arguments);
};

// Interceptar Escritura Síncrona (Guardado en caché + background MySQL update)
fs.writeFileSync = function (file, data, options) {
    const resolvedPath = path.resolve(file);
    if (resolvedPath === dataFilePath && useMySQL) {
        try {
            inMemoryState = JSON.parse(data);
            // Escribir en la base de datos de manera no bloqueante en segundo plano
            pool.query('UPDATE sierra_systems_state SET db_json = ? WHERE id = 1', [data])
                .catch(err => console.error('[DB-Adapter] ❌ Error persistiendo en MySQL (síncrono wrapper):', err.message));
            return;
        } catch (e) {
            console.error('[DB-Adapter] Error parseando datos para guardar:', e.message);
        }
    }
    return originalWriteFileSync.apply(this, arguments);
};

// Interceptar Escritura Asíncrona
fs.writeFile = function (file, data, options, callback) {
    let cb = callback;
    let opt = options;
    if (typeof options === 'function') {
        cb = options;
        opt = {};
    }

    const resolvedPath = path.resolve(file);
    if (resolvedPath === dataFilePath && useMySQL) {
        try {
            inMemoryState = JSON.parse(data);
            pool.query('UPDATE sierra_systems_state SET db_json = ? WHERE id = 1', [data])
                .then(() => {
                    if (cb) cb(null);
                })
                .catch(err => {
                    console.error('[DB-Adapter] ❌ Error persistiendo en MySQL (asíncrono wrapper):', err.message);
                    if (cb) cb(err);
                });
            return;
        } catch (e) {
            console.error('[DB-Adapter] Error parseando datos para guardar:', e.message);
            if (cb) cb(e);
            return;
        }
    }
    return originalWriteFile.apply(this, arguments);
};

console.log('[DB-Adapter] 🛡️ Hook de Sistema de Archivos Virtuales Activado para data.json.');
