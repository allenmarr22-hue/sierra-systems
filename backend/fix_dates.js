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
    const pool = mysql.createPool({ host: process.env.MYSQLHOST, port: parseInt(process.env.MYSQLPORT || '3306'), user: process.env.MYSQLUSER, password: process.env.MYSQLPASSWORD, database: process.env.MYSQLDATABASE });
    
    // Set renewal_date to next_billing_date if renewal_date is null
    const [bizs] = await pool.query('SELECT id, next_billing_date FROM businesses WHERE next_billing_date IS NOT NULL');
    for (const b of bizs) {
        let dateStr = b.next_billing_date;
        if (dateStr instanceof Date) {
            dateStr = dateStr.toISOString().slice(0, 10);
        }
        await pool.query('UPDATE business_modules SET renewal_date = ? WHERE business_id = ? AND renewal_date IS NULL', [dateStr, b.id]);
    }
    console.log('Fixed renewal dates');
    
    await pool.end();
}
run();
