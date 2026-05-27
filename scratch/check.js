const db = require('./backend/db');
async function test() {
    try {
        const [rows] = await db.pool.query("SHOW TABLES LIKE 'tickets'");
        console.log("SHOW TABLES:", rows);
        const [desc] = await db.pool.query("DESCRIBE tickets");
        console.log("DESCRIBE:", desc);
    } catch(e) {
        console.error("DB Error:", e);
    } finally {
        await db.pool.end();
    }
}
test();
