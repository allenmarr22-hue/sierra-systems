const db = require('./db');
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const PaymentService = require('./services/PaymentService');
const { startBillingCron, runBillingCycle } = require('./jobs/billingCron');

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
app.post('/api/login', async (req, res) => {
    const { user, pass } = req.body;
    try {
        const dbState = await readDb();
        const config = dbState.config || {};
        const masterUser = config.adminUser || 'admin';
        const masterPass = config.adminPass || '123456';

        let loggedUser = null;
        if (user === masterUser && pass === masterPass) {
            loggedUser = { name: config.adminName || 'Allenmar', role: 'Super Admin', user: masterUser };
        } else {
            const users = dbState.users || [];
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
    } catch (err) {
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        adminSessions.delete(auth.split(' ')[1]);
    }
    res.json({ success: true });
});

app.post('/api/admin/refresh-token', async (req, res) => {
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ ok: false, error: 'Credenciales requeridas.' });
    try {
        const dbState = await readDb();
        const config = dbState.config || {};
        const masterUser = config.adminUser || 'admin';
        const masterPass = config.adminPass || '123456';

        let loggedUser = null;
        if (user === masterUser && pass === masterPass) {
            loggedUser = { name: config.adminName || 'Allenmar', role: 'Super Admin', user: masterUser };
        } else {
            const users = dbState.users || [];
            const found = users.find(u => u.user === user && u.pass === pass && u.status === 'active');
            if (found) loggedUser = { name: found.name, role: found.role, user: found.user };
        }

        if (!loggedUser) return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });

        const token = generateAdminToken();
        adminSessions.set(token, { ...loggedUser, expires: Date.now() + 8 * 60 * 60 * 1000 });
        return res.json({ ok: true, token });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Error del servidor.' });
    }
});

// ============================================================
// AUTH CLIENTE
// ============================================================
app.post('/api/client/login', async (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    try {
        const dbState = await readDb();
        const businesses = dbState.businesses || [];

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
            clientEmail: biz.clientEmail
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

app.post('/api/client/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false });
    cleanExpiredTokens();
    const session = clientTokens.get(token);
    if (!session) return res.json({ valid: false });

    try {
        const dbState = await readDb();
        const biz = (dbState.businesses || []).find(b => b.id == session.clientId);
        if (!biz) return res.json({ valid: false });

        // 1. Verificar si la facturación está suspendida
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
    } catch (err) {
        return res.status(500).json({ valid: false });
    }
});

// ============================================================
// ADMIN: Gestionar credenciales de cliente por negocio
// ============================================================
app.post('/api/businesses/:id/credentials', async (req, res) => {
    const { id } = req.params;
    const { clientEmail, clientPass } = req.body;
    if (!clientEmail || !clientPass) return res.status(400).json({ error: 'Email y contraseña requeridos.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == id);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado' });

        // Verificar que el email no esté en uso por otro negocio
        const emailInUse = dbState.businesses.some((b, i) =>
            i !== bizIndex && b.clientEmail && b.clientEmail.toLowerCase() === clientEmail.toLowerCase()
        );
        if (emailInUse) return res.status(409).json({ error: 'Ese correo ya está asignado a otro negocio.' });

        dbState.businesses[bizIndex].clientEmail = clientEmail;
        dbState.businesses[bizIndex].clientPass = clientPass;

        pushNotification(dbState, {
            title: 'Credenciales Actualizadas',
            desc: `Acceso de cliente configurado para "${dbState.businesses[bizIndex].name}".`,
            icon: 'key',
            color: '#6366f1'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor al guardar credenciales.' });
    }
});

// ============================================================
// CLIENT: Self-service credential update
// ============================================================
app.post('/api/client/credentials/update', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { currentPass, newEmail, newPass } = req.body;
    if (!currentPass || !newEmail) return res.status(400).json({ error: 'Faltan datos requeridos.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        if (dbState.businesses[bizIndex].clientPass !== currentPass) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        const emailInUse = dbState.businesses.some((b, i) =>
            i !== bizIndex && b.clientEmail && b.clientEmail.toLowerCase() === newEmail.toLowerCase()
        );
        if (emailInUse) return res.status(409).json({ error: 'Este correo ya está registrado en otra cuenta.' });

        dbState.businesses[bizIndex].clientEmail = newEmail;
        if (newPass && newPass.trim() !== '') {
            dbState.businesses[bizIndex].clientPass = newPass;
        }

        pushNotification(dbState, {
            title: 'Credenciales de Cliente',
            desc: `"${dbState.businesses[bizIndex].name}" ha actualizado sus accesos de seguridad.`,
            icon: 'shield-check',
            color: '#3b82f6'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, email: newEmail });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ============================================================
// CLIENT: Upload avatar / profile picture
// ============================================================
app.post('/api/client/avatar', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    upload.single('avatar')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

        try {
            const session = clientTokens.get(token);
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            let dbState = await readDb();
            const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
            if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

            dbState.businesses[bizIndex].avatarUrl = avatarUrl;

            await writeDb(dbState);
            broadcastUpdate();
            res.json({ success: true, avatarUrl });
        } catch (error) {
            res.status(500).json({ error: 'Error interno al guardar avatar.' });
        }
    });
});

// ============================================================
// CLIENT: Update profile info (Name)
// ============================================================
app.post('/api/client/profile/update', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { newName } = req.body;
    if (!newName || newName.trim() === '') return res.status(400).json({ error: 'El nombre es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        dbState.businesses[bizIndex].name = newName;

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, name: newName });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// DATA
// ============================================================
app.get('/api/data', async (req, res) => {
    try {
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

        // 🔒 SEGURIDAD: Eliminar campos sensibles antes de enviar al frontend
        const safeDb = {
            ...dbState,
            businesses: dbState.businesses.map(biz => {
                const { clientPass, ...safeBiz } = biz;
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
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor al consultar datos.' });
    }
});

// ============================================================
// NOTIFICACIONES
// ============================================================
app.get('/api/notifications', async (req, res) => {
    try {
        const dbState = await readDb();
        res.json({ notifications: dbState.notifications || [] });
    } catch (err) {
        res.status(500).json({ error: 'Error leyendo notificaciones.' });
    }
});

app.delete('/api/notifications', async (req, res) => {
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
// NEGOCIOS
// ============================================================
app.post('/api/businesses/toggle', async (req, res) => {
    const { id, status } = req.body;
    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == id);
        if (bizIndex !== -1) {
            dbState.businesses[bizIndex].status = status;
            const biz = dbState.businesses[bizIndex];

            // Si se desactiva, invalidar TODAS las sesiones activas de ese negocio
            if (status !== 'active') {
                for (const [token, session] of clientTokens.entries()) {
                    if (String(session.clientId) === String(id)) {
                        clientTokens.delete(token);
                    }
                }
            }

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

app.post('/api/businesses/new', async (req, res) => {
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
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.put('/api/businesses/:id', async (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == id);
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
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.delete('/api/businesses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        let dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == id);
        const initialLength = dbState.businesses.length;
        dbState.businesses = dbState.businesses.filter(b => b.id != id);

        if (dbState.businesses.length < initialLength) {
            // Invalidar tokens del negocio eliminado
            for (const [token, session] of clientTokens.entries()) {
                if (String(session.clientId) === String(id)) {
                    clientTokens.delete(token);
                }
            }

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
app.post('/api/modules/toggle', async (req, res) => {
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
// USUARIOS
// ============================================================
app.post('/api/users/new', async (req, res) => {
    const newUser = req.body;
    try {
        let dbState = await readDb();
        if (!dbState.users) dbState.users = [];
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

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    try {
        let dbState = await readDb();
        const userIndex = dbState.users.findIndex(u => u.id == id);
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

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        let dbState = await readDb();
        const u = dbState.users.find(u => u.id == id);
        const initialLength = dbState.users.length;
        dbState.users = dbState.users.filter(u => u.id != id);

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
            companyName: dbState.config?.companyName || 'AS Sierra Systems'
        };
        const publicModules = (dbState.modules || []).map(m => ({
            id: m.id,
            name: m.name,
            price: m.price,
            status: m.status
        }));
        res.json({ config: publicConfig, modules: publicModules });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.post('/api/settings/save', async (req, res) => {
    const { logo, adminUser, adminPass, currentPass } = req.body;
    try {
        let dbState = await readDb();
        if (!dbState.config) dbState.config = {};

        const masterPass = dbState.config.adminPass || '123456';

        if (adminUser || adminPass) {
            if (currentPass !== masterPass) {
                return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
            }
        }

        if (logo) dbState.config.logo = logo;
        if (adminUser) dbState.config.adminUser = adminUser;
        if (adminPass) dbState.config.adminPass = adminPass;

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// MÓDULOS (SUPER ADMIN)
// ============================================================
app.put('/api/modules/:id', async (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    try {
        let dbState = await readDb();
        const moduleIndex = dbState.modules.findIndex(m => String(m.id) === String(id));
        if (moduleIndex !== -1) {
            dbState.modules[moduleIndex] = { ...dbState.modules[moduleIndex], ...updatedFields };
        } else {
            const newMod = { id, ...updatedFields };
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
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { moduleId, moduleName } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];

        if (!biz.modules || !biz.modules.some(id => String(id) === String(moduleId))) {
            return res.status(400).json({ error: 'El módulo no está activo.' });
        }

        // Quitar de módulos activos
        biz.modules = biz.modules.filter(id => String(id) !== String(moduleId));

        let renewalDate;
        if (biz.moduleDates && biz.moduleDates[moduleId]) {
            renewalDate = new Date(biz.moduleDates[moduleId]);
        } else {
            console.warn(`[AVISO] El módulo ${moduleId} del negocio ${biz.name} no tiene moduleDates registrado. Se usará la fecha actual como vencimiento.`);
            renewalDate = new Date();
        }

        // Agregar a cancelados
        if (!biz.cancelledModules) biz.cancelledModules = [];
        biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));
        biz.cancelledModules.push({
            id: moduleId,
            name: moduleName || moduleId,
            cancelledAt: new Date().toISOString(),
            accessUntil: renewalDate.toISOString()
        });

        pushNotification(dbState, {
            title: 'Suscripción Suspendida',
            desc: `"${biz.name}" suspendió el módulo "${moduleName || moduleId}". Acceso hasta ${renewalDate.toLocaleDateString('es-CO')}.`,
            icon: 'pause-circle',
            color: '#f59e0b'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, cancelledModules: biz.cancelledModules, modules: biz.modules });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// ============================================================
// CLIENT: Reactivar módulo cancelado
// ============================================================
app.post('/api/client/module/reactivate', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { moduleId } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];

        const cancelledEntry = (biz.cancelledModules || []).find(cm => String(cm.id) === String(moduleId));
        if (!cancelledEntry) return res.status(400).json({ error: 'El módulo no está suspendido.' });

        // Quitar de cancelados
        biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));

        // Devolver a activos
        if (!biz.modules) biz.modules = [];
        if (!biz.modules.some(id => String(id) === String(moduleId))) {
            biz.modules.push(moduleId);
        }

        const originalExpiry = new Date(cancelledEntry.accessUntil);

        if (originalExpiry.getTime() <= Date.now()) {
            return res.status(403).json({ 
                error: 'Tu ciclo de acceso ha expirado. Contacta al administrador para renovar tu suscripción.' 
            });
        }

        if (!biz.moduleDates) biz.moduleDates = {};
        biz.moduleDates[moduleId] = cancelledEntry.accessUntil;

        pushNotification(dbState, {
            title: 'Suscripción Reactivada',
            desc: `"${biz.name}" reactivó el módulo "${cancelledEntry.name}". Vence el ${originalExpiry.toLocaleDateString('es-CO')} (sin cambios de ciclo).`,
            icon: 'refresh-cw',
            color: '#10b981'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, modules: biz.modules, cancelledModules: biz.cancelledModules, moduleDates: biz.moduleDates });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.post('/api/client/module/renew', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !clientTokens.has(token)) return res.status(401).json({ error: 'No autorizado' });

    const session = clientTokens.get(token);
    const { moduleId, moduleName, last4 } = req.body;
    if (!moduleId) return res.status(400).json({ error: 'moduleId es requerido.' });

    try {
        let dbState = await readDb();
        const bizIndex = dbState.businesses.findIndex(b => b.id == session.clientId);
        if (bizIndex === -1) return res.status(404).json({ error: 'Negocio no encontrado.' });

        const biz = dbState.businesses[bizIndex];

        if (biz.cancelledModules) {
            biz.cancelledModules = biz.cancelledModules.filter(cm => String(cm.id) !== String(moduleId));
        }

        if (!biz.modules) biz.modules = [];
        if (!biz.modules.some(id => String(id) === String(moduleId))) {
            biz.modules.push(moduleId);
        }

        if (!biz.moduleDates) biz.moduleDates = {};
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        biz.moduleDates[moduleId] = newExpiry.toISOString();

        pushNotification(dbState, {
            title: 'Pago Recibido',
            desc: `"${biz.name}" renovó el módulo "${moduleName || moduleId}" pagando con tarjeta terminada en ${last4 || '****'}. Válido hasta ${newExpiry.toLocaleDateString('es-CO')}.`,
            icon: 'credit-card',
            color: '#10b981'
        });

        await writeDb(dbState);
        broadcastUpdate();
        res.json({ success: true, modules: biz.modules, cancelledModules: biz.cancelledModules, moduleDates: biz.moduleDates });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor.' });
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
app.post('/api/payment/save-token', requireAdmin, async (req, res) => {
    try {
        const { bizId, token, last_four, card_brand, next_billing_date } = req.body;
        if (!bizId || !token || !last_four || !card_brand) {
            return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios.' });
        }
        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

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
app.post('/api/payment/charge-subscription/:bizId', requireAdmin, async (req, res) => {
    try {
        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == req.params.bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });
        if (!biz.billing?.gateway_token) {
            return res.status(400).json({ ok: false, message: 'Este negocio no tiene una tarjeta guardada.' });
        }

        // Calcular monto
        let totalAmount = 0;
        for (const modId of (biz.modules || [])) {
            const mod = (dbState.modules || []).find(m => m.id === modId);
            if (mod?.price) {
                const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                if (!isNaN(p)) totalAmount += p;
            }
        }

        if (totalAmount === 0) {
            return res.status(400).json({ ok: false, message: 'El monto calculado es $0. Verifique los módulos asignados.' });
        }

        const result = await PaymentService.chargeWithToken(
            biz.billing.gateway_token,
            totalAmount * 100,
            `Suscripción AS Sierra Systems — ${biz.name}`
        );

        const updatedBiz = dbState.businesses.find(b => b.id == req.params.bizId);
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
app.delete('/api/payment/remove-card/:bizId', requireAdmin, async (req, res) => {
    try {
        const dbState = await readDb();
        const biz = dbState.businesses.find(b => b.id == req.params.bizId);
        if (!biz) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

        biz.billing = {
            ...(biz.billing || {}),
            gateway_token: null,
            last_four: null,
            card_brand: null,
            subscription_status: 'pending',
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
 * POST /api/payment/trigger-billing
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

    startBillingCron();
});
