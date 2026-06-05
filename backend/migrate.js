/**
 * ============================================================
 * migrate.js — AS Sierra Systems
 * ============================================================
 * Script de migración para normalizar la base de datos MySQL.
 * Toma los datos del registro JSON único y los distribuye en
 * tablas relacionales bien estructuradas.
 *
 * Ejecución: node backend/migrate.js
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
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

const dataFilePath = path.resolve(__dirname, 'data.json');

// --- CARGAR VARIABLES DE ENTORNO DESDE .ENV MANUALMENTE ---
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
                console.log(`[Migration] 📁 Archivo .env cargado con éxito desde: ${envPath}`);
                break;
            } catch (e) {
                console.error(`[Migration] ⚠️ Error al leer el archivo .env:`, e.message);
            }
        }
    }
}
loadEnv();

// Variables de entorno de conexión
const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PRIVATE_URL;
const useMySQL = !!(connectionUri || process.env.MYSQLHOST);

async function runMigration() {
    console.log('[Migration] 🔄 Iniciando migración a base de datos relacional...');

    let pool = null;
    if (useMySQL) {
        console.log('[Migration] ℹ️ Conexión MySQL detectada.');
        if (connectionUri) {
            pool = mysql.createPool(connectionUri);
        } else {
            pool = mysql.createPool({
                host: process.env.MYSQLHOST,
                port: parseInt(process.env.MYSQLPORT || '3306', 10),
                user: process.env.MYSQLUSER,
                password: process.env.MYSQLPASSWORD,
                database: process.env.MYSQLDATABASE
            });
        }
    } else {
        console.log('[Migration] 📁 Entorno local detectado. Asegúrate de tener configuradas las variables de entorno de MySQL para migrar.');
        console.log('[Migration] ℹ️ Si estás ejecutando en local, puedes configurar un archivo .env o pasar las variables en la consola.');
        process.exit(1);
    }

    try {
        // --- 1. INTENTAR LEER EL ESTADO JSON ANTERIOR ---
        let rawData = null;

        // Intentar leer de la tabla sierra_systems_state en MySQL primero
        try {
            console.log('[Migration] 🔎 Buscando estado previo en MySQL (sierra_systems_state)...');
            const [rows] = await pool.query("SELECT db_json FROM sierra_systems_state WHERE id = 1");
            if (rows.length > 0) {
                rawData = JSON.parse(rows[0].db_json);
                console.log('[Migration] ✅ Estado JSON previo cargado desde MySQL.');
            }
        } catch (e) {
            console.log('[Migration] ℹ️ La tabla sierra_systems_state no existe o está vacía. Usando archivo local data.json.');
        }

        // Si no está en MySQL, leer del archivo local data.json
        if (!rawData) {
            if (fs.existsSync(dataFilePath)) {
                const localData = fs.readFileSync(dataFilePath, 'utf8');
                rawData = JSON.parse(localData);
                console.log('[Migration] ✅ Estado cargado desde backend/data.json local.');
            } else {
                console.warn('[Migration] ⚠️ No se encontró estado previo. Usando configuración inicial por defecto.');
                rawData = {
                    config: {
                        companyName: "AS Sierra Systems",
                        adminUser: "admin",
                        adminPass: "123456",
                        adminName: "Allenmar"
                    },
                    businesses: [],
                    modules: [
                        { id: "streetfeed", name: "StreetFeed Pro", desc: "Menú digital y pedidos por WhatsApp", price: "$ 95.000", status: "active" },
                        { id: "agenda", name: "StyleSync Pro", desc: "Sistema de citas y agenda", price: "$ 140.000", status: "active" }
                    ],
                    users: [],
                    notifications: []
                };
            }
        }

        // --- 2. CREAR LAS NUEVAS TABLAS RELACIONALES ---
        console.log('[Migration] 🛠️ Limpiando tablas anteriores y creando estructura relacional...');

        // Eliminar tablas anteriores para evitar tipos de columna incompatibles
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('DROP TABLE IF EXISTS promotions');
        await pool.query('DROP TABLE IF EXISTS payment_history');
        await pool.query('DROP TABLE IF EXISTS business_modules');
        await pool.query('DROP TABLE IF EXISTS businesses');
        await pool.query('DROP TABLE IF EXISTS modules');
        await pool.query('DROP TABLE IF EXISTS notifications');
        await pool.query('DROP TABLE IF EXISTS users');
        await pool.query('DROP TABLE IF EXISTS system_config');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        // Configuración Global
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

        // Usuarios
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

        // Módulos
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
 
        // Promociones (Campañas de descuentos)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS promotions (
                id VARCHAR(50) PRIMARY KEY,
                module_id VARCHAR(50) NOT NULL,
                discount_type VARCHAR(20) NOT NULL, -- 'percentage' o 'fixed_price'
                discount_value DECIMAL(10,2) NOT NULL,
                start_date VARCHAR(100) NOT NULL,
                end_date VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'active', -- 'active' o 'inactive'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
            )
        `);

        // Negocios
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
                
                -- Facturación
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

        // Relación 1 a N Negocios - Módulos (Instancias/Sucursales)
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

        // Notificaciones
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

        // Historial de Pagos (Ledger Financiero)
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

        console.log('[Migration] ✅ Estructura de tablas relacionales creada con éxito.');

        // --- 3. MIGRAR DATOS DE CONFIGURACIÓN ---
        console.log('[Migration] 📤 Migrando configuración del sistema...');
        const config = rawData.config || {};
        await pool.query(`
            INSERT INTO system_config (id, company_name, admin_user, admin_pass, admin_name, logo)
            VALUES (1, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                company_name = VALUES(company_name),
                admin_user = VALUES(admin_user),
                admin_pass = VALUES(admin_pass),
                admin_name = VALUES(admin_name),
                logo = VALUES(logo)
        `, [
            config.companyName || 'AS Sierra Systems',
            config.adminUser || 'admin',
            hashPassword(config.adminPass || '123456'),
            config.adminName || 'Allenmar',
            config.logo || null
        ]);

        // --- 4. MIGRAR MÓDULOS ---
        console.log('[Migration] 📤 Migrando módulos...');
        for (const mod of (rawData.modules || [])) {
            await pool.query(`
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
                mod.id,
                mod.name,
                mod.desc || null,
                mod.icon || null,
                mod.status || 'active',
                mod.price || '$ 0',
                mod.url || null,
                mod.adminUrl || null,
                mod.videoUrl || null,
                mod.image || null
            ]);
        }

        // --- 5. MIGRAR USUARIOS ---
        console.log('[Migration] 📤 Migrando usuarios administrativos...');
        for (const user of (rawData.users || [])) {
            // Si el id no es un número válido, generar uno
            const userId = parseInt(user.id) || Date.now() + Math.floor(Math.random() * 1000);
            await pool.query(`
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
                userId,
                user.user,
                user.email || '',
                hashPassword(user.pass),
                user.name,
                user.role || 'Admin',
                user.status || 'active'
            ]);
        }

        // --- 6. MIGRAR NEGOCIOS Y FACTURACIÓN ---
        console.log('[Migration] 📤 Migrando negocios y facturación...');
        for (const biz of (rawData.businesses || [])) {
            const billing = biz.billing || {};
            const lastPaymentAmount = parseFloat(billing.last_payment_amount) || 0.00;
            const nextBillingDate = billing.next_billing_date ? billing.next_billing_date.slice(0, 10) : null;

            await pool.query(`
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
                    owner_name = VALUES(owner_name),
                    registration_source = VALUES(registration_source),
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
                biz.id,
                biz.name,
                biz.type,
                biz.status || 'active',
                biz.city || null,
                biz.nit || null,
                biz.phone || null,
                biz.address || null,
                biz.clientEmail,
                hashPassword(biz.clientPass),
                biz.ownerName || null,
                biz.registrationSource || 'admin',
                biz.avatarUrl || null,
                billing.gateway_token || null,
                billing.last_four || null,
                billing.card_brand || null,
                billing.subscription_status || 'pending',
                nextBillingDate,
                billing.last_payment_date || null,
                lastPaymentAmount,
                billing.last_failed_attempt || null,
                billing.last_transaction_id || null
            ]);

            // Migrar relación de módulos activos
            const activeModules = biz.modules || [];
            for (let i = 0; i < activeModules.length; i++) {
                // Compatible con versión anterior (array de strings) y nueva (array de objetos)
                const mod = typeof activeModules[i] === 'string' ? { moduleId: activeModules[i] } : activeModules[i];
                const modId = mod.moduleId;
                const instanceId = mod.instanceId || `${biz.id}-${modId}-${i}`;
                const branchName = mod.branchName || 'Sede Principal';
                const priceApplied = mod.priceApplied || 0;
                
                const renewalDate = biz.moduleDates && biz.moduleDates[modId] ? biz.moduleDates[modId] : (mod.renewalDate || null);
                
                await pool.query(`
                    INSERT INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, renewal_date)
                    VALUES (?, ?, ?, ?, 'active', ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        status = 'active', 
                        branch_name = VALUES(branch_name),
                        price_applied = VALUES(price_applied),
                        renewal_date = VALUES(renewal_date)
                `, [instanceId, biz.id, modId, branchName, priceApplied, renewalDate]);
            }

            // Migrar relación de módulos cancelados (suspendidos)
            const cancelledModules = biz.cancelledModules || [];
            for (let i = 0; i < cancelledModules.length; i++) {
                const cm = cancelledModules[i];
                const instanceId = cm.instanceId || `${biz.id}-${cm.id}-cancelled-${i}`;
                const branchName = cm.branchName || 'Sede Principal';
                const priceApplied = cm.priceApplied || 0;

                await pool.query(`
                    INSERT INTO business_modules (instance_id, business_id, module_id, branch_name, status, price_applied, cancelled_at, access_until)
                    VALUES (?, ?, ?, ?, 'cancelled', ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        status = 'cancelled', 
                        branch_name = VALUES(branch_name),
                        cancelled_at = VALUES(cancelled_at),
                        access_until = VALUES(access_until)
                `, [instanceId, biz.id, cm.id || cm.moduleId, branchName, priceApplied, cm.cancelledAt || null, cm.accessUntil || null]);
            }
        }

        // --- 7. MIGRAR NOTIFICACIONES ---
        console.log('[Migration] 📤 Migrando notificaciones...');
        for (const notif of (rawData.notifications || [])) {
            const notifId = parseInt(notif.id) || Date.now() + Math.floor(Math.random() * 10000);
            await pool.query(`
                INSERT INTO notifications (id, title, \`desc\`, icon, color, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    title = VALUES(title),
                    \`desc\` = VALUES(\`desc\`),
                    icon = VALUES(icon),
                    color = VALUES(color),
                    created_at = VALUES(created_at)
            `, [
                notifId,
                notif.title,
                notif.desc,
                notif.icon || null,
                notif.color || null,
                notif.time || new Date().toISOString()
            ]);
        }

        console.log('\n[Migration] 🎉🎉🎉 MIGRACIÓN COMPLETADA CON ÉXITO 🎉🎉🎉');
        console.log('[Migration] Ahora todos tus datos JSON han sido convertidos en un esquema relacional con tablas individuales.');
        console.log('[Migration] Puedes inspeccionar tu base de datos y verás las tablas: system_config, users, modules, businesses, business_modules y notifications completamente llenas.');
        
    } catch (error) {
        console.error('[Migration] ❌ Error crítico durante la migración:', error);
    } finally {
        if (pool) await pool.end();
    }
}

runMigration();
