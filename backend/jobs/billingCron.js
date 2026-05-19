/**
 * ============================================================
 * billingCron.js — AS Sierra Systems
 * ============================================================
 * Cron Job de Facturación Automática.
 * Se ejecuta todos los días a medianoche para cobrar a los
 * negocios cuya fecha de corte es HOY.
 *
 * Uso:
 *   - Automático: se inicia con el servidor (ver server.js)
 *   - Manual de prueba: node backend/jobs/billingCron.js
 * ============================================================
 */

const dbHelper = require('../db');
const cron = require('node-cron');
const PaymentService = require('../services/PaymentService');

// ─── Utilidades ────────────────────────────────────────────────────────────────

async function readDb() {
    try {
        return await dbHelper.getCompleteState();
    } catch (err) {
        console.error('[BillingCron] ❌ Error leyendo base de datos relacional:', err.message);
        throw new Error('No se puede leer la base de datos relacional.');
    }
}

async function writeDb(db) {
    try {
        await dbHelper.saveCompleteState(db);
    } catch (err) {
        console.error('[BillingCron] ❌ Error escribiendo base de datos relacional:', err.message);
        throw new Error('No se puede guardar en la base de datos relacional.');
    }
}

function todayStr() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/**
 * Calcula el monto mensual de un negocio sumando los precios
 * de sus módulos activos.
 */
function calculateMonthlyAmount(business, allModules) {
    let total = 0;
    const activeModules = business.modules || [];
    for (const modId of activeModules) {
        const mod = allModules.find(m => m.id === modId);
        if (mod && mod.price) {
            // Extraer solo el número del precio (ej: "$ 95.000" → 95000)
            const priceNum = parseInt(String(mod.price).replace(/\D/g, ''), 10);
            if (!isNaN(priceNum)) total += priceNum;
        }
    }
    return total;
}

// ─── Proceso principal de facturación ─────────────────────────────────────────

async function runBillingCycle(dryRun = false) {
    console.log(`\n[BillingCron] 🕛 Iniciando ciclo de facturación. ${dryRun ? '(DRY RUN)' : ''}`);
    console.log(`[BillingCron] Fecha de hoy: ${todayStr()}`);

    let db;
    try {
        db = await readDb();
    } catch (err) {
        console.error('[BillingCron] Abortando ciclo: error al cargar DB.');
        return { processed: 0, charged: 0, failed: 0 };
    }

    const today = todayStr();
    let processed = 0;
    let charged = 0;
    let failed = 0;

    // Filtrar negocios activos con token guardado y fecha de corte hoy
    const businessesToCharge = (db.businesses || []).filter(biz => {
        const billing = biz.billing;
        if (!billing) return false;
        if (!billing.gateway_token) return false; // Sin tarjeta guardada
        if (billing.subscription_status === 'cancelled') return false;
        if (!billing.next_billing_date) return false;
        return billing.next_billing_date.slice(0, 10) === today;
    });

    console.log(`[BillingCron] Negocios a cobrar hoy: ${businessesToCharge.length}`);

    for (const biz of businessesToCharge) {
        processed++;
        const billing = biz.billing;
        const monthlyAmount = calculateMonthlyAmount(biz, db.modules || []);

        if (monthlyAmount === 0) {
            console.log(`[BillingCron] ⚠️  ${biz.name}: monto $0, omitiendo.`);
            continue;
        }

        console.log(`[BillingCron] Procesando: ${biz.name} — $${monthlyAmount.toLocaleString('es-CO')} COP`);

        if (dryRun) {
            console.log(`[BillingCron] [DRY RUN] Se habría cobrado $${monthlyAmount.toLocaleString('es-CO')} COP.`);
            continue;
        }

        // Convertir a centavos (Wompi usa centavos)
        const amountInCents = monthlyAmount * 100;

        const result = await PaymentService.chargeWithToken(
            billing.gateway_token,
            amountInCents,
            `Suscripción mensual AS Sierra Systems — ${biz.name}`
        );

        // Actualizar el negocio según el resultado
        const bizInDb = db.businesses.find(b => b.id === biz.id);
        if (!bizInDb.billing) bizInDb.billing = {};

        if (result.ok) {
            charged++;
            bizInDb.billing.subscription_status = 'active';
            bizInDb.status = 'active'; // Restaura el acceso si estaba suspendido
            bizInDb.billing.last_payment_date = new Date().toISOString();
            bizInDb.billing.last_payment_amount = monthlyAmount;
            bizInDb.billing.next_billing_date = addDays(today, 30);
            bizInDb.billing.last_transaction_id = result.transactionId;

            console.log(`[BillingCron] ✅ ${biz.name}: Cobro exitoso. TXN: ${result.transactionId}. Próximo corte: ${bizInDb.billing.next_billing_date}`);

            // Notificación interna de pago exitoso
            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
                id: Date.now() + Math.random(),
                time: new Date().toISOString(),
                type: 'success',
                message: `✅ Pago de suscripción recibido: ${biz.name} — $${monthlyAmount.toLocaleString('es-CO')} COP`,
            });
        } else {
            failed++;
            bizInDb.billing.subscription_status = 'suspended';
            bizInDb.status = 'inactive'; // Suspende el negocio completo (páginas públicas y panel)
            bizInDb.billing.last_failed_attempt = new Date().toISOString();

            console.log(`[BillingCron] ❌ ${biz.name}: Cobro fallido — ${result.message}`);

            // Notificación interna de fallo
            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
                id: Date.now() + Math.random(),
                time: new Date().toISOString(),
                type: 'error',
                message: `❌ Pago fallido: ${biz.name} — ${result.message}. Suscripción suspendida.`,
            });
        }

        // Mantener máximo 50 notificaciones
        if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
    }

    if (!dryRun && processed > 0) {
        await writeDb(db);
    }

    console.log(`[BillingCron] 📊 Resumen: ${processed} procesados, ${charged} exitosos, ${failed} fallidos.\n`);
    return { processed, charged, failed };
}

// ─── Inicializar Cron ─────────────────────────────────────────────────────────

/**
 * Registra el cron job. Llamar desde server.js al inicio.
 * Se ejecuta todos los días a las 00:05 AM.
 */
function startBillingCron() {
    cron.schedule('5 0 * * *', () => {
        runBillingCycle();
    }, {
        timezone: 'America/Bogota',
    });
    console.log('[BillingCron] ✅ Cron de facturación registrado. Se ejecuta diariamente a las 00:05 AM (Bogotá).');
}

// ─── Exportar ─────────────────────────────────────────────────────────────────
module.exports = { startBillingCron, runBillingCycle };

// ─── Ejecución directa (para pruebas) ────────────────────────────────────────
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');
    runBillingCycle(dryRun).then(() => process.exit(0));
}
