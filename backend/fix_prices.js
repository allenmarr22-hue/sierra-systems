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

async function fix() {
    const pool = mysql.createPool({
        host: process.env.MYSQLHOST,
        port: parseInt(process.env.MYSQLPORT || '3306'),
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE
    });

    try {
        const [modules] = await pool.query('SELECT id, price FROM modules');
        for (const m of modules) {
            const numericPrice = parseFloat(String(m.price).replace(/\\D/g, '')) || 0;
            if (numericPrice > 0) {
                await pool.query('UPDATE business_modules SET price_applied = ? WHERE module_id = ? AND price_applied = 0', [numericPrice, m.id]);
                console.log(`Updated instances for module ${m.id} to price ${numericPrice}`);
            }
        }
        console.log('Prices fixed.');
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
fix();
