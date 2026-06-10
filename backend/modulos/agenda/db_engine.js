/**
 * DB_ENGINE.JS - Professional Data Management Layer
 * Uses IndexedDB to bypass LocalStorage limitations and ensure real-time performance.
 */

const DB_NAME = 'AgendaStudioDB';
const DB_VERSION = 1;

window.AgendaDB = {
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('app_state')) {
                    db.createObjectStore('app_state');
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject(e);
        });
    },

    async set(key, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['app_state'], 'readwrite');
            const store = transaction.objectStore('app_state');
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    },

    async get(key, fallback = null) {
        try {
            const db = await this.init();
            return new Promise((resolve) => {
                const transaction = db.transaction(['app_state'], 'readonly');
                const store = transaction.objectStore('app_state');
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || fallback);
                request.onerror = () => resolve(fallback);
            });
        } catch(e) {
            return fallback;
        }
    }
};

console.log("💎 [DB Engine] Capa de datos profesional inicializada.");
