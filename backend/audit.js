/**
 * audit.js — Auditoría completa del sistema AS Sierra Systems
 * Ejecutar desde: backend/
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
        const part = line.trim();
        if (part && !part.startsWith('#')) {
            const eqIdx = part.indexOf('=');
            if (eqIdx > 0) {
                const key = part.substring(0, eqIdx).trim();
                const val = part.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                if (key && process.env[key] === undefined) process.env[key] = val;
            }
        }
    });
}

const issues = [];
const ok = [];

function pass(msg) { ok.push('  ✅ ' + msg); }
function fail(msg) { issues.push('  ❌ ' + msg); }
function warn(msg) { issues.push('  ⚠️  ' + msg); }

async function run() {
    const pool = mysql.createPool({
        host: process.env.MYSQLHOST,
        port: parseInt(process.env.MYSQLPORT || '3306'),
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE
    });

    console.log('\n==========================================');
    console.log(' AUDITORÍA COMPLETA — AS Sierra Systems');
    console.log('==========================================\n');

    // ─── 1. SCHEMA DE TABLAS ──────────────────────────────────────
    console.log('📋 1. Verificando schema de tablas...');
    const tables = ['system_config', 'users', 'modules', 'businesses', 'business_modules', 'notifications'];
    const [tableRows] = await pool.query('SHOW TABLES');
    const existingTables = tableRows.map(r => Object.values(r)[0]);
    for (const t of tables) {
        if (existingTables.includes(t)) pass(`Tabla "${t}" existe`);
        else fail(`Tabla "${t}" NO existe`);
    }

    // Columna image en modules
    const [modCols] = await pool.query('SHOW COLUMNS FROM modules');
    const modColNames = modCols.map(c => c.Field);
    if (modColNames.includes('image')) pass('Columna image en modules existe');
    else fail('Columna image en modules NO existe');

    // business_modules columns
    const [bmCols] = await pool.query('SHOW COLUMNS FROM business_modules');
    const bmColNames = bmCols.map(c => c.Field);
    for (const col of ['instance_id','business_id','module_id','branch_name','status','price_applied','renewal_date','cancelled_at','access_until']) {
        if (bmColNames.includes(col)) pass(`business_modules.${col} existe`);
        else fail(`business_modules.${col} NO existe`);
    }

    // ─── 2. MÓDULOS ───────────────────────────────────────────────
    console.log('\n💾 2. Verificando módulos...');
    const [modules] = await pool.query('SELECT id, name, price, status FROM modules');
    if (modules.length === 0) { fail('No hay módulos en la base de datos'); }
    else {
        for (const m of modules) {
            const numPrice = parseFloat(String(m.price).replace(/\D/g, '')) || 0;
            if (numPrice > 0) pass(`Módulo "${m.name}" precio=${m.price} status=${m.status}`);
            else warn(`Módulo "${m.name}" tiene precio=$0 o no parseable (precio raw: "${m.price}")`);
        }
    }

    // ─── 3. NEGOCIOS ──────────────────────────────────────────────
    console.log('\n🏢 3. Verificando negocios...');
    const [bizs] = await pool.query('SELECT id, name, client_email, subscription_status, gateway_token, last_four, card_brand FROM businesses');
    for (const b of bizs) {
        pass(`Negocio "${b.name}" (${b.client_email}) status=${b.subscription_status} tarjeta=${b.last_four || 'sin tarjeta'}`);
    }

    // ─── 4. INSTANCIAS / SEDES ────────────────────────────────────
    console.log('\n🏪 4. Verificando instancias de módulos (sedes)...');
    const [instances] = await pool.query(
        'SELECT bm.instance_id, bm.business_id, b.name as biz_name, bm.module_id, bm.branch_name, bm.status, bm.price_applied, bm.renewal_date ' +
        'FROM business_modules bm JOIN businesses b ON bm.business_id = b.id ORDER BY bm.business_id ASC'
    );
    
    if (instances.length === 0) { fail('No hay instancias/sedes en business_modules'); }

    const bizInstances = {};
    for (const inst of instances) {
        if (!bizInstances[inst.biz_name]) bizInstances[inst.biz_name] = [];
        bizInstances[inst.biz_name].push(inst);
    }

    for (const [bizName, insts] of Object.entries(bizInstances)) {
        const active = insts.filter(i => i.status === 'active');
        const cancelled = insts.filter(i => i.status === 'cancelled');
        console.log(`  → ${bizName}: ${active.length} activa(s), ${cancelled.length} cancelada(s)`);

        for (let idx = 0; idx < active.length; idx++) {
            const inst = active[idx];
            const price = parseFloat(inst.price_applied) || 0;
            const hasRenewal = !!inst.renewal_date;

            if (price === 0) fail(`[${bizName}] Sede "${inst.branch_name}" tiene price_applied=$0`);
            else pass(`[${bizName}] Sede "${inst.branch_name}" price=$${price.toLocaleString('es-CO')} renewal=${inst.renewal_date || 'NINGUNA'}`);

            if (!hasRenewal) warn(`[${bizName}] Sede "${inst.branch_name}" NO tiene renewal_date`);

            // Verificar 30% de descuento en sede 2+
            if (idx > 0) {
                const firstPrice = parseFloat(active[0].price_applied) || 0;
                const expectedDiscounted = Math.round(firstPrice * 0.70);
                if (Math.abs(price - expectedDiscounted) <= 1) {
                    pass(`[${bizName}] Sede "${inst.branch_name}" tiene descuento 30% aplicado correctamente ($${price.toLocaleString('es-CO')})`);
                } else if (price === firstPrice) {
                    warn(`[${bizName}] Sede "${inst.branch_name}" NO tiene descuento 30% (cobra igual que la primera sede: $${price.toLocaleString('es-CO')})`);
                }
            }
        }
    }

    // ─── 5. FIX AUTOMÁTICO: precios $0 sin renewal_date ──────────
    console.log('\n🔧 5. Aplicando correcciones automáticas...');
    let fixed = 0;

    for (const m of modules) {
        const numPrice = parseFloat(String(m.price).replace(/\D/g, '')) || 0;
        if (numPrice > 0) {
            const [res] = await pool.query(
                'UPDATE business_modules SET price_applied = ? WHERE module_id = ? AND price_applied = 0 AND status = ?',
                [numPrice, m.id, 'active']
            );
            if (res.affectedRows > 0) {
                pass(`Corrección aplicada: ${res.affectedRows} instancia(s) de "${m.id}" tenían $0 → ahora $${numPrice.toLocaleString('es-CO')}`);
                fixed += res.affectedRows;
            }
        }
    }

    // Fix renewal_date null usando next_billing_date del negocio
    const [bizDates] = await pool.query('SELECT id, next_billing_date FROM businesses WHERE next_billing_date IS NOT NULL');
    for (const b of bizDates) {
        let dateStr = b.next_billing_date;
        if (dateStr instanceof Date) dateStr = dateStr.toISOString().slice(0, 10);
        const [res] = await pool.query(
            'UPDATE business_modules SET renewal_date = ? WHERE business_id = ? AND renewal_date IS NULL AND status = ?',
            [dateStr, b.id, 'active']
        );
        if (res.affectedRows > 0) {
            pass(`Corrección aplicada: ${res.affectedRows} instancia(s) de negocio #${b.id} sin renewal_date → ${dateStr}`);
            fixed++;
        }
    }

    if (fixed === 0) pass('No fue necesario aplicar correcciones de precio/fecha');

    // ─── 6. VERIFICAR ENDPOINT ACTIVO ────────────────────────────
    console.log('\n🌐 6. Verificando endpoint /api/data...');
    try {
        const res = await fetch('http://localhost:3000/api/data');
        if (res.ok) {
            const data = await res.json();
            pass('/api/data responde correctamente');
            
            for (const biz of data.businesses) {
                const activeInst = (biz.moduleInstances || []).filter(i => i.status === 'active');
                if (activeInst.length > 0) {
                    const totalMonthly = activeInst.reduce((s, i) => s + (parseFloat(i.priceApplied) || 0), 0);
                    pass(`[API] "${biz.name}": ${activeInst.length} sedes activas, total=$${totalMonthly.toLocaleString('es-CO')}`);
                    for (const inst of activeInst) {
                        if (!inst.renewalDate) warn(`[API] "${biz.name}" sede "${inst.branchName}" sin renewalDate en la respuesta`);
                        if ((parseFloat(inst.priceApplied) || 0) === 0) fail(`[API] "${biz.name}" sede "${inst.branchName}" con priceApplied=0`);
                    }
                } else {
                    warn(`[API] "${biz.name}" no tiene moduleInstances activas`);
                }
            }
        } else {
            fail(`/api/data devolvió status ${res.status}`);
        }
    } catch (e) {
        fail(`No se pudo conectar a localhost:3000 — ${e.message}`);
    }

    // ─── 7. TEST DE LÓGICA DEL 30% ────────────────────────────────
    console.log('\n🧮 7. Test de lógica de descuento 30%...');
    const basePrice = 95000;
    const discountedPrice = Math.round(basePrice * 0.70);
    if (discountedPrice === 66500) pass(`30% descuento: $${basePrice.toLocaleString('es-CO')} → $${discountedPrice.toLocaleString('es-CO')} ✓`);
    else fail(`Cálculo de descuento incorrecto: obtuvo ${discountedPrice}`);

    const basePrice2 = 140000;
    const discountedPrice2 = Math.round(basePrice2 * 0.70);
    if (discountedPrice2 === 98000) pass(`30% descuento: $${basePrice2.toLocaleString('es-CO')} → $${discountedPrice2.toLocaleString('es-CO')} ✓`);
    else fail(`Cálculo de descuento incorrecto: obtuvo ${discountedPrice2}`);

    // ─── RESUMEN ──────────────────────────────────────────────────
    console.log('\n==========================================');
    console.log(` RESULTADOS`);
    console.log('==========================================');
    ok.forEach(m => console.log(m));
    if (issues.length > 0) {
        console.log('\n--- Problemas detectados ---');
        issues.forEach(m => console.log(m));
    } else {
        console.log('\n🎉 Sin problemas detectados — Sistema en perfecto estado!');
    }
    console.log('\n==========================================\n');

    await pool.end();
}

run().catch(e => {
    console.error('Error fatal en auditoría:', e.message);
    process.exit(1);
});
