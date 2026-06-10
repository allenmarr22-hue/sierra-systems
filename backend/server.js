const db = require('./db');
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const PaymentService = require('./services/PaymentService');
const EmailService = require('./services/EmailService');
const { startBillingCron, runBillingCycle } = require('./jobs/billingCron');
const { startTicketCleanupCron } = require('./jobs/ticketCleanupCron');

const uploadsDir = path.join(__dirname, '..', 'frontend', 'uploads', 'avatars');
const ticketImagesDir = path.join(__dirname, '..', 'frontend', 'uploads', 'ticket-images');

// Ensure uploads directories exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(ticketImagesDir)) fs.mkdirSync(ticketImagesDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `client_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes.'));
        cb(null, true);
    }
});

const ticketImageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, ticketImagesDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `ticket_${Date.now()}_${Math.random().toString(36).slice(2,7)}${ext}`);
    }
});
const uploadTicketImage = multer({
    storage: ticketImageStorage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max for ticket images
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes.'));
        cb(null, true);
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Middleware de cabeceras de seguridad personalizadas
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Limites de solicitudes en memoria para mitigar fuerza bruta
const rateLimits = {};
function createRateLimiter(limitCount, windowMs) {
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const key = `${ip}:${req.path}`;
        const now = Date.now();

        if (!rateLimits[key]) rateLimits[key] = [];
        rateLimits[key] = rateLimits[key].filter(timestamp => now - timestamp < windowMs);

        if (rateLimits[key].length >= limitCount) {
            console.warn(`[Security] Límite de solicitudes superado para IP: ${ip} en ruta: ${req.path}`);
            return res.status(429).json({ error: 'Demasiados intentos. Por favor, espera unos minutos e inténtalo de nuevo.' });
        }

        rateLimits[key].push(now);
        next();
    };
}

const loginLimiter = createRateLimiter(15, 5 * 60 * 1000); // 15 intentos en 5 minutos
const paymentLimiter = createRateLimiter(10, 10 * 60 * 1000); // 10 intentos en 10 minutos

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'frontend', 'uploads')));

app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// ============================================================
// HELPERS: Lectura y Escritura Relacional de Base de Datos
// ============================================================
async function readDb() {
    try {
        return await db.getCompleteState();
    } catch (err) {
        console.error('[Server] Error leyendo base de datos:', err.message);
        throw err;
    }
}

async function writeDb(dbState) {
    try {
        await db.saveCompleteState(dbState);
    } catch (err) {
        console.error('[Server] Error guardando base de datos:', err.message);
        throw err;
    }
}

// ============================================================
// HELPER: Guardar notificación automática
// ============================================================
function pushNotification(dbState, notification) {
    if (!dbState.notifications) dbState.notifications = [];
    notification.id = Date.now();
    notification.time = new Date().toISOString();
    dbState.notifications.unshift(notification); // más reciente primero
    if (dbState.notifications.length > 50) dbState.notifications = dbState.notifications.slice(0, 50);
}

// ============================================================
// HELPER: Obtener precio promocional de un módulo
// ============================================================
function getActivePromoPrice(dbState, moduleId, basePrice) {
    if (!dbState.promotions) return basePrice;
    
    const now = new Date().toISOString();
    // Buscar promoción activa para el módulo
    const activePromo = dbState.promotions.find(p => 
        p.moduleId === moduleId &&
        p.status === 'active' &&
        now >= p.startDate &&
        now <= p.endDate
    );

    if (!activePromo) return basePrice;

    if (activePromo.discountType === 'percentage') {
        return Math.round(basePrice * (1 - parseFloat(activePromo.discountValue) / 100));
    } else if (activePromo.discountType === 'fixed_price') {
        return Math.round(parseFloat(activePromo.discountValue));
    }

    return basePrice;
}

// ============================================================
// STATELESS CRYPTOGRAPHIC TOKENS (JWT-like HMAC-SHA256)
// ============================================================
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'sierra_systems_secret_key_987654321') {
    console.warn('[Security] ⚠️ JWT_SECRET no está configurado en .env o tiene el valor por defecto. Generando clave criptográfica aleatoria segura para esta sesión.');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
}

function generateSignedToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${encodedPayload}`).digest('base64url');
    return `${header}.${encodedPayload}.${signature}`;
}

function verifySignedToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, encodedPayload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${encodedPayload}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (payload.expires && payload.expires < Date.now()) {
            return null; // Token expirado
        }
        return payload;
    } catch {
        return null;
    }
}

// Para compatibilidad con otras funciones legacy del backend que requieran verificar o limpiar tokens
function cleanExpiredTokens() {}

// ============================================================
// SERVER-SENT EVENTS (SSE) PARA SINCRONIZACIÓN EN TIEMPO REAL
// ============================================================
let sseClients = [];

function broadcastUpdate(payload) {
    const dataToSend = payload ? payload : { type: 'update' };
    sseClients.forEach(client => {
        try {
            client.res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
        } catch (e) {
            console.error('Error enviando SSE:', e);
        }
    });
}

// Envía un evento SSE solo a las conexiones de un cliente específico
function broadcastToClient(targetClientId, payload) {
    const targetId = String(targetClientId);
    sseClients
        .filter(c => String(c.clientId) === targetId)
        .forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
            } catch (e) {
                console.error('Error enviando SSE dirigido:', e);
            }
        });
}

app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    // Asociar el clientId de negocio si se pasa como query param (guardar como string para evitar problemas con BIGINT)
    const bizClientId = req.query.clientId ? String(req.query.clientId) : null;
    // Capturar info del dispositivo para mostrar sesiones activas
    const ua = req.headers['user-agent'] || '';
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const connectedAt = new Date().toISOString();
    const newClient = { id: clientId, clientId: bizClientId, res, ua, ip, connectedAt };
    sseClients.push(newClient);

    console.log(`[SSE] Nueva conexión: clientId=${bizClientId}, ip=${ip}, total=${sseClients.length}`);

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    req.on('close', () => {
        sseClients = sseClients.filter(client => client.id !== clientId);
        console.log(`[SSE] Conexión cerrada: clientId=${bizClientId}, restantes=${sseClients.length}`);
    });
});


// ============================================================
// CLIENTE: Listar sesiones activas (conexiones SSE actuales)
// ============================================================
app.get('/api/client/active-sessions', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ success: false, error: 'No autorizado' });

    const targetId = String(session.clientId);
    const activeSessions = sseClients
        .filter(c => String(c.clientId) === targetId)
        .map(c => {
            // Parsear User-Agent de forma básica para identificar dispositivo y navegador
            const ua = c.ua || '';
            let browser = 'Navegador';
            let os = 'Desconocido';
            let deviceType = 'desktop';

            // Detectar tipo de dispositivo
            if (/Mobile|Android|iPhone|iPad/.test(ua)) {
                deviceType = /iPad/.test(ua) ? 'tablet' : 'mobile';
            }

            // Detectar navegador
            if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
            else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Google Chrome';
            else if (/Firefox\//.test(ua)) browser = 'Firefox';
            else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
            else if (/Opera|OPR\//.test(ua)) browser = 'Opera';
            else if (/MSIE|Trident/.test(ua)) browser = 'Internet Explorer';

            // Detectar sistema operativo
            if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
            else if (/Windows NT 6/.test(ua)) os = 'Windows 8';
            else if (/Mac OS X/.test(ua)) os = 'macOS';
            else if (/Android/.test(ua)) os = 'Android';
            else if (/iPhone|iPad/.test(ua)) os = 'iOS';
            else if (/Linux/.test(ua)) os = 'Linux';
            else if (/CrOS/.test(ua)) os = 'Chrome OS';

            // Normalizar IP: mostrar "Local" para conexiones de loopback
            let displayIp = c.ip || '—';
            if (displayIp === '::1' || displayIp === '127.0.0.1' || displayIp.startsWith('::ffff:127.')) {
                displayIp = 'Local';
            }

            return {
                sessionId: c.id,
                browser,
                os,
                deviceType,
                ip: displayIp,
                connectedAt: c.connectedAt
            };
        });

    return res.json({ success: true, sessions: activeSessions });
});

// ============================================================
// AUTH MIDDLEWARE (SESIONES TOTALMENTE PERSISTENTES Y STATELESS)
// ============================================================

function requireAdmin(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado. Se requiere sesión de administrador.' });
    }
    const token = auth.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || (session.role !== 'Super Admin' && session.role !== 'Admin' && session.role !== 'Administrador' && session.role !== 'Soporte')) {
        return res.status(401).json({ error: 'Sesión expirada o no autorizada. Por favor inicia sesión nuevamente.' });
    }
    req.adminUser = session;
    next();
}

function requireWriteAccess(req, res, next) {
    requireAdmin(req, res, () => {
        const role = req.adminUser.role;
        if (role !== 'Super Admin' && role !== 'Admin' && role !== 'Administrador') {
            return res.status(403).json({ error: 'Acceso denegado. Permisos de escritura requeridos.' });
        }
        next();
    });
}

function requireSuperAdmin(req, res, next) {
    requireAdmin(req, res, () => {
        const role = req.adminUser.role;
        if (role !== 'Super Admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Super Administrador.' });
        }
        next();
    });
}

function requireAdminOrMatchingClient(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado. Se requiere sesión válida.' });
    }
    const token = auth.split(' ')[1];
    
    const session = verifySignedToken(token);
    if (!session) {
        return res.status(401).json({ error: 'Sesión expirada o inválida. Por favor inicia sesión de nuevo.' });
    }
    
    if (session.clientId) {
        req.userRole = 'client';
        req.clientId = session.clientId;
    } else {
        req.userRole = 'admin';
        req.adminUser = session;
    }
    next();
}

// ============================================================
// AUTH ADMIN
// ============================================================
app.post('/api/login', loginLimiter, async (req, res) => {
    const { user, pass } = req.body;
    try {
        let loggedUser = null;
        
        // 1. Intentar validar como super-admin
        const masterUser = await db.findMasterUser(user, pass);
        if (masterUser) {
            loggedUser = { name: masterUser.admin_name || 'Allenmar', role: 'Super Admin', user: masterUser.admin_user };
        } else {
            // 2. Intentar validar como usuario administrador
            const foundUser = await db.findUser(user, pass);
            if (foundUser) {
                loggedUser = { name: foundUser.name, role: foundUser.role, user: foundUser.user };
            }
        }

        if (!loggedUser) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        // Generar token de sesión stateless firmado
        const token = generateSignedToken({
            name: loggedUser.name,
            role: loggedUser.role,
            user: loggedUser.user,
            expires: Date.now() + 8 * 60 * 60 * 1000 // 8 horas
        });

        return res.json({ success: true, token, user: loggedUser });
    } catch (err) {
        console.error('Error en /api/login:', err);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    res.json({ success: true });
});

app.post('/api/admin/refresh-token', async (req, res) => {
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ ok: false, error: 'Credenciales requeridas.' });
    try {
        let loggedUser = null;
        const masterUser = await db.findMasterUser(user, pass);
        if (masterUser) {
            loggedUser = { name: masterUser.admin_name || 'Allenmar', role: 'Super Admin', user: masterUser.admin_user };
        } else {
            const foundUser = await db.findUser(user, pass);
            if (foundUser) {
                loggedUser = { name: foundUser.name, role: foundUser.role, user: foundUser.user };
            }
        }

        if (!loggedUser) return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });

        const token = generateSignedToken({
            name: loggedUser.name,
            role: loggedUser.role,
            user: loggedUser.user,
            expires: Date.now() + 8 * 60 * 60 * 1000
        });
        return res.json({ ok: true, token });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Error del servidor.' });
    }
});

// ============================================================
// AUTH CLIENTE
// ============================================================
app.post('/api/client/login', loginLimiter, async (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    try {
        const biz = await db.findBusinessByClientCredentials(email, pass);
        if (!biz) {
            return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
        }

        // Incluir session_version en el token para poder invalidarlo con logout-all
        const token = generateSignedToken({
            clientId: biz.id,
            clientEmail: biz.client_email,
            sessionVersion: biz.session_version || 1,
            expires: Date.now() + 8 * 60 * 60 * 1000 // 8 horas
        });

        // Registrar notificación atómica
        const dbState = await readDb();
        pushNotification(dbState, {
            title: 'Acceso de Cliente',
            desc: `"${biz.name}" inició sesión en el portal.`,
            icon: 'log-in',
            color: '#10b981'
        });
        await writeDb(dbState);

        return res.json({
            success: true,
            token,
            clientId: biz.id,
            clientName: biz.name,
            clientEmail: biz.client_email
        });
    } catch (err) {
        console.error('Error en client login:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

app.post('/api/client/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false });
    
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.json({ valid: false });

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.json({ valid: false });

        // 1. Primero: verificar si el admin desactivó manualmente la cuenta
        if (biz.status !== 'active') {
            return res.json({ valid: false, reason: 'account_inactive' });
        }

        // 2. Segundo: verificar si la facturación está suspendida por impago
        if (biz.subscription_status === 'suspended') {
            return res.json({ valid: false, reason: 'payment_required' });
        }

        // 3. Verificar versión de sesión (para invalidar sesiones antiguas tras logout-all)
        const bizSessionVersion = biz.session_version || 1;
        const tokenSessionVersion = session.sessionVersion || 1;
        if (tokenSessionVersion !== bizSessionVersion) {
            return res.json({ valid: false, reason: 'session_invalidated' });
        }

        return res.json({ valid: true, clientId: session.clientId });
    } catch (err) {
        return res.status(500).json({ valid: false });
    }
});

app.post('/api/client/verify-password', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ success: false, error: 'No autorizado' });

    const { pass } = req.body;
    if (!pass) return res.status(400).json({ success: false, error: 'Falta la contraseña.' });

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.status(404).json({ success: false, error: 'Negocio no encontrado.' });

        const isValid = db.verifyPassword(pass, biz.client_pass);
        return res.json({ success: true, valid: isValid });
    } catch (err) {
        console.error('Error verificando contraseña de cliente:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// ============================================================
// CLIENTE: Cerrar sesión en todos los dispositivos
// ============================================================
app.post('/api/client/logout-all', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ success: false, error: 'No autorizado' });

    const { pass } = req.body;
    if (!pass) return res.status(400).json({ success: false, error: 'Se requiere tu contraseña para confirmar esta acción.' });

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.status(404).json({ success: false, error: 'Negocio no encontrado.' });

        // Verificar contraseña actual
        if (!db.verifyPassword(pass, biz.client_pass)) {
            return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
        }

        // Incrementar session_version para invalidar todos los tokens existentes
        const newVersion = (biz.session_version || 1) + 1;
        await db.updateBusiness(session.clientId, { sessionVersion: newVersion });

        await db.pushNotification({
            title: 'Cierre de Sesión Global',
            desc: `"${biz.name}" cerró sesión en todos los dispositivos.`,
            icon: 'shield-x',
            color: '#f59e0b'
        });

        // Notificar en tiempo real a todos los dispositivos conectados de este cliente
        broadcastToClient(session.clientId, { type: 'force_logout' });

        return res.json({ success: true, message: 'Todas las sesiones han sido cerradas exitosamente.' });
    } catch (err) {
        console.error('Error en logout-all:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// ============================================================
// CLIENTE: Cerrar sesión en todos los dispositivos de un módulo específico
// ============================================================
app.post('/api/client/module/logout-all', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ success: false, error: 'No autorizado' });

    const { modId, instanceId } = req.body;
    if (!modId) return res.status(400).json({ success: false, error: 'Se requiere el ID del módulo.' });

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.status(404).json({ success: false, error: 'Negocio no encontrado.' });

        // Notificar en tiempo real a todos los dispositivos conectados de este cliente
        broadcastToClient(session.clientId, {
            type: 'module_force_logout',
            modId,
            instanceId: instanceId || null
        });

        return res.json({ success: true, message: 'Sesiones del módulo cerradas exitosamente en todos los dispositivos.' });
    } catch (err) {
        console.error('Error en /api/client/module/logout-all:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});



// ============================================================
// CLIENTE: Recuperar contraseña con verificación de admin
// ============================================================
app.post('/api/client/forgot-password', loginLimiter, async (req, res) => {
    const { email, adminUser, adminPass, newPass } = req.body;
    if (!email || !adminPass || !newPass) {
        return res.status(400).json({ success: false, error: 'Faltan campos requeridos.' });
    }

    try {
        // 1. Verificar credenciales de admin (master o sub-admin)
        let isAdminValid = false;
        const masterUser = await db.findMasterUser(adminUser || '', adminPass);
        if (masterUser) {
            isAdminValid = true;
        } else {
            // Verificar cualquier sub-admin con esa contraseña
            const [adminRows] = await db.pool.query(
                'SELECT * FROM users WHERE status = ?', ['active']
            );
            for (const u of adminRows) {
                if (db.verifyPassword(adminPass, u.pass)) {
                    isAdminValid = true;
                    break;
                }
            }
        }

        if (!isAdminValid) {
            return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
        }

        // 2. Buscar el cliente por email
        const [bizRows] = await db.pool.query(
            'SELECT * FROM businesses WHERE LOWER(client_email) = LOWER(?)', [email]
        );
        const biz = bizRows[0];
        if (!biz) {
            return res.status(404).json({ success: false, error: 'No existe una cuenta con ese correo.' });
        }

        // 3. Actualizar la contraseña del cliente
        const hashedNew = db.hashPassword(newPass);
        await db.pool.query(
            'UPDATE businesses SET client_pass = ? WHERE id = ?', [hashedNew, biz.id]
        );

        await db.pushNotification({
            title: 'Contraseña de Cliente Restablecida',
            desc: `La contraseña de "${biz.name}" (${email}) fue restablecida por un administrador.`,
            icon: 'key',
            color: '#f59e0b'
        });

        broadcastUpdate();
        return res.json({ success: true, clientName: biz.name });
    } catch (err) {
        console.error('[Server] Error en forgot-password:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// ============================================================
// ADMIN: Gestionar credenciales de cliente por negocio
// ============================================================
app.post('/api/businesses/:id/credentials', requireWriteAccess, async (req, res) => {
    const { id } = req.params;
    const { clientEmail, clientPass } = req.body;
    if (!clientEmail) return res.status(400).json({ error: 'Email requerido.' });

    try {
        const biz = await db.findBusinessById(id);
        if (!biz) return res.status(404).json({ error: 'Negocio no encontrado.' });

        // Verificar que el email no esté en uso por otro negocio
        const emailInUse = await db.emailInUseByOtherBusiness(clientEmail, id);
        if (emailInUse) return res.status(409).json({ error: 'Ese correo ya está asignado a otro negocio.' });

        const fieldsToUpdate = { clientEmail };
        if (clientPass && clientPass !== '__NO_CHANGE__') {
            fieldsToUpdate.clientPass = clientPass; // db.updateBusiness se encarga del hash
        }
        await db.updateBusiness(id, fieldsToUpdate);

        const sentPass = (clientPass && clientPass !== '__NO_CHANGE__') ? clientPass : null;
        EmailService.sendWelcomeEmail(clientEmail, biz.name, clientEmail, sentPass).catch(err => {
            console.error('[Welcome Email Error]', err);
        });

        await db.pushNotification({
            title: 'Credenciales Actualizadas',
            desc: `Acceso de cliente configurado para "${biz.name}".`,
            icon: 'key',
            color: '#6366f1'
        });

        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        console.error('[Server] Error al guardar credenciales:', err);
        res.status(500).json({ error: 'Error del servidor al guardar credenciales: ' + err.message });
    }
});

// ============================================================
// CLIENT: Self-service credential update
// ============================================================
app.post('/api/client/credentials/update', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });

    const { currentPass, newEmail, newPass } = req.body;
    if (!currentPass || !newEmail) return res.status(400).json({ error: 'Faltan datos requeridos.' });

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.status(404).json({ error: 'Negocio no encontrado.' });

        if (!db.verifyPassword(currentPass, biz.client_pass)) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        const emailInUse = await db.emailInUseByOtherBusiness(newEmail, session.clientId);
        if (emailInUse) return res.status(409).json({ error: 'Este correo ya está registrado en otra cuenta.' });

        const fieldsToUpdate = { clientEmail: newEmail };
        if (newPass && newPass.trim() !== '') {
            fieldsToUpdate.clientPass = newPass;
        }
        await db.updateBusiness(session.clientId, fieldsToUpdate);

        await db.pushNotification({
            title: 'Credenciales de Cliente',
            desc: `"${biz.name}" ha actualizado sus accesos de seguridad.`,
            icon: 'shield-check',
            color: '#3b82f6'
        });

        broadcastUpdate();
        res.json({ success: true, email: newEmail });
    } catch (err) {
        console.error('Error actualizando credenciales cliente:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ============================================================
// CLIENT: Upload avatar / profile picture
// ============================================================
app.post('/api/client/avatar', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });

    upload.single('avatar')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

        try {
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            await db.updateBusiness(session.clientId, { avatarUrl });

            broadcastUpdate();
            res.json({ success: true, avatarUrl });
        } catch (error) {
            console.error('Error al guardar avatar cliente:', error);
            res.status(500).json({ error: 'Error interno al guardar avatar.' });
        }
    });
});

// ============================================================
// CLIENT: Update profile info (Name)
// ============================================================
app.post('/api/client/profile/update', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });

    const { newName, ownerName, phone, nit, address, city, clientEmail } = req.body;
    if (!newName || newName.trim() === '') return res.status(400).json({ error: 'El nombre del negocio es requerido.' });

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.status(404).json({ error: 'Negocio no encontrado.' });

        if (clientEmail && clientEmail.trim() !== '' && clientEmail.toLowerCase() !== biz.client_email.toLowerCase()) {
            const emailInUse = await db.emailInUseByOtherBusiness(clientEmail, session.clientId);
            if (emailInUse) return res.status(409).json({ error: 'Este correo ya está registrado en otra cuenta.' });
        }

        await db.updateBusiness(session.clientId, { 
            name: newName, 
            ownerName: ownerName || '', 
            phone: phone || '', 
            nit: nit || '', 
            address: address || '', 
            city: city || '',
            clientEmail: clientEmail || biz.client_email
        });

        broadcastUpdate();
        res.json({ 
            success: true, 
            name: newName, 
            ownerName: ownerName || '', 
            phone: phone || '', 
            nit: nit || '', 
            address: address || '', 
            city: city || '',
            clientEmail: clientEmail || biz.client_email
        });
    } catch (err) {
        console.error('Error actualizando perfil cliente:', err);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// DATA
// ============================================================
app.get('/api/data', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '-1');
        res.set('Pragma', 'no-cache');
        
        let dbState = await readDb();
        const now = Date.now();
        let changed = false;

        // Limpiar módulos cancelados expirados y fechas obsoletas
        dbState.businesses.forEach(biz => {
            let bizChanged = false;
            
            // 1. Filtrar módulos suspendidos expirados
            if (biz.cancelledModules) {
                const beforeCount = biz.cancelledModules.length;
                biz.cancelledModules = biz.cancelledModules.filter(cm => new Date(cm.accessUntil).getTime() > now);
                if (biz.cancelledModules.length !== beforeCount) bizChanged = true;
            }

            // 2. Limpiar fechas de renovación de módulos que ya no existen
            if (biz.moduleDates) {
                const activeIds = biz.modules || [];
                const suspendedIds = (biz.cancelledModules || []).map(cm => String(cm.id));
                const allValidIds = [...activeIds, ...suspendedIds];
                
                Object.keys(biz.moduleDates).forEach(mid => {
                    if (!allValidIds.includes(String(mid))) {
                        delete biz.moduleDates[mid];
                        bizChanged = true;
                    }
                });
            }

            if (bizChanged) changed = true;
        });

        if (changed) {
            await writeDb(dbState);
        }

        // 🔒 SEGURIDAD: Determinar si el solicitante es un Admin
        let isAdmin = false;
        let isSuperAdmin = false;
        let session = null;
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            const token = auth.split(' ')[1];
            session = verifySignedToken(token);
            if (session && ['Super Admin', 'Admin', 'Administrador', 'Soporte'].includes(session.role)) {
                isAdmin = true;
            }
            if (session && (session.role === 'Super Admin' || session.role === 'Admin' || session.role === 'Administrador')) {
                isSuperAdmin = true;
            }
        }

        // 🔒 SEGURIDAD: Eliminar campos sensibles antes de enviar al frontend
        const safeDb = {
            ...dbState,
            config: isSuperAdmin ? dbState.config : { ...dbState.config, adminUser: undefined, adminPass: undefined },
            users: isAdmin ? dbState.users : [], // Clientes/Público no deben ver a los usuarios admin
            businesses: dbState.businesses.map(biz => {
                const safeBiz = { ...biz };
                
                // Ocultar contraseñas a todo el mundo (excepto Admin y Super Admin)
                const canSeePass = isSuperAdmin || (session && session.role === 'Administrador');
                if (!canSeePass) {
                    safeBiz.clientPass = undefined;
                }

                if (safeBiz.billing?.gateway_token) {
                    safeBiz.billing = {
                        ...safeBiz.billing,
                        gateway_token: '***TOKENIZED***', // Nunca exponer el token real
                    };
                }
                return safeBiz;
            }),
        };

        res.json(safeDb);
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor al consultar datos.' });
    }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
app.get('/api/notifications', async (req, res) => {
    try {
        const dbState = await readDb();
        res.json({ notifications: dbState.notifications || [] });
    } catch (err) {
        res.status(500).json({ error: 'Error leyendo notificaciones.' });
    }
});

app.delete('/api/notifications', requireWriteAccess, async (req, res) => {
    try {
        let dbState = await readDb();
        dbState.notifications = [];
        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error borrando notificaciones.' });
    }
});

// ============================================================
// NEGOCIOS (BUSINESSES)
// ============================================================
app.post('/api/businesses/toggle', requireWriteAccess, async (req, res) => {
    const { id, status } = req.body;
    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == id);
        if (bizIndex !== -1) {
            dbState.businesses[bizIndex].status = status;
            const biz = dbState.businesses[bizIndex];

            // Si se desactiva, se validará en tiempo real en la base de datos en la verificación del token.


            pushNotification(dbState, {
                title: status === 'active' ? 'Negocio Activado' : 'Negocio Desactivado',
                desc: `"${biz.name}" fue ${status === 'active' ? 'activado' : 'desactivado'}.`,
                icon: status === 'active' ? 'toggle-right' : 'toggle-left',
                color: status === 'active' ? '#10b981' : '#f59e0b'
            });

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true, status });
        } else {
            res.status(404).json({ error: 'Negocio no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.post('/api/businesses/new', requireWriteAccess, async (req, res) => {
    const newBiz = req.body;
    try {
        let dbState = await readDb();
        dbState.businesses.unshift(newBiz);

        pushNotification(dbState, {
            title: 'Nuevo Negocio Registrado',
            desc: `"${newBiz.name}" se ha unido a la plataforma.`,
            icon: 'building-2',
            color: '#6366f1'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        console.error('[Server] Error al crear negocio:', err);
        res.status(500).json({ error: 'Error del servidor al crear negocio: ' + err.message });
    }
});

app.put('/api/businesses/:id', requireWriteAccess, async (req, res) => {
    const bizId = req.params.id;
    const updatedFields = req.body;
    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == bizId);
        if (bizIndex !== -1) {
            dbState.businesses[bizIndex] = { ...dbState.businesses[bizIndex], ...updatedFields };
            const biz = dbState.businesses[bizIndex];

            pushNotification(dbState, {
                title: 'Negocio Actualizado',
                desc: `Los datos de "${biz.name}" fueron modificados.`,
                icon: 'pencil',
                color: '#3b82f6'
            });

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true, business: dbState.businesses[bizIndex] });
        } else {
            res.status(404).json({ error: 'Negocio no encontrado' });
        }
    } catch (err) {
        console.error('[Server] Error al editar negocio:', err);
        res.status(500).json({ error: 'Error del servidor al editar negocio: ' + err.message });
    }
});

app.delete('/api/businesses/:id', requireSuperAdmin, async (req, res) => {
    const bizId = req.params.id;
    try {
        let dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == bizId);
        const initialLength = dbState.businesses.length;
        dbState.businesses = dbState.businesses.filter(b => b.id != bizId);

        if (dbState.businesses.length < initialLength) {
            // Las sesiones activas se invalidarán en la verificación del token al no existir en la base de datos.


            if (biz) {
                pushNotification(dbState, {
                    title: 'Negocio Eliminado',
                    desc: `"${biz.name}" fue eliminado del sistema junto con todos sus datos.`,
                    icon: 'trash-2',
                    color: '#ef4444'
                });
            }

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Negocio no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// MÓDULOS
// ============================================================
app.post('/api/modules/toggle', requireWriteAccess, async (req, res) => {
    const { id, status } = req.body;
    try {
        let dbState = await readDb();
        const modIndex = dbState.modules.findIndex(m => m.id == id);
        if (modIndex !== -1) {
            dbState.modules[modIndex].status = status;
            const mod = dbState.modules[modIndex];

            pushNotification(dbState, {
                title: `Módulo ${status === 'active' ? 'Activado' : 'Desactivado'}`,
                desc: `El módulo "${mod.name}" fue ${status === 'active' ? 'activado' : 'desactivado'}.`,
                icon: 'grid-2x2',
                color: status === 'active' ? '#10b981' : '#f59e0b'
            });

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true, status });
        } else {
            res.status(404).json({ error: 'Módulo no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// PROMOCIONES (Campañas de descuentos)
// ============================================================
app.get('/api/admin/promotions', requireWriteAccess, async (req, res) => {
    try {
        const dbState = await readDb();
        res.json({ success: true, promotions: dbState.promotions || [] });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener promociones.' });
    }
});

app.post('/api/admin/promotions/new', requireWriteAccess, async (req, res) => {
    const { moduleId, discountType, discountValue, startDate, endDate } = req.body;
    if (!moduleId || !discountType || discountValue === undefined || !startDate || !endDate) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    try {
        let dbState = await readDb();
        if (!dbState.promotions) dbState.promotions = [];

        // Validar que no se solape con otra promoción activa para el mismo módulo
        const hasOverlap = dbState.promotions.some(p => 
            p.moduleId === moduleId && 
            p.status === 'active' &&
            ((startDate >= p.startDate && startDate <= p.endDate) ||
             (endDate >= p.startDate && endDate <= p.endDate) ||
             (startDate <= p.startDate && endDate >= p.endDate))
        );

        if (hasOverlap) {
            return res.status(400).json({ error: 'Ya existe una promoción activa programada para este módulo en este rango de fechas.' });
        }

        const newPromo = {
            id: `promo_${Date.now()}`,
            moduleId,
            discountType,
            discountValue: parseFloat(discountValue),
            startDate,
            endDate,
            status: 'active'
        };

        dbState.promotions.push(newPromo);

        pushNotification(dbState, {
            title: 'Nueva Promoción Creada',
            desc: `Se ha lanzado una campaña de descuento para el módulo "${moduleId}".`,
            icon: 'tag',
            color: '#3b82f6'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, promotion: newPromo });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor al crear promoción.' });
    }
});

app.post('/api/admin/promotions/toggle', requireWriteAccess, async (req, res) => {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'ID y estado requeridos.' });

    try {
        let dbState = await readDb();
        if (!dbState.promotions) dbState.promotions = [];

        const promoIndex = dbState.promotions.findIndex(p => p.id === id);
        if (promoIndex === -1) return res.status(404).json({ error: 'Promoción no encontrada.' });

        dbState.promotions[promoIndex].status = status;

        pushNotification(dbState, {
            title: `Campaña ${status === 'active' ? 'Reactivada' : 'Pausada'}`,
            desc: `La campaña publicitaria fue ${status === 'active' ? 'activada' : 'pausada'}.`,
            icon: 'tag',
            color: status === 'active' ? '#10b981' : '#f59e0b'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.put('/api/admin/promotions/:id', requireWriteAccess, async (req, res) => {
    const { id } = req.params;
    const { moduleId, discountType, discountValue, startDate, endDate } = req.body;
    if (!moduleId || !discountType || discountValue === undefined || !startDate || !endDate) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    try {
        let dbState = await readDb();
        if (!dbState.promotions) dbState.promotions = [];

        const promoIndex = dbState.promotions.findIndex(p => p.id === id);
        if (promoIndex === -1) return res.status(404).json({ error: 'Promoción no encontrada.' });

        // Validar solapamiento con OTRA promoción (excluyendo la promoción actual)
        const hasOverlap = dbState.promotions.some(p => 
            p.id !== id &&
            p.moduleId === moduleId && 
            p.status === 'active' &&
            ((startDate >= p.startDate && startDate <= p.endDate) ||
             (endDate >= p.startDate && endDate <= p.endDate) ||
             (startDate <= p.startDate && endDate >= p.endDate))
        );

        if (hasOverlap) {
            return res.status(400).json({ error: 'Ya existe otra promoción activa programada para este módulo en este rango de fechas.' });
        }

        dbState.promotions[promoIndex] = {
            ...dbState.promotions[promoIndex],
            moduleId,
            discountType,
            discountValue: parseFloat(discountValue),
            startDate,
            endDate
        };

        pushNotification(dbState, {
            title: 'Promoción Actualizada',
            desc: `Se ha modificado la campaña de descuento para el módulo "${moduleId}".`,
            icon: 'tag',
            color: '#3b82f6'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, promotion: dbState.promotions[promoIndex] });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor al actualizar promoción.' });
    }
});

app.delete('/api/admin/promotions/:id', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        let dbState = await readDb();
        if (!dbState.promotions) dbState.promotions = [];

        const promoIndex = dbState.promotions.findIndex(p => p.id === id);
        if (promoIndex === -1) return res.status(404).json({ error: 'Promoción no encontrada.' });

        dbState.promotions.splice(promoIndex, 1);

        pushNotification(dbState, {
            title: 'Campaña Eliminada',
            desc: 'Una promoción ha sido eliminada permanentemente.',
            icon: 'tag',
            color: '#ef4444'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// USUARIOS
// ============================================================
app.post('/api/users/new', requireSuperAdmin, async (req, res) => {
    const newUser = req.body;
    try {
        let dbState = await readDb();
        if (!dbState.users) dbState.users = [];
        newUser.id = newUser.id || Date.now();
        dbState.users.push(newUser);

        pushNotification(dbState, {
            title: 'Nuevo Usuario Creado',
            desc: `"${newUser.name}" fue agregado con rol "${newUser.role}".`,
            icon: 'user-plus',
            color: '#8b5cf6'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.put('/api/users/:id', requireSuperAdmin, async (req, res) => {
    const userId = req.params.id;
    const updatedFields = req.body;
    try {
        let dbState = await readDb();
        const userIndex = dbState.users.findIndex(u => u.id == userId);
        if (userIndex !== -1) {
            dbState.users[userIndex] = { ...dbState.users[userIndex], ...updatedFields };
            const u = dbState.users[userIndex];

            pushNotification(dbState, {
                title: 'Usuario Actualizado',
                desc: `Los datos de "${u.name}" fueron modificados.`,
                icon: 'user-cog',
                color: '#3b82f6'
            });

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true, user: dbState.users[userIndex] });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.delete('/api/users/:id', requireSuperAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        let dbState = await readDb();
        const u = dbState.users.find(u => u.id == userId);
        const initialLength = dbState.users.length;
        dbState.users = dbState.users.filter(u => u.id != userId);

        if (dbState.users.length < initialLength) {
            if (u) {
                pushNotification(dbState, {
                    title: 'Usuario Eliminado',
                    desc: `"${u.name}" fue eliminado del sistema.`,
                    icon: 'user-x',
                    color: '#ef4444'
                });
            }

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// CONFIGURACIÓN
// ============================================================
app.get('/api/settings', async (req, res) => {
    try {
        const dbState = await readDb();
        const publicConfig = {
            logo: dbState.config?.logo || null,
            companyName: dbState.config?.companyName || 'AS Sierra Systems',
            supportEmail: dbState.config?.supportEmail || 'soporte@assierrasystems.com',
            supportPhone: dbState.config?.supportPhone || '573001234567',
            recommendedModuleId: dbState.config?.recommendedModuleId || null,
            multiSedeDiscount: dbState.config?.multiSedeDiscount !== undefined ? dbState.config.multiSedeDiscount : 30,
            recommendedLabel: dbState.config?.recommendedLabel || 'RECOMENDADO'
        };
        const publicModules = (dbState.modules || []).map(m => ({
            id: m.id,
            name: m.name,
            desc: m.desc || null,
            icon: m.icon || null,
            price: m.price,
            status: m.status,
            image: m.image || null
        }));
        const publicPromotions = (dbState.promotions || []).filter(p => p.status === 'active');
        res.json({ config: publicConfig, modules: publicModules, promotions: publicPromotions });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.post('/api/settings/save', requireSuperAdmin, async (req, res) => {
    const { logo, companyName, supportEmail, supportPhone, adminUser, adminPass, currentPass, recommendedModuleId, multiSedeDiscount, recommendedLabel, syncExisting } = req.body;
    try {
        let dbState = await readDb();
        if (!dbState.config) dbState.config = {};

        const masterPass = dbState.config.adminPass || '123456';

        const isChangingUser = adminUser && adminUser !== (dbState.config.adminUser || 'admin');
        const isChangingPass = !!adminPass;

        if (isChangingUser || isChangingPass) {
            if (!db.verifyPassword(currentPass, masterPass)) {
                return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
            }
        }

        if (logo) dbState.config.logo = logo;
        if (companyName) dbState.config.companyName = companyName;
        if (supportEmail) dbState.config.supportEmail = supportEmail;
        if (supportPhone) dbState.config.supportPhone = supportPhone;
        if (adminUser) dbState.config.adminUser = adminUser;
        if (adminPass) dbState.config.adminPass = db.hashPassword(adminPass);

        if (recommendedModuleId !== undefined) dbState.config.recommendedModuleId = recommendedModuleId;
        if (multiSedeDiscount !== undefined) dbState.config.multiSedeDiscount = parseInt(multiSedeDiscount);
        if (recommendedLabel !== undefined) dbState.config.recommendedLabel = recommendedLabel;

        if (syncExisting && multiSedeDiscount !== undefined) {
            const newDisc = parseInt(multiSedeDiscount);
            (dbState.businesses || []).forEach(biz => {
                const instancesByModule = {};
                (biz.moduleInstances || []).forEach(inst => {
                    if (inst.status === 'active') {
                        if (!instancesByModule[inst.moduleId]) {
                            instancesByModule[inst.moduleId] = [];
                        }
                        instancesByModule[inst.moduleId].push(inst);
                    }
                });

                Object.keys(instancesByModule).forEach(modId => {
                    const insts = instancesByModule[modId];
                    if (insts.length > 1) {
                        insts.sort((a, b) => String(a.instanceId).localeCompare(String(b.instanceId)));
                        const secondaries = insts.slice(1);
                        
                        const modObj = dbState.modules.find(m => String(m.id) === String(modId));
                        if (modObj) {
                            const basePrice = parseInt(String(modObj.price).replace(/\D/g, '')) || 0;
                            if (basePrice > 0) {
                                const promoPrice = getActivePromoPrice(dbState, modId, basePrice);
                                const newDiscounted = Math.round(promoPrice * (1 - newDisc / 100));

                                secondaries.forEach(sec => {
                                    sec.priceApplied = newDiscounted;
                                });
                            }
                        }
                    }
                });
            });
        }

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        console.error('Error al guardar ajustes:', err);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// BACKUP Y RESTAURACIÓN DE BASE DE DATOS (SUPER ADMIN ONLY)
// ============================================================

app.get('/api/admin/backup', requireSuperAdmin, async (req, res) => {
    try {
        const backupData = await db.exportBackupData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `sierra_backup_${timestamp}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(backupData);
        console.log(`[Backup] ✅ Backup exportado exitosamente: ${filename}`);
    } catch (err) {
        console.error('[Backup] ❌ Error al exportar backup:', err.message);
        res.status(500).json({ success: false, error: 'Error al generar el backup: ' + err.message });
    }
});

app.post('/api/admin/backup/restore', requireSuperAdmin, async (req, res) => {
    const backup = req.body;
    try {
        if (!backup || typeof backup !== 'object') {
            return res.status(400).json({ success: false, error: 'Cuerpo de la petición inválido. Se esperaba JSON.' });
        }
        await db.importBackupData(backup);
        broadcastUpdate();
        console.log(`[Backup] ✅ Restauración completada por: ${req.adminUser?.name || req.adminUser?.user}`);
        res.json({ success: true, message: 'Base de datos restaurada correctamente.' });
    } catch (err) {
        console.error('[Backup] ❌ Error al restaurar backup:', err.message);
        res.status(500).json({ success: false, error: 'Error al restaurar: ' + err.message });
    }
});

// ============================================================
// MÓDULOS (WRITE ACCESS)
// ============================================================
app.put('/api/modules/:id', requireWriteAccess, async (req, res) => {
    const modId = req.params.id;
    const updatedFields = req.body;
    try {
        let dbState = await readDb();
        const moduleIndex = dbState.modules.findIndex(m => String(m.id) === String(modId));
        if (moduleIndex !== -1) {
            dbState.modules[moduleIndex] = { ...dbState.modules[moduleIndex], ...updatedFields };
        } else {
            const newMod = { id: modId, ...updatedFields };
            if (!dbState.modules) dbState.modules = [];
            dbState.modules.push(newMod);
        }

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// CLIENT: Cancelar suscripción de módulo (sin eliminar acceso inmediato)
// ============================================================
app.post('/api/client/module/cancel', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });
    const { moduleId, moduleName, instanceId } = req.body;
    if (!moduleId && !instanceId) return res.status(400).json({ error: 'moduleId o instanceId es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];

        // Sincronizar/inicializar moduleInstances y modules si es necesario
        if (!biz.moduleInstances) biz.moduleInstances = [];
        if (!biz.modules) biz.modules = [];

        let targetInstance = null;

        if (instanceId) {
            targetInstance = biz.moduleInstances.find(inst => inst.instanceId === instanceId);
        } else {
            // Si no mandan instanceId, buscar el primer instance activo de ese moduleId
            targetInstance = biz.moduleInstances.find(inst => String(inst.moduleId) === String(moduleId) && inst.status === 'active');
        }

        if (targetInstance) {
            // Cambiar estado de la instancia a cancelado
            targetInstance.status = 'cancelled';
            targetInstance.cancelledAt = new Date().toISOString();
            targetInstance.accessUntil = targetInstance.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            
            // Si ya no quedan instancias activas de este moduleId, quitarlo de biz.modules
            const activeInstancesLeft = biz.moduleInstances.filter(inst => String(inst.moduleId) === String(targetInstance.moduleId) && inst.status === 'active');
            if (activeInstancesLeft.length === 0) {
                biz.modules = biz.modules.filter(id => String(id) !== String(targetInstance.moduleId));
            }

            // También mantener compatibilidad con biz.cancelledModules
            if (!biz.cancelledModules) biz.cancelledModules = [];
            biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(targetInstance.moduleId));
            biz.cancelledModules.push({
                id: targetInstance.moduleId,
                name: moduleName || targetInstance.moduleId,
                cancelledAt: targetInstance.cancelledAt,
                accessUntil: targetInstance.accessUntil
            });
        } else {
            // Comportamiento legacy por si acaso
            if (biz.modules.some(id => String(id) === String(moduleId))) {
                biz.modules = biz.modules.filter(id => String(id) !== String(moduleId));
                let renewalDate = biz.moduleDates?.[moduleId] ? new Date(biz.moduleDates[moduleId]) : new Date();
                
                if (!biz.cancelledModules) biz.cancelledModules = [];
                biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));
                biz.cancelledModules.push({
                    id: moduleId,
                    name: moduleName || moduleId,
                    cancelledAt: new Date().toISOString(),
                    accessUntil: renewalDate.toISOString()
                });
            } else {
                return res.status(400).json({ error: 'La suscripción no está activa.' });
            }
        }

        pushNotification(dbState, {
            title: 'Suscripción Suspendida',
            desc: `"${biz.name}" suspendió "${moduleName || moduleId}" (${targetInstance?.branchName || 'Sede Principal'}).`,
            icon: 'pause-circle',
            color: '#f59e0b'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, cancelledModules: biz.cancelledModules, modules: biz.modules, moduleInstances: biz.moduleInstances });
    } catch (err) {
        console.error('[CancelModule] Error:', err);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// CLIENT: Reactivar módulo cancelado
// ============================================================
app.post('/api/client/module/reactivate', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });
    const { moduleId, instanceId } = req.body;
    if (!moduleId && !instanceId) return res.status(400).json({ error: 'moduleId o instanceId es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];

        // Verificar estado global del módulo antes de reactivar
        let targetModuleId = moduleId;
        if (instanceId && biz.moduleInstances) {
            const inst = biz.moduleInstances.find(i => i.instanceId === instanceId);
            if (inst) targetModuleId = inst.moduleId;
        }
        if (targetModuleId) {
            const baseModule = (dbState.modules || []).find(m => String(m.id) === String(targetModuleId));
            if (baseModule) {
                if (baseModule.status === 'maintenance') {
                    return res.status(400).json({ error: 'El módulo se encuentra actualmente en mantenimiento y no puede ser reactivado.' });
                }
                if (baseModule.status === 'coming_soon') {
                    return res.status(400).json({ error: 'El módulo estará disponible próximamente y no puede ser reactivado.' });
                }
                if (baseModule.status === 'hidden') {
                    return res.status(400).json({ error: 'El módulo no está disponible.' });
                }
            }
        }

        // Sincronizar/inicializar moduleInstances y modules si es necesario
        if (!biz.moduleInstances) biz.moduleInstances = [];
        if (!biz.modules) biz.modules = [];

        let targetInstance = null;

        if (instanceId) {
            targetInstance = biz.moduleInstances.find(inst => inst.instanceId === instanceId);
        } else {
            // Si no mandan instanceId, buscar el primer instance cancelado de ese moduleId
            targetInstance = biz.moduleInstances.find(inst => String(inst.moduleId) === String(moduleId) && inst.status === 'cancelled');
        }

        if (targetInstance) {
            const originalExpiry = new Date(targetInstance.accessUntil || targetInstance.renewalDate);
            if (originalExpiry.getTime() <= Date.now()) {
                return res.status(403).json({ 
                    error: 'Tu ciclo de acceso ha expirado. Contacta al administrador para renovar tu suscripción.' 
                });
            }

            // Cambiar estado a activo
            targetInstance.status = 'active';
            targetInstance.renewalDate = targetInstance.accessUntil;
            targetInstance.cancelledAt = null;
            targetInstance.accessUntil = null;

            // Asegurar que el moduleId esté en biz.modules
            if (!biz.modules.some(id => String(id) === String(targetInstance.moduleId))) {
                biz.modules.push(targetInstance.moduleId);
            }

            // Quitar de biz.cancelledModules si no quedan más cancelados de ese tipo
            const cancelledInstancesLeft = biz.moduleInstances.filter(inst => String(inst.moduleId) === String(targetInstance.moduleId) && inst.status === 'cancelled');
            if (cancelledInstancesLeft.length === 0) {
                biz.cancelledModules = (biz.cancelledModules || []).filter(cm => String(cm.id) !== String(targetInstance.moduleId));
            }
        } else {
            // Comportamiento legacy por si acaso
            const cancelledEntry = (biz.cancelledModules || []).find(cm => String(cm.id) === String(moduleId));
            if (!cancelledEntry) return res.status(400).json({ error: 'El módulo no está suspendido.' });

            const originalExpiry = new Date(cancelledEntry.accessUntil);
            if (originalExpiry.getTime() <= Date.now()) {
                return res.status(403).json({ 
                    error: 'Tu ciclo de acceso ha expirado. Contacta al administrador para renovar tu suscripción.' 
                });
            }

            // Quitar de cancelados
            biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));

            // Devolver a activos
            if (!biz.modules.some(id => String(id) === String(moduleId))) {
                biz.modules.push(moduleId);
            }

            if (!biz.moduleDates) biz.moduleDates = {};
            biz.moduleDates[moduleId] = cancelledEntry.accessUntil;
        }

        pushNotification(dbState, {
            title: 'Suscripción Reactivada',
            desc: `"${biz.name}" reactivó "${targetInstance?.moduleId || moduleId}" (${targetInstance?.branchName || 'Sede Principal'}).`,
            icon: 'refresh-cw',
            color: '#10b981'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, modules: biz.modules, moduleInstances: biz.moduleInstances, cancelledModules: biz.cancelledModules, moduleDates: biz.moduleDates });
    } catch (err) {
        console.error('[ReactivateModule] Error:', err);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.post('/api/client/module/renew', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });
    const { moduleId, moduleName, last4, branchName, instanceId } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];
        const allModules = dbState.modules || [];
        const baseModule = allModules.find(m => String(m.id) === String(moduleId));
        if (!baseModule) return res.status(404).json({ error: 'Módulo no encontrado.' });
        if (baseModule.status === 'maintenance') {
            return res.status(400).json({ error: 'El módulo se encuentra actualmente en mantenimiento y no puede ser adquirido o renovado.' });
        }
        if (baseModule.status === 'coming_soon') {
            return res.status(400).json({ error: 'El módulo estará disponible próximamente y aún no puede ser adquirido.' });
        }
        if (baseModule.status === 'hidden') {
            return res.status(400).json({ error: 'El módulo no está disponible.' });
        }
        
        let basePrice = 0;
        if (baseModule && baseModule.price) {
            basePrice = parseInt(String(baseModule.price).replace(/[^0-9]/g, ''), 10) || 0;
        }

        // Initialize arrays if they don't exist
        if (!biz.moduleInstances) biz.moduleInstances = [];
        if (!biz.modules) biz.modules = [];
        
        // Convert legacy modules to instances if they don't exist in moduleInstances
        if (biz.moduleInstances.length === 0 && biz.modules.length > 0) {
            for (let i = 0; i < biz.modules.length; i++) {
                const legacyModId = biz.modules[i];
                const renewalDate = biz.moduleDates && biz.moduleDates[legacyModId] ? biz.moduleDates[legacyModId] : null;
                const legacyMod = allModules.find(m => String(m.id) === String(legacyModId));
                let legacyPrice = 0;
                if (legacyMod && legacyMod.price) {
                    legacyPrice = parseInt(String(legacyMod.price).replace(/[^0-9]/g, ''), 10) || 0;
                }
                biz.moduleInstances.push({
                    instanceId: `${biz.id}-${legacyModId}-${i}`,
                    moduleId: legacyModId,
                    branchName: 'Sede Principal',
                    status: 'active',
                    priceApplied: legacyPrice,
                    renewalDate: renewalDate
                });
            }
        }

        // Check if there are active instances of THIS module already
        const activeInstancesOfModule = biz.moduleInstances.filter(m => String(m.moduleId) === String(moduleId) && m.status === 'active');
        const hasExisting = activeInstancesOfModule.length > 0;
        
        // 1. Obtener precio base considerando promociones activas
        const promoPrice = getActivePromoPrice(dbState, moduleId, basePrice);

        // 2. Si ya tiene una sede de este módulo, aplicamos descuento sobre el precio promocional (acumulativo)
        let priceApplied = promoPrice;
        let isDiscountApplied = false;
        if (hasExisting) {
            const discPct = dbState.config?.multiSedeDiscount !== undefined ? parseFloat(dbState.config.multiSedeDiscount) : 30;
            priceApplied = Math.round(promoPrice * (1 - discPct / 100));
            isDiscountApplied = true;
        }

        // Remove from cancelled if exists (mostly legacy fallback or simple reactivation)
        if (biz.cancelledModules) {
            biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));
        }
        
        // Also remove specific instance from cancelled if reactivation
        // if we implemented specific instance reactivation... (kept simple for now)

        if (!biz.modules.some(id => String(id) === String(moduleId))) {
            biz.modules.push(moduleId);
        }

        let targetInstance = null;
        if (instanceId) {
            targetInstance = biz.moduleInstances.find(m => m.instanceId === instanceId);
        }

        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const newExpiryStr = newExpiry.toISOString();

        let finalBranchName;
        let finalInstanceId;
        
        if (targetInstance) {
            // Renovar/Extender instancia existente
            finalBranchName = branchName || targetInstance.branchName;
            finalInstanceId = targetInstance.instanceId;
            
            // Extender la fecha de renovación
            const currentRenewal = targetInstance.renewalDate || targetInstance.accessUntil;
            const baseDate = (currentRenewal && new Date(currentRenewal).getTime() > Date.now()) 
                ? new Date(currentRenewal) 
                : new Date();
            const extendedExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            targetInstance.status = 'active';
            targetInstance.priceApplied = priceApplied;
            targetInstance.renewalDate = extendedExpiry.toISOString();
            targetInstance.cancelledAt = null;
            targetInstance.accessUntil = null;
            
            // Actualizar también la fecha legacy si corresponde
            if (!biz.moduleDates) biz.moduleDates = {};
            biz.moduleDates[moduleId] = targetInstance.renewalDate;
        } else {
            // Crear nueva instancia
            finalBranchName = branchName || (hasExisting ? `Sede ${activeInstancesOfModule.length + 1}` : 'Sede Principal');
            finalInstanceId = `inst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            biz.moduleInstances.push({
                instanceId: finalInstanceId,
                moduleId: moduleId,
                branchName: finalBranchName,
                status: 'active',
                priceApplied: priceApplied,
                renewalDate: newExpiryStr
            });
            
            if (!biz.moduleDates) biz.moduleDates = {};
            biz.moduleDates[moduleId] = newExpiryStr;
        }

        const finalExpiryStr = targetInstance ? targetInstance.renewalDate : newExpiryStr;
        const finalExpiryFormatted = new Date(finalExpiryStr).toLocaleDateString('es-CO');

        // Registrar en historial de pagos SQL directo (Compra/Renovación Módulo)
        try {
            await db.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                session.clientId,
                priceApplied,
                `Adquisición / Renovación de Módulo — ${moduleName || moduleId} (${finalBranchName})`,
                'APPROVED',
                `sim_txn_${Date.now()}_${Math.floor(Math.random()*1000)}`
            ]);
        } catch (dbErr) {
            console.error('[RenewModule] Error registrando historial de pago:', dbErr.message);
        }

        const discPct = dbState.config?.multiSedeDiscount !== undefined ? parseFloat(dbState.config.multiSedeDiscount) : 30;
        pushNotification(dbState, {
            title: 'Pago Recibido',
            desc: `"${biz.name}" adquirió/renovó "${moduleName || moduleId}" (${finalBranchName}) con tarjeta terminada en ${last4 || '****'}. Válido hasta ${finalExpiryFormatted}.${isDiscountApplied ? ` ¡Descuento de ${discPct}% aplicado!` : ''}`,
            icon: 'credit-card',
            color: '#10b981'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, modules: biz.modules, moduleInstances: biz.moduleInstances, cancelledModules: biz.cancelledModules, moduleDates: biz.moduleDates });
    } catch (err) {
    }
});

// CLIENT: Personalizar/Renombrar una sede o sucursal (incluida la Sede Principal)
app.post('/api/client/module/instance/rename', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });

    const { instanceId, branchName } = req.body;
    if (!instanceId || !branchName || !branchName.trim()) {
        return res.status(400).json({ error: 'instanceId y branchName son requeridos.' });
    }

    const cleanInstanceId = String(instanceId).trim();

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) {
            console.error('[RenameInstance] Negocio no encontrado. clientId:', session.clientId);
            return res.status(404).json({ error: 'Negocio no encontrado.' });
        }

        const biz = dbState.businesses[bizIndex];
        if (!biz.moduleInstances) biz.moduleInstances = [];

        console.log('[RenameInstance] Buscando instanceId:', cleanInstanceId, '| Instancias disponibles:', biz.moduleInstances.map(m => m.instanceId));
        const targetInstance = biz.moduleInstances.find(m => String(m.instanceId).trim() === cleanInstanceId);
        if (!targetInstance) {
            return res.status(404).json({ error: 'Instancia de módulo no encontrada.' });
        }

        const oldName = targetInstance.branchName || 'Sede Principal';
        targetInstance.branchName = branchName.trim();

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, branchName: targetInstance.branchName, moduleInstances: biz.moduleInstances });
    } catch (err) {
        console.error('[RenameInstance] Error:', err);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ====== CLIENTE: AUTO-PAGO DE SALDO PENDIENTE Y AUTO-REACTIVACIÓN ======
app.post('/api/client/pay-pending-balance', paymentLimiter, async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];
        if (!biz.billing?.gateway_token) {
            return res.status(400).json({ error: 'No tienes ninguna tarjeta registrada. Por favor, agrega una tarjeta primero.' });
        }

        // 1. Calcular monto total acumulado adeudado (basado en sedes activas)
        let totalAmount = 0;
        const activeInstances = biz.moduleInstances ? biz.moduleInstances.filter(m => m.status === 'active') : [];
        if (activeInstances.length > 0) {
            for (const inst of activeInstances) {
                const p = parseFloat(inst.priceApplied) || 0;
                totalAmount += p;
            }
        } else {
            // Fallback legacy
            for (const modId of (biz.modules || [])) {
                const mod = (dbState.modules || []).find(m => m.id === modId);
                if (mod?.price) {
                    const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                    if (!isNaN(p)) totalAmount += p;
                }
            }
        }

        if (totalAmount === 0) {
            return res.status(400).json({ error: 'El monto adeudado es $0. No tienes cobros pendientes.' });
        }

        // 2. Procesar el pago con la tarjeta (Wompi Sandbox)
        const result = await PaymentService.chargeWithToken(
            biz.billing.gateway_token,
            totalAmount * 100,
            `Auto-reactivación de Suscripción — ${biz.name}`
        );

        if (result.ok) {
            // 3. Reactivar el negocio y la facturación
            biz.billing.subscription_status = 'active';
            biz.status = 'active'; // Reactivar negocio
            biz.billing.last_payment_date = new Date().toISOString();
            biz.billing.last_payment_amount = totalAmount;
            
            // Renovar las fechas de vencimiento de las sucursales cobradas (+30 días desde HOY)
            const d = new Date();
            d.setDate(d.getDate() + 30);
            const nextDateStr = d.toISOString().slice(0, 10);
            biz.billing.next_billing_date = nextDateStr;
            biz.billing.last_transaction_id = result.transactionId;

            if (biz.moduleInstances) {
                for (const mod of biz.moduleInstances) {
                    if (mod.status === 'active') {
                        mod.renewalDate = nextDateStr;
                    }
                }
            }

            // Registrar en historial de pagos SQL directo
            await db.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                session.clientId,
                totalAmount,
                `Auto-reactivación de Suscripción — ${biz.name}`,
                'APPROVED',
                result.transactionId
            ]);

            // Notificación global
            pushNotification(dbState, {
                title: 'Auto-Reactivación Exitosa',
                desc: `✅ ${biz.name} se auto-reactivó exitosamente tras pagar $${totalAmount.toLocaleString('es-CO')} COP. TXN: ${result.transactionId}`,
                icon: 'check-circle',
                color: '#10b981'
            });

            await writeDb(dbState);
            broadcastUpdate();

            res.json({
                success: true,
                message: `¡Pago exitoso! Tu portal ha sido reactivado al instante. TXN: ${result.transactionId}`,
                nextBillingDate: nextDateStr,
                monthlyTotal: totalAmount
            });
        } else {
            // Registrar en historial de pagos como fallido SQL directo
            await db.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                session.clientId,
                totalAmount,
                `Intento Auto-reactivación Fallido — ${biz.name}`,
                'DECLINED',
                null
            ]);

            // Si falla, actualizar registro
            biz.billing.last_failed_attempt = new Date().toISOString();
            await writeDb(dbState);
            broadcastUpdate();
            
            res.status(400).json({
                error: `Pago rechazado por el procesador: ${result.message}`
            });
        }
    } catch (err) {
        console.error('[AutoReactivation] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor al procesar tu reactivación.' });
    }
});

// ============================================================
// MÓDULOS ESTÁTICOS Y FRONTEND (Rutas Genéricas Pro)
// ============================================================
app.use('/modules/order-system', express.static(path.join(__dirname, 'modulos', 'menu_comida')));
app.use('/modules/agenda', express.static(path.join(__dirname, 'modulos', 'agenda')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'super-admin.html'));
});

// ============================================================
// RUTAS DE PAGOS — Tokenización y Suscripciones
// ============================================================

/**
 * POST /api/payment/save-token
 */
app.post('/api/payment/save-token', requireAdminOrMatchingClient, paymentLimiter, async (req, res) => {
    try {
        const { bizId, token, last_four, card_brand, card_expiry, card_holder, next_billing_date } = req.body;
        if (!bizId || !token || !last_four || !card_brand) {
            return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios.' });
        }

        // Si el usuario es un cliente, verificar que solo pueda modificar su propio negocio
        if (req.userRole === 'client' && String(req.clientId) !== String(bizId)) {
            return res.status(403).json({ ok: false, message: 'Acceso denegado. No puedes modificar la tarjeta de este negocio.' });
        }

        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

        biz.billing = {
            ...(biz.billing || {}),
            gateway_token: token,
            last_four,
            card_brand,
            card_expiry: card_expiry || biz.billing?.card_expiry || '',
            card_holder: card_holder || biz.billing?.card_holder || '',
            subscription_status: 'active',
            next_billing_date: next_billing_date || biz.billing?.next_billing_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            last_payment_date: biz.billing?.last_payment_date || null,
            last_payment_amount: biz.billing?.last_payment_amount || 0,
        };

        await writeDb(dbState);
        broadcastUpdate();
        console.log(`[Payment] Token guardado para negocio: ${biz.name}`);
        res.json({ ok: true, message: 'Tarjeta guardada exitosamente.' });
    } catch (err) {
        console.error('[Payment] Error guardando token:', err);
        res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
    }
});

/**
 * POST /api/payment/charge-subscription/:bizId
 */
app.post('/api/payment/charge-subscription/:bizId', requireSuperAdmin, async (req, res) => {
    try {
        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == req.params.bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });
        if (!biz.billing?.gateway_token) {
            return res.status(400).json({ ok: false, message: 'Este negocio no tiene una tarjeta guardada.' });
        }

        // Calcular monto basado en sucursales activas (moduleInstances)
        let totalAmount = 0;
        const activeInstances = biz.moduleInstances ? biz.moduleInstances.filter(m => m.status === 'active') : [];
        if (activeInstances.length > 0) {
            for (const inst of activeInstances) {
                const p = parseFloat(inst.priceApplied) || 0;
                totalAmount += p;
            }
        } else {
            // Fallback legacy
            for (const modId of (biz.modules || [])) {
                const mod = (dbState.modules || []).find(m => m.id === modId);
                if (mod?.price) {
                    const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                    if (!isNaN(p)) totalAmount += p;
                }
            }
        }

        if (totalAmount === 0) {
            return res.status(400).json({ ok: false, message: 'El monto calculado es $0. Verifique los módulos asignados.' });
        }

        const result = await PaymentService.chargeWithToken(
            biz.billing.gateway_token,
            totalAmount * 100,
            `Suscripción Módulo — ${biz.name}`
        );

        const updatedBiz = dbState.businesses.find(b => b.id == req.params.bizId);
        if (result.ok) {
            updatedBiz.billing.subscription_status = 'active';
            updatedBiz.status = 'active'; // Alinear estado del negocio
            updatedBiz.billing.last_payment_date = new Date().toISOString();
            updatedBiz.billing.last_payment_amount = totalAmount;
            const d = new Date();
            d.setDate(d.getDate() + 30);
            const nextDateStr = d.toISOString().slice(0, 10);
            updatedBiz.billing.next_billing_date = nextDateStr;
            updatedBiz.billing.last_transaction_id = result.transactionId;

            // Sincronizar fechas de renovación de todas las sucursales cobradas (+30 días)
            if (updatedBiz.moduleInstances) {
                for (const mod of updatedBiz.moduleInstances) {
                    if (mod.status === 'active') {
                        mod.renewalDate = nextDateStr;
                    }
                }
            }

            // Registrar en historial de pagos SQL directo (Super Admin Manual)
            await db.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                biz.id,
                totalAmount,
                `Cobro Manual de Suscripción — ${biz.name}`,
                'APPROVED',
                result.transactionId
            ]);
        } else {
            updatedBiz.billing.subscription_status = 'suspended';
            updatedBiz.status = 'inactive'; // Alinear estado del negocio
            updatedBiz.billing.last_failed_attempt = new Date().toISOString();

            // Registrar en historial de pagos como fallido SQL directo
            await db.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                biz.id,
                totalAmount,
                `Intento Cobro Manual Fallido — ${biz.name}`,
                'DECLINED',
                null
            ]);
        }

        pushNotification(dbState, {
            title: result.ok ? 'Cobro Manual Exitoso' : 'Cobro Manual Fallido',
            desc: result.ok
                ? `✅ Cobro manual exitoso: ${biz.name} — $${totalAmount.toLocaleString('es-CO')} COP`
                : `❌ Cobro fallido: ${biz.name} — ${result.message}`,
            icon: result.ok ? 'check-circle' : 'x-circle',
            color: result.ok ? '#10b981' : '#ef4444'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ ok: result.ok, message: result.ok ? `Cobro exitoso. TXN: ${result.transactionId}` : result.message, result });
    } catch (err) {
        console.error('[Payment] Error en cobro manual:', err);
        res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
    }
});

/**
 * DELETE /api/payment/remove-card/:bizId
 */
app.delete('/api/payment/remove-card/:bizId', requireAdminOrMatchingClient, async (req, res) => {
    try {
        const { bizId } = req.params;

        // Si el usuario es un cliente, verificar que solo pueda modificar su propio negocio
        if (req.userRole === 'client' && String(req.clientId) !== String(bizId)) {
            return res.status(403).json({ ok: false, message: 'Acceso denegado. No puedes eliminar la tarjeta de este negocio.' });
        }

        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

        biz.billing = {
            ...(biz.billing || {}),
            gateway_token: null,
            last_four: null,
            card_brand: null
        };

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ ok: true, message: 'Tarjeta eliminada.' });
    } catch (err) {
        console.error('[Payment] Error eliminando tarjeta:', err);
        res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
    }
});

/**
 * POST /api/payment/extend-billing/:bizId
 * Regala días adicionales extendiendo la fecha de próximo corte.
 */
app.post('/api/payment/extend-billing/:bizId', requireSuperAdmin, async (req, res) => {
    try {
        const { bizId } = req.params;
        const { days, instanceId } = req.body;
        const daysInt = parseInt(days, 10);

        if (!daysInt || daysInt < 1 || daysInt > 365) {
            return res.status(400).json({ ok: false, message: 'El número de días debe estar entre 1 y 365.' });
        }

        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

        let targetInstance = null;
        if (instanceId && biz.moduleInstances) {
            targetInstance = biz.moduleInstances.find(inst => inst.instanceId === instanceId);
        }

        let newDateStr = '';
        let moduleName = '';
        let branchName = '';

        // Función de análisis de fecha segura
        const parseDate = (dStr) => {
            if (!dStr) return new Date();
            let dateObj;
            if (dStr.includes('T') || dStr.includes(' ') || dStr.length > 10) {
                dateObj = new Date(dStr);
            } else {
                dateObj = new Date(dStr + 'T00:00:00');
            }
            return isNaN(dateObj.getTime()) ? new Date() : dateObj;
        };

        if (targetInstance) {
            // Calcular nueva fecha de corte para esta instancia específica
            const currentRenewal = targetInstance.renewalDate || biz.billing?.next_billing_date;
            const baseDate = parseDate(currentRenewal);
            baseDate.setDate(baseDate.getDate() + daysInt);
            newDateStr = baseDate.toISOString().slice(0, 10);
            targetInstance.renewalDate = newDateStr;

            // Reactivar instancia si estaba cancelada/suspendida
            targetInstance.status = 'active';

            // Sincronizar también con la fecha global de corte del negocio si aplica
            biz.billing = {
                ...(biz.billing || {}),
                next_billing_date: newDateStr,
                subscription_status: biz.billing?.subscription_status === 'suspended' ? 'active' : (biz.billing?.subscription_status || 'active')
            };

            const mod = dbState.modules.find(m => m.id === targetInstance.moduleId);
            moduleName = mod ? mod.name : targetInstance.moduleId;
            branchName = targetInstance.branchName || 'Sede Principal';
        } else {
            // Caso general o legacy (sin instanceId)
            const currentNext = biz.billing?.next_billing_date;
            const baseDate = parseDate(currentNext);
            baseDate.setDate(baseDate.getDate() + daysInt);
            newDateStr = baseDate.toISOString().slice(0, 10);

            biz.billing = {
                ...(biz.billing || {}),
                next_billing_date: newDateStr,
                subscription_status: biz.billing?.subscription_status === 'suspended' ? 'active' : (biz.billing?.subscription_status || 'active')
            };

            // Sincronizar también en todos los moduleInstances activos
            if (biz.moduleInstances) {
                for (const inst of biz.moduleInstances) {
                    if (inst.status === 'active') inst.renewalDate = newDateStr;
                }
            }
        }

        // Registrar en historial de pagos SQL directo (Obsequio de Días)
        const concept = `Cortesía / Obsequio de ${daysInt} días — ${targetInstance ? `${moduleName} (${branchName})` : 'Suscripción General'}`;
        try {
            await db.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `pay_gift_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                bizId,
                0.00, // $0 COP
                concept,
                'APPROVED',
                `gift_txn_${Date.now()}_${Math.floor(Math.random()*1000)}`
            ]);
        } catch (dbErr) {
            console.error('[ExtendBilling] Error registrando historial de obsequio:', dbErr.message);
        }

        // Registrar notificación en tiempo real para auditoría
        pushNotification(dbState, {
            title: 'Días de Cortesía Otorgados',
            desc: `Se obsequiaron ${daysInt} días adicionales a "${biz.name}" en ${targetInstance ? `${moduleName} (${branchName})` : 'Suscripción General'}.`,
            icon: 'gift',
            color: '#10b981'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ ok: true, message: `Se regalaron ${daysInt} día(s) al módulo. Nuevo corte: ${newDateStr}.`, newDate: newDateStr });
    } catch (err) {
        console.error('[Payment] Error extendiendo suscripción:', err);
        res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
    }
});

/**
 * POST /api/payment/trigger-billing
 */
app.post('/api/payment/trigger-billing', requireSuperAdmin, async (req, res) => {
    try {
        const dryRun = req.body.dryRun === true;
        const result = await runBillingCycle(dryRun);
        res.json({ ok: true, dryRun, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ============================================================
// WEBHOOK — Eventos asíncronos de Wompi
// ============================================================
app.post('/api/webhooks/wompi', async (req, res) => {
    try {
        const signature = req.headers['x-event-checksum'];
        const payload = req.body;

        if (!PaymentService.validateWebhookSignature(payload, signature)) {
            console.warn('[Webhook] ⚠️  Firma inválida. Posible intento de falsificación.');
            return res.status(401).json({ error: 'Firma inválida.' });
        }

        const eventType = payload.event;
        const transaction = payload.data?.transaction;

        if (!transaction) {
            return res.status(200).json({ ok: true, message: 'Evento recibido (sin transacción).' });
        }

        console.log(`[Webhook] Evento recibido: ${eventType} | TXN: ${transaction.id} | Estado: ${transaction.status}`);

        const dbState = await readDb();
        let updated = false;

        const biz = (dbState.businesses || []).find(
            b => b.billing?.last_transaction_id === transaction.id
        );

        if (biz) {
            if (transaction.status === 'APPROVED') {
                biz.billing.subscription_status = 'active';
                pushNotification(dbState, {
                    title: 'Pago Confirmado (Webhook)',
                    desc: `✅ Webhook: Pago confirmado para ${biz.name}. TXN: ${transaction.id}`,
                    icon: 'check-circle',
                    color: '#10b981'
                });
                updated = true;
            } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(transaction.status)) {
                biz.billing.subscription_status = 'suspended';
                pushNotification(dbState, {
                    title: 'Pago Fallido (Webhook)',
                    desc: `❌ Webhook: Pago fallido para ${biz.name} (${transaction.status}). TXN: ${transaction.id}`,
                    icon: 'x-circle',
                    color: '#ef4444'
                });
                updated = true;
            }

            if (updated) {
                await writeDb(dbState);
                broadcastUpdate();
            }
        } else {
            console.log(`[Webhook] No se encontró negocio con TXN: ${transaction.id}`);
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[Webhook] Error procesando evento:', err);
        res.status(200).json({ ok: false, message: err.message });
    }
});

// ============================================================
// PAYMENT HISTORY ENDPOINTS
// ============================================================

app.get('/api/payments/history', requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await db.pool.query(`
            SELECT ph.*, b.name as business_name 
            FROM payment_history ph
            JOIN businesses b ON ph.business_id = b.id
            ORDER BY ph.created_at DESC
        `);
        res.json({ success: true, history: rows });
    } catch (err) {
        console.error('Error al obtener historial de pagos:', err);
        res.status(500).json({ success: false, error: 'Error al consultar historial de pagos.' });
    }
});

app.get('/api/client/payments', requireAdminOrMatchingClient, async (req, res) => {
    let bizId = req.clientId;
    if (req.userRole === 'admin' && req.query.bizId) {
        bizId = req.query.bizId;
    }
    if (!bizId) {
        return res.status(400).json({ success: false, error: 'Identificador de negocio requerido.' });
    }
    try {
        const [rows] = await db.pool.query(`
            SELECT * FROM payment_history 
            WHERE business_id = ?
            ORDER BY created_at DESC
        `, [bizId]);
        res.json({ success: true, history: rows });
    } catch (err) {
        console.error('Error al obtener historial de pagos del cliente:', err);
        res.status(500).json({ success: false, error: 'Error al consultar historial de pagos.' });
    }
});

// ============================================================
// TICKETS DE SOPORTE (Híbrido: BD + WhatsApp)
// ============================================================

// CLIENT: Crear nuevo ticket
app.post('/api/tickets', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });

    const { module: ticketModule, priority, description } = req.body || {};
    if (!ticketModule || !description || description.length < 10) {
        return res.status(400).json({ error: 'Módulo y descripción (mín. 10 caracteres) son requeridos.' });
    }

    try {
        const biz = await db.findBusinessById(session.clientId);
        if (!biz) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const ticketId = `TKT-${Date.now()}`;
        await db.pool.query(
            `INSERT INTO tickets (id, business_id, business_name, module, priority, description, status)
             VALUES (?, ?, ?, ?, ?, ?, 'abierto')`,
            [ticketId, session.clientId, biz.name, ticketModule, priority || 'normal', description]
        );

        // Guardar la descripción como el primer mensaje del chat
        await db.pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender, sender_name, message)
             VALUES (?, 'client', ?, ?)`,
            [ticketId, biz.name, description]
        );

        // Notificación para el admin
        await db.pushNotification({
            title: '🎟️ Nuevo Ticket de Soporte',
            desc: `"${biz.name}" abrió un ticket [${(priority || 'normal').toUpperCase()}] en ${ticketModule}.`,
            icon: 'ticket',
            color: priority === 'urgente' ? '#ef4444' : '#f59e0b'
        });

        if (biz.client_email) {
            EmailService.sendTicketCreatedEmail(
                biz.client_email,
                biz.name,
                ticketId,
                ticketModule,
                priority || 'normal',
                description
            ).catch(err => {
                console.error('[Ticket Created Email Error]', err);
            });
        }

        broadcastUpdate();
        res.json({ success: true, ticketId });
    } catch (err) {
        console.error('Error creando ticket:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// CLIENT: Obtener mis tickets
app.get('/api/tickets/my', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const session = verifySignedToken(token);
    if (!session || !session.clientId) return res.status(401).json({ error: 'No autorizado' });

    try {
        const [rows] = await db.pool.query(
            `SELECT id, module, priority, description, status, created_at
             FROM tickets WHERE business_id = ?
             ORDER BY created_at DESC LIMIT 20`,
            [session.clientId]
        );
        res.json({ success: true, tickets: rows });
    } catch (err) {
        console.error('Error obteniendo tickets del cliente:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ADMIN: Listar todos los tickets
app.get('/api/admin/tickets', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            `SELECT t.*, b.name as business_name
             FROM tickets t
             LEFT JOIN businesses b ON t.business_id = b.id
             ORDER BY
               CASE t.priority WHEN 'urgente' THEN 1 WHEN 'normal' THEN 2 WHEN 'baja' THEN 3 ELSE 4 END,
               CASE t.status WHEN 'abierto' THEN 1 WHEN 'en_proceso' THEN 2 WHEN 'resuelto' THEN 3 WHEN 'cerrado' THEN 4 ELSE 5 END,
               t.created_at DESC`
        );
        res.json({ success: true, tickets: rows });
    } catch (err) {
        console.error('Error obteniendo tickets:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ADMIN: Actualizar estado de un ticket
app.patch('/api/admin/tickets/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['abierto', 'en_proceso', 'resuelto', 'cerrado'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido.' });
    }
    try {
        const [result] = await db.pool.query(
            `UPDATE tickets SET status = ? WHERE id = ?`,
            [status, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Ticket no encontrado.' });
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        console.error('Error actualizando ticket:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ADMIN: Eliminar un ticket (de forma física y sus imágenes)
app.delete('/api/admin/tickets/:id', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Buscar todas las imágenes de este ticket para eliminarlas del disco
        const [messages] = await db.pool.query(
            `SELECT image_url FROM ticket_messages WHERE ticket_id = ? AND image_url IS NOT NULL AND image_url != ''`,
            [id]
        );
        const ticketImagesDir = path.join(__dirname, '..', 'frontend', 'uploads', 'ticket-images');
        for (const msg of messages) {
            const url = msg.image_url;
            if (url) {
                const filename = path.basename(url);
                const fullPath = path.join(ticketImagesDir, filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.error('Error unlinking ticket image:', err);
                    }
                }
            }
        }

        // 2. Eliminar el ticket de la base de datos (ON DELETE CASCADE eliminará automáticamente los mensajes de ticket_messages)
        const [result] = await db.pool.query(`DELETE FROM tickets WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado.' });
        }
        
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        console.error('Error al eliminar ticket:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ADMIN: Eliminar TODOS los tickets (de forma física y sus imágenes de chat en disco)
app.delete('/api/admin/tickets-clear-all', requireSuperAdmin, async (req, res) => {
    try {
        // 1. Buscar todas las imágenes de todos los mensajes de tickets para eliminarlas del disco
        const [messages] = await db.pool.query(
            `SELECT image_url FROM ticket_messages WHERE image_url IS NOT NULL AND image_url != ''`
        );
        const ticketImagesDir = path.join(__dirname, '..', 'frontend', 'uploads', 'ticket-images');
        for (const msg of messages) {
            const url = msg.image_url;
            if (url) {
                const filename = path.basename(url);
                const fullPath = path.join(ticketImagesDir, filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.error('Error unlinking ticket image:', err);
                    }
                }
            }
        }

        // 2. Eliminar todos los mensajes y tickets de la base de datos
        await db.pool.query(`DELETE FROM ticket_messages`);
        await db.pool.query(`DELETE FROM tickets`);

        broadcastUpdate();
        res.json({ success: true, message: 'Todos los tickets y mensajes eliminados correctamente.' });
    } catch (err) {
        console.error('Error al vaciar tickets:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// SOPORTE: Obtener todos los mensajes de un ticket (Admin o Cliente dueño)
app.get('/api/tickets/:id/messages', requireAdminOrMatchingClient, async (req, res) => {
    const { id } = req.params;
    try {
        const [tickets] = await db.pool.query(
            `SELECT business_id FROM tickets WHERE id = ?`,
            [id]
        );
        if (tickets.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado.' });
        }
        
        const ticket = tickets[0];
        if (req.userRole === 'client' && ticket.business_id !== req.clientId) {
            return res.status(403).json({ error: 'No autorizado para ver este ticket.' });
        }

        const [messages] = await db.pool.query(
            `SELECT id, ticket_id, sender, sender_name, message, image_url, created_at
             FROM ticket_messages
             WHERE ticket_id = ?
             ORDER BY created_at ASC`,
            [id]
        );
        res.json({ success: true, messages });
    } catch (err) {
        console.error('Error obteniendo mensajes del ticket:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// SOPORTE: Enviar un nuevo mensaje en el chat de un ticket (Admin o Cliente dueño)
app.post('/api/tickets/:id/messages', requireAdminOrMatchingClient, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    try {
        const [tickets] = await db.pool.query(
            `SELECT business_id, business_name, status FROM tickets WHERE id = ?`,
            [id]
        );
        if (tickets.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado.' });
        }
        
        const ticket = tickets[0];
        if (req.userRole === 'client' && ticket.business_id !== req.clientId) {
            return res.status(403).json({ error: 'No autorizado para responder en este ticket.' });
        }

        if (ticket.status === 'cerrado') {
            return res.status(400).json({ error: 'El ticket está cerrado y no admite nuevos mensajes.' });
        }

        let senderName = '';
        if (req.userRole === 'client') {
            senderName = ticket.business_name || 'Cliente';
        } else {
            const adminName = req.adminUser.name || req.adminUser.user || 'Soporte';
            const adminRole = req.adminUser.role || 'Soporte';
            senderName = `${adminName} · ${adminRole}`;

            // Enviar correo de notificación al cliente
            db.findBusinessById(ticket.business_id).then(biz => {
                if (biz && biz.client_email) {
                    EmailService.sendTicketRepliedEmail(
                        biz.client_email,
                        biz.name,
                        id,
                        senderName,
                        message
                    ).catch(err => console.error('[Ticket Replied Email Error]', err));
                }
            }).catch(err => console.error('[Ticket Replied Query Error]', err));
        }

        await db.pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender, sender_name, message, image_url)
             VALUES (?, ?, ?, ?, NULL)`,
            [id, req.userRole, senderName, message]
        );

        broadcastUpdate({ type: 'new_message', ticketId: id, sender: req.userRole, senderName, message });
        res.json({ success: true });
    } catch (err) {
        console.error('Error enviando mensaje de ticket:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// SOPORTE: Subir imagen en el chat de un ticket
app.post('/api/tickets/:id/messages/image', requireAdminOrMatchingClient, (req, res, next) => {
    uploadTicketImage.single('image')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen no puede superar los 8 MB.' });
            }
            return res.status(400).json({ error: err.message || 'Error al procesar la imagen.' });
        }
        next();
    });
}, async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

    try {
        const [tickets] = await db.pool.query(
            `SELECT business_id, business_name, status FROM tickets WHERE id = ?`,
            [id]
        );
        if (tickets.length === 0) {
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ error: 'Ticket no encontrado.' });
        }
        const ticket = tickets[0];
        if (req.userRole === 'client' && ticket.business_id !== req.clientId) {
            fs.unlink(req.file.path, () => {});
            return res.status(403).json({ error: 'No autorizado.' });
        }
        if (ticket.status === 'cerrado') {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'El ticket está cerrado.' });
        }

        let senderName = '';
        if (req.userRole === 'client') {
            senderName = ticket.business_name || 'Cliente';
        } else {
            const adminName = req.adminUser.name || req.adminUser.user || 'Soporte';
            const adminRole = req.adminUser.role || 'Soporte';
            senderName = `${adminName} · ${adminRole}`;

            // Enviar correo de notificación al cliente
            db.findBusinessById(ticket.business_id).then(biz => {
                if (biz && biz.client_email) {
                    EmailService.sendTicketRepliedEmail(
                        biz.client_email,
                        biz.name,
                        id,
                        senderName,
                        '📷 Imagen adjunta'
                    ).catch(err => console.error('[Ticket Image Replied Email Error]', err));
                }
            }).catch(err => console.error('[Ticket Image Replied Query Error]', err));
        }

        const imageUrl = `/uploads/ticket-images/${req.file.filename}`;

        await db.pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender, sender_name, message, image_url)
             VALUES (?, ?, ?, '', ?)`,
            [id, req.userRole, senderName, imageUrl]
        );

        broadcastUpdate({ type: 'new_message', ticketId: id, sender: req.userRole, senderName, message: '📷 Imagen adjunta' });
        res.json({ success: true, imageUrl });
    } catch (err) {
        console.error('Error subiendo imagen de ticket:', err);
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// SOPORTE: Emitir indicador de escritura (Typing Indicator) (Admin o Cliente dueño)
app.post('/api/tickets/:id/typing', requireAdminOrMatchingClient, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const [tickets] = await db.pool.query(
            `SELECT business_id FROM tickets WHERE id = ?`,
            [id]
        );
        if (tickets.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado.' });
        }
        
        const ticket = tickets[0];
        if (req.userRole === 'client' && ticket.business_id !== req.clientId) {
            return res.status(403).json({ error: 'No autorizado.' });
        }

        // Emitir evento de escritura vía SSE
        broadcastUpdate({ type: 'typing', ticketId: id, role });
        res.json({ success: true });
    } catch (err) {
        console.error('Error enviando typing indicator:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`[AS Sierra Systems] Servidor unificado en línea`);
    console.log(`====================================================`);
    console.log(`➡️  Portafolio Público: http://localhost:${PORT}`);
    console.log(`➡️  Panel de Super Admin: http://localhost:${PORT}/admin`);
    console.log(`====================================================`);

    // Inicializar todas las tablas de base de datos (auto-migración segura)
    await db.initializeDatabase();

    startBillingCron();
    startTicketCleanupCron();

    // Crear/verificar tablas adicionales del sistema de tickets legacy
    try {
        // Verificar si ticket_messages tiene la estructura incorrecta de db.js (para autolimpieza y evitar colisiones de esquema)
        try {
            const [columns] = await db.pool.query("SHOW COLUMNS FROM ticket_messages");
            const hasWrongColumn = columns.some(col => (col.Field || col.field || '').toLowerCase() === 'text');
            if (hasWrongColumn) {
                console.log('[AS Sierra] ⚠️ Detectada estructura de ticket_messages incorrecta. Recreando tablas de soporte...');
                await db.pool.query("DROP TABLE IF EXISTS ticket_messages");
                await db.pool.query("DROP TABLE IF EXISTS tickets");
                await db.pool.query("DROP TABLE IF EXISTS support_tickets");
            }
        } catch (e) {
            // Ignorar si la tabla no existe aún
        }

        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id VARCHAR(60) PRIMARY KEY,
                business_id BIGINT NOT NULL,
                business_name VARCHAR(150) NULL,
                module VARCHAR(150) NOT NULL,
                priority ENUM('baja', 'normal', 'urgente') NOT NULL DEFAULT 'normal',
                description TEXT NOT NULL,
                status ENUM('abierto', 'en_proceso', 'resuelto', 'cerrado') NOT NULL DEFAULT 'abierto',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('[AS Sierra] ✅ Tabla tickets verificada/creada.');

        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id VARCHAR(60) NOT NULL,
                sender ENUM('client', 'admin') NOT NULL,
                sender_name VARCHAR(150) NOT NULL,
                message TEXT NOT NULL DEFAULT '',
                image_url VARCHAR(512) NULL DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
            )
        `);
        console.log('[AS Sierra] ✅ Tabla ticket_messages verificada/creada.');

        // Safe migration: add image_url column if it doesn't exist yet
        try {
            const [cols] = await db.pool.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_messages' AND COLUMN_NAME = 'image_url'
            `);
            if (cols.length === 0) {
                await db.pool.query(`ALTER TABLE ticket_messages ADD COLUMN image_url VARCHAR(512) NULL DEFAULT NULL`);
                console.log('[AS Sierra] ✅ Columna image_url agregada a ticket_messages.');
            }
        } catch (err) {
            console.warn('[AS Sierra] ⚠️ No se pudo migrar image_url:', err.message);
        }
    } catch (err) {
        console.error('[AS Sierra] ⚠️ Error creando tablas de soporte:', err.message);
    }
});
