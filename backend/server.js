require('./db');
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const PaymentService = require('./services/PaymentService');
const { startBillingCron, runBillingCycle } = require('./jobs/billingCron');

const dataFilePath = path.join(__dirname, 'data.json');
const uploadsDir = path.join(__dirname, '..', 'frontend', 'uploads', 'avatars');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'frontend', 'uploads')));

// ============================================================
// HELPER: Guardar notificación automática
// ============================================================
function pushNotification(db, notification) {
    if (!db.notifications) db.notifications = [];
    notification.id = Date.now();
    notification.time = new Date().toISOString();
    db.notifications.unshift(notification); // más reciente primero
    // Máximo 50 notificaciones guardadas
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
}

// ============================================================
// TOKEN STORE (En memoria - válidos por 8 horas)
// ============================================================
const clientTokens = new Map(); // token -> { clientId, expires }

function generateToken() {
    return [...Array(40)].map(() => Math.random().toString(36)[2]).join('');
}

function cleanExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of clientTokens.entries()) {
        if (data.expires < now) clientTokens.delete(token);
    }
}

// ============================================================
// SERVER-SENT EVENTS (SSE) PARA SINCRONIZACIÓN EN TIEMPO REAL
// ============================================================
let sseClients = [];

function broadcastUpdate() {
    sseClients.forEach(client => {
        try {
            client.res.write(`data: ${JSON.stringify({ type: 'update' })}\n\n`);
        } catch (e) {
            console.error('Error enviando SSE:', e);
        }
    });
}

app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    req.on('close', () => {
        sseClients = sseClients.filter(client => client.id !== clientId);
    });
});

// ============================================================
// ADMIN SESSION TOKENS (En memoria - válidos por 8 horas)
// ============================================================
const adminSessions = new Map(); // token -> { user, role, expires }

function generateAdminToken() {
    return 'adm_' + [...Array(36)].map(() => Math.random().toString(36)[2]).join('');
}

/**
 * Middleware: protege rutas que solo el Super Admin puede usar.
 * El token se pasa en el header: Authorization: Bearer <token>
 */
function requireAdmin(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado. Se requiere sesión de administrador.' });
    }
    const token = auth.split(' ')[1];
    const session = adminSessions.get(token);
    if (!session || session.expires < Date.now()) {
        adminSessions.delete(token);
        return res.status(401).json({ error: 'Sesión expirada. Por favor inicia sesión nuevamente.' });
    }
    req.adminUser = session;
    next();
}

// ============================================================
// AUTH ADMIN
// ============================================================
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        const db = JSON.parse(data);
        const config = db.config || {};
        const masterUser = config.adminUser || 'admin';
        const masterPass = config.adminPass || '123456';

        let loggedUser = null;
        if (user === masterUser && pass === masterPass) {
            loggedUser = { name: config.adminName || 'Allenmar', role: 'Super Admin', user: masterUser };
        } else {
            const users = db.users || [];
            const foundUser = users.find(u => u.user === user && u.pass === pass && u.status === 'active');
            if (foundUser) loggedUser = { name: foundUser.name, role: foundUser.role, user: foundUser.user };
        }

        if (!loggedUser) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        // Generar token de sesión admin
        const token = generateAdminToken();
        adminSessions.set(token, { ...loggedUser, expires: Date.now() + 8 * 60 * 60 * 1000 });

        return res.json({ success: true, token, user: loggedUser });
    });
});

app.post('/api/admin/logout', (req, res) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        adminSessions.delete(auth.split(' ')[1]);
    }
    res.json({ success: true });
});

/**
 * POST /api/admin/refresh-token
 * Renueva el token de sesión usando credenciales guardadas.
 * Útil cuando el servidor reinicia y los tokens en memoria se pierden.
 */
app.post('/api/admin/refresh-token', (req, res) => {
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ ok: false, error: 'Credenciales requeridas.' });
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ ok: false });
        const db = JSON.parse(data);
        const config = db.config || {};
        const masterUser = config.adminUser || 'admin';
        const masterPass = config.adminPass || '123456';

        let loggedUser = null;
        if (user === masterUser && pass === masterPass) {
            loggedUser = { name: config.adminName || 'Allenmar', role: 'Super Admin', user: masterUser };
        } else {
            const users = db.users || [];
            const found = users.find(u => u.user === user && u.pass === pass && u.status === 'active');
            if (found) loggedUser = { name: found.name, role: found.role, user: found.user };
        }

        if (!loggedUser) return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });

        const token = generateAdminToken();
        adminSessions.set(token, { ...loggedUser, expires: Date.now() + 8 * 60 * 60 * 1000 });
        return res.json({ ok: true, token });
    });
});

// ============================================================
// AUTH CLIENTE
// ============================================================
app.post('/api/client/login', (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        const db = JSON.parse(data);
        const businesses = db.businesses || [];

        // Buscar negocio con ese email + contraseña
        const biz = businesses.find(b =>
            b.clientEmail && b.clientEmail.toLowerCase() === email.toLowerCase() &&
            b.clientPass === pass
        );

        if (!biz) {
            return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
        }

        cleanExpiredTokens();
        const token = generateToken();
        clientTokens.set(token, {
            clientId: biz.id,
            expires: Date.now() + 8 * 60 * 60 * 1000 // 8 horas
        });

        pushNotification(db, {
            title: 'Acceso de Cliente',
            desc: `"${biz.name}" inició sesión en el portal.`,
            icon: 'log-in',
            color: '#10b981'
        });
        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), () => {});

        return res.json({
            success: true,
            token,
            clientId: biz.id,
            clientName: biz.name,
            clientEmail: biz.clientEmail
        });
    });
});

app.post('/api/client/verify', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false });
    cleanExpiredTokens();
    const session = clientTokens.get(token);
    if (!session) return res.json({ valid: false });

    // Verificar en tiempo real que el negocio sigue activo en la DB
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ valid: false });
        const db = JSON.parse(data);
        const biz = (db.businesses || []).find(b => b.id == session.clientId);
        if (!biz) return res.json({ valid: false });

        // 1. Verificar si la facturación está suspendida (Prioridad: Pago Requerido)
        if (biz.billing?.subscription_status === 'suspended') {
            clientTokens.delete(token);
            return res.json({ valid: false, reason: 'payment_required' });
        }

        // 2. Verificar si el administrador lo desactivó manualmente
        if (biz.status !== 'active') {
            clientTokens.delete(token);
            return res.json({ valid: false, reason: 'account_inactive' });
        }

        return res.json({ valid: true, clientId: session.clientId });
    });
});

// ============================================================
// ADMIN: Gestionar credenciales de cliente por negocio
// ============================================================
app.post('/api/businesses/:id/credentials', (req, res) => {
    const { id } = req.params;
    const { clientEmail, clientPass } = req.body;
    if (!clientEmail || !clientPass) return res.status(400).json({ error: 'Email y contraseña requeridos.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == id);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado' });

        // Verificar que el email no esté en uso por otro negocio
        const emailInUse = db.businesses.some((b, i) =>
            i !== bizIndex && b.clientEmail && b.clientEmail.toLowerCase() === clientEmail.toLowerCase()
        );
        if (emailInUse) return res.status(409).json({ error: 'Ese correo ya está asignado a otro negocio.' });

        db.businesses[bizIndex].clientEmail = clientEmail;
        db.businesses[bizIndex].clientPass = clientPass;

        pushNotification(db, {
            title: 'Credenciales Actualizadas',
            desc: `Acceso de cliente configurado para "${db.businesses[bizIndex].name}".`,
            icon: 'key',
            color: '#6366f1'
        });

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando' });
            res.json({ success: true });
        });
    });
});

// ============================================================
// CLIENT: Self-service credential update
// ============================================================
app.post('/api/client/credentials/update', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { currentPass, newEmail, newPass } = req.body;
    if (!currentPass || !newEmail) return res.status(400).json({ error: 'Faltan datos requeridos.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        let db = JSON.parse(data);
        
        const bizIndex = db.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        if (db.businesses[bizIndex].clientPass !== currentPass) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        const emailInUse = db.businesses.some((b, i) =>
            i !== bizIndex && b.clientEmail && b.clientEmail.toLowerCase() === newEmail.toLowerCase()
        );
        if (emailInUse) return res.status(409).json({ error: 'Este correo ya está registrado en otra cuenta.' });

        db.businesses[bizIndex].clientEmail = newEmail;
        if (newPass && newPass.trim() !== '') {
            db.businesses[bizIndex].clientPass = newPass;
        }

        pushNotification(db, {
            title: 'Credenciales de Cliente',
            desc: `"${db.businesses[bizIndex].name}" ha actualizado sus accesos de seguridad.`,
            icon: 'shield-check',
            color: '#3b82f6'
        });

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando datos.' });
            res.json({ success: true, email: newEmail });
        });
    });
});

// ============================================================
// CLIENT: Upload avatar / profile picture
// ============================================================
app.post('/api/client/avatar', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    upload.single('avatar')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

        const session = clientTokens.get(token);
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        fs.readFile(dataFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: 'Error interno.' });
            let db = JSON.parse(data);
            const bizIndex = db.businesses.findIndex(b => b.id == session.clientId);
            if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

            db.businesses[bizIndex].avatarUrl = avatarUrl;

            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando datos.' });
                res.json({ success: true, avatarUrl });
            });
        });
    });
});

// ============================================================
// CLIENT: Update profile info (Name)
// ============================================================
app.post('/api/client/profile/update', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { newName } = req.body;
    if (!newName || newName.trim() === '') return res.status(400).json({ error: 'El nombre es requerido.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        db.businesses[bizIndex].name = newName;

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando datos.' });
            res.json({ success: true, name: newName });
        });
    });
});

// ============================================================
// DATA
// ============================================================
app.get('/api/data', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo base de datos' });
        let db = JSON.parse(data);
        const now = Date.now();
        let changed = false;

        // Limpiar módulos cancelados expirados y fechas obsoletas
        db.businesses.forEach(biz => {
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
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), () => {});
        }

        // 🔒 SEGURIDAD: Eliminar campos sensibles antes de enviar al frontend
        const safeDb = {
            ...db,
            businesses: db.businesses.map(biz => {
                const { clientPass, ...safeBiz } = biz;
                // Enmascarar token de pago - solo exponer metadatos no sensibles
                if (safeBiz.billing?.gateway_token) {
                    safeBiz.billing = {
                        ...safeBiz.billing,
                        gateway_token: '***TOKENIZED***', // No exponer el token real
                    };
                }
                return safeBiz;
            }),
        };

        res.json(safeDb);
    });
});

// ============================================================
// NOTIFICACIONES
// ============================================================
app.get('/api/notifications', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        const db = JSON.parse(data);
        res.json({ notifications: db.notifications || [] });
    });
});

app.delete('/api/notifications', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        db.notifications = [];
        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando' });
            res.json({ success: true });
        });
    });
});

// ============================================================
// NEGOCIOS
// ============================================================
app.post('/api/businesses/toggle', (req, res) => {
    const { id, status } = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == id);
        if (bizIndex !== -1) {
            db.businesses[bizIndex].status = status;
            const biz = db.businesses[bizIndex];

            // Si se desactiva, invalidar TODAS las sesiones activas de ese negocio
            if (status !== 'active') {
                for (const [token, session] of clientTokens.entries()) {
                    if (String(session.clientId) === String(id)) {
                        clientTokens.delete(token);
                    }
                }
            }

            pushNotification(db, {
                title: status === 'active' ? 'Negocio Activado' : 'Negocio Desactivado',
                desc: `"${biz.name}" fue ${status === 'active' ? 'activado' : 'desactivado'}.`,
                icon: status === 'active' ? 'toggle-right' : 'toggle-left',
                color: status === 'active' ? '#10b981' : '#f59e0b'
            });
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true, status });
            });
        } else {
            res.status(404).json({ error: 'Negocio no encontrado' });
        }
    });
});

app.post('/api/businesses/new', (req, res) => {
    const newBiz = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        db.businesses.unshift(newBiz);
        pushNotification(db, {
            title: 'Nuevo Negocio Registrado',
            desc: `"${newBiz.name}" se ha unido a la plataforma.`,
            icon: 'building-2',
            color: '#6366f1'
        });
        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando' });
            res.json({ success: true });
        });
    });
});

app.put('/api/businesses/:id', (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == id);
        if (bizIndex !== -1) {
            db.businesses[bizIndex] = { ...db.businesses[bizIndex], ...updatedFields };
            const biz = db.businesses[bizIndex];
            pushNotification(db, {
                title: 'Negocio Actualizado',
                desc: `Los datos de "${biz.name}" fueron modificados.`,
                icon: 'pencil',
                color: '#3b82f6'
            });
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true, business: db.businesses[bizIndex] });
            });
        } else {
            res.status(404).json({ error: 'Negocio no encontrado' });
        }
    });
});

app.delete('/api/businesses/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const biz = db.businesses.find(b => b.id == id);
        const initialLength = db.businesses.length;
        db.businesses = db.businesses.filter(b => b.id != id);
        if (db.businesses.length < initialLength) {
            // Invalidar TODOS los tokens activos del negocio eliminado
            for (const [token, session] of clientTokens.entries()) {
                if (String(session.clientId) === String(id)) {
                    clientTokens.delete(token);
                }
            }

            if (biz) {
                pushNotification(db, {
                    title: 'Negocio Eliminado',
                    desc: `"${biz.name}" fue eliminado del sistema junto con todos sus datos.`,
                    icon: 'trash-2',
                    color: '#ef4444'
                });
            }
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true });
            });
        } else {
            res.status(404).json({ error: 'Negocio no encontrado' });
        }
    });
});

// ============================================================
// MÓDULOS
// ============================================================
app.post('/api/modules/toggle', (req, res) => {
    const { id, status } = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const modIndex = db.modules.findIndex(m => m.id == id);
        if (modIndex !== -1) {
            db.modules[modIndex].status = status;
            const mod = db.modules[modIndex];
            pushNotification(db, {
                title: `Módulo ${status === 'active' ? 'Activado' : 'Desactivado'}`,
                desc: `El módulo "${mod.name}" fue ${status === 'active' ? 'activado' : 'desactivado'}.`,
                icon: 'grid-2x2',
                color: status === 'active' ? '#10b981' : '#f59e0b'
            });
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true, status });
            });
        } else {
            res.status(404).json({ error: 'Módulo no encontrado' });
        }
    });
});

// ============================================================
// USUARIOS
// ============================================================
app.post('/api/users/new', (req, res) => {
    const newUser = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        if (!db.users) db.users = [];
        db.users.push(newUser);
        pushNotification(db, {
            title: 'Nuevo Usuario Creado',
            desc: `"${newUser.name}" fue agregado con rol "${newUser.role}".`,
            icon: 'user-plus',
            color: '#8b5cf6'
        });
        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando' });
            res.json({ success: true });
        });
    });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const userIndex = db.users.findIndex(u => u.id == id);
        if (userIndex !== -1) {
            db.users[userIndex] = { ...db.users[userIndex], ...updatedFields };
            const u = db.users[userIndex];
            pushNotification(db, {
                title: 'Usuario Actualizado',
                desc: `Los datos de "${u.name}" fueron modificados.`,
                icon: 'user-cog',
                color: '#3b82f6'
            });
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true, user: db.users[userIndex] });
            });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    });
});

app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const u = db.users.find(u => u.id == id);
        const initialLength = db.users.length;
        db.users = db.users.filter(u => u.id != id);
        if (db.users.length < initialLength) {
            if (u) {
                pushNotification(db, {
                    title: 'Usuario Eliminado',
                    desc: `"${u.name}" fue eliminado del sistema.`,
                    icon: 'user-x',
                    color: '#ef4444'
                });
            }
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true });
            });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    });
});

// ============================================================
// CONFIGURACIÓN
// ============================================================
app.get('/api/settings', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        const db = JSON.parse(data);
        const publicConfig = {
            logo: db.config?.logo || null,
            companyName: db.config?.companyName || 'AS Sierra Systems'
        };
        const publicModules = (db.modules || []).map(m => ({
            id: m.id,
            name: m.name,
            price: m.price,
            status: m.status
        }));
        res.json({ config: publicConfig, modules: publicModules });
    });
});

app.post('/api/settings/save', (req, res) => {
    const { logo, adminUser, adminPass, currentPass } = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        if (!db.config) db.config = {};

        const masterPass = db.config.adminPass || '123456';

        if (adminUser || adminPass) {
            if (currentPass !== masterPass) {
                return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
            }
        }

        if (logo) db.config.logo = logo;
        if (adminUser) db.config.adminUser = adminUser;
        if (adminPass) db.config.adminPass = adminPass;

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando' });
            res.json({ success: true });
        });
    });
});

// ============================================================
// MÓDULOS (SUPER ADMIN)
// ============================================================
app.put('/api/modules/:id', (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error leyendo db' });
        let db = JSON.parse(data);
        const moduleIndex = db.modules.findIndex(m => String(m.id) === String(id));
        if (moduleIndex !== -1) {
            db.modules[moduleIndex] = { ...db.modules[moduleIndex], ...updatedFields };
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true, module: db.modules[moduleIndex] });
            });
        } else {
            // Si no existe, lo creamos (para el botón de nuevo módulo, si se habilita a futuro)
            const newMod = { id, ...updatedFields };
            if (!db.modules) db.modules = [];
            db.modules.push(newMod);
            fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
                if (err) return res.status(500).json({ error: 'Error guardando' });
                res.json({ success: true, module: newMod });
            });
        }
    });
});

// ============================================================
// CLIENT: Cancelar suscripción de módulo (sin eliminar acceso inmediato)
// ============================================================
app.post('/api/client/module/cancel', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { moduleId, moduleName } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = db.businesses[bizIndex];

        // Verificar que el módulo está activo usando String() para evitar problemas de tipos
        if (!biz.modules || !biz.modules.some(id => String(id) === String(moduleId))) {
            return res.status(400).json({ error: 'El módulo no está activo.' });
        }

        // Quitar de módulos activos
        biz.modules = biz.modules.filter(id => String(id) !== String(moduleId));

        // Determinar fecha de fin de acceso desde moduleDates (ciclo oficial del admin)
        // ⚠️ Si no hay fecha registrada (dato huérfano), se usa la fecha de hoy como vencimiento
        //    para no regalar días. El admin debe registrar la fecha correcta.
        let renewalDate;
        if (biz.moduleDates && biz.moduleDates[moduleId]) {
            renewalDate = new Date(biz.moduleDates[moduleId]);
        } else {
            console.warn(`[AVISO] El módulo ${moduleId} del negocio ${biz.name} no tiene moduleDates registrado. Se usará la fecha actual como vencimiento.`);
            renewalDate = new Date(); // Sin fecha oficial → vence ahora mismo (sin regalo)
        }

        // Agregar a cancelados (suspendidos)
        if (!biz.cancelledModules) biz.cancelledModules = [];
        // Evitar duplicados
        biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));
        biz.cancelledModules.push({
            id: moduleId,
            name: moduleName || moduleId,
            cancelledAt: new Date().toISOString(),
            accessUntil: renewalDate.toISOString()
        });

        pushNotification(db, {
            title: 'Suscripción Suspendida',
            desc: `"${biz.name}" suspendió el módulo "${moduleName || moduleId}". Acceso hasta ${renewalDate.toLocaleDateString('es-CO')}.`,
            icon: 'pause-circle',
            color: '#f59e0b'
        });

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando datos.' });
            res.json({ success: true, cancelledModules: biz.cancelledModules, modules: biz.modules });
        });
    });
});

// ============================================================
// CLIENT: Reactivar módulo cancelado
// ============================================================
app.post('/api/client/module/reactivate', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { moduleId } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = db.businesses[bizIndex];

        // Verificar que está en cancelados
        const cancelledEntry = (biz.cancelledModules || []).find(cm => String(cm.id) === String(moduleId));
        if (!cancelledEntry) return res.status(400).json({ error: 'El módulo no está suspendido.' });

        // Quitar de cancelados
        biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));

        // Devolver a activos (si no está ya)
        if (!biz.modules) biz.modules = [];
        if (!biz.modules.some(id => String(id) === String(moduleId))) {
            biz.modules.push(moduleId);
        }

        // ⚠️ ANTI-ABUSO: Restaurar la fecha ORIGINAL de vencimiento, NO dar 30 días nuevos.
        // El ciclo continúa exactamente donde quedó antes de la suspensión.
        const originalExpiry = new Date(cancelledEntry.accessUntil);

        // Si el acceso ya expiró, no permitir reactivación por esta vía — el admin debe renovar.
        if (originalExpiry.getTime() <= Date.now()) {
            return res.status(403).json({ 
                error: 'Tu ciclo de acceso ha expirado. Contacta al administrador para renovar tu suscripción.' 
            });
        }

        if (!biz.moduleDates) biz.moduleDates = {};
        // Restaurar la fecha exacta de vencimiento (sin regalar días extra)
        biz.moduleDates[moduleId] = cancelledEntry.accessUntil;

        pushNotification(db, {
            title: 'Suscripción Reactivada',
            desc: `"${biz.name}" reactivó el módulo "${cancelledEntry.name}". Vence el ${originalExpiry.toLocaleDateString('es-CO')} (sin cambios de ciclo).`,
            icon: 'refresh-cw',
            color: '#10b981'
        });

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando datos.' });
            res.json({ success: true, modules: biz.modules, cancelledModules: biz.cancelledModules, moduleDates: biz.moduleDates });
        });
    });
});

app.post('/api/client/module/renew', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { moduleId, moduleName, last4 } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        let db = JSON.parse(data);
        const bizIndex = db.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = db.businesses[bizIndex];

        // Verificar si está en cancelados para reactivarlo
        if (biz.cancelledModules) {
            biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));
        }

        // Asegurar que esté en la lista de activos
        if (!biz.modules) biz.modules = [];
        if (!biz.modules.some(id => String(id) === String(moduleId))) {
            biz.modules.push(moduleId);
        }

        // Añadir 30 días desde HOY (es una renovación)
        if (!biz.moduleDates) biz.moduleDates = {};
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        biz.moduleDates[moduleId] = newExpiry.toISOString();

        // Registrar pago en el log de notificaciones
        pushNotification(db, {
            title: 'Pago Recibido',
            desc: `"${biz.name}" renovó el módulo "${moduleName || moduleId}" pagando con tarjeta terminada en ${last4 || '****'}. Válido hasta ${newExpiry.toLocaleDateString('es-CO')}.`,
            icon: 'credit-card',
            color: '#10b981'
        });

        fs.writeFile(dataFilePath, JSON.stringify(db, null, 4), err => { broadcastUpdate();
            if (err) return res.status(500).json({ error: 'Error guardando datos.' });
            res.json({ success: true, modules: biz.modules, cancelledModules: biz.cancelledModules, moduleDates: biz.moduleDates });
        });
    });
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
 * Guarda el token de tarjeta de un negocio.
 * Body: { bizId, token, last_four, card_brand, next_billing_date }
 */
app.post('/api/payment/save-token', requireAdmin, (req, res) => {
    try {
        const { bizId, token, last_four, card_brand, next_billing_date } = req.body;
        if (!bizId || !token || !last_four || !card_brand) {
            return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios.' });
        }
        const db = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
        const biz = db.businesses.find(b => b.id == bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

        // Guardar datos de facturación (nunca el número completo de la tarjeta)
        biz.billing = {
            ...(biz.billing || {}),
            gateway_token: token,
            last_four,
            card_brand,
            subscription_status: 'active',
            next_billing_date: next_billing_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            last_payment_date: null,
            last_payment_amount: 0,
        };

        fs.writeFileSync(dataFilePath, JSON.stringify(db, null, 4));
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
 * Cobra manualmente la suscripción de un negocio (desde el Super Admin).
 */
app.post('/api/payment/charge-subscription/:bizId', requireAdmin, async (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
        const biz = db.businesses.find(b => b.id == req.params.bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });
        if (!biz.billing?.gateway_token) {
            return res.status(400).json({ ok: false, message: 'Este negocio no tiene una tarjeta guardada.' });
        }

        // Calcular monto
        let totalAmount = 0;
        for (const modId of (biz.modules || [])) {
            const mod = (db.modules || []).find(m => m.id === modId);
            if (mod?.price) {
                const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                if (!isNaN(p)) totalAmount += p;
            }
        }

        if (totalAmount === 0) {
            return res.status(400).json({ ok: false, message: 'El monto calculado es $0. Verifique los módulos asignados.' });
        }

        const result = PaymentService.chargeWithToken(
            biz.billing.gateway_token,
            totalAmount * 100,
            `Suscripción AS Sierra Systems — ${biz.name}`
        );

        const updatedBiz = db.businesses.find(b => b.id == req.params.bizId);
        if (result.ok) {
            updatedBiz.billing.subscription_status = 'active';
            updatedBiz.billing.last_payment_date = new Date().toISOString();
            updatedBiz.billing.last_payment_amount = totalAmount;
            const d = new Date();
            d.setDate(d.getDate() + 30);
            updatedBiz.billing.next_billing_date = d.toISOString().slice(0, 10);
            updatedBiz.billing.last_transaction_id = result.transactionId;
        } else {
            updatedBiz.billing.subscription_status = 'suspended';
            updatedBiz.billing.last_failed_attempt = new Date().toISOString();
        }

        pushNotification(db, {
            type: result.ok ? 'success' : 'error',
            message: result.ok
                ? `✅ Cobro manual exitoso: ${biz.name} — $${totalAmount.toLocaleString('es-CO')} COP`
                : `❌ Cobro fallido: ${biz.name} — ${result.message}`,
        });

        fs.writeFileSync(dataFilePath, JSON.stringify(db, null, 4));
        broadcastUpdate();
        res.json({ ok: result.ok, message: result.ok ? `Cobro exitoso. TXN: ${result.transactionId}` : result.message, result });
    } catch (err) {
        console.error('[Payment] Error en cobro manual:', err);
        res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
    }
});

/**
 * DELETE /api/payment/remove-card/:bizId
 * Elimina la tarjeta guardada de un negocio.
 */
app.delete('/api/payment/remove-card/:bizId', requireAdmin, (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
        const biz = db.businesses.find(b => b.id == req.params.bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

        biz.billing = {
            ...(biz.billing || {}),
            gateway_token: null,
            last_four: null,
            card_brand: null,
            subscription_status: 'pending',
        };

        fs.writeFileSync(dataFilePath, JSON.stringify(db, null, 4));
        broadcastUpdate();
        res.json({ ok: true, message: 'Tarjeta eliminada.' });
    } catch (err) {
        console.error('[Payment] Error eliminando tarjeta:', err);
        res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
    }
});

/**
 * POST /api/payment/trigger-billing
 * Dispara el ciclo de facturación manualmente desde el Super Admin.
 * Solo para uso administrativo.
 */
app.post('/api/payment/trigger-billing', requireAdmin, async (req, res) => {
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

/**
 * POST /api/webhooks/wompi
 * Recibe notificaciones push de Wompi cuando el estado de una
 * transacción cambia (pago aprobado, declinado, revertido, etc.).
 *
 * Wompi envía el header: x-event-checksum
 * Documentación: https://docs.wompi.co/docs/en/webhooks
 */
app.post('/api/webhooks/wompi', (req, res) => {
    try {
        const signature = req.headers['x-event-checksum'];
        const payload = req.body;

        // Validar autenticidad del webhook
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

        const db = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
        let updated = false;

        // Buscar el negocio asociado por last_transaction_id
        const biz = (db.businesses || []).find(
            b => b.billing?.last_transaction_id === transaction.id
        );

        if (biz) {
            if (transaction.status === 'APPROVED') {
                biz.billing.subscription_status = 'active';
                pushNotification(db, {
                    type: 'success',
                    message: `✅ Webhook: Pago confirmado para ${biz.name}. TXN: ${transaction.id}`,
                });
                updated = true;
            } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(transaction.status)) {
                biz.billing.subscription_status = 'suspended';
                pushNotification(db, {
                    type: 'error',
                    message: `❌ Webhook: Pago fallido para ${biz.name} (${transaction.status}). TXN: ${transaction.id}`,
                });
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(dataFilePath, JSON.stringify(db, null, 4));
                broadcastUpdate();
            }
        } else {
            console.log(`[Webhook] No se encontró negocio con TXN: ${transaction.id}`);
        }

        // Siempre responder 200 a Wompi para confirmar recepción
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[Webhook] Error procesando evento:', err);
        // Responder 200 de todas formas para que Wompi no reintente
        res.status(200).json({ ok: false, message: err.message });
    }
});

// ============================================================
// FIN RUTAS DE PAGOS
// ============================================================

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`[AS Sierra Systems] Servidor unificado en línea`);
    console.log(`====================================================`);
    console.log(`➡️  Portafolio Público: http://localhost:${PORT}`);
    console.log(`➡️  Panel de Super Admin: http://localhost:${PORT}/admin`);
    console.log(`====================================================`);

    // Iniciar cron de facturación automática
    startBillingCron();
});
