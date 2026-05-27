/**
 * ============================================================
 * ticketCleanupCron.js — AS Sierra Systems
 * ============================================================
 * Cron Job de Mantenimiento y Limpieza Automática de Soporte.
 * Se ejecuta todos los días a medianoche (10 minutos después
 * del cron de facturación) para limpiar tickets finalizados
 * (resueltos o cerrados) con más de 6 meses (180 días) de antigüedad.
 *
 * Elimina físicamente las imágenes cargadas en el servidor
 * para no desperdiciar espacio de disco, y luego elimina los
 * registros en cascada en la base de datos MySQL.
 * ============================================================
 */

const db = require('../db');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const ticketImagesDir = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'ticket-images');

async function runTicketCleanup(dryRun = false) {
    console.log(`\n[TicketCleanup] 🧹 Iniciando limpieza automática de tickets antiguos. ${dryRun ? '(DRY RUN)' : ''}`);

    try {
        // 1. Obtener la lista de tickets resueltos/cerrados de más de 180 días
        const [tickets] = await db.pool.query(`
            SELECT id, created_at FROM tickets 
            WHERE (status = 'resuelto' OR status = 'cerrado') 
              AND created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)
        `);

        if (tickets.length === 0) {
            console.log('[TicketCleanup] ✅ No hay tickets antiguos finalizados para limpiar hoy.');
            return { cleanedCount: 0, deletedFiles: 0 };
        }

        console.log(`[TicketCleanup] ℹ️ Se encontraron ${tickets.length} tickets finalizados de más de 6 meses.`);

        const ticketIds = tickets.map(t => t.id);

        // 2. Buscar todas las imágenes asociadas a los mensajes de estos tickets
        const placeholders = ticketIds.map(() => '?').join(',');
        const [messages] = await db.pool.query(`
            SELECT image_url FROM ticket_messages 
            WHERE ticket_id IN (${placeholders}) 
              AND image_url IS NOT NULL 
              AND image_url != ''
        `, ticketIds);

        let deletedFiles = 0;
        console.log(`[TicketCleanup] ℹ️ Analizando ${messages.length} adjuntos para eliminación física de archivos.`);

        // 3. Eliminar los archivos de imágenes de forma segura
        for (const msg of messages) {
            const url = msg.image_url;
            if (!url) continue;

            const filename = path.basename(url);
            const fullPath = path.join(ticketImagesDir, filename);

            if (fs.existsSync(fullPath)) {
                if (dryRun) {
                    console.log(`[TicketCleanup] [DRY RUN] Se eliminaría archivo: ${filename}`);
                } else {
                    try {
                        fs.unlinkSync(fullPath);
                        deletedFiles++;
                    } catch (err) {
                        console.error(`[TicketCleanup] ⚠️ Error al eliminar archivo físico ${filename}:`, err.message);
                    }
                }
            }
        }

        // 4. Eliminar los registros de los tickets en la DB (borrado en cascada en la tabla ticket_messages)
        if (dryRun) {
            console.log(`[TicketCleanup] [DRY RUN] Se eliminarían ${tickets.length} registros de tickets.`);
        } else {
            const [deleteResult] = await db.pool.query(`
                DELETE FROM tickets WHERE id IN (${placeholders})
            `, ticketIds);
            console.log(`[TicketCleanup] 🗑️ Eliminados exitosamente ${deleteResult.affectedRows} tickets de la base de datos.`);
        }

        console.log(`[TicketCleanup] 📊 Resumen: ${tickets.length} tickets limpiados, ${deletedFiles} imágenes eliminadas físicamente.\n`);
        return { cleanedCount: tickets.length, deletedFiles };
    } catch (err) {
        console.error('[TicketCleanup] ❌ Error general durante la rutina de limpieza:', err);
        return { cleanedCount: 0, deletedFiles: 0, error: err.message };
    }
}

/**
 * Registra el cron de mantenimiento. Se ejecuta todos los días a las 00:10 AM.
 */
function startTicketCleanupCron() {
    cron.schedule('10 0 * * *', () => {
        runTicketCleanup();
    }, {
        timezone: 'America/Bogota',
    });
    console.log('[TicketCleanup] ✅ Cron de limpieza de soporte registrado. Se ejecuta diariamente a las 00:10 AM (Bogotá).');
}

module.exports = { startTicketCleanupCron, runTicketCleanup };

// Ejecución directa para pruebas o limpieza manual inicial
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');
    runTicketCleanup(dryRun).then(() => process.exit(0));
}
