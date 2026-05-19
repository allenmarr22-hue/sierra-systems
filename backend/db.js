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

// --- 3. METODOS DE LA BASE DE DATOS RELACIONAL ---

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
            logo: configRows[0].logo
        } : {
            companyName: "AS Sierra Systems",
            adminUser: "admin",
            adminPass: "123456",
            adminName: "Allenmar",
            logo: null
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
            videoUrl: m.video_url
        }));

        // 3.3. Consultar Usuarios
        const [userRows] = await pool.query('SELECT * FROM users');
        const dbUsers = userRows.map(u => ({
            id: Number(u.id),
            user: u.user,
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

            for (const mr of modRows) {
                if (mr.status === 'active') {
                    activeModules.push(mr.module_id);
                    if (mr.renewal_date) {
                        moduleDates[mr.module_id] = mr.renewal_date;
                    }
                } else if (mr.status === 'cancelled') {
                    cancelledModules.push({
                        id: mr.module_id,
                        name: mr.module_id === 'streetfeed' ? 'StreetFeed Pro' : (mr.module_id === 'agenda' ? 'StyleSync Pro' : mr.module_id),
                        cancelledAt: mr.cancelled_at,
                        accessUntil: mr.access_until
                    });
                }
            }

            dbBusinesses.push({
                id: Number(b.id),
                name: b.name,
                type: b.type,
                status: b.status,
                modules: activeModules,
                city: b.city,
                clientEmail: b.client_email,
                clientPass: b.client_pass,
                avatarUrl: b.avatar_url,
                cancelledModules: cancelledModules,
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

        return {
            config: dbConfig,
            businesses: dbBusinesses,
            modules: dbModules,
            users: dbUsers,
            notifications: dbNotifications
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
                INSERT INTO system_config (id, company_name, admin_user, admin_pass, admin_name, logo)
                VALUES (1, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    company_name = VALUES(company_name),
                    admin_user = VALUES(admin_user),
                    admin_pass = VALUES(admin_pass),
                    admin_name = VALUES(admin_name),
                    logo = VALUES(logo)
            `, [
                db.config.companyName || 'AS Sierra Systems',
                db.config.adminUser || 'admin',
                db.config.adminPass || '123456',
                db.config.adminName || 'Allenmar',
                db.config.logo || null
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
                    INSERT INTO modules (id, name, \`desc\`, icon, status, price, url, admin_url, video_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        \`desc\` = VALUES(\`desc\`),
                        icon = VALUES(icon),
                        status = VALUES(status),
                        price = VALUES(price),
                        url = VALUES(url),
                        admin_url = VALUES(admin_url),
                        video_url = VALUES(video_url)
                `, [
                    mod.id, mod.name, mod.desc || null, mod.icon || null, mod.status || 'active',
                    mod.price || '$ 0', mod.url || null, mod.adminUrl || null, mod.videoUrl || null
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
                    INSERT INTO users (id, user, pass, name, role, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        user = VALUES(user),
                        pass = VALUES(pass),
                        name = VALUES(name),
                        role = VALUES(role),
                        status = VALUES(status)
                `, [
                    user.id, user.user, user.pass, user.name, user.role || 'Admin', user.status || 'active'
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
                        id, name, type, status, city, client_email, client_pass, avatar_url,
                        gateway_token, last_four, card_brand, subscription_status, next_billing_date,
                        last_payment_date, last_payment_amount, last_failed_attempt, last_transaction_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        type = VALUES(type),
                        status = VALUES(status),
                        city = VALUES(city),
                        client_email = VALUES(client_email),
                        client_pass = VALUES(client_pass),
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
                    biz.id, biz.name, biz.type, biz.status || 'active', biz.city || null, biz.clientEmail, biz.clientPass, biz.avatarUrl || null,
                    billing.gateway_token || null, billing.last_four || null, billing.card_brand || null, billing.subscription_status || 'pending',
                    nextBillingDate, billing.last_payment_date || null, lastPaymentAmount, billing.last_failed_attempt || null, billing.last_transaction_id || null
                ]);

                // Sincronizar módulos contratados (reemplazo limpio)
                await connection.query('DELETE FROM business_modules WHERE business_id = ?', [biz.id]);

                // Activos
                const activeModules = biz.modules || [];
                for (const modId of activeModules) {
                    const renewalDate = biz.moduleDates && biz.moduleDates[modId] ? biz.moduleDates[modId] : null;
                    await connection.query(`
                        INSERT INTO business_modules (business_id, module_id, status, renewal_date)
                        VALUES (?, ?, 'active', ?)
                    `, [biz.id, modId, renewalDate]);
                }

                // Cancelados (Suspendidos temporales)
                const cancelledModules = biz.cancelledModules || [];
                for (const cm of cancelledModules) {
                    await connection.query(`
                        INSERT INTO business_modules (business_id, module_id, status, cancelled_at, access_until)
                        VALUES (?, ?, 'cancelled', ?, ?)
                    `, [biz.id, cm.id, cm.cancelledAt || null, cm.accessUntil || null]);
                }
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
        logo: 'logo'
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
    const [rows] = await pool.query('SELECT * FROM users WHERE user = ? AND pass = ? AND status = "active"', [username, password]);
    return rows[0] || null;
}

async function findMasterUser(username, password) {
    const [rows] = await pool.query('SELECT * FROM system_config WHERE admin_user = ? AND admin_pass = ? AND id = 1', [username, password]);
    return rows[0] || null;
}

async function createUser(user) {
    const id = user.id || Date.now() + Math.floor(Math.random() * 1000);
    await pool.query(
        'INSERT INTO users (id, user, pass, name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, user.user, user.pass, user.name, user.role || 'Admin', user.status || 'active']
    );
    return id;
}

async function updateUser(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;

    const sets = [];
    const values = [];
    for (const key of keys) {
        if (['user', 'pass', 'name', 'role', 'status'].includes(key)) {
            sets.push(`${key} = ?`);
            values.push(fields[key]);
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
            videoUrl: 'video_url'
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
            'INSERT INTO modules (id, name, `desc`, icon, status, price, url, admin_url, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, fields.name, fields.desc || null, fields.icon || null, fields.status || 'active', fields.price || '$ 0', fields.url || null, fields.adminUrl || null, fields.videoUrl || null]
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
        'SELECT * FROM businesses WHERE LOWER(client_email) = LOWER(?) AND client_pass = ?',
        [email, password]
    );
    return rows[0] || null;
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
            id, name, type, status, city, client_email, client_pass, avatar_url,
            gateway_token, last_four, card_brand, subscription_status, next_billing_date,
            last_payment_date, last_payment_amount, last_failed_attempt, last_transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id, biz.name, biz.type, biz.status || 'active', biz.city || null, biz.clientEmail, biz.clientPass, biz.avatarUrl || null,
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
        clientEmail: 'client_email',
        clientPass: 'client_pass',
        avatarUrl: 'avatar_url'
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

// --- EXPORTAR ---
module.exports = {
    pool,
    getCompleteState,
    saveCompleteState,
    
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
