/**
 * firebase_app.js — MODO LOCAL (Sin Firebase)
 * =============================================
 * Este archivo reemplaza la conexión con Firebase.
 * Todas las funciones operan 100% sobre localStorage.
 * El panel funciona de forma completamente offline y local.
 */

console.log("🗄️ [Local Mode] Sistema de almacenamiento local activo. Sin Firebase.");

// ─── HELPERS INTERNOS ──────────────────────────────────────────────────────────

function _localKey(collection, docId) {
    return docId ? `_local_${collection}__${docId}` : `_local_list_${collection}`;
}

// ─── IMAGEN: Devuelve el base64 tal cual (sin subir a ningún servidor) ──────────

window.uploadImageToCloud = async function(base64Image, fileName) {
    console.log("🖼️ [Local] Imagen guardada localmente:", fileName);
    return base64Image; // Devolver el base64 directamente como URL local
};

// ─── GUARDAR DOCUMENTO ────────────────────────────────────────────────────────

window.saveDataToCloud = async function(collectionName, documentId, data) {
    try {
        const key = _localKey(collectionName, documentId);
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`✅ [Local] Guardado: ${collectionName}/${documentId}`);
    } catch(error) {
        console.error("[Local] Error guardando dato:", error);
    }
};

// ─── CARGAR DOCUMENTO ─────────────────────────────────────────────────────────

window.loadDataFromCloud = async function(collectionName, documentId) {
    try {
        const key = _localKey(collectionName, documentId);
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch(error) {
        console.error("[Local] Error cargando dato:", error);
        return null;
    }
};

// ─── GUARDAR LISTA ────────────────────────────────────────────────────────────

window.saveListToCloud = async function(collectionName, items) {
    try {
        const key = _localKey(collectionName);
        localStorage.setItem(key, JSON.stringify(items));
        console.log(`✅ [Local] Lista guardada: ${collectionName} (${items.length} items)`);
    } catch(error) {
        console.error("[Local] Error guardando lista:", error);
    }
};

// ─── CARGAR LISTA ─────────────────────────────────────────────────────────────

window.loadListFromCloud = async function(collectionName) {
    try {
        const key = _localKey(collectionName);
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch(error) {
        console.error("[Local] Error cargando lista:", error);
        return null;
    }
};

// ─── LISTENERS EN TIEMPO REAL (Stubs — no hacen nada en modo local) ───────────
// Estas funciones son llamadas por syncAdminReady pero en modo local
// no hay "tiempo real" entre dispositivos. Se dejan como stubs seguros.

window.listenToCollection = function(collectionName, callback) {
    console.log(`👂 [Local] Listener de colección "${collectionName}" desactivado (modo local).`);
    // No hace nada — no hay sincronización entre dispositivos en modo local
};

window.listenToDoc = function(collectionName, documentId, callback) {
    console.log(`👂 [Local] Listener de documento "${collectionName}/${documentId}" desactivado (modo local).`);
    // No hace nada — no hay sincronización entre dispositivos en modo local
};

// ─── MANUAL FIREBASE UPDATE (Stub) ────────────────────────────────────────────

window.manualFirebaseUpdate = function(type, data) {
    // No-op en modo local
};

// ─── SEÑAL: Firebase "listo" de inmediato ────────────────────────────────────
// Esto hace que el botón de login no espere nada y arranque al instante.
window._admin_sync_done = false; // syncAdminReady lo pondrá en true al terminar
