// ====== AISLAMIENTO MULTI-SEDE (TENANT ISOLATION MONKEY PATCH) ======
(function() {
    if (Storage.prototype.getItem.__isPatched) return;
    const urlParams = new URLSearchParams(window.location.search);
    const instanceId = urlParams.get('instanceId');
    if (instanceId) {
        const suffix = `_${instanceId}`;
        const prefixes = ['streetfeed_', 'margarita_', 'agenda_'];
        const shouldAiso = (key) => key && prefixes.some(p => key.startsWith(p));
        const originalGetItem = Storage.prototype.getItem;
        const originalSetItem = Storage.prototype.setItem;
        const originalRemoveItem = Storage.prototype.removeItem;
        Storage.prototype.getItem = function(key) {
            return shouldAiso(key) ? originalGetItem.call(this, key + suffix) : originalGetItem.call(this, key);
        };
        Storage.prototype.setItem = function(key, value) {
            return shouldAiso(key) ? originalSetItem.call(this, key + suffix, value) : originalSetItem.call(this, key, value);
        };
        Storage.prototype.removeItem = function(key) {
            return shouldAiso(key) ? originalRemoveItem.call(this, key + suffix) : originalRemoveItem.call(this, key);
        };
        Storage.prototype.getItem.__isPatched = true;
    }
})();

// ====== INICIALIZACIÓN DE CREDENCIALES DESDE EL PANEL DE CONTROL ======
(function() {
    try {
        const storedUser = localStorage.getItem('margarita_admin_user');
        const storedPass = localStorage.getItem('margarita_admin_pass');
        if (!storedUser || !storedPass) {
            const authObj = JSON.parse(localStorage.getItem('agenda_auth'));
            if (authObj && authObj.user && authObj.pass) {
                localStorage.setItem('margarita_admin_user', authObj.user);
                localStorage.setItem('margarita_admin_pass', authObj.pass);
            }
        }
    } catch(e) {
        console.error("Error inicializando credenciales desde agenda_auth:", e);
    }
})();

// Backend Firebase Config (Proyecto: margaritasmitbeautystudio)
window.normalizeText = function(s) {
    return s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
};
const normalize = window.normalizeText;
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
// SOPORTE DE HORA 12H (AM/PM)
window.formatTime12h = function(timeStr) {
    if (!timeStr || timeStr === 'Hora N/A') return "Hora N/A";
    try {
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // el 0 debe ser 12
        return `${hours}:${minutes} ${ampm}`;
    } catch(e) { return timeStr; }
};

window.normDate = function(d) {
    if (!d) return '';
    const p = d.split(/[-\/]/);
    if (p.length < 3) return d;
    // Formato YYYY-MM-DD
    if (p[0].length === 4) return `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`;
    // Formato DD/MM/YYYY
    return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
};

// SOPORTE DE DASHBOARD
// SOPORTE DE DASHBOARD

let editingIndex = null;
let base64Image = "";
let base64GalleryImage = "";

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const emailInput = document.getElementById('admin-email');
const passInput = document.getElementById('admin-password');

// Service Upload Elements
const serviceCategory = document.getElementById('service-category');
const serviceName = document.getElementById('service-name');
const servicePrice = document.getElementById('service-price');
const serviceDesc = document.getElementById('service-desc');
const serviceUpload = document.getElementById('service-upload');
const servicePreview = document.getElementById('service-preview');
const uploadServiceBtn = document.getElementById('upload-service-btn');

// Gallery Upload Elements
const galleryUpload = document.getElementById('gallery-upload');
const galleryPreview = document.getElementById('gallery-preview');
const uploadGalleryBtn = document.getElementById('upload-gallery-btn');

loginBtn.addEventListener('click', async () => {
    const enteredEmail = emailInput.value.trim();
    const enteredPass = passInput.value;

    // Si Firebase aún no ha sincronizado credenciales, esperar hasta 5 segundos
    if (!window._admin_sync_active && !window._admin_sync_done) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        let waited = 0;
        while (!window._admin_sync_done && waited < 50) {
            await new Promise(r => setTimeout(r, 100));
            waited++;
        }
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }

    const storedUser = localStorage.getItem('margarita_admin_user') || 'admin';
    const storedPass = localStorage.getItem('margarita_admin_pass') || '12345';

    if(enteredEmail === storedUser && enteredPass === storedPass) {
        localStorage.setItem('margarita_admin_session', 'true');
        toggleView(true);
    } else {
        showToast("Credenciales de acceso incorrectas.", "error");
    }
});

// Enter key support for Login
[emailInput, passInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });
});

logoutBtn.addEventListener('click', () => {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const question = gender === 'Femenino' ? '¿Segura que quieres cerrar la sesión de administración?' : '¿Seguro que quieres cerrar la sesión de administración?';
    showConfirm(question, () => {
        localStorage.removeItem('margarita_admin_session');
        toggleView(false);
        
        // Reset de seguridad de la libreta de gastos
        window._expensesUnlocked = false;
        const lockScreen = document.getElementById('expenses-lock-screen');
        const restrictedContent = document.getElementById('expenses-restricted-content');
        const passInput = document.getElementById('expense-unlock-pass');
        if (lockScreen) lockScreen.style.display = 'flex';
        if (restrictedContent) restrictedContent.style.display = 'none';
        if (passInput) passInput.value = '';
    });
});

// Enter key for services
[serviceName, servicePrice, serviceDesc].forEach(input => {
    if(input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') uploadServiceBtn.click();
        });
    }
});

// Photo Previews
function handlePreview(input, previewDiv, button) {
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewDiv.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                button.disabled = false;
            }
            reader.readAsDataURL(file);
        }
    });
}

// Gallery preview con validación de límite
galleryUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const currentGallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
    if (currentGallery.length >= 20) {
        showGalleryLimitModal();
        galleryUpload.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(ev) {
        galleryPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
        uploadGalleryBtn.disabled = false;
    };
    reader.readAsDataURL(file);
});


// Base64 File Logic for Services

serviceUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            base64Image = reader.result;
            servicePreview.innerHTML = `<img src="${base64Image}" style="max-width:100%; height:200px; object-fit:cover; margin-top:10px; border-radius:8px;">`;
            // Ensure button is ready
            updateUploadButtonState();
        };
        reader.readAsDataURL(file);
    }
});

function updateUploadButtonState() {
    const name = document.getElementById('service-name').value.trim();
    const price = document.getElementById('service-price').value.trim();
    const cat = serviceCategory.value;
    
    // Enable if we have basic info AND (a new image OR we are editing an existing one)
    if (name && price && cat && (base64Image || editingIndex !== null)) {
        uploadServiceBtn.disabled = false;
    } else {
        uploadServiceBtn.disabled = true;
    }
}

// Add listeners to re-check button state
[serviceName, servicePrice, serviceCategory].forEach(el => {
    if(el) el.addEventListener('input', updateUploadButtonState);
});

// Init Data
const defaultCategories = [
    { id: 'unas', name: 'Uñas & Manicura', subtitle: 'Arte, precisión y cuidado profundo para tus manos.', bg: 'pink' },
    { id: 'cabello', name: 'Cabello & Color', subtitle: 'Transforma tu cabello con resultados profesionales.', bg: 'white' },
    { id: 'cejas', name: 'Cejas & Pestañas', subtitle: 'Miradas magnéticas que resaltan tu belleza natural.', bg: 'pink' },
    { id: 'depil', name: 'Depilación', subtitle: 'Suavidad y cuidado para tu piel con técnicas profesionales.', bg: 'white' },
    { id: 'maqui', name: 'Maquillaje', subtitle: 'Técnicas avanzadas para eventos inolvidables.', bg: 'pink' }
];

if (!localStorage.getItem('margarita_categories')) {
    localStorage.setItem('margarita_categories', JSON.stringify(defaultCategories));
}

// Global state initialized from local storage first for instant UI response
let categories = JSON.parse(localStorage.getItem('margarita_categories'));
let services = JSON.parse(localStorage.getItem('margarita_services') || '[]');
window.dashboardCharts = { categories: null, topServices: null, monthlyRevenue: null, salesTrend: null };

function getCategoryName(idOrName) {
    if (!idOrName) return 'General';
    try {
        const idStr = String(idOrName).toLowerCase().trim();
        const cats = window.categories || categories || [];
        const found = cats.find(c => {
            if (!c) return false;
            const cId = c.id ? String(c.id).toLowerCase().trim() : '';
            const cName = c.name ? String(c.name).toLowerCase().trim() : '';
            return cId === idStr || cName === idStr;
        });
        return found ? found.name : idOrName;
    } catch (e) {
        console.error("Error in getCategoryName:", e);
        return String(idOrName);
    }
}
window.getCategoryName = getCategoryName;

// ----------------------------------------------------
// CLOUD SYNC MANAGER (Robust Completion)
// ----------------------------------------------------
let syncRetries = 0;
window.syncAdminReady = async function() {
    
    // Guarda de seguridad para evitar múltiples sincronizaciones paralelas
    if (window._admin_sync_active) return;
    window._admin_sync_active = true;
    console.log("☁️ Cargando estado actual desde la Nube...");
    try {
        // 1. Categories (Cloud-Priority Sync with Robust Deduplication)
        const rawCloudCats = await window.loadListFromCloud('categorias_v2');
        const catMap = new Map(); // Name -> Canonical Cat Object
        
        if (rawCloudCats && rawCloudCats.length > 0) {
            rawCloudCats.forEach(cat => {
                const nameKey = (cat.name || "").toLowerCase().trim();
                if (nameKey && !catMap.has(nameKey)) {
                    catMap.set(nameKey, cat);
                }
            });
            const uniqueCats = Array.from(catMap.values());
            localStorage.setItem('margarita_categories', JSON.stringify(uniqueCats));
            categories = uniqueCats;

            // Limpieza en la nube si hubo duplicados procesados
            if (uniqueCats.length !== rawCloudCats.length && window.saveListToCloud) {
                console.log("🧹 [Sincronización] Limpiando categorías duplicadas en la nube...");
                window.saveListToCloud('categorias_v2', uniqueCats);
            }
        } else if (JSON.parse(localStorage.getItem('margarita_categories') || '[]').length > 0 && window.saveListToCloud) {
            await window.saveListToCloud('categorias_v2', JSON.parse(localStorage.getItem('margarita_categories')));
        }
        
        // 2. Services (Cloud-Priority Sync with Harmonization)
        const rawCloudSvcs = await window.loadListFromCloud('servicios_v2');
        if (rawCloudSvcs && rawCloudSvcs.length > 0) {
            // Harmonize orphan services to canonical category IDs
            const harmonizedSvcs = rawCloudSvcs.map(svc => {
                // If the service's category ID is not in our unique list, find the canonical one by name
                const currentCat = rawCloudCats.find(c => c.id === svc.cat);
                if (currentCat) {
                    const canonicalCat = catMap.get(currentCat.name.toLowerCase().trim());
                    if (canonicalCat && canonicalCat.id !== svc.cat) {
                        return { ...svc, cat: canonicalCat.id };
                    }
                }
                return svc;
            });

            // Deduplicate services by title WITHIN category
            const seenSvcKeys = new Set();
            const uniqueSvcs = harmonizedSvcs.filter(svc => {
                const key = `${svc.cat}-${(svc.title || "").toLowerCase().trim()}`;
                if (seenSvcKeys.has(key)) return false;
                seenSvcKeys.add(key);
                return true;
            });

            localStorage.setItem('margarita_services', JSON.stringify(uniqueSvcs));
            services = uniqueSvcs;
            
            // If we changed anything (harmonized or deduplicated), reflect back to cloud
            if (uniqueSvcs.length !== rawCloudSvcs.length && window.saveListToCloud) {
                console.log("🧹 [Sincronización] Limpiando servicios duplicados en la nube...");
                window.saveListToCloud('servicios_v2', uniqueSvcs);
            }
        } else if (JSON.parse(localStorage.getItem('margarita_services') || '[]').length > 0 && window.saveListToCloud) {
            await window.saveListToCloud('servicios_v2', JSON.parse(localStorage.getItem('margarita_services')));
        }

        // 3. Specialists (Cloud-Priority Sync with Deduplication)
        const rawCloudSpecs = await window.loadListFromCloud('especialistas_v2');
        if (rawCloudSpecs && rawCloudSpecs.length > 0) {
            // Deduplicar por nombre (sin importar mayúsculas) y quitar corruptos
            const seenSpecNames = new Set();
            const uniqueSpecs = rawCloudSpecs.filter(s => {
                const nameKey = ((typeof s === 'string' ? s : s.name) || "").toLowerCase().trim();
                if (!nameKey || seenSpecNames.has(nameKey)) return false;
                seenSpecNames.add(nameKey);
                return true;
            });

            localStorage.setItem('margarita_specialists', JSON.stringify(uniqueSpecs));
            
            // Limpieza en la nube si hubo duplicados procesados
            if (uniqueSpecs.length !== rawCloudSpecs.length && window.saveListToCloud) {
                console.log("🧹 [Sincronización] Limpiando especialistas duplicados en la nube...");
                window.saveListToCloud('especialistas_v2', uniqueSpecs);
            }
        } else if (JSON.parse(localStorage.getItem('margarita_specialists') || '[]').length > 0 && window.saveListToCloud) {
            await window.saveListToCloud('especialistas_v2', JSON.parse(localStorage.getItem('margarita_specialists')));
        }

        // 4. Promotions
        const cloudPromos = await window.loadDataFromCloud('config_v2', 'promos');
        const localPromos = JSON.parse(localStorage.getItem('margarita_promos') || 'null');
        if (cloudPromos) {
            localStorage.setItem('margarita_promos', JSON.stringify(cloudPromos));
        } else if (localPromos && window.saveDataToCloud) {
            await window.saveDataToCloud('config_v2', 'promos', localPromos);
        }

        // 5. Gallery (Bidirectional Master Sync)
        const cloudGal = await window.loadListFromCloud('galeria_v2');
        const localGal = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
        if (cloudGal && cloudGal.length >= localGal.length && cloudGal.length > 0) {
            localStorage.setItem('margarita_gallery', JSON.stringify(cloudGal));
        } else if (localGal.length > 0 && window.saveListToCloud) {
            await window.saveListToCloud('galeria_v2', localGal);
        }

        // 6. Service Galleries (Models)
        const cloudSvcGals = await window.loadDataFromCloud('config_v2', 'service_galleries');
        const localSvcGals = JSON.parse(localStorage.getItem('margarita_service_galleries') || 'null');
        if (cloudSvcGals) {
            localStorage.setItem('margarita_service_galleries', JSON.stringify(cloudSvcGals));
        } else if (localSvcGals && window.saveDataToCloud) {
            await window.saveDataToCloud('config_v2', 'service_galleries', localSvcGals);
        }

        // 6.5 Grupos de Simultaneidad
        const cloudSimult = await window.loadDataFromCloud('config_v2', 'simult_groups');
        const localSimult = JSON.parse(localStorage.getItem('margarita_simult_groups') || 'null');
        if (cloudSimult) {
            localStorage.setItem('margarita_simult_groups', JSON.stringify(cloudSimult));
        } else if (localSimult && window.saveDataToCloud) {
            await window.saveDataToCloud('config_v2', 'simult_groups', localSimult);
        }

        // 7. Admin Meta (Sincronización COMPLETA: credenciales, identidad, tema, redes)
        const cloudMeta = await window.loadDataFromCloud('config_v2', 'admin_meta');
        if (cloudMeta) {
            // Credenciales de acceso
            if (cloudMeta.admin_user) localStorage.setItem('margarita_admin_user', cloudMeta.admin_user);
            if (cloudMeta.admin_pass) localStorage.setItem('margarita_admin_pass', cloudMeta.admin_pass);
            if (cloudMeta.admin_email) localStorage.setItem('margarita_admin_email', cloudMeta.admin_email);
            // Identidad del negocio y recursos multimedia
            if (cloudMeta.site_name) localStorage.setItem('margarita_site_name', cloudMeta.site_name);
            if (cloudMeta.admin_gender) localStorage.setItem('margarita_admin_gender', cloudMeta.admin_gender);
            if (cloudMeta.whatsapp_number) localStorage.setItem('margarita_whatsapp_number', cloudMeta.whatsapp_number);
            if (cloudMeta.site_address) localStorage.setItem('margarita_site_address', cloudMeta.site_address);
            if (cloudMeta.logo_url) localStorage.setItem('margarita_logo_url', cloudMeta.logo_url);
            if (cloudMeta.hero_url) localStorage.setItem('margarita_hero_url', cloudMeta.hero_url);
            if (cloudMeta.admin_bg) localStorage.setItem('margarita_admin_bg', cloudMeta.admin_bg);
            // Redes sociales
            if (cloudMeta.social_links) localStorage.setItem('margarita_social_links', JSON.stringify(cloudMeta.social_links));
            // Tema visual
            if (cloudMeta.theme) {
                localStorage.setItem('margarita_admin_theme', cloudMeta.theme);
                if (window.applyTheme) window.applyTheme(cloudMeta.theme, true);
            }
            console.log('✅ [Nube] Admin Meta cargado completamente:', Object.keys(cloudMeta).join(', '));
        } else {
            // Si no hay nada en la nube, subir lo local (primer dispositivo)
            if (window.syncAdminMetaToCloud) window.syncAdminMetaToCloud(true);
        }

        // 8. Citas Iniciales (Crucial para ver citas de teléfonos al recargar)
        const cloudApts = await window.loadListFromCloud('citas_v2');
        if (cloudApts && Array.isArray(cloudApts)) {
            // Deduplicar citas por su ID único para evitar tarjetas fantasmas
            const seenAptIds = new Set();
            const uniqueApts = cloudApts.filter(apt => {
                if (!apt.id || seenAptIds.has(apt.id)) return false;
                seenAptIds.add(apt.id);
                return true;
            });
            localStorage.setItem('margarita_appointments', JSON.stringify(uniqueApts));
        }

        // Render UI Final (VITAL PARA DISPOSITIVOS NUEVOS)
        renderAdminCategories();
        renderAdminServices();
        renderAdminGallery();
        if (window.renderAgenda) window.renderAgenda();
        if (window.renderHistory) window.renderHistory();
        if (window.renderVisualAgenda) window.renderVisualAgenda();
        if (window.renderSpecialists) window.renderSpecialists();

        // 9. Activar Listeners en Tiempo Real (Sincronización Total de Pi a Pa)
        if (window.listenToCollection) {
            // Listener de Especialistas
            window.listenToCollection('especialistas_v2', (data) => {
                if (!data) return;
                // Deduplicación local por nombre
                const seenSpecNames = new Set();
                const uniqueData = data.filter(s => {
                    const nameKey = ((typeof s === 'string' ? s : s.name) || "").toLowerCase().trim();
                    if (!nameKey || seenSpecNames.has(nameKey)) return false;
                    seenSpecNames.add(nameKey);
                    return true;
                });

                const localStr = localStorage.getItem('margarita_specialists') || '[]';
                if (JSON.stringify(uniqueData) !== localStr) {
                    console.log("👥 [Sync-Realtime] Especialistas actualizados localmente...");
                    localStorage.setItem('margarita_specialists', JSON.stringify(uniqueData));
                    if (window.renderSpecialists) window.renderSpecialists();
                    if (window.renderVisualAgenda) window.renderVisualAgenda();
                    if (window.populateSpecialistDropdowns) window.populateSpecialistDropdowns();
                }
            });

            // Listener de Servicios
            window.listenToCollection('servicios_v2', (data) => {
                if (!data) return;
                // Deduplicación local por Título dentro de Categoría
                const seenSvcKeys = new Set();
                const uniqueData = data.filter(svc => {
                    const key = `${svc.cat}-${(svc.title || "").toLowerCase().trim()}`;
                    if (seenSvcKeys.has(key)) return false;
                    seenSvcKeys.add(key);
                    return true;
                });

                const localStr = localStorage.getItem('margarita_services') || '[]';
                if (JSON.stringify(uniqueData) !== localStr) {
                    console.log("💇 [Sync-Realtime] Catálogo de servicios actualizado localmente...");
                    localStorage.setItem('margarita_services', JSON.stringify(uniqueData));
                    services = uniqueData;
                    if (window.renderAdminServices) window.renderAdminServices();
                }
            });

            // Listener de Categorías
            window.listenToCollection('categorias_v2', (data) => {
                if (!data) return;
                // Deduplicación local por Nombre
                const seenCatNames = new Set();
                const uniqueData = data.filter(cat => {
                    const key = (cat.name || "").toLowerCase().trim();
                    if (!key || seenCatNames.has(key)) return false;
                    seenCatNames.add(key);
                    return true;
                });

                const localStr = localStorage.getItem('margarita_categories') || '[]';
                if (JSON.stringify(uniqueData) !== localStr) {
                    console.log("📂 [Sync-Realtime] Categorías actualizadas localmente...");
                    localStorage.setItem('margarita_categories', JSON.stringify(uniqueData));
                    categories = uniqueData;
                    if (window.renderAdminCategories) window.renderAdminCategories();
                    if (window.renderAdminServices) window.renderAdminServices();
                }
            });

            // Listener de Galería
            window.listenToCollection('galeria_v2', (data) => {
                const localStr = localStorage.getItem('margarita_gallery') || '[]';
                if (data && JSON.stringify(data) !== localStr) {
                    console.log("📸 [Nube] Galería actualizada...");
                    localStorage.setItem('margarita_gallery', JSON.stringify(data));
                    if (window.renderAdminGallery) window.renderAdminGallery();
                }
            });

            // Listener de Citas
            window.listenToCollection('citas_v2', (data) => {
                if (!data) return;
                // Deduplicación local por ID
                const seenAptIds = new Set();
                const uniqueData = data.filter(apt => {
                    if (!apt.id || seenAptIds.has(apt.id)) return false;
                    seenAptIds.add(apt.id);
                    return true;
                });

                const localStr = localStorage.getItem('margarita_appointments') || '[]';
                if (JSON.stringify(uniqueData) !== localStr) {
                    console.log("🔔 [Sync-Realtime] ¡Agenda de citas actualizada localmente!");
                    localStorage.setItem('margarita_appointments', JSON.stringify(uniqueData));
                    
                    // ✅ SIEMPRE actualizamos los numeritos, sin importar si hay acción local
                    if (window.updateBadges) window.updateBadges();
                    
                    // Solo el render completo se bloquea para evitar parpadeo
                    if (!window._isUpdatingLocal) {
                        if (window.renderAgenda) window.renderAgenda();
                        if (window.renderHistory) window.renderHistory();
                        if (window.renderVisualAgenda) window.renderVisualAgenda();
                    }
                }
            });
        }

        // Listener para Promociones (Tiempo Real)
        if (window.listenToDoc) {
            window.listenToDoc('config_v2', 'promos', (data) => {
                if (data) {
                    const localPromos = localStorage.getItem('margarita_promos');
                    if (JSON.stringify(data) !== localPromos) {
                        console.log("🏷️ [Nube] Promociones actualizadas...");
                        localStorage.setItem('margarita_promos', JSON.stringify(data));
                        if (typeof loadPromoSettings === 'function') {
                            loadPromoSettings();
                        }
                    }
                }
            });
        }

        // Listener para Grupos de Simultaneidad
        if (window.listenToDoc) {
            window.listenToDoc('config_v2', 'simult_groups', (data) => {
                if (data) {
                    const current = localStorage.getItem('margarita_simult_groups');
                    if (JSON.stringify(data) !== current) {
                        console.log("🔄 [Nube] Simultaneity Groups actualizados...");
                        localStorage.setItem('margarita_simult_groups', JSON.stringify(data));
                        if (typeof renderAdminCategories === 'function') renderAdminCategories();
                        if (typeof renderAdminServices === 'function') renderAdminServices();
                        if (typeof renderAgenda === 'function' && !window._isUpdatingLocal) renderAgenda();
                    }
                }
            });
        }

        // Listener para Metadatos (Tema y Seguridad)
        if (window.listenToDoc) {
            window.listenToDoc('config_v2', 'admin_meta', (data) => {
                if (data && !window._isSavingSettings) {
                    let changedUI = false;
                    
                    if (data.theme && data.theme !== localStorage.getItem('margarita_admin_theme')) {
                        localStorage.setItem('margarita_admin_theme', data.theme);
                        if (window.applyTheme) window.applyTheme(data.theme, true);
                    }
                    
                    const fields = ['site_name', 'admin_gender', 'whatsapp_number', 'admin_user', 'admin_pass', 'admin_email', 'logo_url', 'hero_url', 'admin_bg'];
                    fields.forEach(f => {
                        const cloudVal = data[f] || '';
                        const localVal = localStorage.getItem(`margarita_${f}`) || '';
                        if (cloudVal !== localVal) {
                            localStorage.setItem(`margarita_${f}`, cloudVal);
                            changedUI = true;
                        }
                    });
                    
                    if (data.social_links) {
                        const localLinks = localStorage.getItem('margarita_social_links');
                        const newLinksStr = JSON.stringify(data.social_links);
                        if (localLinks !== newLinksStr) {
                            localStorage.setItem('margarita_social_links', newLinksStr);
                            changedUI = true;
                        }
                    }

                    if (changedUI) {
                        if (typeof loadCurrentSettings === 'function') loadCurrentSettings();
                        if (typeof applyDynamicBranding === 'function') applyDynamicBranding();
                    }
                }
            });
        }

        // Listener para Estado del Salón
        if (window.listenToDoc) {
            window.listenToDoc('config_v2', 'salon_status', (data) => {
                if (data) {
                    const localOpen = localStorage.getItem('margarita_salon_open');
                    const cloudOpen = data.open !== false ? 'true' : 'false';
                    if (localOpen !== cloudOpen) {
                        localStorage.setItem('margarita_salon_open', cloudOpen);
                        const salonToggle = document.getElementById('salon-status-toggle');
                        if (salonToggle) salonToggle.checked = (cloudOpen === 'true');
                        console.log("🔄 [Nube] Estado del Salón actualizado...");
                    }
                    if (data.closure_dates) {
                        localStorage.setItem('margarita_closure_dates', JSON.stringify(data.closure_dates));
                    } else {
                        localStorage.removeItem('margarita_closure_dates');
                    }
                }
            });
        }

        // Listener para Galerías de Servicios
        if (window.listenToDoc) {
            window.listenToDoc('config_v2', 'service_galleries', (data) => {
                if (data) {
                    const current = localStorage.getItem('margarita_service_galleries');
                    if (JSON.stringify(data) !== current) {
                        localStorage.setItem('margarita_service_galleries', JSON.stringify(data));
                        console.log("🔄 [Nube] Service Galleries actualizadas...");
                    }
                }
            });
        }

        console.log("✅ [Sincronización] El catálogo está actualizado y respaldado en la nube.");
        window._admin_sync_done = true; // Señal para el login: credenciales ya están sincronizadas
    } catch (e) { 
        console.error("Error en sync inicial:", e);
        window._admin_sync_done = true; // Marcar como done aunque falle, para no bloquear login
    }
};

// (El listener fue movido dentro de syncAdminReady para evitar problemas de sincronización de Firebase module)

// Llamar al inicio
renderAdminCategories();
renderAdminServices();
window.syncAdminReady(); // Iniciar ciclo de sincronización auto-reintentable

// CATEGORY MANAGEMENT
function renderAdminCategories() {
    try {
        const list = document.getElementById('categories-manage-list');
        const dropdown = document.getElementById('service-category');
        if(!list || !dropdown) return;

        // Update Dropdown (con normalización para evitar duplicados por espacios/capitalización)
        let dropdownHtml = '<option value="" disabled selected>Selecciona la Especialidad...</option>';
        const seenNames = new Set();
        categories.forEach(cat => {
            const cleanName = (cat.name || "").trim();
            const normName = cleanName.toLowerCase();
            if (cleanName && !seenNames.has(normName)) {
                seenNames.add(normName);
                dropdownHtml += `<option value="${cat.id}">${cleanName}</option>`;
            }
        });
        dropdown.innerHTML = dropdownHtml;

        // Update Management List
        let listHtml = '';
        const seenListNames = new Set();
        categories.forEach((cat, idx) => {
            const cleanName = (cat.name || "").trim();
            const normName = cleanName.toLowerCase();
            
            // Si ya vimos este nombre, lo saltamos para evitar duplicados en la vista
            if (seenListNames.has(normName)) return;
            seenListNames.add(normName);

            const isFirst = idx === 0;
            const isLast = idx === categories.length - 1;
            
            const isActive = cat.active !== false;
            
            listHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; border-bottom:1px solid #eee; background:#fff; ${!isActive ? 'opacity:0.6;' : ''}">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <button onclick="moveCategory('${cat.id}', -1)" style="visibility: ${isFirst ? 'hidden':'visible'}; background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:2px 6px; cursor:pointer;"><i class="fas fa-chevron-up" style="font-size:0.75rem;"></i></button>
                        <button onclick="moveCategory('${cat.id}', 1)" style="visibility: ${isLast ? 'hidden':'visible'}; background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:2px 6px; cursor:pointer;"><i class="fas fa-chevron-down" style="font-size:0.75rem;"></i></button>
                    </div>
                    <div>
                        <strong style="color:var(--color-dark-pink); font-size:1.1rem;">${cleanName}</strong><br>
                        <small style="color:#888;">${cat.subtitle || 'Sin subtítulo'}</small>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <label class="switch-premium" style="transform: scale(0.8); margin-right:5px;" title="${isActive ? 'Categoría Activa (Visible)' : 'Categoría Inactiva (Oculta)'}">
                        <input type="checkbox" onchange="window.toggleStatus('category', '${cat.id}', this.checked)" ${isActive ? 'checked' : ''}>
                        <span class="slider-premium round"></span>
                    </label>
                    <button onclick="editCategory('${cat.id}')" style="background:var(--color-bg); border:none; color:var(--color-dark-pink); cursor:pointer; padding:8px; border-radius:6px;" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteCategory('${cat.id}')" style="background:var(--color-bg); border:none; color:#d9534f; cursor:pointer; padding:8px; border-radius:6px;" title="Eliminar este bloque"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
        });
        list.innerHTML = listHtml;
    } catch (error) {
        console.error("Error rendering categories:", error);
    }
}

window.renderHistory = function() {
    try {
        const container = document.getElementById('history-list-container');
        const statsContainer = document.getElementById('history-stats-summary');
        const search = document.getElementById('history-search').value.toLowerCase();
        const statusFilter = document.getElementById('history-status-filter').value;
        if (!container) return;

        let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
        
        const parsePrice = (priceStr) => {
            if (!priceStr || priceStr === 'Gratis') return 0;
            return parseInt(priceStr.toString().replace(/\D/g, '')) || 0;
        };

        const fmtCOP = (num) => {
            if (typeof num === 'string' && num.includes('$')) return num;
            return `$${num.toLocaleString('es-CO').replace(/,/g, '.')} COP`;
        };

        const groupCounts = agenda.reduce((acc, a) => {
            if (a.groupId) acc[a.groupId] = (acc[a.groupId] || 0) + 1;
            return acc;
        }, {});

        const statsDateInput = document.getElementById('history-stats-date');
        const monthFilterInput = document.getElementById('history-month-filter');
        
        if (statsDateInput && !statsDateInput.value && !window._historyDateInitDone && (!monthFilterInput || monthFilterInput.value === '')) {
            statsDateInput.value = new Date().toLocaleDateString('sv-SE');
            window._historyDateInitDone = true;
        }

        const selectedDateStr = statsDateInput ? statsDateInput.value : '';
        const hasDateFilter = selectedDateStr !== '';
        const selectedMonthFromDropdown = monthFilterInput ? monthFilterInput.value : '';
        const hasMonthFilter = selectedMonthFromDropdown !== '';

        let statsMonth, statsYear, selectedDateObj;
        if (hasDateFilter) {
            selectedDateObj = new Date(selectedDateStr + "T00:00:00");
            statsMonth = selectedDateObj.getMonth();
            statsYear = selectedDateObj.getFullYear();
        } else if (hasMonthFilter) {
            statsMonth = parseInt(selectedMonthFromDropdown);
            statsYear = new Date().getFullYear();
            selectedDateObj = new Date(statsYear, statsMonth, 1);
        } else {
            selectedDateObj = new Date();
            statsMonth = selectedDateObj.getMonth();
            statsYear = selectedDateObj.getFullYear();
        }

        const completed = agenda.filter(a => a.status === 'accepted');
        const dayStats = { count: 0, total: 0, studio: 0 };
        const monthStats = { count: 0, total: 0, studio: 0 };

        const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
        const specCommMap = {};
        specialists.forEach(s => {
            const pct = parseInt(s.profitPercent);
            specCommMap[s.name] = isNaN(pct) ? 50 : pct;
        });

        completed.forEach(a => {
            const parsedFacial = parsePrice(a.price);
            const val = (a.splitPrice != null && parsePrice(a.splitPrice) !== parsedFacial) ? parsePrice(a.splitPrice) : parsedFacial;
            const aptDate = new Date(`${a.date}T00:00:00`);
            const profPct = specCommMap[a.specialist] || 50;
            const studioPart = val * ((100 - profPct) / 100);

            if (hasDateFilter && a.date === selectedDateStr) {
                dayStats.count++;
                dayStats.total += val;
                dayStats.studio += studioPart;
            }
            if (!isNaN(aptDate) && aptDate.getMonth() === statsMonth && aptDate.getFullYear() === statsYear) {
                monthStats.count++;
                monthStats.total += val;
                monthStats.studio += studioPart;
            }
        });

        if (statsContainer) {
            const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const monthLabel = monthNames[statsMonth] + ' ' + statsYear;
            const showOnlyMonth = !hasDateFilter && hasMonthFilter;
            const mainData = showOnlyMonth ? monthStats : dayStats;
            const mainLabel = showOnlyMonth ? 'Resumen Mes' : 'Resumen Día';
            const subLabel = showOnlyMonth ? monthLabel : (selectedDateObj ? selectedDateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }) : '');

            statsContainer.innerHTML = `
            <div class="glass-module" style="display: flex; align-items: center; justify-content: space-between; padding: 15px 25px; gap: 25px; flex-wrap: wrap; border-top: 3px solid var(--gold-primary); margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <div style="flex: 2; min-width: 300px; display: flex; align-items: center; gap: 20px;">
                    <div style="border-right: 1px solid var(--border-color); padding-right: 20px;">
                        <small style="color: var(--color-text-muted); text-transform: uppercase; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px;">${mainLabel}</small>
                        <div style="font-size: 0.9rem; font-weight: 700; color: var(--color-dark-pink); text-transform: capitalize;">${subLabel}</div>
                    </div>
                    <div style="display: flex; gap: 30px; align-items: center; flex: 1;">
                        <div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text);">${fmt(mainData.total)}</div>
                            <div style="font-size: 0.6rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Tot. Bruto</div>
                        </div>
                        <div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: #e74c3c;">${fmt(mainData.total - mainData.studio)}</div>
                            <div style="font-size: 0.6rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Profesionales</div>
                        </div>
                        <div style="background: rgba(46, 204, 113, 0.08); padding: 8px 15px; border-radius: 12px; border: 1px solid rgba(46, 204, 113, 0.2);">
                            <div style="font-size: 1.2rem; font-weight: 900; color: #27ae60;">${fmt(mainData.studio)}</div>
                            <div style="font-size: 0.6rem; color: #27ae60; text-transform: uppercase; font-weight: 800;">Ganancia Mía</div>
                        </div>
                    </div>
                </div>
                ${!showOnlyMonth ? `
                <div style="flex: 1; min-width: 180px; padding-left: 25px; border-left: 1px solid var(--border-color); display: flex; align-items: center; justify-content: flex-end;">
                    <div style="text-align: right;">
                        <small style="color: var(--color-text-muted); text-transform: uppercase; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px;">${monthLabel}</small>
                        <div style="margin-top: 5px;">
                            <div style="font-size: 1.3rem; font-weight: 900; color: var(--color-text);">${fmt(monthStats.total)}</div>
                            <div style="font-size: 0.6rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 800; letter-spacing:0.5px;">Acumulado Mes</div>
                        </div>
                    </div>
                </div>` : ''}
            </div>`;
        }

        let historyFiltered = agenda.map((a, i) => ({...a, originalIndex: i}))
                                 .filter(a => a.status === 'accepted' || a.status === 'cancelled');

        if (statusFilter !== 'all') historyFiltered = historyFiltered.filter(a => a.status === statusFilter);
        if (search) historyFiltered = historyFiltered.filter(a => (a.name && a.name.toLowerCase().includes(search)) || (a.phone && a.phone.toString().includes(search)));
        
        if (hasDateFilter) {
            historyFiltered = historyFiltered.filter(a => a.date === selectedDateStr);
        } else if (hasMonthFilter) {
            historyFiltered = historyFiltered.filter(a => {
                const d = new Date(`${a.date}T00:00:00`);
                return !isNaN(d) && d.getMonth() === statsMonth && d.getFullYear() === statsYear;
            });
        }

        if (historyFiltered.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:40px; color:#999;">No se encontraron registros en el historial.</p>`;
            return;
        }

        let html = '';
        historyFiltered.forEach(apt => {
            const dateObj = new Date(`${apt.date}T${apt.time || '00:00'}`);
            const dateStr = isNaN(dateObj) ? 'Fecha' : dateObj.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
            const color = apt.status === 'accepted' ? '#2ecc71' : '#e74c3c';
            const label = apt.status === 'accepted' ? 'REALIZADA' : 'CANCELADA';

            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee; background: linear-gradient(to right, #ffffff, #fafafa); margin-bottom:10px; border-radius:10px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="background:${color}15; color:${color}; padding:10px 12px; border-radius:8px; font-weight:bold; width:85px; flex-shrink:0; text-align:left; white-space:nowrap; box-sizing:border-box;">
                        ${dateStr}
                    </div>
                    <div>
                        <h4 style="margin:0; color:#1a1a1a;">
                            ${apt.name || 'Cliente'} 
                            ${(() => {
                                const pBase = parsePrice(apt.price);
                                const pCurrent = parsePrice(apt.splitPrice || apt.price);
                                const isPromo = apt.splitPrice && pCurrent < pBase;
                                const isTrulyGrouped = (apt.groupId && groupCounts[apt.groupId] >= 2) || false;
                                let labelsArr = '';
                                
                                // Determine promo type
                                let isActualCombo = apt.promoType === 'combo';
                                let isActualDiscount = apt.promoType === 'discount' || (!apt.promoType && isPromo);

                                if (isActualCombo) {
                                    labelsArr += `<span style="font-size:0.55rem; background:var(--color-dark-pink); color:white; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:5px; font-weight:800; letter-spacing:0.5px;">COMBO</span>`;
                                } else {
                                    if (isTrulyGrouped) {
                                        labelsArr += '<span style="font-size:0.55rem; background:#7f8c8d; color:white; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:5px; font-weight:800; letter-spacing:0.5px;">PAQUETE</span>';
                                    }
                                    if (isActualDiscount) {
                                        const dPct = Math.round((1 - (pCurrent / pBase)) * 100);
                                        labelsArr += `<span style="font-size:0.55rem; background:var(--color-dark-pink); color:white; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:5px; font-weight:800; letter-spacing:0.5px;">-${dPct}% DESC</span>`;
                                    }
                                }
                                return labelsArr;
                            })()}
                        </h4>
                        <p style="margin:0; font-size:0.85rem; color:#444;">${apt.service} | <strong style="color:#000;">${apt.specialist}</strong> | <span style="color:#888;">${window.formatTime12h(apt.time)}</span></p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:20px; margin-left:auto; width:auto; border-right: ${window.isHistoryDeleteMode ? '50px solid transparent' : 'none'}; position:relative;">
                    <div style="width: 95px; text-align: center;">
                        <span style="border:1px solid ${color}; color:${color}; padding:4px 8px; border-radius:20px; font-size:0.75rem; font-weight:700;">${label}</span>
                    </div>
                    <div style="width: 85px; text-align: center;">
                        <button onclick="showHistoryDetails(${apt.originalIndex})" style="background:none; border:none; color:var(--color-dark-pink); text-decoration:underline; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; justify-content:center; gap:5px; font-weight:600;"><i class="fas fa-eye"></i> Detalles</button>
                    </div>
                    <div style="width: 140px; text-align: left;">
                        <span style="font-weight:bold; color:var(--gold-primary); font-size:1.05rem; white-space:nowrap;">${fmtCOP(parsePrice(apt.splitPrice || apt.price))}</span>
                    </div>
                    ${window.isHistoryDeleteMode ? `
                    <button onclick="deleteHistoryRecord(${apt.originalIndex})" style="position:absolute; right:-50px; color:#e74c3c; background:#fff0f0; border:1px solid #ffcccc; width:35px; height:35px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(231,76,60,0.2); transition:0.3s;" title="Eliminar registro">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>`;
        });
        // ── LAZY LOADING HISTORIAL ──
        // Inyectar todo el HTML y ocultar registros más allá de la primera página.
        container.innerHTML = html;

        const _HIST_PAGE = 15;
        const histItems = Array.from(container.children); // Todos los rows del historial
        const histTotal = histItems.length;

        if (histTotal > _HIST_PAGE) {
            // Ocultar los que pasan de la primera página
            for (let i = _HIST_PAGE; i < histTotal; i++) {
                histItems[i].style.display = 'none';
            }

            let histNextVisible = _HIST_PAGE;

            // Limpiar observer previo del historial si existe
            if (window._histLazyObserver) { window._histLazyObserver.disconnect(); window._histLazyObserver = null; }

            const revealHistNext = () => {
                const end = Math.min(histNextVisible + _HIST_PAGE, histTotal);
                for (let i = histNextVisible; i < end; i++) {
                    // Restaurar display:flex explicitamente (display='' borra el flex del inline style)
                    histItems[i].style.display = 'flex';
                }
                histNextVisible = end;

                const oldSentinel = document.getElementById('hist-lazy-sentinel');
                if (oldSentinel) oldSentinel.remove();

                if (histNextVisible < histTotal) {
                    const sentinel = document.createElement('div');
                    sentinel.id = 'hist-lazy-sentinel';
                    sentinel.style.cssText = 'text-align:center;padding:18px;color:#bbb;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;';
                    sentinel.innerHTML = `<i class="fas fa-spinner fa-spin" style="color:var(--color-dark-pink);"></i> Cargando más registros... (${histNextVisible}/${histTotal})`;
                    container.appendChild(sentinel);
                    window._histLazyObserver = new IntersectionObserver((e) => {
                        if (e[0].isIntersecting) { window._histLazyObserver.disconnect(); revealHistNext(); }
                    }, { rootMargin: '150px' });
                    window._histLazyObserver.observe(sentinel);
                }
            };

            // Primer sentinel
            const firstSentinel = document.createElement('div');
            firstSentinel.id = 'hist-lazy-sentinel';
            firstSentinel.style.cssText = 'text-align:center;padding:18px;color:#bbb;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;';
            firstSentinel.innerHTML = `<i class="fas fa-spinner fa-spin" style="color:var(--color-dark-pink);"></i> Cargando más registros... (${_HIST_PAGE}/${histTotal})`;
            container.appendChild(firstSentinel);
            window._histLazyObserver = new IntersectionObserver((e) => {
                if (e[0].isIntersecting) { window._histLazyObserver.disconnect(); revealHistNext(); }
            }, { rootMargin: '150px' });
            window._histLazyObserver.observe(firstSentinel);

            console.log(`📋 [Historial Lazy] ${_HIST_PAGE}/${histTotal} registros visibles.`);
        }
    } catch (e) {
        console.error("Error in renderHistory:", e);
    }
}

window.showHistoryDetails = function(index) {
    const agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const apt = agenda[index];
    if (!apt) return;

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    const fmtTime = window.formatTime12h ? window.formatTime12h(apt.time) : (apt.time || 'N/A');
    const color = apt.status === 'accepted' ? '#2ecc71' : '#e74c3c';
    const statusLabel = apt.status === 'accepted' ? 'Realizada' : 'Cancelada';
    
    overlay.innerHTML = `
        <div class="custom-modal" style="text-align:left; max-width:500px; padding:30px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
                <h3 style="margin:0; color:var(--color-dark-pink); font-size:1.4rem;"><i class="fas fa-info-circle"></i> Detalles de Cita</h3>
                <span style="background:${color}15; color:${color}; padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:800; text-transform:uppercase;">${statusLabel}</span>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                <div>
                    <small style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.65rem; font-weight:700;">Cliente</small>
                    <div style="font-weight:700; color:var(--color-text); font-size:1rem;">${apt.name || 'N/A'}</div>
                </div>
                <div>
                    <small style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.65rem; font-weight:700;">Teléfono</small>
                    <div style="font-weight:700; color:var(--color-text); font-size:1rem;">
                        <a href="https://wa.me/${apt.phone ? apt.phone.toString().replace(/\D/g,'') : ''}" target="_blank" style="color:inherit; text-decoration:none;">
                            ${apt.phone || 'N/A'} <i class="fab fa-whatsapp" style="color:#2ecc71; margin-left:3px;"></i>
                        </a>
                    </div>
                </div>
                <div>
                    <small style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.65rem; font-weight:700;">Fecha y Hora</small>
                    <div style="font-weight:700; color:var(--color-text);">${apt.date} | ${fmtTime}</div>
                </div>
                <div>
                    <small style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.65rem; font-weight:700;">Profesional</small>
                    <div style="font-weight:700; color:var(--color-text);">${apt.specialist || 'No asignado'}</div>
                </div>
            </div>
            
            <div style="background:var(--dashed-bg); padding:15px; border-radius:12px; margin-bottom:25px; border:1px solid var(--border-color);">
                <small style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.65rem; font-weight:700;">Servicio</small>
                <div style="display:flex; align-items:center; gap:12px; margin-top:5px;">
                    ${apt.img ? `<img src="${apt.img}" style="width:45px; height:45px; border-radius:8px; object-fit:cover;">` : ''}
                    <div>
                        <div style="font-weight:700; color:var(--color-dark-pink);">${apt.service || 'N/A'}</div>
                        <div style="font-size:0.85rem; color:var(--color-text-muted);">Categoría: ${apt.category || 'N/A'}</div>
                    </div>
                </div>
                <div style="margin-top:10px; border-top:1px dashed var(--border-color); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.9rem; color:var(--color-text-muted);">Precio Final:</span>
                    <strong style="color:var(--gold-primary); font-size:1.1rem;">$${(parseInt(String(apt.splitPrice || apt.price || 0).replace(/\D/g, '')) || 0).toLocaleString('es-CO')} COP</strong>
                </div>
                ${apt.promoType ? `<div style="font-size:0.75rem; text-align:right; color:var(--color-accent); font-weight:600; margin-top:3px;">Afectado por promoción: ${apt.promoType.toUpperCase()}</div>` : ''}
            </div>
            
            <button class="btn-close-details btn-primary" style="width:100%; padding:12px; border-radius:12px;">Cerrar Detalles</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    
    overlay.querySelector('.btn-close-details').onclick = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    });
};

window.editCategory = function(id) {
    const cat = categories.find(c => c.id === id);
    if(!cat) return;
    
    document.getElementById('new-cat-name').value = cat.name;
    document.getElementById('new-cat-subtitle').value = cat.subtitle || "";
    editingCatId = id;
    addCatBtn.innerText = "Guardar Cambios";
    document.getElementById('new-cat-name').focus();
    
    // Asegurar que el modal esté abierto (no Toggle si ya lo está)
    const modal = document.getElementById('newCategoryModal');
    if(modal && modal.style.display !== 'flex') {
        window.toggleNewCategoryForm();
    }
}

window.moveCategory = function(id, direction) {
    const fromIndex = categories.findIndex(c => c.id === id);
    const toIndex = fromIndex + direction;
    
    if (toIndex < 0 || toIndex >= categories.length) return;
    
    // Intercambiar
    const [movedItem] = categories.splice(fromIndex, 1);
    categories.splice(toIndex, 0, movedItem);
    
    // Guardar cambios
    localStorage.setItem('margarita_categories', JSON.stringify(categories));
    if (window.saveListToCloud) {
        window.saveListToCloud('categorias_v2', categories);
    }
    
    renderAdminCategories();
    renderAdminServices(); // Por si el orden afecta el catálogo
    showToast("Orden actualizado correctamente.");
};

window.deleteCategory = function(id) {
    const catToDelete = categories.find(c => c.id === id);
    const catName = catToDelete ? catToDelete.name : id;
    
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    
    showConfirm(`${areYouSure} que quieres eliminar la categoría "${catName}"? \n\n¡CUIDADO! Esto borrará todos los servicios que pertenecen a esta categoría también.`, () => {
        // Encontrar TODOS los IDs que tengan este mismo nombre (por si hay duplicados ocultos)
        const targetIds = categories.filter(c => c.name.toLowerCase().trim() === catName.toLowerCase().trim()).map(c => c.id);
        if (targetIds.length === 0) targetIds.push(id); // Fallback

        categories = categories.filter(c => !targetIds.includes(c.id));
        services = services.filter(s => !targetIds.includes(s.cat));
        
        localStorage.setItem('margarita_categories', JSON.stringify(categories));
        localStorage.setItem('margarita_services', JSON.stringify(services));
        
        // Sync to cloud (Robust)
        if (window.saveListToCloud) {
            window.saveListToCloud('categorias_v2', categories);
            window.saveListToCloud('servicios_v2', services);
        }

        renderAdminCategories();
        renderAdminServices();
        showToast("Categoría eliminada con éxito.");
    });
}

const addCatBtn = document.getElementById('add-category-btn');
if(addCatBtn) {
    addCatBtn.addEventListener('click', () => {
        const name = document.getElementById('new-cat-name').value.trim();
        const subtitle = document.getElementById('new-cat-subtitle').value.trim();
        if(!name) { showToast("¡Ponle un nombre a la categoría!", "error"); return; }
        
        if (editingCatId) {
            // Update existing
            const index = categories.findIndex(c => c.id === editingCatId);
            if (index !== -1) {
                categories[index].name = name;
                categories[index].subtitle = subtitle;
                showToast("¡Categoría actualizada correctamente!");
            }
            editingCatId = null;
            addCatBtn.innerText = "Crear Nueva Categoría";
        } else {
            // Create new
            const exists = categories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                showToast(`Ya existe una categoría con el nombre "${name}".`, "error");
                return;
            }
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 10) + '-' + Date.now().toString().slice(-4);
            const newCat = {
                id: id,
                name: name,
                subtitle: subtitle || "Servicios profesionales",
                bg: categories.length % 2 === 0 ? 'pink' : 'white'
            };
            categories.push(newCat);
            showToast(`¡Categoría "${name}" creada con éxito!`);
        }
        
        localStorage.setItem('margarita_categories', JSON.stringify(categories));
        document.getElementById('new-cat-name').value = '';
        document.getElementById('new-cat-subtitle').value = '';
        
        // Sincronizar con la Nube (Firestore Robust)
        if (window.saveListToCloud) {
            window.saveListToCloud('categorias_v2', categories);
        }

        // Señal de sincronización para la web pública local
        localStorage.setItem('margarita_salon_trigger', Date.now());

        // Cerrar modal
        window.toggleNewCategoryForm();
        renderAdminCategories();
        renderAdminServices(); // Actualizar catálogo por si cambiaron nombres
    });
}

// Enter key for categories
[document.getElementById('new-cat-name'), document.getElementById('new-cat-subtitle')].forEach(input => {
    if(input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCatBtn.click();
        });
    }
});

// Tab Navigation Logic
window.showTab = function(tabId, element) {
    // Resetear scroll global al inicio para evitar que la cabecera quede oculta al bloquear el scroll
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // Show target tab
    document.getElementById(tabId).classList.add('active');
    
    // Control de Scroll Global Inteligente
    if (tabId === 'agenda-tab' || tabId === 'specialists-tab') {
        document.body.classList.add('no-global-scroll');
    } else {
        document.body.classList.remove('no-global-scroll');
    }

    // Update active nav state
    if (element) {
        document.querySelectorAll('.sidebar-nav nav a').forEach(link => {
            link.classList.remove('active');
        });
        element.classList.add('active');
    }

    // Tab specific inits
    if (tabId === 'promo-tab') {
        renderPromoCategories();
        loadPromoSettings();
    }

    if (tabId === 'specialists-tab') {
        renderSpecialists();
    }

    if (tabId === 'history-tab') {
        renderHistory();
    }

    if (tabId === 'gallery-tab') {
        renderAdminGallery();
    }

    if (tabId === 'agenda-tab') {
        renderAgenda();
    }

    if (tabId === 'expenses-tab') {
        window.checkExpensesLockState();
    }

    if (tabId === 'dashboard-tab') {
        renderDashboardStats('today');
    }
};

// Helper: Comprime una imagen base64 usando canvas
function compressImage(base64Str, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = base64Str;
    });
}

// SERVICE MANAGEMENT
uploadServiceBtn.addEventListener('click', async () => {
    if(!serviceCategory.value || !serviceName.value || !servicePrice.value || !base64Image) {
        showToast("Por favor completa Especialidad, Nombre, Precio y Foto.", "error");
        return;
    }
    
    // Add loading state
    uploadServiceBtn.disabled = true;
    uploadServiceBtn.innerText = "Subiendo a la nube... ☁️";

    try {
        let finalImageUrl = base64Image;

        // If it's a new base64 upload, compress then push to Firebase Storage
        if (base64Image.startsWith('data:image')) {
            const compressed = await compressImage(base64Image, 800, 0.75);
            const fileName = `servicio_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
            if (window.uploadImageToCloud) {
                finalImageUrl = await window.uploadImageToCloud(compressed, fileName);
            } else {
                // Fallback: store compressed base64 directly in Firestore
                finalImageUrl = compressed;
            }
        }

        // Format price if it wasn't formatted yet
        const priceFormatted = formatToCOP(servicePrice.value);
        
        const catDisplay = serviceCategory.options[serviceCategory.selectedIndex].text.split('&')[0].trim().toUpperCase();
        
        const newService = {
            cat: serviceCategory.value,
            categoryDisplay: catDisplay,
            title: serviceName.value,
            price: priceFormatted,
            desc: serviceDesc.value,
            img: finalImageUrl,
            duration: document.getElementById('service-duration').value || "60"
        };
        
        if (editingIndex !== null) {
            services[editingIndex] = newService;
            showToast(`¡Cambios guardados en la Nube!`);
            editingIndex = null;
        } else {
            services.push(newService);
            showToast(`¡Se ha publicado "${serviceName.value}" exitosamente!`);
        }
        
        // Local Save (Fallback)
        localStorage.setItem('margarita_services', JSON.stringify(services));
        localStorage.setItem('margarita_salon_trigger', Date.now());

        // Cloud Save (Firestore Robust - BYPASS STORAGE)
        if (window.saveListToCloud) {
            await window.saveListToCloud('servicios_v2', services);
        }

        // Reset fields
        serviceCategory.value = "";
        serviceName.value = "";
        servicePrice.value = "";
        serviceDesc.value = "";
        document.getElementById('service-duration').value = "60";
        base64Image = null;
        servicePreview.innerHTML = "";
        serviceUpload.value = "";
        
        // Cerrar modal tras guardar
        window.toggleNewServiceForm();
        renderAdminServices();

    } catch(err) {
        showToast("Hubo un error al guardar el servicio.", "error");
        console.error(err);
    } finally {
        uploadServiceBtn.innerText = "Publicar Servicio";
        uploadServiceBtn.disabled = true;
    }
});



function renderAdminServices() {
    try {
        const listContainer = document.getElementById('services-list-container');
        if (!listContainer) return;

        services = JSON.parse(localStorage.getItem('margarita_services') || '[]');
        const customSimult = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');
        
        if(services.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#A9A9A9;">No hay servicios publicados.</p>';
            return;
        }

        // Grouping dynamically by the current categories list
        let html = '';
        const seenCatNames = new Set();
        categories.forEach(cat => {
            const cleanName = (cat.name || "").trim();
            const normName = cleanName.toLowerCase();
            
            // Si ya procesamos esta categoría, saltarla
            if (seenCatNames.has(normName)) return;
            seenCatNames.add(normName);

            const catItems = services.map((s, idx) => ({...s, globalIndex: idx})).filter(s => s.cat === (cat.id || cleanName.toLowerCase()));
            const catId = `cat-${cat.id || normName.replace(/\s+/g, '-')}`;
            const groupVal = customSimult[cat.id] || "";
            const isCatExpanded = window._expandedCats && window._expandedCats.has(catId);
            const isActive = cat.active !== false;
            
            html += `
            <div class="category-group">
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(var(--accent-rgb), 0.05); border-bottom:1px solid rgba(var(--accent-rgb), 0.15);">
                    <h3 class="accordion-header ${isCatExpanded ? 'expanded' : ''}" onclick="toggleCategory('${catId}')" id="${catId}-header" style="flex:1; border-bottom:none; background:transparent;">
                        <span><i class="fas fa-folder-open" style="margin-right:10px; opacity:0.7;"></i> ${cleanName}</span>
                    </h3>
                    <div style="display:flex; align-items:center; gap:12px; padding-right:15px;" onclick="event.stopPropagation();">
                        <label class="switch-premium" style="transform: scale(0.7);" title="${isActive ? 'Categoría Visible' : 'Categoría Oculta'}">
                            <input type="checkbox" onchange="window.toggleStatus('category', '${cat.id}', this.checked)" ${isActive ? 'checked' : ''}>
                            <span class="slider-premium round"></span>
                        </label>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <span style="font-size:0.6rem; color:#888; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">SIMULTANEIDAD:</span>
                            <input type="text" maxlength="1" oninput="saveSimultGroupInline('${cat.id}', this.value)" value="${groupVal}" placeholder="-" style="width:32px; height:32px; border-radius:8px; border:1px solid rgba(var(--accent-rgb), 0.2); text-align:center; font-weight:900; text-transform:uppercase; color:var(--color-dark-pink); background:white; font-size:0.9rem; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                        </div>
                    </div>
                    <div onclick="toggleCategory('${catId}')" style="padding:15px; cursor:pointer; color:var(--color-accent);">
                        <i class="fas fa-chevron-down chevron-icon" id="${catId}-chevron"></i>
                    </div>
                </div>
                <div class="accordion-content ${isCatExpanded ? 'expanded' : ''}" id="${catId}-content">`;
            
            if (catItems.length === 0) {
                html += `<p style="padding:20px; color:#999; text-align:center; font-size:0.9rem; font-style:italic;">Esta categoría está vacía. Añade servicios para que aparezca en la web pública.</p>`;
            } else {
                catItems.forEach(svc => {
                    const svcActive = svc.active !== false;
                    html += `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:15px 20px; border-bottom:1px solid rgba(var(--accent-rgb), 0.3); ${!svcActive ? 'opacity:0.6;' : ''}">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <img src="${svc.img}" style="width:60px; height:60px; border-radius:8px; object-fit:cover;">
                            <div>
                                <h4 style="margin:0; color:var(--color-dark-pink); font-family:var(--font-heading);">${svc.title}</h4>
                                <p style="margin:0; font-size:0.85rem; color:#666;">${svc.categoryDisplay} | <strong style="color:var(--color-accent);">${svc.price}</strong></p>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <label class="switch-premium" style="transform: scale(0.7); margin-right:5px;" title="${svcActive ? 'Servicio Activo' : 'Servicio Inactivo'}">
                                <input type="checkbox" onchange="window.toggleStatus('service', '${svc.globalIndex}', this.checked)" ${svcActive ? 'checked' : ''}>
                                <span class="slider-premium round"></span>
                            </label>
                            <button onclick="openServiceGalleryManager('${svc.cat}', '${svc.title.replace(/'/g, "\\'")}')" style="background:var(--color-bg); padding:10px 12px; border-radius:8px; border:none; color:var(--color-accent); cursor:pointer;" title="Gestionar Galería de fotos del servicio"><i class="fas fa-images"></i></button>
                            <button onclick="editAdminService(${svc.globalIndex})" style="background:var(--color-bg); padding:10px 12px; border-radius:8px; border:none; color:var(--color-dark-pink); cursor:pointer;" title="Editar Publicación"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteAdminService(${svc.globalIndex})" style="background:var(--color-bg); padding:10px 12px; border-radius:8px; border:none; color:#d9534f; cursor:pointer;" title="Borrar Publicación"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>`;
                });
            }
            
            html += `
                </div>
            </div>`;
        });
        listContainer.innerHTML = html;
    } catch (error) {
        console.error("Error rendering services:", error);
    }
}

// ✅ Función para guardar simultaneidad desde la lista principal
window.saveSimultGroupInline = function(catId, val) {
    const customSimult = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');
    const upperVal = val.trim().toUpperCase();
    if (upperVal) {
        customSimult[catId] = upperVal;
    } else {
        delete customSimult[catId];
    }
    localStorage.setItem('margarita_simult_groups', JSON.stringify(customSimult));
    
    // Cloud Sync: Guardar simultaneidad en la nube
    if (window.saveDataToCloud) {
        window.saveDataToCloud('config_v2', 'simult_groups', customSimult);
    }
    
    // Feedback visual sutil (Opcional, pero recomendado para confirmar que se guardó)
    console.log(`Simultaneidad para ${catId} guardada: ${upperVal || 'Ninguna'}`);
    
    // Solo forzamos re-render de agenda si es necesario (el usuario está configurando para que impacte el motor de reservas)
    if(typeof renderAgenda === 'function') {
        // Debounce para no saturar si escriben rápido
        if(window._simultSaveTimer) clearTimeout(window._simultSaveTimer);
        window._simultSaveTimer = setTimeout(() => {
            renderAgenda();
            // showToast("Grupos de simultaneidad sincronizados."); // Podría ser muy intrusivo al escribir
        }, 800);
    }
};

window.toggleStatus = function(type, id, isOn) {
    if (type === 'category') {
        const cat = categories.find(c => c.id === id);
        if (cat) {
            cat.active = isOn;
            localStorage.setItem('margarita_categories', JSON.stringify(categories));
            if (window.manualFirebaseUpdate) window.manualFirebaseUpdate('categories', categories);
            renderAdminCategories();
            renderAdminServices();
        }
    } else if (type === 'service') {
        const svcIdx = parseInt(id);
        const allServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
        if (allServices[svcIdx]) {
            allServices[svcIdx].active = isOn;
            localStorage.setItem('margarita_services', JSON.stringify(allServices));
            if (window.manualFirebaseUpdate) window.manualFirebaseUpdate('services', allServices);
            renderAdminServices();
        }
    }
    // Repoblar selectores manuales para que desaparezcan inmediatamente de las opciones
    if (window.populateManualCategories) window.populateManualCategories();
    // showToast(`Estado actualizado con éxito.`);
};

window.editAdminService = function(index) {
    const svc = services[index];
    serviceCategory.value = svc.cat;
    serviceName.value = svc.title;
    servicePrice.value = svc.price; // This will show as $20.000 COP
    serviceDesc.value = svc.desc || "";
    document.getElementById('service-duration').value = svc.duration || "60";
    base64Image = svc.img;
    servicePreview.innerHTML = `<img src="${base64Image}" style="max-width:100%; height:200px; object-fit:cover; margin-top:10px; border-radius:8px;">`;
    editingIndex = index;
    uploadServiceBtn.innerText = "Guardar Cambios";
    uploadServiceBtn.disabled = false;
    
    // Abrir modal de edición
    window.toggleNewServiceForm();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Price Auto-Formatter (window.formatTime12h ya está definida al inicio del archivo)

const formatToCOP = (value) => {
    if (!value) return "";
    let num = value.toString().replace(/[^0-9]/g, '');
    if (!num) return "";
    return "$" + new Intl.NumberFormat('es-CO').format(num) + " COP";
}

// Generalized Price Auto-Formatting Support
const comboPriceInput = document.getElementById('promo-combo-price');
const modelPriceInput = document.getElementById('cat-gallery-model-price');

[servicePrice, comboPriceInput, modelPriceInput].forEach(inp => {
    if(inp) {
        inp.addEventListener('blur', (e) => {
            e.target.value = formatToCOP(e.target.value);
        });
        // Remove formatting on focus to make editing easier
        inp.addEventListener('focus', (e) => {
            let num = e.target.value.replace(/[^0-9]/g, '');
            if(num) e.target.value = num;
        });
    }
});

window._expandedCats = window._expandedCats || new Set();
window.toggleCategory = function(catId) {
    const content = document.getElementById(`${catId}-content`);
    const chevron = document.getElementById(`${catId}-chevron`);
    const header = document.getElementById(`${catId}-header`);

    if (content && chevron) {
        const isExpanded = content.classList.contains('expanded');
        if (isExpanded) {
            content.classList.remove('expanded');
            if (header) header.classList.remove('expanded');
            window._expandedCats.delete(catId);
        } else {
            content.classList.add('expanded');
            if (header) header.classList.add('expanded');
            window._expandedCats.add(catId);
        }
    }
};

window.deleteAdminService = function(index) {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    showConfirm(`${areYouSure} que quieres borrar esta publicación?`, () => {
        services.splice(index, 1);
        localStorage.setItem('margarita_services', JSON.stringify(services));
        
        // Sincronizar borrado con la Nube
        if (window.saveListToCloud) {
            window.saveListToCloud('servicios_v2', services);
        }
        
        renderAdminServices();
        showToast('Publicación eliminada correctamente.');
    });
}

// =============================================
// AGENDA ENHANCEMENTS & CALENDAR
// =============================================
let currentCalendarDate = new Date();
let selectedFilterDate = null;

// Helper global para tiempo (soporta 24h y AM/PM)
window.parseTimeToMins = function(t) {
    if (!t) return 0;
    const low = t.toString().toLowerCase();
    let [hP, mP] = low.split(':');
    let h = parseInt(hP), m = parseInt(mP || 0);
    if (low.includes('pm') && h < 12) h += 12;
    if (low.includes('am') && h === 12) h = 0;
    return h * 60 + m;
};

// Helper global para simultaneidad
window.getSimultGroup = function(catId) {
    if (!catId) return "";
    const cleanId = (catId || "").toString().replace(/^cat-/, "");
    const nCID = cleanId.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const simultGroups = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');
    
    // 1. Búsqueda directa (probando con y sin prefijo 'cat-')
    for (let key in simultGroups) {
        const cleanKey = key.toString().replace(/^cat-/, "");
        const nK = cleanKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        if (nK === nCID) return simultGroups[key].toLowerCase().trim();
    }
    
    // 2. Búsqueda por nombre de categoría
    const allCatsList = JSON.parse(localStorage.getItem('margarita_categories') || '[]');
    const catObj = allCatsList.find(c => {
        const c_id = (c.id || "").toString().replace(/^cat-/, "");
        const nID = c_id.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const nName = (c.name || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        return nID === nCID || nName === nCID;
    });
    
    if (catObj) {
        const c_id = (catObj.id || "").toString().replace(/^cat-/, "");
        const nID = c_id.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const nName = (catObj.name || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        for (let key in simultGroups) {
            const ck = key.toString().replace(/^cat-/, "");
            const nK = ck.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            if (nK === nID || nK === nName) return simultGroups[key].toLowerCase().trim();
        }
    }
    return "";
};

window.toggleManualForm = function() {
    const container = document.getElementById('manual-booking-container');
    const toggleBtn = document.getElementById('btn-manual-toggle');
    
    if (container) {
        container.classList.toggle('expanded');
        if (toggleBtn) toggleBtn.classList.toggle('expanded');
        
        if (container.classList.contains('expanded')) {
            const catSelect = document.getElementById('manual-category-select');
            // Solo poblamos si está vacío o no tiene opciones reales aún
            if (catSelect && catSelect.options.length <= 1) {
                populateManualCategories();
            }
            // Restringir fecha mínima a hoy
            const minDate = new Date().toLocaleDateString('sv-SE');
            const manualDateInput = document.getElementById('manual-date');
            if (manualDateInput && !manualDateInput.getAttribute('min')) {
                manualDateInput.setAttribute('min', minDate);
            }
        } else {
            // Se eliminó el borrado automático al cerrar para evitar pérdida de datos accidental
            // if (window.clearManualCart) window.clearManualCart();
            // if (window.resetManualFormUI) window.resetManualFormUI();
            // ... etc
        }
    }
};

window.cancelManualBooking = function() {
    // Al cancelar explícitamente, sí borramos todo
    if (window.clearManualCart) window.clearManualCart();
    if (window.resetManualFormUI) window.resetManualFormUI();
    
    const nameInput = document.getElementById('manual-name');
    const phoneInput = document.getElementById('manual-phone');
    const catSelect = document.getElementById('manual-category-select');
    const svcSelect = document.getElementById('manual-service-select');
    const priceDisplay = document.getElementById('manual-price-display');

    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (catSelect) catSelect.value = '';
    if (svcSelect) svcSelect.innerHTML = '<option value="">-- Primero elige especialidad --</option>';
    if (priceDisplay) priceDisplay.value = '';
    
    // Y cerramos el panel
    toggleManualForm();
};

window.populateManualCategories = function() {
    const catSelect = document.getElementById('manual-category-select');
    const svcSelect = document.getElementById('manual-service-select');
    const priceDisplay = document.getElementById('manual-price-display');
    
    if (!catSelect) return;
    
    const categoriesList = JSON.parse(localStorage.getItem('margarita_categories')) || [];
    const filteredCats = categoriesList.filter(c => c.active !== false);
    
    catSelect.innerHTML = '<option value="">-- Selecciona especialidad --</option>';
    svcSelect.innerHTML = '<option value="">-- Primero elige especialidad --</option>';
    priceDisplay.value = '';

    // AGREGAR COMBO SI EXISTE Y ESTÁ ACTIVO
    const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
    const comboActive = promos.combo && promos.combo.active;
    
    // Validar vencimiento
    const nowLocal = new Date();
    const isComboExpired = promos.combo?.expiry && new Date(promos.combo.expiry) < nowLocal;

    if (comboActive && !isComboExpired) {
        const comboOpt = document.createElement('option');
        comboOpt.value = 'combo-active';
        comboOpt.innerText = '✨ COMBO ESPECIAL';
        comboOpt.style.fontWeight = '800';
        comboOpt.style.color = 'var(--color-dark-pink)';
        catSelect.appendChild(comboOpt);
    }
    
    const seenNames = new Set();
    filteredCats.forEach(cat => {
        const cleanName = (cat.name || "").trim();
        const normName = cleanName.toLowerCase();
        if (cleanName && !seenNames.has(normName)) {
            seenNames.add(normName);
            const option = document.createElement('option');
            option.value = cat.id || cleanName;
            option.innerText = cleanName;
            catSelect.appendChild(option);
        }
    });

    // Asegurar que el desplegable de profesionales esté sincronizado al abrir
    updateManualSpecialists();
};

// --- HELPER: LOGICA DE PRECIOS DINÁMICOS (Sincronización de Promociones) ---
window.getManualEffectivePrice = function(svcData, date, time) {
    if (!svcData) return null;
    
    const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
    const disc = promos.discount;
    const originalPriceStr = svcData.originalPrice || svcData.price || "$0";
    const originalPriceNum = parseInt(originalPriceStr.replace(/\D/g, '')) || 0;
    
    if (!disc || !disc.active) return { price: originalPriceStr, isPromo: false };

    // 1. Validar vencimiento contra la fecha de la cita (DATE + TIME)
    if (disc.expiry && date) {
        let checkDateTime;
        if (time) {
            let cleanTime = time;
            if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
                let [h, m] = time.split(':');
                m = m.substring(0,2);
                h = parseInt(h);
                if (time.toLowerCase().includes('pm') && h < 12) h += 12;
                if (time.toLowerCase().includes('am') && h === 12) h = 0;
                cleanTime = `${h.toString().padStart(2,'0')}:${m}`;
            }
            checkDateTime = new Date(`${date}T${cleanTime}`);
        } else {
            checkDateTime = new Date(`${date}T23:59:59`);
        }
        
        if (!isNaN(checkDateTime.getTime()) && checkDateTime > new Date(disc.expiry)) {
            return { price: originalPriceStr, isPromo: false };
        }
    }

    // 2. Validar si el servicio o categoría califica
    const isSvcMatch = disc.mode === 'service' && Array.isArray(disc.services) && disc.services.includes(svcData.title);
    const isCatMatch = disc.mode === 'category' && (disc.category === 'all' || (Array.isArray(disc.category) && disc.category.includes(svcData.cat)));

    if (isSvcMatch || isCatMatch) {
        const percent = parseInt(disc.percent) || 0;
        const discAmt = Math.round(originalPriceNum * (percent / 100));
        const finalP = originalPriceNum - discAmt;
        return { 
            price: `$${finalP.toLocaleString('es-CO').replace(/,/g, '.')}`, 
            isPromo: true, 
            percent 
        };
    }

    return { price: originalPriceStr, isPromo: false };
};

window.getManualComboEffectivePrice = function(comboConfig, date, time) {
    if (!comboConfig || !comboConfig.active) return null;
    
    if (comboConfig.expiry && date) {
        let cleanTime = time || "23:59";
        if (cleanTime.toLowerCase().includes('am') || cleanTime.toLowerCase().includes('pm')) {
             let [h, m] = cleanTime.split(':'); m = m.substring(0,2); h = parseInt(h);
             if (cleanTime.toLowerCase().includes('pm') && h < 12) h += 12;
             if (cleanTime.toLowerCase().includes('am') && h === 12) h = 0;
             cleanTime = `${h.toString().padStart(2,'0')}:${m}`;
        }
        let checkDateTime = new Date(`${date}T${cleanTime}`);
        if (!isNaN(checkDateTime.getTime()) && checkDateTime > new Date(comboConfig.expiry)) return null;
    }
    return comboConfig.comboPrice; 
};

window.updateManualServices = function() {
    const catSelect = document.getElementById('manual-category-select');
    const svcSelect = document.getElementById('manual-service-select');
    const priceDisplay = document.getElementById('manual-price-display');
    
    const catId = catSelect.value;
    const allServices = JSON.parse(localStorage.getItem('margarita_services')) || [];
    const filteredServices = allServices.filter(s => s.active !== false);
    const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
    
    svcSelect.innerHTML = '<option value="">-- Selecciona servicio --</option>';
    priceDisplay.value = '';
    
    if (catId === 'combo-active') {
        // Si cambiamos a COMBO, destrozamos cualquier Paquete Personalizado en progreso
        if (window.manualCart && window.manualCart.length > 0) {
            window.manualCart = [];
            if (window.renderManualCart) window.renderManualCart();
        }
        window.manualComboAssignments = null;
        if (window.resetManualFormUI) window.resetManualFormUI();

        const combo = promos.combo;
        const selDate = document.getElementById('manual-date').value;
        const selTime = document.getElementById('manual-time').value;

        // Validar si el combo sigue vigente para la fecha elegida
        const effectiveComboPrice = window.getManualComboEffectivePrice(combo, selDate, selTime);
        
        if (!effectiveComboPrice) {
            // Si el combo expiró para esa fecha, mostramos un aviso y no cargamos la opción
            svcSelect.innerHTML = '<option value="">-- El combo no aplica para esta fecha --</option>';
            showToast("⚠️ La oferta de Combo Fixed Price no está vigente para la fecha seleccionada.", "info");
            return;
        }

        let servicesToInclude = [];
        if (combo.mode === 'service') {
            servicesToInclude = combo.services || [];
        } else {
             const cats = combo.category || [];
             cats.forEach(cId => {
                 const firstSvc = allServices.find(s => s.cat === cId);
                 if (firstSvc) servicesToInclude.push(firstSvc.title);
             });
        }

        if (servicesToInclude.length > 0) {
            const comboPriceFormatted = effectiveComboPrice.toString().startsWith('$') ? effectiveComboPrice : `$${parseInt(effectiveComboPrice).toLocaleString('es-CO').replace(/,/g, '.')}`;
            
            let totalDuration = 0;
            let comboDetails = [];
            let servicesSummary = servicesToInclude.join(' + ');

            servicesToInclude.forEach(sName => {
                const sData = allServices.find(s => s.title === sName);
                if (sData) {
                    const dur = parseInt(sData.duration) || 60;
                    totalDuration += dur;
                    comboDetails.push({
                        title: sData.title,
                        price: sData.price,
                        img: sData.img,
                        duration: dur,
                        cat: sData.cat
                    });
                }
            });

            const option = document.createElement('option');
            option.value = 'combo-pack';
            option.innerText = `PACK: ${servicesSummary}`;
            option.dataset.price = comboPriceFormatted;
            option.dataset.name = servicesSummary;
            option.dataset.duration = totalDuration;
            option.dataset.isCombo = 'true';
            option.dataset.comboData = JSON.stringify(comboDetails);
            
            svcSelect.appendChild(option);
            svcSelect.value = 'combo-pack';
            updateManualPrice();
        }
    } else {
        // Ejecutar limpieza para que cualquier "Combo" anterior desaparezca del UI si saltamos a un servicio individual.
        // A menos que ya estemos armando un paquete personalizado.
        const inPackageMode = window.manualCart && window.manualCart.length > 0;
        if (!inPackageMode) {
            window.manualComboAssignments = null;
            if (window.resetManualFormUI) window.resetManualFormUI();
        }

        const filtered = allServices.filter(s => s.cat === catId);
        const selDate = document.getElementById('manual-date').value;
        const selTime = document.getElementById('manual-time').value;

        filtered.forEach(svc => {
            const option = document.createElement('option');
            option.value = svc.title;
            
            const effective = window.getManualEffectivePrice(svc, selDate, selTime);

            option.innerText = effective.isPromo ? `${svc.title} (${effective.price}) - ${effective.percent}% OFF` : `${svc.title} (${svc.price})`;
            option.dataset.price = effective.price;
            option.dataset.originalPrice = svc.price;
            option.dataset.isPromo = effective.isPromo ? 'true' : 'false';
            option.dataset.name = svc.title;
            option.dataset.img = svc.img;
            option.dataset.duration = svc.duration || "60";
            svcSelect.appendChild(option);
        });

        if (window.manualCart && window.manualCart.length > 0) {
            window.injectManualCartAsOption(window.manualCart.reduce((acc, s)=>acc+s.priceNum, 0), false);
        }
        updateManualSpecialists();
    }
};

// --- LOGICA DE AGENDA VISUAL PARA CITAS MANUALES ---
window.currentManualBookingDuration = 60;

window.editComboService = function(idx) {
    if (idx === undefined) {
        window.editingComboIdx = undefined;
        window._pendingIndividualEdit = null;
    } else if (window.editingComboIdx == undefined || window.editingComboIdx != idx) {
        window.editingComboIdx = idx;
        window._pendingIndividualEdit = null;
        window._shouldAutoFocusManualAgenda = true;
    } else if (window._pendingIndividualEdit == null || window._pendingIndividualEdit == undefined) {
        window._pendingIndividualEdit = idx;
        window._shouldAutoFocusManualAgenda = true;
    } else {
        // En el tercer clic (estando en Individual), volvemos a MANDO en lugar de apagar
        // Así el mando se queda "fijo" en este servicio hasta que elijas otro
        window._pendingIndividualEdit = null;
        window._shouldAutoFocusManualAgenda = true;
    }
    if (window.openManualVisualAgenda) window.openManualVisualAgenda(true);
};

window.openManualVisualAgenda = function(isEdit = false) {
    if (!isEdit) {
        window.editingComboIdx = undefined;
        window._pendingIndividualEdit = null; // Abrir con botón principal → NO es edición individual
    }
    
    const modal = document.getElementById('manual-visual-agenda-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const dateInput = document.getElementById('manual-agenda-date');
    const manualDateInput = document.getElementById('manual-date');
    const manualDate = manualDateInput ? manualDateInput.value : '';
    const svcSelect = document.getElementById('manual-service-select');
    
    // Configurar restricción de fecha mínima (Hoy)
    const todayStr = new Date().toLocaleDateString('sv-SE');
    if (dateInput) dateInput.setAttribute('min', todayStr);
    if (manualDateInput) manualDateInput.setAttribute('min', todayStr);

    // Configurar fecha inicial en el modal (la que ya tenga el form o HOY)
    if (dateInput) {
        if (manualDate) {
            dateInput.value = manualDate;
        } else {
            const now = new Date();
            // Si son más de las 8:00 PM (20:00), mostramos mañana por defecto ya que el salón cerró
            if (now.getHours() >= 20) {
                now.setDate(now.getDate() + 1);
            }
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            dateInput.value = `${y}-${m}-${d}`;
        }
    }

    // Inicializar el foco de edición para Combos (el marcador naranja)
    if (svcSelect && svcSelect.selectedIndex > 0) {
        const selectedSvc = svcSelect.options[svcSelect.selectedIndex];
        
        if (selectedSvc.dataset.isCombo === 'true') {
            if (window.editingComboIdx === undefined) {
                window.editingComboIdx = 0;
            }
            // Sincronizar duración del servicio específico siendo editado
            const cData = JSON.parse(selectedSvc.dataset.comboData || '[]');
            if (typeof window.editingComboIdx === 'string' && window.editingComboIdx.startsWith('extra_')) {
                const exIdx = parseInt(window.editingComboIdx.split('_')[1]);
                const ex = (window.manualComboExtras || [])[exIdx];
                if (ex) window.currentManualBookingDuration = parseInt(ex.duration) || 60;
            } else if (cData[window.editingComboIdx]) {
                window.currentManualBookingDuration = parseInt(cData[window.editingComboIdx].duration) || 60;
            }
        } else {
            window.editingComboIdx = undefined;
            window.currentManualBookingDuration = parseInt(selectedSvc.dataset.duration) || 60;
        }
    } else {
        window.editingComboIdx = undefined;
        window.currentManualBookingDuration = 60;
    }

    // Activar bandera auto-scroll para enfocar el servicio editado al abrir
    window._shouldAutoFocusManualAgenda = true;

    window.renderManualVisualAgendaGrid();
};

window.closeManualVisualAgenda = function() {
    const modal = document.getElementById('manual-visual-agenda-modal');
    if (modal) modal.style.display = 'none';
    // Limpiamos el índice de edición y estado al cerrar la agenda definitivamente
    window.editingComboIdx = undefined;
    window._pendingIndividualEdit = null;
};

// ══════════════════════════════════════════════════════════════════════
// EDICIÓN INDIVIDUAL DE COMBO: Mueve UN servicio, NO toca los demás
// Se activa cuando el usuario presiona ↺ en el CRONOGRAMA
// ══════════════════════════════════════════════════════════════════════
window.pickTimeForSingleEdit = function(time, specialist) {
    const modalDate = (document.getElementById('manual-agenda-date') || {}).value || '';
    const dateChanged = window._manualComboLastDate && window.normDate(modalDate) !== window.normDate(window._manualComboLastDate);
    
    if (dateChanged) {
        // Si cambió la fecha, forzamos un agendamiento completo del combo para el nuevo día
        window._pendingIndividualEdit = null;
        window.pickTimeForManualAppointment(time, specialist);
        return;
    }

    const editIdx = window.editingComboIdx;
    // Permite que el usuario siga tocando cuadros en blanco para seguir moviéndolo
    // hasta que voluntariamente toque otro elemento o cierre.
    
    // 1. Actualizar SOLO el servicio siendo editado
    if (editIdx !== undefined) {
        if (typeof editIdx === 'string' && editIdx.startsWith('extra_')) {
            const ei = parseInt(editIdx.split('_')[1]);
            if (window.manualComboExtras && window.manualComboExtras[ei]) {
                window.manualComboExtras[ei].time = time;
                window.manualComboExtras[ei].specialist = specialist;
                window.manualComboExtras[ei].specialistId = specialist;
            }
        } else {
            const bi = parseInt(editIdx);
            if (!window.manualComboAssignments) window.manualComboAssignments = [];
            if (window.manualComboAssignments) {
                window.manualComboAssignments[bi] = { time, specialist, specialistId: specialist };
            }
        }
    }

    // 2. Leer contexto
    const svcSelect = document.getElementById('manual-service-select');
    const selectedSvc = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex] : null;
    if (!selectedSvc || selectedSvc.dataset.isCombo !== 'true') {
        return;
    }
    const summaryDateTime   = document.getElementById('summary-datetime');
    const summaryContainer  = document.getElementById('manual-selection-summary-container');
    const mainBtn           = document.getElementById('manual-form-agenda-btn-container');
    const specWrapper       = document.getElementById('summary-spec-name') ? document.getElementById('summary-spec-name').parentElement : null;
    const summaryBox        = document.getElementById('manual-selection-summary');
    const saveBtn           = document.getElementById('manual-save-btn');
    // Sync form date
    const dateInput = document.getElementById('manual-date');
    if (dateInput && modalDate) dateInput.value = modalDate;

    if (summaryContainer) summaryContainer.style.display = 'block';
    if (mainBtn) mainBtn.style.display = 'none';
    if (saveBtn) { saveBtn.style.opacity = '1'; saveBtn.style.pointerEvents = 'auto'; }
    if (specWrapper) specWrapper.style.display = 'none';
    if (summaryBox) { summaryBox.style.border = 'none'; summaryBox.style.background = 'transparent'; summaryBox.style.padding = '0'; }

    const to12h  = (t) => window.formatTime12h ? window.formatTime12h(t) : t;
    const getSGrp = (cId) => window.getSimultGroup ? window.getSimultGroup(cId) : '';
    const baseComboData = JSON.parse(selectedSvc.dataset.comboData || '[]');
    const extras = window.manualComboExtras || [];

    // 3. Construir CRONOGRAMA HTML directamente desde el estado actual
    let breakdownHtml = `<div style="margin-top:12px; border:1px solid rgba(var(--accent-rgb), 0.1); border-radius:12px; background:#fff; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.03);"><div style="background:rgba(var(--accent-rgb), 0.05); padding:8px 12px; border-bottom:1px solid rgba(var(--accent-rgb), 0.1); display:flex; justify-content:center; align-items:center;"><span style="font-size:0.65rem; font-weight:800; color:var(--color-dark-pink); text-transform:uppercase; letter-spacing:1px; text-align:center;"><i class="fas fa-calendar-alt"></i> CRONOGRAMA DE CITAS</span></div><div style="padding:8px; display:block;">`;

    baseComboData.forEach((s, idx) => {
        const assigned = window.manualComboAssignments ? window.manualComboAssignments[idx] : null;
        const sTime = assigned ? to12h(assigned.time) : 'Por asignar';
        const sSpec = assigned ? assigned.specialist : '-';
        const rawG = getSGrp(s.cat);
        const sGrp = rawG ? rawG.toString().trim().toUpperCase() : '';
        const sGrpDisplay = sGrp ? `<span style="background:rgba(var(--accent-rgb), 0.1); color:var(--color-dark-pink); padding:1px 4px; border-radius:4px; font-size:0.55rem; margin-right:4px; border:1px solid rgba(var(--accent-rgb), 0.2); font-weight:800;">[${sGrp}]</span>` : '';
        breakdownHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f9f9f9; background:#fff; border-radius:10px; margin-bottom:6px; transition:0.2s; border:1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.015); overflow:hidden;">
                <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; text-align:left;">
                    <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:700; color:#333; overflow:hidden;">
                        ${sGrpDisplay}
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${s.title}</span>
                    </div>
                    <span style="font-size:0.62rem; font-weight:700; color:${assigned ? 'var(--color-dark-pink)' : '#aaa'}; margin-top:2px;">${sTime} | ${s.duration} min</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0; margin-left:10px;">
                    <span style="font-size:0.65rem; font-weight:700; color:#888; text-align:right; min-width:50px;">${sSpec}</span>
                    <button onclick="window.editComboService(${idx})" type="button" style="background:${assigned ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--color-dark-pink)'}; border:none; width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:0.65rem; font-weight:800; color:${assigned ? 'var(--color-dark-pink)' : '#fff'}; display:flex; align-items:center; justify-content:center; transition:0.2s;"><i class="fas ${assigned ? 'fa-sync-alt' : 'fa-clock'}"></i></button>
                </div>
            </div>`;
    });

    extras.forEach((ex, idx) => {
        const eIdx = `extra_${idx}`;
        const sTime = ex.time ? to12h(ex.time) : 'Por asignar';
        const sSpec = ex.specialist || '-';
        const rawEG = getSGrp(ex.cat || ex.category || ex.catId || '');
        const eGrp = rawEG ? rawEG.toString().trim().toUpperCase() : '';
        const eGrpDisplay = eGrp ? `<span style="background:rgba(var(--accent-rgb), 0.1); color:var(--color-dark-pink); padding:1px 4px; border-radius:4px; font-size:0.55rem; margin-right:4px; border:1px solid rgba(var(--accent-rgb), 0.2); font-weight:800;">[${eGrp}]</span>` : '';
        breakdownHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f9f9f9; background:rgba(var(--accent-rgb), 0.02); border-radius:10px; margin-bottom:6px; border:1px dashed rgba(var(--accent-rgb), 0.3); overflow:hidden;">
                <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; text-align:left;">
                    <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:700; color:#333; overflow:hidden;">
                        ${eGrpDisplay}
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${ex.title}</span>
                        <span style="background:var(--color-dark-pink); color:white; font-size:0.45rem; padding:1px 5px; border-radius:30px; font-weight:800; flex-shrink:0;">EXTRA</span>
                    </div>
                    <span style="font-size:0.62rem; font-weight:700; color:${ex.time ? 'var(--color-dark-pink)' : '#aaa'}; margin-top:2px;">${sTime} | ${ex.duration} min</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0; margin-left:10px;">
                    <span style="font-size:0.65rem; font-weight:700; color:#888; text-align:right; min-width:50px;">${sSpec}</span>
                    <button onclick="window.editComboService('${eIdx}')" type="button" style="background:${ex.time ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--color-dark-pink)'}; border:none; width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:0.65rem; font-weight:800; color:${ex.time ? 'var(--color-dark-pink)' : '#fff'}; display:flex; align-items:center; justify-content:center; transition:0.2s;"><i class="fas ${ex.time ? 'fa-sync-alt' : 'fa-clock'}"></i></button>
                </div>
            </div>`;
    });

    breakdownHtml += `</div></div>`;

    if (summaryDateTime) {
        summaryDateTime.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;"><div style="background:var(--color-dark-pink); color:white; padding:0 12px; border-radius:6px; display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.75rem; letter-spacing:0.5px; height:28px; box-shadow:0 3px 10px rgba(var(--accent-rgb), 0.2);"><i class="far fa-calendar-check" style="font-size:0.9rem;"></i> ${modalDate}</div><button type="button" onclick="window.clearManualComboAssignments()" style="background:#fff2f2; border:1px solid #ffcccc; color:#d9534f; cursor:pointer; font-weight:800; font-size:0.65rem; padding:0 12px; border-radius:6px; letter-spacing:0.5px; display:flex; align-items:center; gap:6px; transition:0.2s; height:28px; box-sizing:border-box;" onmouseover="this.style.background='#ffe5e5'; this.style.borderColor='#ffb3b3';" onmouseout="this.style.background='#fff2f2'; this.style.borderColor='#ffcccc';"><i class="fas fa-eraser" style="font-size:0.8rem;"></i> LIMPIAR</button></div>${breakdownHtml}`;
    }

    if (window.renderManualVisualAgendaGrid) window.renderManualVisualAgendaGrid();
    if (window.checkManualFormCompletion) window.checkManualFormCompletion();
    if (window.showToast) window.showToast(`Turno actualizado: ${specialist} a las ${to12h(time)}`, 'success');
};

// Utilidad para normalizar fechas a YYYY-MM-DD
window.normDate = (d) => {
    if (!d) return '';
    const p = d.split(/[-/]/);
    if (p.length < 3) return d;
    return p[0].length === 4 ? `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}` : `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
};

window.handleManualGridCellClick = function(time, specialist) {
    if (window._pendingIndividualEdit !== null && window._pendingIndividualEdit !== undefined) {
        window.pickTimeForSingleEdit(time, specialist);
    } else {
        window.pickTimeForManualAppointment(time, specialist);
    }
};

window.pickTimeForManualAppointment = function(time, specialist) {
    const modalDate = document.getElementById('manual-agenda-date').value;
    const dateInput = document.getElementById('manual-date');
    const timeInput = document.getElementById('manual-time');
    const specSelect = document.getElementById('manual-specialist');
    const svcSelect = document.getElementById('manual-service-select');

    if (dateInput) dateInput.value = modalDate;
    if (timeInput) timeInput.value = time;
    
    if (specSelect) {
        // Asegurar que el profesional esté en el select (comparación insensible a mayúsculas)
        const opts = Array.from(specSelect.options);
        const existing = opts.find(o => o.value.toLowerCase() === specialist.toLowerCase());
        
        if (existing) {
            specSelect.value = existing.value;
        } else {
            const opt = document.createElement('option');
            opt.value = specialist;
            opt.innerText = specialist;
            specSelect.appendChild(opt);
            specSelect.value = specialist;
        }
    }
    
    // === FLAG EXPLÍCITO: se activa SOLO cuando el usuario presionó ↺ (editComboService) ===
    // Se consume aquí inmediatamente. Si es null → primera vez → recalcular todo.
    const _comboIndividualEdit = !!(window._pendingIndividualEdit !== null && window._pendingIndividualEdit !== undefined);
    // window._pendingIndividualEdit = null; // Auto-consumo desactivado a petición del usuario

    if (window.editingComboIdx !== undefined) {
        const selectedSvc = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex] : null;
        const isCombo = selectedSvc && selectedSvc.dataset.isCombo === 'true';

        if (!isCombo) {
            // Caso individual normal: actualizar directamente
            if (typeof window.editingComboIdx === 'string' && window.editingComboIdx.startsWith('extra_')) {
                const extraIdx = parseInt(window.editingComboIdx.split('_')[1]);
                if (window.manualComboExtras && window.manualComboExtras[extraIdx]) {
                    window.manualComboExtras[extraIdx].time = time;
                    window.manualComboExtras[extraIdx].specialist = specialist;
                    window.manualComboExtras[extraIdx].specialistId = specialist;
                }
            } else {
                if (!window.manualComboAssignments) window.manualComboAssignments = [];
                window.manualComboAssignments[window.editingComboIdx] = { time, specialist, specialistId: specialist };
            }
        }
    }
    const summaryContainer = document.getElementById('manual-selection-summary-container');
    const mainBtn = document.getElementById('manual-form-agenda-btn-container');
    const saveBtn = document.getElementById('manual-save-btn');
    
    if (summaryContainer && mainBtn && saveBtn) {
        summaryContainer.style.display = 'block';
        mainBtn.style.display = 'none';
        saveBtn.style.opacity = '1';
        saveBtn.style.pointerEvents = 'auto';
        document.getElementById('summary-spec-name').innerText = specialist;
        const summaryDateTime = document.getElementById('summary-datetime');
        const selectedSvc = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex] : null;

        // --- DINAMICO: SI CAMBIA LA FECHA/HORA, ACTUALIZAR PRECIO DEL SELECT ---
        // Marcamos que el turno acaba de ser elegido para que updateManualPrice no oculte el resumen
        window._manualSlotJustPicked = true;
        if (window.updateManualPrice) window.updateManualPrice();
        window._manualSlotJustPicked = false;

        // Formateador local
        const to12h = (t) => {
            if (window.formatTime12h) return window.formatTime12h(t);
            let [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
        };

        const timeToMins = (t) => window.parseTimeToMins(t);
        const normDate = (d) => window.normDate(d);
        const nrm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        if (selectedSvc && selectedSvc.dataset.isCombo === 'true') {
            const allServicesDB = JSON.parse(localStorage.getItem('margarita_services') || '[]');
            let baseComboData = JSON.parse(selectedSvc.dataset.comboData || '[]');
            let extras = window.manualComboExtras || [];
            
            // UNIFICACIÓN: El pack total asegurando que cada item TENGA su categoría para el algoritmo
            let fullComboData = [...baseComboData, ...extras].map(svc => {
                const found = allServicesDB.find(db => nrm(db.title) === nrm(svc.title || svc.service || svc));
                return {
                    title:    svc.title    || svc.service  || svc,
                    duration: svc.duration || (found ? found.duration : 60),
                    // Preservar TODOS los campos de categoría para que getG() los encuentre
                    cat:      svc.cat      || svc.category || svc.catId || (found ? (found.cat || found.category || found.catId || '') : ''),
                    category: svc.category || svc.cat      || svc.catId || (found ? (found.category || found.cat || found.catId || '') : ''),
                    catId:    svc.catId    || svc.cat      || svc.category || (found ? (found.catId || found.cat || found.category || '') : '')
                };
            });

            const simultGroups = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');
            const allSpecs     = JSON.parse(localStorage.getItem('margarita_specialists') || '[]');
            const allApts      = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');
            const selDate      = document.getElementById('manual-date') ? document.getElementById('manual-date').value : '';
            const allCatsList  = JSON.parse(localStorage.getItem('margarita_categories') || '[]');

            const cDate = normDate(selDate);
            const currentName = nrm(document.getElementById('manual-name')?.value || "");
            const dayApts = allApts.filter(a => {
                if (normDate(a.date) !== cDate) return false;
                const st = (a.status||"").toLowerCase();
                // Solo ignoramos las que están expresamente canceladas o rechazadas.
                // Pendientes, Aceptadas y Terminadas bloquean el horario.
                if (st === "cancelled" || st === "rejected") return false;
                
                // Si el nombre coincide y no estamos en un modo de "Nueva Cita" vacío, 
                // ignoramos para permitir re-posicionar al mismo cliente sin chocar consigo mismo.
                if (currentName && nrm(a.client) === currentName) return false;
                return true;
            });
            
            const getSGrp = (cId) => window.getSimultGroup(cId);

            const isSpecFree = (specName, startMin, dur, skipComboResults = null) => {
                const nN = nrm(specName);
                if (!nN) return false;
                const endMin = startMin + dur;
                // 1. Chequear DB de citas existentes
                const busyInDb = dayApts.some(a => {
                    if (nrm(a.specialist) !== nN) return false;
                    const aS = timeToMins(a.time), aD = parseInt(a.duration) || 60;
                    return (startMin < (aS + aD) && endMin > aS);
                });
                if (busyInDb) return false;
                // 2. Chequear asignaciones ya confirmadas del combo en curso
                if (skipComboResults) {
                    const busyInCombo = skipComboResults.some((r, ri) => {
                        if (!r) return false;
                        if (nrm(r.specialist) !== nN) return false;
                        const rS = timeToMins(r.time), rD = (fullComboData && fullComboData[ri] ? parseInt(fullComboData[ri].duration) : 0) || 60;
                        return (startMin < (rS + rD) && endMin > rS);
                    });
                    if (busyInCombo) return false;
                }
                return true;
            };

            const findSpecFor = (sData, startMin, dur, preferredSpec, busyNames = []) => {
                const catId = typeof sData === 'object' ? sData.cat : sData;
                const sTitle = typeof sData === 'object' ? nrm(sData.title || "") : "";
                const nCID = nrm(catId);
                const catObj = allCatsList.find(c => nrm(c.id) === nCID || nrm(c.name) === nCID);
                const cName = catObj ? nrm(catObj.name) : "";

                let candidates = allSpecs.filter(s => {
                    const sName = nrm(typeof s === 'string' ? s : s.name);
                    if (busyNames.includes(sName)) return false;
                    const specStr = nrm(s.specialty || 'Todos');
                    if (specStr.includes('todos')) return true;
                    const specList = specStr.split(/[\s,]+/).filter(w => w.length > 2);
                    return specList.some(sp => 
                        (cName && cName.includes(sp)) || (nCID && nCID.includes(sp)) || 
                        (sTitle && sTitle.includes(sp)) || 
                        (sp.includes(cName) && cName.length > 3) || (sp.includes(nCID) && nCID.length > 3)
                    );
                });

                // FALLBACK: Si no hay candidatos por especialidad, tomamos a todos los libres en ese horario
                if (candidates.length === 0) {
                    candidates = allSpecs.filter(s => !busyNames.includes(nrm(typeof s === 'string' ? s : s.name)));
                }

                const nPref = nrm(preferredSpec);
                if (nPref && !busyNames.includes(nPref) && isSpecFree(preferredSpec, startMin, dur)) {
                    if (candidates.some(c => nrm(typeof c === 'string' ? c : c.name) === nPref)) return preferredSpec;
                }
                for (let c of candidates) {
                    const name = (typeof c === 'string' ? c : c.name);
                    if (isSpecFree(name, startMin, dur)) return name;
                }
                return null;
            };

// --- UTILIDADES DE TIEMPO GLOBALES ---
window.minsToTime = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
};

// --- MOTOR DE ASIGNACIÓN INTELIGENTE (EXTERNAlIZADO PARA REUSO EN GRID) ---
window.calculateSmartAssignments = (anchorTime, data, fixedIdx = 0, fixedSpec = null, dateStr = '') => {
    const parseTimeToMins = (t) => window.parseTimeToMins(t);
    const timeToMins = (t) => window.parseTimeToMins(t);
    const aMin = parseTimeToMins(anchorTime);
    const allServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
    const results = new Array(data.length).fill(null);
    const fIdx = (typeof fixedIdx === 'number') ? fixedIdx : 0;
    const now = new Date();
    
    // Fecha local real de hoy
    const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const rawNow = now.getHours() * 60 + now.getMinutes();
    const nowMin = isNaN(rawNow) ? 0 : Math.ceil((rawNow + 1) / 15) * 15;
    
    const targetDateStr = dateStr || (document.getElementById('manual-date') ? document.getElementById('manual-date').value : '');
    const normDate = (d) => window.normDate(d);
    const isToday = normDate(targetDateStr) === todayLocalStr;

    const nrm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const normalize = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const catMatch = (s1, s2) => {
        const n1 = normalize(s1), n2 = normalize(s2);
        if (!n1 || !n2) return false;
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    };

    const getG = (svc) => {
        if (!svc) return "";
        const cId = svc.cat || svc.category || svc.catId || (allServices.find(s => nrm(s.title) === nrm(svc.title || svc.service || svc)) || {}).cat || "";
        const group = window.getSimultGroup(cId);
        return group ? group.toString().trim().toUpperCase() : "";
    };

    const allSpecs = JSON.parse(localStorage.getItem('margarita_specialists') || '[]');
    const allApts = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');
    const cDate = normDate(targetDateStr);
    const currentName = nrm(document.getElementById('manual-name')?.value || "");
    
    const dayApts = allApts.filter(a => {
        if (normDate(a.date) !== cDate) return false;
        const st = (a.status||"").toLowerCase();
        if (st === "cancelled" || st === "rejected" || st === "accepted") return false;
        if (currentName && nrm(a.client) === currentName) return false;
        return true;
    });

    const isSpecFree = (specName, m, dur, currentRes = null) => {
        const nN = nrm(specName);
        if (!nN) return false;
        const endMin = m + dur;
        if (dayApts.some(a => nrm(a.specialist) === nN && m < (parseTimeToMins(a.time) + (parseInt(a.duration)||60)) && endMin > parseTimeToMins(a.time))) return false;
        if (currentRes) {
            if (currentRes.some((r, ri) => r && nrm(r.specialist) === nN && m < (parseTimeToMins(r.time) + (parseInt(data[ri].duration)||60)) && endMin > parseTimeToMins(r.time))) return false;
        }
        return true;
    };

    const checkSlot = (idx, t, currentResults, pfSpec = null) => {
        const s = data[idx];
        if (!s) return null;
        const sDur = parseInt(s.duration) || 60;
        if (t < 420 || t + sDur > 1200) return null;
        if (isToday && t < nowMin) return null;

        const sG = getG(s);
        const isClientBusy = currentResults.some((r, ri) => {
            if (!r || ri === idx) return false;
            const rG = getG(data[ri]);
            if (sG && rG && sG === rG) return false;
            const rS = parseTimeToMins(r.time), rD = parseInt(data[ri].duration) || 60;
            return (t < (rS + rD) && (t + sDur) > rS);
        });
        if (isClientBusy) return null;

        const busyNames = currentResults.map((r, ri) => {
            if (!r || ri === idx) return null;
            const rS = parseTimeToMins(r.time), rD = parseInt(data[ri].duration) || 60;
            if (t < (rS + rD) && (t + sDur) > rS) return normalize(r.specialist);
            return null;
        }).filter(Boolean);

        let candidates = allSpecs.filter(spec => {
            const sName = normalize(spec.name || spec);
            if (busyNames.includes(sName)) return false;
            if (spec.active === false) return false;
            const specList = (spec.specialty || 'Todos').split(',').map(ss => ss.trim());
            if (specList.some(ss => normalize(ss) === 'todos')) return true;
            return specList.some(ss => catMatch(ss, s.cat || s.category || s.catId || '') || catMatch(ss, s.title || s.service || s.name || ''));
        });

        if (candidates.length === 0) return null;
        if (pfSpec) {
            const nP = normalize(pfSpec);
            if (candidates.some(c => normalize(c.name || c) === nP) && isSpecFree(pfSpec, t, sDur, currentResults)) return pfSpec;
        }
        for (let c of candidates) {
            const name = (typeof c === 'string' ? c : c.name);
            if (isSpecFree(name, t, sDur, currentResults)) return name;
        }
        return null;
    };

    const groupInfo = {};
    data.forEach((s, i) => {
        const g = getG(s) || `SINGLE_${i}`;
        if (!groupInfo[g]) groupInfo[g] = { indices: [], maxDur: 0 };
        groupInfo[g].indices.push(i);
        groupInfo[g].maxDur = Math.max(groupInfo[g].maxDur, parseInt(s.duration) || 60);
    });

    const anchorG = getG(data[fIdx]) || `SINGLE_${fIdx}`;
    results[fIdx] = { time: anchorTime, specialist: fixedSpec || checkSlot(fIdx, aMin, [], fixedSpec) || "" };
    if (!results[fIdx].specialist) return null;

    if (groupInfo[anchorG]) {
        for (let idx of groupInfo[anchorG].indices) {
            if (results[idx]) continue;
            const spec = checkSlot(idx, aMin, results, null);
            if (spec) {
                results[idx] = { time: anchorTime, specialist: spec };
            }
            // Si no hay especialista disponible a esta misma hora (e.g. un solo profesional para dos servicios del mismo grupo),
            // lo dejamos null para que pase a la "Asignación Tetris" y se agende de forma secuencial.
        }
    }

    const remainingGroups = Object.keys(groupInfo).filter(g => g !== anchorG);
    const findSlotForGroup = (gName) => {
        const info = groupInfo[gName];
        const trySlot = (t) => {
            if (t < 420 || t + info.maxDur > 1200) return false;
            if (isToday && t < nowMin) return false;
            const tempRes = [...results];
            for (let idx of info.indices) {
                if (tempRes[idx]) continue;
                const sp = checkSlot(idx, t, tempRes, null);
                if (!sp) return false;
                tempRes[idx] = { time: window.minsToTime(t), specialist: sp };
            }
            return !results.some((r, ri) => {
                if (!r) return false;
                const rG = getG(data[ri]) || `SINGLE_${ri}`;
                if (rG === gName) return false;
                const rS = parseTimeToMins(r.time), rD = parseInt(data[ri].duration) || 60;
                return (t < (rS + rD) && (t + info.maxDur) > rS);
            });
        };
        for (let t = aMin; t + info.maxDur <= 1200; t += 15) if (trySlot(t)) return t;
        for (let t = aMin - 15; t >= 420; t -= 15) if (trySlot(t)) return t;
        return null;
    };

    for (const g of remainingGroups) {
        const bestT = findSlotForGroup(g);
        if (bestT !== null) {
            groupInfo[g].indices.forEach(idx => {
                if (results[idx]) return;
                const sp = checkSlot(idx, bestT, results, null);
                if (sp) results[idx] = { time: window.minsToTime(bestT), specialist: sp };
            });
        }
        // Si bestT es null, simplemente dejamos sus índices en null para el Tetris final (secuencial).
    }

    const nullIndices = data.map((_, i) => i).filter(i => !results[i]);
    for (const i of nullIndices) {
        let foundT = null;
        for (let t = aMin; t <= 1200; t += 15) {
            const sp = checkSlot(i, t, results);
            if (sp) { results[i] = { time: window.minsToTime(t), specialist: sp }; foundT = t; break; }
        }
        if (foundT === null) return null;
    }
    return results;
};

            // Índice de anclaje
            let targetIdx = 0;
            const isEditingExisting = window.editingComboIdx !== undefined;
            if (isEditingExisting) {
                if (typeof window.editingComboIdx === 'string' && window.editingComboIdx.startsWith('extra_')) {
                    targetIdx = baseComboData.length + parseInt(window.editingComboIdx.split('_')[1]);
                } else {
                    targetIdx = parseInt(window.editingComboIdx);
                }
            }

            let previousFull = [...(window.manualComboAssignments || new Array(baseComboData.length).fill(null))];
            extras.forEach(ex => { previousFull.push(ex.time ? { time: ex.time, specialist: ex.specialist } : null); });

            // ── LÓGICA CLAVE ─────────────────────────────────────────────────────
            // Usar la captura PRE-MODIFICACIÓN: si otros servicios ya tenían hora → solo mover este.
            // Si ninguno tenía hora OR la fecha cambió → recalcular todo.
            const dateChanged = window._manualComboLastDate && normDate(modalDate) !== normDate(window._manualComboLastDate);
            const doIndividualOnly = _comboIndividualEdit && !dateChanged;
            window._isIndividualEdit = false; // Limpiar por si acaso

            if (doIndividualOnly) {
                // ── Solo mover el servicio que se seleccionó ─────────────
                if (!window.manualComboAssignments) window.manualComboAssignments = new Array(baseComboData.length).fill(null);
                if (typeof window.editingComboIdx === 'string' && window.editingComboIdx.startsWith('extra_')) {
                    const extraIdx = parseInt(window.editingComboIdx.split('_')[1]);
                    if (window.manualComboExtras[extraIdx]) {
                        window.manualComboExtras[extraIdx].time = time;
                        window.manualComboExtras[extraIdx].specialist = specialist;
                    }
                } else {
                    window.manualComboAssignments[targetIdx] = { time, specialist, specialistId: specialist };
                }
            } else {
                // ── Primera asignación: calcular todos los servicios inteligentemente ─
                const tempAssignments = calculateSmartAssignments(time, fullComboData, targetIdx, specialist, null, modalDate);

                // Si el motor devuelve null, los servicios no caben en el día
                if (!tempAssignments) {
                    const toast = window.showAdminToast || window.showToast;
                    if (toast) toast('⚠️ Los servicios no caben en el horario disponible. Elige una hora más temprana o agenda al día siguiente.', 'error');
                    return;
                }

                window.manualComboAssignments = tempAssignments.slice(0, baseComboData.length);
                tempAssignments.slice(baseComboData.length).forEach((res, i) => {
                    if (window.manualComboExtras[i] && res) {
                        window.manualComboExtras[i].time = res.time;
                        window.manualComboExtras[i].specialist = res.specialist;
                    }
                });
            }

            window._manualComboLastDate = modalDate;

            // RENDERIZADO DEL RESUMEN SIN COLORES ROSADOS FIJOS
            let breakdownHtml = `
                <div style="margin-top:6px; border:1px solid rgba(var(--accent-rgb), 0.1); border-radius:12px; background:#fff; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                    <div style="background:rgba(var(--accent-rgb), 0.05); padding:8px 12px; border-bottom:1px solid rgba(var(--accent-rgb), 0.1); display:flex; justify-content:center; align-items:center;">
                        <span style="font-size:0.65rem; font-weight:800; color:var(--color-dark-pink); text-transform:uppercase; letter-spacing:1px; text-align:center;"><i class="fas fa-calendar-alt"></i> CRONOGRAMA DE CITAS</span>
                    </div>
                    <div class="custom-scrollbar" style="padding:8px; display:block; max-height:210px; overflow-y:auto;">`;

            // 1. Servicios Base
            baseComboData.forEach((s, idx) => {
                const assigned = window.manualComboAssignments[idx];
                const sTime = assigned ? to12h(assigned.time) : 'Por asignar';
                const sSpec = assigned ? assigned.specialist : '-';
                const rawG = getSGrp(s.cat);
                const sGrp = rawG ? rawG.toString().trim().toUpperCase() : "";
                const sGrpDisplay = sGrp ? `<span style="background:rgba(var(--accent-rgb), 0.1); color:var(--color-dark-pink); padding:1px 4px; border-radius:4px; font-size:0.55rem; margin-right:4px; border:1px solid rgba(var(--accent-rgb), 0.2); font-weight:800;">[${sGrp}]</span>` : '';

                breakdownHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f9f9f9; background:#fff; border-radius:10px; margin-bottom:6px; transition:0.2s; border: ${window.editingComboIdx === idx ? '1.5px solid var(--color-dark-pink)' : '1px solid #eee'}; box-shadow: 0 2px 4px rgba(0,0,0,0.02); overflow:hidden;">
                        <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; text-align:left;">
                            <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:700; color:#333; overflow:hidden;">
                                ${sGrpDisplay}
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${s.title}</span>
                            </div>
                            <span style="font-size:0.62rem; font-weight:700; color:${assigned ? 'var(--color-dark-pink)' : '#aaa'}; margin-top:2px;">${sTime} | ${s.duration} min</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; flex-shrink:0; margin-left:10px;">
                            <span style="font-size:0.65rem; font-weight:700; color:#888; text-align:right; min-width:50px;">${sSpec}</span>
                            <button onclick="window.editComboService(${idx})" type="button" style="background:${assigned ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--color-dark-pink)'}; border:none; width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:0.65rem; font-weight:800; color:${assigned ? 'var(--color-dark-pink)' : '#fff'}; display:flex; align-items:center; justify-content:center; transition:0.2s;"><i class="fas ${assigned ? 'fa-sync-alt' : 'fa-clock'}"></i></button>
                        </div>
                    </div>`;
            });

            // 2. Servicios Extras
            extras.forEach((ex, idx) => {
                const eIdx = `extra_${idx}`;
                const sTime = ex.time ? to12h(ex.time) : 'Por asignar';
                const sSpec = ex.specialist || '-';
                // Mostrar letra de grupo de simultaneidad igual que los servicios base
                const rawEG = getSGrp(ex.cat || ex.category || ex.catId || '');
                const eGrp = rawEG ? rawEG.toString().trim().toUpperCase() : '';
                const eGrpDisplay = eGrp
                    ? `<span style="background:rgba(var(--accent-rgb), 0.1); color:var(--color-dark-pink); padding:1px 4px; border-radius:4px; font-size:0.55rem; margin-right:4px; border:1px solid rgba(var(--accent-rgb), 0.2); font-weight:800;">[${eGrp}]</span>`
                    : '';

                breakdownHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f9f9f9; background:rgba(var(--accent-rgb), 0.02); border-radius:10px; margin-bottom:6px; border: ${window.editingComboIdx === eIdx ? '1.5px solid var(--color-dark-pink)' : '1px dashed rgba(var(--accent-rgb), 0.3)'}; overflow:hidden;">
                        <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; text-align:left;">
                            <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:700; color:#333; overflow:hidden;">
                                ${eGrpDisplay}
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${ex.title}</span>
                                <span style="background:var(--color-dark-pink); color:white; font-size:0.45rem; padding:1px 5px; border-radius:30px; font-weight:800; flex-shrink:0;">EXTRA</span>
                            </div>
                            <span style="font-size:0.62rem; font-weight:700; color:${ex.time ? 'var(--color-dark-pink)' : '#aaa'}; margin-top:2px;">${sTime} | ${ex.duration} min</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; flex-shrink:0; margin-left:10px;">
                            <span style="font-size:0.65rem; font-weight:700; color:#888; text-align:right; min-width:50px;">${sSpec}</span>
                            <button onclick="window.editComboService('${eIdx}')" type="button" style="background:${ex.time ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--color-dark-pink)'}; border:none; width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:0.65rem; font-weight:800; color:${ex.time ? 'var(--color-dark-pink)' : '#fff'}; display:flex; align-items:center; justify-content:center; transition:0.2s;"><i class="fas ${ex.time ? 'fa-sync-alt' : 'fa-clock'}"></i></button>
                        </div>
                    </div>`;
            });


            breakdownHtml += `</div></div>`;
            summaryDateTime.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom: 12px;">
                    <div style="background:#1d395a; color:white; padding:0 15px; border-radius:10px; display:flex; align-items:center; gap:10px; font-weight:800; font-size:0.85rem; height:40px; box-shadow:0 3px 8px rgba(0,0,0,0.1); border:1px solid rgba(160, 93, 107, 0.2); box-sizing:border-box;">
                        <i class="fas fa-calendar-alt"></i> ${modalDate}
                    </div>
                    <button type="button" onclick="window.clearManualComboAssignments()" style="flex:1; justify-content:center; background:#fff2f2; border:1px solid #ffcccc; color:#d9534f; cursor:pointer; font-weight:900; font-size:0.75rem; padding:0 15px; border-radius:10px; letter-spacing:0.8px; display:flex; align-items:center; gap:8px; transition:0.2s; height:40px; box-sizing:border-box;" onmouseover="this.style.background='#ffe5e5'; this.style.borderColor='#ffb3b3';" onmouseout="this.style.background='#fff2f2'; this.style.borderColor='#ffcccc';">
                        <i class="fas fa-eraser" style="font-size:0.95rem;"></i> LIMPIAR
                    </button>
                </div>
                ${breakdownHtml}
            `;
        } else {
            summaryDateTime.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="background:var(--color-dark-pink); color:white; padding:6px 12px; border-radius:6px; display:inline-block; font-weight:700; font-size:0.8rem; letter-spacing:0.5px; box-shadow:0 3px 8px rgba(var(--accent-rgb), 0.15);">
                        <i class="far fa-calendar-alt"></i> ${modalDate} — ${to12h(time)}
                    </div>
                    <button onclick="window.openManualVisualAgenda()" type="button" style="background:rgba(var(--accent-rgb), 0.05); border:1px solid rgba(var(--accent-rgb), 0.1); padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.6rem; font-weight:800; color:var(--color-dark-pink); transition:0.2s;"><i class="fas fa-sync-alt"></i></button>
                </div>
            `;
        }
        
        // Manejo de visibilidad de nombre e imagen
        const nameEl = document.getElementById('summary-spec-name');
        const imgContainer = document.getElementById('summary-spec-img');
        const isCombo = (selectedSvc && selectedSvc.dataset.isCombo === 'true');
        const specWrapper = nameEl ? nameEl.parentElement : null;
        const summaryBox = document.getElementById('manual-selection-summary');
        
        if (isCombo) {
            if (specWrapper) specWrapper.style.display = 'none';
            if (summaryBox) {
                summaryBox.style.border = 'none';
                summaryBox.style.background = 'transparent';
                summaryBox.style.padding = '0';
            }
        } else {
            if (specWrapper) specWrapper.style.display = 'flex';
            if (summaryBox) {
                summaryBox.style.border = '1px solid rgba(var(--accent-rgb), 0.1)';
                summaryBox.style.background = 'rgba(var(--accent-rgb), 0.01)';
                summaryBox.style.padding = '0 10px';
            }
            if (nameEl) {
                nameEl.innerText = specialist;
            }
            if (imgContainer) {
                const specialists = JSON.parse(localStorage.getItem('margarita_specialists') || '[]');
                const specData = specialists.find(s => (s.name || s) === specialist);
                if (specData && specData.image) {
                    imgContainer.innerHTML = `<img src="${specData.image}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    imgContainer.innerHTML = `<i class="fas fa-user-circle" style="color: #ccc; font-size: 1.5rem;"></i>`;
                }
            }
        }
    }

    window.renderManualVisualAgendaGrid();
    if (window.checkManualFormCompletion) checkManualFormCompletion();
    showToast(`Turno seleccionado: ${specialist} a las ${to12h(time)}`, "success");
};

window.resetManualFormUI = function() {
    const summaryContainer = document.getElementById('manual-selection-summary-container');
    const mainBtn = document.getElementById('manual-form-agenda-btn-container');
    const saveBtn = document.getElementById('manual-save-btn');
    const specSelect = document.getElementById('manual-specialist');
    const dateInput = document.getElementById('manual-date');
    const timeInput = document.getElementById('manual-time');

    if (summaryContainer) summaryContainer.style.display = 'none';
    if (mainBtn) mainBtn.style.display = 'block';
    if (saveBtn) {
        saveBtn.style.opacity = '0.5';
        saveBtn.style.pointerEvents = 'none';
    }
    if (specSelect) specSelect.innerHTML = '';
    if (dateInput) dateInput.value = '';
    if (timeInput) timeInput.value = '';
    
    // Limpiar panel de extras del combo
    const leftPanel = document.getElementById('combo-extra-left-panel');
    if (leftPanel) { leftPanel.style.display = 'none'; leftPanel.innerHTML = ''; }
    window.manualComboExtras = [];
    
    // Deshabilitar botón de agenda al resetear (solo si no hay servicio seleccionado)
    const agendaBtn = document.getElementById('main-agenda-trigger-btn');
    const svcSelect2 = document.getElementById('manual-service-select');
    if (agendaBtn) {
        if (!svcSelect2 || svcSelect2.selectedIndex === 0 || svcSelect2.value === "") {
            agendaBtn.style.opacity = '0.5';
            agendaBtn.style.pointerEvents = 'none';
        } else {
            agendaBtn.style.opacity = '1';
            agendaBtn.style.pointerEvents = 'all';
        }
    }
};

window.clearManualComboAssignments = function() {
    const svcSelect = document.getElementById('manual-service-select');
    if (!svcSelect || svcSelect.selectedIndex <= 0) {
        window.manualComboAssignments = null;
        window._manualComboLastDate = null;
        window.editingComboIdx = undefined;
        window.resetManualFormUI();
        return;
    }

    const selectedSvc = svcSelect.options[svcSelect.selectedIndex];
    if (selectedSvc.dataset.isCombo === 'true') {
        window.manualComboAssignments = null;
        window._manualComboLastDate = null;
        window.editingComboIdx = undefined;

        // Limpiar TAMBIÉN los tiempos de extras para evitar estado obsoleto
        if (window.manualComboExtras) {
            window.manualComboExtras.forEach(ex => {
                ex.time = null;
                ex.specialist = null;
                ex.specialistId = null;
            });
        }

        // Resetear flag de edición individual
        window._pendingIndividualEdit = null;

        // Limpiar inputs
        const dateInput = document.getElementById('manual-date');
        const timeInput = document.getElementById('manual-time');
        const specSel = document.getElementById('manual-specialist');
        const saveBtn = document.getElementById('manual-save-btn');
        
        if (dateInput) dateInput.value = '';
        if (timeInput) timeInput.value = '';
        if (specSel) specSel.value = '';
        if (saveBtn) {
            saveBtn.style.opacity = '0.5';
            saveBtn.style.pointerEvents = 'none';
        }
        
        // Renderizar el cronograma vacío nuevamente
        window.initializeComboSummary(selectedSvc);
        if (typeof showToast !== 'undefined') showToast("Horarios del combo limpiados", "success");

        // Reactivar el botón de agenda si hiciera falta (initializeComboSummary normalmente ocula el botón y muestra el container)
        const agendaBtn = document.getElementById('main-agenda-trigger-btn');
        if(agendaBtn) {
            agendaBtn.style.opacity = '1';
            agendaBtn.style.pointerEvents = 'all';
        }
    } else {
        window.manualComboAssignments = null;
        window.editingComboIdx = undefined;
        window.resetManualFormUI();
    }
};

window.manualCart = [];

window.addToManualCart = function() {
    const svcSelect = document.getElementById('manual-service-select');
    if (!svcSelect || svcSelect.selectedIndex <= 0) return;
    
    const selectedSvc = svcSelect.options[svcSelect.selectedIndex];
    if (selectedSvc.dataset.isCombo === 'true') {
        showToast("No puedes añadir un combo prearmado dentro de otro paquete.", "error");
        return;
    }

    const catSelect = document.getElementById('manual-category-select');
    const catName = catSelect.options[catSelect.selectedIndex].text.replace(/ \(.*$/, '');
    const svcTitle = selectedSvc.dataset.name || selectedSvc.value;

    const isDuplicate = window.manualCart && window.manualCart.some(item => item.title === svcTitle);
    if (isDuplicate) {
        showToast(`⚠️ El servicio "${svcTitle}" ya está en el paquete.`, "error");
        return;
    }
    
    // Tomamos el precio ORIGINAL del catálogo como base (svc.price)
    // El precio efectivo (con descuento) se manejará en el total del pack y splitPrice
    const originalPriceStr = selectedSvc.dataset.originalPrice || selectedSvc.dataset.price || "$0";
    const originalPriceNum = parseInt(originalPriceStr.replace(/[^\d]/g, '')) || 0;

    const item = {
        title: svcTitle,
        price: originalPriceStr, // Guardamos el precio BASE
        originalPrice: originalPriceStr,
        priceNum: originalPriceNum,
        img: selectedSvc.dataset.img || "",
        duration: parseInt(selectedSvc.dataset.duration) || 60,
        cat: catSelect.value,
        catName: catName
    };

    // Si ya hay un servicio de la misma categoría, lo reemplazamos
    const existingIndex = window.manualCart.findIndex(i => i.cat === item.cat);
    if (existingIndex !== -1) {
        window.manualCart[existingIndex] = item;
        showToast(`🔄 Servicio de "${catName}" actualizado en el paquete.`, "info");
    } else {
        window.manualCart.push(item);
        showToast(`✅ "${svcTitle}" añadido al paquete.`, "success");
    }
    
    window.renderManualCart();
    window.checkManualFormCompletion();
};

window.renderManualCart = function() {
    const container = document.getElementById('manual-cart-container');
    const itemsDiv = document.getElementById('manual-cart-items');
    const totalEl = document.getElementById('manual-cart-total');
    if (!container || !itemsDiv || !totalEl) return;
    
    const svcSelect = document.getElementById('manual-service-select');
    const isEditingConfirm = svcSelect && svcSelect.value === 'custom-cart-pack';
    const scheduler = document.getElementById('manual-selection-summary-container');

    const agendaBtnContainer = document.getElementById('manual-form-agenda-btn-container');
    
    if (!window.manualCart || window.manualCart.length === 0 || isEditingConfirm) {
        container.style.display = 'none';
        if (agendaBtnContainer) agendaBtnContainer.style.display = 'flex';
        if (!window.manualCart || window.manualCart.length === 0) return;
    } else {
        container.style.display = 'block';
        // Si mostramos el constructor, por SEGURIDAD ocultamos el programador y el botón principal de turno
        if (scheduler) scheduler.style.display = 'none';
        if (agendaBtnContainer) agendaBtnContainer.style.display = 'none';
    }
    
    // Ocultar el resumen de seleccion individual si el carrito está activo
    const individualSummary = document.getElementById('manual-selection-summary-container');
    // Solamente ocultamos si el carrito tiene items y NO estamos en modo confirmacion
    if (individualSummary && !isEditingConfirm && window.manualCart.length > 0) {
         individualSummary.style.display = 'none';
    }

    itemsDiv.innerHTML = '';
    let total = 0;
    window.manualCart.forEach((item, index) => {
        total += item.priceNum;
        itemsDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:8px 12px; border-radius:12px; border:1px solid rgba(0,0,0,0.05); box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                <div style="display:flex; flex-direction:column; max-width: 80%;">
                    <span style="font-weight:800; color:#1a1a1a; font-size:0.8rem;">${item.title}</span>
                    <span style="color:#999; font-size:0.65rem; font-weight:600;">${item.catName} • ${item.duration} min</span>
                </div>
                <i class="fas fa-times-circle" style="color:#e74c3c; cursor:pointer; font-size:1.1rem; opacity:0.6; transition:0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" onclick="window.removeManualCartItem(${index})"></i>
            </div>
        `;
    });
    
    totalEl.innerText = `$${total.toLocaleString('es-CO').replace(/,/g, '.')}`;
    window.injectManualCartAsOption(total, false);

    // Si por alguna razón los datos cambiaron mientras estábamos en el cronograma, refrescamos el cronograma
    if (isEditingConfirm) {
        const opt = Array.from(svcSelect.options).find(o => o.value === 'custom-cart-pack');
        if (opt && window.initializeComboSummary) {
            window.initializeComboSummary(opt);
        }
    }
};

window.removeManualCartItem = function(index) {
    if(window.manualCart) window.manualCart.splice(index, 1);
    window.manualComboAssignments = null;
    window.resetManualFormUI();
    window.renderManualCart();
    window.checkManualFormCompletion();
};

window.clearManualCart = function() {
    window.manualCart = [];
    window.manualComboAssignments = null;
    window.resetManualFormUI();
    window.renderManualCart();
    window.checkManualFormCompletion();
};

window.confirmManualCart = function() {
    if (!window.manualCart || window.manualCart.length === 0) return;
    
    if (window.manualCart.length < 2) {
        showToast("Por favor, añade 2 o más servicios para crear un paquete.", "error");
        return;
    }

    const total = window.manualCart.reduce((sum, i) => sum + i.priceNum, 0);
    window.injectManualCartAsOption(total, true);
    
    // HIDE BUILDER IMMEDIATELY
    const container = document.getElementById('manual-cart-container');
    if (container) container.style.display = 'none';

    window.updateManualPrice();
    showToast("¡Paquete confirmado! Ahora elige los horarios.", "success");
};

window.injectManualCartAsOption = function(totalPrice, autoSelect = false) {
    const svcSelect = document.getElementById('manual-service-select');
    if(!svcSelect) return;
    
    let existingOpt = Array.from(svcSelect.options).find(o => o.value === 'custom-cart-pack');
    let totalDuration = window.manualCart.reduce((sum, i) => sum + i.duration, 0);
    const priceFormatted = `$${totalPrice.toLocaleString('es-CO').replace(/,/g, '.')}`;
    const comboTitle = `📦 MI PAQUETE (${window.manualCart.length})`;
    
    if (existingOpt) {
        existingOpt.dataset.price = priceFormatted;
        existingOpt.dataset.comboData = JSON.stringify(window.manualCart);
        existingOpt.dataset.duration = totalDuration;
        existingOpt.innerText = `📦 ${comboTitle} - ${priceFormatted}`;
        existingOpt.style.display = 'none';
        existingOpt.hidden = true;
        if (autoSelect) svcSelect.value = 'custom-cart-pack';
    } else {
        const opt = document.createElement('option');
        opt.value = 'custom-cart-pack';
        opt.innerText = `📦 ${comboTitle} - ${priceFormatted}`;
        opt.style.display = 'none';
        opt.hidden = true;
        opt.dataset.price = priceFormatted;
        opt.dataset.name = "Mi Paquete Armado";
        opt.dataset.duration = totalDuration;
        opt.dataset.isCombo = 'true';
        opt.dataset.comboData = JSON.stringify(window.manualCart);
        svcSelect.insertBefore(opt, svcSelect.children[1]);
        if (autoSelect) svcSelect.value = 'custom-cart-pack';
    }
};

window.checkManualFormCompletion = function() {
    const nameEl = document.getElementById('manual-name');
    const phoneEl = document.getElementById('manual-phone');
    const catSelect = document.getElementById('manual-category-select');
    const svcSelect = document.getElementById('manual-service-select');
    
    if (!nameEl || !phoneEl || !catSelect || !svcSelect) return;

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const hasCat = catSelect.selectedIndex > 0;
    const hasSvc = svcSelect.selectedIndex > 0;
    
    // Control botón "Añadir al Paquete"
    const addCartBtn = document.getElementById('manual-add-cart-btn');
    if (addCartBtn) {
        // Si es un combo prearmado, ocultar el botón por completo
        const isAlreadyCombo = hasSvc && svcSelect.options[svcSelect.selectedIndex].dataset.isCombo === 'true';
        
        if (isAlreadyCombo) {
            addCartBtn.style.display = 'none';
        } else {
            addCartBtn.style.display = 'flex';
            if (hasCat && hasSvc) {
                addCartBtn.style.opacity = '1';
                addCartBtn.style.pointerEvents = 'auto';
            } else {
                addCartBtn.style.opacity = '0.5';
                addCartBtn.style.pointerEvents = 'none';
            }
        }
    }
    
    const agendaBtn = document.getElementById('main-agenda-trigger-btn');
    if (agendaBtn) {
        if (name.length >= 2 && hasCat && hasSvc) {
            agendaBtn.style.opacity = '1';
            agendaBtn.style.pointerEvents = 'auto';
        } else {
            agendaBtn.style.opacity = '0.5';
            agendaBtn.style.pointerEvents = 'none';
        }
    }

    const hasTurn = (document.getElementById('manual-specialist').value || "").length > 0 && 
                    (document.getElementById('manual-date').value || "").length > 0 && 
                    (document.getElementById('manual-time').value || "").length > 0;

    let comboComplete = true;
    const isCombo = (svcSelect && svcSelect.selectedIndex > 0 && svcSelect.options[svcSelect.selectedIndex].dataset.isCombo === 'true');
    if (isCombo) {
        if (!window.manualComboAssignments || window.manualComboAssignments.length === 0 || window.manualComboAssignments.some(a => !a)) {
            comboComplete = false;
        }
        if (window.manualComboExtras && window.manualComboExtras.some(e => !e.time || !e.specialist)) {
            comboComplete = false;
        }
    }

    const saveBtn = document.getElementById('manual-save-btn');
    if (saveBtn) {
        // Reducimos restricción de teléfono de 10 a mínimo 7 para evitar bloqueos por formato
        const canSave = name.length >= 2 && (phone.length >= 7 || phone === 'N/A') && hasSvc && (isCombo ? comboComplete : hasTurn);
        
        if (canSave) {
            saveBtn.style.opacity = '1';
            saveBtn.style.background = 'var(--color-accent)';
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.innerText = 'AGENDAR CITA';
        } else {
            saveBtn.style.opacity = '0.3';
            saveBtn.style.background = '#ccc';
            saveBtn.style.pointerEvents = 'none';
            if (isCombo && !comboComplete && hasTurn) {
                saveBtn.innerText = 'PENDIENTE HORARIO';
            } else {
                saveBtn.innerText = 'AGENDAR CITA';
            }
        }
    }
};

window.renderManualVisualAgendaGrid = function() {
    const canvas = document.getElementById('manual-grid-canvas');
    const selectedDateInput = document.getElementById('manual-agenda-date');
    const catSelect = document.getElementById('manual-category-select');
    if (!canvas || !selectedDateInput) return;

    // --- 1. PRESERVAR SCROLL MANUALMENTE ---
    let preservedScrollLeft = 0;
    let preservedScrollTop = 0;
    if (canvas.firstElementChild) {
        preservedScrollLeft = canvas.firstElementChild.scrollLeft || 0;
        preservedScrollTop = canvas.firstElementChild.scrollTop || 0;
    }

    try {
        // Solo mostrar 'cargando' si el canvas no tiene la tabla ya dibujada
        if (!canvas.innerHTML.includes('<table')) {
            canvas.innerHTML = '<div style="text-align:center; padding:50px; color:#999;"><i class="fas fa-spinner fa-spin"></i> Cargando agenda...</div>';
        }

        const selectedDate = selectedDateInput.value;
        const selectedCatId = catSelect ? catSelect.value : '';
        const selectedCatName = catSelect && catSelect.selectedIndex > 0 ? catSelect.options[catSelect.selectedIndex].text : '';

        const specialists  = JSON.parse(localStorage.getItem('margarita_specialists') || '[]');
        const appointments = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');
        const simultGroups = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');
        const dbServices   = JSON.parse(localStorage.getItem('margarita_services') || '[]');

        // ── Determinar catId y grupo de simultaneidad del servicio activo ──────────
        let activeCatId = selectedCatId;
        const svcSelect = document.getElementById('manual-service-select');
        const svcOpt = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex] : null;
        const isCmb  = svcOpt && svcOpt.dataset.isCombo === 'true';
        let bookingDur = window.currentManualBookingDuration || 60;
        let cData = [];

        if (isCmb) {
            cData = JSON.parse(svcOpt.dataset.comboData || '[]');
            if (window.editingComboIdx !== undefined) {
                if (typeof window.editingComboIdx === 'string' && window.editingComboIdx.startsWith('extra_')) {
                    const extraIdx = parseInt(window.editingComboIdx.split('_')[1]);
                    const currentExtra = (window.manualComboExtras || [])[extraIdx];
                    if (currentExtra) {
                        activeCatId = currentExtra.cat;
                        bookingDur = parseInt(currentExtra.duration) || 60;
                    }
                } else if (cData[window.editingComboIdx]) {
                    activeCatId = cData[window.editingComboIdx].cat;
                    bookingDur = parseInt(cData[window.editingComboIdx].duration) || 60;
                }
            } else {
                // Para el inicio, bookingDur es el primer servicio, pero usaremos totalRemainingDur para límites
                if (cData[0]) {
                    activeCatId = cData[0].cat;
                    bookingDur = parseInt(cData[0].duration) || 60;
                }
            }
        } else {
            if (svcOpt) {
                bookingDur = parseInt(svcOpt.dataset.duration) || 60;
            }
        }
        
        // ── Normalización Reforzada (Acentos y Vocales) ──────────────────────────
        const nrm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const getSGrp = (cId) => window.getSimultGroup(cId);
        const activeSimultGroup = getSGrp(activeCatId);

        const normalize = (s) => nrm(s); // Puente para compatibilidad
        const normCat   = (s) => normalize(s).replace(/[&\/\-,\.\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
        const catMatch  = (a, b) => {
            const na = normCat(a), nb = normCat(b);
            if (na === nb || nb.includes(na) || na.includes(nb)) return true;
            const aw = na.split(' ').filter(w => w.length > 2);
            const bw = nb.split(' ').filter(w => w.length > 2);
            return aw.some(x => bw.some(y => x === y || x.includes(y) || y.includes(x)));
        };
        const normDate  = (d) => {
            if (!d) return '';
            const p = d.split(/[-/]/);
            if (p.length < 3) return d;
            return p[0].length === 4
                ? `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`
                : `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        };
        const getMin    = (t) => window.parseTimeToMins(t);
        const fM        = (m) => {
            const h = Math.floor(m / 60), mm = String(m % 60).padStart(2,'0');
            return `${h % 12 || 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
        };

        // ── Fecha / hora actual real (LOCAL) ──────────────────────────────────────
        const nowObj    = new Date();
        const todayStr  = `${nowObj.getFullYear()}-${String(nowObj.getMonth()+1).padStart(2,'0')}-${String(nowObj.getDate()).padStart(2,'0')}`;
        const isToday   = normDate(selectedDate) === todayStr;
        const nowMin    = nowObj.getHours() * 60 + nowObj.getMinutes();
        const calDate   = normDate(selectedDate);

        // ── Especialistas activos filtrados por especialidad ──────────────────────
        // ── Filtrado de Citas del Día ──────────────────────────────────────────
        const dayApts = appointments.filter(a => {
            const aDate = normDate(a.date);
            if (aDate !== calDate) return false;
            const st = (a.status || "").toLowerCase().trim();
            // Ignorar canceladas, rechazadas Y finalizadas (accepted) para liberar el espacio
            return st !== "cancelled" && st !== "rejected" && st !== "accepted";
        });

        const isSpecFree = (specName, startMin, dur) => {
            const nN = nrm(specName);
            if (!nN) return false;
            const endMin = startMin + dur;
            return !dayApts.some(a => {
                if (nrm(a.specialist) !== nN) return false;
                const aS = getMin(a.time), aD = parseInt(a.duration || 60);
                const aE = aS + aD;
                return (startMin < aE && (startMin + dur) > aS);
            });
        };

        let activeSpecs = specialists
            .filter(s => typeof s === 'string' || s.active !== false)
            .map(s => typeof s === 'string' ? { name: s, specialty: 'Todos' } : s);

        if (selectedCatId) {
            activeSpecs = activeSpecs.filter(s => {
                const specList = (s.specialty || 'Todos').split(',').map(sp => normalize(sp));
                if (specList.includes('todos')) {
                    s.canDoActive = true;
                    return true;
                }

                const selSvc = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex] : null;
                const isFormCombo = selectedCatId === 'combo-active' || (selSvc && selSvc.dataset.isCombo === 'true');
                
                if (isFormCombo) {
                    if (selSvc && selSvc.dataset.isCombo === 'true') {
                        const comboData = JSON.parse(selSvc.dataset.comboData || '[]');
                        if (window.manualComboExtras) {
                            window.manualComboExtras.forEach((ex, i) => { comboData['extra_' + i] = ex; });
                        }

                        const reqs = [];
                        for(let k in comboData) {
                            if(comboData[k] && (comboData[k].cat || comboData[k].category || comboData[k].catId)) {
                                reqs.push(normalize(comboData[k].cat || comboData[k].category || comboData[k].catId));
                            }
                        }
                        const uniqueReqs = [...new Set(reqs)];
                        // Must be able to do AT LEAST ONE component to appear
                        const canDoAny = uniqueReqs.length === 0 ? true : uniqueReqs.some(req => specList.some(sp => catMatch(sp, req)));
                        
                        if (window.editingComboIdx !== undefined && comboData[window.editingComboIdx]) {
                            const svcItem = comboData[window.editingComboIdx];
                            const reqCat = normalize(svcItem.cat || svcItem.category || svcItem.catId || '');
                            s.canDoActive = reqCat ? specList.some(sp => catMatch(sp, reqCat)) : true;
                        } else {
                            s.canDoActive = canDoAny;
                        }
                        
                        // Mostrar siempre especialistas YA asignados
                        let isAssigned = false;
                        if (window.manualComboAssignments) {
                            isAssigned = window.manualComboAssignments.some(asn => asn && asn.specialist && normalize(asn.specialist) === normalize(s.name));
                        }
                        if (!isAssigned && window.manualComboExtras) {
                            isAssigned = window.manualComboExtras.some(ex => ex && ex.time && ex.specialist && normalize(ex.specialist) === normalize(s.name));
                        }
                        
                        return canDoAny || isAssigned;
                    }
                    s.canDoActive = true;
                    return true;
                }
                const canDo = specList.some(sp => catMatch(sp, selectedCatName));
                s.canDoActive = canDo;
                return canDo;
            });
        } else {
            activeSpecs.forEach(s => s.canDoActive = true);
        }

        if (activeSpecs.length === 0) {
            canvas.innerHTML = `<div style="padding:40px; text-align:center; color:#a94442; background:#f2dede; border-radius:15px; border:1px dashed #ebccd1;">
                <i class="fas fa-exclamation-circle" style="font-size:3rem; margin-bottom:15px; opacity:0.8;"></i>
                <h3 style="margin:0 0 10px; font-size:1.2rem; font-weight:800;">Sin Profesionales</h3>
                <p style="margin:0; font-size:0.9rem;">No hay profesionales disponibles para la especialidad seleccionada.</p>
            </div>`;
            return;
        }


        // ── Combo: leer datos actuales para superposición ─────────────────────────
        const cmbSvcEl  = document.getElementById('manual-service-select');
        const cmbSelOpt = cmbSvcEl && cmbSvcEl.selectedIndex > 0 ? cmbSvcEl.options[cmbSvcEl.selectedIndex] : null;
        const comboData = JSON.parse(cmbSelOpt && cmbSelOpt.dataset.isCombo === 'true' ? cmbSelOpt.dataset.comboData || '[]' : '[]');
        if (window.manualComboExtras) {
            window.manualComboExtras.forEach((ex, i) => { comboData['extra_' + i] = ex; });
        }
        const savedFormDate = document.getElementById('manual-date') ? document.getElementById('manual-date').value : '';
        const isSameDayAssignment = (window._manualComboLastDate && normDate(selectedDate) === normDate(window._manualComboLastDate));

        // ── Horas ─────────────────────────────────────────────────────────────────
        let hours = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
        if (isToday) hours = hours.filter(h => parseInt(h.split(':')[0]) >= nowObj.getHours());
        const rowH = 90;

        // ── HTML ──────────────────────────────────────────────────────────────────
        let html = `
        <div style="overflow-x:auto; border-radius:15px; background:white; box-shadow:0 10px 30px rgba(0,0,0,0.1); -webkit-overflow-scrolling:touch; overflow-anchor:none;">
            <table class="responsive-agenda-grid" style="width:100%; border-collapse:collapse; min-width:700px; font-family:'Montserrat',sans-serif; table-layout:fixed;">
                <thead style="background:#fdfdfd; border-bottom:2px solid #f0f0f0;">
                    <tr>
                        <th style="width:80px; padding:20px; color:#555; text-transform:uppercase; font-size:0.75rem;">Hora</th>
                        ${activeSpecs.map(s => `
                        <th style="padding:15px; color:#333; text-transform:uppercase; font-size:0.75rem; border-left:1px solid #eee;">
                            <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
                                ${s.image ? `<img src="${s.image}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--color-dark-pink);">` : `<div style="width:40px;height:40px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;"><i class="fas fa-user-circle"></i></div>`}
                                <span style="font-weight:800;">${s.name}</span>
                            </div>
                        </th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${hours.map(hour => {
                        const hStart = parseInt(hour.split(':')[0]);
                        return `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="height:${rowH}px; text-align:center; color:#777; font-weight:700; background:#fafafa; border-right:1px solid #eee;">${window.formatTime12h(hour)}</td>
                            ${activeSpecs.map((spec, sIdx) => {
                                    const sName = typeof spec === "object" ? spec.name : spec;
                                    const nSpec = normalize(sName);
                                    const cols = [{bg:"#fdf2f5",b:"#e56a9e",t:"#d63384"},{bg:"#f6f1ff",b:"#a58eff",t:"#7b4fff"},{bg:"#f0f9ff",b:"#7cc2ff",t:"#0088ff"}];
                                    const sCol = cols[sIdx % cols.length];

                                    const slots = [`${hStart}:00`, `${hStart}:30`].map(timeStr => {
                                        const t       = timeStr.padStart(5, "0");
                                        const slotMin = getMin(t);
                                        const eMin    = slotMin + bookingDur;

                                        // ── 1. ¿Es la selección previa (servicio simple)? ──────────────────
                                        let isYour = false;
                                        if (!isCmb && !window.manualComboAssignments) {
                                            const curSpec = document.getElementById("manual-specialist") ? document.getElementById("manual-specialist").value : "";
                                            const curTime = document.getElementById("manual-time") ? document.getElementById("manual-time").value : "";
                                            if (calDate === savedFormDate && curTime && normalize(curSpec) === nSpec && getMin(curTime) === slotMin) {
                                                isYour = true;
                                            }
                                        }

                                        // ── 2. ¿DB ocupado para este profesional? ──────────────────
                                        const aptInSlot = dayApts.find(a => normalize(a.specialist || "") === nSpec && getMin(a.time) <= slotMin && (getMin(a.time) + (parseInt(a.duration) || 60)) > slotMin);
                                        const dayStart  = dayApts.filter(a => normalize(a.specialist || "") === nSpec && getMin(a.time) === slotMin);
                                        const isEmpty   = !aptInSlot && !isYour;

                                        // ── 3. Lógica de Conflictos e Inteligencia ──────────────────
                                        let conf = false;
                                        let canStartHere = false;

                                        if (isEmpty) {
                                            const clientInput = document.getElementById("manual-client-name");
                                            const manualClientName = clientInput ? normalize(clientInput.value) : "";

                                             const anchorDur = isCmb
                                                ? (comboData[window.editingComboIdx !== undefined ? window.editingComboIdx : 0] ? (parseInt(comboData[window.editingComboIdx !== undefined ? window.editingComboIdx : 0].duration) || 60) : bookingDur)
                                                : bookingDur;
                                             const eMin = slotMin + anchorDur;

                                             const getClientConflict = (sMin, eMinVal) => {
                                                if (calDate === savedFormDate) {
                                                    // Conflictos base
                                                    if (window.manualComboAssignments) {
                                                         const hasComboConflict = window.manualComboAssignments.some((assigned, cIdx) => {
                                                             if (window.editingComboIdx !== undefined && cIdx === window.editingComboIdx) return false;
                                                             if (!assigned || !assigned.time) return false;
                                                             const iS = getMin(assigned.time), iD = comboData[cIdx] ? (parseInt(comboData[cIdx].duration) || 60) : 60;
                                                             const overlap = sMin < (iS + iD) && eMinVal > iS;
                                                             if (!overlap) return false;
                                                             const oCat = comboData[cIdx] ? comboData[cIdx].cat : "";
                                                             const oGrp = (getSGrp(oCat) || "").toString().trim().toUpperCase();
                                                             const currentGrp = (activeSimultGroup || "").toString().trim().toUpperCase();
                                                             return !(currentGrp && oGrp && currentGrp === oGrp);
                                                         });
                                                         if (hasComboConflict) return true;
                                                    }
                                                    // Conflictos extras
                                                    if (window.manualComboExtras) {
                                                        const hasExtraConflict = window.manualComboExtras.some((ex, exIdx) => {
                                                            const strIdx = 'extra_' + exIdx;
                                                            if (window.editingComboIdx !== undefined && window.editingComboIdx === strIdx) return false;
                                                            if (!ex || !ex.time) return false;
                                                            const iS = getMin(ex.time), iD = parseInt(ex.duration) || 60;
                                                            const overlap = sMin < (iS + iD) && eMinVal > iS;
                                                            if (!overlap) return false;
                                                            const oCat = ex.cat || ex.category || ex.catId || "";
                                                            const oGrp = (getSGrp(oCat) || "").toString().trim().toUpperCase();
                                                            const currentGrp = (activeSimultGroup || "").toString().trim().toUpperCase();
                                                            return !(currentGrp && oGrp && currentGrp === oGrp);
                                                        });
                                                        if (hasExtraConflict) return true;
                                                    }
                                                }
                                                if (manualClientName && manualClientName.length > 2) {
                                                     const hasDbConflict = dayApts.some(a => {
                                                         if (normalize(a.name) !== manualClientName) return false;
                                                         const aS = getMin(a.time), aE = aS + (parseInt(a.duration) || 60);
                                                         const overlap = sMin < aE && eMinVal > aS;
                                                         if (!overlap) return false;
                                                         const aCatId = (dbServices.find(s => normalize(s.title) === normalize(a.service)) || {}).cat || "";
                                                         const aGrp = (getSGrp(aCatId) || "").toString().trim().toUpperCase();
                                                         const currentGrp = (activeSimultGroup || "").toString().trim().toUpperCase();
                                                         return !(currentGrp && aGrp && currentGrp === aGrp);
                                                     });
                                                     if (hasDbConflict) return true;
                                                }
                                                return false;
                                            };

                                            const currentSlotConflict = getClientConflict(slotMin, slotMin + 30);
                                            const entireDurationConflict = getClientConflict(slotMin, eMin);
                                            
                                            // Solo mostramos el texto "CRUCE" si el cliente está ocupado en ESTE slot de 30 min.
                                            // Pero bloqueamos el inicio (canStartHere) si el servicio completo choca con algo.
                                            conf = currentSlotConflict; 


                                            const overlapDB = !isSpecFree(nSpec, slotMin, anchorDur);

                                            const overlapComboSpec = (() => {
                                                if (calDate !== savedFormDate) return false;
                                                if (window.manualComboAssignments) {
                                                    const hasBase = window.manualComboAssignments.some((assigned, cIdx) => {
                                                        if (window.editingComboIdx !== undefined && cIdx === window.editingComboIdx) return false;
                                                        if (!assigned || !assigned.time || !assigned.specialist) return false;
                                                        if (normalize(assigned.specialist) !== nSpec) return false;
                                                        const iS = getMin(assigned.time), iD = comboData[cIdx] ? (parseInt(comboData[cIdx].duration) || 60) : 60;
                                                        return slotMin < (iS + iD) && eMin > iS;
                                                    });
                                                    if (hasBase) return true;
                                                }
                                                if (window.manualComboExtras) {
                                                    const hasExtra = window.manualComboExtras.some((ex, exIdx) => {
                                                        const strIdx = 'extra_' + exIdx;
                                                        if (window.editingComboIdx !== undefined && strIdx === window.editingComboIdx) return false;
                                                        if (!ex || !ex.time || !ex.specialist) return false;
                                                        if (normalize(ex.specialist) !== nSpec) return false;
                                                        const iS = getMin(ex.time), iD = parseInt(ex.duration) || 60;
                                                        return slotMin < (iS + iD) && eMin > iS;
                                                    });
                                                    if (hasExtra) return true;
                                                }
                                                return false;
                                            })();

                                            // Para combos: solo validamos que el servicio ancla (el que el usuario elige) quepa antes de 8PM.
                                            // El algoritmo inteligente acomodará el resto hacia atrás automáticamente.

                                            canStartHere = !overlapDB && !entireDurationConflict && !overlapComboSpec && (eMin <= 20*60) && !(isToday && slotMin < nowMin);
                                            
                                            // Block clicking if specialist cannot perform the ACTIVE edited service
                                            if (!spec.canDoActive) {
                                                canStartHere = false;
                                                conf = true; // Trigger 'no disponible' visual
                                            }
                                        }

                                        const isPast = isToday && slotMin < nowMin;
                                        const clickable = isEmpty && canStartHere && !isPast && spec.canDoActive !== false;
                                        return { time: t, slotMin, isYour, aptInSlot, dayStart, clickable, isPast, conf, eMin, canDoActive: spec.canDoActive };
                                    });
                                return `
                                <td style="position:relative; height:${rowH}px; padding:0; border-left:1px solid #f0f0f0;">
                                    ${(() => {
                                        return slots.map((sl, idx) => {
                                            const topOffset = idx * 45;
                                            let content = '';

                                            // 1. ZONA CLICKABLE (TRIGGER)
                                            if (sl.clickable) {
                                                const isCurrentEditStart = (() => {
                                                    if (!isSameDayAssignment) return false; // Protección: Si cambiamos de día, no hay edit activo visualmente

                                                    if (!window.manualComboAssignments) {
                                                        const curTimeManual = document.getElementById("manual-time") ? document.getElementById("manual-time").value : "";
                                                        const curSpecManual = document.getElementById("manual-specialist") ? document.getElementById("manual-specialist").value : "";
                                                        if (normalize(curSpecManual) !== nSpec || !curTimeManual) return false;
                                                        const s = getMin(curTimeManual);
                                                        return sl.slotMin === s;
                                                    } else {
                                                        if (window.editingComboIdx === undefined) return false;
                                                        let aTime = null, aSpec = null;
                                                        if (typeof window.editingComboIdx === 'string' && window.editingComboIdx.startsWith('extra_')) {
                                                            const ex = window.manualComboExtras && window.manualComboExtras[parseInt(window.editingComboIdx.split('_')[1])];
                                                            if (ex) { aTime = ex.time; aSpec = ex.specialist; }
                                                        } else {
                                                            const ass = window.manualComboAssignments && window.manualComboAssignments[window.editingComboIdx];
                                                            if (ass) { 
                                                                aTime = ass.time; aSpec = ass.specialist; 
                                                            }
                                                        }
                                                        if (normalize(aSpec) !== nSpec || !aTime) return false;
                                                        const s = getMin(aTime);
                                                        return sl.slotMin === s;
                                                    }
                                                })();

                                                content += `
                                                <div onclick="event.preventDefault(); event.stopPropagation(); window.handleManualGridCellClick('${sl.time}','${sName.replace(/'/g,"\\\\'")}')"
                                                     class="manual-agenda-trigger"
                                                     style="position:absolute; top:${topOffset}px; left:0; width:100%; height:45px; cursor:pointer; z-index:${isCurrentEditStart ? 1500 : 3500}; transition:0.3s; overflow-anchor:none; ${isCurrentEditStart ? 'pointer-events:none;' : ''}">
                                                     <div class="manual-hover-preview" style="position:absolute; top:2px; left:4px; right:4px; height:${(bookingDur/60)*rowH-4}px; border:3px dashed #2c3e50; border-radius:12px; opacity:0; transition:0.2s; pointer-events:none; background:rgba(44, 62, 80, 0.05); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:2000; gap:2px; ${isCurrentEditStart ? 'display:none;' : ''}">
                                                         <div style="font-size:0.65rem; font-weight:900; color:#2c3e50; text-transform:uppercase; letter-spacing:1px; background:rgba(255,255,255,0.85); padding:2px 6px; border-radius:4px;"><i class="far fa-clock"></i> ${window.formatTime12h(sl.time)}</div>
                                                         <div style="font-size:0.55rem; font-weight:800; color:#2c3e50; background:rgba(255,255,255,0.85); padding:1px 5px; border-radius:3px;">AGENDAR +</div>
                                                     </div>
                                                </div>`;
                                            }

                                            // 2. BLOQUE RESERVADO (Prioridad absoluta sobre "Pasado")
                                            if (sl.aptInSlot) {
                                                const dA = sl.aptInSlot;
                                                const sM = getMin(dA.time);
                                                const dur = parseInt(dA.duration || 60);
                                                const eM = sM + dur;
                                                const isInProgress = isToday && nowMin >= sM && nowMin < eM;

                                                if (sl.slotMin === sM) {
                                                    const bgStyle = isInProgress 
                                                        ? `repeating-linear-gradient(45deg, ${sCol.bg}, ${sCol.bg} 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)` 
                                                        : sCol.bg;

                                                    content += `<div style="position:absolute; top:${topOffset}px; left:0; width:100%; height:${(dur/60)*rowH}px; background:${bgStyle}; border:1.5px solid ${sCol.b}; border-radius:10px; z-index:500; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:5px; color:${sCol.t}; font-size:0.65rem; font-weight:800; text-align:center; pointer-events:none; box-shadow:0 4px 10px rgba(0,0,0,0.03); overflow:hidden;">
                                                        <div style="text-transform:uppercase; font-size:0.6rem; display:flex; align-items:center; gap:4px; margin-bottom:1px;">
                                                            <i class="fas ${isInProgress ? 'fa-spinner fa-spin' : 'fa-lock'}"></i> 
                                                            ${isInProgress ? 'EN CURSO' : 'OCUPADO'}
                                                        </div>
                                                        <div style="font-size:0.55rem; opacity:0.9; font-weight:800; color:inherit; margin:1px 0;">${dA.name || 'Cliente'}</div>
                                                        <div style="font-size:0.5rem; opacity:0.7; font-weight:600;">${fM(sM)} - ${fM(eM)}</div>
                                                    </div>`;
                                                }
                                            } 
                                            
                                            // 3. CRUCE (SOLO SI ESTÁ VACÍO Y HAY CONFLICTO)
                                            const isComboAssignedHere = (() => {
                                                if (!isSameDayAssignment) return false; // Protección: No bloquear slots de otros días
                                                if (window.manualComboAssignments && window.manualComboAssignments.some(a => a && a.time && normalize(a.specialist) === nSpec && getMin(a.time) <= sl.slotMin && (getMin(a.time) + (comboData[window.manualComboAssignments.indexOf(a)] ? parseInt(comboData[window.manualComboAssignments.indexOf(a)].duration) || 60 : 60)) > sl.slotMin)) return true;
                                                if (window.manualComboExtras && window.manualComboExtras.some(ex => ex && ex.time && normalize(ex.specialist) === nSpec && getMin(ex.time) <= sl.slotMin && (getMin(ex.time) + (parseInt(ex.duration) || 60)) > sl.slotMin)) return true;
                                                return false;
                                            })();

                                            if (!sl.aptInSlot && !sl.clickable && !sl.isYour && !isComboAssignedHere && !sl.isPast) {
                                                if (sl.conf || sl.canDoActive === false) {
                                                    const isNoCapable = sl.canDoActive === false;
                                                    const blockText = isNoCapable ? "NO DISPONIBLE" : "CRUCE";
                                                    const blockIcon = isNoCapable ? "fa-user-slash" : "fa-ban";
                                                    content += `<div style="position:absolute; top:${topOffset+2}px; left:4px; right:4px; height:41px; background:rgba(0,0,0,0.03); border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px dashed #ccc; pointer-events:none; z-index:5; color:#aaa; flex-direction:column; gap:2px;">
                                                        <i class="fas ${blockIcon}" style="font-size:0.6rem;"></i>
                                                        <span style="font-size:0.5rem; font-weight:900; text-transform:uppercase; letter-spacing:1px;">${blockText}</span>
                                                    </div>`;
                                                }
                                            } else if (!sl.aptInSlot && sl.isPast && !sl.isYour) {
                                                // ── Pasado (Solo si no hay cita ni cruce) ───────────────────────────
                                                content += `
                                                <div style="position:absolute; top:${topOffset+2}px; left:4px; right:4px; height:41px; background:#f0f0f0; border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px solid #e5e5e5; pointer-events:none; z-index:5;">
                                                     <span style="font-size:0.55rem; color:#888; font-weight:800; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:3px;">
                                                        <i class="fas fa-history" style="font-size:0.6rem; opacity:0.6;"></i> Pasado
                                                     </span>
                                                </div>`;
                                            }

                                        // 3. MI SELECCIÓN ACTUAL (SERVICIO SIMPLE) - Solo si no es un combo
                                        if (sl.isYour && !window.manualComboAssignments) {
                                            const sM = sl.slotMin, eM = sM + bookingDur;
                                            const rawTitle = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex].text : 'Servicio';
                                            const svcTitle = rawTitle.split(' (')[0]; 
                                            const isEditingSingle = window.editingComboIdx === undefined && window._pendingIndividualEdit !== null;

                                            content += `<div class="manual-selected-target ${isEditingSingle ? 'manual-pulse-edit' : ''}" onclick="window.editComboService(undefined); event.stopPropagation();" style="position:absolute; top:${topOffset+2}px; left:8px; right:8px; height:${(bookingDur/60)*rowH-4}px; background:${isEditingSingle ? 'linear-gradient(135deg, #f39c12, #d35400)' : 'var(--color-dark-pink)'}; border-radius:12px; z-index:2100; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-size:0.65rem; font-weight:900; border:2.5px solid #fff; box-shadow:0 8px 15px rgba(229,106,158,0.3); pointer-events:auto; cursor:pointer; padding:4px; text-align:center; opacity:${isEditingSingle ? '0.9' : '1'};">
                                                 <div style="text-transform:uppercase; font-size:0.75rem; letter-spacing:0.5px; opacity:0.95; margin-bottom:1px;"><i class="fas ${isEditingSingle ? 'fa-edit' : 'fa-check-circle'}"></i> ${isEditingSingle ? 'EDITANDO' : 'ELEGIDO'}</div>
                                                 <div style="font-size:0.68rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">
                                                     ${svcTitle} <span style="font-size:0.58rem; opacity:0.8; font-weight:700;">| ${fM(sM)} - ${fM(eM)}</span>
                                                 </div>
                                             </div>`;
                                        }



                                        if (window.manualComboAssignments && isSameDayAssignment) {
                                            window.manualComboAssignments.forEach((assigned, c_idx) => {
                                                if (!assigned || !assigned.time || !assigned.specialist) return;
                                                if (normalize(assigned.specialist) !== nSpec) return;
                                                const aMin = getMin(assigned.time);
                                                const aDur = comboData[c_idx] ? (parseInt(comboData[c_idx].duration) || 60) : 60;
                                                if (aMin >= hStart * 60 && aMin < (hStart + 1) * 60) {
                                                    const tOff = ((aMin - hStart * 60) / 30) * 45;
                                                    const hPx  = (aDur / 60) * rowH;
                                                    const isAnchor = window.editingComboIdx === c_idx;
                                                    const isIndiv  = isAnchor && (window._pendingIndividualEdit !== null && window._pendingIndividualEdit !== undefined);
                                                    
                                                    const bBg = isIndiv ? '#f39c12' : (isAnchor ? '#2c3e50' : '#27ae60');
                                                    const lab = isIndiv ? '<i class="fas fa-edit"></i> EDITANDO' : (isAnchor ? '<i class="fas fa-crosshairs"></i> MANDO' : '<i class="fas fa-check-circle"></i> ELEGIDO');
                                                    const sTimeRange = `${fM(aMin)} - ${fM(aMin + aDur)}`;
                                                    const sItem = comboData[c_idx] || {};
                                                    const sGrp = window.getSimultGroup(sItem.cat || sItem.category || sItem.catId || "");
                                                    const sGTag = sGrp ? `[${sGrp.toUpperCase()}] ` : "";

                                                    content += `<div class="${isIndiv ? 'manual-pulse-edit' : (isAnchor ? 'manual-anchor-active' : '')}" onclick="window.editComboService(${c_idx}); event.stopPropagation();" style="position:absolute; top:${tOff+2}px; left:8px; right:8px; height:${hPx-6}px; background:${bBg}; border:2.5px solid #fff; border-radius:12px; z-index:2100; pointer-events:auto; opacity:1; cursor:pointer; display:flex; flex-direction:column; justify-content:center; align-items:center; box-shadow:0 8px 20px rgba(0,0,0,0.2); overflow:hidden; padding:4px; text-align:center; color:white;">
                                                        <span style="font-size:0.7rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">${lab}</span>
                                                        <div style="font-size:0.65rem; font-weight:800; line-height:1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 95%;">
                                                            ${sGTag}${sItem.title || 'Pack'} <span style="font-size:0.58rem; opacity:0.8; font-weight:700;">| ${sTimeRange}</span>
                                                        </div>
                                                    </div>`;
                                                }
                                            });

                                            // Renderizar Extras si tienen tiempo
                                            if (window.manualComboExtras) {
                                                window.manualComboExtras.forEach((ex, exIdx) => {
                                                    if (ex.time && ex.specialist && normalize(ex.specialist) === nSpec) {
                                                        const aMin = getMin(ex.time);
                                                        const aDur = parseInt(ex.duration) || 60;
                                                        if (aMin >= hStart * 60 && aMin < (hStart + 1) * 60) {
                                                            const tOff = ((aMin - hStart * 60) / 30) * 45;
                                                            const hPx  = (aDur / 60) * rowH;
                                                            const isAnchor = window.editingComboIdx === ('extra_' + exIdx);
                                                            const isIndiv  = isAnchor && (window._pendingIndividualEdit !== null && window._pendingIndividualEdit !== undefined);
                                                            
                                                            const bBg = isIndiv ? '#f39c12' : (isAnchor ? '#2c3e50' : '#27ae60');
                                                            const lab = isIndiv ? '<i class="fas fa-edit"></i> EXTRA' : (isAnchor ? '<i class="fas fa-crosshairs"></i> MANDO' : '<i class="fas fa-check-circle"></i> EXTRA');
                                                            const sTimeRange = `${fM(aMin)} - ${fM(aMin + aDur)}`;
                                                            const sGrp = window.getSimultGroup(ex.cat || ex.category || ex.catId || "");
                                                            const sGTag = sGrp ? `[${sGrp.toUpperCase()}] ` : "";
                                                            
                                                            content += `<div class="${isIndiv ? 'manual-pulse-edit' : (isAnchor ? 'manual-anchor-active' : '')}" onclick="window.editComboService('extra_${exIdx}'); event.stopPropagation();" style="position:absolute; top:${tOff+2}px; left:8px; right:8px; height:${hPx-6}px; background:${bBg}; border:2.5px dashed #fff; border-radius:12px; z-index:2100; pointer-events:auto; opacity:1; cursor:pointer; display:flex; flex-direction:column; justify-content:center; align-items:center; box-shadow:0 8px 20px rgba(0,0,0,0.2); overflow:hidden; padding:4px; text-align:center; color:white;">
                                                                <span style="font-size:0.7rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">${lab}</span>
                                                                <div style="font-size:0.65rem; font-weight:800; line-height:1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 95%;">
                                                                    ${sGTag}${ex.title} <span style="font-size:0.58rem; opacity:0.8; font-weight:700;">| ${sTimeRange}</span>
                                                                </div>
                                                            </div>`;
                                                        }
                                                    }
                                                });
                                            }
                                        }

                                        return content;
                                    }).join("")})()}
                                </td>`;
                            }).join('')}
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <style>
            .manual-agenda-trigger:hover .manual-hover-preview { opacity: 1 !important; }
            .manual-agenda-trigger:hover { background: rgba(184,115,129,0.03); }
            @keyframes manualPulse {
                0% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.4); transform: scale(1); }
                50% { box-shadow: 0 0 0 15px rgba(243, 156, 18, 0); transform: scale(1.02); }
                100% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0); transform: scale(1); }
            }
            .manual-pulse-edit {
                animation: manualPulse 3s infinite ease-in-out;
                z-index: 3000 !important;
                border: 3px solid white !important;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3) !important;
            }
            @media (max-width: 768px) {
                .responsive-agenda-grid { width: auto !important; min-width: auto !important; margin: 0 auto; border-left: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; }
                .responsive-agenda-grid th:not(:first-child) { width: 180px !important; min-width: 180px !important; overflow: hidden; }
            }
        </style>`;
        canvas.innerHTML = html;

        // --- 2. RESTAURAR SCROLL O AUTO-ENFOCAR SERVICIO EDITADO ---
        if (canvas.firstElementChild) {
            requestAnimationFrame(() => {
                // 1. RESTAURAR POSICIÓN PREVIAMENTE GUARDADA (INSTANTÁNEO)
                // Esto evita que en móviles salte a la primera columna al redibujar
                if (preservedScrollLeft !== undefined) canvas.firstElementChild.scrollLeft = preservedScrollLeft;
                if (preservedScrollTop !== undefined) canvas.firstElementChild.scrollTop = preservedScrollTop;

                // 2. AUTO-ENFOCAR CON SUAVE DESPLAZAMIENTO (SOLO SI SE SOLICITÓ)
                const activeEditTarget = canvas.querySelector('.manual-pulse-edit') || canvas.querySelector('.manual-anchor-active') || canvas.querySelector('.manual-selected-target');
                if (window._shouldAutoFocusManualAgenda && activeEditTarget) {
                    setTimeout(() => {
                        activeEditTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    }, 450);
                    window._shouldAutoFocusManualAgenda = false;
                }
            });
        }

    } catch(err) {
        console.error('❌ Error en Agenda Manual:', err);
        canvas.innerHTML = `<div style="text-align:center; padding:40px; color:#d9534f; background:#f9f2f4; border-radius:15px; border:1px dashed #ebccd1;">
            <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px;"></i>
            <p style="font-weight:700;">Error al cargar la agenda.</p>
            <p style="font-size:0.8rem;">${err.message}</p>
        </div>`;
    }
};

window.updateManualSpecialists = function() {
    const catSelect = document.getElementById('manual-category-select');
    const specSelect = document.getElementById('manual-specialist');
    const svcSelect = document.getElementById('manual-service-select');
    if (!catSelect || !specSelect) return;

    const catName = catSelect.options[catSelect.selectedIndex].text;
    const selectedSvc = svcSelect && svcSelect.selectedIndex > 0 ? svcSelect.options[svcSelect.selectedIndex] : null;
    const isCombo = selectedSvc && selectedSvc.dataset.isCombo === 'true';

    let specialists = [];
    try {
        specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    } catch(e) { specialists = []; }

    // Normalizar especialistas
    specialists = specialists.map(s => {
        if (typeof s === 'string') return {name: s, specialty: 'Todos', active: true};
        return s;
    }).filter(s => s && s.name);

    let filteredSpecs = specialists;
    
    if (isCombo) {
        // Para Combos: El profesional debe ofrecer TODAS las especialidades del pack
        const comboData = JSON.parse(selectedSvc.dataset.comboData || '[]');
        const requiredSpecialties = [...new Set(comboData.map(s => normalize(s.cat)))];
        
        filteredSpecs = specialists.filter(s => {
            const specList = (s.specialty || 'Todos').split(',').map(sp => normalize(sp));
            if (specList.includes('todos')) return true;
            // Verificar si ofrece cada una de las especialidades requeridas (búsqueda parcial)
            return requiredSpecialties.every(req => 
                specList.some(sSpec => sSpec.includes(req) || req.includes(sSpec))
            );
        });
    } else if (catSelect.value && catSelect.value !== 'combo-active') {
        // Para servicios individuales normales
        const target = normalize(catName);
        filteredSpecs = specialists.filter(s => {
            const specList = (s.specialty || 'Todos').split(',').map(sp => normalize(sp));
            return specList.includes('todos') || specList.some(sSpec => sSpec.includes(target) || target.includes(sSpec));
        });
    }

    specSelect.innerHTML = '<option value="">-- Seleccionar profesional --</option>' + 
                           filteredSpecs.map(s => {
                               const active = s.active !== false;
                               return `<option value="${s.name}" ${active ? '' : 'disabled'} style="${active ? '' : 'color:#999;'}">
                                   ${s.name} — ${active ? 'Disponible ✅' : 'No disponible ❌'}
                               </option>`;
                           }).join('');
};

window.initializeComboSummary = function(selectedSvc) {
    if (!selectedSvc || selectedSvc.dataset.isCombo !== 'true') return;
    
    const isCart = selectedSvc.value === 'custom-cart-pack';
    // Ocultar el carrito flotante si estamos inicializando el cronograma del pack confirmado
    if (isCart) {
        const cartContainer = document.getElementById('manual-cart-container');
        if (cartContainer) cartContainer.style.display = 'none';
    }

    // PROTECCIÓN: No resetear asignaciones si se está en medio de un slot pick
    // (evita que updateManualPrice destruya las asignaciones del combo durante un pick)
    if (!window._manualSlotJustPicked) {
        window.manualComboAssignments = null;
        window.editingComboIdx = undefined;
        window._pendingIndividualEdit = null;
    }
    const comboData = JSON.parse(selectedSvc.dataset.comboData || '[]');
    const summaryContainer = document.getElementById('manual-selection-summary-container');
    const mainBtn = document.getElementById('manual-form-agenda-btn-container'); // El contenedor del boton "SELECCIONAR TURNO" individual
    const summaryDateTime = document.getElementById('summary-datetime');
    
    if (!summaryContainer || !summaryDateTime) return;
    
    if (mainBtn) mainBtn.style.display = 'none';
    summaryContainer.style.display = 'block';
    
    const labelTitle = summaryContainer.querySelector('label');
    if (labelTitle) labelTitle.style.display = 'block';
    
    // Ocultamos nombre e imagen para combos
    const nameEl = document.getElementById('summary-spec-name');
    const imgContainer = document.getElementById('summary-spec-img');
    if (nameEl) nameEl.parentElement.style.display = 'none';
    
    const summaryBox = document.getElementById('manual-selection-summary');
    if (summaryBox) {
        summaryBox.style.border = 'none';
        summaryBox.style.background = 'transparent';
        summaryBox.style.padding = '0';
        summaryBox.style.boxShadow = 'none';
    }

    const headerTitle = isCart 
        ? `<i class="fas fa-cubes"></i> PAQUETE CONFIRMADO` 
        : `<i class="fas fa-list-ul"></i> CRONOGRAMA DEL COMBO`;

    let breakdownHtml = `
        <div class="breakdown-wrapper" style="margin-top:6px; width:100%; border:1.5px solid ${isCart ? 'rgba(243,156,18,0.3)' : '#eee'}; border-radius:18px; background: white; overflow:hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <div style="background:${isCart ? 'rgba(243,156,18,0.05)' : 'rgba(var(--accent-rgb), 0.05)'}; padding:8px 12px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:center; align-items:center;">
                <span style="font-size:0.65rem; font-weight:800; color:${isCart ? '#d35400' : 'var(--color-dark-pink)'}; text-transform:uppercase; letter-spacing:1px; text-align:center;">${headerTitle}</span>
            </div>
            <div style="padding:8px; display:block; max-height: 170px; overflow-y: auto;">`;

    comboData.forEach((s, idx) => {
        const assigned = window.manualComboAssignments && window.manualComboAssignments[idx];
        const lab = assigned && assigned.time ? '<i class="fas fa-check-circle"></i> Listo' : 'Elegir';
        
        const sGrp = window.getSimultGroup(s.cat || s.category || s.catId || "");
        const sGTag = sGrp ? `<span style="background:rgba(var(--accent-rgb), 0.1); color:var(--color-dark-pink); padding:2px 5px; border-radius:4px; font-size:0.6rem; margin-right:6px; border:1px solid rgba(var(--accent-rgb), 0.2); font-weight:800;">[${sGrp.toUpperCase()}]</span>` : '';
        
        breakdownHtml += `
            <div class="breakdown-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:12px; background:#fff; border:1px solid #f8f8f8; margin-bottom:6px; box-shadow:0 2px 5px rgba(0,0,0,0.015);">
                <div style="display:flex; flex-direction:column; text-align:left; flex:1; overflow:hidden; margin-right:15px;">
                    <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:800; color:#1a1a1a; overflow:hidden; text-align:left;">
                        ${sGTag}
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${s.title}</span>
                    </div>
                    <span style="font-size:0.65rem; font-weight:700; color:#999; margin-top:2px; text-align:left;">${assigned && assigned.time ? 'A las '+window.formatTime12h(assigned.time) : 'Por asignar'} | ${s.duration} min</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink: 0;">
                    ${isCart ? `
                    <button onclick="window.removeFromManualBreakdown(${idx}, false)" type="button" style="background:rgba(231, 76, 60, 0.1); border:none; width:34px; height:34px; border-radius:10px; cursor:pointer; color:#e74c3c; display:flex; align-items:center; justify-content:center; transition:0.3s;" title="Quitar este servicio" onmouseover="this.style.background='rgba(231, 76, 60, 0.2)'" onmouseout="this.style.background='rgba(231, 76, 60, 0.1)'">
                        <i class="fas fa-times"></i>
                    </button>` : ''}
                    <button onclick="window.editComboService(${idx})" type="button" style="background:${assigned && assigned.time ? '#27ae60' : 'var(--color-dark-pink)'}; border:none; padding:7px 14px; border-radius:10px; cursor:pointer; font-size:0.75rem; font-weight:800; color:#fff; transition:0.3s; box-shadow: 0 4px 10px rgba(184,115,129,0.2);">${lab}</button>
                </div>
            </div>`;
    });
    
    // Si hay un EXTRA seleccionado, lo inyectamos acá
    if (window.manualComboExtras && window.manualComboExtras.length > 0 && !isCart) {
        window.manualComboExtras.forEach((ex, idx) => {
            const exLab = ex.time ? '<i class="fas fa-check-circle"></i> Listo' : 'Elegir';
                            const exGrp = window.getSimultGroup(ex.cat || "");
                            const exGTag = exGrp ? `<span style="background:var(--color-dark-pink); color:white; font-size:0.5rem; padding:2px 4px; border-radius:4px; font-weight:900; margin-right:4px;">[${exGrp.toUpperCase()}]</span>` : '';
                            
                            breakdownHtml += `
                                <div class="breakdown-item combo-extra-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:12px; background:rgba(var(--accent-rgb), 0.05); border:1.5px dashed rgba(var(--accent-rgb), 0.4); margin-bottom:6px; box-shadow:0 2px 5px rgba(0,0,0,0.015);">
                                    <div style="display:flex; flex-direction:column; text-align:left; flex:1; overflow:hidden; margin-right:15px;">
                                        <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:800; color:#1a1a1a; overflow:hidden; text-align:left;">
                                            ${exGTag}
                                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${ex.title}</span>
                                            <span style="background:var(--color-dark-pink); color:white; font-size:0.55rem; padding:2px 6px; border-radius:4px; font-weight:900; flex-shrink:0;">EXTRA</span>
                                        </div>
                                        <span style="font-size:0.65rem; font-weight:700; color:#999; margin-top:2px; text-align:left;">${ex.time ? 'A las '+window.formatTime12h(ex.time) : 'Por asignar'} | ${ex.duration} min</span>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:8px; flex-shrink: 0;">
                                        <button onclick="window.removeFromManualBreakdown(${idx}, true)" type="button" style="background:rgba(231, 76, 60, 0.1); border:none; width:34px; height:34px; border-radius:10px; cursor:pointer; color:#e74c3c; display:flex; align-items:center; justify-content:center; transition:0.3s;" title="Quitar EXTRA" onmouseover="this.style.background='rgba(231, 76, 60, 0.2)'" onmouseout="this.style.background='rgba(231, 76, 60, 0.1)'">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <button onclick="window.editComboService('extra_${idx}')" type="button" style="background:${ex.time ? '#27ae60' : 'var(--color-dark-pink)'}; border:none; padding:7px 14px; border-radius:10px; cursor:pointer; font-size:0.75rem; font-weight:800; color:#fff; transition:0.3s; box-shadow: 0 4px 10px rgba(184,115,129,0.2);">${exLab}</button>
                                    </div>
                </div>`;
        });
    }
    
    breakdownHtml += `</div></div>`;

    // ---- PANEL IZQUIERDO: AGREGAR EXTRA AL COMBO ----
    const leftPanel = document.getElementById('combo-extra-left-panel');
    if (leftPanel) {
        if (!isCart) {
            const comboCats = new Set(comboData.map(s => (s.cat || '').toLowerCase().trim()));
            if (window.manualComboExtras) {
                window.manualComboExtras.forEach(e => comboCats.add((e.cat || '').toLowerCase().trim()));
            }
            const allCats = JSON.parse(localStorage.getItem('margarita_categories') || '[]');
            const allSvcs = JSON.parse(localStorage.getItem('margarita_services') || '[]');
            const availableCats = allCats.filter(c => {
                if (comboCats.has((c.id || '').toLowerCase().trim())) return false;
                return allSvcs.some(s => (s.cat || '').toLowerCase() === (c.id || '').toLowerCase());
            });

            if (availableCats.length > 0) {
                const extraChips = availableCats.map(c => {
                    return `<button type="button" onclick="window.selectComboExtraCategory('${c.id}', '${c.name}')"
                        style="display:inline-flex; align-items:center; gap:4px; padding:5px 9px; border-radius:16px; border:1.5px solid #ddd; background:white; color:#666; font-size:0.68rem; font-weight:800; cursor:pointer; transition:0.2s; white-space:nowrap; margin-bottom:4px;">
                        <i class="far fa-square"></i> ${c.name}
                    </button>`;
                }).join('');

                leftPanel.innerHTML = `
                    <div id="combo-extra-section" style="border:1.5px dashed color-mix(in srgb, var(--color-dark-pink) 40%, transparent); border-radius:18px; padding:12px; background:color-mix(in srgb, var(--color-dark-pink) 3%, transparent); display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.68rem; font-weight:900; color:#888; text-transform:uppercase; letter-spacing:0.5px;"><i class="fas fa-plus-circle" style="color:var(--color-dark-pink);"></i> Servicio extra</span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:5px;">
                            ${extraChips}
                        </div>
                        <div id="combo-extra-services-panel" style="display:none; border-top:1px solid #f0f0f0; padding-top:8px;">
                            <div style="font-size:0.62rem; font-weight:900; color:#aaa; margin-bottom:6px; text-transform:uppercase;">Elige un servicio:</div>
                            <div id="combo-extra-services-list" style="display:flex; flex-direction:column; gap:5px; max-height:140px; overflow-y:auto;"></div>
                            <button type="button" id="combo-extra-add-btn" onclick="window.addComboExtra()"
                                style="display:none; margin-top:8px; width:100%; padding:8px; background:var(--color-dark-pink); color:white; border:none; border-radius:12px; font-size:0.72rem; font-weight:900; cursor:pointer;">
                                <i class="fas fa-plus"></i> Añadir al combo
                            </button>
                        </div>
                    </div>`;
                leftPanel.style.display = 'block';
            } else {
                leftPanel.style.display = 'none';
                leftPanel.innerHTML = '';
            }
        } else {
            leftPanel.style.display = 'none';
            leftPanel.innerHTML = '';
        }
    }

    // Cronograma solo a la derecha
    summaryDateTime.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; background:#fff7e6; color:#d48806; border-radius:10px; font-weight:800; font-size:0.75rem; border:1px dashed #ffe58f; margin-top:10px; margin-bottom:2px; width:100%; height:40px; box-sizing:border-box;">
           <i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i> Define el horario de cada servicio
        </div>
        ${breakdownHtml}
    `;
};

window.selectComboExtraCategory = function(catId, catName) {
    window._comboExtraSelectedCat = { id: catId, name: catName };
    window._comboExtraSelectedSvc = null;

    const panel = document.getElementById('combo-extra-services-panel');
    const list = document.getElementById('combo-extra-services-list');
    const addBtn = document.getElementById('combo-extra-add-btn');
    if (!panel || !list) return;

    const allSvcs = JSON.parse(localStorage.getItem('margarita_services') || '[]');
    const svcsForCat = allSvcs.filter(s => (s.cat || '').toLowerCase() === catId.toLowerCase());
    const selDate = document.getElementById('manual-date') ? document.getElementById('manual-date').value : '';
    const selTime = document.getElementById('manual-time') ? document.getElementById('manual-time').value : '';

    list.innerHTML = svcsForCat.map(svc => {
        const eff = window.getManualEffectivePrice(svc, selDate, selTime);
        const label = eff.isPromo
            ? `${svc.title} <span style="color:var(--color-dark-pink); font-weight:900;">${eff.price}</span> <span style="color:#2ecc71; font-size:0.6rem;">-${eff.percent}% DESC</span>`
            : `${svc.title} <span style="color:#555; font-weight:900;">${svc.price}</span>`;
        return `<div onclick="window.pickComboExtraService('${svc.title.replace(/'/g,"\\'")}')"
            data-svc-title="${svc.title}" data-svc-price="${svc.price}" data-svc-eff-price="${eff.price}" 
            data-svc-is-promo="${eff.isPromo}" data-svc-promo-pct="${eff.percent || ''}" data-svc-duration="${svc.duration || 60}" data-svc-cat="${catId}" data-svc-cat-name="${catName}" data-svc-img="${svc.img || ''}"
            style="padding:7px 10px; border-radius:10px; border:1.5px solid #eee; background:white; cursor:pointer; font-size:0.72rem; font-weight:700; color:#1a1a1a; transition:0.2s; display:flex; justify-content:space-between; align-items:center;">
            <span>${label}</span>
        </div>`;
    }).join('');

    panel.style.display = 'block';
    if (addBtn) addBtn.style.display = 'none';

    // Resaltar chips
    document.querySelectorAll('#combo-extra-section button[onclick^="window.selectComboExtraCategory"]').forEach(btn => {
        const isThis = btn.textContent.trim().includes(catName.trim());
        btn.style.borderColor = isThis ? 'var(--color-dark-pink)' : '#ddd';
        btn.style.background = isThis ? 'color-mix(in srgb, var(--color-dark-pink) 10%, transparent)' : 'white';
        btn.style.color = isThis ? 'var(--color-dark-pink)' : '#666';
    });
};

window.pickComboExtraService = function(svcTitle) {
    window._comboExtraSelectedSvc = svcTitle;
    const list = document.getElementById('combo-extra-services-list');
    const addBtn = document.getElementById('combo-extra-add-btn');
    if (list) {
        list.querySelectorAll('div[data-svc-title]').forEach(el => {
            const isThis = el.dataset.svcTitle === svcTitle;
            el.style.borderColor = isThis ? 'var(--color-dark-pink)' : '#eee';
            el.style.background = isThis ? 'color-mix(in srgb, var(--color-dark-pink) 10%, transparent)' : 'white';
        });
    }
    if (addBtn) addBtn.style.display = 'block';
};

window.addComboExtra = function() {
    if (!window._comboExtraSelectedSvc || !window._comboExtraSelectedCat) return;
    const list = document.getElementById('combo-extra-services-list');
    const svcEl = list ? list.querySelector(`div[data-svc-title="${window._comboExtraSelectedSvc}"]`) : null;
    if (!svcEl) return;

    if (!window.manualComboExtras) window.manualComboExtras = [];
    window.manualComboExtras.push({
        title: svcEl.dataset.svcTitle,
        price: svcEl.dataset.svcPrice,
        priceFormatted: svcEl.dataset.svcEffPrice,
        effectivePriceNum: parseInt(svcEl.dataset.svcEffPrice.replace(/[^\d]/g, '')) || 0,
        isPromo: svcEl.dataset.svcIsPromo === 'true',
        promoPercent: svcEl.dataset.svcPromoPct ? parseInt(svcEl.dataset.svcPromoPct) : null,
        duration: parseInt(svcEl.dataset.svcDuration) || 60,
        cat: svcEl.dataset.svcCat,
        catName: svcEl.dataset.svcCatName,
        img: svcEl.dataset.svcImg || ''
    });

    // Actualizar precio total mostrado
    if (window.updateManualPrice) window.updateManualPrice();
    // Refrescar la vista del cronograma
    const svcSelect = document.getElementById('manual-service-select');
    if (svcSelect) {
        const opt = svcSelect.options[svcSelect.selectedIndex];
        if (opt && opt.dataset.isCombo === 'true') {
            if (window.initializeComboSummary) window.initializeComboSummary(opt);
        }
    }
    window._comboExtraSelectedSvc = null;
    window._comboExtraSelectedCat = null;
};

window.removeFromManualBreakdown = function(idx, isExtra) {
    if (isExtra) {
        if (window.manualComboExtras) window.manualComboExtras.splice(idx, 1);
    } else {
        const svcSelect = document.getElementById('manual-service-select');
        const isCart = svcSelect && svcSelect.value === 'custom-cart-pack';
        if (isCart && window.manualCart) {
            window.manualCart.splice(idx, 1);
            window.manualComboAssignments = null; // Resetear para forzar re-calculo
            if (window.manualCart.length === 0) {
                window.clearManualCart();
                return;
            }
            window.renderManualCart();
            setTimeout(() => {
                const opt = svcSelect.options[svcSelect.selectedIndex];
                if (window.initializeComboSummary) window.initializeComboSummary(opt);
            }, 10);
            return;
        }
    }
    // Refresco común
    if (window.updateManualPrice) window.updateManualPrice();
    const svcSelect = document.getElementById('manual-service-select');
    if (svcSelect) {
        const opt = svcSelect.options[svcSelect.selectedIndex];
        if (opt && window.initializeComboSummary) window.initializeComboSummary(opt);
    }
};

window.removeComboExtra = function(idx) {
    window.removeFromManualBreakdown(idx, true);
};

window.updateManualPrice = function() {
    const svcSelect = document.getElementById('manual-service-select');
    const display = document.getElementById('manual-price-display');
    const dateInp = document.getElementById('manual-date');
    const timeInp = document.getElementById('manual-time');
    if (!svcSelect || !display) return;
    
    const selected = svcSelect.options[svcSelect.selectedIndex];
    if (selected && selected.value) {
        let finalPrice = selected.dataset.price;
        const selDate = dateInp ? dateInp.value : '';
        const selTime = timeInp ? timeInp.value : '';

        // 1. REVALIDACIÓN DE PRECIO DINÁMICO (Por si cambió la fecha/hora)
        if (selected.value === 'custom-cart-pack') {
            // PAQUETE PERSONALIZADO: Recalcular cada item individualmente
            let newTotal = 0;
            if (window.manualCart) {
                window.manualCart.forEach(item => {
                    // Tomamos estrictamente el precio original (si no existe, asumimos que 'price' es el original)
                    const basePriceStr = item.originalPrice || item.price || "$0";
                    const basePriceNum = parseInt(basePriceStr.replace(/[^\d]/g, '')) || 0;
                    
                    const svcItemForCalc = { title: item.title, cat: item.cat, price: basePriceStr, originalPrice: basePriceStr };
                    const eff = window.getManualEffectivePrice(svcItemForCalc, selDate, selTime);
                    
                    // Forzar el valor numérico exacto que devuelve la función de promociones
                    const effPriceNum = parseInt(eff.price.replace(/[^\d]/g, '')) || 0;
                    
                    // Asegurar que guardamos bases y actuales
                    item.originalPrice = basePriceStr; 
                    item.priceNum = effPriceNum;
                    item.isPromo = eff.isPromo;
                    item.promoPercent = eff.percent || null;
                    
                    newTotal += effPriceNum;
                });
                finalPrice = `$${newTotal.toLocaleString('es-CO').replace(/,/g, '.')}`;
                selected.dataset.price = finalPrice;
                if (window.renderManualCart) window.renderManualCart();
            }
        } else if (selected.dataset.isCombo === 'true') {
            // Re-validar el combo prearmado contra la fecha seleccionada
            const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
            const comboRes = window.getManualComboEffectivePrice(promos.combo, selDate, selTime);
            let comboBaseNum = 0;
            if (!comboRes) {
                // Si el combo expiró, intentamos revertir a la suma de originales
                const comboData = JSON.parse(selected.dataset.comboData || '[]');
                const originalTotal = comboData.reduce((acc, s) => acc + (parseInt(s.price.replace(/\D/g, '')) || 0), 0);
                comboBaseNum = originalTotal;
                showToast("⚠️ El precio del combo volvió al original porque la fecha seleccionada está fuera de la oferta.", "info");
            } else {
                comboBaseNum = parseInt((comboRes || '0').replace(/[^\d]/g, '')) || 0;
            }
            // Si hay servicios extra al combo, sumarlos
            const extraNum = (window.manualComboExtras || []).reduce((acc, ex) => acc + (ex.effectivePriceNum || 0), 0);
            const totalWithExtra = comboBaseNum + extraNum;
            finalPrice = `$${totalWithExtra.toLocaleString('es-CO').replace(/,/g, '.')}`;
            selected.dataset.price = `$${comboBaseNum.toLocaleString('es-CO').replace(/,/g, '.')}`; // El dataset guarda solo el base del combo
            // Mostrar el total con extra en el display
            finalPrice = `$${totalWithExtra.toLocaleString('es-CO').replace(/,/g, '.')}`;
        } else {
            const svcInfo = { 
                title: selected.dataset.name, 
                cat: document.getElementById('manual-category-select').value, 
                price: selected.dataset.originalPrice || selected.dataset.price 
            };
            const eff = window.getManualEffectivePrice(svcInfo, selDate, selTime);
            finalPrice = eff.price;
            
            // Actualizar dataset para visualizado instantáneo pero PRESERVANDO el original si existe
            selected.dataset.price = finalPrice;
            selected.dataset.isPromo = eff.isPromo ? 'true' : 'false';
            
            const basePriceForLabel = selected.dataset.originalPrice || svcInfo.price;
            const cleanTitle = selected.dataset.name;
            selected.innerText = eff.isPromo ? `${cleanTitle} (${eff.price}) - ${eff.percent}% OFF` : `${cleanTitle} (${basePriceForLabel})`;
        }

        display.value = finalPrice;
        
        if (selected.dataset.isCombo === 'true' || selected.value === 'custom-cart-pack') {
            // NO re-inicializar el cronograma si se acaba de elegir un turno (destruiría las asignaciones)
            if (!window._manualSlotJustPicked) {
                if (window.initializeComboSummary) window.initializeComboSummary(selected);
            }
        } else {
            // Servicio individual - solo ocultar/mostrar si el turno NO acaba de ser elegido en la agenda
            if (!window._manualSlotJustPicked) {
                const scheduler = document.getElementById('manual-selection-summary-container');
                if (scheduler) scheduler.style.display = 'none';

                const inPackageMode = window.manualCart && window.manualCart.length > 0;
                window.manualComboAssignments = null;
                
                const nameEl = document.getElementById('summary-spec-name');
                if (nameEl) nameEl.parentElement.style.display = 'flex';
                
                const mainBtn = document.getElementById('manual-form-agenda-btn-container');
                if (mainBtn) {
                    mainBtn.style.display = inPackageMode ? 'none' : 'flex';
                }

                if (inPackageMode && window.renderManualCart) {
                    window.renderManualCart();
                }
            }
        }
    } else {
        display.value = '';
        const inPackageMode = window.manualCart && window.manualCart.length > 0;
        if (!inPackageMode && window.resetManualFormUI) {
            window.resetManualFormUI();
        }
    }
};

window.saveManualAppointment = async function() {
    const btn = event.currentTarget || document.getElementById('save-manual-btn');
    if (btn && btn.disabled) return;
    
    const name = document.getElementById('manual-name').value.trim();
    const catSelect = document.getElementById('manual-category-select');
    const svcSelect = document.getElementById('manual-service-select');
    const specialist = document.getElementById('manual-specialist').value;
    const date = document.getElementById('manual-date').value;
    const time = document.getElementById('manual-time').value;
    const phone = document.getElementById('manual-phone').value.trim() || 'N/A';

    if (!name || !catSelect.value || !svcSelect.value || !date || !time || !specialist) {
        showToast('Completa todos los campos obligatorios.', 'error');
        return;
    }

    // Validar que la fecha no sea pasada
    const todayVal = new Date().toLocaleDateString('sv-SE');
    if (date < todayVal) {
        showToast('⚠️ No se pueden agendar citas en fechas pasadas.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'AGENDAR CITA';
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Guardando...';
    }

    const selectedSvc = svcSelect.options[svcSelect.selectedIndex];
    const duration = selectedSvc.dataset.duration || "60";
    const isCombo = selectedSvc.dataset.isCombo === 'true';
    
    // El check de conflicto se hace ahora dentro de cada bloque (Combo vs Simple)
    // para permitir especialistas distintos por servicio en los combos.

    const groupId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const createdAt = new Date().toISOString();
    let appointmentsToSave = [];

    // Helper para convertir hora a minutos (HH:mm)
    const timeToMins = (timeStr) => {
        if (!timeStr) return 0;
        let [h, m] = timeStr.includes(':') ? timeStr.split(':').map(Number) : [0,0];
        if (timeStr.toLowerCase().includes('pm')) { if (h < 12) h += 12; }
        else if (timeStr.toLowerCase().includes('am')) { if (h === 12) h = 0; }
        return h * 60 + (m || 0);
    };

    if (isCombo) {
        const comboData = JSON.parse(selectedSvc.dataset.comboData || '[]');
        const comboPriceTotal = parseInt(selectedSvc.dataset.price.replace(/\D/g, '')) || 0;
        const originalTotal = comboData.reduce((acc, s) => acc + (parseInt(s.price.replace(/\D/g, '')) || 0), 0);
        
        for (let idx = 0; idx < comboData.length; idx++) {
            const s = comboData[idx];
            
            // Usamos las asignaciones globales creadas por el form
            const assigned = (window.manualComboAssignments && window.manualComboAssignments[idx]) ? window.manualComboAssignments[idx] : null;
            
            // Si por alguna razón no hay assigned, hacemos un fallback seguro
            if (!assigned) {
                showToast('Error interno: Configuración de combo no inicializada.', 'error');
                if (btn) { btn.disabled = false; btn.innerText = 'Agendar Cita'; }
                return;
            }

            const sSpecialist = assigned.specialist;
            const sTime = assigned.time;
            const sDuration = parseInt(s.duration) || 60;

            // Validar conflicto individual por cada profesional y su hora asignada
            if (checkConflict(date, sTime, sSpecialist, sDuration)) {
                showToast(`CONFLICTO: ${sSpecialist} está ocupado(a) para "${s.title}" a las ${window.formatTime12h ? window.formatTime12h(sTime) : sTime}.`, 'error');
                if (btn) { btn.disabled = false; btn.innerText = 'Agendar Cita'; }
                return;
            }

            const sOriginalPrice = parseInt((s.originalPrice || s.price).replace(/\D/g, '')) || 0;
            const sSplitPrice = originalTotal > 0 ? Math.round(sOriginalPrice * (comboPriceTotal / originalTotal)) : 0;

            // Buscamos el nombre real de la categoría
            let realCatName = s.cat || 'Combo';
            if (window.categories) {
                const foundCat = window.categories.find(c => c.id === (s.cat || "").toLowerCase());
                if (foundCat) realCatName = foundCat.name;
            }

            let pt = 'combo';
            if (svcSelect.value === 'custom-cart-pack') pt = 'package';

            const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
            const pPerc = (promos.discount && promos.discount.active) ? parseInt(promos.discount.percent) : null;

            appointmentsToSave.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4) + idx,
                groupId: groupId,
                name,
                service: s.title,
                category: realCatName,
                price: s.price,
                splitPrice: sSplitPrice,
                promoType: pt,
                promoPercent: pPerc, // Guardar el % de la promo activa al momento de agendar
                img: s.img || '',
                duration: s.duration,
                specialist: sSpecialist,
                date,
                time: sTime,
                createdAt,
                manual: true,
                status: 'confirmed',
                phone
            });
        }

        // Si hay servicios extra agregados al combo, guardarlos como citas adicionales del mismo groupId
        if (window.manualComboExtras && window.manualComboExtras.length > 0) {
            window.manualComboExtras.forEach((extra, idx) => {
                appointmentsToSave.push({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4) + '_extra_' + idx,
                    groupId: groupId,
                    name,
                    service: extra.title,
                    category: extra.catName,
                    price: extra.price,
                    splitPrice: extra.isPromo ? extra.effectivePriceNum : null,
                    promoType: extra.isPromo ? 'discount' : null,
                    promoPercent: extra.promoPercent,
                    img: extra.img || '',
                    duration: extra.duration.toString(),
                    specialist: extra.specialist || '',
                    date,
                    time: extra.time || '',
                    createdAt,
                    manual: true,
                    status: 'confirmed',
                    phone,
                    comboExtra: true
                });
            });
        }

    } else {
        const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
        const pPerc = (selectedSvc.dataset.isPromo === 'true' && promos.discount) ? parseInt(promos.discount.percent) : null;

        appointmentsToSave.push({
            id: Date.now() + Math.random().toString(36).substr(2, 4),
            groupId: groupId,
            name,
            service: selectedSvc.dataset.name,
            category: catSelect.options[catSelect.selectedIndex].text,
            price: selectedSvc.dataset.originalPrice || selectedSvc.dataset.price,
            splitPrice: selectedSvc.dataset.isPromo === 'true' ? parseInt(selectedSvc.dataset.price.replace(/\D/g, '')) : null,
            promoType: selectedSvc.dataset.isPromo === 'true' ? 'discount' : null,
            promoPercent: pPerc, // Guardar el % exacto
            img: selectedSvc.dataset.img,
            duration: duration,
            specialist,
            date,
            time,
            createdAt,
            manual: true,
            status: 'confirmed',
            phone
        });
    }

    try {
        let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
        agenda = [...appointmentsToSave, ...agenda];
        localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
        
        // SINCRONIZAR CON LA NUBE
        if (window.saveListToCloud) {
            await window.saveListToCloud('citas_v2', agenda);
        }

        // Limpiar campos y cerrar
        window.manualComboAssignments = null;
        window.manualComboExtras = [];
        window._comboExtraSelectedCat = null;
        window._comboExtraSelectedSvc = null;
        window.editingComboIdx = undefined;
        window._manualComboLastDate = null;
        if (window.resetManualFormUI) window.resetManualFormUI();
        if (window.clearManualCart) window.clearManualCart();
        
        document.getElementById('manual-name').value = '';
        document.getElementById('manual-phone').value = '';

        const catSelect = document.getElementById('manual-category-select');
        const svcSelect = document.getElementById('manual-service-select');
        const priceDisplay = document.getElementById('manual-price-display');
        if (catSelect) catSelect.value = '';
        if (svcSelect) svcSelect.innerHTML = '<option value="">-- Primero elige especialidad --</option>';
        if (priceDisplay) priceDisplay.value = '';

        toggleManualForm();
        
        // FORZAR VISTA "EN PROCESO"
        window.currentAgendaTray = 'confirmed';
        document.querySelectorAll('.agenda-tray-btn').forEach(btnNav => {
            btnNav.classList.toggle('active', (btnNav.getAttribute('onclick') || '').includes('confirmed'));
        });

        renderAgenda();
        renderCalendar();
        showToast(`¡Cita para ${name} registrada con éxito!`, 'success');
    } catch (e) {
        console.error('Error al guardar cita manual:', e);
        showToast('Error al guardar la cita.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Agendar Cita';
        }
    }
};

function checkConflict(date, time, specialist, serviceDuration = 60, excludeApptId = null) {
    // 1. Ejecutar limpieza automática antes de verificar para asegurar que las vencidas ya son 'cancelled'
    if (window.autoCancelOverdueAppointments) window.autoCancelOverdueAppointments();

    const agendaData = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    
    const timeToMins = (timeStr) => {
        if (!timeStr) return 0;
        const low = timeStr.toLowerCase();
        let [h, m] = low.includes(':') ? low.split(':').map(Number) : [0,0];
        if (low.includes('pm') || low.includes('p.m.')) {
            if (h < 12) h += 12;
        } else if (low.includes('am') || low.includes('a.m.')) {
            if (h === 12) h = 0;
        }
        return h * 60 + (m || 0);
    };

    const newStart = timeToMins(time);
    const newEnd = newStart + parseInt(serviceDuration);

    // Bloqueo de horas pasadas para el día de hoy
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date === todayStr) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (newStart < (nowMin - 5)) return true; // El tiempo ya pasó (5m de gracia)
    }

    const conflict = agendaData.some(appt => {
        if (excludeApptId && appt.id === excludeApptId) return false;
        
        // Ignorar si es otra fecha, otro profesional, o si el servicio ya fue FINALIZADO o CANCELADO
        if (appt.date !== date || appt.specialist !== specialist) return false;
        
        // REGLA DE ORO: Solo bloquean el calendario las citas activas (Entrantes, En Proceso, Aplazadas)
        // Las citas 'accepted' (finalizadas en historial) o 'cancelled' (canceladas) DEBEN LIBERAR EL ESPACIO.
        if (appt.status === 'accepted' || appt.status === 'cancelled' || appt.status === 'rejected') return false;
        
        const aStart = timeToMins(appt.time);
        const aDuration = parseInt(appt.duration || 60);
        const aEnd = aStart + aDuration;

        return (newStart < aEnd && newEnd > aStart);
    });

    if (conflict) {
        console.warn(`Conflicto detectado: ${date} ${time} [${serviceDuration}min] con Profesional ${specialist}`);
    }
    return conflict;
}

window.renderCalendar = function() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const today = new Date();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    
    const agendaData = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const datesWithAppointments = new Set(
        agendaData
            .filter(a => a && (a.status === 'pending' || a.status === 'postponed'))
            .map(a => a.date)
    );

    let html = `
    <div class="calendar-wrapper">
        <div class="calendar-header">
            <button onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
            <h4 style="margin:0;">${monthNames[month]} ${year}</h4>
            <button onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-name">D</div>
            <div class="calendar-day-name">L</div>
            <div class="calendar-day-name">M</div>
            <div class="calendar-day-name">M</div>
            <div class="calendar-day-name">J</div>
            <div class="calendar-day-name">V</div>
            <div class="calendar-day-name">S</div>`;

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day other-month"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        const isSelected = selectedFilterDate === dateStr;
        const hasAppt = datesWithAppointments.has(dateStr);

        // Bloqueo de fechas pasadas
        const checkDate = new Date(year, month, day, 23, 59, 59);
        const isPast = checkDate < today && !isToday;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasAppt) classes += ' has-appointment';
        if (isPast) classes += ' disabled-day';

        if (isPast) {
            html += `<div class="${classes}">${day}</div>`;
        } else {
            html += `<div class="${classes}" onclick="filterByDate('${dateStr}')">${day}</div>`;
        }
    }

    html += `</div></div>`;
    container.innerHTML = html;
};

window.changeMonth = function(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
};

window.filterByDate = function(dateStr) {
    selectedFilterDate = (selectedFilterDate === dateStr) ? null : dateStr;
    const indicator = document.getElementById('date-filter-indicator');
    const label = document.getElementById('selected-date-label');
    if (selectedFilterDate) {
        indicator.style.display = 'block';
        label.innerText = new Date(selectedFilterDate + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    } else {
        indicator.style.display = 'none';
    }
    renderCalendar();
    renderAgenda();
};

window.clearDateFilter = function() {
    selectedFilterDate = null;
    document.getElementById('date-filter-indicator').style.display = 'none';
    renderCalendar();
    renderAgenda();
};

// Eliminado el duplicado para usar la versión de la línea ~2150

// State for subcard switcher
window.activeSubcardIndices = window.activeSubcardIndices || {};

// State for render stability
let _lastAgendaHash = null;
let _renderAgendaTimer = null;
window._isUpdatingLocal = false; // Bloqueo para evitar que la sync de fondo parpadee mientras operamos

// Lazy Loading state para la agenda
let _agendaPageSize = 15;    // Grupos por tanda
let _agendaCurrentPage = 1;  // Página actual cargada
let _agendaAllGroups = [];   // Todos los grupos del render actual
let _agendaLazyObserver = null; // IntersectionObserver activo


// ✅ FUNCIÓN DEDICADA: Actualiza solo los numeritos de las bandejas
// Se puede llamar en cualquier momento sin el riesgo de parpadeo
function updateBadges() {
    try {
        const agenda = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');
        let filteredForBadges = selectedFilterDate ? agenda.filter(a => window.normDate(a.date) === window.normDate(selectedFilterDate)) : agenda;
        
        // SEARCH FILTER for badges
        const searchInput = document.getElementById('agenda-search-input');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (searchTerm) {
            const normalize = (val) => (val || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const termNorm = normalize(searchTerm);
            filteredForBadges = filteredForBadges.filter(a => {
                const nameMatch = normalize(a.name).includes(termNorm);
                const phoneMatch = (a.phone || '').toString().includes(termNorm);
                return nameMatch || phoneMatch;
            });
        }

        // OPCIÓN B: Contar grupos únicos (clientes) en vez de servicios individuales.
        // Un paquete de 5 servicios del mismo cliente cuenta como 1 sola entrada.
        const countUniqueGroups = (apts) => {
            const seen = new Set();
            apts.forEach(a => {
                // Si tiene groupId, usarlo como clave única del grupo.
                // Si no tiene groupId, usar su propio id (o un fallback único) para contarlo solo una vez.
                const key = a.groupId || `solo_${a.id || a.name + a.time + a.date}`;
                seen.add(key);
            });
            return seen.size;
        };

        const cIncoming  = countUniqueGroups(filteredForBadges.filter(a => a.status === 'pending' || !a.status));
        const cConfirmed = countUniqueGroups(filteredForBadges.filter(a => a.status === 'confirmed'));
        const cPostponed = countUniqueGroups(filteredForBadges.filter(a => a.status === 'postponed'));
        // RECORDATORIOS: Mismo filtro que en el render (Uñas + Aceptadas + Únicas)
        const allNailReminders = filteredForBadges.filter(a => {
            const cat = (a.category || "").toLowerCase();
            return (cat.includes('uñ') || cat.includes('un')) && a.status === 'accepted';
        });

        const uniqueRem = new Map();
        allNailReminders.forEach(apt => {
            const phoneKey = (apt.phone || "").toString().replace(/\D/g, '');
            const nameKey = (apt.name || "").toLowerCase().trim();
            const key = phoneKey || nameKey;
            if (key && !uniqueRem.has(key)) uniqueRem.set(key, true);
        });
        const cReminders = uniqueRem.size;

        const bIncoming  = document.getElementById('badge-incoming');
        const bConfirmed = document.getElementById('badge-confirmed');
        const bPostponed = document.getElementById('badge-postponed');
        const bReminders = document.getElementById('badge-reminders');

        if (bIncoming)  bIncoming.innerText  = cIncoming;
        if (bConfirmed) bConfirmed.innerText = cConfirmed;
        if (bPostponed) bPostponed.innerText = cPostponed;
        if (bReminders) bReminders.innerText = cReminders;
    } catch(e) { /* silencioso */ }
}
window.updateBadges = updateBadges;

function renderAgenda() {
    if (_renderAgendaTimer) clearTimeout(_renderAgendaTimer);
    _renderAgendaTimer = setTimeout(_doRenderAgenda, 50);
}

function _doRenderAgenda() {
    try {
        // Auto-limpieza SEPARADA del render (no dispara re-render aquí para evitar parpadeo)
        window.autoCancelOverdueAppointments(true);

        const listContainer = document.getElementById('agenda-list-container');
        if (!listContainer) return;

        // Bloquear altura para evitar saltos de scroll bruscos
        listContainer.style.minHeight = listContainer.offsetHeight + 'px';
        
        const scrollPos = window.scrollY;

        let agenda = [];
        try {
            const raw = localStorage.getItem('margarita_appointments');
            agenda = JSON.parse(raw) || [];
            // Migration: Add status if missing
            let changed = false;
            agenda.forEach(a => {
                if(!a.status) { a.status = 'pending'; changed = true; }
            });
            if(changed) localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
        } catch (e) {
            console.error("Malformed agenda data in localStorage:", e);
            listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#d9534f;">Error al cargar datos. Los datos podrían estar corruptos.</p>`;
            return;
        }

        // BADGES: Delegar a la función dedicada (siempre actualiza en tiempo real)
        updateBadges();

        // FILTER BY TRAY
        let activeAgenda = agenda.map((a, i) => ({...a, originalIndex: i}));
        
        if (currentAgendaTray === 'incoming') {
            activeAgenda = activeAgenda.filter(a => a.status === 'pending');
        } else if (currentAgendaTray === 'confirmed') {
            activeAgenda = activeAgenda.filter(a => a.status === 'confirmed');
        } else if (currentAgendaTray === 'postponed') {
            activeAgenda = activeAgenda.filter(a => a.status === 'postponed');
        } else if (currentAgendaTray === 'reminders') {
            // 1. Filtrar registros de Uñas SOLO realizados (status === 'accepted')
            let allNails = activeAgenda.filter(a => {
                const cat = (a.category || "").toLowerCase();
                return (cat.includes('uñ') || cat.includes('un')) && a.status === 'accepted';
            });

            // 2. Ordenar por fecha (más reciente primero) para asegurar que tomamos la última visita
            allNails.sort((a, b) => {
                const dateA = new Date((a.date || "2000-01-01") + "T" + (a.time || "00:00"));
                const dateB = new Date((b.date || "2000-01-01") + "T" + (b.time || "00:00"));
                return dateB - dateA;
            });

            // 3. Agrupar por teléfono (o nombre si no hay tel) para mostrar solo la ÚLTIMA visita de cada clienta
            const uniqueClients = new Map();
            allNails.forEach(apt => {
                const phoneKey = (apt.phone || "").toString().replace(/\D/g, '');
                const nameKey = (apt.name || "").toLowerCase().trim();
                const key = phoneKey || nameKey; // Prioridad al teléfono
                
                if (key && !uniqueClients.has(key)) {
                    uniqueClients.set(key, apt);
                }
            });

            activeAgenda = Array.from(uniqueClients.values());

            // 4. ORDENAR PARA PRIORIDAD DE ATENCIÓN:
            // Regla 1: Clientas que NUNCA han recibido recordatorio van primero.
            // Regla 2: Entre las que nunca han recibido, la que tenga el servicio MÁS VIEJO va primero (urge más).
            // Regla 3: Al enviar un recordatorio, pasan al final de la lista.
            activeAgenda.sort((a, b) => {
                const lastRemA = a.lastReminderSent ? new Date(a.lastReminderSent).getTime() : 0;
                const lastRemB = b.lastReminderSent ? new Date(b.lastReminderSent).getTime() : 0;
                
                if (lastRemA !== lastRemB) {
                    return lastRemA - lastRemB; // Los 0 van arriba, los recientes van al fondo
                }
                
                // Si el estado de recordatorio es igual, la visita más antigua va primero
                const dateA = new Date((a.date || "2000-01-01") + "T" + (a.time || "00:00")).getTime();
                const dateB = new Date((b.date || "2000-01-01") + "T" + (b.time || "00:00")).getTime();
                return dateA - dateB; 
            });
        }

        if (selectedFilterDate) activeAgenda = activeAgenda.filter(a => window.normDate(a.date) === window.normDate(selectedFilterDate));
        
        // SEARCH FILTER (Global)
        const searchInput = document.getElementById('agenda-search-input');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (searchTerm) {
            const normalize = (val) => (val || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const termNorm = normalize(searchTerm);
            activeAgenda = activeAgenda.filter(a => {
                const nameMatch = normalize(a.name).includes(termNorm);
                const phoneMatch = (a.phone || '').toString().includes(termNorm);
                return nameMatch || phoneMatch;
            });
        }

        // --- SORTING AND HIGHLIGHTING FOR URGENT APPOINTMENTS ---
        const now = new Date();
        const nowTime = now.getTime();
        
        activeAgenda.forEach(appt => {
            appt.urgentSortWeight = 9999999999; 
            appt.isUrgent = false;

            if (appt.date && appt.time) {
                const apptDate = new Date(`${appt.date}T${appt.time || '00:00'}:00`);
                if (!isNaN(apptDate)) {
                    const diffMs = apptDate.getTime() - nowTime;
                    const diffMins = Math.floor(diffMs / 60000);
                    
                    // Si faltan entre -30 min (ya pasó hace poco) y 90 minutos, es "Urgente" y va primero.
                    if (diffMins >= -30 && diffMins <= 90) {
                        appt.isUrgent = true;
                        appt.urgentSortWeight = diffMins; // Va arriba (lo inminente va primero)
                    } else if (diffMins > 90) {
                        // Le sigue el resto del día pero después de los urgentes
                        appt.urgentSortWeight = 1000 + diffMins;
                    } else {
                        // Pasaron hace mucho (y no fueron canceladas) o son de días pasados
                        appt.urgentSortWeight = 100000 - diffMins; 
                    }
                }
            }
        });
        
        activeAgenda.sort((a, b) => a.urgentSortWeight - b.urgentSortWeight);
        // --------------------------------------------------------

        const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
        const allSvcsDB = JSON.parse(localStorage.getItem('margarita_services') || '[]');
        
        if (activeAgenda.length === 0) {
            let emptyMsg = "No hay citas en esta bandeja.";
            if (currentAgendaTray === 'incoming') emptyMsg = "Bandeja de entrada vacía.";
            if (currentAgendaTray === 'confirmed') emptyMsg = "No hay servicios en proceso.";
            if (currentAgendaTray === 'postponed') emptyMsg = "No hay citas aplazadas.";
            if (currentAgendaTray === 'reminders') emptyMsg = "No hay registros en la categoría de Uñas.";
            
            listContainer.innerHTML = `<p style="text-align:center; padding:50px; color:#aaa; border:1px dashed rgba(var(--accent-rgb), 0.1); border-radius:15px; background:rgba(255,255,255,0.3); font-style:italic;">${selectedFilterDate ? 'No hay citas para esta fecha en esta sección.' : emptyMsg}</p>`;
            _lastAgendaHash = null; // FIX: Resetear el hash para que al cambiar a otra bandeja con elementos, no asuma que todavía se están mostrando.
            return;
        }

        const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
        let html = '';
        
        // Agrupar citas por groupId para juntarlas visualmente
        let groupedAgenda = [];
        let groupMap = {};
        activeAgenda.forEach((apt, index) => {
            if (apt.groupId) {
                if (!groupMap[apt.groupId]) {
                    groupMap[apt.groupId] = [];
                    groupedAgenda.push(groupMap[apt.groupId]);
                }
                groupMap[apt.groupId].push(apt);
            } else {
                // Sin grupo: Creamos un grupo de un solo elemento con ID único
                const singleGId = `nogroup-${apt.id ? apt.id : (apt.originalIndex !== undefined ? apt.originalIndex : index)}`;
                groupMap[singleGId] = [apt];
                groupedAgenda.push(groupMap[singleGId]);
            }
        });

        groupedAgenda.forEach((group, gIndex) => {
            const isRemindersTray = currentAgendaTray === 'reminders';
            if (isRemindersTray) {
                const gId = group[0].groupId || `nogroup-${group[0].id ? group[0].id : (group[0].originalIndex !== undefined ? group[0].originalIndex : '')}`;
                const clientName = group[0].name || 'Sin Nombre';
                const clientPhone = group[0].phone || '';
                const cleanPhone = clientPhone.toString().replace(/\D/g,'');
                const servicesList = group.map(a => `<span style="background:rgba(var(--accent-rgb), 0.1); color:var(--color-dark-pink); padding:4px 10px; border-radius:15px; font-size:0.8rem; font-weight:700;">${a.service}</span>`).join(' ');

                // Cálculo de días transcurridos mejorado
                let daysInfo = "Fecha pendiente";
                let daysColor = "#aaa"; // Gris por defecto
                if (group[0].date) {
                    const sDate = new Date(group[0].date + "T00:00:00");
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffTime = today - sDate;
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Obtener ciclo de mantenimiento personalizado (o defecto 21)
                    const cycleDays = getMaintCycleForService(group[0].service);
                    const suggestedRetoucher = Math.floor(cycleDays * 0.7); // Naranja al 70% del tiempo
                    
                    if (diffDays < 0) {
                        daysInfo = diffDays === -1 ? "Mañana" : "Muy pronto";
                        daysColor = "#3498db"; // Azul para futuro
                    } else if (diffDays === 0) { 
                        daysInfo = "Realizado HOY"; 
                        daysColor = "#2ecc71"; 
                    } else if (diffDays === 1) { 
                        daysInfo = "Realizado ayer"; 
                        daysColor = "#2ecc71"; 
                    } else if (diffDays < suggestedRetoucher) { 
                        daysInfo = `Hace ${diffDays} días`; 
                        daysColor = "#2ecc71"; // Verde (Reciente)
                    } else if (diffDays >= suggestedRetoucher && diffDays < cycleDays) {
                        daysInfo = `Hace ${diffDays} días`; 
                        daysColor = "#f39c12"; // Naranja (Sugerido)
                    } else { 
                        daysInfo = `Hace ${diffDays} días`; 
                        daysColor = "#e74c3c"; // Rojo (Urgente)
                    }
                }

                // Info del último recordatorio
                const lastRem = group[0].lastReminderSent;
                const lastRemTxt = lastRem ? `Enviado: ${new Date(lastRem).toLocaleDateString('es-ES', {day:'numeric', month:'short'})}` : 'Nunca enviado';

                html += `
                <div class="glass-module reminder-card" data-group-id="${gId}" style="padding:20px; margin-bottom:15px; border-left: 6px solid #3498db; border-radius: 20px; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                            <div style="font-size:0.65rem; color:#aaa; text-transform:uppercase; font-weight:800; letter-spacing:1px;">Ficha de Cliente / Retoque</div>
                            <div style="background:${daysColor}1A; color:${daysColor}; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px; border:1px solid ${daysColor}33;">
                                <i class="far fa-clock"></i> ${daysInfo}
                            </div>
                        </div>
                        <h4 style="margin:0 0 8px 0; font-size:1.2rem; color:#1a1a1a; font-family:var(--font-heading);">${clientName}</h4>
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">${servicesList}</div>
                        
                        <div style="display:flex; align-items:center; gap:15px;">
                            <a href="https://wa.me/${cleanPhone}" target="_blank" style="color:#2ecc71; text-decoration:none; font-weight:700; display: inline-flex; align-items: center; gap: 6px; font-size:1rem;">
                                <i class="fab fa-whatsapp" style="font-size:1.2rem;"></i> ${clientPhone}
                            </a>
                            <div style="font-size:0.7rem; color:#888; background:#f9f9f9; padding:4px 10px; border-radius:8px; display:flex; align-items:center; gap:5px;">
                                <i class="fas fa-paper-plane" style="font-size:0.6rem; opacity:0.5;"></i> ${lastRemTxt}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button onclick="sendReminderWhatsApp(${group[0].originalIndex}, true)" style="background:#3498db; color:white; border:none; padding:12px 20px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);" class="hover-scale">
                            <i class="fas fa-magic"></i> ENVIAR RECORDATORIO
                        </button>
                        <button onclick="deleteAppointment(${group[0].originalIndex})" style="background:none; border:none; color:#ddd; cursor:pointer; font-size:1.1rem; transition:0.3s; padding:10px;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#ddd'" title="Eliminar Registro">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>`;
                return; // Saltar el renderizado normal de cita
            }

            const isMulti = group.length > 1;
            const gId = group[0].groupId || `nogroup-${group[0].id ? group[0].id : (group[0].originalIndex !== undefined ? group[0].originalIndex : '')}`;
            const isGroupPaid = group.some(a => a.paid === 'full');
            const isGroupPartial = group.some(a => a.paid === 'partial');
            
            // Persistent Switcher Index
            const activeIdx = window.activeSubcardIndices[gId] !== undefined ? window.activeSubcardIndices[gId] : 0;
            const safeIdx = activeIdx < group.length ? activeIdx : 0;

            // Dynamic Color Logic based on first item
            let accentColor = 'var(--color-dark-pink)'; 
            if (group[0].manual) accentColor = 'var(--gold-primary)';
            if (group[0].status === 'postponed') accentColor = '#f39c12';
            
            if (isGroupPartial) accentColor = '#f39c12'; 
            if (isGroupPaid) accentColor = '#2ecc71';    

            let glassBg = 'white';
            if (isGroupPartial) glassBg = 'rgba(243, 156, 18, 0.05)';
            if (isGroupPaid) glassBg = 'rgba(46, 204, 113, 0.08)';

            const parsePriceVal = (p) => {
                if (!p || p === 'Gratis') return 0;
                return parseInt(p.toString().replace(/\D/g, '')) || 0;
            };
            const isRealCombo = group.some(a => a.promoType === 'combo');
            const groupLabel = isRealCombo ? 'COMBO' : 'PAQUETE';

            // ATRIBUTOS DE DATOS: Identificador único para cirugía de DOM
            const groupDataStatus = isGroupPaid ? 'full' : (isGroupPartial ? 'partial' : 'none');
            const groupType = isRealCombo ? 'combo' : (group[0].manual ? 'manual' : 'standard');

            html += `<div class="glass-module appointment-group-card" 
                         data-group-id="${gId}" 
                         data-status="${group[0].status}" 
                         data-paid="${groupDataStatus}"
                         data-type="${groupType}"
                         style="padding:22px; margin-bottom:20px; border-left: 6px solid ${accentColor}; border-top: 1px solid rgba(var(--accent-rgb), 0.05); transition: 0.3s; opacity: ${group[0].status === 'postponed' ? '0.85' : '1'}; position: relative; overflow: hidden; border-radius: 20px; background: ${glassBg};">`;

            if (isMulti) {
                let optHtml = '';
                group.forEach((sub, i) => { 
                   optHtml += `<div class="custom-dropdown-item ${i === safeIdx ? 'selected' : ''}" onclick="window.selectSwitchedService('${gId}', ${i}, this)">Servicio ${i+1}: ${sub.service}</div>`; 
                });
                
                html += `
                <div style="margin-bottom:15px; display:inline-flex; align-items:center; gap:22px; background:white; padding:8px 25px; border-radius:30px; border:1px solid rgba(var(--accent-rgb),0.15); box-shadow:0 6px 20px rgba(var(--accent-rgb),0.06); position:relative;">
                    <span style="font-size: 0.85rem; font-weight: 800; color: ${isRealCombo ? 'var(--color-dark-pink)' : '#7f8c8d'}; display:flex; align-items:center; gap:8px; border-right: 1px solid #eee; padding-right:15px; letter-spacing:1px;">
                        <i class="fas fa-layer-group" style="font-size:1.1rem; opacity:0.7;"></i> <span>${groupLabel}</span>
                    </span>
                    <div class="custom-dropdown-container">
                        <div id="dropdown-toggle-${gId}" class="custom-dropdown-toggle" onclick="window.toggleServiceSwitcher(event, '${gId}')">
                             Servicio ${safeIdx + 1}: ${group[safeIdx].service}
                        </div>
                        <div id="dropdown-menu-${gId}" class="custom-dropdown-menu">
                            ${optHtml}
                        </div>
                    </div>
                </div>`;
            }

            group.forEach((apt, subIdx) => {
                let dateString = "Fecha N/A";
                let timeString = window.formatTime12h(apt.time);
                
                try {
                    if(apt.date) {
                        const d = new Date(`${apt.date}T${apt.time || '00:00'}`);
                        if(!isNaN(d)) {
                            dateString = d.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
                            
                            const duration = parseInt(apt.duration) || 60;
                            const startMins = d.getHours() * 60 + d.getMinutes();
                            const endMins = startMins + duration;
                            const endH = Math.floor(endMins / 60) % 24;
                            const endm = endMins % 60;
                            
                            const dEnd = new Date(d);
                            dEnd.setHours(endH, endm);
                            
                            const timeStartStr = window.formatTime12h(`${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
                            const timeEndStr = window.formatTime12h(`${endH}:${endm.toString().padStart(2, '0')}`);
                            
                            timeString = `${timeStartStr} - ${timeEndStr} (${duration}m)`;
                        }
                    }
                } catch (e) {
                    console.warn("Error parsing date for appt:", apt, e);
                }

                const statusLabel = apt.status === 'postponed' ? '<span style="background:#f39c12; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem; margin-top: -2px;">APLAZADA</span>' : '';

                const specData = specialists.find(s => s.name === apt.specialist);
                const specImg = specData && specData.image ? specData.image : '';
                const specInitial = apt.specialist ? apt.specialist.charAt(0).toUpperCase() : '?';
                const profPct = (specData && specData.profitPercent) ? parseInt(specData.profitPercent) : 50;

                // Subcard container 
                html += `<div class="subcard-${gId}" id="subcard-${gId}-${subIdx}" style="display: ${subIdx === safeIdx ? 'block' : 'none'}; animation: fadeIn 0.3s ease;">`;
                
                // Contenido original que iba en la glass-module
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:15px;">
                        <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                                    <div style="width:55px; height:55px; border-radius:15px; overflow:hidden; border:2px solid white; box-shadow:0 5px 15px rgba(0,0,0,0.08); flex-shrink:0; background:#f9f9f9; display:flex; align-items:center; justify-content:center;">
                                        ${specImg ? `<img src="${specImg}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:1.4rem; font-weight:bold; color:#ddd;">${specInitial}</div>`}
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:2px;">
                                        <h4 style="margin:0; color: #1a1a1a; font-family:var(--font-heading); font-size:1.3rem; line-height:1.2;">${apt.specialist || 'Keysi'} ${statusLabel}</h4>
                                        <span style="font-size:0.75rem; color:#888; text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Especialista</span>
                                    </div>
                                </div>

                                <div style="font-size:0.75rem; color:#888; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:2px; opacity:0.8;">${getCategoryName(apt.category || 'General')}</div>
                                
                                ${isRealCombo ? `
                                    <!-- LAYOUT PARA COMBOS (SÓLO INFO) -->
                                    <div style="margin-bottom:15px;">
                                        <p style="margin:4px 0 8px 0; color:var(--color-dark-pink); font-weight:700; font-size:1.15rem;">${apt.service || 'Servicio n/a'} <span style="font-weight:normal; color:#666; font-size:0.95rem;">(${apt.price || 'Gratis'})</span>${(() => { if (apt.promoType === 'discount' && apt.splitPrice && parsePriceVal(apt.price) > apt.splitPrice) { const dp = Math.round((1-(apt.splitPrice/parsePriceVal(apt.price)))*100); return `<span style="font-size:0.6rem; background:var(--color-dark-pink); color:white; padding:2px 7px; border-radius:20px; font-weight:800; margin-left:6px; vertical-align:middle;">-${dp}% DESC</span>`; } return ''; })()}</p>
                                        <p style="margin:0; font-size:0.85rem; color:#444; display:flex; align-items:center; gap:6px;">
                                            <i class="fas fa-user" style="opacity:0.8; color:#888;"></i> Datos Cliente: 
                                            <strong style="color:#1a1a1a;">${apt.name || 'Sin Nombre'}</strong> 
                                            <a href="https://wa.me/${apt.phone && apt.phone !== 'N/A' ? apt.phone.toString().replace(/\D/g,'') : ''}" target="_blank" style="color:#2ecc71; text-decoration:none; font-weight:700; display: inline-flex; align-items: center; gap: 4px; margin-left:5px;">
                                                <i class="fab fa-whatsapp"></i> ${apt.phone || ''}
                                            </a>
                                        </p>
                                    </div>
                                ` : `
                                    <!-- LAYOUT NORMAL PARA INDIVIDUALES -->
                                    <p style="margin:4px 0 8px 0; color:var(--color-dark-pink); font-weight:700; font-size:1.15rem;">${apt.service || 'Servicio n/a'} <span style="font-weight:normal; color:#666; font-size:0.95rem;">(${apt.price || 'Gratis'})</span>${(() => { 
                                        const pBase = parsePriceVal(apt.price);
                                        const pFinal = parsePriceVal(apt.splitPrice || apt.price);
                                        const hasDiscount = (apt.promoType === 'discount') || (apt.splitPrice && pFinal < pBase);
                                        if (hasDiscount && pBase > 0) { 
                                            // Priorizar el porcentaje guardado en la cita para evitar errores de redondeo
                                            const dp = apt.promoPercent || Math.round((1-(pFinal/pBase))*100); 
                                            return `<span style="font-size:0.6rem; background:var(--color-dark-pink); color:white; padding:2px 7px; border-radius:20px; font-weight:800; margin-left:6px; vertical-align:middle;">-${dp}% DESC</span>`; 
                                        } 
                                        return ''; 
                                    })()}</p>
                                    <p style="margin:0; font-size:0.85rem; color:#444; display:flex; align-items:center; gap:6px;">
                                        <i class="fas fa-user" style="opacity:0.8; color:#888;"></i> Datos Cliente: 
                                        <strong style="color:#1a1a1a;">${apt.name || 'Sin Nombre'}</strong> 
                                        <a href="https://wa.me/${apt.phone && apt.phone !== 'N/A' ? apt.phone.toString().replace(/\D/g,'') : ''}" target="_blank" style="color:#2ecc71; text-decoration:none; font-weight:700; display: inline-flex; align-items: center; gap: 4px; margin-left:5px;">
                                            <i class="fab fa-whatsapp"></i> ${apt.phone || ''}
                                        </a>
                                    </p>
                                `}
                                <div class="apt-actions" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:20px;">
                                    ${currentAgendaTray === 'incoming' ? `
                                        <button onclick="updateAptStatus(${apt.originalIndex}, 'confirmed')" style="background:#2ecc71; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(46, 204, 113, 0.2);" class="hover-scale">
                                            <i class="fas fa-check-circle"></i> Confirmar Cita
                                        </button>
                                        <button onclick="updateAptStatus(${apt.originalIndex}, 'postponed')" style="background:#f39c12; color:white; border:none; padding:10px 14px; border-radius:12px; cursor:pointer; font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(243, 156, 18, 0.2);" class="hover-scale">
                                            <i class="fas fa-history"></i> Aplazar
                                        </button>
                                        <button onclick="updateAptStatus(${apt.originalIndex}, 'cancelled')" style="background:#e74c3c; color:white; border:none; padding:10px 14px; border-radius:12px; cursor:pointer; font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(231, 76, 60, 0.2);" class="hover-scale">
                                            <i class="fas fa-times-circle"></i> Cancelar
                                        </button>
                                    ` : ''}

                                    ${currentAgendaTray === 'confirmed' ? `
                                        ${apt.isUrgent ? `
                                            <button onclick="sendReminderWhatsApp(${apt.originalIndex})" style="background:#3498db; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(52, 152, 219, 0.2);" class="hover-scale">
                                                <i class="fas fa-bell fa-bell-shake"></i> RECORDATORIO
                                            </button>
                                        ` : ''}
                                        ${(apt.paid === 'full' || isGroupPaid) ? `
                                            <button onclick="updateAptStatus(${apt.originalIndex}, 'accepted')" style="background:#2ecc71; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(46, 204, 113, 0.3);" class="hover-scale">
                                                <i class="fas fa-check-double"></i> FINALIZAR SERVICIO
                                            </button>
                                        ` : ''}
                                        <button onclick="updateAptStatus(${apt.originalIndex}, 'postponed')" style="background:#f39c12; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(243, 156, 18, 0.2);" class="hover-scale">
                                            <i class="fas fa-history"></i> APLAZAR
                                        </button>
                                        <button onclick="updateAptStatus(${apt.originalIndex}, 'cancelled')" style="background:#e74c3c; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(231, 76, 60, 0.2);" class="hover-scale">
                                            <i class="fas fa-ban"></i> CANCELAR
                                        </button>
                                    ` : ''}

                                    ${currentAgendaTray === 'postponed' ? `
                                        <button onclick="updateAptStatus(${apt.originalIndex}, 'confirmed')" style="background:#2ecc71; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(46, 204, 113, 0.2);" class="hover-scale">
                                            <i class="fas fa-check-circle"></i> Confirmar Cita
                                         </button>
                                         <button onclick="updateAptStatus(${apt.originalIndex}, 'postponed')" style="background:#f39c12; color:white; border:none; padding:10px 15px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; transition:0.3s;" class="hover-scale">
                                            <i class="fas fa-calendar-alt"></i> Re-Aplazar
                                         </button>
                                         <button onclick="updateAptStatus(${apt.originalIndex}, 'cancelled')" style="background:#e74c3c; color:white; border:none; padding:10px 15px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; transition:0.3s;" class="hover-scale">
                                            <i class="fas fa-trash-alt"></i> Eliminar
                                         </button>
                                     ` : ''}
                                     
                                     ${currentAgendaTray === 'reminders' ? `
                                        <button onclick="sendReminderWhatsApp(${apt.originalIndex})" style="background:#3498db; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(52, 152, 219, 0.2);" class="hover-scale">
                                            <i class="fas fa-bell"></i> ENVIAR RECORDATORIO
                                        </button>
                                        <button onclick="deleteAppointment(${apt.originalIndex})" style="background:#e74c3c; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s;" class="hover-scale">
                                            <i class="fas fa-trash-alt"></i> ELIMINAR REGISTRO
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <div style="text-align:right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width:155px; pointer-events: none;">
                                <div style="pointer-events: auto; background:${accentColor}1A; padding:6px 12px; border-radius:10px; font-size:0.8rem; color: #1a1a1a; font-weight:700; border: 1px solid ${accentColor}26; display:flex; align-items:center; gap:6px; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                                    <i class="far fa-calendar-alt" style="opacity:0.6;"></i> ${dateString} - ${timeString}
                                </div>
                                
                                <div style="display:flex; align-items:flex-start; gap:15px; justify-content:flex-end; width:100%; pointer-events:auto; margin-top:8px;">
                                    ${currentAgendaTray === 'incoming' ? `
                                        <!-- DESGLOSE HORIZONTAL PARA ENTRANTES (IMAGEN 1) -->
                                        ${(() => {
                                            const nominalPrice = apt.splitPrice || parsePriceVal(apt.price);
                                            const comboTotal = group.reduce((acc, curr) => {
                                                return acc + (curr.splitPrice || parsePriceVal(curr.price));
                                            }, 0);
                                            return `
                                            <div style="background:rgba(0,0,0,0.03); border-radius:12px; padding:10px 18px; display:flex; flex-direction:column; gap:4px; border:1px solid rgba(0,0,0,0.05); min-width:215px; pointer-events:auto;">
                                                <div style="display:flex; gap:12px; font-size:0.7rem; color:#777; align-items:center;">
                                                    <span style="font-weight:700; min-width:115px; font-size:0.65rem;"><i class="fas fa-tags"></i> PRECIO TOTAL:</span>
                                                    <span style="font-weight:900; color:#1a1a1a;">${fmt(comboTotal)}</span>
                                                </div>
                                                <div style="display:flex; gap:12px; font-size:0.7rem; align-items:center;">
                                                    <span style="color:#2ecc71; font-weight:700; min-width:115px; font-size:0.65rem;"><i class="fas fa-user-tie"></i> Ella (${profPct}%):</span>
                                                    <span style="font-weight:800; color:#27ae60; font-size:0.75rem;">${fmt(nominalPrice * (profPct / 100))}</span>
                                                </div>
                                                <div style="display:flex; gap:12px; font-size:0.7rem; align-items:center;">
                                                    <span style="color:var(--color-dark-pink); font-weight:700; min-width:115px; font-size:0.65rem;"><i class="fas fa-store-alt"></i> Estudio (${100 - profPct}%):</span>
                                                    <span style="font-weight:800; color:var(--color-dark-pink); font-size:0.75rem;">${fmt(nominalPrice * ((100 - profPct) / 100))}</span>
                                                </div>
                                            </div>`;
                                        })()}
                                    ` : `
                                        <!-- PROGRESO/APLAZADOS (IMAGEN 3): Columna [Botón, Desglose] + Foto -->
                                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px;">
                                            ${apt.status === 'confirmed' ? `
                                                <div class="custom-dropdown-container">
                                                    <button onclick="window.toggleServiceSwitcher(event, 'pay-${apt.originalIndex}')" style="background:${apt.paid ? (apt.paid==='full'?'#2ecc71':'#f39c12') : '#eee'}; color:${apt.paid ? 'white' : '#666'}; border:none; padding:8px 15px; border-radius:12px; cursor:pointer; font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:6px; transition:0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.05); white-space:nowrap;" class="hover-scale">
                                                        <i class="fas ${apt.paid==='full' ? 'fa-check-double' : (apt.paid==='partial' ? 'fa-wallet' : 'fa-hand-holding-usd')}"></i> 
                                                        ${apt.paid==='full' ? 'PAGADA' : (apt.paid==='partial' ? 'ABONO 50%' : 'MARCAR PAGO')} 
                                                        <i class="fas fa-chevron-down" style="font-size:0.6rem; opacity:0.7;"></i>
                                                    </button>
                                                    <div id="dropdown-menu-pay-${apt.originalIndex}" class="custom-dropdown-menu" style="left:auto; right:0; top:100%; min-width:160px; z-index:99999;">
                                                        <div class="custom-dropdown-item" onclick="setPaymentStatus(${apt.originalIndex}, 'full')" style="font-size:0.85rem; padding:10px 14px;"><i class="fas fa-check-circle" style="color:#2ecc71;"></i> Pago Total</div>
                                                        <div class="custom-dropdown-item" onclick="setPaymentStatus(${apt.originalIndex}, 'partial')" style="font-size:0.85rem; padding:10px 14px;"><i class="fas fa-adjust" style="color:#f39c12;"></i> Abono 50%</div>
                                                        <div class="custom-dropdown-item" onclick="setPaymentStatus(${apt.originalIndex}, null)" style="font-size:0.85rem; padding:10px 14px;"><i class="fas fa-times" style="color:#e74c3c;"></i> Sin Pago</div>
                                                    </div>
                                                </div>
                                            ` : (apt.paid ? `
                                                <div style="background:${apt.paid==='full'?'#2ecc71':'#f39c12'}; color:white; padding:8px 15px; border-radius:12px; font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:6px; white-space:nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                                                    <i class="fas ${apt.paid==='full' ? 'fa-check-double' : 'fa-wallet'}"></i> 
                                                    ${apt.paid==='full' ? 'PAGADA' : 'ABONO 50%'} 
                                                </div>
                                            ` : '')}

                                            ${(() => {
                                                const nominalPrice = apt.splitPrice || parsePriceVal(apt.price);
                                                const comboTotal = group.reduce((acc, curr) => {
                                                    return acc + (curr.splitPrice || parsePriceVal(curr.price));
                                                }, 0);
                                                return `
                                                <!-- DESGLOSE VERTICAL DEBAJO DEL BOTON -->
                                                <div style="background:rgba(0,0,0,0.03); border-radius:12px; padding:10px 18px; display:flex; flex-direction:column; gap:4px; border:1px solid rgba(0,0,0,0.05); min-width:215px; pointer-events:auto;">
                                                    <div style="display:flex; gap:12px; font-size:0.7rem; color:#777; align-items:center;">
                                                        <span style="font-weight:700; min-width:115px; font-size:0.65rem;"><i class="fas fa-tags"></i> PRECIO TOTAL:</span>
                                                        <span style="font-weight:900; color:#1a1a1a;">${fmt(comboTotal)}</span>
                                                    </div>
                                                    <div style="display:flex; gap:12px; font-size:0.7rem; align-items:center;">
                                                        <span style="color:#2ecc71; font-weight:700; min-width:115px; font-size:0.65rem;"><i class="fas fa-user-tie"></i> Ella (${profPct}%):</span>
                                                        <span style="font-weight:800; color:#27ae60; font-size:0.75rem;">${fmt(nominalPrice * (profPct / 100))}</span>
                                                    </div>
                                                    <div style="display:flex; gap:12px; font-size:0.7rem; align-items:center;">
                                                        <span style="color:var(--color-dark-pink); font-weight:700; min-width:115px; font-size:0.65rem;"><i class="fas fa-store-alt"></i> Estudio (${100 - profPct}%):</span>
                                                        <span style="font-weight:800; color:var(--color-dark-pink); font-size:0.75rem;">${fmt(nominalPrice * ((100 - profPct) / 100))}</span>
                                                    </div>
                                                </div>`;
                                            })()}
                                        </div>
                                    `}
                                    ${(() => {
                                        let finalImg = apt.img;
                                        if (!finalImg && apt.service) {
                                            const searchTitle = apt.service.trim().toLowerCase();
                                            const found = allSvcsDB.find(s => (s.title || '').trim().toLowerCase() === searchTitle);
                                            if (found) finalImg = found.img;
                                        }

                                        // Estilo común para el contenedor (thumbnail o placeholder)
                                        const containerStyle = `cursor:pointer; width:85px; height:85px; border-radius:18px; overflow:hidden; border:2.5px solid white; box-shadow:0 8px 25px rgba(0,0,0,0.1); transition:0.3s; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:#f9f9f9;`;
                                        const hoverEffects = `onmouseover="this.style.transform='scale(1.05)'; this.style.borderColor='var(--color-dark-pink)'" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='white'"`;

                                        if (finalImg) {
                                            return `
                                                <div class="agenda-service-thumb" onclick="openImageZoom('${finalImg.replace(/'/g, "\\'")}')" style="${containerStyle}" title="Clic para ampliar" ${hoverEffects}>
                                                    <img src="${finalImg}" style="width:100%; height:100%; object-fit:cover; display:block;">
                                                </div>
                                            `;
                                        } else {
                                            // PLACEHOLDER: Si no hay foto, mostramos un icono elegante
                                            return `
                                                <div class="agenda-service-placeholder" style="${containerStyle} background:rgba(var(--accent-rgb), 0.03); border-color:rgba(var(--accent-rgb), 0.1);" ${hoverEffects} title="Servicio sin foto">
                                                    <i class="fas fa-magic" style="font-size:1.8rem; color:rgba(var(--accent-rgb), 0.2);"></i>
                                                </div>
                                            `;
                                        }
                                    })()}
                                </div>

                                <div style="margin-top:auto; pointer-events: auto; padding-top: 10px;">
                                    <button onclick="deleteAppointment(${apt.originalIndex})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.1rem; transition:0.3s; padding:5px;" onmouseover="this.style.color='#c0392b'" onmouseout="this.style.color='#e74c3c'" title="Eliminar definitivamente">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>`; // Cierre subcard
            });
            
            html += `</div>`; // Cierre de la glass-module de todo el grupo
        });

        // VERIFICACIÓN DE HASH: Solo re-renderizar si los datos REALMENTE cambiaron
        const currentHash = btoa(unescape(encodeURIComponent(groupedAgenda.map(g => g.map(a => a.id + a.status).join()).join('|'))));
        if (_lastAgendaHash === currentHash) {
            console.log("⏭️ [Agenda] Los datos no han cambiado, saltando re-renderizado para estabilidad.");
            return; 
        }
        _lastAgendaHash = currentHash;

        // ── LAZY LOADING DOM-BASED ──
        // Renderizamos TODO el HTML de una vez pero ocultamos los grupos más allá
        // de la primera página. Un IntersectionObserver los va revelando al hacer scroll.
        if (_agendaLazyObserver) { _agendaLazyObserver.disconnect(); _agendaLazyObserver = null; }

        // Inyectar todo el HTML
        listContainer.innerHTML = html;

        // Seleccionar todos los grupos renderizados
        const allModules = listContainer.querySelectorAll('.glass-module');
        const totalGroups = allModules.length;

        if (totalGroups > _agendaPageSize) {
            // Ocultar los grupos más allá de la primera página
            for (let i = _agendaPageSize; i < totalGroups; i++) {
                allModules[i].style.display = 'none';
            }

            let nextVisible = _agendaPageSize;

            const revealNextBatch = () => {
                const end = Math.min(nextVisible + _agendaPageSize, totalGroups);
                for (let i = nextVisible; i < end; i++) {
                    // Restaurar display:flex explicitamente (display='' borra el flex del inline style)
                    allModules[i].style.display = 'flex';
                }
                nextVisible = end;

                // Quitar sentinel anterior
                const oldSentinel = document.getElementById('lazy-sentinel');
                if (oldSentinel) oldSentinel.remove();

                // Si quedan más, crear nuevo sentinel
                if (nextVisible < totalGroups) {
                    const sentinel = document.createElement('div');
                    sentinel.id = 'lazy-sentinel';
                    sentinel.style.cssText = 'text-align:center;padding:18px;color:#bbb;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;';
                    sentinel.innerHTML = `<i class="fas fa-spinner fa-spin" style="color:var(--color-dark-pink);"></i> Cargando más citas... (${nextVisible}/${totalGroups})`;
                    listContainer.appendChild(sentinel);
                    _agendaLazyObserver = new IntersectionObserver((e) => {
                        if (e[0].isIntersecting) { _agendaLazyObserver.disconnect(); revealNextBatch(); }
                    }, { rootMargin: '150px' });
                    _agendaLazyObserver.observe(sentinel);
                }
            };

            // Primer sentinel
            const firstSentinel = document.createElement('div');
            firstSentinel.id = 'lazy-sentinel';
            firstSentinel.style.cssText = 'text-align:center;padding:18px;color:#bbb;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;';
            firstSentinel.innerHTML = `<i class="fas fa-spinner fa-spin" style="color:var(--color-dark-pink);"></i> Cargando más citas... (${_agendaPageSize}/${totalGroups})`;
            listContainer.appendChild(firstSentinel);
            _agendaLazyObserver = new IntersectionObserver((e) => {
                if (e[0].isIntersecting) { _agendaLazyObserver.disconnect(); revealNextBatch(); }
            }, { rootMargin: '150px' });
            _agendaLazyObserver.observe(firstSentinel);

            console.log(`✨ [Agenda Lazy] ${_agendaPageSize}/${totalGroups} visibles. Resto carga al hacer scroll.`);
        } else {
            console.log(`✨ [Agenda] ${totalGroups} grupos — render directo (menor que ${_agendaPageSize}).`);
        }

        // Restaurar scroll inmediatamente
        window.scrollTo({ top: scrollPos, behavior: 'instant' });
        
        // Liberar altura mínima
        setTimeout(() => { listContainer.style.minHeight = '0px'; }, 100);
    } catch (globalError) {
        console.error("Global error in renderAgenda:", globalError);
    }
}

window.sendReminderWhatsApp = function(index, isMaintenance = false) {
    const agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const apt = agenda[index];
    if (!apt || !apt.phone) {
        if(window.showToast) window.showToast('No hay teléfono registrado para esta cita.', 'error');
        return;
    }
    
    let phoneNum = apt.phone.toString().replace(/\D/g, '');
    if (!phoneNum) {
        if(window.showToast) window.showToast('Teléfono inválido.', 'error');
        return;
    }
    
    // Add prefix +57 if the number looks like a local mobile (10 digits starting with 3)
    if (phoneNum.length === 10 && phoneNum.startsWith('3')) {
        phoneNum = '57' + phoneNum;
    }
    
    let timeLabel = apt.time || '';
    if (window.formatTime12h && timeLabel) {
        timeLabel = window.formatTime12h(timeLabel);
    }
    
    const docName = apt.specialist || 'StyleSync Pro';
    const clientName = (apt.name || 'hermosa').split(' ')[0]; // Solo primer nombre para calidez
    const businessName = localStorage.getItem('margarita_site_name') || 'StyleSync Pro';
    
    let msg = "";
    if (isMaintenance || currentAgendaTray === 'reminders') {
        msg = `✨ *Cuidado de tus Uñas* ✨\n\n¡Hola, ${clientName}! 👋🏼\n\nTe escribimos de *${businessName}* para saludarte y recordarte que ya es tiempo de consentir tus uñas con un mantenimiento o un nuevo diseño. 💅🏼✨\n\n¿Te gustaría que te agendemos un espacio para esta semana? ¡Nos encantaría verte de nuevo! 💖`;
        
        // --- Registro de Último Recordatorio ---
        try {
            const currentAgenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
            if (currentAgenda[index]) {
                const nowIso = new Date().toISOString();
                currentAgenda[index].lastReminderSent = nowIso;
                
                // Si es un combo, marcar a todos los del grupo
                if (currentAgenda[index].groupId) {
                    currentAgenda.forEach(a => {
                        if (a.groupId === currentAgenda[index].groupId) {
                            a.lastReminderSent = nowIso;
                        }
                    });
                }
                
                localStorage.setItem('margarita_appointments', JSON.stringify(currentAgenda));
                if (window.saveListToCloud) window.saveListToCloud('citas_v2', currentAgenda);
                
                // Re-renderizar para mostrar la fecha actualizada sin recargar
                setTimeout(() => renderAgenda(), 500);
            }
        } catch(e) { console.error("Error saving reminder date:", e); }
        // ----------------------------------------
        
    } else {
        msg = `✨ *Recordatorio de Cita* ✨\n\n¡Hola, ${clientName}! 👋🏼\n\nTe escribimos de *${businessName}* para recordarte tu próxima cita programada con nosotros:\n\n💅🏼 *Servicio:* ${apt.service || 'Belleza'}\n⏰ *Hora:* ${timeLabel}\n👩🏻‍🎨 *Especialista:* ${docName}\n\nPor favor, recuerda llegar con unos minutos de anticipación. Si requieres reprogramar, avísanos en cuanto antes. 🙏🏼\n\n¿Nos confirmas tu asistencia con un "Sí"? 💖`;
    }
    
    const url = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

window.updateAptStatus = function(index, newStatus) {
    if (newStatus === 'postponed') {
        openRescheduleModal(index);
        return;
    }

    let agenda = JSON.parse(localStorage.getItem('margarita_appointments'));
    const targetApt = agenda[index];
    const isCombo = targetApt && targetApt.groupId && (agenda.filter(a => a.groupId === targetApt.groupId).length > 1);

    let msg = '¿Confirmar cambio de estado?';
    if(newStatus === 'confirmed') msg = isCombo ? '¿Deseas confirmar este PAQUETE COMPLETO? Se moverán todos los servicios a EN PROCESO.' : '¿Deseas confirmar este SERVICIO? Se moverá a la bandeja de EN PROCESO.';
    if(newStatus === 'pending') msg = '¿Regresar esta cita a la bandeja de ENTRANTES?';
    if(newStatus === 'accepted') msg = isCombo ? '¿Confirmar que el PAQUETE COMPLETO fue finalizado? Se moverán todos al historial.' : '¿Confirmar que este servicio fue PAGADO y finalizado? Se moverá al historial.';
    if(newStatus === 'cancelled') msg = isCombo ? '¿Cancelar este PAQUETE COMPLETO?' : '¿Cancelar este servicio? Se moverá al historial como cancelado.';

    showConfirmManual(msg, () => {
        window._isUpdatingLocal = true; // ACTIVAR BLOQUEO
        if (isCombo) {
            // Actualizar todos los que tengan el mismo groupId en memoria
            agenda.forEach(a => {
                if (a.groupId === targetApt.groupId) {
                    a.status = newStatus;
                }
            });

            // UI OPTIMISTA: Cambios visuales inmediatos sin parpadeo
            const card = document.querySelector(`[data-group-id="${targetApt.groupId}"]`);
            if (card) {
                // Para cualquier cambio de bandeja: fade out y eliminar del DOM
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateY(-10px) scale(0.98)';
                setTimeout(() => card.remove(), 300);
            }
        } else {
            // Solo el individual en memoria
            agenda[index].status = newStatus;
            
            // UI OPTIMISTA Individual
            // UI OPTIMISTA Individual - Usar la misma lógica de ID que el render
            const gId = targetApt.groupId || `nogroup-${targetApt.id ? targetApt.id : (targetApt.originalIndex !== undefined ? targetApt.originalIndex : index)}`;
            const card = document.querySelector(`[data-group-id="${gId}"]`);
            if (card) {
               card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
               card.style.opacity = '0';
               card.style.transform = 'translateY(-10px) scale(0.98)';
               setTimeout(() => card.remove(), 250); 
            }
        }

        localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
        
        // ✅ Actualizar numeritos INSTANTÁNEAMENTE (sin esperar Firestore)
        if (window.updateBadges) window.updateBadges();
        
        // Sync to Firestore (En segundo plano)
        if (window.saveListToCloud) {
            window.saveListToCloud('citas_v2', agenda);
        }

        // LIBERAR BLOQUEO después de un momento
        setTimeout(() => {
            window._isUpdatingLocal = false;
        }, 1000);
        
        showToast(isCombo ? 'Paquete actualizado.' : 'Cita actualizada.');
    });
};

// Using the custom one I might have created or just a simple confirm for now
function showConfirmManual(msg, cb) {
    if (window.showConfirm) {
        window.showConfirm(msg, cb);
    } else {
        if (confirm(msg)) cb();
    }
}

// ----------------------------------------------------
// APLAZAR CITAS
// ----------------------------------------------------
let currentRescheduleIndex = -1;

window.openRescheduleModal = function(index) {
    currentRescheduleIndex = index;
    const agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const apt = agenda[index];
    if (!apt) return;
    
    const dateInp = document.getElementById('reschedule-date');
    const timeInp = document.getElementById('reschedule-time');
    
    if (dateInp) {
        dateInp.value = apt.date || '';
        dateInp.setAttribute('min', new Date().toLocaleDateString('sv-SE'));
    }
    if (timeInp) timeInp.value = apt.time || '';
    
    document.getElementById('rescheduleModal').style.display = 'flex';
}

window.closeRescheduleModal = function() {
    document.getElementById('rescheduleModal').style.display = 'none';
}

window.exportHistory = function() {
    const agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const history = agenda.filter(a => a.status === 'accepted' || a.status === 'cancelled');
    
    if (history.length === 0) {
        showToast("No hay datos en el historial para exportar.", "error");
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    const years = [...new Set(history.map(a => a.date.split('-')[0]))].sort((a,b) => b-a);
    const monthsNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    overlay.innerHTML = `
        <div class="custom-modal" style="max-width: 400px; padding: 30px; border-top: 5px solid var(--gold-primary);">
            <h3 style="margin-top: 0; color: var(--gold-primary);"><i class="fas fa-file-excel"></i> Exportar a Excel</h3>
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">Selecciona el periodo que deseas extraer:</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                <div class="form-group">
                    <label style="display: block; font-size: 0.8rem; font-weight: bold; margin-bottom: 5px; text-align: left;">Año:</label>
                    <select id="export-year" class="admin-input" style="width: 100%;">
                        <option value="all">-- Todos los años --</option>
                        ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label style="display: block; font-size: 0.8rem; font-weight: bold; margin-bottom: 5px; text-align: left;">Mes:</label>
                    <select id="export-month" class="admin-input" style="width: 100%;">
                        <option value="all">-- Todos los meses --</option>
                        ${monthsNames.map((m, i) => `<option value="${String(i+1).padStart(2, '0')}">${m}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn-cancel" style="background:#eee; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">Cancelar</button>
                <button class="btn-confirm" style="background:var(--gold-primary); color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">Generar Excel</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeModal = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.btn-cancel').onclick = closeModal;
    
    overlay.querySelector('.btn-confirm').onclick = () => {
        const selectedYear = document.getElementById('export-year').value;
        const selectedMonth = document.getElementById('export-month').value;
        let filteredData = history;
        if (selectedYear !== 'all') filteredData = filteredData.filter(a => a.date.startsWith(selectedYear));
        if (selectedMonth !== 'all') filteredData = filteredData.filter(a => a.date.split('-')[1] === selectedMonth);
        
        if (filteredData.length === 0) {
            showToast("No hay datos para el periodo seleccionado.", "error");
            return;
        }
        closeModal();
        generateExcelFile(filteredData, selectedMonth, selectedYear);
    };
}

function generateExcelFile(historyData, monthParam, yearParam) {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthText = monthParam === 'all' ? "ANUAL" : monthNames[parseInt(monthParam)-1].toUpperCase();
    const yearText = yearParam === 'all' ? "" : yearParam;
    let totalIngresos = 0;
    
    let excelOutput = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head>
    <body>
    <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt;">
      <thead>
        <tr>
          <th colspan="10" style="font-size: 16pt; font-weight: bold; background-color: #A05D6B; color: white; padding: 15px; text-align: center; border: 1px solid #ccc;">
            REGISTRO DE SERVICIOS - STYLESYNC PRO (${monthText} ${yearText})
          </th>
        </tr>
        <tr style="background-color: #f2f2f2; color: #000;">
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">#</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Fecha</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Hora</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Cliente</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Teléfono</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Servicio</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Precio</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Especialista</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Estado</th>
          <th style="font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left;">Fecha Registro</th>
        </tr>
      </thead>
      <tbody>
    `;

    historyData.forEach((a, index) => {
        let numericPrice = parseInt((a.splitPrice || a.price || "$0").toString().replace(/[^0-9]/g, "")) || 0;
        if (a.status === 'accepted') totalIngresos += numericPrice;
        
        const priceLabel = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(numericPrice) + " COP";
        const timeLabel = window.formatTime12h ? window.formatTime12h(a.time) : (a.time || 'N/A');

        excelOutput += `
        <tr>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${index + 1}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${a.date}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${timeLabel}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${a.name || 'N/A'}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${a.phone || 'N/A'}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${a.service}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${priceLabel}</td>
          <td style="padding: 5px; border: 1px solid #eee; text-align: left;">${a.specialist}</td>
          <td style="padding: 5px; border: 1px solid #eee; color: ${a.status === 'accepted' ? '#2ecc71' : '#e74c3c'}; font-weight: bold; text-align: left;">${a.status.toUpperCase()}</td>
          <td style="padding: 5px; border: 1px solid #eee; font-size: 8pt; color: #999; text-align: left;">${a.createdAt || 'N/A'}</td>
        </tr>
        `;
    });
    
    const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalIngresos);
    excelOutput += `
        <tr style="background-color: #f9f9f9;">
          <td colspan="6" style="padding: 10px; border: 1px solid #ccc; text-align: right; font-weight: bold; font-size: 12pt;">TOTAL INGRESOS (${monthText}):</td>
          <td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: left; font-weight: bold; font-size: 14pt; color: #2ecc71;">${formattedTotal} COP</td>
        </tr>
    `;
    excelOutput += "</tbody></table></body></html>";
    const blob = new Blob([excelOutput], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historial_${monthText}_${yearText}.xls`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { if(document.body.contains(link)) document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    showToast(`Excel generado (${monthText}). Total: ${formattedTotal}`);
}

window.deleteAppointment = function(index) {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const targetApt = agenda[index];
    if (!targetApt) return;

    // LÓGICA CORRECTA:
    // - COMBO: eliminar TODO el grupo junto (precio único indivisible)
    // - PAQUETE (package): eliminar individualmente (cada servicio tiene precio propio)
    const isCombo = targetApt.groupId && targetApt.promoType === 'combo' && agenda.filter(a => a.groupId === targetApt.groupId).length > 1;
    const msg = isCombo ? `${areYouSure} que quieres borrar el Combo completo?` : `${areYouSure} que quieres borrar esta cita?`;

    showConfirm(msg, () => {
        window._isUpdatingLocal = true; // ACTIVAR BLOQUEO

        // UI OPTIMISTA: Animación de salida sin refrescar la lista completa (evita parpadeos)
        const gId = targetApt.groupId || `nogroup-${targetApt.id ? targetApt.id : (targetApt.originalIndex !== undefined ? targetApt.originalIndex : index)}`;
        const card = document.querySelector(`[data-group-id="${gId}"]`);
        if (card) {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-10px) scale(0.98)';
            setTimeout(() => {
                card.remove();
                // Si la bandeja queda vacía, inyectar mensaje informativo
                const listContainer = document.getElementById('agenda-list-container');
                if (listContainer && !listContainer.querySelector('.glass-module')) {
                    listContainer.innerHTML = `<div style="text-align:center; padding:50px 20px; color:#999; font-weight:500;">
                        <i class="far fa-calendar-times" style="font-size:3rem; color:var(--color-accent); opacity:0.3; margin-bottom:15px; display:block;"></i>
                        No hay citas registradas en esta bandeja.
                    </div>`;
                }
            }, 300);
        }

        if (isCombo) {
            agenda = agenda.filter(a => a.groupId !== targetApt.groupId);
        } else {
            agenda.splice(index, 1);
        }
        localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
        
        // Actualizar contadores de alerta de forma inmediata
        if (window.updateBadges) window.updateBadges();

        // Sync to Firestore (Robust Cloud) en segundo plano
        if (window.saveListToCloud) {
            window.saveListToCloud('citas_v2', agenda);
        }

        // Liberar bloqueo de actualización de fondo
        setTimeout(() => {
            window._isUpdatingLocal = false;
        }, 1000);

        showToast(isCombo ? 'Combo eliminado.' : 'Cita eliminada.');
    });
}

// --- GESTIÓN DE VACIADO DE HISTORIAL ---
window.openDeleteHistoryModal = function() {
    document.getElementById('deleteHistoryModal').style.display = 'flex';
}

window.closeDeleteHistoryModal = function() {
    document.getElementById('deleteHistoryModal').style.display = 'none';
}

window.clearEntireHistory = function() {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    
    showConfirm(`${areYouSure} que deseas eliminar TODO el historial? Esta acción no se puede deshacer y se borrará de la nube.`, () => {
        let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
        
        // Mantener solo las citas que NO son historial (ni aceptadas ni canceladas)
        const newAgenda = agenda.filter(a => a.status !== 'accepted' && a.status !== 'cancelled');
        
        localStorage.setItem('margarita_appointments', JSON.stringify(newAgenda));
        
        // SINCRONIZAR CON LA NUBE (VITAL para que no se restaure)
        if (window.saveListToCloud) {
            window.saveListToCloud('citas_v2', newAgenda);
        }
        
        closeDeleteHistoryModal();
        renderHistory();
        showToast("Historial vaciado completamente.", "success");
    });
}



// AUTO-CANCELLACIÓN DE CITAS VENCIDAS (SOLO ENTRANTES)
window.autoCancelOverdueAppointments = function(avoidRender = false) {
    let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const now = new Date();
    let changed = false;

    // Solo afectamos las que están en "Entrantes" (pending) — NUNCA manuales ni confirmadas
    agenda.forEach(apt => {
        // Protección: Solo cancelar si es pending y NO es manual
        if (apt.status === 'pending' && !apt.manual) {
            // Protección contra datos corruptos (sin fecha o sin hora)
            if (!apt.date || !apt.time || !apt.date.includes('-') || !apt.time.includes(':')) return;
            try {
                // Creamos el objeto fecha de la cita (Fecha + Hora)
                const [year, month, day] = apt.date.split('-').map(Number);
                const [hours, mins] = apt.time.split(':').map(Number);
                const aptDateTime = new Date(year, month - 1, day, hours, mins);

                // Si la fecha y hora de la cita es ANTERIOR a "ahora mismo", se cancela
                if (!isNaN(aptDateTime) && aptDateTime < now) {
                    console.log(`🚫 Auto-cancelando cita vencida de ${apt.name} (${apt.date} ${apt.time})`);
                    apt.status = 'cancelled';
                    changed = true;
                }
            } catch(e) {
                console.warn('autoCancelOverdue: error procesando cita', apt.id, e);
            }
        }
    });

    if (changed) {
        localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
        // Sincronizar con la nube
        if (window.saveListToCloud) {
            window.saveListToCloud('citas_v2', agenda);
        }
        // Refrescar UI si estamos viendo la agenda o el historial (y no se pidió evitarlo)
        if (!avoidRender) {
            if (typeof renderAgenda === 'function') renderAgenda();
            if (typeof renderHistory === 'function') renderHistory();
        }
    }
};

// Iniciar chequeo cada 1 minuto (guardado para evitar duplicados)
if (!window._autoCancelInterval) {
    window._autoCancelInterval = setInterval(window.autoCancelOverdueAppointments, 60000);
}

window.confirmReschedule = function() {
    const newDate = document.getElementById('reschedule-date').value;
    const newTime = document.getElementById('reschedule-time').value;
    if (!newDate || !newTime) {
        showToast('Elige fecha y hora válidas.', 'error');
        return;
    }

    const todayStr = new Date().toLocaleDateString('sv-SE');
    if (newDate < todayStr) {
        showToast('⚠️ No se pueden aplazar citas a fechas pasadas.', 'error');
        return;
    }
    let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const apt = agenda[currentRescheduleIndex];
    if (!apt) return;

    const isGroupApt = apt.groupId && agenda.filter(a => a.groupId === apt.groupId).length > 1;

    // BUG FIX: Si la cita es de un grupo (combo/paquete), solo propagar la FECHA y el estado.
    // Cada servicio del combo tiene su propia hora asignada — NO sobreescribirlas.
    if (isGroupApt) {
        agenda.forEach(a => {
            if (a.groupId === apt.groupId) {
                a.date = newDate;
                // Preservar la hora individual de cada servicio del combo
                a.status = 'postponed';
            }
        });
    } else {
        agenda[currentRescheduleIndex].date = newDate;
        agenda[currentRescheduleIndex].time = newTime;
        agenda[currentRescheduleIndex].status = 'postponed';
    }

    localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
    
    if (window.saveListToCloud) {
        window.saveListToCloud('citas_v2', agenda);
    }
    closeRescheduleModal();
    renderAgenda();
    showToast("Cita aplazada.");
};

// =============================================
// PROMOTIONS & ANNOUNCEMENTS
// =============================================
window.toggleServiceSwitcher = function(e, groupId) {
    e.stopPropagation();
    // Cloase all others first
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
        if (m.id !== `dropdown-menu-${groupId}`) m.classList.remove('active');
    });
    
    const menu = document.getElementById(`dropdown-menu-${groupId}`);
    if (menu) menu.classList.toggle('active');
};

window.selectSwitchedService = function(groupId, index, el) {
    if (!window.activeSubcardIndices) window.activeSubcardIndices = {};
    
    // 0. Update Persistence State
    window.activeSubcardIndices[groupId] = index;

    // 1. Update View (Show target subcard, hide others)
    const cards = document.querySelectorAll(`.subcard-${groupId}`);
    cards.forEach(c => c.style.display = 'none');
    
    const targetCard = document.getElementById(`subcard-${groupId}-${index}`);
    if (targetCard) targetCard.style.display = 'block';
    
    // 2. Update Dropdown visual
    const toggle = document.getElementById(`dropdown-toggle-${groupId}`);
    const menu = document.getElementById(`dropdown-menu-${groupId}`);
    
    if (toggle && el) {
        // el.innerText contains "Servicio X: Name"
        toggle.innerText = el.innerText;
    }
    
    if (menu) {
        menu.classList.remove('active');
        menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('selected'));
    }
    
    if (el) el.classList.add('selected');
};

// Global click to close custom dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('active'));
});

window.toggleSvcDropdown = function(type) {
    const dropdown = document.getElementById(`promo-${type}-dropdown`);
    const trigger = document.getElementById(`combo-svc-trigger-${type}`);
    
    // Cerrar otros dropdowns si están abiertos
    document.querySelectorAll('.custom-multi-select-dropdown').forEach(d => {
        if (d.id !== `promo-${type}-dropdown`) d.classList.remove('active');
    });
    document.querySelectorAll('.custom-multi-select-trigger').forEach(t => {
        if (t.id !== `combo-svc-trigger-${type}`) t.classList.remove('active');
    });

    dropdown.classList.toggle('active');
    trigger.classList.toggle('active');
    
    // Prevenir que el click se propague al document
    event.stopPropagation();
};

// Cerrar dropdowns al hacer click fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-multi-select-container')) {
        document.querySelectorAll('.custom-multi-select-dropdown').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.custom-multi-select-trigger').forEach(t => t.classList.remove('active'));
    }
});

window.updateSvcCountBadge = function(type) {
    const checks = document.querySelectorAll(`input[name="promo-${type}-svc-selection"]:checked`);
    const label = document.getElementById(`promo-${type}-svc-label`);
    const countBadge = document.getElementById(`promo-${type}-svc-count`);
    
    if (checks.length > 0) {
        label.innerText = `${checks.length} seleccionados`;
        countBadge.innerText = checks.length;
        countBadge.style.display = 'inline-block';
    } else {
        label.innerText = 'Elegir servicios...';
        countBadge.style.display = 'none';
    }
};

window.togglePromoMode = function(type, mode) {
    const catGroup = document.getElementById(`promo-${type}-cat-group`);
    const svcGroup = document.getElementById(`promo-${type}-svc-group`);
    
    if (mode === 'category') {
        if (catGroup) catGroup.style.display = 'block';
        if (svcGroup) svcGroup.style.display = 'none';
    } else {
        if (catGroup) catGroup.style.display = 'none';
        if (svcGroup) svcGroup.style.display = 'block';
    }
};

window.renderPromoCategories = function() {
    console.log("Rendering Promo Categories for Discount and Combo...");
    const wrapperDisc = document.getElementById('promo-discount-categories-wrapper');
    const wrapperCombo = document.getElementById('promo-combo-categories-wrapper');
    const svcWrapperDisc = document.getElementById('promo-discount-services-wrapper');
    const svcWrapperCombo = document.getElementById('promo-combo-services-wrapper');
    
    if (!wrapperDisc || !wrapperCombo) return;
    
    try {
        const categoriesList = JSON.parse(localStorage.getItem('margarita_categories')) || [];
        const servicesList = JSON.parse(localStorage.getItem('margarita_services')) || [];
        
        const generateHtml = (type) => {
            let html = `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                    <input type="checkbox" id="promo-${type}-all" value="all" onchange="window.togglePromoSideAll('${type}', this)">
                    <label for="promo-${type}-all" style="font-weight:700; color:var(--color-dark-pink); cursor:pointer; margin:0; font-size:0.8rem;">TODAS</label>
                </div>
            `;
            categoriesList.forEach(cat => {
                html += `
                    <div style="display:flex; align-items:center; gap:10px; padding:3px 0;">
                        <input type="checkbox" name="promo-${type}-cat-selection" value="${cat.id}" id="chk-promo-${type}-${cat.id}">
                        <label for="chk-promo-${type}-${cat.id}" style="color:var(--color-text); cursor:pointer; margin:0; font-size:0.85rem;">${cat.name}</label>
                    </div>
                `;
            });
            return html;
        };

        const generateServicesHtml = (type) => {
            let html = '';
            // Group by category for better UX
            categoriesList.forEach(cat => {
                const catSvcs = servicesList.filter(s => s.cat === cat.id);
                if (catSvcs.length > 0) {
                    html += `<div style="padding:5px 0; border-bottom:1px solid #eee; margin-top:5px;"><strong style="font-size:0.7rem; color:#999; text-transform:uppercase;">${cat.name}</strong></div>`;
                    catSvcs.forEach(s => {
                        const sId = s.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        html += `
                            <div style="display:flex; align-items:center; gap:10px; padding:3px 0; margin-left:10px;">
                                <input type="checkbox" name="promo-${type}-svc-selection" value="${s.title}" id="chk-promo-${type}-svc-${sId}" onchange="window.updateSvcCountBadge('${type}')">
                                <label for="chk-promo-${type}-svc-${sId}" style="color:var(--color-text); cursor:pointer; margin:0; font-size:0.8rem;">${s.title}</label>
                            </div>
                        `;
                    });
                }
            });
            return html;
        };

        wrapperDisc.innerHTML = generateHtml('discount');
        wrapperCombo.innerHTML = generateHtml('combo');
        
        if (svcWrapperDisc) {
            svcWrapperDisc.innerHTML = generateServicesHtml('discount');
        }
        if (svcWrapperCombo) {
            svcWrapperCombo.innerHTML = generateServicesHtml('combo');
        }

        updateSvcCountBadge('discount');
        updateSvcCountBadge('combo');

        // Load existing settings AFTER rendering
        loadPromoSettings();
    } catch (e) {
        console.error("Error rendering promo categories:", e);
    }
};

window.togglePromoSideAll = function(type, master) {
    const checks = document.querySelectorAll(`input[name="promo-${type}-cat-selection"]`);
    checks.forEach(c => {
        c.checked = master.checked;
        c.disabled = master.checked;
    });
};

window.loadPromoSettings = function() {
    let promos = JSON.parse(localStorage.getItem('margarita_promos')) || {
        discount: { active: false, mode: 'category', category: 'all', services: [], percent: '20', message: '', expiry: '' },
        combo: { active: false, mode: 'category', category: [], services: [], comboPrice: '', message: '', expiry: '' }
    };

    // Check expiry for both
    const now = new Date();
    let changed = false;
    ['discount', 'combo'].forEach(key => {
        if (promos[key] && promos[key].active && promos[key].expiry) {
            if (new Date(promos[key].expiry) < now) {
                promos[key].active = false;
                changed = true;
            }
        }
    });
    if (changed) {
        localStorage.setItem('margarita_promos', JSON.stringify(promos));
        if (window.saveDataToCloud) {
            window.saveDataToCloud('config_v2', 'promos', promos);
        }
    }

    // Auto-check for real-time deactivation without refresh
    if (!window._promoExpiryCheckInterval) {
        window._promoExpiryCheckInterval = setInterval(() => {
            const currentPromos = JSON.parse(localStorage.getItem('margarita_promos'));
            if (!currentPromos) return;
            
            const currentTime = new Date();
            let needUpdate = false;
            ['discount', 'combo'].forEach(key => {
                if (currentPromos[key] && currentPromos[key].active && currentPromos[key].expiry) {
                    if (new Date(currentPromos[key].expiry) < currentTime) {
                        currentPromos[key].active = false;
                        needUpdate = true;
                    }
                }
            });

            if (needUpdate) {
                localStorage.setItem('margarita_promos', JSON.stringify(currentPromos));
                if (window.saveDataToCloud) window.saveDataToCloud('config_v2', 'promos', currentPromos);
                loadPromoSettings(); // Refresh UI in real-time
            }
        }, 5000); // Check every 5 seconds
    }

    // Populate Discount UI
    document.getElementById('promo-discount-active').value = promos.discount.active.toString();
    document.getElementById('promo-discount-percent').value = promos.discount.percent || "20";
    document.getElementById('promo-discount-message').value = promos.discount.message || "";
    document.getElementById('promo-discount-expiry').value = promos.discount.expiry || "";
    
    // Set Mode and Visibility
    const discMode = promos.discount.mode || (promos.discount.services?.length > 0 ? 'service' : 'category');
    document.getElementById('promo-discount-mode').value = discMode;
    togglePromoMode('discount', discMode);
    
    // Set Discount Checkboxes
    const discAll = document.getElementById('promo-discount-all');
    if (promos.discount.category === 'all') {
        if (discAll) discAll.checked = true;
        document.querySelectorAll('input[name="promo-discount-cat-selection"]').forEach(c => { c.checked = true; c.disabled = true; });
    } else {
        (promos.discount.category || []).forEach(id => {
            const chk = document.getElementById(`chk-promo-discount-${id}`);
            if (chk) chk.checked = true;
        });
    }

    // Set Discount Service Checkboxes
    if (promos.discount.services && Array.isArray(promos.discount.services)) {
        promos.discount.services.forEach(title => {
            const sId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const chk = document.getElementById(`chk-promo-discount-svc-${sId}`);
            if (chk) chk.checked = true;
        });
    }
    
    // Populate Combo UI
    document.getElementById('promo-combo-active').value = promos.combo.active.toString();
    document.getElementById('promo-combo-price').value = promos.combo.comboPrice || "";
    document.getElementById('promo-combo-message').value = promos.combo.message || "";
    document.getElementById('promo-combo-expiry').value = promos.combo.expiry || "";

    // Set Mode and Visibility
    let comboMode = promos.combo.mode || (promos.combo.services?.length > 0 ? 'service' : 'category');
    
    // MIGRATION: If it was category, convert it to service mode
    if (comboMode === 'category') {
        comboMode = 'service';
        promos.combo.mode = 'service';
        
        const allServices = JSON.parse(localStorage.getItem('margarita_services')) || [];
        if (!promos.combo.services) promos.combo.services = [];
        
        if (promos.combo.category === 'all') {
            allServices.forEach(s => {
                if (!promos.combo.services.includes(s.title)) {
                    promos.combo.services.push(s.title);
                }
            });
        } else {
            const categories = promos.combo.category || [];
            const servicesInCats = allServices.filter(s => categories.includes(s.cat)).map(s => s.title);
            servicesInCats.forEach(svcTitle => {
                if (!promos.combo.services.includes(svcTitle)) {
                    promos.combo.services.push(svcTitle);
                }
            });
        }
        promos.combo.category = []; // clear category selection
        
        // Save migrated config back
        localStorage.setItem('margarita_promos', JSON.stringify(promos));
        if (window.saveDataToCloud) {
            window.saveDataToCloud('config_v2', 'promos', promos);
        }
    }
    
    document.getElementById('promo-combo-mode').value = comboMode;
    togglePromoMode('combo', comboMode);

    // Set Combo Service Checkboxes
    if (promos.combo.services && Array.isArray(promos.combo.services)) {
        promos.combo.services.forEach(title => {
            const sId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const chk = document.getElementById(`chk-promo-combo-svc-${sId}`);
            if (chk) chk.checked = true;
        });
    }
    
    // Set Combo Checkboxes
    const comboAll = document.getElementById('promo-combo-all');
    if (promos.combo.category === 'all') {
        if (comboAll) comboAll.checked = true;
        document.querySelectorAll('input[name="promo-combo-cat-selection"]').forEach(c => { c.checked = true; c.disabled = true; });
    } else {
        (promos.combo.category || []).forEach(id => {
            const chk = document.getElementById(`chk-promo-combo-${id}`);
            if (chk) chk.checked = true;
        });
    }

    updateSvcCountBadge('discount');
    updateSvcCountBadge('combo');
    updatePromoSummary(promos);
};

window.saveAllPromos = function() {
    let promos = JSON.parse(localStorage.getItem('margarita_promos')) || {
        discount: { active: false, mode: 'category', category: 'all', services: [], percent: '20', message: '', expiry: '' },
        combo: { active: false, mode: 'category', category: [], services: [], comboPrice: '', message: '', expiry: '' }
    };

    const extract = (type) => {
        const mode = document.getElementById(`promo-${type}-mode`).value;
        const active = document.getElementById(`promo-${type}-active`).value === 'true';
        const expiry = document.getElementById(`promo-${type}-expiry`).value;
        
        let selectedCats = [];
        if (document.getElementById(`promo-${type}-all`)?.checked) {
            selectedCats = 'all';
        } else {
            const checked = document.querySelectorAll(`input[name="promo-${type}-cat-selection"]:checked`);
            selectedCats = Array.from(checked).map(c => c.value);
        }

        let selectedSvcs = [];
        const checkedSvcs = document.querySelectorAll(`input[name="promo-${type}-svc-selection"]:checked`);
        selectedSvcs = Array.from(checkedSvcs).map(c => c.value);

        return { active, mode, expiry, selectedCats, selectedSvcs };
    };

    const d = extract('discount');
    const c = extract('combo');

    // Validations
    if (d.active && d.expiry && new Date(d.expiry) < new Date()) return showToast("No puedes activar un descuento con fecha vencida.", "error");
    if (d.active && d.mode === 'category' && d.selectedCats.length === 0 && d.selectedCats !== 'all') return showToast("Selecciona al menos una categoría para el descuento.", "error");
    if (d.active && d.mode === 'service' && d.selectedSvcs.length === 0) return showToast("Selecciona al menos un servicio para el descuento.", "error");

    if (c.active && c.expiry && new Date(c.expiry) < new Date()) return showToast("No puedes activar un combo con fecha vencida.", "error");
    if (c.active && c.mode === 'category' && c.selectedCats.length === 0 && c.selectedCats !== 'all') return showToast("Selecciona al menos una categoría para el combo.", "error");
    if (c.active && c.mode === 'service' && c.selectedSvcs.length === 0) return showToast("Selecciona al menos un servicio para el combo.", "error");

    if (c.active) {
        const priceStr = document.getElementById('promo-combo-price').value.trim();
        if (!priceStr || priceStr === "$0 COP") {
            document.getElementById('promo-combo-price').focus();
            return showToast("Escribe el precio total del combo.", "error");
        }
    }

    // Apply
    promos.discount = {
        active: d.active,
        mode: d.mode,
        category: d.mode === 'category' ? d.selectedCats : [],
        services: d.mode === 'service' ? d.selectedSvcs : [],
        percent: document.getElementById('promo-discount-percent').value,
        message: document.getElementById('promo-discount-message').value.trim(),
        expiry: d.expiry
    };

    promos.combo = {
        active: c.active,
        mode: c.mode,
        category: c.mode === 'category' ? c.selectedCats : [],
        services: c.mode === 'service' ? c.selectedSvcs : [],
        comboPrice: document.getElementById('promo-combo-price').value.trim(),
        message: document.getElementById('promo-combo-message').value.trim(),
        expiry: c.expiry
    };

    localStorage.setItem('margarita_promos', JSON.stringify(promos));
    
    // Cloud Sync
    if (window.saveDataToCloud) {
        window.saveDataToCloud('config_v2', 'promos', promos);
    }

    updatePromoSummary(promos);
    showToast("¡Configuración de promociones guardada correctamente!");
};

function updatePromoSummary(promos) {
    const summary = document.getElementById('promo-status-summary');
    if (!summary) return;
    
    let html = '<h4 style="margin:0 0 10px 0; font-size:0.9rem; text-transform:uppercase;">Estado Consolidado:</h4>';
    
    // Summary Discount
    if (promos.discount.active) {
        html += `<div style="margin-bottom:8px;"><span style="color:#2ecc71;">●</span> <strong>DESCUENTO:</strong> ${promos.discount.percent}% activo.</div>`;
    } else {
        html += `<div style="margin-bottom:8px; opacity:0.6;"><span style="color:#ddd;">○</span> Descuento desactivado.</div>`;
    }

    // Summary Combo
    if (promos.combo.active) {
        html += `<div><span style="color:#2ecc71;">●</span> <strong>COMBO:</strong> Precio fijo activo.</div>`;
    } else {
        html += `<div style="opacity:0.6;"><span style="color:#ddd;">○</span> Combo desactivado.</div>`;
    }

    summary.innerHTML = html;
}

const GALLERY_MAX_PHOTOS = 20;

window.showGeneralGalleryModal = function() {
    const modal = document.getElementById('generalGalleryModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        renderAdminGallery();
    }
};

window.closeGeneralGalleryModal = function() {
    const modal = document.getElementById('generalGalleryModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};


uploadGalleryBtn.addEventListener('click', async () => {
    const file = galleryUpload.files[0];
    if (!file) return;

    let gallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
    if (gallery.length >= GALLERY_MAX_PHOTOS) {
        showGalleryLimitModal();
        return;
    }

    uploadGalleryBtn.disabled = true;
    uploadGalleryBtn.innerText = 'Subiendo... ☁️';

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result;
        gallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
        if (gallery.length >= GALLERY_MAX_PHOTOS) {
            showGalleryLimitModal();
            uploadGalleryBtn.innerText = 'Subir Foto';
            return;
        }

        let finalImg = base64;
        // Upload to Firebase Storage if available
        if (window.uploadImageToCloud) {
            try {
                const compressed = await compressImage(base64, 900, 0.8);
                const fileName = `galeria_${Date.now()}.jpg`;
                finalImg = await window.uploadImageToCloud(compressed, fileName);
            } catch(e) {
                console.warn('No se pudo subir galería a Storage, usando base64.', e);
            }
        }

        gallery.unshift({ id: Date.now(), img: finalImg });
        localStorage.setItem('margarita_gallery', JSON.stringify(gallery));

        // Sync to Firestore (Robust Cloud)
        if (window.saveListToCloud) {
            await window.saveListToCloud('galeria_v2', gallery);
        }
        
        showToast("¡Foto subida a la galería con éxito!");
        galleryUpload.value = "";
        galleryPreview.innerHTML = "";
        uploadGalleryBtn.disabled = true;
        uploadGalleryBtn.innerText = 'Subir Foto';
        renderAdminGallery();
    };
    reader.readAsDataURL(file);
});

function showGalleryLimitModal() {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.innerHTML = `
        <div class="custom-modal" style="text-align:center; max-width:420px; padding:35px 30px;">
            <div style="font-size:3rem; margin-bottom:15px;">📸</div>
            <h3 style="margin:0 0 10px 0; color:var(--color-dark-pink); font-size:1.3rem;">¡Límite de galería alcanzado!</h3>
            <p style="color:#666; margin:0 0 20px 0; font-size:0.95rem; line-height:1.6;">Ya tienes <strong style="color:var(--color-dark-pink);">20 fotos</strong> en tu galería, que es el máximo permitido.<br><br>Para agregar una foto nueva, primero <strong>elimina una</strong> de las que ya están publicadas.</p>
            <button class="btn-close-limit btn-primary" style="width:auto; padding:12px 30px; border-radius:12px;"><i class="fas fa-images"></i> Entendido</button>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    overlay.querySelector('.btn-close-limit').onclick = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}

window.renderAdminGallery = function() {
    const container = document.getElementById('admin-gallery-list');
    if (!container) return;

    const gallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
    const count = gallery.length;
    const isFull = count >= GALLERY_MAX_PHOTOS;

    // Actualizar el contador de fotos en pantalla
    const headerEl = document.querySelector('#generalGalleryModal h1');
    if (headerEl) {
        const counterColor = isFull ? '#e74c3c' : '#27ae60';
        const existing = headerEl.querySelector('.gallery-counter');
        if (existing) existing.remove();
        const counter = document.createElement('span');
        counter.className = 'gallery-counter';
        counter.style.cssText = `font-size:0.8rem; font-weight:700; background:${counterColor}15; color:${counterColor}; border:1px solid ${counterColor}33; padding:3px 10px; border-radius:20px; margin-left:12px; vertical-align:middle;`;
        counter.innerHTML = `${count}/${GALLERY_MAX_PHOTOS} fotos`;
        headerEl.appendChild(counter);
    }

    // Mostrar/ocultar aviso de tope
    const uploadCard = document.querySelector('#generalGalleryModal .upload-card');
    if (uploadCard) {
        let limitBanner = document.getElementById('gallery-limit-banner');
        if (isFull) {
            if (!limitBanner) {
                limitBanner = document.createElement('div');
                limitBanner.id = 'gallery-limit-banner';
                limitBanner.style.cssText = 'background:linear-gradient(135deg,#fff0f0,#ffe5e5); border:1.5px solid #e74c3c44; border-radius:12px; padding:14px 18px; margin-top:12px; text-align:center; color:#c0392b; font-size:0.9rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:10px;';
                limitBanner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Límite de 20 fotos alcanzado. Elimina una foto para poder agregar una nueva.';
                uploadCard.appendChild(limitBanner);
            }
            // Deshabilitar el input y botón
            if (galleryUpload) { galleryUpload.disabled = true; galleryUpload.style.opacity = '0.5'; }
            if (uploadGalleryBtn) uploadGalleryBtn.disabled = true;
        } else {
            if (limitBanner) limitBanner.remove();
            if (galleryUpload) { galleryUpload.disabled = false; galleryUpload.style.opacity = ''; }
        }
    }

    if (count === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:20px; color:#999;">No hay fotos en la galería personalizada.</p>';
        return;
    }

    let html = '';
    gallery.forEach(item => {
        html += `
        <div class="admin-gallery-item">
            <img src="${item.img}">
            <button class="admin-gallery-delete" onclick="deleteGalleryImage(${item.id})" title="Eliminar Foto">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>`;
    });
    container.innerHTML = html;
};

window.deleteGalleryImage = function(id) {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    showConfirm(`${areYouSure} que quieres borrar esta foto de la galería?`, () => {
        let gallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
        gallery = gallery.filter(item => item.id !== id);
        localStorage.setItem('margarita_gallery', JSON.stringify(gallery));

        // Sync to Firestore (Robust Cloud)
        if (window.saveListToCloud) {
            window.saveListToCloud('galeria_v2', gallery);
        }

        showToast("Foto eliminada.");
        renderAdminGallery();
    });
};

window.clearAllGallery = function() {
    const gallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
    if (gallery.length === 0) {
        showToast("La galería ya está vacía.", "error");
        return;
    }
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Estás segura' : '¿Estás seguro';
    showConfirm(`${areYouSure} de que quieres eliminar las ${gallery.length} foto(s) de la galería? Esta acción no se puede deshacer.`, () => {
        localStorage.setItem('margarita_gallery', '[]');
        
        // Sync to Firestore (Robust Cloud)
        if (window.saveListToCloud) {
            window.saveListToCloud('galeria_v2', []);
        }

        showToast("Galería vaciada correctamente.", "success");
        renderAdminGallery();
    });
};

// =============================================
// SERVICE GALLERY MANAGEMENT (MODELS PER SERVICE)
// =============================================
// =============================================
// SERVICE GALLERY MANAGEMENT (MODELS PER SERVICE)
// =============================================
const CAT_GALLERY_MAX_PHOTOS = 30;
let currentManagedServiceKey = ''; 

// Abre desde el botón general (requiere selección de servicio)
window.openCategoryGalleryManager = function() {
    const categoriesList = JSON.parse(localStorage.getItem('margarita_categories')) || [];
    const catSelect = document.getElementById('cat-gallery-select');
    const svcSelect = document.getElementById('svc-gallery-select');
    
    if (!catSelect || !svcSelect) return;

    catSelect.innerHTML = '<option value="">-- Elige Categoría --</option>' + 
        categoriesList.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    svcSelect.innerHTML = '<option value="">-- Primero elige categoría --</option>';
    
    document.getElementById('catGalleryModal').style.display = 'flex';
    document.getElementById('cat-gallery-upload-zone').style.display = 'none';
    document.getElementById('cat-gallery-grid').innerHTML = '';
    document.getElementById('cat-gallery-selection-zone').style.display = 'block';
    
    const titleEl = document.getElementById('cat-gallery-title');
    if (titleEl) titleEl.innerText = 'Gestionar Galerías por Servicio';
    
    currentManagedServiceKey = '';
};

// Abre directamente desde la lista de servicios
window.openServiceGalleryManager = function(catId, serviceTitle) {
    currentManagedServiceKey = `${catId}:::${serviceTitle}`;
    
    const titleEl = document.getElementById('cat-gallery-title');
    if (titleEl) titleEl.innerText = `Galería: ${serviceTitle}`;

    // Ocultar la zona de selección manual
    const selectionZone = document.getElementById('cat-gallery-selection-zone');
    if (selectionZone) selectionZone.style.display = 'none';

    document.getElementById('catGalleryModal').style.display = 'flex';
    document.getElementById('cat-gallery-upload-zone').style.display = 'block';
    
    renderServiceGalleryGrid();
};

window.updateGalleryServiceSelect = function() {
    const catId = document.getElementById('cat-gallery-select').value;
    const svcSelect = document.getElementById('svc-gallery-select');
    if (!catId || !svcSelect) return;
    
    const allServices = JSON.parse(localStorage.getItem('margarita_services')) || [];
    const filtered = allServices.filter(s => s.cat === catId);
    
    svcSelect.innerHTML = '<option value="">-- Selecciona el Servicio --</option>' +
        filtered.map(s => `<option value="${s.title}">${s.title}</option>`).join('');
    
    document.getElementById('cat-gallery-upload-zone').style.display = 'none';
    document.getElementById('cat-gallery-grid').innerHTML = '';
};

window.loadServiceGalleryFromSelect = function() {
    const catId = document.getElementById('cat-gallery-select').value;
    const svcTitle = document.getElementById('svc-gallery-select').value;
    
    if (!catId || !svcTitle) return;
    
    currentManagedServiceKey = `${catId}:::${svcTitle}`;
    document.getElementById('cat-gallery-upload-zone').style.display = 'block';
    
    const titleEl = document.getElementById('cat-gallery-title');
    if (titleEl) titleEl.innerText = `Galería: ${svcTitle}`;
    
    renderServiceGalleryGrid();
};

window.closeCategoryGalleryManager = function() {
    document.getElementById('catGalleryModal').style.display = 'none';
};

function renderServiceGalleryGrid() {
    const grid = document.getElementById('cat-gallery-grid');
    const limitMsg = document.getElementById('cat-gallery-limit-msg');
    if (!grid) return;
    
    const allGalleries = JSON.parse(localStorage.getItem('margarita_service_galleries')) || {};
    const svcPhotos = allGalleries[currentManagedServiceKey] || [];
    
    if (limitMsg) limitMsg.innerHTML = `Fotos actuales: <strong>${svcPhotos.length}/${CAT_GALLERY_MAX_PHOTOS}</strong>`;
    
    if (svcPhotos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color:#999; font-size:0.85rem; padding:20px; text-align:center;">Este servicio no tiene fotos de modelos aún.</p>';
        return;
    }

    grid.innerHTML = svcPhotos.map((photo, index) => `
        <div style="position:relative; border-radius:10px; overflow:hidden; aspect-ratio:3/4; border:1px solid #eee; background:white;">
            <img src="${photo.img}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); color:white; padding:5px; font-size:0.75rem;">
                <div style="font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${photo.modelName || 'Modelo '+(index+1)}</div>
                <div style="color:#2ecc71; font-weight:bold;">${photo.modelPrice || ''}</div>
            </div>
            <button onclick="deleteServiceGalleryPhoto(${photo.id})" style="position:absolute; top:5px; right:5px; background:rgba(231,76,60,0.9); color:white; border:none; width:22px; height:22px; border-radius:50%; cursor:pointer; font-size:0.7rem; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
}

window.handleCatGalleryUpload = function(input) {
    if (!currentManagedServiceKey || !input.files[0]) return;

    const allGalleries = JSON.parse(localStorage.getItem('margarita_service_galleries')) || {};
    const svcPhotos = allGalleries[currentManagedServiceKey] || [];

    if (svcPhotos.length >= CAT_GALLERY_MAX_PHOTOS) {
        showToast(`Límite de ${CAT_GALLERY_MAX_PHOTOS} fotos alcanzado para este servicio.`, "error");
        input.value = "";
        return;
    }

    const modelNameInput = document.getElementById('cat-gallery-model-name');
    const modelPriceInput = document.getElementById('cat-gallery-model-price');
    const modelName = modelNameInput ? modelNameInput.value.trim() : "";
    const modelPrice = modelPriceInput ? modelPriceInput.value.trim() : "";

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result;
        let finalImg = base64;

        // Sync Image to Cloud (Robust Bypass Storage)
        if (window.uploadImageToCloud) {
            try {
                const compressed = await compressImage(base64, 800, 0.8);
                const fileName = `modelo_${Date.now()}.jpg`;
                finalImg = await window.uploadImageToCloud(compressed, fileName);
            } catch(err) {
                console.error("Cloud Image Error:", err);
            }
        }
        
        svcPhotos.unshift({
            id: Date.now(),
            img: finalImg,
            modelName,
            modelPrice
        });
        
        allGalleries[currentManagedServiceKey] = svcPhotos;
        localStorage.setItem('margarita_service_galleries', JSON.stringify(allGalleries));
        
        // Sync full galleries map to cloud
        if (window.saveDataToCloud) {
            await window.saveDataToCloud('config_v2', 'service_galleries', allGalleries);
        }

        showToast("¡Foto de modelo añadida a la galería!", "success");
        
        input.value = "";
        if (modelNameInput) modelNameInput.value = "";
        if (modelPriceInput) modelPriceInput.value = "";
        
        renderServiceGalleryGrid();
        localStorage.setItem('margarita_salon_trigger', Date.now());
    };
    reader.readAsDataURL(input.files[0]);
};

window.deleteServiceGalleryPhoto = function(photoId) {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    showConfirm(`${areYouSure} que quieres eliminar esta foto de la galería?`, () => {
        const allGalleries = JSON.parse(localStorage.getItem('margarita_service_galleries')) || {};
        let svcPhotos = allGalleries[currentManagedServiceKey] || [];
        
        svcPhotos = svcPhotos.filter(p => p.id !== photoId);
        allGalleries[currentManagedServiceKey] = svcPhotos;
        
        localStorage.setItem('margarita_service_galleries', JSON.stringify(allGalleries));

        // Sync to Cloud
        if (window.saveDataToCloud) {
            window.saveDataToCloud('config_v2', 'service_galleries', allGalleries);
        }

        showToast("Foto eliminada.");
        renderServiceGalleryGrid();
        localStorage.setItem('margarita_salon_trigger', Date.now());
    });
};

// Custom Professional Dialogs
window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type === 'error' ? 'error' : ''}`;
    
    // Extraer íconos del mensaje para agruparlos
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message;
    const icons = Array.from(tempDiv.querySelectorAll('i'));
    icons.forEach(i => i.remove());
    const cleanMessage = tempDiv.innerHTML.trim();
    
    let iconsHtml = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>`;
    icons.forEach(i => iconsHtml += i.outerHTML);
    
    toast.innerHTML = `<div class="toast-icons">${iconsHtml}</div> <span class="toast-text">${cleanMessage}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    
    let isClosing = false;
    const closeToast = () => {
        if (isClosing) return;
        isClosing = true;
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    };

    // Permite "hundirle" (tap/click) para cerrar
    toast.addEventListener('click', closeToast);

    // Permite "subir" (swipe up) para cerrar
    let touchStartY = 0;
    toast.addEventListener('touchstart', e => { touchStartY = e.changedTouches[0].screenY; }, {passive: true});
    toast.addEventListener('touchend', e => {
        if (touchStartY - e.changedTouches[0].screenY > 20) closeToast();
    }, {passive: true});

    setTimeout(() => {
        closeToast();
    }, 3500);
}

window.openImageZoom = function(src) {
    const modal = document.getElementById('image-zoom-modal');
    const zoomedImg = document.getElementById('zoomed-image');
    if (!modal || !zoomedImg) return;
    
    zoomedImg.src = src;
    modal.style.display = 'flex';
};

window.showConfirm = function(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.innerHTML = `
        <div class="custom-modal">
            <p>${message}</p>
            <div class="modal-buttons">
                <button class="btn-confirm">Aceptar</button>
                <button class="btn-cancel">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);

    const btnCancel = overlay.querySelector('.btn-cancel');
    const btnConfirm = overlay.querySelector('.btn-confirm');

    const cleanUp = () => {
        document.removeEventListener('keydown', handleKey);
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };

    btnCancel.onclick = cleanUp;

    btnConfirm.onclick = () => {
        cleanUp();
        if (onConfirm) onConfirm();
    };

    // Soporte de teclado para este confirm
    function handleKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); btnConfirm.click(); }
        if (e.key === 'Escape') { e.preventDefault(); btnCancel.click(); }
    };
    document.addEventListener('keydown', handleKey);
}

// Global State for Agenda Tabs
let currentAgendaTray = 'incoming'; // Opción: 'incoming', 'confirmed', 'postponed', 'reminders'

window.setAgendaTray = function(tray) {
    currentAgendaTray = tray;
    
    // UI Feedback
    document.querySelectorAll('.tray-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tray-btn-${tray}`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // Mostrar u ocultar botón de configuración de mantenimiento
    const configBtn = document.getElementById('maint-config-btn');
    if (configBtn) {
        configBtn.style.display = (tray === 'reminders') ? 'flex' : 'none';
    }
    
    renderAgenda();
};

function checkLicenseStatus() {
    try {
        const licenseDataRaw = localStorage.getItem('margarita_license');
        if (!licenseDataRaw) {
            return;
        }

        const license = JSON.parse(licenseDataRaw);
        const blockScreen = document.getElementById('license-block-screen');
        const bannerContainer = document.getElementById('license-banner-container');

        if (!blockScreen) return;

        if (license.subscription_status === 'suspended') {
            blockScreen.style.display = 'flex';
            const dashboard = document.getElementById('dashboard-section');
            if (dashboard) dashboard.style.display = 'none';
            return;
        } else {
            blockScreen.style.display = 'none';
        }

        if (license.renewalDate) {
            const renewalTime = new Date(license.renewalDate).getTime();
            const diffMs = renewalTime - Date.now();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (daysLeft >= 0 && daysLeft <= 5) {
                if (bannerContainer) {
                    bannerContainer.innerHTML = `
                        <div id="license-warning-banner" style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            background: rgba(247, 147, 30, 0.1);
                            border: 1px solid rgba(247, 147, 30, 0.3);
                            color: #f7931e;
                            padding: 12px 24px;
                            border-radius: 12px;
                            margin: 15px;
                            font-family: inherit;
                            font-size: 0.9rem;
                            font-weight: 500;
                            gap: 15px;
                            backdrop-filter: blur(10px);
                            box-shadow: 0 4px 20px rgba(247, 147, 30, 0.08);
                            animation: licenseSlideDown 0.4s ease;
                            box-sizing: border-box;
                        ">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>Tu suscripción vencerá en <strong>${daysLeft}</strong> ${daysLeft === 1 ? 'día' : 'días'}. Por favor, realiza la renovación para evitar la suspensión del servicio.</span>
                            </div>
                            <a href="/client-login.html" target="_top" style="
                                background: #f7931e;
                                color: #fff;
                                text-decoration: none;
                                padding: 8px 16px;
                                border-radius: 8px;
                                font-weight: 700;
                                font-size: 0.85rem;
                                transition: all 0.2s ease;
                                white-space: nowrap;
                                box-shadow: 0 4px 12px rgba(247, 147, 30, 0.25);
                            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(247, 147, 30, 0.4)';"
                               onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(247, 147, 30, 0.25)';">
                                Renovar Licencia
                            </a>
                        </div>
                    `;
                }
            } else {
                if (bannerContainer) bannerContainer.innerHTML = '';
            }
        } else {
            if (bannerContainer) bannerContainer.innerHTML = '';
        }
    } catch (e) {
        console.error('Error handling license check:', e);
    }
}

function toggleView(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        
        checkLicenseStatus();
        
        // Show default tab (Agenda)
        showTab('agenda-tab', document.querySelector('.sidebar-nav nav a:first-child'));
        
        renderAdminServices();
        renderAdminCategories();
        renderAdminGallery();
        renderAgenda();
        renderCalendar();
        initSpecialists();
        if(typeof renderPromoCategories === 'function') renderPromoCategories();
        if(typeof loadPromoSettings === 'function') loadPromoSettings();
        if(typeof loadCurrentSettings === 'function') loadCurrentSettings();
        if(typeof migratePrices === 'function') migratePrices();
    } else {
        authSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        emailInput.value = "";
        passInput.value = "";
    }
}

// Inicializar sesión al cargar la página
if (localStorage.getItem('margarita_admin_session') === 'true') {
    toggleView(true);
    checkLicenseStatus();
} else {
    toggleView(false);
}

function migratePrices() {
    let svcs = JSON.parse(localStorage.getItem('margarita_services') || '[]');
    let changed = false;
    svcs.forEach(s => {
        // If price exists and doesn't have the $ symbol, it needs formatting
        if (s.price && !s.price.toString().includes('$')) {
            s.price = formatToCOP(s.price);
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem('margarita_services', JSON.stringify(svcs));
        if(typeof renderAdminServices === 'function') renderAdminServices();
    }
}

// ----------------------------------------------------
// FUNCIONES DE ELIMINAR HISTORIAL
// ----------------------------------------------------
function openDeleteHistoryModal() {
    document.getElementById('deleteHistoryModal').style.display = 'flex';
}

function closeDeleteHistoryModal() {
    document.getElementById('deleteHistoryModal').style.display = 'none';
}

window.toggleDeleteMode = function() {
    window.isHistoryDeleteMode = !window.isHistoryDeleteMode;
    closeDeleteHistoryModal();
    renderHistory();
    if(window.isHistoryDeleteMode) {
        showCustomAlert('<i class="fas fa-info-circle"></i> Modo Eliminación', "Se ha activado el modo de limpieza. Ahora verás un ícono de basurero junto a cada registro de tu historial para borrarlo.", 'alert');
    }
}

function clearEntireHistory() {
    closeDeleteHistoryModal();
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Estás completamente segura' : '¿Estás completamente seguro';
    showCustomAlert(
        '<i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> Vaciar TODO', 
        `${areYouSure} de ELIMINAR todo tu historial de servicios? Esta acción no se puede deshacer.`, 
        'confirm', 
        () => {
            let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
            agenda = agenda.filter(a => a.status !== 'accepted' && a.status !== 'cancelled');
            localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
            
            // Sync to Firestore
            if (window.saveListToCloud) {
                window.saveListToCloud('citas_v2', agenda);
            }
            
            window.isHistoryDeleteMode = false;
            if(typeof renderAgenda === 'function') renderAgenda();
            renderHistory();
            setTimeout(() => {
                showCustomAlert('<i class="fas fa-check-circle" style="color:#2ecc71;"></i> Éxito', "El historial ha sido vaciado completamente.", 'alert');
            }, 300);
        }
    );
}

function deleteHistoryRecord(originalIndex) {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const targetApt = agenda[originalIndex];
    const isCombo = targetApt && targetApt.groupId && targetApt.promoType === 'combo' && agenda.filter(a => a.groupId === targetApt.groupId).length > 1;
    const msg = isCombo ? `${areYouSure} que deseas eliminar el paquete (Combo) completo de tu historial?` : `${areYouSure} que deseas eliminar este servicio de tu historial?`;

    showCustomAlert(
        '<i class="fas fa-trash"></i> Eliminar Registro', 
        msg, 
        'confirm', 
        () => {
            if (isCombo) {
                agenda = agenda.filter(a => a.groupId !== targetApt.groupId);
            } else {
                agenda.splice(originalIndex, 1);
            }
            localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
            
            // Sync to Firestore
            if (window.saveListToCloud) {
                window.saveListToCloud('citas_v2', agenda);
            }
            
            if(typeof renderAgenda === 'function') renderAgenda();
            renderHistory();
        }
    );
}

// ----------------------------------------------------
// SISTEMA DE ALERTAS PERSONALIZADO
// ----------------------------------------------------
function showCustomAlert(title, text, type, confirmCallback = null) {
    document.getElementById('customAlertTitle').innerHTML = title;
    document.getElementById('customAlertText').innerText = text;
    
    let btnHtml = '';
    if (type === 'alert') {
        btnHtml = `<button onclick="closeCustomAlert()" style="background:var(--gold-primary); color:white; border:none; padding:10px 25px; border-radius:8px; font-weight:bold; cursor:pointer;">Entendido</button>`;
    } else if (type === 'confirm') {
        window.customConfirmAction = confirmCallback;
        btnHtml = `
            <button onclick="closeCustomAlert()" style="background:#eee; color:#444; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.3s;">Cancelar</button>
            <button onclick="executeCustomConfirm()" style="background:#e74c3c; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.3s;">Sí, Continuar</button>
        `;
    }
    
    document.getElementById('customAlertButtons').innerHTML = btnHtml;
    document.getElementById('customAlertModal').style.display = 'flex';
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

function executeCustomConfirm() {
    closeCustomAlert();
    if (typeof window.customConfirmAction === 'function') {
        window.customConfirmAction();
    }
}

// ----------------------------------------------------
// ESPECIALISTAS (PERSONAL) MANAGEMENT
// ----------------------------------------------------
function initSpecialists() {
    let saved = localStorage.getItem('margarita_specialists');
    if (!saved || saved === '[]') {
        const defaults = [
            {name: 'Keysi', image: '', phone: '', address: '', specialty: 'Todos'}, 
            {name: 'Franchez', image: '', phone: '', address: '', specialty: 'Todos'}, 
            {name: 'Luz', image: '', phone: '', address: '', specialty: 'Todos'}
        ];
        localStorage.setItem('margarita_specialists', JSON.stringify(defaults));
    }
    
    setTimeout(() => {
        renderSpecialists();
        populateSpecialistDropdowns();
    }, 50); // Un breve retraso de seguridad para que el DOM esté estabilizado en el F5
}

let specialistSearchQuery = '';
let specialistViewMode = 'grid';

window.handleSpecialistSearch = function(q) {
    specialistSearchQuery = q.toLowerCase();
    renderSpecialists();
};

window.setSpecialistView = function(view) {
    specialistViewMode = view;
    // Actualizar botones UI
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    if (btnGrid && btnList) {
        if (view === 'grid') {
            btnGrid.style.background = 'white';
            btnGrid.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            btnGrid.style.color = '#1a1a1a';
            btnGrid.style.fontWeight = '700';
            btnList.style.background = 'none';
            btnList.style.boxShadow = 'none';
            btnList.style.color = '#666';
            btnList.style.fontWeight = '600';
        } else {
            btnList.style.background = 'white';
            btnList.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            btnList.style.color = '#1a1a1a';
            btnList.style.fontWeight = '700';
            btnGrid.style.background = 'none';
            btnGrid.style.boxShadow = 'none';
            btnGrid.style.color = '#666';
            btnGrid.style.fontWeight = '600';
        }
    }
    const container = document.getElementById('specialists-container');
    if (container) {
        container.classList.toggle('specialists-list-compact', view === 'list');
        container.classList.toggle('specialists-grid', view === 'grid');
    }
    renderSpecialists();
};

function renderSpecialists() {
    try {
        const container = document.getElementById('specialists-container');
        if (!container) return;
        
        let specialists = [];
        let agenda = [];
        try {
            specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
            if (!Array.isArray(specialists)) specialists = [];
        } catch(e) { specialists = []; }
        try {
            agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
            if (!Array.isArray(agenda)) agenda = [];
        } catch(e) { agenda = []; }

        // Migración temprana por si venían como strings (incluso mezclados)
        let needsSave = false;
        specialists = specialists.map(s => {
            if (typeof s === 'string') {
                needsSave = true;
                return {name: s, image: '', phone: '', address: '', specialty: 'Todos'};
            }
            return s;
        });

        if (needsSave) {
            localStorage.setItem('margarita_specialists', JSON.stringify(specialists));
        }
        
        // Quitar corruptos que no tengan nombre
        specialists = specialists.filter(s => s && s.name);

        // Filter by search
        if (specialistSearchQuery) {
            specialists = specialists.filter(s => s && s.name && typeof s.name === 'string' && s.name.toLowerCase().includes(specialistSearchQuery));
        }
        
        console.log('[renderSpecialists] Total specialists after filter:', specialists.length, JSON.stringify(specialists.map(s => s.name)));

        if (specialists.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--color-text-muted); border:1px dashed var(--border-color); border-radius:12px;">No hay personal registrado. Añade profesionales arriba.</p>`;
            return;
        }

        const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
        const parsePrice = (priceStr) => {
            if (!priceStr || priceStr === 'Gratis') return 0;
            return parseInt(priceStr.toString().replace(/\D/g, '')) || 0;
        };
        
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        container.innerHTML = specialists.map(spec => {
            try {
                let dayCount = 0; let monthCount = 0;
                let dayTotal = 0; let monthTotal = 0;
                
                agenda.forEach(a => {
                    if (a && a.specialist === spec.name && a.status !== 'cancelled') {
                        const isToday = (a.date === today);
                        const aptDate = new Date(`${a.date}T00:00:00`);
                        const isThisMonth = (!isNaN(aptDate) && aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear);

                        // Incrementar contadores para cualquier cita activa
                        if (isToday) dayCount++;
                        if (isThisMonth) monthCount++;

                        // Sumar totales solo si la cita fue realizada (accepted)
                        if (a.status === 'accepted') {
                            const val = parsePrice(a.splitPrice || a.price);
                            if (isToday) dayTotal += val;
                            if (isThisMonth) monthTotal += val;
                        }
                    }
                });

                const profitPercent = spec.profitPercent || 50;
                const studioPercent = 100 - profitPercent;

                const halfEarned = (dayTotal * profitPercent) / 100;
                const studioEarned = (dayTotal * studioPercent) / 100;

                const fallbackIcon = `<div style="background:var(--gold-primary)22; width:65px; height:65px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gold-primary); font-size:1.8rem; flex-shrink:0;"><i class="fas fa-user-tie"></i></div>`;
                const profileImg = spec.image ? `<img src="${spec.image}" style="width:65px; height:65px; border-radius:50%; object-fit:cover; border:2px solid var(--color-accent); flex-shrink:0;">` : fallbackIcon;

                const infoBtn = `
                    <button onclick="viewSpecialistInfo('${spec.name}')" style="background:rgba(160, 93, 107, 0.08); color:var(--color-dark-pink); border:1px solid var(--color-dark-pink); padding:8px 18px; border-radius:30px; font-weight:700; font-size:0.85rem; cursor:pointer; transition:0.3s; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-info-circle"></i> DETALLES / INF
                    </button>`;
                
                const specId = String(spec.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
                
                let specStr = spec.specialty;
                if (Array.isArray(specStr)) {
                    specStr = specStr.join(', ');
                } else if (typeof specStr !== 'string') {
                    specStr = 'Todos';
                }
                const specialtiesArray = specStr.split(', ');
                
                // --- MODO LISTA COMPACTA ---
                const isActive = spec.active !== false;
                if (specialistViewMode === 'list') {
                    return `
                    <div class="glass-module" style="padding:12px 20px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:15px; border-left:4px solid ${isActive ? 'var(--color-dark-pink)' : '#ccc'}; opacity:${isActive ? '1' : '0.65'}; transition:0.3s;">
                        <div style="display:flex; align-items:center; gap:12px; flex:1;">
                            <div style="width:40px; height:40px; border-radius:50%; overflow:hidden; border:1px solid #eee; flex-shrink:0;">
                                ${spec.image ? `<img src="${spec.image}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="background:#f0f0f0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999;"><i class="fas fa-user"></i></div>`}
                            </div>
                            <div style="min-width:150px;">
                                <h5 style="margin:0; font-size:1rem; color:var(--color-text);">${spec.name}</h5>
                                <small style="color:var(--color-text-muted); font-size:0.75rem;">${specStr || 'General'}</small>
                            </div>
                            <div style="display:flex; gap:15px; margin-left:20px; font-size:0.85rem; color:var(--color-text-muted);">
                                <span><i class="fas fa-calendar-check" style="color:var(--color-dark-pink);"></i> Hoy: <strong>${dayCount}</strong></span>
                                <span><i class="fas fa-chart-line" style="color:#2ecc71;"></i> Mes: <strong>${fmt(monthTotal)}</strong></span>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="viewSpecialistReport('${spec.name}')" class="btn-primary" style="padding:6px 12px; font-size:0.75rem; border-radius:8px; width:auto; background:var(--color-dark-pink);">REPORTES</button>
                            <button onclick="openEditSpecialistModal('${spec.name}')" style="background:rgba(52, 152, 219, 0.1); border:1px solid rgba(52, 152, 219, 0.2); color:#3498db; width:34px; height:34px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-pen" style="font-size:0.8rem;"></i></button>
                            <button onclick="deleteSpecialist('${spec.name}')" style="background:rgba(231, 76, 60, 0.1); border:1px solid rgba(231, 76, 60, 0.2); color:#e74c3c; width:34px; height:34px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-trash-alt" style="font-size:0.8rem;"></i></button>
                        </div>
                    </div>`;
                }

                // --- MODO CUADRÍCULA (GRID) ---
                const specialtiesHtml = specialtiesArray.map(s => `
                    <div style="background:rgba(var(--accent-rgb), 0.05); padding:6px 10px; border-radius:8px; border:1px solid rgba(var(--accent-rgb), 0.1); text-align:center; font-size:0.7rem; color:var(--color-dark-pink); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${s}</div>
                `).join('');

                const specProfileImg = spec.image ? `<img src="${spec.image}" style="width:55px; height:55px; border-radius:12px; object-fit:cover; border:2px solid var(--color-accent); flex-shrink:0;">` : `<div style="background:var(--gold-primary)15; width:55px; height:55px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--gold-primary); font-size:1.5rem; flex-shrink:0;"><i class="fas fa-user-tie"></i></div>`;

                return `
                <div class="glass-module" style="padding:20px; border-radius:20px; position:relative; display:flex; flex-direction:column; gap:15px; box-shadow: 0 8px 30px rgba(0,0,0,0.05); opacity:${isActive ? '1' : '0.6'}; transition:0.3s; border: 1px solid ${isActive ? 'rgba(184, 115, 129, 0.2)' : 'var(--border-color)'};">
                    
                    <!-- HEADER COMPACTO -->
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:15px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            ${specProfileImg}
                            <div style="max-width: 140px;">
                                <h4 style="margin:0; font-size:1.2rem; color:var(--color-text); font-family:var(--font-heading); line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${spec.name}">${spec.name}</h4>
                                <div style="display:flex; align-items:center; gap:5px; margin-top:4px;">
                                     <button onclick="viewSpecialistInfo('${spec.name}')" style="background:none; border:none; padding:0; color:var(--color-dark-pink); font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:3px;"><i class="fas fa-id-card"></i> Perfil</button>
                                </div>
                            </div>
                        </div>
                        
                        <div style="display:flex; align-items:center; gap:10px;">
                            <!-- Toggle Switch ON/OFF -->
                            <div onclick="toggleSpecialistActive('${spec.name}')" style="display:flex; align-items:center; gap:8px; cursor:pointer; background:${isActive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)'}; border-radius:30px; padding:0 12px; border:1px solid ${isActive ? '#2ecc71' : '#e74c3c'}; transition:0.3s; flex-shrink:0; height:28px; box-sizing:border-box;">
                                <span style="font-size:0.75rem; font-weight:800; color:${isActive ? '#2ecc71' : '#e74c3c'}; min-width:25px;">${isActive ? 'ON' : 'OFF'}</span>
                                <div style="width:28px; height:14px; background:${isActive ? '#2ecc71' : '#e74c3c'}; border-radius:10px; position:relative;">
                                    <div style="width:12px; height:12px; background:white; border-radius:50%; position:absolute; top:1px; left:${isActive ? '15px' : '1px'}; transition:0.2s;"></div>
                                </div>
                            </div>
                            
                            <!-- Menú de Acciones (Engranaje) -->
                            <div class="spec-actions-container">
                                <button onclick="toggleSpecActionsMenu('${spec.name}', event)" style="background:rgba(0,0,0,0.03); border:1px solid var(--border-color); color:var(--color-text-muted); width:28px; height:28px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.3s;" class="hover-scale">
                                    <i class="fas fa-cog" style="font-size:0.9rem;"></i>
                                </button>
                                <div id="actions-menu-${spec.name.replace(/\s+/g, '')}" class="spec-actions-menu">
                                    <button onclick="openEditSpecialistModal('${spec.name}')" class="spec-action-item">
                                        <i class="fas fa-edit" style="color:#3498db;"></i> Editar
                                    </button>
                                    <button onclick="deleteSpecialist('${spec.name}')" class="spec-action-item delete">
                                        <i class="fas fa-trash-alt"></i> Borrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ESPECIALIDADES (DESPLEGABLE) -->
                    <div style="border-top: 1px dashed rgba(var(--accent-rgb), 0.1); padding-top: 10px;">
                        <button id="btn-spec-${specId}" onclick="toggleSpecDetails('${specId}')" class="spec-toggle-btn" style="background:none; border:none; padding:0; color:var(--color-text-muted); font-size:0.7rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:5px; text-transform:uppercase; letter-spacing:0.5px;">
                            <i class="fas fa-magic" style="color:var(--color-dark-pink); opacity:0.6;"></i> SERVICIOS QUE REALIZA <i class="fas fa-chevron-down chevron-icon" style="margin-left:auto; transition:0.3s; font-size:0.6rem;"></i>
                        </button>
                        <div id="collapse-spec-${specId}" class="smooth-collapse">
                            <div style="display:flex; flex-wrap:wrap; gap:6px; padding: 12px 0 5px 0;">
                                ${specialtiesHtml}
                            </div>
                        </div>
                    </div>

                    <!-- CONTADORES RÁPIDOS -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <!-- Cuadro Interactivo para Citas de Hoy -->
                        <div onclick="viewSpecialistServices('${spec.name}')" style="background:rgba(var(--accent-rgb), 0.05); border:1px solid rgba(var(--accent-rgb), 0.15); border-radius:15px; padding:12px; text-align:center; cursor:pointer;" class="hover-scale">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <span style="font-size:0.6rem; color:var(--color-text-muted); text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Citas Hoy</span>
                                <i class="fas fa-history" style="font-size:0.7rem; color:var(--color-dark-pink); opacity:0.9;"></i>
                            </div>
                            <div style="font-size:1.7rem; font-weight:900; color:var(--color-dark-pink); line-height:1; margin: 4px 0;">${dayCount}</div>
                            <div style="font-size:0.6rem; color:var(--color-text-muted); font-weight:800; text-transform:uppercase;">
                                VER CITAS <i class="fas fa-chevron-right" style="font-size:0.5rem;"></i>
                            </div>
                        </div>
                        
                        <!-- Info Estática para Total Mes -->
                        <div style="background:rgba(var(--accent-rgb), 0.05); border:1px solid rgba(var(--accent-rgb), 0.15); border-radius:15px; padding:12px; text-align:center;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <span style="font-size:0.6rem; color:var(--color-text-muted); text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Servicios Mes</span>
                                <i class="fas fa-chart-line" style="font-size:0.7rem; color:var(--color-dark-pink); opacity:0.9;"></i>
                            </div>
                            <div style="font-size:1.7rem; font-weight:900; color:var(--color-text); line-height:1; margin: 4px 0;">${monthCount}</div>
                            <div style="font-size:0.6rem; color:var(--color-text-muted); font-weight:800; text-transform:uppercase;">Historial Mes</div>
                        </div>
                    </div>

                    <!-- RESUMEN FINANCIERO HOY (MUY COMPACTO) -->
                    <div style="background: var(--earnings-bg); padding:12px; border-radius:15px; border:1px solid var(--earnings-border);">
                        <div style="font-size:0.65rem; color:var(--color-dark-pink); font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; text-align:center; border-bottom:1px dashed rgba(var(--accent-rgb), 0.3); padding-bottom:5px;">
                            💰 Ganancias Hoy
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-text-muted);">
                                 <span>Bruto:</span>
                                 <span style="font-weight:700; color:var(--color-text);">${fmt(dayTotal)}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; border-top:1px solid var(--border-color); padding-top:4px;">
                                 <span style="color:var(--color-dark-pink); font-weight:600;">Estudio (${studioPercent}%):</span>
                                 <span style="font-weight:800; color:var(--color-dark-pink);">${fmt(studioEarned)}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                                 <span style="color:#2ecc71; font-weight:600;">Ella (${profitPercent}%):</span>
                                 <span style="font-weight:800; color:#27ae60;">${fmt(halfEarned)}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            } catch(e) {
                console.error('[renderSpecialists] Error rendering specialist:', spec && spec.name, e.message, e.stack);
                return `<div class="glass-module" style="padding:20px; border-radius:20px; border:2px dashed #e74c3c; color:#e74c3c; text-align:center;"><i class="fas fa-exclamation-triangle"></i><br><b>${(spec && spec.name) || 'Especialista'}</b><br><small style="opacity:0.7;">Error al cargar: ${e.message}</small></div>`;
            }
        }).join('');

        // Fallback: si el HTML quedó vacío pero había especialistas, mostrar error
        if (!container.innerHTML.trim() || container.innerHTML.trim() === '') {
            console.error('[renderSpecialists] innerHTML vacío después de render - specialists count was:', specialists.length);
            container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:#e74c3c; border:2px dashed #e74c3c; border-radius:12px;"><i class="fas fa-exclamation-triangle"></i> Error inesperado al cargar el personal. Recarga la página (F5).</p>`;
        }
    } catch(globalError) {
        console.error('[renderSpecialists] Global error:', globalError.message, globalError.stack);
        const container = document.getElementById('specialists-container');
        if (container) container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:#e74c3c; border:2px dashed #e74c3c; border-radius:12px;"><i class="fas fa-exclamation-triangle"></i> Error crítico: ${globalError.message}</p>`;
    }
}

// Toggle activar/desactivar profesional
window.toggleSpecialistActive = function(name) {
    let specialists = [];
    try { specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || []; } catch(e) {}
    const idx = specialists.findIndex(s => s.name === name);
    if (idx === -1) return;
    specialists[idx].active = specialists[idx].active === false ? true : false;
    localStorage.setItem('margarita_specialists', JSON.stringify(specialists));
    const isActive = specialists[idx].active !== false;
    showToast(isActive ? `✅ ${name} está ACTIVA y disponible.` : `⛔ ${name} marcada como NO disponible hoy.`, isActive ? 'success' : 'error');
    renderSpecialists();
    populateSpecialistDropdowns();
};

window.toggleSpecDetails = function(specId) {
    const btn = document.getElementById(`btn-spec-${specId}`);
    const collapse = document.getElementById(`collapse-spec-${specId}`);
    if (btn && collapse) {
        btn.classList.toggle('expanded');
        collapse.classList.toggle('expanded');
    }
};

function resizeImageFileToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 250;
            const MAX_HEIGHT = 250;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

window.addSpecialist = function() {
    const nameInput = document.getElementById('new-specialist-name');
    const phoneInput = document.getElementById('new-specialist-phone');
    const addressInput = document.getElementById('new-specialist-address');
    const ageInput = document.getElementById('new-specialist-age');
    const genderInput = document.getElementById('new-specialist-gender');
    const photoInput = document.getElementById('new-specialist-photo');
    
    // Checkboxes for specialty
    const checkboxes = document.querySelectorAll('.new-spec-cb:checked');
    const specialtyList = Array.from(checkboxes).map(cb => cb.value);
    const specialty = specialtyList.length > 0 ? specialtyList.join(', ') : 'Todos';

    const name = nameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const age = ageInput ? ageInput.value.trim() : '';
    const gender = genderInput ? genderInput.value : '';
    
    if (!name) {
        showToast('Escribe un nombre válido.', 'error');
        return;
    }

    let specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    if (!Array.isArray(specialists)) specialists = [];
    
    specialists = specialists.map(s => {
        if (typeof s === 'string') return {name: s, image: '', phone: '', address: '', specialty: 'Todos'};
        return s;
    });
    
    if (specialists.find(s => s && s.name && s.name.toLowerCase() === name.toLowerCase())) {
        showToast('Este profesional ya existe en la lista.', 'error');
        return;
    }

    const saveSpec = async (imgData) => {
        const profitInput = document.getElementById('new-specialist-profit');
        const profitPct = parseInt(profitInput ? profitInput.value : 50) || 50;

        let finalImg = imgData;
        // Upload specialist photo to Firebase Storage if available
        if (imgData && imgData.startsWith('data:image') && window.uploadImageToCloud) {
            try {
                const fileName = `especialista_${Date.now()}.jpg`;
                finalImg = await window.uploadImageToCloud(imgData, fileName);
            } catch(e) {
                console.warn('No se pudo subir la foto a Storage, se guarda en local.', e);
            }
        }

        specialists.push({ 
            name, 
            image: finalImg, 
            phone, 
            address, 
            age,
            gender,
            specialty,
            profitPercent: profitPct
        });
        localStorage.setItem('margarita_specialists', JSON.stringify(specialists));

        // Sync to Firestore (Robust Cloud)
        if (window.saveListToCloud) {
            await window.saveListToCloud('especialistas_v2', specialists);
        }

        nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (addressInput) addressInput.value = '';
        if (ageInput) ageInput.value = '';
        if (genderInput) genderInput.value = '';
        if (photoInput) {
            photoInput.value = '';
            document.getElementById('new-specialist-photo-preview').innerHTML = `<i class="fas fa-user-tie" style="color:#aaa;"></i>`;
        }
        document.querySelectorAll('.new-spec-cb').forEach(cb => cb.checked = false);
        
        // Cerrar modal tras guardar
        window.toggleNewSpecialistForm();
        renderSpecialists();
        populateSpecialistDropdowns();
        showToast(`${name} ha sido agregado al equipo con éxito.`);
    };

    if (photoInput && photoInput.files && photoInput.files[0]) {
        resizeImageFileToBase64(photoInput.files[0], saveSpec);
    } else {
        saveSpec('');
    }
};

window.deleteSpecialist = function(name) {
    const gender = localStorage.getItem('margarita_admin_gender') || 'Femenino';
    const areYouSure = gender === 'Femenino' ? '¿Segura' : '¿Seguro';
    showConfirm(`${areYouSure} que quieres eliminar a ${name} del equipo?`, () => {
        let specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
        if (!Array.isArray(specialists)) specialists = [];
        specialists = specialists.map(s => {
            if (typeof s === 'string') return {name: s, image: '', phone: '', address: '', specialty: 'Todos'};
            return s;
        });
        specialists = specialists.filter(s => s && s.name && s.name !== name);
        localStorage.setItem('margarita_specialists', JSON.stringify(specialists));

        // Sync to cloud
        if (window.saveListToCloud) {
            window.saveListToCloud('especialistas_v2', specialists);
        }

        renderSpecialists();
        populateSpecialistDropdowns();
        showToast('Personal eliminado correctamente.');
    });
};

function populateSpecialistDropdowns() {
    let specialists = [];
    try {
        specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
        if (!Array.isArray(specialists)) specialists = [];
    } catch(e) { specialists = []; }
    
    // Normalizar como objetos y quitar nulos para evitar crasheos (El mismo arreglo que admin.js renderSpecialists hace)
    specialists = specialists.map(s => {
        if (typeof s === 'string') return {name: s, image: '', phone: '', address: '', specialty: 'Todos'};
        return s;
    }).filter(s => s && s.name);

    // No forzamos reaparición de especialistas hardcodeados si la lista está vacía.
    
    // Dropdown en el form de servicios
    const serviceSelect = document.getElementById('new-service-specialist');
    // Dropdown en el form de cita manual (IMPORTANTE)
    const manualSelect = document.getElementById('manual-specialist');

    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="Todos">Todos (Agregado Automáticamente)</option>' + 
                                  specialists.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }

    if (manualSelect) {
        manualSelect.innerHTML = '<option value="">-- Seleccionar profesional --</option>' + 
                                 specialists.map(s => {
                                     const active = s.active !== false;
                                     return `<option value="${s.name}" ${active ? '' : 'disabled'} style="${active ? '' : 'color:#999;'}">
                                         ${s.name} — ${active ? 'Disponible ✅' : 'No disponible ❌'}
                                     </option>`;
                                 }).join('');
    }
}

// ----------------------------------------------------
// EDIT SPECIALIST LOGIC
// ----------------------------------------------------
window.openEditSpecialistModal = function(name) {
    const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const spec = specialists.find(s => (s.name || s) === name);
    if (!spec) return;

    document.getElementById('edit-specialist-original-name').value = spec.name || name;
    document.getElementById('edit-specialist-name').value = spec.name || name;
    document.getElementById('edit-specialist-phone').value = spec.phone || '';
    document.getElementById('edit-specialist-address').value = spec.address || '';
    const ageInput = document.getElementById('edit-specialist-age');
    const genderInput = document.getElementById('edit-specialist-gender');
    if (ageInput) ageInput.value = spec.age || '';
    if (genderInput) genderInput.value = spec.gender || 'Femenino';
    
    // Checkboxes for specialty
    const specArray = (spec.specialty || 'Todos').split(',').map(s => s.trim());
    if (window.populateSpecialtyCheckboxes) {
        window.populateSpecialtyCheckboxes('edit-specialist-specialties-container', 'edit-spec-cb', specArray);
    } else {
        document.querySelectorAll('.edit-spec-cb').forEach(cb => {
            cb.checked = specArray.includes(cb.value);
        });
    }
    document.getElementById('edit-specialist-profit').value = spec.profitPercent || 50;
    document.getElementById('edit-specialist-photo').value = '';

    const photoContainer = document.getElementById('edit-specialist-current-photo');
    if (spec.image) {
        photoContainer.innerHTML = `<img src="${spec.image}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        photoContainer.innerHTML = `<i class="fas fa-user-tie" style="color:#aaa; font-size:1.5rem;"></i>`;
    }

    document.getElementById('editSpecialistModal').style.display = 'flex';
};

window.closeEditSpecialistModal = function() {
    document.getElementById('editSpecialistModal').style.display = 'none';
};

window.saveSpecialistEdit = function() {
    const origName = document.getElementById('edit-specialist-original-name').value;
    const newName = document.getElementById('edit-specialist-name').value.trim();
    const phone = document.getElementById('edit-specialist-phone').value.trim();
    const address = document.getElementById('edit-specialist-address').value.trim();
    const age = document.getElementById('edit-specialist-age').value.trim();
    const gender = document.getElementById('edit-specialist-gender').value;
    const photoInput = document.getElementById('edit-specialist-photo');
    
    const checkboxes = document.querySelectorAll('.edit-spec-cb:checked');
    const specialtyList = Array.from(checkboxes).map(cb => cb.value);
    const specialty = specialtyList.length > 0 ? specialtyList.join(', ') : 'Todos';

    if (!newName) {
        showToast('Escribe un nombre válido.', 'error');
        return;
    }

    let specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const index = specialists.findIndex(s => s.name === origName);
    if (index === -1) return;

    // Check duplicate if name changed
    if (origName !== newName && specialists.find(s => s.name.toLowerCase() === newName.toLowerCase())) {
        showToast('El nombre nuevo ya existe.', 'error');
        return;
    }

    const finalizeSave = async (imgData) => {
        const profitInput = document.getElementById('edit-specialist-profit');
        const profitPct = parseInt(profitInput ? profitInput.value : 50) || 50;

        let finalImg = imgData || specialists[index].image;

        // If a new photo was uploaded, ensure it's in the cloud
        if (imgData && imgData.startsWith('data:image') && window.uploadImageToCloud) {
            try {
                const fileName = `especialista_edit_${Date.now()}.jpg`;
                finalImg = await window.uploadImageToCloud(imgData, fileName);
            } catch(e) {}
        }

        specialists[index] = {
            ...specialists[index],
            name: newName,
            phone,
            address,
            age,
            gender,
            specialty,
            profitPercent: profitPct,
            image: finalImg
        };
        localStorage.setItem('margarita_specialists', JSON.stringify(specialists));

        // Sync to Cloud (Robust)
        if (window.saveListToCloud) {
            await window.saveListToCloud('especialistas_v2', specialists);
        }
        
        // Also update the name in appointments if name was changed
        if (origName !== newName) {
            let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
            agenda.forEach(a => {
                if (a.specialist === origName) a.specialist = newName;
            });
            localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
            if (window.saveListToCloud) {
                window.saveListToCloud('citas_v2', agenda);
            }
            if(typeof renderAgenda === 'function') renderAgenda();
        }

        closeEditSpecialistModal();
        renderSpecialists();
        populateSpecialistDropdowns();
        showToast(`Datos de ${newName} actualizados.`);
    };

    if (photoInput && photoInput.files && photoInput.files[0]) {
        resizeImageFileToBase64(photoInput.files[0], finalizeSave);
    } else {
        finalizeSave(); // No new photo uploaded
    }
};

// ----------------------------------------------------
// VER SERVICIOS DEL DIA DEL ESPECIALISTA
// ----------------------------------------------------
window.viewSpecialistServices = function(name) {
    activeReportingSpecialist = name;
    
    // Resetear filtros a "Hoy" por defecto al abrir
    const dateInput = document.getElementById('spec-filter-date');
    const monthInput = document.getElementById('spec-filter-month');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0]; // Set to today's date
    if (monthInput) monthInput.value = '';
    
    window.updateSpecialistReport();
    document.getElementById('specialistServicesModal').style.display = 'flex';
};

window.resetSpecialistReport = function() {
    const dateInput = document.getElementById('spec-filter-date');
    const monthInput = document.getElementById('spec-filter-month');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0]; // Set to today's date
    if (monthInput) monthInput.value = '';
    window.updateSpecialistReport();
};

window.updateSpecialistReport = function() {
    if (!activeReportingSpecialist) return;
    
    const name = activeReportingSpecialist;
    const agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const spec = specialists.find(s => s.name === name) || { profitPercent: 50 };
    const profitPct = spec.profitPercent || 50;
    const studioPct = 100 - profitPct;

    const dateVal = document.getElementById('spec-filter-date').value;
    const monthVal = document.getElementById('spec-filter-month').value;
    
    const today = new Date().toLocaleDateString('sv-SE');
    let filterLabel = "";
    let targetApts = [];

    const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    const parsePrice = (priceStr) => {
        if (!priceStr || priceStr === 'Gratis') return 0;
        return parseInt(priceStr.toString().replace(/\D/g, '')) || 0;
    };

    if (dateVal) {
        targetApts = agenda.filter(a => a.status !== 'cancelled' && a.specialist === name && a.date === dateVal);
        filterLabel = `Día: <span style="color:var(--color-dark-pink);">${dateVal}</span>`;
    } else if (monthVal) {
        targetApts = agenda.filter(a => a.status !== 'cancelled' && a.specialist === name && a.date && a.date.startsWith(monthVal));
        const [year, month] = monthVal.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        filterLabel = `Mes: <span style="color:var(--color-dark-pink);">${monthName.toUpperCase()}</span>`;
    } else {
        targetApts = agenda.filter(a => a.status !== 'cancelled' && a.specialist === name && a.date === today);
        filterLabel = `Hoy: <span style="color:var(--color-dark-pink);">${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>`;
    }

    document.getElementById('specialist-services-title').innerHTML = `Personal: <span style="color:var(--gold-primary);">${name}</span><br><small style="color:#999; font-weight:normal;">${filterLabel}</small>`;

    const listDiv = document.getElementById('specialist-services-list');
    const footerDiv = document.getElementById('specialist-services-footer');
    
    if (targetApts.length === 0) {
        listDiv.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#bbb; background:#fafafa; border:2px dashed #eee; border-radius:15px; margin:10px 0;">
                <i class="fas fa-search" style="font-size:2.5rem; margin-bottom:15px; display:block; opacity:0.3;"></i>
                <div style="font-weight:bold; font-size:1.1rem; color:#999;">No hay servicios en este periodo</div>
                <div style="font-size:0.9rem; margin-top:5px;">Intenta con otra fecha o mes.</div>
            </div>`;
        footerDiv.innerHTML = '';
    } else {
        let sorted = targetApts.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
        let total = 0;
        
        listDiv.innerHTML = sorted.map(a => {
            const val = parsePrice(a.splitPrice || a.price);
            if (a.status === 'accepted') total += val;
            
            const statusTag = a.status === 'accepted' ? 
                '<span style="color:#2ecc71; font-weight:bold; font-size:0.7rem; background:rgba(46,204,113,0.1); padding:2px 8px; border-radius:4px;"><i class="fas fa-check"></i> REALIZADA</span>' : 
                (a.status === 'postponed' ? 
                    '<span style="color:#f39c12; font-weight:bold; font-size:0.7rem; background:rgba(243,156,18,0.1); padding:2px 8px; border-radius:4px;"><i class="fas fa-history"></i> APLAZADA</span>' : 
                    '<span style="color:#3498db; font-weight:bold; font-size:0.7rem; background:rgba(52,152,219,0.1); padding:2px 8px; border-radius:4px;"><i class="fas fa-clock"></i> PENDIENTE</span>');

            return `
            <div style="background:rgba(255, 255, 255, 0.9); padding:15px; border-radius:12px; border:1px solid #eee; border-left:5px solid ${a.status === 'accepted' ? 'var(--color-dark-pink)' : '#ddd'}; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 3px 10px rgba(0,0,0,0.02); opacity: 1;">
                <div style="flex:1;">
                    <div style="font-size:0.75rem; color:#666; margin-bottom:4px; font-weight:bold; letter-spacing:0.5px;">
                        <i class="far fa-calendar-alt" style="color:#888;"></i> ${a.date} <span style="margin:0 5px; color:#ccc;">|</span> <i class="far fa-clock" style="color:#888;"></i> ${window.formatTime12h(a.time)}
                    </div>
                    <div style="font-size:1.1rem; color:#1a1a1a; font-weight:bold; margin-bottom:4px;">
                        ${a.service}
                        ${a.groupId ? (() => {
                            const pBase = parsePrice(a.price);
                            const pCurrent = parsePrice(a.splitPrice || a.price);
                            const isPromo = a.splitPrice && pCurrent < pBase;
                            const isTrulyGrouped = a.groupId && (agenda.filter(x => x.groupId === a.groupId).length >= 2);
                            let lblArr = '';
                            
                            let isActualCombo = a.promoType === 'combo';
                            let isActualDiscount = a.promoType === 'discount' || (!a.promoType && isPromo);

                            if (isActualCombo) {
                                lblArr += `<span style="font-size:0.55rem; background:var(--color-dark-pink); color:white; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:8px; font-weight:800; letter-spacing:0.5px;">COMBO</span>`;
                            } else {
                                if (isTrulyGrouped) {
                                    lblArr += '<span style="font-size:0.55rem; background:#7f8c8d; color:white; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:8px; font-weight:800; letter-spacing:0.5px;">PAQUETE</span>';
                                }
                                if (isActualDiscount) {
                                    const dPct = Math.round((1 - (pCurrent / pBase)) * 100);
                                    lblArr += `<span style="font-size:0.55rem; background:var(--color-dark-pink); color:white; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:8px; font-weight:800; letter-spacing:0.5px;">-${dPct}% DESC</span>`;
                                }
                            }
                            return lblArr;
                        })() : ''}
                    </div>
                    <div style="font-size:0.85rem; color:#333; display:flex; align-items:center; gap:8px;">
                        <span style="display:flex; align-items:center; gap:4px;"><i class="fas fa-user-circle" style="color:#666; font-size:0.9rem;"></i> ${a.name || 'Cliente'}</span>
                    </div>
                </div>
                <div style="text-align:right; margin-left:15px; display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <div style="font-size:1.2rem; font-weight:900; color:#1a1a1a;">${fmt(val)}</div>
                    ${statusTag}
                </div>
            </div>`;
        }).join('');

        const halfEarned = (total * profitPct) / 100;
        const studioEarned = (total * studioPct) / 100;

        footerDiv.innerHTML = `
            <div style="font-size:0.75rem; color:#aaa; font-weight:800; text-transform:uppercase; text-align:center; letter-spacing:1.5px; margin-bottom:15px;">Balances Generados (${studioPct}% / ${profitPct}%)</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:#1a1a1a; border-radius:10px; color:white; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                    <span style="font-size:0.9rem; font-weight:600; opacity:0.8;">Total Bruto:</span>
                    <span style="font-size:1.4rem; font-weight:900; color:var(--gold-primary);">${fmt(total)}</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <div style="flex:1; padding:12px; background:rgba(var(--accent-rgb), 0.05); border:1px solid rgba(var(--accent-rgb), 0.1); border-radius:10px; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--color-dark-pink); font-weight:800; text-transform:uppercase; margin-bottom:5px;">Estudio (${studioPct}%)</div>
                        <div style="font-size:1.1rem; font-weight:900; color:var(--color-dark-pink);">${fmt(studioEarned)}</div>
                    </div>
                    <div style="flex:1; padding:12px; background:rgba(39, 174, 96, 0.05); border:1px solid rgba(39, 174, 96, 0.1); border-radius:10px; text-align:center;">
                        <div style="font-size:0.65rem; color:#27ae60; font-weight:800; text-transform:uppercase; margin-bottom:5px;">Profesional (${profitPct}%)</div>
                        <div style="font-size:1.1rem; font-weight:900; color:#27ae60;">${fmt(halfEarned)}</div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.closeSpecialistServicesModal = function() {
    activeReportingSpecialist = null;
    document.getElementById('specialistServicesModal').style.display = 'none';
};

// ----------------------------------------------------
// EXPORTACIÓN A PDF
// ----------------------------------------------------
window.exportSpecialistReportToPDF = function() {
    if (!activeReportingSpecialist) return;
    if (typeof window.jspdf === 'undefined') {
        showToast('Error: Librería PDF no cargada.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const name = activeReportingSpecialist;
    const businessName = localStorage.getItem('margarita_site_name') || 'StyleSync Pro';
    
    // Obtener datos actuales
    const agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const spec = specialists.find(s => s.name === name) || { profitPercent: 50 };
    const profitPct = spec.profitPercent || 50;
    const studioPct = 100 - profitPct;

    const dateVal = document.getElementById('spec-filter-date').value;
    const monthVal = document.getElementById('spec-filter-month').value;
    const today = new Date().toLocaleDateString('sv-SE');

    let targetApts = [];
    let periodLabel = "";

    if (dateVal) {
        targetApts = agenda.filter(a => a.status === 'accepted' && a.specialist === name && a.date === dateVal);
        periodLabel = `Día: ${dateVal}`;
    } else if (monthVal) {
        targetApts = agenda.filter(a => a.status === 'accepted' && a.specialist === name && a.date && a.date.startsWith(monthVal));
        periodLabel = `Mes: ${monthVal}`;
    } else {
        targetApts = agenda.filter(a => a.status === 'accepted' && a.specialist === name && a.date === today);
        periodLabel = `Hoy: ${today}`;
    }

    if (targetApts.length === 0) {
        showToast('No hay datos para exportar en este periodo.', 'error');
        return;
    }

    const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    const parsePrice = (priceStr) => {
        if (!priceStr || priceStr === 'Gratis') return 0;
        return parseInt(priceStr.toString().replace(/\D/g, '')) || 0;
    };

    let total = 0;
    const tableData = targetApts.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time)).map(a => {
        const val = a.splitPrice || parsePrice(a.price);
        total += val;
        return [a.date, window.formatTime12h(a.time), a.service, a.name || 'Cliente', a.phone || 'N/A', fmt(val)];
    });

    const halfEarned = (total * profitPct) / 100;
    const studioEarned = (total * studioPct) / 100;

    // Estilo de PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(160, 93, 107); // Rosa oscuro
    doc.text("REPORTE DE SERVICIOS", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`Establecimiento: ${businessName}`, 20, 35);
    doc.text(`Profesional: ${name}`, 20, 42);
    doc.text(`Periodo: ${periodLabel}`, 20, 49);
    
    doc.autoTable({
        startY: 55,
        head: [['Fecha', 'Hora', 'Servicio', 'Cliente', 'WhatsApp', 'Precio']],
        body: tableData,
        headStyles: { fillColor: [160, 93, 107], textColor: 255 },
        alternateRowStyles: { fillColor: [249, 249, 249] },
        styles: { fontSize: 9, cellPadding: 3 }, // Reduced font size slightly for extra column
        margin: { top: 55 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    
    // Cuadro de Resumen
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(20, finalY - 5, 170, 35, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL BRUTO GENERADO:`, 25, finalY + 5);
    doc.text(`${fmt(total)}`, 185, finalY + 5, { align: "right" });
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Ganancia Estudio (${studioPct}%):`, 25, finalY + 15);
    doc.text(`${fmt(studioEarned)}`, 185, finalY + 15, { align: "right" });
    
    doc.setTextColor(39, 174, 96); // Verde para el profesional
    doc.text(`Ganancia Profesional (${profitPct}%):`, 25, finalY + 25);
    doc.text(`${fmt(halfEarned)}`, 185, finalY + 25, { align: "right" });

    const cleanBusinessName = businessName.replace(/\s+/g, '_');
    doc.save(`Reporte_${cleanBusinessName}_${name.replace(/\s+/g, '_')}_${periodLabel.replace(/[:\s]/g, '_')}.pdf`);
    showToast('Reporte PDF generado con éxito.');
};

// ----------------------------------------------------
// DETALLES PERSONALES DEL ESPECIALISTA
// ----------------------------------------------------
window.viewSpecialistInfo = function(name) {
    const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const spec = specialists.find(s => s.name === name);
    if (!spec) return;

    document.getElementById('spec-info-name').innerText = spec.name;
    document.getElementById('spec-info-phone').innerText = spec.phone || 'No registrado';
    document.getElementById('spec-info-address').innerText = spec.address || 'No registrada';
    document.getElementById('spec-info-age').innerText = spec.age ? `${spec.age} años` : 'No registrada';
    document.getElementById('spec-info-gender').innerText = spec.gender || 'No especificado';
    
    // Foto
    const photoDiv = document.getElementById('spec-info-photo');
    if (spec.image) {
        photoDiv.innerHTML = `<img src="${spec.image}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid var(--color-accent); box-shadow:0 5px 15px rgba(0,0,0,0.1);">`;
    } else {
        photoDiv.innerHTML = `<div style="background:var(--gold-primary)22; width:100px; height:100px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gold-primary); font-size:2.5rem;"><i class="fas fa-user-tie"></i></div>`;
    }

    // Botón WhatsApp
    const waBtn = document.getElementById('spec-info-wa-btn');
    if (spec.phone) {
        waBtn.href = `https://wa.me/57${spec.phone.toString().replace(/\D/g,'')}`;
        waBtn.style.display = 'flex';
    } else {
        waBtn.style.display = 'none';
    }

    document.getElementById('specialistInfoModal').style.display = 'flex';
};

window.closeSpecialistInfoModal = function() {
    document.getElementById('specialistInfoModal').style.display = 'none';
};

// ----------------------------------------------------
// SISTEMA DE MODALES
// ----------------------------------------------------
window.populateSpecialtyCheckboxes = function(containerId, checkboxClass, checkedValues = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cats = JSON.parse(localStorage.getItem('margarita_categories')) || [];
    let html = '';
    
    // Normalizar valores marcados para comparación robusta
    const normalizedChecked = checkedValues.map(v => (v || "").toLowerCase().trim());
    
    // Deduplicación visual por nombre
    const seenNames = new Set();
    const uniqueCats = cats.filter(cat => {
        const name = (cat.name || "").trim();
        if (!name || seenNames.has(name.toLowerCase())) return false;
        seenNames.add(name.toLowerCase());
        return true;
    });

    const type = checkboxClass.includes('new') ? 'new' : 'edit';

    uniqueCats.forEach(cat => {
        const isChecked = normalizedChecked.includes(cat.name.toLowerCase().trim()) ? 'checked' : '';
        html += `<div style="padding: 6px 0; border-bottom: 1px solid rgba(160, 93, 107, 0.15); display: flex; align-items: center;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0; width: 100%; color: var(--color-text);">
                        <input type="checkbox" value="${cat.name}" class="${checkboxClass}" ${isChecked} onchange="window.updateSpecialistSvcCount('${type}')" style="accent-color: var(--color-dark-pink);"> 
                        ${cat.name}
                    </label>
                 </div>`;
    });
    // Si no existen categorías, al menos mostramos un mensaje
    if(uniqueCats.length === 0) {
        html = '<span style="color:#999; font-size:0.8rem;">Crea categorías primero en el menú "Categorías".</span>';
    }
    container.innerHTML = html;

    // Inicializar el contador y texto del trigger
    window.updateSpecialistSvcCount(type);
};

window.toggleSpecialistSvcDropdown = function(type, event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById(`${type}-specialist-dropdown`);
    const trigger = document.getElementById(`${type}-specialist-trigger`);
    if (!dropdown || !trigger) return;
    
    // Cerrar otros dropdowns si están abiertos
    document.querySelectorAll('.custom-multi-select-dropdown').forEach(d => {
        if (d.id !== `${type}-specialist-dropdown`) d.classList.remove('active');
    });
    document.querySelectorAll('.custom-multi-select-trigger').forEach(t => {
        if (t.id !== `${type}-specialist-trigger`) t.classList.remove('active');
    });

    dropdown.classList.toggle('active');
    trigger.classList.toggle('active');
};

window.updateSpecialistSvcCount = function(type) {
    const cbClass = type === 'new' ? 'new-spec-cb' : 'edit-spec-cb';
    const checks = document.querySelectorAll(`.${cbClass}:checked`);
    const label = document.getElementById(`${type}-specialist-label`);
    const countBadge = document.getElementById(`${type}-specialist-count`);
    if (!label || !countBadge) return;
    
    if (checks.length > 0) {
        const text = Array.from(checks).map(cb => cb.value).join(', ');
        if (text.length > 25) {
            label.innerText = `${checks.length} seleccionados`;
        } else {
            label.innerText = text;
        }
        countBadge.innerText = checks.length;
        countBadge.style.display = 'inline-block';
    } else {
        label.innerText = 'Elegir especialidades...';
        countBadge.style.display = 'none';
    }
};


window.toggleNewSpecialistForm = function() {
    const modal = document.getElementById('newSpecialistModal');
    if (modal) {
        const isShowing = modal.style.display === 'flex';
        modal.style.display = isShowing ? 'none' : 'flex';
        
        if (!isShowing) {
            if (window.populateSpecialtyCheckboxes) {
                window.populateSpecialtyCheckboxes('new-specialist-specialties-container', 'new-spec-cb');
            }
        }
    }
};

window.toggleSpecActionsMenu = function(specName, event) {
    if (event) event.stopPropagation();
    const menuId = `actions-menu-${specName.replace(/\s+/g, '')}`;
    const menu = document.getElementById(menuId);
    
    // Cerrar otros menús abiertos
    document.querySelectorAll('.spec-actions-menu').forEach(m => {
        if (m.id !== menuId) m.classList.remove('active');
    });
    
    if (menu) {
        menu.classList.toggle('active');
    }
};

// CONTROL DE ESTADO DEL SALÓN (ON/OFF)
window.toggleSalonStatus = function(isOpen) {
    localStorage.setItem('margarita_salon_open', isOpen);
    
    if (window.saveDataToCloud) {
        let closures = null;
        try { closures = JSON.parse(localStorage.getItem('margarita_closure_dates')); } catch(e){}
        window.saveDataToCloud('config_v2', 'salon_status', { 
            open: isOpen,
            closure_dates: closures
        });
    }
    
    showToast(isOpen ? "Salón abierto: Servicios activados." : "Salón cerrado: Aviso activado para clientes.", isOpen ? "success" : "warning");
};

// MODAL DE CONFIGURACIÓN DE CIERRE
window.openClosureSettings = function() {
    const modal = document.getElementById('closureSettingsModal');
    if (modal) {
        modal.style.display = 'flex';
        // Cargar valores existentes
        const saved = localStorage.getItem('margarita_closure_dates');
        if (saved) {
            const range = JSON.parse(saved);
            document.getElementById('closure-start').value = range.start || '';
            document.getElementById('closure-end').value = range.end || '';
        }
    }
};

window.closeClosureSettings = function() {
    const modal = document.getElementById('closureSettingsModal');
    if (modal) modal.style.display = 'none';
};

window.saveClosureSettings = function() {
    const start = document.getElementById('closure-start').value;
    const end = document.getElementById('closure-end').value;

    if (!start || !end) {
        showToast("Por favor selecciona ambas fechas.", "error");
        return;
    }

    if (new Date(start) > new Date(end)) {
        showToast("La fecha de inicio no puede ser posterior a la de fin.", "error");
        return;
    }

    const closureData = { start, end };
    localStorage.setItem('margarita_closure_dates', JSON.stringify(closureData));
    
    // Al guardar, notificamos a la web pública y a la nube
    localStorage.setItem('margarita_salon_trigger', Date.now()); 
    if (window.saveDataToCloud) {
        const isOpen = localStorage.getItem('margarita_salon_open') !== 'false';
        window.saveDataToCloud('config_v2', 'salon_status', { 
            open: isOpen,
            closure_dates: closureData
        });
    }

    showToast("Programación de cierre guardada con éxito.", "success");
    closeClosureSettings();
};

// ----------------------------------------------------
// CONFIGURACIÓN Y AJUSTES DEL SISTEMA
// ----------------------------------------------------
window.syncAdminMetaToCloud = async function(silent = false) {
    if (!window.saveDataToCloud) return;

    const meta = {
        theme: localStorage.getItem('margarita_admin_theme') || 'rose',
        site_name: localStorage.getItem('margarita_site_name') || 'StyleSync Pro',
        admin_gender: localStorage.getItem('margarita_admin_gender') || 'Femenino',
        whatsapp_number: localStorage.getItem('margarita_whatsapp_number') || '3057726115',
        site_address: localStorage.getItem('margarita_site_address') || 'Calle 14 # 11-74, Sevilla',
        admin_user: localStorage.getItem('margarita_admin_user') || 'admin',
        admin_pass: localStorage.getItem('margarita_admin_pass') || '12345',
        admin_email: localStorage.getItem('margarita_admin_email') || 'ejemplo@correo.com',
        social_links: JSON.parse(localStorage.getItem('margarita_social_links') || '{"insta":"","tiktok":"","face":""}'),
        logo_url: localStorage.getItem('margarita_logo_url') || '',
        hero_url: localStorage.getItem('margarita_hero_url') || '',
        admin_bg: localStorage.getItem('margarita_admin_bg') || ''
    };
    await window.saveDataToCloud('config_v2', 'admin_meta', meta);
    
    // Cloud Sync: Guardar la parte pública en 'general' para los clientes
    const publicMeta = {
        site_name: meta.site_name,
        whatsapp: meta.whatsapp_number,
        site_address: meta.site_address,
        social: meta.social_links,
        theme: meta.theme,
        logo_url: meta.logo_url,
        hero_url: meta.hero_url
    };
    await window.saveDataToCloud('config_v2', 'general', publicMeta);

    if (!silent) console.log("☁️ [Nube] Ajustes de Administrador y Públicos guardados.");
};

window.saveIdentity = async function() {
    window._isSavingSettings = true; // Activar protección contra sobreescrituras en segundo plano
    const name = document.getElementById('settings-site-name').value.trim();
    const gender = document.getElementById('settings-admin-gender').value;
    const waNum = document.getElementById('settings-site-whatsapp').value.trim();
    const address = document.getElementById('settings-site-address').value.trim();
    
    if(!name) {
        return showToast("El nombre del negocio no puede estar vacío.", "error");
    }
    if(!waNum) {
        return showToast("El teléfono de reservas no puede estar vacío.", "error");
    }
    if(!address) {
        return showToast("La dirección del negocio no puede estar vacía.", "error");
    }

    localStorage.setItem('margarita_site_name', name);
    localStorage.setItem('margarita_admin_gender', gender);
    localStorage.setItem('margarita_whatsapp_number', waNum);
    localStorage.setItem('margarita_site_address', address);
    localStorage.setItem('margarita_salon_trigger', Date.now()); // Notificar a la web

    const uploadFileHelper = function(inputEl, cloudFileName, maxWidth = 1200, maxHeight = 1200) {
        return new Promise((resolve) => {
            if (inputEl && inputEl.files && inputEl.files[0]) {
                const file = inputEl.files[0];
                if (file.size > 10 * 1024 * 1024) { // Subir límite ya que redimensionamos en canvas
                    showToast(`Imagen muy pesada. El máximo permitido es 10MB.`, "error");
                    resolve(null);
                    return;
                }
                const reader = new FileReader();
                reader.onload = async function(e) {
                    const originalBase64 = e.target.result;
                    const compressedBase64 = await resizeImageBase64(originalBase64, maxWidth, maxHeight);
                    resolve({ base64: compressedBase64, url: compressedBase64 });
                };
                reader.readAsDataURL(file);
            } else {
                resolve(null);
            }
        });
    };

    // 1. Procesar Fondo de Inicio de Sesión
    const bgInput = document.getElementById('settings-admin-bg');
    const bgRes = await uploadFileHelper(bgInput, 'salon_login_bg', 1600, 1600);
    if (bgRes) {
        localStorage.setItem('margarita_admin_bg', bgRes.url);
        document.getElementById('settings-admin-bg-preview').src = bgRes.url;
        document.getElementById('settings-admin-bg-preview').style.display = 'block';
    }

    // 2. Procesar Logo de la Marca (Máx 300px para ser ligero y compatible con Favicon)
    const logoInput = document.getElementById('settings-site-logo');
    const logoRes = await uploadFileHelper(logoInput, 'salon_logo', 300, 300);
    if (logoRes) {
        localStorage.setItem('margarita_logo_url', logoRes.url);
        _showSavedPreview('settings-site-logo-preview', logoRes.url);
    }

    // 3. Procesar Foto de Portada / Hero
    const heroInput = document.getElementById('settings-site-hero');
    const heroRes = await uploadFileHelper(heroInput, 'salon_hero', 1200, 1200);
    if (heroRes) {
        localStorage.setItem('margarita_hero_url', heroRes.url);
        _showSavedPreview('settings-site-hero-preview', heroRes.url);
    }

    applyDynamicBranding();
    
    // Limpiar campos de archivo por comodidad
    if (bgInput) bgInput.value = '';
    if (logoInput) logoInput.value = '';
    if (heroInput) heroInput.value = '';

    showToast("¡Identidad y medios actualizados con éxito!", "success");
    
    // Guardar en la nube
    await window.syncAdminMetaToCloud(true);
    
    // Liberar protección después de sincronizar con éxito (3 segundos es sumamente seguro)
    setTimeout(() => {
        window._isSavingSettings = false;
    }, 3000);
};

window.toggleIdentityEdit = function(field) {
    // Stub kept for backward compatibility (no longer needed as fields are always editable)
};

window.previewImageLocal = function(inputEl, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (inputEl.files && inputEl.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            // Ocultar el ícono de placeholder
            const icon = preview.parentElement && preview.parentElement.querySelector('.premium-placeholder-icon');
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(inputEl.files[0]);
    }
};

// Redimensionar base64 para evitar QuotaExceededError en localStorage y hacer que el favicon funcione en Chrome/Edge
function resizeImageBase64(base64Str, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        if (!base64Str || !base64Str.startsWith('data:image/')) {
            resolve(base64Str);
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.onload = function() {
            let width = img.width;
            let height = img.height;

            if (width <= maxWidth && height <= maxHeight) {
                resolve(base64Str); // No es necesario redimensionar
                return;
            }

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            let format = 'image/png';
            if (base64Str.startsWith('data:image/jpeg')) {
                format = 'image/jpeg';
            } else if (base64Str.startsWith('data:image/webp')) {
                format = 'image/webp';
            }

            resolve(canvas.toDataURL(format, 0.85));
        };
        img.onerror = function() {
            resolve(base64Str); // Fallback
        };
    });
}

// Helper para mostrar imagen guardada y ocultar el placeholder
function _showSavedPreview(previewId, src) {
    const preview = document.getElementById(previewId);
    if (preview && src) {
        preview.src = src;
        preview.style.display = 'block';
        const icon = preview.parentElement && preview.parentElement.querySelector('.premium-placeholder-icon');
        if (icon) icon.style.display = 'none';
    }
}


function applyDynamicBranding() {
    const name = localStorage.getItem('margarita_site_name') || "StyleSync Pro";
    const customLogo = localStorage.getItem('margarita_logo_url');

    // Auto-optimizar logos gigantescos existentes en el navegador
    if (customLogo && customLogo.startsWith('data:image/') && customLogo.length > 120000) {
        console.log("⚡ [Favicon] Logo grande detectado en localStorage. Optimizándolo para reactivar el icono de pestaña...");
        resizeImageBase64(customLogo, 300, 300).then(resized => {
            if (resized && resized.length < customLogo.length) {
                localStorage.setItem('margarita_logo_url', resized);
                console.log("✅ [Favicon] Logo optimizado de", Math.round(customLogo.length/1024), "KB a", Math.round(resized.length/1024), "KB.");
                // Forzar actualización inmediata
                applyDynamicBranding();
            }
        });
    }

    // 1. Actualizar título de la pestaña
    document.title = `Panel Administrativo | ${name}`;

    // 2. Actualizar favicon (icono de pestaña) — sin flash: solo actualizar href
    if (customLogo) {
        let link = document.getElementById('dynamic-favicon');
        if (!link) {
            link = document.createElement('link');
            link.id = 'dynamic-favicon';
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        if (customLogo.startsWith('data:image/svg') || customLogo.endsWith('.svg')) {
            link.type = 'image/svg+xml';
        } else {
            link.type = 'image/png';
        }
        link.href = customLogo;
    }

    document.querySelectorAll('.dynamic-brand-name').forEach(el => {
        const expectedHTML = `<a href="admin.html" style="text-decoration: none; color: inherit;">${name}<span>.</span> Admin</a>`;
        if (el.innerHTML !== expectedHTML) {
            el.innerHTML = expectedHTML;
        }
    });

    const customBg = localStorage.getItem('margarita_admin_bg');
    const authSection = document.getElementById('auth-section');
    if (authSection && customBg) {
        const expectedBg = `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url("${customBg.replace(/"/g, '\\"')}")`;
        const currentBg = authSection.style.backgroundImage.replace(/'/g, '"');
        const checkBg = expectedBg.replace(/'/g, '"');
        if (currentBg !== checkBg) {
            authSection.style.backgroundImage = expectedBg;
        }
    }

    const sidebarLogoContainer = document.getElementById('admin-sidebar-logo-container');
    if (sidebarLogoContainer) {
        if (customLogo) {
            // Forzar actualización siempre añadiendo cache-buster para URLs remotas
            const freshSrc = customLogo.startsWith('data:') ? customLogo : (customLogo + (customLogo.includes('?') ? '&' : '?') + 't=' + Date.now());
            sidebarLogoContainer.innerHTML = `<img src="${freshSrc}" style="width: 42px; height: 42px; object-fit: contain; border-radius: 8px; image-rendering: -webkit-optimize-contrast; transform: translateZ(0); backface-visibility: hidden;">`;
        } else {
            sidebarLogoContainer.innerHTML = `<i class="fas fa-crown" id="admin-sidebar-logo-icon"></i>`;
        }
    }

    // Notificar a la web pública
    localStorage.setItem('margarita_salon_trigger', Date.now());
}

window.toggleSecurityEdit = function(field) {
    // Stub kept for backward compatibility (no longer needed as fields are always editable)
};

window.saveSecurityDetails = function() {
    const newUser = document.getElementById('settings-admin-user').value.trim();
    const newPass = document.getElementById('settings-admin-pass').value.trim();
    const newExpensePass = document.getElementById('settings-admin-expense-pass').value.trim();
    const currentVerify = document.getElementById('settings-current-pass').value;

    const storedUser = localStorage.getItem('margarita_admin_user') || 'admin';
    const storedPass = localStorage.getItem('margarita_admin_pass') || '12345';
    const storedExpensePass = localStorage.getItem('margarita_expense_pass') || '';

    if (!newUser) return showToast("El usuario de acceso no puede estar vacío.", "error");
    if (!currentVerify) return showToast("Ingresa tu contraseña actual para confirmar los cambios.", "error");
    if (currentVerify !== storedPass) return showToast("Contraseña actual incorrecta.", "error");
    
    // Verificar si realmente se editó algo
    const isUserChanged = (newUser !== storedUser);
    const isPassChanged = (newPass.length > 0);
    const isExpensePassChanged = (newExpensePass !== storedExpensePass);

    if (!isUserChanged && !isPassChanged && !isExpensePassChanged) {
        return showToast("No has realizado ningún cambio.", "error");
    }

    if (isUserChanged) {
        localStorage.setItem('margarita_admin_user', newUser);
    }
    if (isPassChanged) {
        if (newPass.length < 5) return showToast("La nueva clave debe tener al menos 5 caracteres.", "error");
        localStorage.setItem('margarita_admin_pass', newPass);
    }
    if (isExpensePassChanged) {
        localStorage.setItem('margarita_expense_pass', newExpensePass);
        if (newExpensePass === '') {
            window._expensesUnlocked = true;
        } else {
            window._expensesUnlocked = false; // Lock if new password is set
        }
    }

    showToast("Datos de acceso actualizados correctamente.", "success");
    
    // Limpiar claves por seguridad
    document.getElementById('settings-admin-pass').value = '';
    document.getElementById('settings-current-pass').value = '';
    
    loadCurrentSettings(); // Refrescar placeholders e inputs
    
    // Guardar claves y usuarios en la nube globalmente
    window.syncAdminMetaToCloud(true);
};


window.saveSocialLinks = function() {
    const social = {
        insta: document.getElementById('settings-social-insta').value.trim(),
        tiktok: document.getElementById('settings-social-tiktok').value.trim(),
        face: document.getElementById('settings-social-face').value.trim()
    };
    localStorage.setItem('margarita_social_links', JSON.stringify(social));
    localStorage.setItem('margarita_salon_trigger', Date.now());
    
    // Guardar redes en la nube
    window.syncAdminMetaToCloud(true);

    showToast("Redes sociales vinculadas con éxito.");
};

function loadCurrentSettings() {
    document.getElementById('settings-site-name').value = localStorage.getItem('margarita_site_name') || "StyleSync Pro";
    document.getElementById('settings-admin-gender').value = localStorage.getItem('margarita_admin_gender') || "Femenino";
    document.getElementById('settings-site-whatsapp').value = localStorage.getItem('margarita_whatsapp_number') || "3057726115";
    document.getElementById('settings-site-address').value = localStorage.getItem('margarita_site_address') || "Calle 14 # 11-74, Sevilla";
    
    const bgInput = document.getElementById('settings-admin-bg');
    const customBg = localStorage.getItem('margarita_admin_bg');
    if (customBg && (!bgInput || !bgInput.files || bgInput.files.length === 0)) {
        _showSavedPreview('settings-admin-bg-preview', customBg);
    }

    const logoInput = document.getElementById('settings-site-logo');
    const customLogo = localStorage.getItem('margarita_logo_url');
    if (customLogo && (!logoInput || !logoInput.files || logoInput.files.length === 0)) {
        _showSavedPreview('settings-site-logo-preview', customLogo);
    }

    const heroInput = document.getElementById('settings-site-hero');
    const customHero = localStorage.getItem('margarita_hero_url');
    if (customHero && (!heroInput || !heroInput.files || heroInput.files.length === 0)) {
        _showSavedPreview('settings-site-hero-preview', customHero);
    }
    
    document.getElementById('settings-admin-user').value = localStorage.getItem('margarita_admin_user') || 'admin';
    document.getElementById('settings-admin-pass').value = '';
    document.getElementById('settings-admin-expense-pass').value = localStorage.getItem('margarita_expense_pass') || '';
    
    const social = JSON.parse(localStorage.getItem('margarita_social_links') || '{}');
    if(social.insta) document.getElementById('settings-social-insta').value = social.insta;
    if(social.tiktok) document.getElementById('settings-social-tiktok').value = social.tiktok;
    if(social.face) document.getElementById('settings-social-face').value = social.face;
}

window.clearClosureSettings = function() {
    localStorage.removeItem('margarita_closure_dates');
    document.getElementById('closure-start').value = '';
    document.getElementById('closure-end').value = '';
    
    // Notificamos a la web pública y a la nube
    localStorage.setItem('margarita_salon_trigger', Date.now());
    if (window.saveDataToCloud) {
        const isOpen = localStorage.getItem('margarita_salon_open') !== 'false';
        window.saveDataToCloud('config_v2', 'salon_status', { 
            open: isOpen,
            closure_dates: null
        });
    }

    showToast("Programación de cierre eliminada.", "info");
    closeClosureSettings();
};

window.showSettingsBlock = function(blockId) {
    // Esconder todos
    document.querySelectorAll('.settings-block').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.settings-nav-btn').forEach(el => el.classList.remove('active'));
    
    // Mostrar el seleccionado
    const blockEl = document.getElementById('settings-block-' + blockId);
    if (blockEl) blockEl.classList.add('active');
    
    // Marcar botón activo
    const allBlocks = ['identidad', 'seguridad', 'diseno', 'redes', 'multimedia', 'promo-bubble'];
    const index = allBlocks.indexOf(blockId);
    if (index !== -1) {
        const btns = document.querySelectorAll('.settings-nav-btn');
        if (btns[index]) btns[index].classList.add('active');
    }

    // Renderizar panel de Burbuja Pro al abrirlo
    if (blockId === 'promo-bubble') {
        if (typeof renderAgendaPromoConfig === 'function') renderAgendaPromoConfig();
    }
};

window.getThemesMap = function() {
    return {
        rose: { accent: '#A05D6B', bg: '#FCF8F5', rgb: '160, 93, 107' },
        blue: { accent: '#2D4F6C', bg: '#F4F7F9', rgb: '45, 79, 108' },
        green: { accent: '#2E5A44', bg: '#F4F9F6', rgb: '46, 90, 68' },
        gold: { accent: '#6B4F3E', bg: '#F9F7F5', rgb: '107, 79, 62' },
        lavender: { accent: '#8E7CC3', bg: '#F9F8FC', rgb: '142, 124, 195' },
        orange: { accent: '#E67E22', bg: '#FEF9F5', rgb: '230, 126, 34' },
        cyan: { accent: '#3498DB', bg: '#F4F9FC', rgb: '52, 152, 219' },
        purple: { accent: '#7D3C98', bg: '#F8F4F9', rgb: '125, 60, 152' },
        maroon: { accent: '#922B21', bg: '#FCF5F4', rgb: '146, 43, 33' },
        slate: { accent: '#38bdf8', bg: '#0f172a', rgb: '56, 189, 248' },
        
        emerald: { accent: '#16A085', bg: '#E8F8F5', rgb: '22, 160, 133' },
        mint: { accent: '#27AE60', bg: '#E8F8F0', rgb: '39, 174, 96' },
        teal: { accent: '#117A65', bg: '#E8F6F3', rgb: '17, 122, 101' },
        olive: { accent: '#7D6608', bg: '#FEFDE8', rgb: '125, 102, 8' },
        mustard: { accent: '#B7950B', bg: '#FEFDF0', rgb: '183, 149, 11' },
        terracotta: { accent: '#A04000', bg: '#FDF5E6', rgb: '160, 64, 0' },
        coral: { accent: '#D35400', bg: '#FDF2E9', rgb: '211, 84, 0' },
        sand: { accent: '#A08A75', bg: '#F9F6F0', rgb: '160, 138, 117' },
        coffee: { accent: '#5D4037', bg: '#F6F2F0', rgb: '93, 64, 55' },
        plum: { accent: '#6C3483', bg: '#F5EEF8', rgb: '108, 52, 131' },
        orchid: { accent: '#8E44AD', bg: '#F4ECF7', rgb: '142, 68, 173' },
        magenta: { accent: '#C0392B', bg: '#FDEDEC', rgb: '192, 57, 43' },
        rosewood: { accent: '#78281F', bg: '#FAF2F2', rgb: '120, 40, 31' },
        navy: { accent: '#1B4F72', bg: '#EAF2F8', rgb: '27, 79, 114' },
        peacock: { accent: '#21618C', bg: '#EBF5FB', rgb: '33, 97, 140' },
        indigo: { accent: '#2874A6', bg: '#EAF2F8', rgb: '40, 116, 166' },
        charcoal: { accent: '#455A64', bg: '#ECEFF1', rgb: '69, 90, 100' },
        sakura: { accent: '#E8A7B5', bg: '#FFF3F5', rgb: '232, 167, 181' },
        wine: { accent: '#780820', bg: '#FCF2F4', rgb: '120, 8, 32' },
        amber: { accent: '#D68910', bg: '#FEF9E7', rgb: '214, 137, 16' }
    };
};

window.renderThemeSelector = function() {
    const grid = document.getElementById('theme-selector-grid');
    if (!grid) return;
    
    const themeNames = {
        rose: 'Rosa Seda',
        blue: 'Azul Pizarra',
        green: 'Verde Bosque',
        gold: 'Tierra Café',
        lavender: 'Lavanda',
        orange: 'Naranja',
        cyan: 'Cyan Hielo',
        purple: 'Púrpura',
        maroon: 'Granate',
        slate: 'Oscuro',
        emerald: 'Esmeralda',
        mint: 'Menta Suave',
        teal: 'Teal Luxe',
        olive: 'Oliva Premium',
        mustard: 'Mostaza Real',
        terracotta: 'Terracota',
        coral: 'Coral Cálido',
        sand: 'Arena Desierto',
        coffee: 'Café Mocha',
        plum: 'Ciruela Luxe',
        orchid: 'Orquídea',
        magenta: 'Fucsia Luxe',
        rosewood: 'Madera Rosa',
        navy: 'Azul Marino',
        peacock: 'Azul Real',
        indigo: 'Indigo Místico',
        charcoal: 'Gris Carbón',
        sakura: 'Sakura Pastel',
        wine: 'Vino Tinto',
        amber: 'Ámbar Dorado'
    };

    const themes = window.getThemesMap();
    const currentTheme = localStorage.getItem('margarita_admin_theme') || 'rose';
    
    grid.innerHTML = '';
    
    Object.keys(themes).forEach(key => {
        const theme = themes[key];
        const displayName = themeNames[key] || key.toUpperCase();
        const isActive = currentTheme === key;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
            window.applyTheme(key);
            window.renderThemeSelector();
        };
        
        btn.style.cssText = `
            background: #fff;
            border: ${isActive ? '2.5px solid ' + theme.accent : '2.5px solid rgba(0,0,0,0.06)'};
            border-radius: 18px;
            padding: 15px 10px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-shadow: ${isActive ? '0 8px 25px rgba(' + theme.rgb + ', 0.18)' : '0 4px 15px rgba(0,0,0,0.02)'};
            position: relative;
            transform: ${isActive ? 'translateY(-2px)' : 'none'};
            outline: none;
        `;
        
        btn.onmouseover = () => {
            btn.style.borderColor = theme.accent;
            btn.style.transform = 'translateY(-4px)';
            btn.style.boxShadow = `0 10px 25px rgba(${theme.rgb}, 0.25)`;
        };
        btn.onmouseout = () => {
            if (!isActive) {
                btn.style.borderColor = 'rgba(0,0,0,0.06)';
                btn.style.transform = 'none';
                btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)';
            } else {
                btn.style.borderColor = theme.accent;
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = `0 8px 25px rgba(${theme.rgb}, 0.18)`;
            }
        };
        
        const colorCircle = document.createElement('div');
        colorCircle.style.cssText = `
            width: 35px;
            height: 35px;
            background: ${theme.accent};
            border-radius: 50%;
            border: 3px solid ${isActive ? '#fff' : '#f9f9f9'};
            box-shadow: 0 5px 15px rgba(${theme.rgb}, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 0.8rem;
            transition: all 0.3s;
        `;
        if (isActive) {
            colorCircle.innerHTML = '<i class="fas fa-check" style="font-size:0.75rem;"></i>';
        }
        
        const label = document.createElement('span');
        label.innerText = displayName;
        label.style.cssText = `
            font-size: 0.72rem;
            font-weight: 800;
            color: ${isActive ? theme.accent : '#555'};
            letter-spacing: 0.5px;
            text-transform: uppercase;
            transition: all 0.3s;
        `;
        
        btn.appendChild(colorCircle);
        btn.appendChild(label);
        grid.appendChild(btn);
    });
};

window.applyTheme = function(themeName, silent = false) {
    const root = document.documentElement;
    const themes = window.getThemesMap();
    const theme = themes[themeName] || themes.rose;
    
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--gold-primary', theme.accent);
    root.style.setProperty('--color-dark-pink', theme.accent);
    root.style.setProperty('--color-bg', theme.bg);
    root.style.setProperty('--accent-rgb', theme.rgb);
    
    if (themeName === 'slate') {
        root.classList.add('dark-theme');
        root.classList.remove('light-theme');
    } else {
        root.classList.add('light-theme');
        root.classList.remove('dark-theme');
    }
    
    localStorage.setItem('margarita_admin_theme', themeName);
    if (!silent) {
        showToast(`Tema aplicado: ${themeName.toUpperCase()}`, 'success');
        if (window.syncAdminMetaToCloud) {
            window.syncAdminMetaToCloud(true);
        }
    }
    
    if (typeof window.updateSidebarThemeToggleUI === 'function') {
        window.updateSidebarThemeToggleUI();
    }
    
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'dashboard-tab' && typeof window.renderDashboardStats === 'function') {
        const dateInput = document.getElementById('stats-date-filter');
        let range = 'today';
        let month = null;
        let dateVal = null;
        if (dateInput && dateInput.value) {
            dateVal = dateInput.value;
            range = null;
        } else {
            const activeRangeLi = document.querySelector('#range-dropdown li.active');
            const activeMonthLi = document.querySelector('#month-dropdown li.active');
            if (activeRangeLi) {
                range = activeRangeLi.getAttribute('data-value');
            } else if (activeMonthLi) {
                range = 'month';
                month = activeMonthLi.getAttribute('data-value');
            }
        }
        window.renderDashboardStats(range, month, dateVal);
    }
};

window.updateSidebarThemeToggleUI = function() {
    const toggleBtn = document.getElementById('sidebar-theme-toggle');
    if (!toggleBtn) return;
    const currentTheme = localStorage.getItem('margarita_admin_theme') || 'rose';
    if (currentTheme === 'slate') {
        toggleBtn.innerHTML = '<i class="fas fa-sun" style="color: #f1c40f;"></i>';
        toggleBtn.title = 'Modo Día';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        toggleBtn.title = 'Modo Noche';
    }
};

window.toggleNightMode = function(event) {
    if (event) event.preventDefault();
    const currentTheme = localStorage.getItem('margarita_admin_theme') || 'rose';
    if (currentTheme === 'slate') {
        const targetTheme = localStorage.getItem('margarita_admin_last_light_theme') || 'rose';
        window.applyTheme(targetTheme);
    } else {
        localStorage.setItem('margarita_admin_last_light_theme', currentTheme);
        window.applyTheme('slate');
    }
    if (window.renderThemeSelector) window.renderThemeSelector();
    window.updateSidebarThemeToggleUI();
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar tema guardado
    const savedTheme = localStorage.getItem('margarita_admin_theme') || 'rose';
    applyTheme(savedTheme, true); // true = no toast on load
    if (window.renderThemeSelector) window.renderThemeSelector();
    if (typeof window.updateSidebarThemeToggleUI === 'function') window.updateSidebarThemeToggleUI();

    initKeyboardShortcuts();
    
    // Cargar estado del salón
    const salonToggle = document.getElementById('salon-status-toggle');
    if (salonToggle) {
        const isOpen = localStorage.getItem('margarita_salon_open') !== 'false'; // Default true
        salonToggle.checked = isOpen;
    }

    // Cargar Configuraciones de identidad y redes
    applyDynamicBranding();
    loadCurrentSettings();
    // Inicializar configuraciones de promociones
    if(typeof loadPromoSettings === 'function') loadPromoSettings();
    if(typeof initDashboardDropdowns === 'function') initDashboardDropdowns();
});

// Promo UI functions moved to upper section (lines 1818-2000)
// Old duplicates removed for consistency.

// =============================================
// AGENDA VISUAL (MODAL DISPLAY LOGIC)
// =============================================
window.openVisualAgenda = function() {
    const modal = document.getElementById('visualAgendaModal');
    const dateInput = document.getElementById('visual-agenda-date');
    if (!modal) return;
    
    // Default to today if empty
    if (!dateInput.value) {
        dateInput.value = new Date().toLocaleDateString('sv-SE');
    }
    
    modal.style.display = 'flex';
    document.body.classList.add('no-global-scroll');
    renderVisualAgenda();
};

window.closeVisualAgenda = function() {
    const modal = document.getElementById('visualAgendaModal');
    if (modal) modal.style.display = 'none';
    
    // Solo quitar el bloqueo de scroll si NO estamos en una pestaña que lo requiera permanentemente
    const activeTabId = document.querySelector('.tab-content.active')?.id;
    if (activeTabId !== 'agenda-tab' && activeTabId !== 'specialists-tab') {
        document.body.classList.remove('no-global-scroll');
    }
};

// --- Control de Realizadas en Agenda Visual ---
let showCompletedInVisual = false;
window.toggleShowRealizadasInVisual = function() {
    showCompletedInVisual = !showCompletedInVisual;
    const btn = document.getElementById('btn-show-completed-visual');
    if (btn) {
        btn.classList.toggle('active', showCompletedInVisual);
        btn.style.color = showCompletedInVisual ? 'white' : '#999';
        btn.style.background = showCompletedInVisual ? 'var(--color-dark-pink)' : 'transparent';
        btn.style.borderColor = showCompletedInVisual ? 'var(--color-dark-pink)' : '#ddd';
    }
    renderVisualAgenda();
};

window.renderVisualAgenda = function() {
    const canvas = document.getElementById('visual-agenda-canvas');
    if (!canvas) return;

    const dateInput = document.getElementById('visual-agenda-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toLocaleDateString('sv-SE');
    if (!selectedDate) return;

    const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const activeSpecialists = specialists.filter(s => s.active !== false);
    const appointments = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    
    // Filtrar citas del día seleccionado
    const dayAppointments = appointments.filter(a => {
        const isDateMatch = window.normDate(a.date) === window.normDate(selectedDate);
        if (!isDateMatch) return false;
        if (a.status === 'cancelled') return false;
        
        if (showCompletedInVisual) {
            // Modo EXCLUSIVO: Solo terminadas
            return a.status === 'accepted';
        } else {
            // Modo NORMAL: Solo activas (sin las terminadas)
            return a.status !== 'accepted';
        }
    });

    const hours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
    
    // Filtrar horas pasadas solo si NO estamos viendo las REALIZADAS y es HOY
    const now = new Date();
    const isToday = selectedDate === now.toLocaleDateString('sv-SE');
    const currentHour = now.getHours();
    
    let filteredHours = hours;
    // Si NO estamos viendo realizadas y es hoy, recortamos
    if (isToday && !showCompletedInVisual) {
        filteredHours = hours.filter(h => parseInt(h.split(':')[0]) >= currentHour);
    }
    // Si estamos viendo realizadas, o si no es hoy, mostramos el rango completo (7am - 8pm)

    const colW = 210; // Slightly wider for even more clarity
    let html = `
    <div style="background: #fafafa; border-radius: 20px; border: 1px solid #eee; box-shadow: 0 10px 40px rgba(0,0,0,0.03); overflow: hidden;">
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="width: auto; min-width: 100%; border-collapse: collapse; table-layout: fixed;">
                <thead>
                    <tr style="position: sticky; top: 0; z-index: 200; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                        <th style="width: 85px; min-width: 85px; padding: 20px; text-align: center; border-bottom: 2px solid #eee; background: #fff; color: #888; font-size: 0.75rem;"><i class="fas fa-clock"></i></th>
                        ${activeSpecialists.map(s => `
                            <th style="width: ${colW}px; min-width: ${colW}px; padding: 15px; border-bottom: 2px solid #eee; background: #fff; border-left: 1px solid #f2f2f2;">
                                <div style="display: flex; align-items: center; gap: 10px; justify-content: center; width: 100%;">
                                    <div class="admin-img-placeholder" style="width:40px; height:40px; min-width:40px; border-radius:12px;">
                                    ${s.image ? `<img src="${s.image}" style="width:100%; height:100%; object-fit:cover;" onload="this.classList.add('loaded')">` : `<div style="width:100%; height:100%; background:#f9f9f9; display:flex; align-items:center; justify-content:center; color:#ddd; font-size:1.4rem;"><i class="fas fa-user-circle"></i></div>`}
                                </div>
                                <div style="text-align: left;">
                                    <div style="font-size: 0.9rem; font-weight: 800; color: #1a1a1a;">${s.name}</div>
                                </div>
                            </div>
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
                ${filteredHours.map(hour => {
                    const rowHourInt = parseInt(hour.split(':')[0]);
                    return `
                    <tr style="border-bottom: 1px solid #f2f2f2;">
                        <td style="padding: 18px 5px; text-align: center; color: #777; font-weight: 800; font-size: 0.75rem; background: #fff; border-right: 1px solid #f2f2f2; white-space: nowrap;">
                            ${window.formatTime12h(hour)}
                        </td>
                        ${activeSpecialists.map(s => {
                            // Normalizar para comparación robusta
                            const normalize = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
                            const sNorm = normalize(s.name);

                            // Citas que EMPIEZAN en esta hora para este especialista
                            const aptsInThisSlot = dayAppointments.filter(a => {
                                if (!a.specialist || !a.time) return false;
                                const matchName = normalize(a.specialist) === sNorm;
                                const aptHourInt = parseInt(a.time.split(':')[0]);
                                return matchName && aptHourInt === rowHourInt;
                            });
                            
                            return `
                                <td style="border-left: 1px solid #f2f2f2; position: relative; height: 80px; padding: 0; vertical-align: top; background: white;">
                                    ${aptsInThisSlot.map((a, idx) => {
                                        let bg = 'rgba(229, 169, 180, 0.2)'; // Predeterminado (Entrante)
                                        let border = 'var(--color-dark-pink)';
                                        let textColor = 'var(--color-dark-pink)';
                                        
                                        if (a.status === 'confirmed') { 
                                            bg = 'rgba(46, 204, 113, 0.2)'; border = '#2ecc71'; textColor = '#27ae60';
                                        } else if (a.status === 'postponed') { 
                                            bg = 'rgba(243, 156, 18, 0.2)'; border = '#f39c12'; textColor = '#e67e22';
                                        } else if (a.status === 'accepted') {
                                            bg = 'rgba(52, 152, 219, 0.2)'; border = '#3498db'; textColor = '#2980b9';
                                        }

                                        const timeParts = a.time.split(':');
                                        const h = parseInt(timeParts[0]);
                                        const m = parseInt(timeParts[1] || 0);
                                        const topPos = (m / 60) * 80;
                                        const dur = parseInt(a.duration || 60);
                                        const height = (dur / 60) * 80;
                                        
                                        // Calcular hora final
                                        let endH = h + Math.floor((m + dur) / 60);
                                        let endM = (m + dur) % 60;
                                        const endTimeStr = `${endH.toString().padStart(2,'0')}:${endM.toString().padStart(2,'0')}`;

                                        // Determinar si hay alguna OTRA cita del mismo especialista que se traslapa con esta en el tiempo
                                        const sApts = dayAppointments.filter(ap => ap.specialist === s.name);
                                        const getM = (tStr) => { const [h,m] = tStr.split(':').map(Number); return h*60 + (m||0); };
                                        const s1 = getM(a.time); 
                                        const e1 = s1 + dur;
                                        
                                        const isOverlapping = sApts.some(oa => {
                                            if (oa.id === a.id) return false;
                                            const s2 = getM(oa.time);
                                            const e2 = s2 + parseInt(oa.duration || 60);
                                            return (s1 < e2 && s2 < e1);
                                        });

                                        // Calcular cuántas citas del mismo especia lista se solapan REALMENTE con esta
                                        // (no solo las que empiezan en la misma hora)
                                        const trueOverlaps = dayAppointments.filter(oa => {
                                            if (!oa.specialist || normalize(oa.specialist) !== sNorm) return false;
                                            const s2 = getM(oa.time);
                                            const e2 = s2 + parseInt(oa.duration || 60);
                                            return (s1 < e2 && s2 < e1); // Intersección real
                                        });

                                        // Ordenar las solapadas por hora de inicio para asignar columna consistente
                                        trueOverlaps.sort((a, b) => getM(a.time) - getM(b.time));
                                        const overlapIdx = trueOverlaps.findIndex(oa => oa.id === a.id || (oa.name === a.name && oa.time === a.time && oa.service === a.service));
                                        
                                        const colWidth = isOverlapping ? (100 / trueOverlaps.length) : 100;
                                        const leftOffset = isOverlapping ? ((overlapIdx >= 0 ? overlapIdx : idx) * (100 / trueOverlaps.length)) : 0;
                                        const zIndex = 10 + idx;

                                        const tooltip = `CLIENTE: ${a.name}\nTEL: ${a.phone || 'S/N'}\nSERVICIO: ${a.service}\nHORARIO: ${window.formatTime12h(a.time)} - ${window.formatTime12h(endTimeStr)}\nDURACIÓN: ${dur} min`;
                                        
                                        const isShort = dur < 45;
                                        const padding = isShort ? '6px 8px' : '10px 12px';
                                        const gap = isShort ? '0px' : '2px';
                                        const serviceFs = isShort ? '0.75rem' : '0.85rem';

                                        return `
                                            <div title="${tooltip}" style="position: absolute; top: ${topPos}px; left: calc(${leftOffset}% + 4px); width: calc(${colWidth}% - 8px); height: ${height-4}px; background:${bg}; border-left: 5px solid ${border}; border-radius: 12px; padding: ${padding}; z-index: ${zIndex}; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: 0.2s; display:flex; flex-direction:column; justify-content:${isShort ? 'center' : 'flex-start'}; gap:${gap}; cursor: help;" class="hover-scale">
                                                <div style="font-weight: 950; color: #000; line-height: 1.1; font-size: ${serviceFs}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; text-align: ${isShort ? 'center' : 'left'};">${a.service}</div>
                                                
                                                ${!isShort ? `<div style="color: #444; font-size: 0.68rem; font-weight: 700; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.name}</div>` : ''}
                                                
                                                ${!isShort ? `
                                                <div style="position: absolute; bottom: 3px; right: 4px; font-size: 0.6rem; color: #000; font-weight: 800; background: rgba(255,255,255,0.95); padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.03); display:flex; align-items:center; gap:3px;">
                                                    <i class="far fa-clock" style="font-size:0.55rem; opacity:0.6;"></i> ${window.formatTime12h(a.time)} - ${window.formatTime12h(endTimeStr)}
                                                </div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </td>
                            `;
                        }).join('')}
                    </tr>
                    `;
                }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    canvas.innerHTML = html;
};

// Cerrar menús al hacer clic fuera
document.addEventListener('click', () => {
    document.querySelectorAll('.spec-actions-menu').forEach(m => m.classList.remove('active'));
});

window.toggleNewServiceForm = function() {
    const modal = document.getElementById('newServiceModal');
    if (modal) {
        const isShowing = modal.style.display === 'flex';
        modal.style.display = isShowing ? 'none' : 'flex';
        
        // Reset title if closing
        if (isShowing) {
            document.getElementById('service-modal-title').innerHTML = `<i class="fas fa-magic"></i> Nuevo Servicio`;
            uploadServiceBtn.innerText = "Publicar Servicio";
            editingIndex = null;
        }
    }
};

window.toggleNewCategoryForm = function() {
    const modal = document.getElementById('newCategoryModal');
    if (modal) {
        const isShowing = modal.style.display === 'flex';
        modal.style.display = isShowing ? 'none' : 'flex';
        
        // Reset if closing
        if (isShowing) {
            setTimeout(() => {
                document.getElementById('cat-modal-title').innerHTML = `<i class="fas fa-folder-plus"></i> Nueva Categoría (Espacio)`;
                addCatBtn.innerText = "Registrar Nueva Categoría";
                editingCatId = null;
                document.getElementById('new-cat-name').value = '';
                document.getElementById('new-cat-subtitle').value = '';
            }, 300); // Wait for animation
        }
    }
};

// ----------------------------------------------------
// PHOTO PREVIEWS
// ----------------------------------------------------
window.previewNewSpecialistPhoto = function(input) {
    const preview = document.getElementById('new-specialist-photo-preview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.innerHTML = `<i class="fas fa-user-tie" style="color:#aaa;"></i>`;
    }
};

window.previewEditSpecialistPhoto = function(input) {
    const preview = document.getElementById('edit-specialist-current-photo');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
};

// ----------------------------------------------------
// SOPORTE DE TECLADO (ENTER Y ESCAPE)
// ----------------------------------------------------
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // 1. Close dynamic confirmation overlays (show class)
        const overlays = document.querySelectorAll('.custom-modal-overlay.show');
        if (overlays.length > 0) {
            overlays.forEach(overlay => {
                if (overlay.classList.contains('show')) {
                    // Try to find the close button and click it to trigger logic (setTimeout, etc)
                    const closeBtn = overlay.querySelector('.btn-cancel, button[onclick*="close"]');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        overlay.classList.remove('show');
                        setTimeout(() => overlay.remove(), 300);
                    }
                }
            });
            return;
        }

        // 2. Map and close static modals
        const modalConfigs = [
            { id: 'editSpecialistModal', closeFn: window.closeEditSpecialistModal },
            { id: 'rescheduleModal', closeFn: window.closeRescheduleModal },
            { id: 'deleteHistoryModal', closeFn: window.closeDeleteHistoryModal },
            { id: 'specialistServicesModal', closeFn: window.closeSpecialistServicesModal },
            { id: 'specialistInfoModal', closeFn: window.closeSpecialistInfoModal },
            { id: 'newCategoryModal', closeFn: window.toggleNewCategoryForm },
            { id: 'newServiceModal', closeFn: window.toggleNewServiceForm },
            { id: 'visualAgendaModal', closeFn: window.closeVisualAgenda },
            { id: 'catGalleryModal', closeFn: window.closeCategoryGalleryManager },
            { id: 'customAlertModal', closeFn: () => { const m = document.getElementById('customAlertModal'); if(m) m.style.display='none'; } },
            { id: 'image-zoom-modal', closeFn: () => { const m = document.getElementById('image-zoom-modal'); if(m) m.style.display='none'; } }
        ];

        modalConfigs.forEach(config => {
            const modal = document.getElementById(config.id);
            if (modal && (modal.style.display === 'flex' || modal.style.display === 'block')) {
                if (typeof config.closeFn === 'function') {
                    config.closeFn();
                } else {
                    modal.style.display = 'none';
                }
            }
        });
    }
});

// Función para activar ENTER en los formularios principales
window.initKeyboardShortcuts = function() {
    const mappings = [
        { container: 'new-specialist-form-container', action: () => window.addSpecialist() },
        { container: 'editSpecialistModal', action: () => window.saveSpecialistEdit() },
        { container: 'manual-booking-container', action: () => window.addManualBooking() },
        { container: 'rescheduleModal', action: () => window.confirmReschedule() }
    ];

    mappings.forEach(m => {
        const root = document.getElementById(m.container);
        if (root) {
            root.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        m.action();
                    }
                });
            });
        }
    });
};

// Ejecutar al cargar
setTimeout(window.initKeyboardShortcuts, 1000);

// --- Real-time Link with Public Site ---
window.addEventListener('storage', function(e) {
    if (e.key === 'margarita_appointments') {
        if (window.renderAgenda) window.renderAgenda();
        if (window.renderHistory) window.renderHistory();
        if (window.renderVisualAgenda) window.renderVisualAgenda();
        if (window.showToast) {
            window.showToast('¡Nueva actualización de citas recibida!', 'success');
        }
    } else if (e.key === 'margarita_services' || e.key === 'margarita_categories') {
        if (window.renderPublicServicesCounter) window.renderPublicServicesCounter();
    }
});

window.setPaymentStatus = function(index, status) {
    // CERRAR el dropdown inmediatamente al seleccionar cualquier opción
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('active'));

    let agenda = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const targetApt = agenda[index];
    if (!targetApt) return;
    // BUG FIX: Verificar que hay MÁS de una cita con este groupId antes de tratar como grupo.
    // Antes solo chequeaba truthy de groupId, lo que hacía que citas individuales con groupId
    // también se trataran como combo al marcar el pago.
    const isCombo = targetApt.groupId && agenda.filter(a => a.groupId === targetApt.groupId).length > 1;

    // UI OPTIMISTA: Cambios visuales instantáneos en toda la tarjeta del grupo
    const gId = targetApt.groupId || `nogroup-${targetApt.id ? targetApt.id : (targetApt.originalIndex !== undefined ? targetApt.originalIndex : index)}`;
    const card = document.querySelector(`[data-group-id="${gId}"]`);
    
    if (card) {
        card.setAttribute('data-paid', status || 'none');
        
        // 1. Actualizar colores de la tarjeta principal
        if (status === 'full') {
            card.style.borderLeftColor = '#2ecc71';
            card.style.background = 'rgba(46, 204, 113, 0.08)';
        } else if (status === 'partial') {
            card.style.borderLeftColor = '#f39c12';
            card.style.background = 'rgba(243, 156, 18, 0.05)';
        } else {
            card.style.borderLeftColor = targetApt.manual ? 'var(--gold-primary)' : 'var(--color-dark-pink)';
            card.style.background = 'white';
        }

        // 2. Actualizar TODOS los botones de pago del grupo (si es combo)
        // Buscamos todos los botones que abren el selector de pago
        const allPayBtns = card.querySelectorAll('button[onclick*="pay-"]');
        allPayBtns.forEach(btn => {
            if (status === 'full') {
                btn.style.background = '#2ecc71';
                btn.style.color = 'white';
                btn.innerHTML = '<i class="fas fa-check-double"></i> PAGADA <i class="fas fa-chevron-down" style="font-size:0.6rem; opacity:0.7;"></i>';
            } else if (status === 'partial') {
                btn.style.background = '#f39c12';
                btn.style.color = 'white';
                btn.innerHTML = '<i class="fas fa-wallet"></i> ABONO 50% <i class="fas fa-chevron-down" style="font-size:0.6rem; opacity:0.7;"></i>';
            } else {
                btn.style.background = '#eee';
                btn.style.color = '#666';
                btn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> MARCAR PAGO <i class="fas fa-chevron-down" style="font-size:0.6rem; opacity:0.7;"></i>';
            }
        });

        // 3. Control dinámico del botón "FINALIZAR SERVICIO" en cada sub-item
        const allActionsAreas = card.querySelectorAll('.apt-actions');
        allActionsAreas.forEach(area => {
            let finishBtn = area.querySelector('button[onclick*="accepted"]');
            
            if (status === 'full') {
                if (!finishBtn) {
                    // Obtener el índice original de este sub-item específico desde otro botón del área
                    const otherBtn = area.querySelector('button[onclick*="updateAptStatus"]');
                    if (otherBtn) {
                        const match = otherBtn.getAttribute('onclick').match(/updateAptStatus\((\d+),/);
                        const subIdx = match ? match[1] : index;
                        
                        const newBtn = document.createElement('button');
                        newBtn.setAttribute('onclick', `updateAptStatus(${subIdx}, 'accepted')`);
                        newBtn.style.cssText = "background:#2ecc71; color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-size:0.85rem; font-weight:bold; display:flex; align-items:center; gap:8px; transition:0.3s; box-shadow: 0 4px 10px rgba(46, 204, 113, 0.3); animation: slideInLeft 0.3s ease;";
                        newBtn.className = "hover-scale";
                        newBtn.innerHTML = '<i class="fas fa-check-double"></i> FINALIZAR SERVICIO';
                        area.prepend(newBtn);
                    }
                }
            } else {
                if (finishBtn) {
                    finishBtn.style.opacity = '0';
                    finishBtn.style.transform = 'scale(0.8)';
                    setTimeout(() => finishBtn.remove(), 250);
                }
            }
        });
    }

    window._isUpdatingLocal = true; // ACTIVAR BLOQUEO

    if (isCombo) {
        // En los COMBOS, el pago se aplica a TODO el paquete en memoria
        agenda.forEach(a => {
            if (a.groupId === targetApt.groupId) {
                a.paid = status;
            }
        });
    } else {
        // Individual
        agenda[index].paid = status;
    }

    localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
    
    // Sincronización en la nube (Segundo plano)
    if (window.saveListToCloud) {
        window.saveListToCloud('citas_v2', agenda);
    }
    
    // LIBERAR BLOQUEO después de un momento
    setTimeout(() => {
        window._isUpdatingLocal = false;
    }, 1000);
    
    if (window.showToast) window.showToast(isCombo ? 'Pago del paquete actualizado' : 'Pago actualizado', 'success');
};

// =============================================
// LIBRETITA DE GASTOS (LOGIC)
// =============================================
window.formatCurrencyInput = function(input) {
    let value = input.value.replace(/\D/g, "");
    if (value === "") { input.value = ""; return; }
    value = parseInt(value);
    input.value = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
};

window.toggleNewExpenseModal = function() {
    const modal = document.getElementById('newExpenseModal');
    if (modal) {
        const isShowing = modal.style.display === 'flex';
        modal.style.display = isShowing ? 'none' : 'flex';
        if (!isShowing) {
            document.getElementById('expense-desc').value = '';
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-date').value = new Date().toLocaleDateString('sv-SE');
            document.getElementById('expense-category').value = 'Productos';
        }
    }
};

window.saveNewExpense = async function() {
    const desc = document.getElementById('expense-desc').value.trim();
    const amountStr = document.getElementById('expense-amount').value.trim();
    const date = document.getElementById('expense-date').value;
    const cat = document.getElementById('expense-category').value;

    const amount = parseInt(amountStr.replace(/\D/g, '')) || 0;

    if (!desc || amount <= 0 || !date) {
        showToast('Completa todos los campos con valores válidos.', 'error');
        return;
    }

    let expenses = JSON.parse(localStorage.getItem('margarita_expenses')) || [];
    expenses.unshift({
        id: Date.now(),
        desc,
        amount,
        date,
        cat
    });

    localStorage.setItem('margarita_expenses', JSON.stringify(expenses));

    if (window.saveListToCloud) {
        await window.saveListToCloud('gastos_v2', expenses);
    }

    showToast('¡Gasto registrado con éxito!');
    window.toggleNewExpenseModal();
    renderExpenses();
};

window.renderExpenses = function() {
    const container = document.getElementById('expenses-list-container');
    if (!container) return;

    const expenses = JSON.parse(localStorage.getItem('margarita_expenses')) || [];
    const searchQuery = document.getElementById('expense-search-input').value.toLowerCase();
    const monthFilter = document.getElementById('expense-month-filter').value;

    const filtered = expenses.filter(e => {
        const matchSearch = e.desc.toLowerCase().includes(searchQuery) || e.cat.toLowerCase().includes(searchQuery);
        const expDate = new Date(e.date + 'T00:00:00');
        const matchMonth = monthFilter === 'all' || expDate.getMonth().toString() === monthFilter;
        return matchSearch && matchMonth;
    });

    const now = new Date();
    const curM = now.getMonth();
    const curY = now.getFullYear();
    let totalM = 0;
    const catTotals = {};

    expenses.forEach(e => {
        const d = new Date(e.date + 'T00:00:00');
        if (d.getMonth() === curM && d.getFullYear() === curY) {
            totalM += e.amount;
        }
        catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount;
    });

    const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    document.getElementById('expense-total-month').innerText = fmt(totalM);

    let topC = '--';
    let maxV = 0;
    for (const c in catTotals) {
        if (catTotals[c] > maxV) {
            maxV = catTotals[c];
            topC = c;
        }
    }
    document.getElementById('expense-top-category').innerText = topC;
    document.getElementById('expense-last-date').innerText = expenses.length > 0 ? expenses[0].date : '--';

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#999; border:2px dashed #eee; border-radius:20px;"><i class="fas fa-receipt" style="font-size:3rem; margin-bottom:15px; opacity:0.3;"></i><br>No se encontraron registros.</div>`;
        return;
    }

    container.innerHTML = filtered.map(e => `
        <div class="glass-module" style="padding:15px 20px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:15px; border-left:4px solid #e74c3c;">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="background:rgba(231, 76, 60, 0.1); width:45px; height:45px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#e74c3c; font-size:1.2rem;"><i class="fas ${getExpenseIcon(e.cat)}"></i></div>
                <div>
                    <h4 style="margin:0; font-size:1rem; color:#1a1a1a;">${e.desc}</h4>
                    <small style="color:#888;">${e.cat} • <i class="far fa-calendar-alt"></i> ${e.date}</small>
                </div>
            </div>
            <div style="text-align:right; display:flex; align-items:center; gap:20px;">
                <div style="font-size:1.15rem; font-weight:800; color:#e74c3c;">${fmt(e.amount)}</div>
                <button onclick="deleteExpense(${e.id})" style="background:#fff0f0; border:1px solid #ffcccc; color:#e74c3c; width:36px; height:36px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
};

function getExpenseIcon(cat) {
    const icons = {
        'Productos': 'fa-box-open', 'Renta': 'fa-home', 'Servicios': 'fa-lightbulb', 'Salarios': 'fa-user-tie', 'Publicidad': 'fa-bullhorn', 'Mantenimiento': 'fa-tools', 'Imprevistos': 'fa-exclamation-circle'
    };
    return icons[cat] || 'fa-receipt';
}

window.deleteExpense = function(id) {
    showConfirm('¿Estás segura de eliminar este registro?', () => {
        let expenses = JSON.parse(localStorage.getItem('margarita_expenses')) || [];
        expenses = expenses.filter(e => e.id !== id);
        localStorage.setItem('margarita_expenses', JSON.stringify(expenses));
        if (window.saveListToCloud) window.saveListToCloud('gastos_v2', expenses);
        showToast('Gasto eliminado.');
        renderExpenses();
    });
};

window.exportExpensesToExcel = function() {
    const expenses = JSON.parse(localStorage.getItem('margarita_expenses')) || [];
    if (expenses.length === 0) return showToast('No hay datos para exportar.', 'error');

    const businessName = localStorage.getItem('margarita_site_name') || 'StyleSync Pro';
    const reportDate = new Date().toLocaleDateString();
    
    let total = 0;
    let rowsHtml = "";
    expenses.forEach((e, index) => {
        total += e.amount;
        const rowBg = index % 2 === 0 ? '#ffffff' : '#fcfaff';
        rowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="border:1px solid #eeeeee; padding:12px; color:#444;">${e.date}</td>
                <td style="border:1px solid #eeeeee; padding:12px; color:#444;">${e.cat}</td>
                <td style="border:1px solid #eeeeee; padding:12px; color:#444;">${e.desc}</td>
                <td style="border:1px solid #eeeeee; padding:12px; text-align:right; font-weight:bold; color:#1a1a1a;">$ ${e.amount.toLocaleString()}</td>
            </tr>`;
    });

    const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reporte de Gastos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px;">
            <table style="width:100%; margin-bottom: 20px;">
                <tr>
                    <td colspan="2" style="text-align: left; font-size: 24px; font-weight: bold; color: #d81b60; padding-top: 20px;">REPORTE DE GASTOS</td>
                    <td colspan="2" style="text-align: center; font-size: 24px; font-weight: bold; color: #000000; padding-top: 20px;">${businessName}</td>
                </tr>
                <tr>
                    <td colspan="4" style="text-align: left; color: #666; font-size: 14px; padding-bottom: 20px;">Generado el: ${reportDate}</td>
                </tr>
            </table>

            <table style="border-collapse: collapse; width: 100%; border: 1px solid #dddddd;">
                <thead>
                    <tr style="background-color: #d81b60; color: #ffffff;">
                        <th style="padding:15px; text-align:left; border:1px solid #d81b60;">FECHA</th>
                        <th style="padding:15px; text-align:left; border:1px solid #d81b60;">CATEGORÍA</th>
                        <th style="padding:15px; text-align:left; border:1px solid #d81b60;">DESCRIPCIÓN</th>
                        <th style="padding:15px; text-align:right; border:1px solid #d81b60;">MONTO (COP)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #fff0f3;">
                        <td colspan="3" style="border:1px solid #eeeeee; padding:18px; text-align:right; font-weight:bold; color: #d81b60; font-size:16px;">TOTAL ACUMULADO:</td>
                        <td style="border:1px solid #eeeeee; padding:18px; text-align:right; color: #d81b60; font-weight: 800; font-size:18px; background: #fff0f3;">$ ${total.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
            <p style="text-align:center; color:#ccc; font-size:10px; margin-top:20px;">Reporte autogenerado por Sistema Administrativo StyleSync Pro.</p>
        </body>
        </html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Gastos_${businessName.replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};



// GESTION DE SEGURIDAD PARA LIBRETA DE GASTOS
window._expensesUnlocked = false;

window.checkExpensesLockState = function() {
    const customExpensePass = localStorage.getItem('margarita_expense_pass');
    const lockScreen = document.getElementById('expenses-lock-screen');
    const content = document.getElementById('expenses-restricted-content');

    // Si la clave no está configurada (null, undefined o vacío), entra directo
    const hasNoPassword = (customExpensePass === null || customExpensePass.trim() === '');

    if (hasNoPassword || window._expensesUnlocked) {
        if (lockScreen) lockScreen.style.display = 'none';
        if (content) content.style.display = 'block';
        if (typeof window.renderExpenses === 'function') {
            window.renderExpenses();
        }
    } else {
        if (lockScreen) lockScreen.style.display = 'flex';
        if (content) content.style.display = 'none';
    }
};

window.unlockExpenses = function() {
    const passInput = document.getElementById('expense-unlock-pass');
    if (!passInput) return;
    const enteredPass = passInput.value;
    const customExpensePass = localStorage.getItem('margarita_expense_pass');
    
    // Si no hay contraseña configurada
    const hasNoPassword = (customExpensePass === null || customExpensePass.trim() === '');
    if (hasNoPassword) {
        window._expensesUnlocked = true;
        window.checkExpensesLockState();
        return;
    }

    if (enteredPass === customExpensePass) {
        window._expensesUnlocked = true;
        window.checkExpensesLockState();
        showToast("Acceso financiero concedido.", "success");
    } else {
        showToast("Clave de acceso incorrecta.", "error");
        passInput.value = "";
        passInput.focus();
    }
};

// Tecla Enter para desbloquear
document.addEventListener('DOMContentLoaded', () => {
    const expensePassInput = document.getElementById('expense-unlock-pass');
    if (expensePassInput) {
        expensePassInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.unlockExpenses();
        });
    }
});

// ----------------------------------------------------
// GESTIÓN DE CICLOS DE MANTENIMIENTO (UÑAS)
// ----------------------------------------------------
function getMaintCycleForService(serviceName) {
    const customCycles = JSON.parse(localStorage.getItem('margarita_maint_cycles') || '{}');
    return customCycles[serviceName] || 21; // 21 días por defecto
}

window.switchMaintTab = function(tab) {
    const sectionMaint = document.getElementById('maint-section-recordatorios');
    const btnMaint = document.getElementById('tab-btn-maint');

    if (tab === 'mantenimiento') {
        if(sectionMaint) sectionMaint.style.display = 'block';
        if(btnMaint) {
            btnMaint.style.color = 'var(--color-dark-pink)';
            btnMaint.style.borderBottom = '3px solid var(--color-dark-pink)';
        }
    }
};

window.openMaintConfigModal = function() {
    console.log("Abriendo configurador de ciclos de mantenimiento...");
    const modal = document.getElementById('maintConfigModal');
    const listMaint = document.getElementById('maint-config-list');
    if (!modal || !listMaint) return;

    modal.classList.add('show');
    switchMaintTab('mantenimiento'); 

    const allServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
    const categories = JSON.parse(localStorage.getItem('margarita_categories') || '[]');
    const customCycles = JSON.parse(localStorage.getItem('margarita_maint_cycles') || '{}');

    // 1. Población de Mantenimiento (Solo Uñas)
    const nailCat = categories.find(c => c.name.toLowerCase().includes('uñ') || c.name.toLowerCase().includes('un'));
    const nailServices = nailCat ? allServices.filter(s => s.cat === nailCat.id) : [];

    if (nailServices.length === 0) {
        listMaint.innerHTML = '<p style="color:#999; font-style:italic; text-align:center; padding:20px;">No hay servicios de uñas para configurar.</p>';
    } else {
        listMaint.innerHTML = nailServices.map(s => {
            const currentVal = customCycles[s.title] || 21;
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f9f9f9; border-radius:10px; margin-bottom:8px; border:1px solid #eee;">
                    <div style="font-weight:700; color:#333; font-size:0.9rem;">${s.title}</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" class="maint-input" data-service="${s.title}" value="${currentVal}" style="width:60px; padding:6px; border-radius:6px; border:1px solid #ddd; text-align:center; font-weight:bold;">
                        <span style="font-size:0.75rem; color:#888; font-weight:600;">días</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

window.saveAdvancedTimeConfig = function() {
    // Guardar Ciclos de Mantenimiento únicamente
    const maintInputs = document.querySelectorAll('.maint-input');
    const newCycles = {};
    maintInputs.forEach(inp => {
        const svc = inp.getAttribute('data-service');
        const val = parseInt(inp.value) || 21;
        newCycles[svc] = val;
    });
    localStorage.setItem('margarita_maint_cycles', JSON.stringify(newCycles));
    
    document.getElementById('maintConfigModal').classList.remove('show');
    showToast('<i class="fas fa-check-circle"></i> Ciclos de mantenimiento actualizados.');
};

// ============================================================
// BURBUJA PRO — Configurador de Animaciones (StyleSync / Agenda)
// ============================================================

const AGENDA_PROMO_BOXES = [
    { id: 'promo-box-1',  name: 'Roja Clásica',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ef9a9a" stroke="#b71c1c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#c62828"/><rect x="8" y="22" width="44" height="4" fill="#c62828"/><path d="M30 18 Q20 10 14 14 Q8 18 12 22 Q18 22 30 18Z" fill="#ff5252"/><path d="M30 18 Q40 10 46 14 Q52 18 48 22 Q42 22 30 18Z" fill="#ff5252"/><circle cx="30" cy="18" r="3" fill="#ffcdd2"/></svg>` },
    { id: 'promo-box-2',  name: 'Dorada Lujo',     svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#f9a825" stroke="#f57f17" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fff9c4" stroke="#f57f17" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#f57f17"/><rect x="8" y="22" width="44" height="4" fill="#f57f17"/><path d="M30 18 Q20 8 13 13 Q7 18 11 23 Q18 22 30 18Z" fill="#ffd54f"/><path d="M30 18 Q40 8 47 13 Q53 18 49 23 Q42 22 30 18Z" fill="#ffd54f"/><circle cx="30" cy="18" r="3.5" fill="#fff176"/></svg>` },
    { id: 'promo-box-3',  name: 'Turquesa Gala',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#00897b" stroke="#004d40" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#b2dfdb" stroke="#004d40" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#00695c"/><rect x="8" y="22" width="44" height="4" fill="#00695c"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#4db6ac"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#4db6ac"/><circle cx="30" cy="18" r="3" fill="#e0f2f1"/></svg>` },
    { id: 'promo-box-4',  name: 'Índigo Real',     svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#3949ab" stroke="#1a237e" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#c5cae9" stroke="#1a237e" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#283593"/><rect x="8" y="22" width="44" height="4" fill="#283593"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#7986cb"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#7986cb"/><circle cx="30" cy="18" r="3" fill="#e8eaf6"/></svg>` },
    { id: 'promo-box-5',  name: 'Rosa Perlado',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#d81b60" stroke="#880e4f" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fce4ec" stroke="#880e4f" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#ad1457"/><rect x="8" y="22" width="44" height="4" fill="#ad1457"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#f48fb1"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#f48fb1"/><circle cx="30" cy="18" r="3" fill="#fce4ec"/></svg>` },
    { id: 'promo-box-6',  name: 'Esmeralda',       svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#c8e6c9" stroke="#1b5e20" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#1b5e20"/><rect x="8" y="22" width="44" height="4" fill="#1b5e20"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#66bb6a"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#66bb6a"/><circle cx="30" cy="18" r="3" fill="#e8f5e9"/></svg>` },
    { id: 'promo-box-7',  name: 'Naranja Flame',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#e65100" stroke="#bf360c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ffe0b2" stroke="#bf360c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#bf360c"/><rect x="8" y="22" width="44" height="4" fill="#bf360c"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#ff8a65"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#ff8a65"/><circle cx="30" cy="18" r="3" fill="#fff3e0"/></svg>` },
    { id: 'promo-box-8',  name: 'Violeta Magic',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#6a1b9a" stroke="#4a148c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#e1bee7" stroke="#4a148c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#4a148c"/><rect x="8" y="22" width="44" height="4" fill="#4a148c"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#ce93d8"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#ce93d8"/><circle cx="30" cy="18" r="3" fill="#f3e5f5"/></svg>` },
    { id: 'promo-box-9',  name: 'Cian Neon',       svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#006064" stroke="#004d40" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#b2ebf2" stroke="#004d40" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#00838f"/><rect x="8" y="22" width="44" height="4" fill="#00838f"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#4dd0e1"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#4dd0e1"/><circle cx="30" cy="18" r="3" fill="#e0f7fa"/></svg>` },
    { id: 'promo-box-10', name: 'Gris Titanio',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#cfd8dc" stroke="#263238" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#263238"/><rect x="8" y="22" width="44" height="4" fill="#263238"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#90a4ae"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#90a4ae"/><circle cx="30" cy="18" r="3" fill="#eceff1"/></svg>` },
    { id: 'promo-box-11', name: 'Coral Sunset',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#ff5722" stroke="#bf360c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fbe9e7" stroke="#bf360c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#dd2c00"/><rect x="8" y="22" width="44" height="4" fill="#dd2c00"/><path d="M30 18 Q22 6 14 11 Q8 18 13 23 Q20 21 30 18Z" fill="#ffab91"/><path d="M30 18 Q38 6 46 11 Q52 18 47 23 Q40 21 30 18Z" fill="#ffab91"/><circle cx="30" cy="17" r="4" fill="#fbe9e7"/></svg>` },
    { id: 'promo-box-12', name: 'Azul Zafiro',     svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#1565c0" stroke="#0d47a1" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#bbdefb" stroke="#0d47a1" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#0d47a1"/><rect x="8" y="22" width="44" height="4" fill="#0d47a1"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#64b5f6"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#64b5f6"/><circle cx="30" cy="18" r="3" fill="#e3f2fd"/></svg>` },
    { id: 'promo-box-13', name: 'Lima Fresco',     svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#558b2f" stroke="#33691e" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#f1f8e9" stroke="#33691e" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#33691e"/><rect x="8" y="22" width="44" height="4" fill="#33691e"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#aed581"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#aed581"/><circle cx="30" cy="18" r="3" fill="#f1f8e9"/></svg>` },
    { id: 'promo-box-14', name: 'Blanco Cristal',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fff" stroke="#9e9e9e" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#bdbdbd"/><rect x="8" y="22" width="44" height="4" fill="#bdbdbd"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#e0e0e0"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#e0e0e0"/><circle cx="30" cy="18" r="3" fill="#fff"/></svg>` },
    { id: 'promo-box-15', name: 'Fucsia Noche',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#ad1457" stroke="#880e4f" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fce4ec" stroke="#880e4f" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#880e4f"/><rect x="8" y="22" width="44" height="4" fill="#880e4f"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#f06292"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#f06292"/><circle cx="30" cy="18" r="3" fill="#fce4ec"/></svg>` },
    { id: 'promo-box-16', name: 'Café Premium',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#4e342e" stroke="#3e2723" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#d7ccc8" stroke="#3e2723" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#3e2723"/><rect x="8" y="22" width="44" height="4" fill="#3e2723"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#a1887f"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#a1887f"/><circle cx="30" cy="18" r="3" fill="#efebe9"/></svg>` },
    { id: 'promo-box-17', name: 'Aqua Marina',     svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#0277bd" stroke="#01579b" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#b3e5fc" stroke="#01579b" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#01579b"/><rect x="8" y="22" width="44" height="4" fill="#01579b"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#4fc3f7"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#4fc3f7"/><circle cx="30" cy="18" r="3" fill="#e1f5fe"/></svg>` },
    { id: 'promo-box-18', name: 'Ámbar Vintage',   svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#ff8f00" stroke="#e65100" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fff8e1" stroke="#e65100" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#e65100"/><rect x="8" y="22" width="44" height="4" fill="#e65100"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#ffca28"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#ffca28"/><circle cx="30" cy="18" r="3" fill="#fff8e1"/></svg>` },
    { id: 'promo-box-19', name: 'Champán Dorado',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#c8a951" stroke="#9a7b2f" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#fdf5dc" stroke="#9a7b2f" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#9a7b2f"/><rect x="8" y="22" width="44" height="4" fill="#9a7b2f"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#e8c96a"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#e8c96a"/><circle cx="30" cy="18" r="3" fill="#fff9e6"/></svg>` },
    { id: 'promo-box-20', name: 'Bronce Antiguo',  svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#8d6e63" stroke="#5d4037" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#d7ccc8" stroke="#5d4037" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#5d4037"/><rect x="8" y="22" width="44" height="4" fill="#5d4037"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#bcaaa4"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#bcaaa4"/><circle cx="30" cy="18" r="3" fill="#efebe9"/></svg>` },
    { id: 'promo-box-21', name: 'Lavanda Real',    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#7c4dff" stroke="#4a148c" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#ede7f6" stroke="#4a148c" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#4527a0"/><rect x="8" y="22" width="44" height="4" fill="#4527a0"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#b39ddb"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#b39ddb"/><circle cx="30" cy="18" r="3" fill="#ede7f6"/></svg>` },
    { id: 'promo-box-22', name: 'Obsidiana',       svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#212121" stroke="#000" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#616161" stroke="#000" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#757575"/><rect x="8" y="22" width="44" height="4" fill="#757575"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#9e9e9e"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#9e9e9e"/><circle cx="30" cy="18" r="3" fill="#e0e0e0"/></svg>` },
    { id: 'promo-box-23', name: 'Platino',         svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#90a4ae" stroke="#546e7a" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#cfd8dc" stroke="#546e7a" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#546e7a"/><rect x="8" y="22" width="44" height="4" fill="#546e7a"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#b0bec5"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#b0bec5"/><circle cx="30" cy="18" r="3" fill="#fff"/></svg>` },
    { id: 'promo-box-24', name: 'Verde Noche',     svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="26" width="44" height="26" rx="3" fill="#1b5e20" stroke="#0a3d0a" stroke-width="1.5"/><rect x="8" y="18" width="44" height="10" rx="2" fill="#c8e6c9" stroke="#0a3d0a" stroke-width="1.2"/><rect x="27" y="18" width="6" height="34" fill="#0a3d0a"/><rect x="8" y="22" width="44" height="4" fill="#0a3d0a"/><path d="M30 18 Q20 8 13 13 Q8 18 12 22 Q18 22 30 18Z" fill="#388e3c"/><path d="M30 18 Q40 8 47 13 Q52 18 48 22 Q42 22 30 18Z" fill="#388e3c"/><circle cx="30" cy="18" r="3" fill="#e8f5e9"/></svg>` }
];

const AGENDA_PROMO_ANIMS = [
    { id: 'anim-3d-spinner',    name: '3D Spinner' },
    { id: 'anim-atomic-heart',  name: 'Latido Atómico' },
    { id: 'anim-magnetic',      name: 'Magnetismo' },
    { id: 'anim-elastic',       name: 'Gelatina' },
    { id: 'anim-orbital',       name: 'Órbita Solar' },
    { id: 'anim-glitch',        name: 'Glitch Pro' },
    { id: 'anim-solar',         name: 'Solar Flare' },
    { id: 'anim-cosmic',        name: 'Deriva Cósmica' },
    { id: 'anim-radar',         name: 'Pulso Radar' },
    { id: 'anim-flip-glide',    name: 'Flip & Glide' },
    { id: 'anim-vortex',        name: 'Vórtice Cuántico' },
    { id: 'anim-cosmic-bounce', name: 'Rebote Cósmico' }
];

// Almacenamiento temporal para la sesión actual de config
let _agendaPromoCfg = {
    icon: null,
    iconSvg: null,
    anim: null
};

function renderAgendaPromoConfig() {
    const iconGrid = document.getElementById('agenda-promo-icon-selector');
    const animGrid = document.getElementById('agenda-promo-anim-selector');
    const preview  = document.getElementById('promo-bubble-preview');
    if (!iconGrid || !animGrid) return;

    // Cargar config guardada
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('margarita_promo_bubble_cfg') || '{}'); } catch(e) {}
    const currentIcon = _agendaPromoCfg.icon || saved.icon || 'promo-box-1';
    const currentAnim = _agendaPromoCfg.anim || saved.anim || 'anim-3d-spinner';

    // Render cajas
    iconGrid.innerHTML = AGENDA_PROMO_BOXES.map(box => `
        <div class="promo-svg-box ${box.id === currentIcon ? 'active' : ''}"
             title="${box.name}"
             onclick="setAgendaPromoIcon('${box.id}')">
            ${box.svg}
            <span class="promo-box-label">${box.name}</span>
        </div>
    `).join('');

    // Render animaciones
    animGrid.innerHTML = AGENDA_PROMO_ANIMS.map(a => `
        <div class="promo-anim-card ${a.id === currentAnim ? 'active' : ''}"
             onclick="setAgendaPromoAnim('${a.id}')">${a.name}</div>
    `).join('');

    // Actualizar preview
    if (preview) {
        const box = AGENDA_PROMO_BOXES.find(b => b.id === currentIcon);
        preview.innerHTML = box ? box.svg : '<i class="fas fa-gift"></i>';
        // Quitar todas las clases de animación anteriores y aplicar la actual
        AGENDA_PROMO_ANIMS.forEach(a => preview.classList.remove(a.id));
        preview.classList.add(currentAnim);
        preview.style.cssText = 'font-size:2.8rem; display:flex; align-items:center; justify-content:center; width:70px; height:70px;';
    }
}

window.setAgendaPromoIcon = function(id) {
    _agendaPromoCfg.icon = id;
    const box = AGENDA_PROMO_BOXES.find(b => b.id === id);
    if (box) _agendaPromoCfg.iconSvg = box.svg;
    renderAgendaPromoConfig();
};

window.setAgendaPromoAnim = function(id) {
    _agendaPromoCfg.anim = id;
    renderAgendaPromoConfig();
};

window.savePromoBubbleConfig = async function() {
    const saved = {};
    try { Object.assign(saved, JSON.parse(localStorage.getItem('margarita_promo_bubble_cfg') || '{}')); } catch(e) {}

    const cfg = {
        icon:    _agendaPromoCfg.icon    || saved.icon    || 'promo-box-1',
        iconSvg: _agendaPromoCfg.iconSvg || saved.iconSvg || '',
        anim:    _agendaPromoCfg.anim    || saved.anim    || 'anim-3d-spinner'
    };

    try {
        localStorage.setItem('margarita_promo_bubble_cfg', JSON.stringify(cfg));
    } catch(e) { console.warn('LocalStorage lleno, no se pudo guardar config de burbuja.'); }

    // Notificar a la web pública
    try { localStorage.setItem('margarita_salon_trigger', Date.now()); } catch(e) {}

    // Sincronizar a la nube dentro del documento admin_meta ampliado
    if (window.saveDataToCloud) {
        try {
            await window.saveDataToCloud('config_v2', 'promo_bubble_cfg', cfg);
        } catch(e) { console.warn('No se pudo sincronizar burbuja a la nube:', e); }
    }

    showToast('<i class="fas fa-gift"></i> Burbuja Pro configurada y guardada.', 'success');
};

// ============================================
// LOGICA DEL DASHBOARD ADMINISTRATIVO
// ============================================
window.renderDashboardStats = function(range = 'today', specificMonth = null, specificDate = null) {
    if (!document.getElementById('dashboard-tab')) return;

    const appointments = JSON.parse(localStorage.getItem('margarita_appointments')) || [];
    const completedApts = appointments.filter(a => a.status === 'accepted');
    const expenses = JSON.parse(localStorage.getItem('margarita_expenses')) || [];

    const isDark = document.documentElement.classList.contains('dark-theme');
    const chartText = isDark ? '#cbd5e1' : '#3D3B3A';
    const chartGrid = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    const chartDim = isDark ? '#64748b' : '#888888';

    const parsePrice = (priceStr) => {
        if (!priceStr || priceStr === 'Gratis') return 0;
        return parseInt(priceStr.toString().replace(/\D/g, '')) || 0;
    };

    const fmt = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);

    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');

    // 1. Filtrar Citas y Gastos por Período
    const filterData = (items, dateField) => {
        return items.filter(item => {
            if (!item[dateField]) return false;
            const itemDateStr = item[dateField];

            if (specificDate) {
                return itemDateStr === specificDate;
            }

            if (specificMonth !== null && specificMonth !== "") {
                const d = new Date(itemDateStr + 'T00:00:00');
                return !isNaN(d) && d.getMonth() === parseInt(specificMonth) && d.getFullYear() === now.getFullYear();
            }

            if (range === 'today') {
                return itemDateStr === todayStr;
            }
            if (range === 'week') {
                const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                startOfRange.setDate(startOfRange.getDate() - 6);
                const itemDate = new Date(itemDateStr + 'T00:00:00');
                return !isNaN(itemDate) && itemDate >= startOfRange && itemDate <= now;
            }
            if (range === 'fortnight') {
                const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                startOfRange.setDate(startOfRange.getDate() - 14);
                const itemDate = new Date(itemDateStr + 'T00:00:00');
                return !isNaN(itemDate) && itemDate >= startOfRange && itemDate <= now;
            }
            return true;
        });
    };

    const filteredApts = filterData(completedApts, 'date');
    const filteredExpenses = filterData(expenses, 'date');

    // 2. Calcular KPIs
    let totalRevenue = 0;
    let totalNetRevenue = 0;

    const specialists = JSON.parse(localStorage.getItem('margarita_specialists')) || [];
    const specCommMap = {};
    specialists.forEach(s => {
        const pct = parseInt(s.profitPercent);
        specCommMap[s.name] = isNaN(pct) ? 50 : pct;
    });

    filteredApts.forEach(a => {
        const parsedFacial = parsePrice(a.price);
        const val = (a.splitPrice != null && parsePrice(a.splitPrice) !== parsedFacial) ? parsePrice(a.splitPrice) : parsedFacial;
        
        totalRevenue += val;
        
        const profPct = specCommMap[a.specialist] || 50;
        const studioPart = val * ((100 - profPct) / 100);
        totalNetRevenue += studioPart;
    });

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netBalance = totalNetRevenue - totalExpenses;

    const revEl = document.getElementById('stat-revenue');
    if (revEl) revEl.textContent = fmt(totalRevenue);

    const netRevEl = document.getElementById('stat-net-revenue');
    if (netRevEl) netRevEl.textContent = fmt(totalNetRevenue);

    const expEl = document.getElementById('stat-expenses');
    if (expEl) expEl.textContent = fmt(totalExpenses);

    const balEl = document.getElementById('stat-net-balance');
    if (balEl) balEl.textContent = fmt(netBalance);

    const apptsEl = document.getElementById('stat-appointments-count');
    if (apptsEl) apptsEl.textContent = filteredApts.length;

    const balanceEl = document.getElementById('stat-net-balance');
    if (balanceEl) {
        if (netBalance > 0) {
            balanceEl.style.color = '#2ecc71';
        } else if (netBalance < 0) {
            balanceEl.style.color = '#e74c3c';
        } else {
            balanceEl.style.color = '';
        }
    }

    // Servicio y Especialista Estrella
    const serviceCounts = {};
    filteredApts.forEach(a => {
        const sName = a.service || 'Servicio';
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
    });
    const sortedServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]);
    const topService = sortedServices[0]?.[0] || '---';
    const topServiceEl = document.getElementById('stat-top-service');
    if (topServiceEl) topServiceEl.textContent = topService;

    const specCounts = {};
    filteredApts.forEach(a => {
        if (a.specialist) specCounts[a.specialist] = (specCounts[a.specialist] || 0) + 1;
    });
    const sortedSpecs = Object.entries(specCounts).sort((a, b) => b[1] - a[1]);
    const topSpecialist = sortedSpecs[0]?.[0] || '---';
    const topSpecialistEl = document.getElementById('stat-top-specialist');
    if (topSpecialistEl) topSpecialistEl.textContent = topSpecialist;

    // --- GRÁFICO 1: TENDENCIA DIARIA (LÍNEA) ---
    let trendLabels = [];
    let trendValues = [];

    if (specificMonth !== null && specificMonth !== "") {
        const daysInMonth = new Date(now.getFullYear(), parseInt(specificMonth) + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = i.toString();
            const dateFormatted = `${now.getFullYear()}-${(parseInt(specificMonth)+1).toString().padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
            trendLabels.push(dayStr);
            
            const dayRev = completedApts
                .filter(a => a.date === dateFormatted)
                .reduce((sum, a) => {
                    const parsedFacial = parsePrice(a.price);
                    return sum + ((a.splitPrice != null && parsePrice(a.splitPrice) !== parsedFacial) ? parsePrice(a.splitPrice) : parsedFacial);
                }, 0);
            trendValues.push(dayRev);
        }
    } else {
        const numDays = (range === 'fortnight') ? 15 : 7;
        const endDate = specificDate ? new Date(specificDate + 'T00:00:00') : new Date();
        
        for (let i = 0; i < numDays; i++) {
            const d = new Date(endDate.getTime());
            d.setDate(endDate.getDate() - (numDays - 1 - i));
            const dateFormatted = d.toLocaleDateString('sv-SE');
            
            trendLabels.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }));
            
            const dayRev = completedApts
                .filter(a => a.date === dateFormatted)
                .reduce((sum, a) => {
                    const parsedFacial = parsePrice(a.price);
                    return sum + ((a.splitPrice != null && parsePrice(a.splitPrice) !== parsedFacial) ? parsePrice(a.splitPrice) : parsedFacial);
                }, 0);
            trendValues.push(dayRev);
        }
    }

    const ctxTrend = document.getElementById('chart-sales-trend').getContext('2d');
    if (window.dashboardCharts && window.dashboardCharts.salesTrend) {
        window.dashboardCharts.salesTrend.destroy();
    }
    window.dashboardCharts.salesTrend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: 'Ingresos',
                data: trendValues,
                borderColor: '#e91e63',
                backgroundColor: 'rgba(233, 30, 99, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grace: '10%',
                    grid: { color: chartGrid }, 
                    ticks: { 
                        color: chartText,
                        callback: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v
                    } 
                },
                x: { ticks: { color: chartText, font: { size: 9 } }, grid: { display: false } }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Ingresos: $${ctx.raw.toLocaleString('es-CO')}`
                    }
                }
            }
        }
    });

    // --- GRÁFICO 2: CITAS POR CATEGORÍA (DONA) ---
    const catSales = {};
    filteredApts.forEach(a => {
        const catName = getCategoryName(a.category || a.cat);
        catSales[catName] = (catSales[catName] || 0) + 1;
    });

    let catLabels = Object.keys(catSales);
    let catData = Object.values(catSales);
    const totalItems = catData.reduce((a, b) => a + b, 0);

    if (catData.length === 0) {
        catLabels.push("Sin datos");
        catData.push(1);
    } else {
        catLabels = catLabels.map((name, idx) => {
            const val = catData[idx];
            const pct = totalItems > 0 ? Math.round((val / totalItems) * 100) : 0;
            return `${name} (${pct}%)`;
        });
    }

    const ctxCat = document.getElementById('chart-categories').getContext('2d');
    if (window.dashboardCharts && window.dashboardCharts.categories) {
        window.dashboardCharts.categories.destroy();
    }
    window.dashboardCharts.categories = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: [
                    '#A05D6B', '#38bdf8', '#2ecc71', '#f1c40f', '#9b59b6',
                    '#e67e22', '#1abc9c', '#e74c3c', '#34495e', '#7f8c8d'
                ],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: chartText, 
                        boxWidth: 8, 
                        padding: 15,
                        font: { size: 9, weight: '500' } 
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const labelStr = context.label || '';
                            if (labelStr === "Sin datos" || !labelStr) return " Sin datos registrados";
                            const value = context.raw || 0;
                            const pct = totalItems > 0 ? ((value / totalItems) * 100).toFixed(1) : 0;
                            return ` ${labelStr.split(' (')[0]}: ${value} citas (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // --- GRÁFICO 3: INGRESOS MENSUALES (BARRAS VERTICALES) ---
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyData = months.map((_, i) => {
        return completedApts
            .filter(a => {
                const d = new Date(a.date + 'T00:00:00');
                return !isNaN(d) && d.getMonth() === i && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, a) => {
                const parsedFacial = parsePrice(a.price);
                return sum + ((a.splitPrice != null && parsePrice(a.splitPrice) !== parsedFacial) ? parsePrice(a.splitPrice) : parsedFacial);
            }, 0);
    });

    const ctxMonth = document.getElementById('chart-monthly-revenue').getContext('2d');
    if (window.dashboardCharts && window.dashboardCharts.monthlyRevenue) {
        window.dashboardCharts.monthlyRevenue.destroy();
    }
    window.dashboardCharts.monthlyRevenue = new Chart(ctxMonth, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Ingresos',
                data: monthlyData,
                backgroundColor: 'rgba(56, 189, 248, 0.6)',
                hoverBackgroundColor: 'rgba(56, 189, 248, 0.8)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grace: '15%',
                    grid: { color: chartGrid }, 
                    ticks: { 
                        color: chartDim, 
                        callback: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v 
                    } 
                },
                x: { ticks: { color: chartText, font: { size: 9 } }, grid: { display: false } }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Ingresos: $${ctx.raw.toLocaleString('es-CO')}`
                    }
                }
            }
        }
    });

    // --- GRÁFICO 4: TOP 5 SERVICIOS (BARRAS HORIZONTALES) ---
    const top5Services = sortedServices.slice(0, 5);
    let svcLabels = top5Services.map(item => item[0]);
    let svcUnits = top5Services.map(item => item[1]);
    let svcRevenue = top5Services.map(item => {
        return filteredApts
            .filter(a => a.service === item[0])
            .reduce((sum, a) => {
                const parsedFacial = parsePrice(a.price);
                return sum + ((a.splitPrice != null && parsePrice(a.splitPrice) !== parsedFacial) ? parsePrice(a.splitPrice) : parsedFacial);
            }, 0);
    });

    if (svcLabels.length === 0) {
        svcLabels.push("Sin datos");
        svcUnits.push(0);
        svcRevenue.push(0);
    }

    const ctxTop = document.getElementById('chart-top-products').getContext('2d');
    if (window.dashboardCharts && window.dashboardCharts.topServices) {
        window.dashboardCharts.topServices.destroy();
    }
    window.dashboardCharts.topServices = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: svcLabels,
            datasets: [
                {
                    label: 'Citas',
                    data: svcUnits,
                    backgroundColor: 'rgba(56, 189, 248, 0.6)',
                    borderRadius: 3,
                    barThickness: 12,
                    xAxisID: 'xUnits'
                },
                {
                    label: 'Ingresos ($)',
                    data: svcRevenue,
                    backgroundColor: 'rgba(160, 93, 107, 0.6)',
                    borderRadius: 3,
                    barThickness: 12,
                    xAxisID: 'xRevenue'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xUnits: {
                    type: 'linear',
                    position: 'bottom',
                    beginAtZero: true,
                    title: { display: true, text: 'Cant. Citas', color: chartDim, font: { size: 9 } },
                    grid: { display: false },
                    ticks: { color: chartText, font: { size: 9 } }
                },
                xRevenue: {
                    type: 'linear',
                    position: 'top',
                    beginAtZero: true,
                    title: { display: true, text: 'Total Ingresos ($)', color: chartDim, font: { size: 9 } },
                    grid: { color: chartGrid },
                    ticks: { 
                        color: chartText, 
                        font: { size: 9 },
                        callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)
                    }
                },
                y: { 
                    ticks: { color: chartText, font: { size: 10, weight: 'bold' } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: chartText, boxWidth: 10, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const labelStr = context.label || '';
                            if (labelStr === "Sin datos" || !labelStr) return " Sin datos registrados";
                            let label = context.dataset.label || '';
                            let value = context.raw || 0;
                            if (label.includes('$')) {
                                return label + ': $' + value.toLocaleString('es-CO');
                            }
                            return label + ': ' + value;
                        }
                    }
                }
            }
        }
    });
};

window.initDashboardDropdowns = function() {
    const dropdowns = document.querySelectorAll('#dashboard-tab .custom-dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');
        const items = dropdown.querySelectorAll('li');
        const display = dropdown.querySelector('span');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });
        }

        items.forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.value;
                const text = item.textContent;

                display.textContent = text;
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                if (dropdown.id === 'range-dropdown') {
                    trigger.classList.add('active-trigger');
                    const monthDisplay = document.querySelector('#month-dropdown #month-trigger span');
                    if (monthDisplay) monthDisplay.textContent = "Meses...";
                    document.querySelectorAll('#month-dropdown li').forEach(li => li.classList.remove('active'));
                } else {
                    const rangeDisplay = document.querySelector('#range-dropdown #range-trigger span');
                    if (rangeDisplay) rangeDisplay.textContent = "Rango...";
                    document.querySelectorAll('#range-dropdown li').forEach(li => li.classList.remove('active'));
                    trigger.classList.add('active-trigger');
                }

                const dateInput = document.getElementById('stats-date-filter');
                if (dateInput) dateInput.value = "";

                if (dropdown.id === 'range-dropdown') {
                    renderDashboardStats(value);
                } else {
                    renderDashboardStats('month', value);
                }

                dropdown.classList.remove('open');
            });
        });
    });

    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('open'));
    });

    const statsDateFilter = document.getElementById('stats-date-filter');
    if (statsDateFilter) {
        statsDateFilter.addEventListener('change', (e) => {
            if (e.target.value !== "") {
                document.querySelectorAll('#dashboard-tab .custom-dropdown li').forEach(li => li.classList.remove('active'));
                document.querySelectorAll('#dashboard-tab .dropdown-trigger').forEach(tr => tr.classList.remove('active-trigger'));
                
                const rangeDisp = document.querySelector('#range-dropdown #range-trigger span');
                const monthDisp = document.querySelector('#month-dropdown #month-trigger span');
                if (rangeDisp) rangeDisp.textContent = "Rango...";
                if (monthDisp) monthDisp.textContent = "Meses...";

                renderDashboardStats(null, null, e.target.value);
            }
        });
    }

    const resetBtn = document.getElementById('reset-stats-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const statsDateFilter = document.getElementById('stats-date-filter');
            if (statsDateFilter) statsDateFilter.value = "";
            
            const rangeDisp = document.querySelector('#range-dropdown #range-trigger span');
            const monthDisp = document.querySelector('#month-dropdown #month-trigger span');
            if (rangeDisp) rangeDisp.textContent = "Hoy";
            if (monthDisp) monthDisp.textContent = "Meses...";
            
            document.querySelectorAll('#dashboard-tab .custom-dropdown li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('#dashboard-tab .dropdown-trigger').forEach(tr => tr.classList.remove('active-trigger'));
            
            const todayLi = document.querySelector('#range-dropdown li[data-value="today"]');
            if (todayLi) todayLi.classList.add('active');
            
            const rangeTrigger = document.querySelector('#range-dropdown #range-trigger');
            if (rangeTrigger) rangeTrigger.classList.add('active-trigger');
            
            renderDashboardStats('today');
            showToast('<i class="fas fa-sync-alt"></i> Panel restablecido a Hoy.');
        });
    }
};
