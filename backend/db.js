/**
 * ============================================================
 * db.js — AS Sierra Systems
 * ============================================================
 * Módulo de conexión a base de datos relacional MySQL.
 * Proporciona métodos optimizados para interactuar con tablas
 * estructuradas y relaciones de base de datos de manera eficiente.
 * ============================================================
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- HASHING DE CONTRASEÑAS SEGURO ---
function hashPassword(password) {
    if (!password) return '';
    // Si ya parece estar encriptada (formato salt:hash), no volver a encriptar
    if (password.includes(':') && password.split(':')[0].length === 32) {
        return password;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
    if (!storedValue) return false;
    if (!storedValue.includes(':')) {
        // Fallback para contraseñas de texto plano
        return password === storedValue;
    }
    const [salt, originalHash] = storedValue.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
}

// --- 1. CARGAR VARIABLES DE ENTORNO DESDE .ENV MANUALMENTE ---
function loadEnv() {
    const envPaths = [
        path.resolve(__dirname, '.env'),
        path.resolve(__dirname, '..', '.env'),
        path.resolve(process.cwd(), '.env')
    ];
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                envContent.split(/\r?\n/).forEach(line => {
                    const part = line.trim();
                    if (part && !part.startsWith('#')) {
                        const [key, ...valueParts] = part.split('=');
                        const val = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
                        if (key && process.env[key.trim()] === undefined) {
                            process.env[key.trim()] = val;
                        }
                    }
                });
                console.log(`[DB] 📁 Archivo .env cargado con éxito desde: ${envPath}`);
                break;
            } catch (e) {
                console.error(`[DB] ⚠️ Error al leer el archivo .env:`, e.message);
            }
        }
    }
}
loadEnv();

// --- 2. CONFIGURACIÓN DEL POOL DE CONEXIONES ---
const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PRIVATE_URL;
let pool = null;

try {
    if (connectionUri) {
        console.log('[DB] ℹ️ Conexión MySQL establecida mediante URI.');
        pool = mysql.createPool(connectionUri);
    } else if (process.env.MYSQLHOST) {
        console.log('[DB] ℹ️ Conexión MySQL establecida mediante Host individual.');
        pool = mysql.createPool({
            host: process.env.MYSQLHOST,
            port: parseInt(process.env.MYSQLPORT || '3306', 10),
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLDATABASE,
            waitForConnections: true,
            connectionLimit: 15,
            queueLimit: 0
        });
    } else {
        console.error('[DB] ❌ No se detectó ninguna variable de conexión de MySQL. Asegúrate de configurar MYSQLHOST o MYSQL_URL.');
        console.warn('[DB] ⚠️ Iniciando pool falso (localhost). Configure su base de datos.');
        pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'sierra_systems' });
    }
} catch (err) {
    console.error('[DB] ❌ Error inicializando pool de base de datos:', err.message);
}

// --- 3. INICIALIZACIÓN DE TABLAS (AUTO-MIGRACIÓN AL ARRANCAR) ---

/**
 * Crea todas las tablas necesarias si no existen.
 * Se ejecuta al arrancar el servidor para garantizar que la BD esté lista.
 */
async function initializeDatabase() {
    if (!pool) {
        console.error('[DB] ❌ No hay pool de conexión disponible. Omitiendo inicialización de tablas.');
        return;
    }
    try {
        console.log('[DB] 🛠️ Inicializando estructura de base de datos...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_config (
                id INT PRIMARY KEY DEFAULT 1,
                company_name VARCHAR(150) NOT NULL DEFAULT 'AS Sierra Systems',
                admin_user VARCHAR(100) NOT NULL DEFAULT 'admin',
                admin_pass VARCHAR(255) NOT NULL DEFAULT '123456',
                admin_name VARCHAR(150) NOT NULL DEFAULT 'Allenmar',
                logo LONGTEXT NULL,
                CONSTRAINT chk_single_row CHECK (id = 1)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT PRIMARY KEY,
                user VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(150) NOT NULL,
                pass VARCHAR(255) NOT NULL,
                name VARCHAR(150) NOT NULL,
                role VARCHAR(100) NOT NULL DEFAULT 'Admin',
                status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS modules (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                \`desc\` TEXT NULL,
                icon VARCHAR(100) NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                price VARCHAR(50) NOT NULL DEFAULT '$ 0',
                url VARCHAR(255) NULL,
                admin_url VARCHAR(255) NULL,
                video_url VARCHAR(255) NULL,
                image VARCHAR(255) NULL
            )
        `);

        // Modificar columna status de modules para soportar todos los estados (coming_soon, maintenance, hidden, etc)
        try {
            await pool.query("ALTER TABLE modules MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'");
        } catch (alterErr) {
            console.log('[DB] Columna status de modules ya modificada o error al alterar:', alterErr.message);
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                id BIGINT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                type VARCHAR(100) NOT NULL,
                status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                city VARCHAR(100) NULL,
                nit VARCHAR(100) NULL,
                phone VARCHAR(100) NULL,
                address VARCHAR(255) NULL,
                client_email VARCHAR(150) NOT NULL UNIQUE,
                client_pass VARCHAR(255) NOT NULL,
                owner_name VARCHAR(150) NULL,
                registration_source VARCHAR(100) NULL DEFAULT 'admin',
                avatar_url VARCHAR(255) NULL,
                gateway_token VARCHAR(255) NULL,
                last_four VARCHAR(4) NULL,
                card_brand VARCHAR(50) NULL,
                subscription_status ENUM('pending', 'active', 'suspended', 'cancelled') NOT NULL DEFAULT 'pending',
                next_billing_date DATE NULL,
                last_payment_date VARCHAR(100) NULL,
                last_payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                last_failed_attempt VARCHAR(100) NULL,
                last_transaction_id VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migración dinámica segura: agregar columnas si no existen en la tabla businesses
        const [configColumns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_config'
        `);
        const existingConfigColumns = configColumns.map(c => (c.COLUMN_NAME || c.column_name || '').toLowerCase());
        
        if (!existingConfigColumns.includes('support_email')) {
            await pool.query('ALTER TABLE system_config ADD COLUMN support_email VARCHAR(150) NULL DEFAULT "soporte@assierrasystems.com"');
            console.log('[DB] 🛠️ Column "support_email" added to "system_config" table.');
        }
        if (!existingConfigColumns.includes('support_phone')) {
            await pool.query('ALTER TABLE system_config ADD COLUMN support_phone VARCHAR(100) NULL DEFAULT "573001234567"');
            console.log('[DB] 🛠️ Column "support_phone" added to "system_config" table.');
        }

        const [bizColumns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses'
        `);
        const existingBizColumns = bizColumns.map(c => (c.COLUMN_NAME || c.column_name || '').toLowerCase());
        
        if (!existingBizColumns.includes('nit')) {
            await pool.query('ALTER TABLE businesses ADD COLUMN nit VARCHAR(100) NULL');
            console.log('[DB] 🛠️ Column "nit" added to "businesses" table.');
        }
        if (!existingBizColumns.includes('phone')) {
            await pool.query('ALTER TABLE businesses ADD COLUMN phone VARCHAR(100) NULL');
            console.log('[DB] 🛠️ Column "phone" added to "businesses" table.');
        }
        if (!existingBizColumns.includes('address')) {
            await pool.query('ALTER TABLE businesses ADD COLUMN address VARCHAR(255) NULL');
            console.log('[DB] 🛠️ Column "address" added to "businesses" table.');
        }
        if (!existingBizColumns.includes('owner_name')) {
            await pool.query('ALTER TABLE businesses ADD COLUMN owner_name VARCHAR(150) NULL');
            console.log('[DB] 🛠️ Column "owner_name" added to "businesses" table.');
        }
        if (!existingBizColumns.includes('registration_source')) {
            await pool.query('ALTER TABLE businesses ADD COLUMN registration_source VARCHAR(100) NULL DEFAULT "admin"');
            console.log('[DB] 🛠️ Column "registration_source" added to "businesses" table.');
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_modules (
                instance_id VARCHAR(100) PRIMARY KEY,
                business_id BIGINT NOT NULL,
                module_id VARCHAR(50) NOT NULL,
                branch_name VARCHAR(150) NULL,
                status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
                price_applied DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                cancelled_at VARCHAR(100) NULL,
                access_until VARCHAR(100) NULL,
                renewal_date VARCHAR(100) NULL,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id BIGINT PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                \`desc\` TEXT NOT NULL,
                icon VARCHAR(100) NULL,
                color VARCHAR(20) NULL,
                created_at VARCHAR(100) NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_history (
                id VARCHAR(100) PRIMARY KEY,
                business_id BIGINT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                \`desc\` VARCHAR(255) NULL,
                status VARCHAR(50) NOT NULL,
                transaction_id VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS promotions (
                id VARCHAR(50) PRIMARY KEY,
                module_id VARCHAR(50) NOT NULL,
                discount_type VARCHAR(20) NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                start_date VARCHAR(100) NOT NULL,
                end_date VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
            )
        `);



        // Insertar configuración inicial si no existe
        await pool.query(`
            INSERT IGNORE INTO system_config (id, company_name, admin_user, admin_pass, admin_name)
            VALUES (1, 'AS Sierra Systems', 'admin', '123456', 'Allenmar')
        `);

        // Insertar módulos por defecto si no existen
        const defaultModules = [
            { id: 'streetfeed', name: 'StreetFeed Pro', desc: 'Menú digital y pedidos por WhatsApp', icon: 'utensils', price: '$ 95.000', status: 'active' },
            { id: 'agenda', name: 'StyleSync Pro', desc: 'Sistema de citas y agenda para salones y estéticas', icon: 'calendar', price: '$ 140.000', status: 'active' }
        ];
        for (const mod of defaultModules) {
            await pool.query(`
                INSERT IGNORE INTO modules (id, name, \`desc\`, icon, status, price)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [mod.id, mod.name, mod.desc, mod.icon, mod.status, mod.price]);
        }

        console.log('[DB] ✅ Base de datos inicializada correctamente.');
    } catch (err) {
        console.error('[DB] ❌ Error durante la inicialización de la base de datos:', err.message);
        // No lanzar el error — el servidor debe seguir arrancando aunque falle la migración
    }
}

// --- 4. METODOS DE LA BASE DE DATOS RELACIONAL ---

/**
 * Reconstruye el árbol JSON completo equivalente a data.json
 * para compatibilidad con las interfaces administrativas frontend.
 */
async function getCompleteState() {
    try {
        // 3.1. Consultar Configuración Global
        const [configRows] = await pool.query('SELECT * FROM system_config WHERE id = 1');
        const dbConfig = configRows[0] ? {
            companyName: configRows[0].company_name,
            adminUser: configRows[0].admin_user,
            adminPass: configRows[0].admin_pass,
            adminName: configRows[0].admin_name,
            logo: configRows[0].logo,
            supportEmail: configRows[0].support_email || 'soporte@assierrasystems.com',
            supportPhone: configRows[0].support_phone || '573001234567'
        } : {
            companyName: "AS Sierra Systems",
            adminUser: "admin",
            adminPass: "123456",
            adminName: "Allenmar",
            logo: null,
            supportEmail: 'soporte@assierrasystems.com',
            supportPhone: '573001234567'
        };

        // 3.2. Consultar Módulos
        const [moduleRows] = await pool.query('SELECT * FROM modules');
        const dbModules = moduleRows.map(m => ({
            id: m.id,
            name: m.name,
            desc: m.desc,
            icon: m.icon,
            status: m.status,
            price: m.price,
            url: m.url,
            adminUrl: m.admin_url,
            videoUrl: m.video_url,
            image: m.image
        }));

        // 3.3. Consultar Usuarios
        const [userRows] = await pool.query('SELECT * FROM users');
        const dbUsers = userRows.map(u => ({
            id: Number(u.id),
            user: u.user,
            email: u.email || '',
            pass: u.pass,
            name: u.name,
            role: u.role,
            status: u.status
        }));

        // 3.4. Consultar Notificaciones (máx 50)
        const [notifRows] = await pool.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 50');
        const dbNotifications = notifRows.map(n => ({
            id: Number(n.id),
            title: n.title,
            desc: n.desc,
            icon: n.icon,
            color: n.color,
            time: n.created_at
        }));

        // 3.5. Consultar Negocios y sus Módulos Relacionados
        const [bizRows] = await pool.query('SELECT * FROM businesses ORDER BY id DESC');
        const dbBusinesses = [];

        for (const b of bizRows) {
            const [modRows] = await pool.query('SELECT * FROM business_modules WHERE business_id = ?', [b.id]);
            
            const activeModules = [];
            const cancelledModules = [];
            const moduleDates = {};
            const moduleInstances = [];

            for (const mr of modRows) {
                // Populate the detailed instances array
                moduleInstances.push({
                    instanceId: mr.instance_id,
                    moduleId: mr.module_id,
                    branchName: mr.branch_name || 'Sede Principal',
                    status: mr.status,
                    priceApplied: parseFloat(mr.price_applied) || 0,
                    renewalDate: mr.renewal_date,
                    cancelledAt: mr.cancelled_at,
                    accessUntil: mr.access_until
                });

                if (mr.status === 'active') {
                    if (!activeModules.includes(mr.module_id)) {
                        activeModules.push(mr.module_id);
                    }
                    // For legacy support: keep the first renewal date found
                    if (mr.renewal_date && !moduleDates[mr.module_id]) {
                        moduleDates[mr.module_id] = mr.renewal_date;
                    }
                } else if (mr.status === 'cancelled') {
                    // Legacy support — se filtrará después para excluir módulos que aún tienen instancias activas
                    const targetMod = dbModules.find(dm => dm.id === mr.module_id);
                    const moduleName = targetMod ? targetMod.name : mr.module_id;
                    cancelledModules.push({
                        id: mr.module_id,
                        name: moduleName,
                        cancelledAt: mr.cancelled_at,
                        accessUntil: mr.access_until
                    });
                }
            }

            // Filtrar cancelledModules: excluir módulos que aún tienen instancias activas
            // (evita que el mismo módulo aparezca en ambas pestañas Activos y Suspendidos)
            const filteredCancelledModules = cancelledModules
                .filter(cm => !activeModules.includes(cm.id))
                // Deduplicar por module_id (mantener el de accessUntil más próximo)
                .reduce((acc, cm) => {
                    const existing = acc.find(x => x.id === cm.id);
                    if (!existing) {
                        acc.push(cm);
                    } else {
                        // Mantener el que expira más tarde
                        if (cm.accessUntil && (!existing.accessUntil || new Date(cm.accessUntil) > new Date(existing.accessUntil))) {
                            acc[acc.indexOf(existing)] = cm;
                        }
                    }
                    return acc;
                }, []);

            dbBusinesses.push({
                id: Number(b.id),
                name: b.name,
                type: b.type,
                status: b.status,
                modules: activeModules,
                moduleInstances: moduleInstances,
                city: b.city,
                nit: b.nit,
                phone: b.phone,
                address: b.address,
                ownerName: b.owner_name,
                registrationSource: b.registration_source || 'admin',
                clientEmail: b.client_email,
                clientPass: b.client_pass,
                avatarUrl: b.avatar_url,
                cancelledModules: filteredCancelledModules,
                moduleDates: moduleDates,
                billing: {
                    gateway_token: b.gateway_token,
                    last_four: b.last_four,
                    card_brand: b.card_brand,
                    subscription_status: b.subscription_status,
                    next_billing_date: b.next_billing_date ? (b.next_billing_date instanceof Date ? b.next_billing_date.toISOString().slice(0, 10) : b.next_billing_date) : null,
                    last_payment_date: b.last_payment_date,
                    last_payment_amount: Number(b.last_payment_amount),
                    last_failed_attempt: b.last_failed_attempt,
                    last_transaction_id: b.last_transaction_id
                }
            });
        }

        // 3.6. Consultar Promociones
        const [promoRows] = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
        const dbPromotions = promoRows.map(p => ({
            id: p.id,
            moduleId: p.module_id,
            discountType: p.discount_type,
            discountValue: parseFloat(p.discount_value) || 0,
            startDate: p.start_date,
            endDate: p.end_date,
            status: p.status
        }));

        return {
            config: dbConfig,
            businesses: dbBusinesses,
            modules: dbModules,
            users: dbUsers,
            notifications: dbNotifications,
            promotions: dbPromotions
        };
    } catch (err) {
        console.error('[DB] Error construyendo estado JSON completo:', err.message);
        throw err;
    }
}

/**
 * Guarda y sincroniza el estado JSON completo en las tablas relacionales.
 * Garantiza integridad transaccional (todo o nada).
 */
async function saveCompleteState(db) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Sincronizar Configuración Global
        if (db.config) {
            await connection.query(`
                INSERT INTO system_config (id, company_name, admin_user, admin_pass, admin_name, logo, support_email, support_phone)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    company_name = VALUES(company_name),
                    admin_user = VALUES(admin_user),
                    admin_pass = VALUES(admin_pass),
                    admin_name = VALUES(admin_name),
                    logo = VALUES(logo),
                    support_email = VALUES(support_email),
                    support_phone = VALUES(support_phone)
            `, [
                db.config.companyName || 'AS Sierra Systems',
                db.config.adminUser || 'admin',
                db.config.adminPass || '123456',
                db.config.adminName || 'Allenmar',
                db.config.logo || null,
                db.config.supportEmail || 'soporte@assierrasystems.com',
                db.config.supportPhone || '573001234567'
            ]);
        }

        // 2. Sincronizar Módulos del Sistema
        if (db.modules) {
            const moduleIds = db.modules.map(m => m.id);
            if (moduleIds.length > 0) {
                // Eliminar módulos locales que ya no existen en la lista JSON recibida
                // (Para evitar restricciones de clave foránea temporal, primero desvinculamos o eliminamos cascade)
                await connection.query('DELETE FROM modules WHERE id NOT IN (?)', [moduleIds]);
            } else {
                await connection.query('DELETE FROM modules');
            }
            for (const mod of db.modules) {
                await connection.query(`
                    INSERT INTO modules (id, name, \`desc\`, icon, status, price, url, admin_url, video_url, image)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        \`desc\` = VALUES(\`desc\`),
                        icon = VALUES(icon),
                        status = VALUES(status),
                        price = VALUES(price),
                        url = VALUES(url),
                        admin_url = VALUES(admin_url),
                        video_url = VALUES(video_url),
                        image = VALUES(image)
                `, [
                    mod.id, mod.name, mod.desc || null, mod.icon || null, mod.status || 'active',
                    mod.price || '$ 0', mod.url || null, mod.adminUrl || null, mod.videoUrl || null, mod.image || null
                ]);
            }
        }

        // 3. Sincronizar Usuarios Administrativos
        if (db.users) {
            const userIds = db.users.map(u => u.id);
            if (userIds.length > 0) {
                await connection.query('DELETE FROM users WHERE id NOT IN (?)', [userIds]);
            } else {
                await connection.query('DELETE FROM users');
            }
            for (const user of db.users) {
                await connection.query(`
                    INSERT INTO users (id, user, email, pass, name, role, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        user = VALUES(user),
                        email = VALUES(email),
                        pass = VALUES(pass),
                        name = VALUES(name),
                        role = VALUES(role),
                        status = VALUES(status)
                `, [
                    user.id, user.user, user.email || '', user.pass, user.name, user.role || 'Admin', user.status || 'active'
                ]);
            }
        }

        // 4. Sincronizar Notificaciones
        if (db.notifications) {
            const notifIds = db.notifications.map(n => n.id);
            if (notifIds.length > 0) {
                await connection.query('DELETE FROM notifications WHERE id NOT IN (?)', [notifIds]);
            } else {
                await connection.query('DELETE FROM notifications');
            }
            for (const notif of db.notifications) {
                await connection.query(`
                    INSERT INTO notifications (id, title, \`desc\`, icon, color, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        title = VALUES(title),
                        \`desc\` = VALUES(\`desc\`),
                        icon = VALUES(icon),
                        color = VALUES(color),
                        created_at = VALUES(created_at)
                `, [
                    notif.id, notif.title, notif.desc, notif.icon || null, notif.color || null,
                    notif.time || new Date().toISOString()
                ]);
            }
        }

        // 5. Sincronizar Negocios y sus Módulos Relacionados
        if (db.businesses) {
            const bizIds = db.businesses.map(b => b.id);
            if (bizIds.length > 0) {
                await connection.query('DELETE FROM businesses WHERE id NOT IN (?)', [bizIds]);
            } else {
                await connection.query('DELETE FROM businesses');
            }

            for (const biz of db.businesses) {
                const billing = biz.billing || {};
                const lastPaymentAmount = parseFloat(billing.last_payment_amount) || 0.00;
                const nextBillingDate = billing.next_billing_date ? billing.next_billing_date.slice(0, 10) : null;

                await connection.query(`
                    INSERT INTO businesses (
                        id, name, type, status, city, nit, phone, address, client_email, client_pass, owner_name, registration_source, avatar_url,
                        gateway_token, last_four, card_brand, subscription_status, next_billing_date,
                        last_payment_date, last_payment_amount, last_failed_attempt, last_transaction_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        type = VALUES(type),
                        status = VALUES(status),
                        city = VALUES(city),
                        nit = VALUES(nit),
                        phone = VALUES(phone),
                        address = VALUES(address),
                        client_email = VALUES(client_email),
                        client_pass = VALUES(client_pass),
                        owner_name = VALUES(owner_name),
                        registration_source = VALUES(registration_source),
                        avatar_url = VALUES(avatar_url),
                        gateway_token = VALUES(gateway_token),
                        last_four = VALUES(last_four),
                        card_brand = VALUES(card_brand),
                        subscription_status = VALUES(subscription_status),
                        next_billing_date = VALUES(next_billing_date),
                        last_payment_date = VALUES(last_payment_date),
                        last_payment_amount = VALUES(last_payment_amount),
                        last_failed_attempt = VALUES(last_failed_attempt),
                        last_transaction_id = VALUES(last_transaction_id)
                `, [
                    biz.id, biz.name, biz.type, biz.status || 'active', biz.city || null, biz.nit || null, biz.phone || null, biz.address || null, biz.clientEmail, biz.clientPass, biz.ownerName || null, biz.registrationSource || 'admin', biz.avatarUrl || null,
                    billing.gateway_token || null, billing.last_four || null, billing.card_brand || null, billing.subscription_status || 'pending',
                    nextBillingDate, billing.last_payment_date || null, lastPaymentAmount, billing.last_failed_attempt || null, billing.last_transaction_id || null
                ]);

                // Sincronizar módulos contratados (reemplazo limpio)
                await connection.query('DELETE FROM business_modules WHERE business_id = ?', [biz.id]);

                // Activos
                const moduleInstances = biz.moduleInstances || [];
                // Compatibilidad con biz.modules si moduleInstances está vacío pero modules no
                const activeModules = biz.modules || [];
                
                if (moduleInstances.length > 0) {
                    for (const mod of moduleInstances) {
                        if (mod.status === 'active') {
                            await connection.query(`
                                INSERT IGNORE INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, renewal_date)
                                VALUES (?, ?, ?, ?, 'active', ?, ?)
                            `, [mod.instanceId, biz.id, mod.moduleId, mod.branchName || 'Sede Principal', mod.priceApplied || 0, mod.renewalDate]);
                        } else if (mod.status === 'cancelled') {
                            await connection.query(`
                                INSERT IGNORE INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, cancelled_at, access_until)
                                VALUES (?, ?, ?, ?, 'cancelled', ?, ?, ?)
                            `, [mod.instanceId, biz.id, mod.moduleId, mod.branchName || 'Sede Principal', mod.priceApplied || 0, mod.cancelledAt || null, mod.accessUntil || null]);
                        }
                    }
                } else {
                    // Legacy fallback
                    for (let i = 0; i < activeModules.length; i++) {
                        const modId = activeModules[i];
                        const instanceId = `${biz.id}-${modId}-${i}`;
                        const renewalDate = biz.moduleDates && biz.moduleDates[modId] ? biz.moduleDates[modId] : null;
                        await connection.query(`
                            INSERT IGNORE INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, renewal_date)
                            VALUES (?, ?, ?, 'Sede Principal', 'active', 0, ?)
                        `, [instanceId, biz.id, modId, renewalDate]);
                    }
                    
                    const cancelledModules = biz.cancelledModules || [];
                    for (let i = 0; i < cancelledModules.length; i++) {
                        const cm = cancelledModules[i];
                        const instanceId = `${biz.id}-${cm.id || cm.moduleId}-cancelled-${i}`;
                        await connection.query(`
                            INSERT IGNORE INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, cancelled_at, access_until)
                            VALUES (?, ?, ?, 'Sede Principal', 'cancelled', 0, ?, ?)
                        `, [instanceId, biz.id, cm.id || cm.moduleId, cm.cancelledAt || null, cm.accessUntil || null]);
                    }
                }
            }
        }

        // 6. Sincronizar Promociones
        if (db.promotions) {
            const promoIds = db.promotions.map(p => p.id);
            if (promoIds.length > 0) {
                await connection.query('DELETE FROM promotions WHERE id NOT IN (?)', [promoIds]);
            } else {
                await connection.query('DELETE FROM promotions');
            }
            for (const promo of db.promotions) {
                await connection.query(`
                    INSERT INTO promotions (id, module_id, discount_type, discount_value, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        module_id = VALUES(module_id),
                        discount_type = VALUES(discount_type),
                        discount_value = VALUES(discount_value),
                        start_date = VALUES(start_date),
                        end_date = VALUES(end_date),
                        status = VALUES(status)
                `, [
                    promo.id,
                    promo.moduleId,
                    promo.discountType,
                    promo.discountValue,
                    promo.startDate,
                    promo.endDate,
                    promo.status || 'active'
                ]);
            }
        }

        await connection.commit();
        console.log('[DB] Sincronización exitosa y atómica de base de datos relacional.');
    } catch (err) {
        await connection.rollback();
        console.error('[DB] ❌ Error crítico durante saveCompleteState:', err.message);
        throw err;
    } finally {
        connection.release();
    }
}

// --- MÉTODOS DE ENTIDADES ---

// --- CONFIG GLOBAL ---
async function getSystemConfig() {
    const [rows] = await pool.query('SELECT * FROM system_config WHERE id = 1');
    return rows[0] || null;
}

async function updateSystemConfig(fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;

    const mapping = {
        companyName: 'company_name',
        adminUser: 'admin_user',
        adminPass: 'admin_pass',
        adminName: 'admin_name',
        logo: 'logo',
        supportEmail: 'support_email',
        supportPhone: 'support_phone'
    };

    const sets = [];
    const values = [];
    for (const key of keys) {
        if (mapping[key]) {
            sets.push(`${mapping[key]} = ?`);
            values.push(fields[key]);
        }
    }
    if (sets.length === 0) return;
    await pool.query(`UPDATE system_config SET ${sets.join(', ')} WHERE id = 1`, values);
}

// --- USUARIOS ---
async function findUser(username, password) {
    const [rows] = await pool.query('SELECT * FROM users WHERE user = ? AND status = "active"', [username]);
    const user = rows[0] || null;
    if (user && verifyPassword(password, user.pass)) {
        return user;
    }
    return null;
}

async function findMasterUser(username, password) {
    const [rows] = await pool.query('SELECT * FROM system_config WHERE admin_user = ? AND id = 1', [username]);
    const config = rows[0] || null;
    if (config && verifyPassword(password, config.admin_pass)) {
        return config;
    }
    return null;
}

async function createUser(user) {
    const id = user.id || Date.now() + Math.floor(Math.random() * 1000);
    await pool.query(
        'INSERT INTO users (id, user, email, pass, name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, user.user, user.email || '', hashPassword(user.pass), user.name, user.role || 'Admin', user.status || 'active']
    );
    return id;
}

async function updateUser(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;

    const sets = [];
    const values = [];
    for (const key of keys) {
        if (['user', 'email', 'pass', 'name', 'role', 'status'].includes(key)) {
            sets.push(`${key} = ?`);
            if (key === 'pass') {
                values.push(hashPassword(fields[key]));
            } else {
                values.push(fields[key]);
            }
        }
    }
    if (sets.length === 0) return;
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteUser(id) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
}

// --- NOTIFICACIONES ---
async function pushNotification(notif) {
    try {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const created_at = new Date().toISOString();
        await pool.query(
            'INSERT INTO notifications (id, title, `desc`, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [id, notif.title, notif.desc, notif.icon || null, notif.color || null, created_at]
        );
        
        // Mantener máximo 50 notificaciones (eliminar las más antiguas)
        const [rows] = await pool.query('SELECT id FROM notifications ORDER BY id DESC');
        if (rows.length > 50) {
            const idsToDelete = rows.slice(50).map(r => r.id);
            await pool.query('DELETE FROM notifications WHERE id IN (?)', [idsToDelete]);
        }
    } catch (err) {
        console.error('[DB] Error insertando notificación:', err.message);
    }
}

async function clearNotifications() {
    await pool.query('DELETE FROM notifications');
}

// --- MÓDULOS ---
async function toggleModuleStatus(id, status) {
    await pool.query('UPDATE modules SET status = ? WHERE id = ?', [status, id]);
}

async function updateModule(id, fields) {
    const [rows] = await pool.query('SELECT id FROM modules WHERE id = ?', [id]);
    if (rows.length > 0) {
        const keys = Object.keys(fields);
        const mapping = {
            name: 'name',
            desc: '`desc`',
            icon: 'icon',
            status: 'status',
            price: 'price',
            url: 'url',
            adminUrl: 'admin_url',
            videoUrl: 'video_url',
            image: 'image'
        };
        const sets = [];
        const values = [];
        for (const key of keys) {
            if (mapping[key]) {
                sets.push(`${mapping[key]} = ?`);
                values.push(fields[key]);
            }
        }
        if (sets.length > 0) {
            await pool.query(`UPDATE modules SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
        }
    } else {
        await pool.query(
            'INSERT INTO modules (id, name, `desc`, icon, status, price, url, admin_url, video_url, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, fields.name, fields.desc || null, fields.icon || null, fields.status || 'active', fields.price || '$ 0', fields.url || null, fields.adminUrl || null, fields.videoUrl || null, fields.image || null]
        );
    }
}

// --- NEGOCIOS (CLIENTES) ---
async function getBusinesses() {
    const [rows] = await pool.query('SELECT * FROM businesses ORDER BY id DESC');
    return rows;
}
async function findBusinessByClientCredentials(email, password) {
    const [rows] = await pool.query(
        'SELECT * FROM businesses WHERE LOWER(client_email) = LOWER(?)',
        [email]
    );
    const biz = rows[0] || null;
    if (biz && verifyPassword(password, biz.client_pass)) {
        return biz;
    }
    return null;
}

async function findBusinessById(id) {
    const [rows] = await pool.query('SELECT * FROM businesses WHERE id = ?', [id]);
    return rows[0] || null;
}

async function emailInUseByOtherBusiness(email, id) {
    const [rows] = await pool.query(
        'SELECT id FROM businesses WHERE LOWER(client_email) = LOWER(?) AND id != ?',
        [email, id]
    );
    return rows.length > 0;
}

async function toggleBusinessStatus(id, status) {
    await pool.query('UPDATE businesses SET status = ? WHERE id = ?', [status, id]);
}

async function createBusiness(biz) {
    const id = biz.id || Date.now() + Math.floor(Math.random() * 1000);
    const billing = biz.billing || {};
    
    await pool.query(`
        INSERT INTO businesses (
            id, name, type, status, city, nit, phone, address, client_email, client_pass, owner_name, registration_source, avatar_url,
            gateway_token, last_four, card_brand, subscription_status, next_billing_date,
            last_payment_date, last_payment_amount, last_failed_attempt, last_transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id, biz.name, biz.type, biz.status || 'active', biz.city || null, biz.nit || null, biz.phone || null, biz.address || null, biz.clientEmail, hashPassword(biz.clientPass), biz.ownerName || null, biz.registrationSource || 'admin', biz.avatarUrl || null,
        billing.gateway_token || null, billing.last_four || null, billing.card_brand || null, billing.subscription_status || 'pending',
        billing.next_billing_date || null, billing.last_payment_date || null, billing.last_payment_amount || 0.00,
        billing.last_failed_attempt || null, billing.last_transaction_id || null
    ]);

    for (const modId of (biz.modules || [])) {
        await pool.query(
            'INSERT INTO business_modules (business_id, module_id, status) VALUES (?, ?, "active")',
            [id, modId]
        );
    }
    return id;
}

async function updateBusiness(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;

    const mapping = {
        name: 'name',
        type: 'type',
        status: 'status',
        city: 'city',
        nit: 'nit',
        phone: 'phone',
        address: 'address',
        ownerName: 'owner_name',
        registrationSource: 'registration_source',
        clientEmail: 'client_email',
        clientPass: 'client_pass',
        avatarUrl: 'avatar_url'
    };

    const sets = [];
    const values = [];
    for (const key of keys) {
        if (mapping[key]) {
            sets.push(`${mapping[key]} = ?`);
            if (key === 'clientPass') {
                values.push(hashPassword(fields[key]));
            } else {
                values.push(fields[key]);
            }
        }
    }

    if (sets.length > 0) {
        await pool.query(`UPDATE businesses SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
    }

    if (fields.modules !== undefined) {
        const [activeRows] = await pool.query('SELECT module_id FROM business_modules WHERE business_id = ? AND status = "active"', [id]);
        const dbActive = activeRows.map(r => r.module_id);
        const newActive = fields.modules;

        const toDelete = dbActive.filter(m => !newActive.includes(m));
        if (toDelete.length > 0) {
            await pool.query('DELETE FROM business_modules WHERE business_id = ? AND module_id IN (?) AND status = "active"', [id, toDelete]);
        }

        for (const modId of newActive) {
            if (!dbActive.includes(modId)) {
                const [cancelledRows] = await pool.query('SELECT module_id FROM business_modules WHERE business_id = ? AND module_id = ?', [id, modId]);
                if (cancelledRows.length > 0) {
                    await pool.query('UPDATE business_modules SET status = "active", cancelled_at = NULL, access_until = NULL WHERE business_id = ? AND module_id = ?', [id, modId]);
                } else {
                    await pool.query('INSERT INTO business_modules (business_id, module_id, status) VALUES (?, ?, "active")', [id, modId]);
                }
            }
        }
    }

    if (fields.cancelledModules !== undefined) {
        await pool.query('DELETE FROM business_modules WHERE business_id = ? AND status = "cancelled"', [id]);
        for (const cm of fields.cancelledModules) {
            await pool.query(`
                INSERT INTO business_modules (business_id, module_id, status, cancelled_at, access_until)
                VALUES (?, ?, 'cancelled', ?, ?)
                ON DUPLICATE KEY UPDATE status = 'cancelled', cancelled_at = VALUES(cancelled_at), access_until = VALUES(access_until)
            `, [id, cm.id, cm.cancelledAt, cm.accessUntil]);
        }
    }

    if (fields.moduleDates !== undefined) {
        for (const modId of Object.keys(fields.moduleDates)) {
            const renewalDate = fields.moduleDates[modId];
            await pool.query(`
                UPDATE business_modules SET renewal_date = ? 
                WHERE business_id = ? AND module_id = ? AND status = 'active'
            `, [renewalDate, id, modId]);
        }
    }

    if (fields.billing !== undefined) {
        const billing = fields.billing;
        const bMapping = {
            gateway_token: 'gateway_token',
            last_four: 'last_four',
            card_brand: 'card_brand',
            subscription_status: 'subscription_status',
            next_billing_date: 'next_billing_date',
            last_payment_date: 'last_payment_date',
            last_payment_amount: 'last_payment_amount',
            last_failed_attempt: 'last_failed_attempt',
            last_transaction_id: 'last_transaction_id'
        };
        const bSets = [];
        const bValues = [];
        for (const key of Object.keys(billing)) {
            if (bMapping[key]) {
                bSets.push(`${bMapping[key]} = ?`);
                bValues.push(billing[key]);
            }
        }
        if (bSets.length > 0) {
            await pool.query(`UPDATE businesses SET ${bSets.join(', ')} WHERE id = ?`, [...bValues, id]);
        }
    }
}

async function deleteBusiness(id) {
    await pool.query('DELETE FROM businesses WHERE id = ?', [id]);
}

// --- MÓDULOS DE NEGOCIOS INDIVIDUALES ---
async function cancelBusinessModule(businessId, moduleId, accessUntil) {
    await pool.query(
        'UPDATE business_modules SET status = "cancelled", cancelled_at = ?, access_until = ? WHERE business_id = ? AND module_id = ?',
        [new Date().toISOString(), accessUntil, businessId, moduleId]
    );
}

async function reactivateBusinessModule(businessId, moduleId, renewalDate) {
    await pool.query(
        'UPDATE business_modules SET status = "active", renewal_date = ?, cancelled_at = NULL, access_until = NULL WHERE business_id = ? AND module_id = ?',
        [renewalDate, businessId, moduleId]
    );
}

async function renewBusinessModule(businessId, moduleId, newRenewalDate) {
    await pool.query(
        'UPDATE business_modules SET status = "active", renewal_date = ?, cancelled_at = NULL, access_until = NULL WHERE business_id = ? AND module_id = ?',
        [newRenewalDate, businessId, moduleId]
    );
}

// ============================================================
// BACKUP Y RESTAURACIÓN COMPLETA DEL SISTEMA
// ============================================================

/**
 * Exporta el estado completo de todas las tablas críticas a un
 * objeto JSON estructurado y portable (para descarga como archivo).
 */
async function exportBackupData() {
    const [configRows]       = await pool.query('SELECT * FROM system_config WHERE id = 1');
    const [userRows]         = await pool.query('SELECT * FROM users ORDER BY id ASC');
    const [moduleRows]       = await pool.query('SELECT * FROM modules ORDER BY id ASC');
    const [bizRows]          = await pool.query('SELECT * FROM businesses ORDER BY id ASC');
    const [bizModRows]       = await pool.query('SELECT * FROM business_modules ORDER BY instance_id ASC');
    const [notifRows]        = await pool.query('SELECT * FROM notifications ORDER BY id ASC');
    const [payHistRows]      = await pool.query('SELECT * FROM payment_history ORDER BY created_at ASC');
    const [promoRows]        = await pool.query('SELECT * FROM promotions ORDER BY created_at ASC');

    return {
        _meta: {
            version: '1.0',
            exported_at: new Date().toISOString(),
            platform: 'AS Sierra Systems'
        },
        system_config:    configRows,
        users:            userRows,
        modules:          moduleRows,
        businesses:       bizRows,
        business_modules: bizModRows,
        notifications:    notifRows,
        payment_history:  payHistRows,
        promotions:       promoRows
    };
}

/**
 * Restaura el estado completo de la base de datos desde un objeto
 * JSON exportado previamente. Operación atómica: todo o nada.
 */
async function importBackupData(backup) {
    if (!backup || !backup._meta || backup._meta.platform !== 'AS Sierra Systems') {
        throw new Error('Archivo de respaldo inválido o incompatible con esta plataforma.');
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Deshabilitar FK constraints temporalmente para limpiar en orden seguro
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        // Limpiar tablas en orden (hijas primero)
        await conn.query('DELETE FROM business_modules');
        await conn.query('DELETE FROM payment_history');
        await conn.query('DELETE FROM promotions');
        await conn.query('DELETE FROM notifications');
        await conn.query('DELETE FROM businesses');
        await conn.query('DELETE FROM modules');
        await conn.query('DELETE FROM users');

        // Re-habilitar FK constraints
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        // Restaurar modules
        for (const m of (backup.modules || [])) {
            await conn.query(
                'INSERT IGNORE INTO modules (id, name, `desc`, icon, status, price, url, admin_url, video_url, image) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [m.id, m.name, m.desc, m.icon, m.status, m.price, m.url, m.admin_url, m.video_url, m.image]
            );
        }

        // Restaurar users
        for (const u of (backup.users || [])) {
            await conn.query(
                'INSERT IGNORE INTO users (id, user, email, pass, name, role, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
                [u.id, u.user, u.email, u.pass, u.name, u.role, u.status, u.created_at]
            );
        }

        // Restaurar businesses
        for (const b of (backup.businesses || [])) {
            await conn.query(
                `INSERT IGNORE INTO businesses 
                 (id, name, type, status, city, nit, phone, address, client_email, client_pass, owner_name, 
                  registration_source, avatar_url, gateway_token, last_four, card_brand, subscription_status,
                  next_billing_date, last_payment_date, last_payment_amount, last_failed_attempt, last_transaction_id, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [b.id, b.name, b.type, b.status, b.city, b.nit, b.phone, b.address,
                 b.client_email, b.client_pass, b.owner_name, b.registration_source, b.avatar_url,
                 b.gateway_token, b.last_four, b.card_brand, b.subscription_status,
                 b.next_billing_date, b.last_payment_date, b.last_payment_amount,
                 b.last_failed_attempt, b.last_transaction_id, b.created_at]
            );
        }

        // Restaurar business_modules
        for (const bm of (backup.business_modules || [])) {
            await conn.query(
                'INSERT IGNORE INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, cancelled_at, access_until, renewal_date) VALUES (?,?,?,?,?,?,?,?,?)',
                [bm.instance_id, bm.business_id, bm.module_id, bm.branch_name, bm.status, bm.price_applied, bm.cancelled_at, bm.access_until, bm.renewal_date]
            );
        }

        // Restaurar notifications
        for (const n of (backup.notifications || [])) {
            await conn.query(
                'INSERT IGNORE INTO notifications (id, title, `desc`, icon, color, created_at) VALUES (?,?,?,?,?,?)',
                [n.id, n.title, n.desc, n.icon, n.color, n.created_at]
            );
        }

        // Restaurar payment_history
        for (const p of (backup.payment_history || [])) {
            await conn.query(
                'INSERT IGNORE INTO payment_history (id, business_id, amount, `desc`, status, transaction_id, created_at) VALUES (?,?,?,?,?,?,?)',
                [p.id, p.business_id, p.amount, p.desc, p.status, p.transaction_id, p.created_at]
            );
        }

        // Restaurar promotions
        for (const pr of (backup.promotions || [])) {
            await conn.query(
                'INSERT IGNORE INTO promotions (id, module_id, discount_type, discount_value, start_date, end_date, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
                [pr.id, pr.module_id, pr.discount_type, pr.discount_value, pr.start_date, pr.end_date, pr.status, pr.created_at]
            );
        }

        // Restaurar system_config (upsert para mantener la fila id=1)
        if (backup.system_config && backup.system_config[0]) {
            const c = backup.system_config[0];
            await conn.query(
                `INSERT INTO system_config (id, company_name, admin_user, admin_pass, admin_name, logo, support_email, support_phone)
                 VALUES (1,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE
                     company_name = VALUES(company_name),
                     admin_user   = VALUES(admin_user),
                     admin_pass   = VALUES(admin_pass),
                     admin_name   = VALUES(admin_name),
                     logo         = VALUES(logo),
                     support_email = VALUES(support_email),
                     support_phone = VALUES(support_phone)`,
                [c.company_name, c.admin_user, c.admin_pass, c.admin_name, c.logo,
                 c.support_email || 'soporte@assierrasystems.com',
                 c.support_phone || '573001234567']
            );
        }

        await conn.commit();
        console.log('[DB] ✅ Restauración de backup completada correctamente.');
    } catch (err) {
        await conn.rollback();
        console.error('[DB] ❌ Error durante la restauración del backup:', err.message);
        throw err;
    } finally {
        conn.release();
    }
}

// --- EXPORTAR ---
module.exports = {
    pool,
    hashPassword,
    verifyPassword,
    initializeDatabase,
    getCompleteState,
    saveCompleteState,
    exportBackupData,
    importBackupData,
    
    // Config
    getSystemConfig,
    updateSystemConfig,
    
    // Usuarios
    findUser,
    findMasterUser,
    createUser,
    updateUser,
    deleteUser,
    
    // Notificaciones
    pushNotification,
    clearNotifications,
    
    // Módulos
    toggleModuleStatus,
    updateModule,
    
    // Negocios
    getBusinesses,
    findBusinessByClientCredentials,
    findBusinessById,
    emailInUseByOtherBusiness,
    toggleBusinessStatus,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    
    // Gestión Módulos Negocio
    cancelBusinessModule,
    reactivateBusinessModule,
    renewBusinessModule
};

