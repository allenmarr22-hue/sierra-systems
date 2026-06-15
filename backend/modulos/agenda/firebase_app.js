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

// Registries for active listeners in the current tab
const docListeners = {};
const collectionListeners = {};

// Helper to notify doc listeners in the current tab
function notifyDocListeners(collectionName, documentId, data) {
    const key = `${collectionName}/${documentId}`;
    if (docListeners[key]) {
        docListeners[key].forEach(cb => {
            try { cb(data); } catch(err) { console.error("Error in doc listener callback:", err); }
        });
    }
}

// Helper to notify collection listeners in the current tab
function notifyCollectionListeners(collectionName, items) {
    if (collectionListeners[collectionName]) {
        collectionListeners[collectionName].forEach(cb => {
            try { cb(items || []); } catch(err) { console.error("Error in collection listener callback:", err); }
        });
    }
}

// Listen to standard storage events to sync across different tabs/windows
window.addEventListener('storage', (event) => {
    if (!event.key) return;
    try {
        if (event.key.startsWith('_local_list_')) {
            const collectionName = event.key.substring('_local_list_'.length);
            const items = event.newValue ? JSON.parse(event.newValue) : [];
            notifyCollectionListeners(collectionName, items);
        } else if (event.key.startsWith('_local_')) {
            // It's a doc key: _local_collectionName__documentId
            const content = event.key.substring('_local_'.length);
            const doubleUnderscoreIdx = content.indexOf('__');
            if (doubleUnderscoreIdx !== -1) {
                const collectionName = content.substring(0, doubleUnderscoreIdx);
                const documentId = content.substring(doubleUnderscoreIdx + 2);
                const data = event.newValue ? JSON.parse(event.newValue) : null;
                notifyDocListeners(collectionName, documentId, data);
            }
        }
    } catch (e) {
        console.error("[Local Sync] Error processing storage event:", e);
    }
});

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
        
        // Notify any listeners in the current tab immediately
        notifyDocListeners(collectionName, documentId, data);
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
        
        // Notify any listeners in the current tab immediately
        notifyCollectionListeners(collectionName, items);
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

// ─── LISTENERS EN TIEMPO REAL ───────────────────────────────────────────

window.listenToCollection = function(collectionName, callback) {
    if (!collectionListeners[collectionName]) {
        collectionListeners[collectionName] = [];
    }
    collectionListeners[collectionName].push(callback);
    
    // Trigger callback immediately with cached data
    window.loadListFromCloud(collectionName).then(items => {
        setTimeout(() => {
            try { callback(items || []); } catch(err) { console.error("Error in collection listener init:", err); }
        }, 0);
    });
};

window.listenToDoc = function(collectionName, documentId, callback) {
    const key = `${collectionName}/${documentId}`;
    if (!docListeners[key]) {
        docListeners[key] = [];
    }
    docListeners[key].push(callback);
    
    // Trigger callback immediately with cached data
    window.loadDataFromCloud(collectionName, documentId).then(data => {
        setTimeout(() => {
            try { callback(data); } catch(err) { console.error("Error in doc listener init:", err); }
        }, 0);
    });
};

// ─── MANUAL FIREBASE UPDATE (Stub) ────────────────────────────────────────────

window.manualFirebaseUpdate = function(type, data) {
    // No-op en modo local
};

// ─── SEÑAL: Firebase "listo" de inmediato ────────────────────────────────────
window._admin_sync_done = false; // syncAdminReady lo pondrá en true al terminar
