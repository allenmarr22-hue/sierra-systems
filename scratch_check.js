const db = require('./backend/db');
async function test() {
    try {
        const hashed = db.hashPassword("fogon123");
        await db.pool.query("UPDATE businesses SET client_pass = ? WHERE client_email = 'fogon@cliente.com'", [hashed]);
        console.log("PASSWORD RESET SUCCESSFUL!");
        
        // Double check
        const [rows] = await db.pool.query("SELECT client_pass FROM businesses WHERE client_email = 'fogon@cliente.com'");
        console.log("NEW HASH:", rows[0].client_pass);
        console.log("VERIFIES?", db.verifyPassword("fogon123", rows[0].client_pass));
    } catch(e) {
        console.error(e);
    } finally {
        await db.pool.end();
    }
}
test();
