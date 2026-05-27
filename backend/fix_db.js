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
        // 1. Add image column to modules if missing
        try {
            await pool.query('ALTER TABLE modules ADD COLUMN image LONGTEXT NULL');
            console.log('OK: image column added to modules');
        } catch(e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('INFO: image column already exists');
            } else {
                console.log('WARN:', e.message);
            }
        }

        // 2. Verify schema
        const [cols] = await pool.query('SHOW COLUMNS FROM modules');
        console.log('modules columns:', cols.map(c => c.Field).join(', '));

        const [bizCols] = await pool.query('SHOW COLUMNS FROM businesses');
        console.log('businesses columns:', bizCols.map(c => c.Field).join(', '));

        const [bmCols] = await pool.query('SHOW COLUMNS FROM business_modules');
        console.log('business_modules columns:', bmCols.map(c => c.Field).join(', '));

        // 3. Check data
        const [bizRows] = await pool.query('SELECT id, name, client_email FROM businesses');
        console.log('businesses count:', bizRows.length);
        bizRows.forEach(b => console.log(' -', b.id, b.name, b.client_email));

        const [modRows] = await pool.query('SELECT id, name FROM modules');
        console.log('modules count:', modRows.length);
        modRows.forEach(m => console.log(' -', m.id, m.name));

        const [instRows] = await pool.query('SELECT instance_id, business_id, module_id, branch_name, status FROM business_modules');
        console.log('business_modules count:', instRows.length);
        instRows.forEach(r => console.log(' -', r.instance_id, r.business_id, r.module_id, r.branch_name, r.status));

        console.log('\nAll done.');
    } catch(e) {
        console.error('Fatal error:', e.message);
    } finally {
        await pool.end();
    }
}

fix();
