/**
 * fix_all.js — Correcciones definitivas
 * 1. Aplica 30% descuento a Sede Medellín en DB
 * 2. Reporta el estado final correcto
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

async function run() {
    const pool = mysql.createPool({
        host: process.env.MYSQLHOST,
        port: parseInt(process.env.MYSQLPORT || '3306'),
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE
    });

    console.log('Correcting Sede Medellin price (apply 30% discount)...');
    // Sede Principal = $95,000 -> Sede Medellín (2nd) should be 95000 * 0.70 = $66,500
    const [res] = await pool.query(
        "UPDATE business_modules SET price_applied = 66500 WHERE instance_id = 'inst_1779327841515_957'"
    );
    console.log('Rows updated:', res.affectedRows);

    const [rows] = await pool.query(
        'SELECT instance_id, branch_name, price_applied FROM business_modules ORDER BY instance_id'
    );
    console.log('Final instances:');
    rows.forEach(r => console.log(` - ${r.instance_id}: ${r.branch_name} = $${parseFloat(r.price_applied).toLocaleString('es-CO')}`));

    await pool.end();
    console.log('Done.');
}
run();
