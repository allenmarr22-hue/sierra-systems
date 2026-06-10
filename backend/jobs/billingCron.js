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
const EmailService = require('../services/EmailService');

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
 * aplicados a cada una de sus sucursales (instancias activas).
 */
function calculateMonthlyAmount(business) {
    let total = 0;
    const moduleInstances = business.moduleInstances || [];
    for (const mod of moduleInstances) {
        if (mod.status === 'active') {
            const priceNum = parseFloat(mod.priceApplied) || 0;
            total += priceNum;
        }
    }
    // Fallback legacy: negocios que aún usan modules[] en vez de moduleInstances[]
    if (moduleInstances.length === 0 && business.modules && business.modules.length > 0) {
        // Los módulos legacy no tienen precio propio en el negocio,
        // así que se omiten del cálculo (precio = 0 por diseño hasta migrar).
        // Este bloque existe como guardia para evitar cobros incorrectos.
        console.warn(`[BillingCron] ⚠️ ${business.name || business.id}: Usa estructura legacy (modules[]). No se calculará monto hasta migrar a moduleInstances[].`);
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

    const allModules = db.modules || [];

    for (const biz of (db.businesses || [])) {
        const billing = biz.billing || {};
        if (billing.subscription_status === 'cancelled') continue;

        const activeInstances = biz.moduleInstances ? biz.moduleInstances.filter(m => m.status === 'active') : [];
        let amountDue = 0;
        let instancesToRenew = [];

        // Identificar qué sucursales vencen hoy (o ya vencieron)
        for (const mod of activeInstances) {
            const expDateStr = mod.renewalDate;
            if (!expDateStr) continue;
            const expDate = expDateStr.slice(0, 10);
            if (expDate <= today) {
                const priceNum = parseFloat(mod.priceApplied) || 0;
                if (priceNum > 0) {
                    amountDue += priceNum;
                    instancesToRenew.push(mod.instanceId);
                }
            }
        }

        if (instancesToRenew.length === 0) continue; // No hay sucursales por cobrar hoy

        processed++;

        // ❌ CASO: Sin método de pago registrado para renovar -> SUSPENDER
        if (!billing.gateway_token) {
            failed++;
            console.log(`[BillingCron] ❌ ${biz.name}: Sin tarjeta registrada para cobrar $${amountDue.toLocaleString('es-CO')} COP por ${instancesToRenew.length} sucursales. Suspendiendo.`);
            
            const bizInDb = db.businesses.find(b => b.id === biz.id);
            if (!bizInDb.billing) bizInDb.billing = {};
            bizInDb.billing.subscription_status = 'suspended';
            bizInDb.status = 'inactive';
            bizInDb.billing.last_failed_attempt = new Date().toISOString();

            const payId = `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            // Registrar en historial de pagos como fallido SQL directo por falta de tarjeta
            await dbHelper.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                payId,
                biz.id,
                amountDue,
                `Intento Renovación Fallida — Sin método de pago para cobrar ${instancesToRenew.length} sucursales — ${biz.name}`,
                'DECLINED',
                null
            ]);

            if (biz.clientEmail) {
                EmailService.sendSubscriptionSuspendedEmail(
                    biz.clientEmail,
                    biz.name,
                    amountDue,
                    'Sin método de pago registrado en el sistema.'
                ).catch(err => console.error('[Billing Suspended Email Error]', err));
            }

            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
                id: Date.now() + Math.random(),
                title: 'Suscripción Suspendida',
                desc: `❌ ${biz.name} — Sin método de pago registrado para renovación.`,
                icon: 'alert-triangle',
                color: '#ef4444',
                time: new Date().toISOString()
            });
            continue;
        }

        console.log(`[BillingCron] Procesando: ${biz.name} — $${amountDue.toLocaleString('es-CO')} COP por ${instancesToRenew.length} sucursales.`);

        if (dryRun) {
            console.log(`[BillingCron] [DRY RUN] Se habría cobrado $${amountDue.toLocaleString('es-CO')} COP.`);
            continue;
        }

        const amountInCents = amountDue * 100;
        const result = await PaymentService.chargeWithToken(
            billing.gateway_token,
            amountInCents,
            `Renovación de sucursales (${instancesToRenew.length}) — ${biz.name}`
        );

        const bizInDb = db.businesses.find(b => b.id === biz.id);
        if (!bizInDb.billing) bizInDb.billing = {};

        if (result.ok) {
            charged++;
            bizInDb.billing.subscription_status = 'active';
            bizInDb.status = 'active'; 
            bizInDb.billing.last_payment_date = new Date().toISOString();
            bizInDb.billing.last_payment_amount = amountDue;
            bizInDb.billing.last_transaction_id = result.transactionId;

            // Actualizar solo las fechas de las sucursales cobradas (+30 días desde HOY)
            if (bizInDb.moduleInstances) {
                for (const mod of bizInDb.moduleInstances) {
                    if (instancesToRenew.includes(mod.instanceId)) {
                        mod.renewalDate = addDays(today, 30);
                    }
                }
            }

            const payId = `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            // Registrar en historial de pagos SQL directo (Cron Automático)
            await dbHelper.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                payId,
                biz.id,
                amountDue,
                `Renovación de sucursales (${instancesToRenew.length}) — ${biz.name}`,
                'APPROVED',
                result.transactionId
            ]);

            if (biz.clientEmail) {
                EmailService.sendPaymentSuccessEmail(
                    biz.clientEmail,
                    biz.name,
                    amountDue,
                    payId,
                    instancesToRenew.length
                ).catch(err => console.error('[Billing Success Email Error]', err));
            }

            console.log(`[BillingCron] ✅ ${biz.name}: Cobro exitoso. TXN: ${result.transactionId}.`);

            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
                id: Date.now() + Math.random(),
                title: 'Pago Recibido',
                desc: `✅ ${biz.name} — $${amountDue.toLocaleString('es-CO')} COP (${instancesToRenew.length} sucursales)`,
                icon: 'check-circle',
                color: '#10b981',
                time: new Date().toISOString()
            });
        } else {
            failed++;
            bizInDb.billing.subscription_status = 'suspended';
            bizInDb.status = 'inactive'; 
            bizInDb.billing.last_failed_attempt = new Date().toISOString();

            const payId = `pay_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            // Registrar en historial de pagos como fallido SQL directo
            await dbHelper.pool.query(`
                INSERT INTO payment_history (id, business_id, amount, \`desc\`, status, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                payId,
                biz.id,
                amountDue,
                `Intento Renovación Fallida — Renovación de sucursales (${instancesToRenew.length}) — ${biz.name}`,
                'DECLINED',
                null
            ]);

            if (biz.clientEmail) {
                EmailService.sendPaymentDeclinedEmail(
                    biz.clientEmail,
                    biz.name,
                    amountDue,
                    result.message
                ).catch(err => console.error('[Billing Declined Email Error]', err));
            }

            console.log(`[BillingCron] ❌ ${biz.name}: Cobro fallido — ${result.message}`);

            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
                id: Date.now() + Math.random(),
                title: 'Pago Fallido',
                desc: `❌ ${biz.name} — ${result.message}. Negocio suspendido.`,
                icon: 'x-circle',
                color: '#ef4444',
                time: new Date().toISOString()
            });
        }

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
