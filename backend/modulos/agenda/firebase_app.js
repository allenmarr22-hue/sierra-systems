import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, onSnapshot, 
    addDoc, updateDoc, deleteDoc, query, where, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { 
    getStorage, ref, uploadString, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDh_zLr31HPQyF0vyIaG1MYh0cQBS4vMk",
    authDomain: "margaritasmitbeautystudio.firebaseapp.com",
    projectId: "margaritasmitbeautystudio",
    storageBucket: "margaritasmitbeautystudio.firebasestorage.app",
    messagingSenderId: "1005757799000",
    appId: "1:1005757799000:web:9d079b6bda890b6287882d"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Exponer a la ventana global
window.firebaseDB = db;
window.firebaseFirestore = { doc, collection, onSnapshot, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, writeBatch };

/**
 * FIREBASE STORAGE: Guarda la imagen en el cubo de almacenamiento (lo que ves en la consola).
 */
window.uploadImageToCloud = async function(base64Image, fileName) {
    try {
        console.log("☁️ Subiendo imagen a Firebase Storage...");
        // Referencia a la carpeta 'salon_media' en Storage
        const storageRef = ref(storage, `salon_media/${fileName}`);
        
        // Metadatos de seguridad: Secreto, tamaño máximo implícito por Firebase Rules
        const metadata = {
            customMetadata: {
                'secret': 'Margarita_X7k9Pm2Lv89QrZw1'
            }
        };

        // Subir el string Base64 con los metadatos de seguridad
        const uploadTask = await uploadString(storageRef, base64Image, 'data_url', metadata);
        
        // Obtener la URL pública para guardarla en el catálogo
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        console.log("✅ Imagen disponible en:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error subiendo imagen a Storage:", error);
        // Fallback: Si Storage falla, devolvemos el base64 original para que el local storage funcione
        return base64Image;
    }
};

/**
 * Guarda un documento individual.
 */
window.saveDataToCloud = async function(collectionName, documentId, data) {
    try {
        await setDoc(doc(db, collectionName, documentId), data);
        console.log(`✅ [Nube] Documento guardado: ${collectionName}/${documentId}`);
    } catch(error) {
        console.error("Error guardando datos:", error);
    }
};

/**
 * ROBUSTEZ: Guarda una lista completa (como servicios o especialistas) en una colección propia,
 * asegurando que cada item sea un documento individual para NUNCA chocar con el límite de 1MB.
 */
window.saveListToCloud = async function(collectionName, items) {
    try {
        console.log(`☁️ Sincronizando lista con la Nube (${collectionName})...`);
        const colRef = collection(db, collectionName);
        
        // 1. Limpiar colección actual en bloques de 500 (límite de Firestore)
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
            let deleteBatch = writeBatch(db);
            let count = 0;
            for (const docSnapshot of snapshot.docs) {
                deleteBatch.delete(docSnapshot.ref);
                count++;
                if (count === 500) {
                    await deleteBatch.commit();
                    deleteBatch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) await deleteBatch.commit();
        }

        // 2. Subir nuevos items en bloques de 500
        let saveBatch = writeBatch(db);
        let saveCount = 0;
        let index = 0;
        for (const item of items) {
            const itemWithOrder = { ...item, _order: index++ };
            const newDocRef = doc(colRef); 
            saveBatch.set(newDocRef, itemWithOrder);
            saveCount++;
            
            if (saveCount === 500) {
                await saveBatch.commit();
                saveBatch = writeBatch(db);
                saveCount = 0;
            }
        }
        if (saveCount > 0) await saveBatch.commit();
        
        console.log(`✅ [Nube] Lista ${collectionName} sincronizada con ${items.length} items.`);
    } catch (error) {
        console.error(`Error sincronizando lista ${collectionName}:`, error);
    }
};

window.loadDataFromCloud = async function(collectionName, documentId) {
    try {
        const docSnap = await getDoc(doc(db, collectionName, documentId));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error leyendo datos:", error);
        return null;
    }
};

/**
 * Carga una colección completa.
 */
window.loadListFromCloud = async function(collectionName) {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        const data = snapshot.docs.map(doc => doc.data());
        // Ordenar por el índice preservado
        return data.sort((a, b) => (a._order || 0) - (b._order || 0));
    } catch (error) {
        console.error(`Error cargando lista ${collectionName}:`, error);
        return [];
    }
};

/**
 * REAL-TIME: Suscribe a cambios en una colección completa.
 */
window.listenToCollection = function(collectionName, callback) {
    console.log(`📡 [Nube] Escuchando cambios en tiempo real: ${collectionName}`);
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        // Ordenar por el índice preservado
        const sorted = data.sort((a, b) => (a._order || 0) - (b._order || 0));
        callback(sorted);
    });
};

/**
 * REAL-TIME: Suscribe a cambios en un único documento.
 */
window.listenToDoc = function(collectionName, documentId, callback) {
    console.log(`📡 [Nube] Escuchando documento: ${collectionName}/${documentId}`);
    return onSnapshot(doc(db, collectionName, documentId), (docSnapshot) => {
        if (docSnapshot.exists()) {
            callback(docSnapshot.data());
        } else {
            callback(null);
        }
    });
};

console.log("🔥 Enlace Central a la Nube (Firestore Robust Mode) Conectado.");
