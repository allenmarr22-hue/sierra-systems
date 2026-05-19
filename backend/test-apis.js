const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess;

// Iniciar el servidor
function startServer() {
    return new Promise((resolve, reject) => {
        console.log('\n🚀 Iniciando el servidor backend en el puerto ' + PORT + '...');
        serverProcess = spawn('node', ['server.js'], {
            cwd: __dirname,
            env: { ...process.env, PORT: PORT }
        });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Servidor unificado en línea')) {
                console.log('✅ Servidor iniciado correctamente.');
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`🚨 [Server Error]: ${data}`);
        });

        serverProcess.on('error', (err) => {
            reject(err);
        });

        // Timeout de seguridad de 5 segundos
        setTimeout(() => {
            resolve();
        }, 3000);
    });
}

// Detener el servidor
function stopServer() {
    if (serverProcess) {
        console.log('\n🔌 Apagando el servidor backend...');
        serverProcess.kill('SIGINT');
        console.log('✅ Servidor apagado.');
    }
}

// Helper para realizar peticiones fetch y reportar resultados
async function testRequest(name, endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const start = Date.now();
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const duration = Date.now() - start;
        const status = response.status;
        let body;
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            body = await response.json();
        } else {
            body = await response.text();
        }

        const success = status >= 200 && status < 300;
        const emoji = success ? '🟢' : '🔴';
        
        console.log(`${emoji} [${status}] ${name} (${duration}ms)`);
        if (!success) {
            console.log(`   └─ Error: ${typeof body === 'object' ? JSON.stringify(body) : body}`);
        }
        return { success, status, body };
    } catch (error) {
        console.log(`🔴 [FAIL] ${name}`);
        console.log(`   └─ Connection Error: ${error.message}`);
        return { success: false, error };
    }
}

async function runTests() {
    let adminToken = '';
    let clientToken = '';
    let testUserId = 9999;
    let testBizId = 9999;

    console.log('\n======================================================');
    console.log('🤖 INICIANDO BANCO DE PRUEBAS DE APIS - SIERRA SYSTEMS');
    console.log('======================================================');

    // --------------------------------------------------------
    // 1. AUTENTICACIÓN ADMINISTRADOR
    // --------------------------------------------------------
    console.log('\n🔒 --- Pruebas de Autenticación de Administrador ---');
    
    // Login correcto
    const loginRes = await testRequest('POST /api/login (Credenciales válidas)', '/api/login', {
        method: 'POST',
        body: JSON.stringify({ user: 'admin', pass: '123456' })
    });
    if (loginRes.success && loginRes.body.token) {
        adminToken = loginRes.body.token;
        console.log(`   └─ Token de administrador obtenido: ${adminToken.substring(0, 12)}...`);
    }

    // Login incorrecto
    await testRequest('POST /api/login (Credenciales inválidas)', '/api/login', {
        method: 'POST',
        body: JSON.stringify({ user: 'admin', pass: 'incorrecta' })
    });

    // Refresh Token
    await testRequest('POST /api/admin/refresh-token', '/api/admin/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ user: 'admin', pass: '123456' })
    });

    // --------------------------------------------------------
    // 2. AUTENTICACIÓN CLIENTE
    // --------------------------------------------------------
    console.log('\n👥 --- Pruebas de Autenticación de Cliente ---');
    
    // Login de cliente válido
    const clientLoginRes = await testRequest('POST /api/client/login (Válido)', '/api/client/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'fogon@cliente.com', pass: 'fogon123' })
    });
    if (clientLoginRes.success && clientLoginRes.body.token) {
        clientToken = clientLoginRes.body.token;
        console.log(`   └─ Token de cliente obtenido: ${clientToken.substring(0, 12)}...`);
    }

    // Login de cliente inválido
    await testRequest('POST /api/client/login (Inválido)', '/api/client/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'fogon@cliente.com', pass: 'wrongpass' })
    });

    // Verificar token del cliente
    await testRequest('POST /api/client/verify', '/api/client/verify', {
        method: 'POST',
        body: JSON.stringify({ token: clientToken })
    });

    // --------------------------------------------------------
    // 3. CONSULTAS DE CONFIGURACIÓN Y MONITOREO
    // --------------------------------------------------------
    console.log('\n📊 --- Pruebas de Consultas Generales de Datos ---');
    
    await testRequest('GET /api/data (Base de datos segura)', '/api/data');
    await testRequest('GET /api/settings (Ajustes públicos de marca)', '/api/settings');
    await testRequest('GET /api/notifications (Historial de notificaciones)', '/api/notifications');

    // --------------------------------------------------------
    // 4. GESTIÓN CRUD DE NEGOCIOS (ADMIN)
    // --------------------------------------------------------
    console.log('\n🏢 --- Pruebas CRUD de Negocios (Super Admin) ---');

    // Registrar nuevo negocio
    const newBizData = {
        id: testBizId,
        name: 'Negocio de Prueba API',
        type: 'restaurant',
        status: 'active',
        city: 'Riohacha',
        clientEmail: 'pruebaapi@cliente.com',
        clientPass: 'api123',
        modules: ['streetfeed'],
        billing: {
            subscription_status: 'pending'
        }
    };
    await testRequest('POST /api/businesses/new (Crear negocio)', '/api/businesses/new', {
        method: 'POST',
        body: JSON.stringify(newBizData)
    });

    // Actualizar datos del negocio
    await testRequest('PUT /api/businesses/:id (Editar negocio)', `/api/businesses/${testBizId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Negocio de Prueba API Modificado', city: 'Valledupar' })
    });

    // Establecer/actualizar credenciales del negocio por parte del administrador
    await testRequest('POST /api/businesses/:id/credentials', `/api/businesses/${testBizId}/credentials`, {
        method: 'POST',
        body: JSON.stringify({ clientEmail: 'pruebaapi_new@cliente.com', clientPass: 'api12345' })
    });

    // Alternar estado (desactivar negocio)
    await testRequest('POST /api/businesses/toggle (Desactivar negocio)', '/api/businesses/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: testBizId, status: 'inactive' })
    });

    // Alternar estado (activar negocio de nuevo)
    await testRequest('POST /api/businesses/toggle (Activar negocio)', '/api/businesses/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: testBizId, status: 'active' })
    });

    // --------------------------------------------------------
    // 5. GESTIÓN CRUD DE USUARIOS / EQUIPO (ADMIN)
    // --------------------------------------------------------
    console.log('\n🛡️ --- Pruebas CRUD de Usuarios del Equipo (Super Admin) ---');

    // Registrar nuevo usuario
    const newUserData = {
        id: testUserId,
        name: 'Soporte API',
        role: 'Soporte Técnico',
        user: 'soporte_api',
        pass: 'soporte123',
        status: 'active'
    };
    await testRequest('POST /api/users/new (Crear usuario)', '/api/users/new', {
        method: 'POST',
        body: JSON.stringify(newUserData)
    });

    // Actualizar datos de usuario
    await testRequest('PUT /api/users/:id (Editar usuario)', `/api/users/${testUserId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Soporte API Modificado' })
    });

    // Eliminar usuario
    await testRequest('DELETE /api/users/:id (Eliminar usuario)', `/api/users/${testUserId}`, {
        method: 'DELETE'
    });

    // --------------------------------------------------------
    // 6. ADMINISTRACIÓN DE MÓDULOS (ADMIN)
    // --------------------------------------------------------
    console.log('\n🧩 --- Pruebas de Configuración de Módulos (Super Admin) ---');

    // Desactivar módulo globalmente
    await testRequest('POST /api/modules/toggle (Desactivar módulo)', '/api/modules/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: 'agenda', status: 'inactive' })
    });

    // Activar módulo globalmente
    await testRequest('POST /api/modules/toggle (Activar módulo)', '/api/modules/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: 'agenda', status: 'active' })
    });

    // Editar definición del módulo
    await testRequest('PUT /api/modules/:id (Actualizar precio y metadata)', '/api/modules/agenda', {
        method: 'PUT',
        body: JSON.stringify({ name: 'StyleSync Pro', price: '$ 140.000', status: 'active' })
    });

    // --------------------------------------------------------
    // 7. ACCIONES DE AUTOGESTIÓN DEL PORTAL DE CLIENTES
    // --------------------------------------------------------
    console.log('\n🏠 --- Pruebas de Autogestión de Clientes (Portal de Clientes) ---');

    // Actualizar información del perfil del cliente (Nombre)
    await testRequest('POST /api/client/profile/update', '/api/client/profile/update', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientToken}` },
        body: JSON.stringify({ newName: 'Restaurante El Fogón S.A.S' })
    });

    // Actualizar credenciales de seguridad (Autogestión)
    await testRequest('POST /api/client/credentials/update', '/api/client/credentials/update', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientToken}` },
        body: JSON.stringify({ currentPass: 'fogon123', newEmail: 'fogon_nuevo@cliente.com', newPass: 'fogon123' })
    });

    // Auto-cancelar suscripción de un módulo (Pausa al final del ciclo)
    await testRequest('POST /api/client/module/cancel', '/api/client/module/cancel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientToken}` },
        body: JSON.stringify({ moduleId: 'streetfeed', moduleName: 'StreetFeed Pro' })
    });

    // Auto-reactivar suscripción cancelada (Antes de expirar el ciclo)
    await testRequest('POST /api/client/module/reactivate', '/api/client/module/reactivate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientToken}` },
        body: JSON.stringify({ moduleId: 'streetfeed' })
    });

    // --------------------------------------------------------
    // 8. PASARELA DE PAGOS Y SUSCRIPCIONES (ADMIN)
    // --------------------------------------------------------
    console.log('\n💳 --- Pruebas de Facturación y Wompi Sandbox (Super Admin / Tokenización) ---');

    const headersWithAdmin = { 'Authorization': `Bearer ${adminToken}` };

    // Guardar tokenización de tarjeta (Simulado de Wompi)
    await testRequest('POST /api/payment/save-token (Guardar tarjeta simulada)', '/api/payment/save-token', {
        method: 'POST',
        headers: headersWithAdmin,
        body: JSON.stringify({
            bizId: 1,
            token: 'sim_tok_1779054020080_njhw6d',
            last_four: '7459',
            card_brand: 'VISA'
        })
    });

    // Realizar cobro manual recurrente simulado
    await testRequest('POST /api/payment/charge-subscription/:bizId (Cobrar suscripción)', '/api/payment/charge-subscription/1', {
        method: 'POST',
        headers: headersWithAdmin
    });

    // Disparar ciclo automático de facturación diaria (Simulado cron)
    await testRequest('POST /api/payment/trigger-billing (Disparar cron diario)', '/api/payment/trigger-billing', {
        method: 'POST',
        headers: headersWithAdmin,
        body: JSON.stringify({ dryRun: true })
    });

    // Eliminar tarjeta guardada
    await testRequest('DELETE /api/payment/remove-card/:bizId (Remover tarjeta)', '/api/payment/remove-card/1', {
        method: 'DELETE',
        headers: headersWithAdmin
    });

    // --------------------------------------------------------
    // 9. CONFIGURACIONES GENERALES DE MARCA (ADMIN)
    // --------------------------------------------------------
    console.log('\n⚙️ --- Pruebas de Configuración de Marca (Super Admin) ---');

    // Modificar datos generales
    await testRequest('POST /api/settings/save (Actualizar datos generales)', '/api/settings/save', {
        method: 'POST',
        body: JSON.stringify({ logo: 'data:image/png;base64,iVBORw0KGgo...', adminUser: 'admin', currentPass: '123456' })
    });

    // --------------------------------------------------------
    // 10. LIMPIEZA Y CIERRE DE SESIÓN
    // --------------------------------------------------------
    console.log('\n🧼 --- Limpieza de Entorno y Cierre ---');

    // Eliminar negocio de prueba API
    await testRequest('DELETE /api/businesses/:id (Eliminar negocio de prueba)', `/api/businesses/${testBizId}`, {
        method: 'DELETE'
    });

    // Limpiar notificaciones
    await testRequest('DELETE /api/notifications (Limpiar logs de auditoría)', '/api/notifications', {
        method: 'DELETE'
    });

    // Logout Administrador
    await testRequest('POST /api/admin/logout (Cerrar sesión administrador)', '/api/admin/logout', {
        method: 'POST',
        headers: headersWithAdmin
    });

    console.log('\n======================================================');
    console.log('🏁 BANCO DE PRUEBAS FINALIZADO');
    console.log('======================================================');
}

const dataFilePath = path.join(__dirname, 'data.json');
const backupPath = path.join(__dirname, 'data.backup.json');

function backupDatabase() {
    if (fs.existsSync(dataFilePath)) {
        fs.copyFileSync(dataFilePath, backupPath);
        console.log('📦 Base de datos data.json respaldada temporalmente.');
    }
}

function restoreDatabase() {
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dataFilePath);
        fs.unlinkSync(backupPath);
        console.log('🧼 Base de datos data.json restaurada a su estado original.');
    }
}

async function main() {
    try {
        backupDatabase();
        await startServer();
        await runTests();
    } catch (e) {
        console.error('❌ Error fatal en las pruebas:', e);
    } finally {
        stopServer();
        restoreDatabase();
    }
}

main();
