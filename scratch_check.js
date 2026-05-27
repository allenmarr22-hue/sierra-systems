const db = require('./backend/db');
async function test() {
    try {
        const [rows] = await db.pool.query("SELECT id, name FROM modules");
        console.log("EXISTING MODULES:", rows);
    } catch(e) {
        console.error("DB Error:", e);
    } finally {
        await db.pool.end();
    }
}
test();
