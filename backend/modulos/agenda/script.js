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

document.addEventListener('DOMContentLoaded', () => {
    window.applyClientTheme = function(themeName) {
        const root = document.documentElement;
        const themes = {
            rose: { accent: '#A05D6B', bg: '#FFF4F7', rgb: '160, 93, 107', hover: '#B87E8C', dark: '#804350' },
            blue: { accent: '#2D4F6C', bg: '#F0F4F8', rgb: '45, 79, 108', hover: '#3D6487', dark: '#1B3347' },
            green: { accent: '#2E5A44', bg: '#F0F6F3', rgb: '46, 90, 68', hover: '#3E775A', dark: '#1D3D2D' },
            gold: { accent: '#6B4F3E', bg: '#F9F6F2', rgb: '107, 79, 62', hover: '#856450', dark: '#4C372A' },
            lavender: { accent: '#8E7CC3', bg: '#F5F3FA', rgb: '142, 124, 195', hover: '#A493D6', dark: '#6A58A1' },
            orange: { accent: '#E67E22', bg: '#FFF8F2', rgb: '230, 126, 34', hover: '#F39C12', dark: '#D35400' },
            cyan: { accent: '#3498DB', bg: '#F2F8FC', rgb: '52, 152, 219', hover: '#5DADE2', dark: '#1A5276' },
            purple: { accent: '#7D3C98', bg: '#F8F2FC', rgb: '125, 60, 152', hover: '#9B59B6', dark: '#4A235A' },
            maroon: { accent: '#922B21', bg: '#FDEDEC', rgb: '146, 43, 33', hover: '#C0392B', dark: '#78281F' },
            slate: { accent: '#38bdf8', bg: '#0f172a', rgb: '56, 189, 248', hover: '#0ea5e9', dark: '#0369a1' },
            
            emerald: { accent: '#16A085', bg: '#E8F8F5', rgb: '22, 160, 133', hover: '#1ABC9C', dark: '#0E6251' },
            mint: { accent: '#27AE60', bg: '#E8F8F0', rgb: '39, 174, 96', hover: '#2ECC71', dark: '#196F3D' },
            teal: { accent: '#117A65', bg: '#E8F6F3', rgb: '17, 122, 101', hover: '#148F77', dark: '#0B5345' },
            olive: { accent: '#7D6608', bg: '#FEFDE8', rgb: '125, 102, 8', hover: '#9A7D0A', dark: '#4F4105' },
            mustard: { accent: '#B7950B', bg: '#FEFDF0', rgb: '183, 149, 11', hover: '#D4AC0D', dark: '#7D6608' },
            terracotta: { accent: '#A04000', bg: '#FDF5E6', rgb: '160, 64, 0', hover: '#BA4A00', dark: '#6E2C00' },
            coral: { accent: '#D35400', bg: '#FDF2E9', rgb: '211, 84, 0', hover: '#E67E22', dark: '#873600' },
            sand: { accent: '#A08A75', bg: '#F9F6F0', rgb: '160, 138, 117', hover: '#BCA893', dark: '#735F4C' },
            coffee: { accent: '#5D4037', bg: '#F6F2F0', rgb: '93, 64, 55', hover: '#7D564C', dark: '#3E2723' },
            plum: { accent: '#6C3483', bg: '#F5EEF8', rgb: '108, 52, 131', hover: '#8E44AD', dark: '#4A235A' },
            orchid: { accent: '#8E44AD', bg: '#F4ECF7', rgb: '142, 68, 173', hover: '#9B59B6', dark: '#5B2C6F' },
            magenta: { accent: '#C0392B', bg: '#FDEDEC', rgb: '192, 57, 43', hover: '#D98880', dark: '#641E16' },
            rosewood: { accent: '#78281F', bg: '#FAF2F2', rgb: '120, 40, 31', hover: '#922B21', dark: '#4A1510' },
            navy: { accent: '#1B4F72', bg: '#EAF2F8', rgb: '27, 79, 114', hover: '#2874A6', dark: '#0E2F44' },
            peacock: { accent: '#21618C', bg: '#EBF5FB', rgb: '33, 97, 140', hover: '#2E86C1', dark: '#154360' },
            indigo: { accent: '#2874A6', bg: '#EAF2F8', rgb: '40, 116, 166', hover: '#5499C7', dark: '#1B4F72' },
            charcoal: { accent: '#455A64', bg: '#ECEFF1', rgb: '69, 90, 100', hover: '#607D8B', dark: '#263238' },
            sakura: { accent: '#E8A7B5', bg: '#FFF3F5', rgb: '232, 167, 181', hover: '#F0C0C8', dark: '#B86675' },
            wine: { accent: '#780820', bg: '#FCF2F4', rgb: '120, 8, 32', hover: '#961D36', dark: '#480210' },
            amber: { accent: '#D68910', bg: '#FEF9E7', rgb: '214, 137, 16', hover: '#F5B041', dark: '#7E5109' }
        };
        const theme = themes[themeName] || themes.rose;
        root.style.setProperty('--color-accent', theme.accent);
        root.style.setProperty('--color-accent-hover', theme.hover);
        root.style.setProperty('--color-dark-pink', theme.dark);
        root.style.setProperty('--color-bg', theme.bg);
        root.style.setProperty('--accent-rgb', theme.rgb);
        
        if (themeName === 'slate') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        }
    };

    const cachedTheme = localStorage.getItem('margarita_client_theme') || 'rose';
    window.applyClientTheme(cachedTheme);

    // SOPORTE DE HORA 12H (AM/PM)
    window.formatTime12h = function(timeStr) {
        if (!timeStr || timeStr === 'Hora N/A') return "Hora N/A";
        // Si la hora ya viene formateada con AM o PM (ej. desde el agendador auto), no procesarla doble
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
        
        try {
            let [hours, minutes] = timeStr.split(':');
            hours = parseInt(hours);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // el 0 debe ser 12
            return `${hours}:${minutes} ${ampm}`;
        } catch(e) { return timeStr; }
    };
    window.formatCurrency = function(val) {
        if (!val) return "$0 COP";
        let num = parseInt(val.toString().replace(/[^0-9]/g, '')) || 0;
        return '$' + num.toLocaleString('es-CO') + ' COP';
    };

    // Helper unificado para duraciones (Maneja "1 hora", "90 min", "1:30", etc)
    window.getDurationInMins = function(durationStr, serviceTitle = "") {
        if (!durationStr) {
            return 60; 
        }
        const val = durationStr.toString().toLowerCase();
        // Si ya es un número puro mayor a 10, asumimos minutos
        const rawNum = parseInt(val);
        if (!isNaN(rawNum) && !val.includes('hora') && rawNum > 10) return rawNum;
        
        const num = parseInt(val.replace(/\D/g, "")) || 60;
        if (val.includes('hora')) return num * 60;
        return num;
    };
    // Force scroll to top on page load/refresh
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Global Helpers for Dates and Times
    window.normDateToISO = (d) => {
        if(!d) return '';
        const p = d.split(/[-/]/);
        if(p.length < 3) return d;
        // Si ya está en YYYY-MM-DD
        if(p[0].length === 4) return `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`;
        // Si está en DD/MM/YYYY o DD-MM-YYYY
        return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    };

    window.getMinTime = (t) => {
        if(!t) return 0;
        const low = t.toLowerCase();
        let [hP, mP] = t.split(':');
        let h = parseInt(hP); let m = parseInt(mP || 0);
        if(low.includes('pm') && h < 12) h += 12;
        if(low.includes('am') && h === 12) h = 0;
        return h * 60 + m;
    };

    // Global Safety
    window.onerror = function(msg, url, line) {
        console.error("Error Global detectado:", msg, "en", url, "línea", line);
        return false;
    };

    // Salon Status Update Logic
    window.updateSalonStatusUI = function(isSalonOpen) {
        const statusBanner = document.getElementById('salon-status-banner');
        const statusLabels = document.querySelectorAll('.salon-status-text');
        const navbar = document.querySelector('.navbar');
        
        if (statusBanner) {
            statusBanner.style.display = isSalonOpen ? 'none' : 'flex';
            
            if (!isSalonOpen) {
                const closureData = localStorage.getItem('margarita_closure_dates');
                let customMsg = "";
                if (closureData) {
                    try {
                        const { end } = JSON.parse(closureData);
                        if (end) {
                            const parts = end.split('-');
                            if (parts.length === 3) {
                                const formattedEnd = `${parts[2]}/${parts[1]}/${parts[0]}`;
                                customMsg = `¡AVISO! El salón se encuentra CERRADO hasta el ${formattedEnd}. Solo se agendarán citas para fechas posteriores.`;
                            }
                        }
                    } catch(e) { console.error("Error reading closure dates", e); }
                }
                const msg = customMsg || "¡AVISO! El día de hoy el salón se encuentra CERRADO. No se estarán prestando servicios.";
                statusLabels.forEach(label => {
                    label.innerText = msg;
                });
            }
        }
        
        if (navbar) {
            if (!isSalonOpen && statusBanner) {
                setTimeout(() => {
                    window.dispatchEvent(new Event('scroll'));
                }, 50);
            } else {
                window.dispatchEvent(new Event('scroll'));
            }
        }
    };

    // --- DYNAMIC BRANDING & SOCIAL SYNC ---
    window.applyPublicDynamicBranding = function() {
        const name = localStorage.getItem('margarita_site_name') || "Margaritasmit";
        document.querySelectorAll('.dynamic-brand-text').forEach(el => { el.innerText = name; });
        const yearSpan = document.getElementById('current-year-footer');
        if(yearSpan) yearSpan.innerText = new Date().getFullYear();

        // 1. Actualizar título de la pestaña
        document.title = `${name} | Agenda de Citas`;

        // 2. Aplicar Logo de la Marca en Navbar y Footer y como favicon
        const logoUrl = localStorage.getItem('margarita_logo_url');
        
        if (logoUrl) {
            let link = document.getElementById('dynamic-favicon');
            if (!link) {
                link = document.createElement('link');
                link.id = 'dynamic-favicon';
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            if (logoUrl.startsWith('data:image/svg') || logoUrl.endsWith('.svg')) {
                link.type = 'image/svg+xml';
            } else {
                link.type = 'image/png';
            }
            link.href = logoUrl;
        }
        
        // Navbar Logo Anchor
        const logoAnchor = document.getElementById('logo-anchor');
        if (logoAnchor) {
            const imgEl = logoAnchor.querySelector('img');
            const iconEl = logoAnchor.querySelector('#logo-icon');
            const textEl = logoAnchor.querySelector('#logo-text');
            
            if (textEl && textEl.innerText !== name) {
                textEl.innerText = name;
            }
            
            if (logoUrl) {
                if (imgEl) {
                    if (imgEl.getAttribute('src') !== logoUrl) {
                        imgEl.src = logoUrl;
                    }
                } else {
                    const img = document.createElement('img');
                    img.src = logoUrl;
                    img.style.cssText = "height: 38px; max-width: 120px; object-fit: contain; border-radius: 6px; margin-right: 10px; vertical-align: middle; image-rendering: -webkit-optimize-contrast; transform: translateZ(0); backface-visibility: hidden;";
                    if (iconEl) {
                        iconEl.parentNode.replaceChild(img, iconEl);
                    } else if (textEl) {
                        logoAnchor.insertBefore(img, textEl);
                    } else {
                        logoAnchor.innerHTML = `<img src="${logoUrl}" style="height: 38px; max-width: 120px; object-fit: contain; border-radius: 6px; margin-right: 10px; vertical-align: middle; image-rendering: -webkit-optimize-contrast; transform: translateZ(0); backface-visibility: hidden;"> <span class="dynamic-brand-text" id="logo-text">${name}</span><span id="logo-dot">.</span>`;
                    }
                }
            } else {
                if (imgEl) {
                    const icon = document.createElement('i');
                    icon.className = "fas fa-crown";
                    icon.id = "logo-icon";
                    icon.style.cssText = "color: var(--color-accent); margin-right: 8px;";
                    imgEl.parentNode.replaceChild(icon, imgEl);
                } else if (!iconEl && textEl) {
                    const icon = document.createElement('i');
                    icon.className = "fas fa-crown";
                    icon.id = "logo-icon";
                    icon.style.cssText = "color: var(--color-accent); margin-right: 8px;";
                    logoAnchor.insertBefore(icon, textEl);
                } else if (!iconEl && !imgEl) {
                    logoAnchor.innerHTML = `<i class="fas fa-crown" id="logo-icon" style="color: var(--color-accent); margin-right: 8px;"></i><span class="dynamic-brand-text" id="logo-text">${name}</span><span id="logo-dot">.</span>`;
                }
            }
        }

        // Footer Logo Container
        const footerLogoContainer = document.getElementById('footer-logo-container');
        if (footerLogoContainer) {
            const imgEl = footerLogoContainer.querySelector('img');
            const iconEl = footerLogoContainer.querySelector('#footer-logo-icon');
            const textEl = footerLogoContainer.querySelector('#footer-logo-text');
            
            if (textEl && textEl.innerText !== name) {
                textEl.innerText = name;
            }
            
            if (logoUrl) {
                if (imgEl) {
                    if (imgEl.getAttribute('src') !== logoUrl) {
                        imgEl.src = logoUrl;
                    }
                } else {
                    const img = document.createElement('img');
                    img.src = logoUrl;
                    img.style.cssText = "height: 45px; max-width: 140px; object-fit: contain; border-radius: 6px; margin-right: 10px; vertical-align: middle; image-rendering: -webkit-optimize-contrast; transform: translateZ(0); backface-visibility: hidden;";
                    if (iconEl) {
                        iconEl.parentNode.replaceChild(img, iconEl);
                    } else if (textEl) {
                        footerLogoContainer.insertBefore(img, textEl);
                    } else {
                        footerLogoContainer.innerHTML = `<img src="${logoUrl}" style="height: 45px; max-width: 140px; object-fit: contain; border-radius: 6px; margin-right: 10px; vertical-align: middle; image-rendering: -webkit-optimize-contrast; transform: translateZ(0); backface-visibility: hidden;"> <span class="dynamic-brand-text" id="footer-logo-text">${name}</span><span id="footer-logo-dot">.</span>`;
                    }
                }
            } else {
                if (imgEl) {
                    const icon = document.createElement('i');
                    icon.className = "fas fa-crown";
                    icon.id = "footer-logo-icon";
                    icon.style.cssText = "color: var(--color-accent); margin-right: 8px;";
                    imgEl.parentNode.replaceChild(icon, imgEl);
                } else if (!iconEl && textEl) {
                    const icon = document.createElement('i');
                    icon.className = "fas fa-crown";
                    icon.id = "footer-logo-icon";
                    icon.style.cssText = "color: var(--color-accent); margin-right: 8px;";
                    footerLogoContainer.insertBefore(icon, textEl);
                } else if (!iconEl && !imgEl) {
                    footerLogoContainer.innerHTML = `<i class="fas fa-crown" id="footer-logo-icon" style="color: var(--color-accent); margin-right: 8px;"></i><span class="dynamic-brand-text" id="footer-logo-text">${name}</span><span id="footer-logo-dot">.</span>`;
                }
            }
        }

        // 2. Aplicar Foto de Portada / Hero Background
        const heroUrl = localStorage.getItem('margarita_hero_url');
        const heroElement = document.querySelector('.hero');
        if (heroElement) {
            if (heroUrl) {
                heroElement.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(var(--accent-rgb),0.3) 100%), url('${heroUrl}')`;
            } else {
                heroElement.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(var(--accent-rgb),0.3) 100%), url('hero-bg.png')`;
            }
        }
    };
    window.applyPublicWhatsappLinks = function() {
        const savedWa = localStorage.getItem('margarita_whatsapp_number') || "3057726115";
        let cleanNum = savedWa.replace(/\D/g, '');
        // Si tiene 10 dígitos, añadir el código de país de Colombia (57) por defecto
        const fullWa = cleanNum.length === 10 ? "57" + cleanNum : cleanNum;
        const waUrl = `https://wa.me/${fullWa}`;

        // Actualizar todos los enlaces que contienen wa.me
        document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
            // Mantener el texto del mensaje si existe (ej: ?text=...)
            const currentHref = link.getAttribute('href');
            if (currentHref.includes('?text=')) {
                const params = currentHref.split('?')[1];
                link.href = `${waUrl}?${params}`;
            } else {
                link.href = waUrl;
            }
        });
    };

    window.applyPublicSocialLinks = function() {
        const social = JSON.parse(localStorage.getItem('margarita_social_links') || '{}');
        const insta = document.getElementById('footer-social-insta');
        const face = document.getElementById('footer-social-face');
        const tiktok = document.getElementById('footer-social-tiktok');

        if(insta) { insta.href = social.insta || "#"; insta.style.display = "inline-flex"; }
        if(face) { face.href = social.face || "#"; face.style.display = "inline-flex"; }
        if(tiktok) { tiktok.href = social.tiktok || "#"; tiktok.style.display = "inline-flex"; }
    };

    // ── AUTO-CIERRE EXPIRADO: Si ya pasó la fecha de fin, limpiar el cierre automáticamente ──
    (function checkClosureExpiry() {
        try {
            const closureRaw = localStorage.getItem('margarita_closure_dates');
            const isClosed = localStorage.getItem('margarita_salon_open') === 'false';
            if (isClosed && closureRaw) {
                const cls = JSON.parse(closureRaw);
                if (cls.end) {
                    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD formato local
                    if (today > cls.end) {
                        // El cierre ya venció → restaurar automáticamente
                        localStorage.removeItem('margarita_closure_dates');
                        localStorage.setItem('margarita_salon_open', 'true');
                        localStorage.setItem('margarita_salon_trigger', Date.now());
                        // Notificar a la nube para que todos los dispositivos se actualicen
                        if (window.saveDataToCloud) {
                            window.saveDataToCloud('config_v2', 'salon_status', { open: true, closure_dates: null });
                        }
                        console.log('🟢 [Auto] Cierre expirado el ' + cls.end + ' — salón reabierto automáticamente.');
                    }
                }
            }
        } catch(e) { /* silencioso */ }
    })();

    // Initial check
    const currentStatus = localStorage.getItem('margarita_salon_open') !== 'false';
    updateSalonStatusUI(currentStatus);
    applyPublicDynamicBranding();
    applyPublicSocialLinks();
    applyPublicWhatsappLinks();
    
    // IMPORTANTE: Sincronización Autónoma en la Nube (Fase 3 - Robust Cloud con Re-intento)
    let _isInitialSyncRequested = false;
    const runCloudSync = async () => {
        if (window.loadListFromCloud) {
            if (_isInitialSyncRequested) return;
            _isInitialSyncRequested = true;
            try {
                console.log("â˜ï¸ Cargando datos desde la Nube...");
                // 1. Sincronizar Catálogo y Categorías
                const cloudSvcs = await window.loadListFromCloud('servicios_v2');
                if (cloudSvcs && cloudSvcs.length > 0) {
                    localStorage.setItem('margarita_services', JSON.stringify(cloudSvcs));
                }
                
                const cloudCats = await window.loadListFromCloud('categorias_v2');
                if (cloudCats && cloudCats.length > 0) {
                    localStorage.setItem('margarita_categories', JSON.stringify(cloudCats));
                }

                // 2. Sincronizar Agenda
                const cloudApts = await window.loadListFromCloud('citas_v2');
                if (cloudApts) {
                    localStorage.setItem('margarita_appointments', JSON.stringify(cloudApts));
                }

                // 3. Sincronizar Galería Pública
                const cloudGal = await window.loadListFromCloud('galeria_v2');
                if (cloudGal && cloudGal.length > 0) {
                    localStorage.setItem('margarita_gallery', JSON.stringify(cloudGal));
                    if (window.renderPublicGallery) window.renderPublicGallery();
                }

                // 3.5 Sincronizar Especialistas (VITAL para armar la agenda en nuevos dispositivos)
                const cloudSpecs = await window.loadListFromCloud('especialistas_v2');
                if (cloudSpecs && cloudSpecs.length > 0) {
                    localStorage.setItem('margarita_specialists', JSON.stringify(cloudSpecs));
                }

                // 4. Sincronizar Galerías de Modelos (específicas por servicio)
                try {
                    const cloudModelGal = await window.loadDataFromCloud('config_v2', 'service_galleries');
                    if (cloudModelGal) {
                        localStorage.setItem('margarita_service_galleries', JSON.stringify(cloudModelGal));
                    }
                } catch(e) { console.warn("No se pudo cargar galerías de modelos:", e); }

                // 5. Sincronizar Promociones (VITAL para teléfonos sin caché)
                try {
                    const cloudPromos = await window.loadDataFromCloud('config_v2', 'promos');
                    if (cloudPromos) {
                        localStorage.setItem('margarita_promos', JSON.stringify(cloudPromos));
                    }
                } catch(e) { console.warn("No se pudo cargar promos:", e); }

                // 6. Sincronizar Grupos de Simultaneidad
                try {
                    const cloudSimult = await window.loadDataFromCloud('config_v2', 'simult_groups');
                    if (cloudSimult) {
                        localStorage.setItem('margarita_simult_groups', JSON.stringify(cloudSimult));
                    }
                } catch(e) { console.warn("No se pudo cargar simultaneidad:", e); }

                // --- Smart Sync: Solo re-renderizar si algo CAMBIÁ“ realmente ---
                const localModelGalBefore = localStorage.getItem('margarita_service_galleries');
                const dataChanged = (JSON.stringify(cloudSvcs) !== localSvcsBefore) || 
                                    (JSON.stringify(cloudCats) !== localCatsBefore) ||
                                    (JSON.stringify(cloudGal)  !== localGalBefore) ||
                                    (JSON.stringify(cloudSpecs) !== localSpecsBefore) ||
                                    (JSON.stringify(cloudModelGal) !== localModelGalBefore);

                if (dataChanged) {
                    console.log("🔄 Cambios detectados en la nube. Re-renderizando instantáneamente...");
                    if (window.renderDynamicContent) window.renderDynamicContent();
                    if (window.renderPublicGallery) window.renderPublicGallery();
                    // Al haber cambios reales en los datos, forzamos re-chequeo de promos
                    // SOLO si no se ha mostrado ya en esta carga (para evitar doble apertura)
                    if (typeof checkPromotions === 'function' && !window._promoAlreadyAutoShown) checkPromotions(true);
                } else {
                    console.log("✨ Los datos locales están al día. Cero pestañeo.");
                    // Chequeo normal (respetando la sesión) si los datos no cambiaron
                    if (window._sync_listeners_attached) {
                        console.log("⚠️ï¸ Saltando reconexión: Listeners ya activos.");
                        return;
                    }
                    
                    if (window.listenToCollection) {
                        window._sync_listeners_attached = true;
                        
                        window.listenToCollection('especialistas_v2', (data) => {
                            const localStr = localStorage.getItem('margarita_specialists') || '[]';
                            if (data && JSON.stringify(data) !== localStr) {
                                console.log("👥 [Sync Live] Especialistas actualizados...");
                                localStorage.setItem('margarita_specialists', JSON.stringify(data));
                                if (window.renderDynamicContent) window.renderDynamicContent();
                            }
                        });

                        window.listenToCollection('servicios_v2', (data) => {
                            const localStr = localStorage.getItem('margarita_services') || '[]';
                            if (data && JSON.stringify(data) !== localStr) {
                                console.log("💇 [Sync Live] Servicios actualizados...");
                                localStorage.setItem('margarita_services', JSON.stringify(data));
                                if (window.renderDynamicContent) window.renderDynamicContent();
                            }
                        });

                        window.listenToCollection('categorias_v2', (data) => {
                            const localStr = localStorage.getItem('margarita_categories') || '[]';
                            if (data && JSON.stringify(data) !== localStr) {
                                console.log("📂 [Sync Live] Categorías actualizadas...");
                                localStorage.setItem('margarita_categories', JSON.stringify(data));
                                if (window.renderDynamicContent) window.renderDynamicContent();
                            }
                        });

                        window.listenToCollection('galeria_v2', (data) => {
                            const localStr = localStorage.getItem('margarita_gallery') || '[]';
                            if (data && JSON.stringify(data) !== localStr) {
                                console.log("📸 [Sync Live] Galería actualizada...");
                                localStorage.setItem('margarita_gallery', JSON.stringify(data));
                                if (window.renderPublicGallery) window.renderPublicGallery();
                            }
                        });

                        if (window.listenToDoc) {
                            window.listenToDoc('config_v2', 'promos', (data) => {
                                const localStr = localStorage.getItem('margarita_promos') || '{}';
                                if (data && JSON.stringify(data) !== localStr) {
                                    console.log("ðŸŽ [Sync Live] Promociones actualizadas...");
                                    localStorage.setItem('margarita_promos', JSON.stringify(data));
                                    // Solo re-chequear si no se ha mostrado ya o si algo cambió drásticamente
                                    // Respetamos la decisión del usuario de cerrarla.
                                    if (typeof checkPromotions === 'function' && !window._promoAlreadyAutoShown) checkPromotions(true);
                                }
                            });
                        }
                    }
                }

                // 6. Escuchar cambios en tiempo real (CERO duplicados)
                if (window.listenToDoc && !window._global_listeners_active) {
                    window._global_listeners_active = true;
                    
                    // Listener para Estado del Salón y Branding
                    window.listenToDoc('config_v2', 'salon_status', (data) => {
                        if (data) {
                            localStorage.setItem('margarita_salon_open', data.open === false ? 'false' : 'true');
                            // Si closure_dates es null/undefined, limpiar cierre programado local
                            if (data.closure_dates) {
                                localStorage.setItem('margarita_closure_dates', JSON.stringify(data.closure_dates));
                            } else {
                                localStorage.removeItem('margarita_closure_dates');
                            }
                            updateSalonStatusUI(data.open !== false);
                        }
                    });

                    window.listenToDoc('config_v2', 'general', (data) => {
                        if (data) {
                            if (data.site_name) localStorage.setItem('margarita_site_name', data.site_name);
                            if (data.whatsapp) localStorage.setItem('margarita_whatsapp_number', data.whatsapp);
                            if (data.social) localStorage.setItem('margarita_social_links', JSON.stringify(data.social));
                            if (data.theme) {
                                localStorage.setItem('margarita_client_theme', data.theme);
                                window.applyClientTheme(data.theme);
                            }
                            if (data.logo_url !== undefined) {
                                if (data.logo_url) localStorage.setItem('margarita_logo_url', data.logo_url);
                                else localStorage.removeItem('margarita_logo_url');
                            }
                            if (data.hero_url !== undefined) {
                                if (data.hero_url) localStorage.setItem('margarita_hero_url', data.hero_url);
                                else localStorage.removeItem('margarita_hero_url');
                            }
                            
                            applyPublicDynamicBranding();
                            applyPublicWhatsappLinks();
                            applyPublicSocialLinks();
                        }
                    });

                    // Listener para Grupos de Simultaneidad
                    window.listenToDoc('config_v2', 'simult_groups', (data) => {
                        if (data) {
                            const current = localStorage.getItem('margarita_simult_groups');
                            if (JSON.stringify(data) !== current) {
                                localStorage.setItem('margarita_simult_groups', JSON.stringify(data));
                                console.log("🔄 Simultaneity Groups actualizados en vivo");
                                if (window.renderDynamicContent) window.renderDynamicContent();
                            }
                        }
                    });

                    // Listener para Galerías de Modelos Específicas
                    window.listenToDoc('config_v2', 'service_galleries', (data) => {
                        if (data) {
                            const current = localStorage.getItem('margarita_service_galleries');
                            if (JSON.stringify(data) !== current) {
                                localStorage.setItem('margarita_service_galleries', JSON.stringify(data));
                                console.log("🔄 Service Galleries actualizadas en vivo");
                                if (window.renderDynamicContent) window.renderDynamicContent();
                            }
                        }
                    });

                    // Listener para configuración de Burbuja Pro
                    window.listenToDoc('config_v2', 'promo_bubble_cfg', (data) => {
                        if (data) {
                            try {
                                const current = localStorage.getItem('margarita_promo_bubble_cfg');
                                if (JSON.stringify(data) !== current) {
                                    localStorage.setItem('margarita_promo_bubble_cfg', JSON.stringify(data));
                                    if (typeof updatePromoBubbleUI === 'function') updatePromoBubbleUI();
                                }
                            } catch(e) {}
                        }
                    });
                }

                console.log('âœ… Sincronización inicial completa');
            } catch(e) {
                console.error("Error en sincronización:", e);
            }
        } else {
            // Si el módulo de Firebase está cargando todavía, re-intentar brevemente
            setTimeout(runCloudSync, 500);
        }
    };

    // Capturar estado inicial para Smart Sync
    const localSvcsBefore = localStorage.getItem('margarita_services');
    const localCatsBefore = localStorage.getItem('margarita_categories');
    const localGalBefore  = localStorage.getItem('margarita_gallery');
    const localSpecsBefore = localStorage.getItem('margarita_specialists');
    runCloudSync();

    // IMPORTANTE: Renderizar contenido local primero (fallback instantáneo), luego los anuncios
    if (window.renderDynamicContent) {
        window.renderDynamicContent();
    }
    
    // Inicializar el selector global de profesionales para el carrito
    populateClientSpecialists();
    setTimeout(() => {
        if (window.updateCartBadge) window.updateCartBadge();
    }, 800); // Pequeño delay de cortesía para asegurar que el DOM y el localStorage estén listos
    
    // Quitar Loader Anti-FOUC
    const loader = document.getElementById('global-page-loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 500);
        }, 100);
    }
    
    // Eliminado timeout redundante para evitar doble apertura de promos

    // Real-time synchronization across tabs (from Admin updates)
    window.addEventListener('storage', (event) => {
        if (event.key === 'margarita_salon_open') {
            updateSalonStatusUI(event.newValue !== 'false');
        } else if (event.key === 'margarita_closure_dates' || event.key === 'margarita_salon_trigger' || event.key === 'margarita_site_name' || event.key === 'margarita_whatsapp_number') {
            if (window.applyPublicWhatsappLinks) window.applyPublicWhatsappLinks();
            if (window.applyPublicDynamicBranding) window.applyPublicDynamicBranding();
            window.dispatchEvent(new Event('scroll'));
        } else if (event.key === 'margarita_salon_trigger') {
            // Sincronización en tiempo real de servicios y categorías
            if (window.renderDynamicContent) window.renderDynamicContent();
        } else if (event.key === 'margarita_promos' || event.key === 'margarita_promo') {
            // Pequeño delay para que el admin termine de escribir antes de leer
            setTimeout(() => {
                try {
                    if (window.renderDynamicContent) window.renderDynamicContent();
                    // BUG FIX: Bloqueo anti-rebote reducido a 5 segundos.
                    // Evita el doble popup instantáneo por latencia, pero permite
                    // que un segundo anuncio (activado 10-20s después) sí aparezca.
                    const timeSinceDismiss = Date.now() - (window._lastPromoDismissTime || 0);
                    const userJustClosed = timeSinceDismiss < 5000;
                    if (typeof checkPromotions === 'function' && !userJustClosed) {
                        checkPromotions(true);
                    }
                } catch(e) { console.error('Promo sync error:', e); }
            }, 400);
        }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        if (nav) {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            
            // Navbar repositioning (now handled by header-stack in index.html)
        }
    });

    // Mobile Menu
    const hamburger = document.querySelector('.hamburger');
    const closeMenu = document.querySelector('.close-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    hamburger.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        document.querySelectorAll('.whatsapp-float').forEach(el => el.style.display = 'none');
    });

    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        document.querySelectorAll('.whatsapp-float').forEach(el => el.style.display = '');
    });

    mobileMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            mobileMenu.classList.remove('active');
            document.querySelectorAll('.whatsapp-float').forEach(el => el.style.display = '');
        }
    });

    // FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            question.classList.toggle('active');
            const answer = question.nextElementSibling;
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + "px";
            } else {
                answer.style.maxHeight = null;
            }
        });
    });

    // Scroll Reveal Animation
    const reveals = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 150;
        
        reveals.forEach(reveal => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    // Trigger once on load
    revealOnScroll();

    // Data Initialization
    const defaultCategories = [
        { id: 'unas', name: 'Uñas & Manicura', subtitle: 'Arte, precisión y cuidado profundo para tus manos.', bg: 'pink' },
        { id: 'cabello', name: 'Cabello & Color', subtitle: 'Transforma tu cabello con resultados profesionales.', bg: 'white' },
        { id: 'cejas', name: 'Cejas & Pestañas', subtitle: 'Miradas magnéticas que resaltan tu belleza natural.', bg: 'pink' },
        { id: 'depil', name: 'Depilación', subtitle: 'Suavidad y cuidado para tu piel con técnicas profesionales.', bg: 'white' },
        { id: 'maqui', name: 'Maquillaje', subtitle: 'Técnicas avanzadas para eventos inolvidables.', bg: 'pink' }
    ];

    const defaultServices = [
        { cat: 'unas', categoryDisplay: 'UÁ‘AS', title: 'Acrílicas Esculpidas', price: '$150.000 COP', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?q=80&w=800' },
        { cat: 'unas', categoryDisplay: 'UÁ‘AS', title: 'Esmaltado Semipermanente', price: '$80.000 COP', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800' },
        { cat: 'unas', categoryDisplay: 'PEDICURA', title: 'Spa de Pies Premium', price: '$90.000 COP', img: 'https://images.unsplash.com/photo-1516975080661-46bacc9ce604?q=80&w=800' },
        { cat: 'cejas', categoryDisplay: 'CEJAS "¢ PESTAÁ‘AS', title: 'Diseño de Cejas y Lifting', price: '$120.000 COP', img: 'https://images.unsplash.com/photo-1587900438138-660c238b1eb7?q=80&w=800' },
        { cat: 'cejas', categoryDisplay: 'PESTAÁ‘AS', title: 'Extensiones Volumen Ruso', price: '$180.000 COP', img: 'https://images.unsplash.com/photo-1512496015851-a1c8485ea4f8?q=80&w=800' },
        { cat: 'cabello', categoryDisplay: 'COLORACIÁ“N', title: 'Balayage Pro', price: '$300.000 COP', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800' },
        { cat: 'cabello', categoryDisplay: 'CABELLO', title: 'Alisado Brasileño (Keratina)', price: '$250.000 COP', img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800' },
        { cat: 'maqui', categoryDisplay: 'PIEL BLINDADA', title: 'Maquillaje Social', price: '$200.000 COP', img: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=800' },
        { cat: 'depil', categoryDisplay: 'DEPILACIÁ“N', title: 'Depilación con Cera', price: '$40.000 COP', img: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc206e?q=80&w=800' }
    ];
    
    // Init LocalStorage
    if (!localStorage.getItem('margarita_categories')) {
        localStorage.setItem('margarita_categories', JSON.stringify(defaultCategories));
    }
    if (!localStorage.getItem('margarita_services')) {
        localStorage.setItem('margarita_services', JSON.stringify(defaultServices));
    }

    const categories = JSON.parse(localStorage.getItem('margarita_categories'));
    const services = JSON.parse(localStorage.getItem('margarita_services'));

    // Migration patch: Force rename Estilismo to Cabello if found in old localStorage
    let needsMigration = false;
    categories.forEach(cat => {
        if (cat.id === 'cabello' && cat.name.includes('Estilismo')) {
            cat.name = 'Cabello & Color';
            needsMigration = true;
        }
    });
    if (needsMigration) {
        localStorage.setItem('margarita_categories', JSON.stringify(categories));
        // Also update default displays in services if needed
        services.forEach(s => {
            if (s.cat === 'cabello' && s.categoryDisplay === 'ESTILISMO') {
                s.categoryDisplay = 'CABELLO';
            }
        });
        localStorage.setItem('margarita_services', JSON.stringify(services));
    }
    // Motor global para el Slideshow de Especialidades (Rotación de Imágenes)
    window.initCategorySlideshows = () => {
        if (window._catSlideshowInterval) clearInterval(window._catSlideshowInterval);
        window._catSlideshowInterval = setInterval(() => {
            if (document.hidden) return; // Ahorro de recursos si no se ve
            const images = document.querySelectorAll('.cat-slideshow-img[data-slideshow]');
            images.forEach(img => {
                try {
                    const imgs = JSON.parse(img.getAttribute('data-slideshow'));
                    if (!imgs || imgs.length <= 1) return;
                    let idx = parseInt(img.getAttribute('data-slide-index')) || 0;
                    idx = (idx + 1) % imgs.length;
                    
                    // Efecto de desvanecimiento
                    img.style.opacity = '0';
                    setTimeout(() => {
                        img.src = imgs[idx];
                        img.setAttribute('data-slide-index', idx);
                        // Failsafe para asegurar que aparezca
                        const tempImg = new Image();
                        tempImg.onload = () => { img.style.opacity = '1'; };
                        tempImg.onerror = () => { img.style.opacity = '1'; }; 
                        tempImg.src = imgs[idx];
                    }, 400);
                } catch(e) {}
            });
        }, 3500);
    };

    // Dynamic Rendering Engine
    window.renderDynamicContent = function() {
        try {
        // Recargar datos frescos del localStorage cada vez que se renderiza
        const safeParse = (key, fallback) => {
            try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; }
            catch(e) { return fallback; }
        };
        const categoriesRaw = safeParse('margarita_categories', []);
        const servicesRaw = safeParse('margarita_services', []);

        const categories = categoriesRaw.filter(c => c.active !== false);
        const services = servicesRaw.filter(s => s.active !== false);

        // If no data, don't wipe the screen
        if (categories.length === 0 && services.length === 0) return;

        // DOM references - Only set innerHTML AFTER building is complete (no early clearing)

        // 1. Render Navs
        let navHtml = '<li><a href="#inicio">Inicio</a></li>';
        let mobileNavHtml = '<li><a href="#inicio">Para Ti</a></li>';
        
        const MAX_NAV_ITEMS = 5;
        const mainCategories = categories.slice(0, MAX_NAV_ITEMS);
        const extraCategories = categories.slice(MAX_NAV_ITEMS);

        mainCategories.forEach(cat => {
            const sectionId = `servicios-${cat.id}`;
            const shortName = cat.name.split(' ')[0];
            navHtml += `<li><a href="#${sectionId}">${shortName}</a></li>`;
        });

        if (extraCategories.length > 0) {
            navHtml += `
                <li class="nav-dropdown">
                    <a href="javascript:void(0)" class="dropdown-trigger" onclick="toggleNavDropdown(event)">Más <i class="fas fa-chevron-down" style="font-size:0.7rem; margin-left:3px;"></i></a>
                    <ul class="dropdown-menu" id="nav-dropdown-menu">
                        ${extraCategories.map(cat => `<li><a href="#servicios-${cat.id}">${cat.name}</a></li>`).join('')}
                    </ul>
                </li>`;
        }

        // Mobile Nav: All items
        categories.forEach(cat => {
            mobileNavHtml += `<li><a href="#servicios-${cat.id}">${cat.name}</a></li>`;
        });
        
        // 2. Render Categories Grid (Now Slider)
        let gridHtml = `
        <div class="container text-center reveal">
            <h2 class="section-title">Nuestras Especialidades</h2>
            <div class="carousel-wrapper">
                <button class="carousel-btn prev-btn-specialty"><i class="fas fa-chevron-left"></i></button>
                <div class="category-grid" id="specialty-carousel">`;
        
        // 3. Render Sections base
        let sectionsHtml = '';

        categories.forEach((cat, index) => {
            const sectionId = `servicios-${cat.id}`;
            const catServices = services.filter(s => s.cat === (cat.id || cat.name.toLowerCase()));
            
            // 🎲 Dynamic Category Image (Random from uploaded services)
            let catImg = "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&q=80&w=300"; // Fallback hair
            if(cat.id === 'unas') catImg = "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=300";
            if(cat.id === 'cejas') catImg = "https://images.unsplash.com/photo-1587900438138-660c238b1eb7?auto=format&fit=crop&q=80&w=300";
            if(cat.id === 'cabello') catImg = "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=300";
            if(cat.id === 'maqui') catImg = "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=300";

            let allCatImgs = [catImg];
            if (catServices.length > 0) {
                const validImgs = catServices.map(s => s.img).filter(img => img && img.trim() !== "");
                if (validImgs.length > 0) {
                    allCatImgs = [...new Set(validImgs)]; // Eliminar duplicados
                    catImg = allCatImgs[0];
                }
            }

            // Si hay más de una imagen, guardamos el array de imágenes en el div
            const imgDataAttr = allCatImgs.length > 1 ? `data-slideshow='${JSON.stringify(allCatImgs)}' data-slide-index="0"` : "";

            gridHtml += `
                <a href="#${sectionId}" class="category-item">
                    <div class="category-circle" style="background:#fcebed; position:relative;">
                        <img src="${catImg}" class="cat-slideshow-img" ${imgDataAttr} alt="${cat.name}" style="opacity:0; transition:opacity 0.8s ease-in-out;" onload="this.style.opacity='1'">
                    </div>
                    <h4>${cat.name.toUpperCase()}</h4>
                </a>`;
            
            const bgColor = cat.bg === 'white' ? 'var(--color-white)' : 'var(--color-bg)';
            const isSingle = catServices.length === 1;
            
            sectionsHtml += `
            <section class="services-luxury" id="${sectionId}" style="background-color: ${bgColor};">
                <div class="container text-center reveal">
                    <h2 class="luxury-title" style="font-size: 2rem;">${cat.name}</h2>
                    <p class="luxury-subtitle">${cat.subtitle}</p>
                    <div class="carousel-wrapper">
                        ${isSingle ? '' : '<button class="carousel-btn prev-btn"><i class="fas fa-chevron-left"></i></button>'}
                        <div class="luxury-carousel" ${isSingle ? 'style="justify-content: center;"' : ''}></div>
                        ${isSingle ? '' : '<button class="carousel-btn next-btn"><i class="fas fa-chevron-right"></i></button>'}
                    </div>
                </div>
            </section>`;
        });

        // Close Specialty Carousel AFTER loop
        gridHtml += `
                </div>
                <button class="carousel-btn next-btn-specialty"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>`;

        // All HTML built successfully - now paint the DOM (safe to clear here)
        const desktopNav = document.getElementById('dynamic-nav-links');
        const mobileNav = document.getElementById('dynamic-mobile-nav');
        const categoryGrid = document.getElementById('dynamic-categories-grid');
        const sectionsContainer = document.getElementById('dynamic-services-sections');

        if(desktopNav) desktopNav.innerHTML = navHtml;
        if(mobileNav) mobileNav.innerHTML = mobileNavHtml + `<li><a href="#galeria">Galería</a></li><li><a href="https://wa.me/573057726115" class="btn-primary" style="margin-top: 20px;">Agenda tu cita</a></li>`;

        // Inyectar HTML estructural inmediatamente (No más setTimeout/fadeOut para evitar pestañeo)
        if(categoryGrid) categoryGrid.innerHTML = gridHtml;
        if(sectionsContainer) sectionsContainer.innerHTML = sectionsHtml;

        // Renderizar Tarjetas de Servicios en sus respectivos Carruseles
        categories.forEach(cat => {
            const carousel = document.querySelector(`#servicios-${cat.id} .luxury-carousel`);
            if(!carousel) return;
            
            const catServices = services.filter(s => s.cat === cat.id);
            if(catServices.length === 0) {
                carousel.innerHTML = '<p style="padding:40px; color:#999;">Próximamente más servicios...</p>';
                return;
            }

            let cardsHtml = '';
            catServices.forEach(svc => {
              try {
                let promos = null;
                try {
                    const saved = localStorage.getItem('margarita_promos') || localStorage.getItem('margarita_promo');
                    if (saved) promos = JSON.parse(saved);
                } catch(e) { }

                let promoBadge = '';
                let finalPrice = svc.price;
                let priceHtml = `<div class="luxury-price" style="width:100%; text-align:center; margin-bottom: 2px;">PRECIO: ${svc.price}</div>`;
                
                let isInPromo = false;
                let discPercent = 0;

                if (promos) {
                    const d = promos.discount || (promos.mode !== 'combo' ? promos : null);
                    if (d && d.active) {
                        const isSvcMatch = Array.isArray(d.services) && d.services.includes(svc.title);
                        const isCatAll = d.category === 'all';
                        const isCatMatch = Array.isArray(d.category) ? d.category.includes(cat.id) : (d.category === cat.id);
                        
                        if (isSvcMatch || isCatAll || isCatMatch) {
                            isInPromo = true;
                            discPercent = parseInt(d.percent) || 0;
                        }
                    }
                }
                
                if (isInPromo && discPercent > 0) {
                    promoBadge = `<div style="position:absolute; top:10px; right:10px; background:var(--color-accent); color:white; padding:5px 12px; border-radius:30px; font-size:0.75rem; font-weight:700; z-index:2; box-shadow:0 4px 10px rgba(184,115,129,0.3);">¡OFERTA -${discPercent}%!</div>`;
                    
                    const priceStr = svc.price ? String(svc.price) : "0";
                    const originalPriceNum = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
                    if (!isNaN(originalPriceNum) && originalPriceNum > 0) {
                        const discount = Math.round((originalPriceNum * discPercent) / 100);
                        const discountedPrice = originalPriceNum - discount;
                        finalPrice = window.formatCurrency(discountedPrice);
                        priceHtml = `<div class="luxury-price" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center; width:100%;">
                                         <span style="text-decoration: line-through; opacity: 1; color: #999; font-size: 0.85rem; font-weight:500;">Antes: ${svc.price}</span>
                                         <span style="color:var(--color-accent); font-size: 1.15rem; font-weight: 900; letter-spacing: -0.5px;"> / AHORA: ${finalPrice}</span>
                                     </div>`;
                    }
                }

                cardsHtml += `
                <div class="luxury-card" style="position:relative;">
                    ${promoBadge}
                    <div class="luxury-card-category">${svc.categoryDisplay || cat.name.toUpperCase()}</div>
                        <div class="luxury-card-image" style="background:#fcebed;"><img src="${svc.img}" alt="${svc.title}" style="opacity:0; transition:opacity 0.6s;" onload="this.style.opacity='1'"></div>
                    <h3 class="luxury-card-title">${svc.title}</h3>
                    <div class="luxury-card-footer" style="flex-direction: column; align-items: center; gap: 15px; border-top: 1px solid rgba(229,169,180,0.15); padding-top: 1.2rem;">
                        <div style="width:100%; display:flex; justify-content:center; min-height: 2.2rem; align-items: center;">${priceHtml}</div>
                        <div style="display:flex; gap:10px; width:100%; height: 44px;">
                            <button onclick="addToCart('${(svc.title||'').replace(/'/g, "\\'")}', '${(svc.price||'').replace(/'/g, "\\'")}', '${(svc.img||'').replace(/'/g, "\\'")}', '${(svc.categoryDisplay || cat.name || '').replace(/'/g, "\\'")}', '${(svc.title||'').replace(/'/g, "\\'")}', '${(svc.cat||'').replace(/'/g, "\\'")}')" class="btn-reservar" style="flex:1; border-radius: 10px; font-weight: 800; letter-spacing: 0.5px; border: none; box-shadow: 0 4px 12px rgba(229, 169, 180, 0.4);">+ RESERVAR</button>
                            <button onclick="openServiceGallery('${(svc.cat||'').replace(/'/g, "\\'")}', '${(svc.title||'').replace(/'/g, "\\'")}', '${(svc.price||'').replace(/'/g, "\\'")}')" style="padding:0 15px; white-space:nowrap; background:var(--color-bg); color:var(--color-dark-pink); border:2px solid var(--color-accent); border-radius: 10px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.75rem; font-weight: 700; transition: 0.3s; cursor: pointer;" title="Ver galería de modelos de este servicio" onmouseover="this.style.background='var(--color-accent)'; this.style.color='white';" onmouseout="this.style.background='var(--color-bg)'; this.style.color='var(--color-dark-pink)';">
                                <i class="fas fa-camera-retro" style="font-size: 0.9rem;"></i> <span style="font-size: 0.65rem; font-weight: 800; opacity: 0.8; letter-spacing: 1px;">MÁS FOTOS</span>
                            </button>
                        </div>
                    </div>
                </div>`;
              } catch(svcErr) { console.error('Error building card for:', svc && svc.title, svcErr); }
            });
            carousel.innerHTML = cardsHtml;
        });

        // Re-bind Carousel Logic IMMEDIATELY after injection
        if(typeof initAllCarousels === 'function') initAllCarousels();

        // Inicializar Slideshow de las categorias (Especialidades)
        if (window.initCategorySlideshows) window.initCategorySlideshows();

        // Reveal elements instantly
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    } catch(e) {
        console.error('renderDynamicContent error:', e);
    }
};
    
    // Render Base immediately
    if (window.renderDynamicContent) {
        window.renderDynamicContent();
    }

  // --- Image Zoom (Lightbox) ---
window.openImageZoom = function(src) {
    const modal = document.getElementById('image-zoom-modal');
    const zoomedImg = document.getElementById('zoomed-image');
    if (!modal || !zoomedImg) return;
    
    zoomedImg.src = src;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scroll
}

window.closeImageZoom = function() {
    const modal = document.getElementById('image-zoom-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Add click listeners to all current and future images (via delegation or re-init)
function initImageZoom() {
    // For Service Cards
    document.addEventListener('click', (e) => {
        // If clicked on an image inside a service card or gallery
        if (e.target.tagName === 'IMG' && 
           (e.target.closest('.luxury-card-image') || e.target.closest('.results-grid'))) {
            openImageZoom(e.target.src);
        }
    });
}

// Initialize zoom listeners
initImageZoom();

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImageZoom();
});

    renderPublicGallery();

    function renderPublicGallery() {
        const container = document.getElementById('public-gallery-list');
        if (!container) return;

        const gallery = JSON.parse(localStorage.getItem('margarita_gallery') || '[]');
        if (gallery.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:40px; color:#aaa; font-style:italic;">Próximamente: Resultados reales de nuestras hermosas clientes.</p>';
            return;
        }

        let html = '';
        gallery.forEach(item => {
            html += `<img src="${item.img}" alt="Gallería Margaritasmit" class="reveal">`;
        });
        container.innerHTML = html;
        
        const wrapper = container.closest('.gallery-carousel-wrapper');
        if (wrapper) {
            const btns = wrapper.querySelectorAll('.gallery-nav-btn');
            if (gallery.length === 1) {
                btns.forEach(b => b.style.display = 'none');
                container.style.justifyContent = 'center';
            } else {
                btns.forEach(b => b.style.display = 'flex');
                container.style.justifyContent = 'flex-start';
            }
        }
        
        // Trigger reveal for new images
        const dynamicReveals = container.querySelectorAll('.reveal');
        const revealEffect = () => {
            dynamicReveals.forEach(reveal => {
                const elementTop = reveal.getBoundingClientRect().top;
                if (elementTop < window.innerHeight - 150) reveal.classList.add('active');
            });
        };
        window.addEventListener('scroll', revealEffect);
        revealEffect();
    }

    // Re-bind Carousel Logic (Wait a bit for DOM injection)
    setTimeout(() => {
        initAllCarousels();
    }, 400);

    /**
     * NAVEGACIÁ“N UNIVERSAL (Delegación de Eventos)
     * much more robust than individual listeners
     */
    document.addEventListener('click', (e) => {
        // 1. Specialty Slider Arrows
        if (e.target.closest('.prev-btn-specialty')) {
            const carousel = document.getElementById('specialty-carousel');
            if (carousel) carousel.scrollBy({ left: -300, behavior: 'smooth' });
        }
        if (e.target.closest('.next-btn-specialty')) {
            const carousel = document.getElementById('specialty-carousel');
            if (carousel) carousel.scrollBy({ left: 300, behavior: 'smooth' });
        }

        // 2. Service Slider Arrows (Luxury Sections + Specialty)
        const luxuryPrev = e.target.closest('.prev-btn, .prev-btn-specialty');
        const luxuryNext = e.target.closest('.next-btn, .next-btn-specialty');
        if (luxuryPrev || luxuryNext) {
            const wrapper = e.target.closest('.carousel-wrapper, .carousel-container');
            const carousel = wrapper ? wrapper.querySelector('.luxury-carousel, #specialty-carousel') : null;
            if (carousel) {
                const dir = luxuryNext ? 1 : -1;
                // Calculamos el índice actual basado en el ancho de una tarjeta + gap (32px aprox)
                const firstCard = carousel.querySelector('.luxury-card, .category-item');
                const scrollAmount = firstCard ? (firstCard.offsetWidth + 32) : 320;
                
                // Forzamos el aterrizaje en un múltiplo exacto para activar el imán del navegador (scroll-snap)
                const targetScroll = Math.round((carousel.scrollLeft + (dir * scrollAmount)) / scrollAmount) * scrollAmount;
                
                carousel.scrollTo({ 
                    left: targetScroll, 
                    behavior: 'smooth' 
                });
            }
        }
    });


    function initAllCarousels() {
        // Mostrar flechas solo cuando el carrusel esté listo (evita pestañeo de "doble flecha")
        document.querySelectorAll('.prev-btn-specialty, .next-btn-specialty').forEach(el => {
            el.style.opacity = '1';
        });
        console.log('🔄 All carousels ready with delegation');
    }

window.updateCartBadge = function() {
    const badge = document.getElementById('cart-count');
    const floatBtn = document.getElementById('cart-float-btn');
    const cartLen = (typeof cart !== 'undefined' && Array.isArray(cart)) ? cart.length : 0;
    
    if (cartLen > 0) {
        if (badge) {
            badge.style.display = 'flex';
            badge.innerText = cartLen;
            badge.classList.add('cart-animated');
        }
        if (floatBtn) floatBtn.classList.add('cart-animated');
    } else {
        if (badge) {
            badge.style.display = 'none';
            badge.classList.remove('cart-animated');
        }
        if (floatBtn) floatBtn.classList.remove('cart-animated');
    }
};

window.removeFromCart = function(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    window.updateCartBadge();
    window.renderCart();
};

window.toggleCart = function() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    const waFloat = document.querySelector('.whatsapp-float');
    const promoBubble = document.getElementById('promo-reminder-btn');
    
    if (drawer && drawer.style.display === 'none') {
        drawer.style.display = 'block';
        if (overlay) overlay.style.display = 'block';
        if (waFloat) waFloat.style.display = 'none';
        if (promoBubble) promoBubble.style.display = 'none';
        window.renderCart();
    } else if (drawer) {
        drawer.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if (waFloat) waFloat.style.display = 'flex';
        
        // Solo mostrar la burbuja al cerrar si hay una promo activa
        if (promoBubble) {
            const saved = localStorage.getItem('margarita_promos');
            const promos = saved ? JSON.parse(saved) : {};
            const isActive = (promos.combo?.active) || (promos.discount?.active);
            if (isActive) promoBubble.style.display = 'block';
        }
    }
};

// =============================================
// CART SYSTEM
// =============================================
let cart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
window.margaritaCart = cart; // Hacerlo accesible globalmente si otras funciones fuera del DOMContentLoaded lo necesitan

window.addToCart = function(serviceName, servicePrice, serviceImg, category, baseServiceTitle, catId) {
    const finalCategory = category || 'General';

    // Normalizador de texto
    const normalize = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const normCategory = normalize(finalCategory);

    const existingIndex = cart.findIndex(item => {
        // MATCH por Categoría: El usuario requiere reemplazar si elige otro servicio de la misma categoría
        const idMatch = (catId && item.catId === catId);
        const itemCat = normalize(item.category);
        const catMatch = (itemCat === normCategory && normCategory !== 'general' && normCategory !== '');
        
        return idMatch || catMatch;
    });
    
    // BUSCAMOS DURACIÁ“N REAL ANTES DE GUARDAR (CON TRADUCTOR DE HORAS)
    let serviceDuration = 60;
    try {
        const dbServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
        const normName = (serviceName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const match = dbServices.find(s => {
            const sT = (s.title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            return sT === normName || sT.includes(normName) || normName.includes(sT);
        });
        
        if (match && match.duration) {
            const dVal = match.duration.toString().toLowerCase();
            const dNum = parseInt(dVal);
            if (!isNaN(dNum)) {
                // Si dice "hora", multiplicamos por 60
                serviceDuration = dVal.includes('hora') ? dNum * 60 : dNum;
            }
        }
    } catch(e) {}
    
    if (existingIndex !== -1) {
        // ACTUALIZAMOS SI ES LA MISMA CATEGORIA (REEMPLAZO)
        cart[existingIndex].service = serviceName;
        cart[existingIndex].price = servicePrice;
        cart[existingIndex].img = serviceImg;
        cart[existingIndex].baseName = baseServiceTitle || serviceName;
        cart[existingIndex].category = finalCategory;
        cart[existingIndex].catId = catId || cart[existingIndex].catId;
        cart[existingIndex].duration = serviceDuration;
        
        window.renderCart();
        window.updateCartBadge();
        showToast("¡Servicio actualizado en tu paquete!", "success");
        return;
    }

    cart.push({
        id: Date.now().toString(),
        catId: catId, 
        service: serviceName,
        baseName: baseServiceTitle || serviceName,
        category: finalCategory,
        price: servicePrice,
        img: serviceImg,
        duration: serviceDuration,
        date: '',
        time: '',
        specialist: ''
    });
    
    window.updateCartBadge();
    window.renderCart();
    
    const floatBtn = document.getElementById('cart-float-btn');
    if (floatBtn) {
        floatBtn.style.transform = 'scale(1.15)';
        setTimeout(() => { floatBtn.style.transform = 'scale(1)'; }, 300);
    }

    showToast("¡Servicio añadido al paquete con éxito!", "success");
}

window.clearAllServicesTime = function() {
    if (!cart || cart.length === 0) return;
    let hasTime = false;
    cart.forEach(item => {
        if (item.time || item.date) hasTime = true;
        item.date = null;
        item.time = null;
        item.specialist = null;
    });
    window.comboAssignments = null; // Limpiar también los asignamientos inteligentes si existían
    
    if (hasTime) {
        localStorage.setItem('margarita_cart', JSON.stringify(cart));
        window.renderCart();
        if (typeof showToast !== 'undefined') showToast('Horarios limpios. Elige de nuevo. <i class="fas fa-check-circle" style="margin-left: 5px; color: var(--color-accent);"></i>', 'info-special');
    }
};

window.renderCart = function() {
    const container = document.getElementById('cart-items-container');
    const checkout = document.getElementById('cart-checkout');
    const globalSpecContainer = document.getElementById('cart-global-specialist-container');

    if (!container || !checkout) return;

    localStorage.setItem('margarita_cart', JSON.stringify(cart));

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa; padding:40px 0;">Tu carrito está vacío.<br>Agrega servicios con el botón RESERVAR.</p>';
        checkout.style.display = 'none';
        return;
    }

    checkout.style.display = 'block';
    
    if (globalSpecContainer) {
        globalSpecContainer.style.display = cart.length > 1 ? 'none' : 'block';
    }
    const today = new Date().toISOString().split('T')[0];
    const cartTitle = cart.length > 1 ? `PAQUETE: ${cart.length} Servicios` : 'Tu Resumen de Servicios';
    let html = `
    <div class="booking-step-title" style="margin-top:10px; border-top:1px solid #eee; padding-top:15px; margin-bottom:15px; display:flex; align-items:center; gap:10px;">
        <div><i class="fas fa-list-ul"></i> ${cartTitle}</div>
    </div>
    `;

    // --- LÁ“GICA DE PROMOCIONES DUALES INDEPENDIENTES ---
    let promos = null;
    try {
        const saved = localStorage.getItem('margarita_promos');
        if (saved) promos = JSON.parse(saved);
        else {
            const old = localStorage.getItem('margarita_promo');
            if (old) {
                const p = JSON.parse(old);
                promos = { discount: { active: false }, combo: { active: false } };
                if (p.mode === 'combo') promos.combo = p;
                else promos.discount = p;
            }
        }
    } catch(e){}

    const safeParse = (key, fallback) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch(e) { return fallback; }
    };

    const categoriesList = safeParse('margarita_categories', []);
    const dbServices = safeParse('margarita_services', []);
    const allSpecs = safeParse('margarita_specialists', []);
    const agendaData = safeParse('margarita_appointments', []);
    const timeToMins = (t) => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };

    let comboDiscount = 0;
    let itemsInCombo = new Set(); 

    // 1. EVALUAR COMBO
    if (promos && promos.combo && promos.combo.active) {
        // Validar vencimiento global (Hora actual)
        if (promos.combo.expiry && new Date(promos.combo.expiry) < new Date()) {
            // Expirado, no hacer nada
        } else {
            const comboCatIds = promos.combo.category || [];
        const comboSvcTitles = promos.combo.services || [];
        const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
        const cartCatIds = cart.map(item => {
            if (item.catId) return item.catId;
            const normName = normalize(item.category);
            const match = categoriesList.find(c => normalize(c.name) === normName);
            return match ? match.id : null;
        });
        const cartSvcTitles = cart.map(item => item.service);

        const catsMet = comboCatIds.length === 0 || comboCatIds.every(id => cartCatIds.includes(id));
        const svcsMet = comboSvcTitles.length === 0 || comboSvcTitles.every(title => cartSvcTitles.includes(title));

        if (catsMet && svcsMet && (comboCatIds.length > 0 || comboSvcTitles.length > 0)) {
            const comboPriceStr = promos.combo.comboPrice || promos.combo.price || "0";
            const comboPriceNum = parseInt(comboPriceStr.toString().replace(/[^0-9]/g, '')) || 0;
            let normalComboTotal = 0;
            
            // Collect all unique items that satisfy the requirements
            const usedInCombo = new Set();

            // First, satisfy specific services
            comboSvcTitles.forEach(title => {
                const itemIdx = cart.findIndex((item, i) => !usedInCombo.has(i) && item.service === title);
                if (itemIdx !== -1) {
                    const priceStr = cart[itemIdx].price || "0";
                    normalComboTotal += (parseInt(priceStr.toString().replace(/[^0-9]/g, '')) || 0);
                    usedInCombo.add(itemIdx);
                    itemsInCombo.add(itemIdx);
                }
            });

            // Then, satisfy categories (if not already satisfied by specific services)
            comboCatIds.forEach(id => {
                const itemIdx = cart.findIndex((item, i) => {
                    if (usedInCombo.has(i)) return false;
                    const currentId = item.catId || categoriesList.find(c => normalize(c.name) === normalize(item.category))?.id;
                    return currentId === id;
                });
                if (itemIdx !== -1) {
                    const priceStr = cart[itemIdx].price || "0";
                    normalComboTotal += (parseInt(priceStr.toString().replace(/[^0-9]/g, '')) || 0);
                    usedInCombo.add(itemIdx);
                    itemsInCombo.add(itemIdx);
                }
            });
            comboDiscount = normalComboTotal - comboPriceNum;

            // --- NUEVA VALIDACIÁ“N: Si al menos un servicio del combo está fuera de la fecha/hora, invalidar TODO el combo ---
            if (promos.combo.expiry) {
                const expiryDate = new Date(promos.combo.expiry);
                let allComboItemsValid = true;
                for (let idx of itemsInCombo.values()) {
                    const item = cart[idx];
                    if (item.date && item.time) {
                        const isoDate = window.normDateToISO(item.date);
                        const cleanTime = item.time.split(' ')[0].padStart(5, '0');
                        const apptFullDate = new Date(`${isoDate}T${cleanTime}`);
                        
                        if (apptFullDate > expiryDate) {
                            allComboItemsValid = false;
                            break;
                        }
                    }
                }
                
                if (!allComboItemsValid) {
                    comboDiscount = 0;
                    itemsInCombo.clear();
                }
            }
        }
    }
}

    // 2. EVALUAR DESCUENTOS INDIVIDUALES
    let individualDiscountsTotal = 0;
    const discountActive = promos && promos.discount && promos.discount.active;
    const discountPercent = discountActive ? parseInt(promos.discount.percent) || 0 : 0;
    const discountCategories = (promos && promos.discount && promos.discount.category) || [];

    let totalOriginal = 0;

    cart.forEach((item, index) => {
        try {
            const priceNum = parseInt((item.price || "0").toString().replace(/[^0-9]/g, '')) || 0;
            totalOriginal += priceNum;
            
            let isPartOfCombo = itemsInCombo.has(index);
            let isDiscounted = false;
            let currentItemDiscount = 0;

            const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
            const currentItemCatId = item.catId || categoriesList.find(c => normalize(c.name) === normalize(item.category))?.id;

            if (!isPartOfCombo && discountActive) {
                const isCatAll = discountCategories === 'all';
                const discountServices = (promos && promos.discount && promos.discount.services) || [];
                const isServiceDirectlyDiscounted = Array.isArray(discountServices) && (discountServices.includes(item.service) || (item.baseName && discountServices.includes(item.baseName)));

                if (isServiceDirectlyDiscounted || isCatAll || (Array.isArray(discountCategories) && discountCategories.includes(currentItemCatId))) {
                    
                    // REGLA CLAVE: Verificar si la CITA es antes del vencimiento
                    let isApptValidForPromo = true;
                    if (item.date && item.time && promos.discount.expiry) {
                        const isoDate = window.normDateToISO(item.date);
                        // Limpiar 'AM/PM' y convertir a 24h para comparación correcta
                        let [h, m] = item.time.split(':');
                        let minutes = m.substring(0,2);
                        let hours = parseInt(h);
                        if (item.time.toLowerCase().includes('pm') && hours < 12) hours += 12;
                        if (item.time.toLowerCase().includes('am') && hours === 12) hours = 0;
                        const cleanTime = `${hours.toString().padStart(2,'0')}:${minutes}`;
                        
                        const apptFullDate = new Date(`${isoDate}T${cleanTime}`);
                        const expiryDate = new Date(promos.discount.expiry);
                        
                        if (apptFullDate > expiryDate) {
                            isApptValidForPromo = false;
                        }
                    }

                    if (isApptValidForPromo) {
                        currentItemDiscount = Math.round(priceNum * (discountPercent / 100));
                        individualDiscountsTotal += currentItemDiscount;
                        isDiscounted = true;
                    }
                }
            }

            let specialistHtml = '';
            // Si ya hay un profesional elegido (desde la agenda), lo mostramos elegante
            if (item.specialist) {
                specialistHtml = `
                <div style="margin-top:10px; background:rgba(0,0,0,0.03); padding:8px 12px; border-radius:10px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-user-check" style="color:var(--color-accent); font-size:0.85rem;"></i>
                    <span style="font-size:0.8rem; color:#666; font-weight:700;">Profesional: <span style="color:#1a1a1a;">${item.specialist}</span></span>
                </div>`;
            } else {
                specialistHtml = `
                <div style="margin-top:10px; opacity:0.6; padding:8px 12px;">
                    <span style="font-size:0.75rem; color:#999;"><i class="fas fa-info-circle"></i> Selecciona un horario para asignar profesional automáticamente.</span>
                </div>`;
            }

            const displayedPrice = isDiscounted ? window.formatCurrency(priceNum - currentItemDiscount) : item.price;
            let badgeHtml = isPartOfCombo ? `<span style="color:#fff; font-weight:800; font-size:0.7rem; background:var(--color-dark-pink); padding:3px 8px; border-radius:5px; margin-left:10px; letter-spacing:1px;">COMBO</span>` :
                           (isDiscounted ? `<span style="color:#2ecc71; font-weight:800; font-size:0.75rem; background:rgba(46, 204, 113, 0.1); padding:2px 6px; border-radius:5px; margin-left:10px;">-${discountPercent}%</span>` : '');

            const today = new Date().toISOString().split('T')[0];
            let dateTimeHtml = `
            <div style="margin-top:10px; width:100%; background:rgba(255,255,255,0.5); padding:10px; border-radius:12px; border:1px solid #f0f0f0;">
                <label style="font-size:0.75rem; color:#888; display:block; margin-bottom:8px; font-weight:700;"><i class="far fa-calendar-check" style="color:var(--color-accent);"></i> Tu Cita Reservada</label>
                <button onclick="window.openPublicVisualAgenda('${item.id}')" class="booking-input ${item.date && item.time ? 'selected-valid' : ''}" style="width:100%; padding:12px; font-size:0.85rem; border:1px solid ${item.time ? 'var(--color-accent)' : '#ddd'}; border-radius:10px; cursor:pointer; background:white; text-align:left; display:flex; justify-content:space-between; align-items:center; transition:all 0.3s ease; box-shadow:0 3px 10px rgba(0,0,0,0.02);">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:800; color:${item.date ? '#1a1a1a' : '#aaa'}; font-size:0.9rem;">
                            ${item.date ? (item.date.includes('-') ? item.date.split('-').reverse().join('/') : item.date) : 'Elegir Día y Hora...'}
                        </span>
                        ${item.time ? `<span style="font-size:0.75rem; color:var(--color-dark-pink); font-weight:700; margin-top:2px;"><i class="far fa-clock"></i> Hora: ${window.formatTime12h(item.time)}</span>` : ''}
                    </div>
                    <i class="fas fa-calendar-plus" style="color:var(--color-accent); font-size:1.1rem; opacity:0.8;"></i>
                </button>
            </div>`;

            html += `
            <div class="cart-item" style="border-bottom: 2px solid #eee; padding-bottom: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:start; gap:15px; margin-bottom:5px;">
                    <div style="width:60px; height:60px; border-radius:12px; overflow:hidden; border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                        <img src="${item.img}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:0.7rem; color:var(--color-accent); font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">${item.category}</div>
                        <div style="font-weight:700; color:#1a1a1a; font-size:0.95rem; line-height:1.2;">${item.service} ${badgeHtml}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:700; color:var(--color-dark-pink); margin-top:4px;">${isPartOfCombo ? 'Precio en Combo' : displayedPrice}</div>
                            ${(() => {
                                // Buscador de duración VIP (Prioriza exacto)
                                let d = 60;
                                try {
                                    const dbS = JSON.parse(localStorage.getItem('margarita_services') || '[]');
                                    const norm = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                                    const target = norm(item.service);
                                    
                                    // 1. Buscamos primero coincidencia EXACTA
                                    let match = dbS.find(s => norm(s.title) === target);
                                    
                                    // 2. Si no hay exacta, buscamos parcial
                                    if (!match) {
                                        match = dbS.find(s => {
                                            const st = norm(s.title);
                                            return st.includes(target) || target.includes(st);
                                        });
                                    }

                                    if (match && match.duration) {
                                        const val = match.duration.toString().toLowerCase();
                                        const num = parseInt(val);
                                        d = val.includes('hora') ? num * 60 : num;
                                    } else if (item.duration) {
                                        d = item.duration;
                                    }
                                } catch(e) {}
                                return `<div style="font-size:0.65rem; color:#888; font-weight:700; background:rgba(0,0,0,0.03); padding:2px 6px; border-radius:5px;"><i class="fas fa-clock"></i> ${d} min</div>`;
                            })()}
                        </div>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" style="background:none; border:none; color:#d9534f; cursor:pointer; font-size:1.1rem; opacity:0.6;"><i class="fas fa-times-circle"></i></button>
                </div>
                ${dateTimeHtml}
                ${specialistHtml}
            </div>`;
        } catch(e) {
            console.error("Error rendering cart item", item, e);
        }
    });

    html += `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-top:10px;">
        ${cart.some(item => item.time) ? `
        <button onclick="window.clearAllServicesTime()" style="background:none; border:none; color:#d9534f; cursor:pointer; font-size:0.75rem; text-decoration:underline;">
            <i class="fas fa-eraser"></i> LIMPIAR HORARIOS
        </button>` : `<div></div>`}
        <button onclick="clearCart()" style="background:none; border:none; color:#888; cursor:pointer; font-size:0.75rem; text-decoration:underline;">
            <i class="fas fa-trash-alt"></i> VACIAR TODO EL CARRITO
        </button>
    </div>`;

    container.innerHTML = html;

    const totalAhorro = comboDiscount + individualDiscountsTotal;
    const finalTotalVal = totalOriginal - totalAhorro;
    const finalTotalFormatted = window.formatCurrency(finalTotalVal);

    let totalHtml = '';
    if (totalAhorro > 0) {
        let ahorroDetails = [];
        if (comboDiscount > 0) ahorroDetails.push(`Combo Pack`);
        if (individualDiscountsTotal > 0) ahorroDetails.push(`Descuentos %`);
        
        totalHtml = `
        <div style="background:rgba(46, 204, 113, 0.1); border:1px dashed #2ecc71; border-radius:10px; padding:12px; margin-bottom:15px; text-align:center; color:#27ae60; font-size:0.85rem;">
            <div style="font-weight:800; margin-bottom:2px;">¡MÁXIMO AHORRO APLICADO!</div>
             Estás ahorrando <strong>${window.formatCurrency(totalAhorro)}</strong> (${ahorroDetails.join(' + ')})
        </div>`;
    }

    totalHtml += `
    <div style="background:linear-gradient(135deg, var(--color-accent), var(--color-dark-pink)); border-radius:12px; padding:18px; margin-top:5px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 10px 20px rgba(184,115,129,0.2);">
        <span style="color:#fff; font-family:var(--font-heading); font-size:1.15rem; letter-spacing:1px;">TOTAL A PAGAR:</span>
        <span style="color:#fff; font-weight:800; font-size:1.4rem;">${finalTotalFormatted}</span>
    </div>`;
    
    container.innerHTML += totalHtml;
}

window.clearCart = function() {
    cart = [];
    updateCartBadge();
    renderCart();
    localStorage.removeItem('margarita_cart');
}

window.setGlobalSchedule = function(field, value) {
    if (field === 'date') {
        const isSalonOpen = localStorage.getItem('margarita_salon_open') !== 'false';
        if (!isSalonOpen) {
            const closureData = localStorage.getItem('margarita_closure_dates');
            if (closureData) {
                try {
                    const parsed = JSON.parse(closureData);
                    if (value >= parsed.start && value <= parsed.end) {
                        const isMob = window.innerWidth < 768;
                        const fmt = d => d ? d.split('-').reverse().join('/') : d;
                        const msg = isMob
                            ? `🔒 Cerrado: ${fmt(parsed.start)} – ${fmt(parsed.end)}`
                            : `El salón está cerrado del ${fmt(parsed.start)} al ${fmt(parsed.end)}. Elige una fecha posterior.`;
                        showToast(msg, "error");
                        renderCart();
                        return;
                    }
                } catch (e) {}
            } else {
                // Salón cerrado sin rango específico: bloquear cualquier fecha
                const isMob = window.innerWidth < 768;
                showToast(isMob ? '🔒 Salón cerrado' : 'El salón está cerrado. No se pueden agendar citas en este momento.', 'error');
                renderCart();
                return;
            }
        }
    }
    cart.forEach(item => {
        item[field] = value;
    });
    renderCart();
}

window.updateCartItem = function(itemId, field, value) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    item[field] = value;
    renderCart();
}

window.sendCartToWhatsApp = async function() {
    const name = document.getElementById('cart-client-name').value.trim();
    const phone = document.getElementById('cart-client-phone').value.trim();
    const sendBtn = document.querySelector('.whatsapp-btn');
    
    if (!name || name.length < 3) { showToast('Por favor escribe tu nombre completo.', 'error'); return; }
    if (!phone || phone.length !== 10) { showToast('El número de celular debe tener exactamente 10 dígitos (Ej: 3057726115).', 'error'); return; }

    // Feedback visual inmediato
    const originalBtnText = sendBtn ? sendBtn.innerHTML : '';
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando disponibilidad...';
        sendBtn.style.opacity = '0.7';
    }

    // Validar que TODOS los servicios tengan profesional, fecha y hora (asignados desde la agenda)
    if (cart.some(item => !item.specialist || !item.date || !item.time)) {
        showToast('Por favor toca el botón del calendario en cada servicio para elegir profesional y horario.', 'error');
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = originalBtnText; sendBtn.style.opacity = '1'; }
        return;
    }

    // ♥ GUARDIA FINAL DE CIERRE: verificar todas las fechas del carrito contra el cierre activo
    const _isSalonOpen = localStorage.getItem('margarita_salon_open') !== 'false';
    if (!_isSalonOpen) {
        const _closureRaw = localStorage.getItem('margarita_closure_dates');
        const _isMob = window.innerWidth < 768;
        let _blocked = false;
        let _closureMsg = _isMob ? '🔒 Salón cerrado' : 'El salón está cerrado. No se pueden agendar citas en este momento.';
        if (_closureRaw) {
            try {
                const _cls = JSON.parse(_closureRaw);
                if (cart.some(item => item.date && item.date >= _cls.start && item.date <= _cls.end)) {
                    const fmt = d => d ? d.split('-').reverse().join('/') : d;
                    _closureMsg = _isMob
                        ? `🔒 Cerrado: ${fmt(_cls.start)} – ${fmt(_cls.end)}`
                        : `El salón estará cerrado del ${fmt(_cls.start)} al ${fmt(_cls.end)}. Elige fechas posteriores.`;
                    _blocked = true;
                }
            } catch(e) { _blocked = true; }
        } else {
            _blocked = true; // Cerrado sin rango: bloquear todo
        }
        if (_blocked) {
            showToast(_closureMsg, 'error');
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = originalBtnText; sendBtn.style.opacity = '1'; }
            return;
        }
    }

    // Asignar los especialistas definitivos y calcular duraciones reales
    const dbServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
    const businessName = localStorage.getItem('margarita_site_name') || "Margarita Studio";
    cart.forEach(item => {
        item._finalSpecialist = item.specialist === "Sin preferencia" ? businessName : item.specialist;
        
        // Calcular duración real buscando en la base de datos de servicios
        let d = 60;
        const norm = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const target = norm(item.service);
        const match = dbServices.find(s => norm(s.title) === target) || dbServices.find(s => norm(s.title).includes(target) || target.includes(norm(s.title)));

        if (match && match.duration) {
            d = window.getDurationInMins(match.duration, item.service);
        } else if (item.duration) {
            d = window.getDurationInMins(item.duration, item.service);
        }
        item._calculatedDuration = d;
    });
    
    try {
    const timeToMins = (timeStr) => {
        if (!timeStr || !timeStr.includes(':')) return 0;
        let [h, m] = (timeStr || "00:00").split(':');
        h = parseInt(h) || 0;
        m = parseInt(m) || 0;
        if (timeStr.toLowerCase().includes('pm') && h < 12) h += 12;
        if (timeStr.toLowerCase().includes('am') && h === 12) h = 0;
        return h * 60 + m;
    };
    
    const nowObj = new Date();
    const todayStr = nowObj.getFullYear() + '-' + String(nowObj.getMonth() + 1).padStart(2,'0') + '-' + String(nowObj.getDate()).padStart(2,'0');
    const currentMins = nowObj.getHours() * 60 + nowObj.getMinutes();

    let allValid = true;
    let timeValid = true;
    let pastValid = true;
    let invalidService = "";
    
    cart.forEach(item => {
        if (!item.date || !item.time) allValid = false;
        if (item.time) {
            const m = timeToMins(item.time);
            if (m < 420 || m > 1200) timeValid = false;
        }
        
        // Block past times if today
        if (item.date === todayStr && item.time) {
            if (timeToMins(item.time) < currentMins) {
                pastValid = false;
                invalidService = item.service;
            }
        }
    });

    if (!allValid) {
        showToast('Por favor completa fecha y hora para todos los servicios.', 'error');
        return;
    }

    if (!timeValid) {
        showToast('El horario de atención es de 07:00 AM a 08:00 PM.', 'error');
        return;
    }
    
    if (!pastValid) {
        showToast(`La hora para "${invalidService}" ya pasó. Elige una hora futura.`, 'error');
        return;
    }
    
    // Grupo de reserva
    const groupId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    // SOLUCIÁ“N UNIVERSAL SAFARI/iOS: Abrir ventana en blanco de forma SÁNCRONA ahora
    // (antes de cualquier await), ya que Safari requiere que window.open esté en 
    // el mismo contexto del gesto del usuario. Luego le asignaremos la URL.
    const waWindow = window.open('', '_blank');
    if (waWindow) {
        waWindow.document.write('<html><body style="font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f0f0f0;"><p style="font-size:1.2rem; color:#555;">Preparando tu mensaje de WhatsApp... ✨</p></body></html>');
    }

    // --- VALIDACIÁ“N DE SOLAPAMIENTO EN TIEMPO REAL (NUBE) ---
    showToast("Verificando disponibilidad en la nube...", "success");
    const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    
    let cloudApts = [];
    if (window.loadListFromCloud) {
        cloudApts = await window.loadListFromCloud('citas_v2') || [];
    } else {
        cloudApts = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');
    }

    let overlap = false;
    let conflictSvc = "";
    
    for (const item of cart) {
        const cStart = timeToMins(item.time);
        const cDur = item._calculatedDuration || 60;
        const cEnd = cStart + cDur;
        const cSpec = normalize(item._finalSpecialist);
        
        // Normalizar la fecha del carrito para compararla correctamente con la BDD
        let cDate = item.date;
        if (cDate && cDate.indexOf('/') !== -1) {
            // Convierte DD/MM/YYYY a YYYY-MM-DD
            const p = cDate.split('/');
            if(p.length === 3) cDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        } else if (cDate && cDate.split('-')[0].length !== 4) {
            // Convierte DD-MM-YYYY a YYYY-MM-DD
            const p = cDate.split('-');
            if(p.length === 3) cDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }

        const isBusy = cloudApts.some(a => {
            // Filtrar canceladas/rechazadas o finalizadas (accepted) para liberar espacio real
            if (a.status === 'cancelled' || a.status === 'rejected' || a.status === 'accepted') return false;
            
            // Normalizar la fecha de la base de datos para la comparación
            let aDate = a.date;
            if (aDate && aDate.indexOf('/') !== -1) {
                const p = aDate.split('/');
                if(p.length === 3) aDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
            } else if (aDate && aDate.split('-')[0].length !== 4) {
                const p = aDate.split('-');
                if(p.length === 3) aDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
            }

            if (aDate !== cDate || normalize(a.specialist||"") !== cSpec) return false;
            
            const aStart = timeToMins(a.time);
            const aDur = parseInt(a.duration || window.getDurationInMins(null, a.service) || 60);
            const aEnd = aStart + aDur;
            
            // Lógica de Solapamiento
            return (cStart < aEnd && cEnd > aStart);
        });

        if (isBusy) {
            overlap = true;
            conflictSvc = item.service;
            break;
        }
    }

    if (overlap) {
        showToast(`¡Uy! El horario para "${conflictSvc}" acaba de ser reservado por otra persona. Elige otro horario para ese servicio.`, 'error');
        // Restaurar botón
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalBtnText;
            sendBtn.style.opacity = '1';
        }
        // Actualizar datos locales con los nuevos de la nube para que vea el espacio ocupado
        localStorage.setItem('margarita_appointments', JSON.stringify(cloudApts));
        if (waWindow) waWindow.close();
        return; // ABORTA EL PAGO
    }

    // --- PRECALCULAR PRECIOS CON DESCUENTO Y COMBOS ---
    const promos = JSON.parse(localStorage.getItem('margarita_promos') ||'{}');
    const categoriesList = JSON.parse(localStorage.getItem('margarita_categories') ||'[]');
    
    let comboActive = false;
    let comboPriceNum = 0;
    let comboOriginalTotal = 0;
    let itemsInComboIdx = new Set();

    if (promos.combo && promos.combo.active) {
        const comboCatIds = promos.combo.category || [];
        const comboSvcTitles = promos.combo.services || [];
        const cartCatIds = cart.map(item => item.catId || categoriesList.find(c => normalize(c.name) === normalize(item.category))?.id);
        const cartSvcTitles = cart.map(item => item.service);
        
        const catsMet = comboCatIds.length === 0 || comboCatIds.every(id => cartCatIds.includes(id));
        const svcsMet = comboSvcTitles.length === 0 || comboSvcTitles.every(title => cartSvcTitles.includes(title));

        if (catsMet && svcsMet && (comboCatIds.length > 0 || comboSvcTitles.length > 0)) {
            comboActive = true;
            comboPriceNum = parseInt((promos.combo.comboPrice || promos.combo.price || "0").toString().replace(/\D/g, '')) || 0;
            
            // First satisfy specific services
            comboSvcTitles.forEach(title => {
                const itemIdx = cart.findIndex((item, i) => !itemsInComboIdx.has(i) && item.service === title);
                if (itemIdx !== -1) {
                    const itemRawPrice = (cart[itemIdx].price || "0").toString();
                    comboOriginalTotal += (parseInt(itemRawPrice.replace(/\D/g, '')) || 0);
                    itemsInComboIdx.add(itemIdx);
                }
            });
            // Then satisfy categories
            comboCatIds.forEach(id => {
                const itemIdx = cart.findIndex((item, i) => {
                    if (itemsInComboIdx.has(i)) return false;
                    const cId = item.catId || categoriesList.find(c => normalize(c.name) === normalize(item.category))?.id;
                    return cId === id;
                });
                if (itemIdx !== -1) {
                    const itemRawPrice = (cart[itemIdx].price || "0").toString();
                    comboOriginalTotal += (parseInt(itemRawPrice.replace(/\D/g, '')) || 0);
                    itemsInComboIdx.add(itemIdx);
                }
            });

            // --- NUEVA VALIDACIÁ“N: Si al menos un servicio del combo está fuera de la fecha/hora, invalidar TODO el combo ---
            if (promos.combo.expiry) {
                const expiryDate = new Date(promos.combo.expiry);
                let allComboItemsValid = true;
                for (let idx of itemsInComboIdx) {
                    const item = cart[idx];
                    if (item.date && item.time) {
                        const isoDate = window.normDateToISO(item.date);
                        const cleanTime = item.time.split(' ')[0].padStart(5, '0');
                        const apptFullDate = new Date(`${isoDate}T${cleanTime}`);
                        
                        if (apptFullDate > expiryDate) {
                            allComboItemsValid = false;
                            break;
                        }
                    }
                }
                
                if (!allComboItemsValid) {
                    comboActive = false;
                    itemsInComboIdx.clear();
                    comboOriginalTotal = 0;
                }
            }
        }
    }

    const discActive = promos.discount && promos.discount.active;
    const discPercent = discActive ? parseInt(promos.discount.percent) || 0 : 0;
    const discCats = promos.discount?.category || [];

    // Save all items to admin agenda (ya validados)
    // Usamos el listado de la nube (cloudApts) en lugar del local para evitar destruir reservaciones
    // paralelas de otras personas que hayan agendado unos minutos antes!
    let agenda = [...cloudApts]; 
    cart.forEach((item, index) => {
        const originalPriceNum = parseInt((item.price || "0").toString().replace(/\D/g, '')) || 0;
        let finalSplitPrice = null; // Default to null for independent services

        const discSvcs = (promos.discount && promos.discount.services) || [];
        // Validar contra baseName para servicios de galería
        const nameToMatch = item.baseName || item.service;
        const isSvcMatch = Array.isArray(discSvcs) && discSvcs.includes(nameToMatch);

        if (itemsInComboIdx.has(index)) {
            // REGLA DE TRES PROPORCIONAL PARA COMBOS
            // (Precio Original del Item / Total Original del Pack) * Precio Final del Combo
            if (comboOriginalTotal > 0) {
                finalSplitPrice = Math.round(originalPriceNum * (comboPriceNum / comboOriginalTotal));
            }
        } else if (discActive && (isSvcMatch || discCats === 'all' || (Array.isArray(discCats) && discCats.includes(item.catId)))) {
            // DESCUENTO PORCENTUAL SIMPLE: Validar fecha/hora también AQUÍ al guardar
            let isApptValidForPromo = true;
            if (item.date && item.time && promos.discount.expiry) {
                const isoDate = window.normDateToISO(item.date);
                let [h, m] = item.time.split(':');
                let minutes = m.substring(0,2);
                let hours = parseInt(h);
                if (item.time.toLowerCase().includes('pm') && hours < 12) hours += 12;
                if (item.time.toLowerCase().includes('am') && hours === 12) hours = 0;
                const cleanTime = `${hours.toString().padStart(2,'0')}:${minutes}`;
                
                const apptFullDate = new Date(`${isoDate}T${cleanTime}`);
                if (apptFullDate > new Date(promos.discount.expiry)) {
                    isApptValidForPromo = false;
                }
            }

            if (isApptValidForPromo) {
                const discountAmount = Math.round(originalPriceNum * (discPercent / 100));
                finalSplitPrice = originalPriceNum - discountAmount;
            }
        }

        // Convertir item.date a formato Estandar YYYY-MM-DD
        let finalItemDate = item.date;
        if (finalItemDate && finalItemDate.indexOf('/') !== -1) {
            const p = finalItemDate.split('/');
            if(p.length === 3) finalItemDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        } else if (finalItemDate && finalItemDate.split('-')[0].length !== 4) {
            const p = finalItemDate.split('-');
            if(p.length === 3) finalItemDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }

        agenda.unshift({
            id: item.id,
            groupId: groupId, 
            service: item.service,
            category: item.category || 'General',
            price: item.price, // Mantiene el precio facial/original
            splitPrice: finalSplitPrice, // EL QUE SE LE PAGA AL PROFESIONAL (VALOR REAL)
            promoType: itemsInComboIdx.has(index) ? 'combo' : (finalSplitPrice !== null ? 'discount' : null),
            img: item.img,
            name: name,
            phone: phone,
            date: finalItemDate,
            time: item.time,
            duration: item._calculatedDuration || 60,
            specialist: item._finalSpecialist,
            manual: false,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    });
    localStorage.setItem('margarita_appointments', JSON.stringify(agenda));
    
    // Cloud Sync: Guardar cita en la nube antes de que móvil pause el navegador
    if (window.saveListToCloud) {
        showToast("Guardando reserva de forma segura...", "success");
        await window.saveListToCloud('citas_v2', agenda);
    }
    
    // Helper to format 24h to 12h (AM/PM)
    const format12h = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    // Build WhatsApp message
    const savedWa = localStorage.getItem('margarita_whatsapp_number') || "3057726115";
    const businessName = localStorage.getItem('margarita_site_name') || "Margarita Studio";
    let cleanNum = savedWa.replace(/\D/g, '');
    const waNumber = cleanNum.length === 10 ? "57" + cleanNum : cleanNum;
    let waText = encodeURIComponent(`Hola ${businessName}!\n\n*Mi Nombre:* ${name}\n*Celular:* ${phone}\n\nQuiero agendar los siguientes servicios:\n`);
    
    // --- NUEVO REDONDEO DE PRECIO (REUSANDO VALORES CALCULADOS) ---
    // (promos, categoriesList, normalize ya declarados arriba)
    
    let totalOriginal = 0;
    cart.forEach(i => {
        const pStr = (i.price || "0").toString();
        totalOriginal += (parseInt(pStr.replace(/\D/g,'')) || 0);
    });

    // Reutilizar comboDiscount ya calculado arriba o recalcular si es necesario
    // Para simplificar, usaremos los flags ya establecidos (comboActive, discActive, etc)
    let totalComboDiscount = 0;
    if (comboActive) {
        totalComboDiscount = comboOriginalTotal - comboPriceNum;
    }
    
    // Lógica Descuento Individual (Reusando discCats etc)
    let totalIndividualDiscounts = 0;

    let counter = 1;
    cart.forEach((item, index) => {
        const pNum = parseInt((item.price || "0").toString().replace(/\D/g, '')) || 0;
        const startT = window.formatTime12h(item.time);
        const dur = item._calculatedDuration || 60;
        const endM = timeToMins(item.time) + dur;
        const endT = window.formatTime12h(`${Math.floor(endM/60).toString().padStart(2,'0')}:${(endM%60).toString().padStart(2,'0')}`);
        
        let finalItemPriceStr = item.price;
        const discSvcs = (promos.discount && promos.discount.services) || [];
        const nameToMatch = item.baseName || item.service;
        const isSvcMatch = Array.isArray(discSvcs) && discSvcs.includes(nameToMatch);

        if (itemsInComboIdx.has(index)) {
            finalItemPriceStr = "(Incluido en Combo)";
        } else if (discActive && (isSvcMatch || discCats === 'all' || (Array.isArray(discCats) && discCats.includes(item.catId)))) {
            const disc = Math.round(pNum * (discPercent/100));
            totalIndividualDiscounts += disc;
            finalItemPriceStr = window.formatCurrency(pNum - disc);
        }

        waText += encodeURIComponent(`\n${counter}. *${item.service}*\n   - Precio: ${finalItemPriceStr}\n   - Fecha: ${item.date}\n   - Horario: ${startT} a ${endT}\n   - Profesional: ${item._finalSpecialist}\n`);
        counter++;
    });

    const finalTotal = totalOriginal - totalComboDiscount - totalIndividualDiscounts;
    waText += encodeURIComponent(`\n*Total a pagar: ${window.formatCurrency(finalTotal)}*`);
    
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    // Asignar la URL a la ventana que abrimos de forma síncrona (universal en todos los browsers)
    if (waWindow && !waWindow.closed) {
        waWindow.location.href = waUrl;
    } else {
        // Fallback: si el popup fue bloqueado (ej: bloqueador activado), redirigir en la misma pestaña
        window.location.href = waUrl;
    }
    
    // Reset
    cart = [];
    updateCartBadge();
    renderCart();
    toggleCart();
    
    // Safety cleanup
    const iName = document.getElementById('cart-client-name');
    const iPhone = document.getElementById('cart-client-phone');
    const iSpec = document.getElementById('cart-specialist');
    const specName = document.getElementById('selected-spec-name');
    
    if (iName) iName.value = '';
    if (iPhone) iPhone.value = '';
    if (iSpec) iSpec.value = '';
    if (specName) specName.innerText = 'Elige a tu Profesional...';
    
    // Restaurar botón (Limpieza final)
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnText;
        sendBtn.style.opacity = '1';
    }
    
    } catch (globalCheckoutError) {
        console.error("Error finalizing booking:", globalCheckoutError);
        showToast("Error al agendar: " + globalCheckoutError.message, "error");
        if (waWindow) waWindow.close();
    }
}

// Custom Professional Dialogs
window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type === 'error' ? 'error' : ''} ${type === 'info-special' ? 'info-special' : ''}`;
    
    if (type === 'info-special') {
        toast.innerHTML = `<span class="toast-text">${message}</span>`;
    } else {
        // Extraer íconos del mensaje para agruparlos
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = message;
        const icons = Array.from(tempDiv.querySelectorAll('i'));
        icons.forEach(i => i.remove());
        const cleanMessage = tempDiv.innerHTML.trim();
        
        let iconsHtml = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>`;
        icons.forEach(i => iconsHtml += i.outerHTML);
        
        toast.innerHTML = `<div class="toast-icons">${iconsHtml}</div> <span class="toast-text">${cleanMessage}</span>`;
    }
    
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

window.showConfirm = function(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.innerHTML = `
        <div class="custom-modal">
            <p>${message}</p>
            <div class="modal-buttons">
                <button class="btn-cancel">Cancelar</button>
                <button class="btn-confirm">Aceptar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);

    const btnCancel = overlay.querySelector('.btn-cancel');
    const btnConfirm = overlay.querySelector('.btn-confirm');

    btnCancel.onclick = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };

    btnConfirm.onclick = () => {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
            if (onConfirm) onConfirm();
        }, 300);
    }
}

// Promotions & Announcements Logic
let promoInterval = null;

// --- Burbuja Pro: aplica la cajita SVG y animación configurada en el admin ---
function updatePromoBubbleUI() {
    const bubble = document.querySelector('.promo-gift-bubble');
    if (!bubble) return;

    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('margarita_promo_bubble_cfg') || '{}'); } catch(e) {}

    const animId   = cfg.anim    || 'anim-3d-spinner'; // default: 3D Spinner
    const svgMarkup = cfg.iconSvg || '';

    // Aplicar SVG si existe, o mantener el ícono font-awesome original
    if (svgMarkup) {
        bubble.innerHTML = svgMarkup;
        // Ajustar tamaño del SVG para que encaje
        const svgEl = bubble.querySelector('svg');
        if (svgEl) { svgEl.style.width = '54px'; svgEl.style.height = '54px'; }
    }

    // Quitar todas las clases de animación previas y aplicar la elegida
    const ALL_ANIMS = [
        'anim-3d-spinner','anim-atomic-heart','anim-magnetic','anim-elastic',
        'anim-orbital','anim-glitch','anim-solar','anim-cosmic',
        'anim-radar','anim-flip-glide','anim-vortex','anim-cosmic-bounce'
    ];
    bubble.classList.remove(...ALL_ANIMS);
    bubble.classList.add(animId);
}

function checkPromotions(force = false, isUserClick = false) {
    // Guard: Evitar doble apertura si ya está visible o si ya se mostró (y no es forzado)
    const overlay = document.getElementById('promo-modal-overlay');
    if (overlay && overlay.style.display === 'flex' && !force) return;
    
    console.log("Checking promotions... (force=" + force + ", user=" + isUserClick + ")");
    let promos = null;
    try {
        const saved = localStorage.getItem('margarita_promos');
        if (saved) promos = JSON.parse(saved);
        else {
            // Fallback
            const old = localStorage.getItem('margarita_promo');
            if (old) {
                const p = JSON.parse(old);
                promos = { discount: { active: false }, combo: { active: false } };
                if (p.mode === 'combo') promos.combo = p;
                else promos.discount = p;
            }
        }
    } catch(e) { return; }

    if (!promos) return;

    // Determine which promo to show (or both)
    // CHECK 0: Vencimiento Global (Hora actual vs Expiración)
    const nowLocal = new Date();
    
    let discountActive = promos.discount && promos.discount.active;
    let comboActive = promos.combo && promos.combo.active;

    if (discountActive && promos.discount.expiry) {
        if (new Date(promos.discount.expiry) < nowLocal) discountActive = false;
    }
    if (comboActive && promos.combo.expiry) {
        if (new Date(promos.combo.expiry) < nowLocal) comboActive = false;
    }

    if (!discountActive && !comboActive) {
        console.log("No active promotions (or already expired).");
        const reminder = document.getElementById('promo-reminder-btn');
        if (reminder) reminder.style.display = 'none';
        return;
    }

    // Smart Check: Si ya agendó el combo (está en el carrito), no molestamos más en esta visita
    const currentCartRaw = localStorage.getItem('margarita_cart');
    if (currentCartRaw && currentCartRaw.includes('"Precio en Combo"')) { // Marca de agua del combo
        const reminder = document.getElementById('promo-reminder-btn');
        if (reminder) reminder.style.display = 'none';
        return;
    }

    // SIEMPRE mostrar al refrescar, pero evitar re-aperturas flash (debounce de 3 seg)
    const now = Date.now();
    const tooSoon = (now - (window._lastPromoDismissTime || 0)) < 3000;

    // Solo abrir automáticamente UNA VEZ por carga de página física (salvo que sea clic manual)
    if (!force && (window._promoAlreadyAutoShown || tooSoon)) {
        const reminder = document.getElementById('promo-reminder-btn');
        if (reminder) reminder.style.display = 'block';
        return;
    }
    
    if (!isUserClick) window._promoAlreadyAutoShown = true;
    
    window._promoAlreadyInThisInstantVisit = true;
    
    // Si es forzado por la Nube pero fue cerrado hace menos de un segundo, probablemente es un evento repetido de Firestore
    // Si es CLIC DEL USUARIO, dejamos pasar siempre.
    if (force && !isUserClick && (now - (window._lastPromoDismissTime || 0)) < 1000) {
        console.log("Blocking rapid-fire re-opening from cloud event.");
        return;
    }
    
    window._promoAlreadyShownInThisInstantVisit = true;
    
    const reminder = document.getElementById('promo-reminder-btn');
    if (reminder) reminder.style.display = 'none';

    const text = document.getElementById('promo-text');
    const badgeLarge = document.getElementById('promo-badge-large');
    const categoryDisplay = document.getElementById('promo-category-display');
    const countdownContainer = document.getElementById('promo-countdown');
    const acceptComboBtn = document.getElementById('promo-accept-combo-btn');

    if (!overlay || !text || !badgeLarge) return;

    // Reset UI
    acceptComboBtn.style.display = 'none';
    countdownContainer.style.display = 'none';
    categoryDisplay.innerText = '';

    // Logic for combined display
    if (comboActive) {
        badgeLarge.innerText = `COMBO: ${window.formatCurrency(promos.combo.comboPrice)}`;
        acceptComboBtn.style.display = 'block';
        text.innerText = promos.combo.message || "¡Aprovecha nuestro precio especial en combo!";
        
        // Expiry for combo
        if (promos.combo.expiry) {
            countdownContainer.style.display = 'block';
            startPromoCountdown(promos.combo.expiry);
        }

        // Items List (Categories or Specific Services)
        const catsList = JSON.parse(localStorage.getItem('margarita_categories') || '[]');
        let itemsToDisplay = [];
        
        const isServiceMode = promos.combo.mode === 'service';
        if (isServiceMode && Array.isArray(promos.combo.services)) {
            itemsToDisplay = promos.combo.services;
        } else {
            itemsToDisplay = (promos.combo.category || []).map(id => {
                const m = catsList.find(c => c.id === id);
                return m ? m.name : id;
            });
        }
        
        // Estética: Ordenar por longitud para que se vean balanceados
        itemsToDisplay.sort((a, b) => a.length - b.length);

        categoryDisplay.innerHTML = itemsToDisplay.map(n => `<span style="background:rgba(229,169,180,0.18); color:var(--color-dark-pink); border:1.5px solid var(--color-accent); border-radius:30px; padding:6px 16px; font-size:0.75rem; font-weight:700; letter-spacing:0.5px;">${n.toUpperCase()}</span>`).join('');

        if (discountActive) {
            text.innerHTML += `<br><br><span style="font-size:0.9rem; color:var(--color-accent); font-weight:700;">¡Y además ${promos.discount.percent}% OFF en otras categorías!</span>`;
        }
    } else if (discountActive) {
        badgeLarge.innerText = `OFERTA: ${promos.discount.percent}% OFF`;
        text.innerText = promos.discount.message || "¡Aprovecha hoy nuestro descuento especial!";
        
        if (promos.discount.expiry) {
            countdownContainer.style.display = 'block';
            startPromoCountdown(promos.discount.expiry);
        }

        const isSvcMode = promos.discount.mode === 'service';
        if (promos.discount.category === 'all') {
            categoryDisplay.innerHTML = `<span style="display:inline-block; background:rgba(229,169,180,0.18); color:var(--color-dark-pink); border:1.5px solid var(--color-accent); border-radius:20px; padding:4px 16px; font-size:0.78rem; font-weight:700; letter-spacing:0.5px; margin:3px 4px;">TODAS LAS CATEGORÁAS ✨</span>`;
        } else if (isSvcMode && Array.isArray(promos.discount.services)) {
            const svcs = [...promos.discount.services].sort((a, b) => a.length - b.length);
            categoryDisplay.innerHTML = svcs.map(n => `<span style="background:rgba(229,169,180,0.18); color:var(--color-dark-pink); border:1.5px solid var(--color-accent); border-radius:30px; padding:6px 16px; font-size:0.75rem; font-weight:700; letter-spacing:0.5px;">${n.toUpperCase()}</span>`).join('');
        } else {
             const catsList = JSON.parse(localStorage.getItem('margarita_categories') || '[]');
             const names = (promos.discount.category || []).map(id => {
                const m = catsList.find(c => c.id === id);
                return m ? m.name : id;
            });
            names.sort((a, b) => a.length - b.length);
            categoryDisplay.innerHTML = names.map(n => `<span style="background:rgba(229,169,180,0.18); color:var(--color-dark-pink); border:1.5px solid var(--color-accent); border-radius:30px; padding:6px 16px; font-size:0.75rem; font-weight:700; letter-spacing:0.5px;">${n.toUpperCase()}</span>`).join('');
        }
    }

    overlay.style.display = 'flex';
    setTimeout(() => {
        const modal = document.getElementById('promo-modal');
        if(modal) modal.classList.add('active');
    }, 100);
}

window.addComboToCart = function() {
    // Esconder la burbuja recordatoria si se agrega el combo
    const reminder = document.getElementById('promo-reminder-btn');
    if (reminder) reminder.style.display = 'none';

    let promos = null;
    try {
        const saved = localStorage.getItem('margarita_promos');
        if (saved) promos = JSON.parse(saved);
    } catch(e){ console.error("Error reading promos", e); }

    if (!promos || !promos.combo || !promos.combo.active) return;

    // Desactivar botón para evitar doble clic rápido
    const btn = document.getElementById('promo-accept-combo-btn');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agregando...';
    }

    // Limpiar carrito (según requerimiento de evitar acumulados raros)
    cart = [];
    
    const safeParse = (key, fallback) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch(e) { return fallback; }
    };

    const services = safeParse('margarita_services', []);
    const categoriesList = safeParse('margarita_categories', []);
    let countAdded = 0;

    if (Array.isArray(promos.combo.category)) {
        promos.combo.category.forEach(catId => {
            // Encontrar servicios de esta categoría
            const catServices = services.filter(s => s.cat === catId);
            if (catServices.length > 0) {
                const svc = catServices[0]; // Tomar el primero de la categoría
                
                // Encontrar nombre canónico de la categoría
                const catMatch = categoriesList.find(c => c.id === catId);
                const catName = catMatch ? catMatch.name : (svc.categoryDisplay || "General");

                const item = {
                    id: Date.now().toString() + Math.random().toString().substring(2, 6),
                    catId: catId,
                    service: svc.title,
                    baseName: svc.title,
                    price: svc.price || "0", // Importante: Precio base ORIGINAL
                    duration: svc.duration || svc.time || 60, // RESERVAR DURACIÁ“N ORIGINAL
                    img: svc.img,
                    category: catName,
                    date: '',
                    time: '',
                    specialist: ''
                };
                cart.push(item);
                countAdded++;
            }
        });
    }

    if (Array.isArray(promos.combo.services)) {
        promos.combo.services.forEach(svcTitle => {
            // Check if already added via category to avoid duplicates
            if (cart.some(item => item.service === svcTitle)) return;

            const svc = services.find(s => s.title === svcTitle);
            if (svc) {
                const catMatch = categoriesList.find(c => c.id === svc.cat);
                const catName = catMatch ? catMatch.name : (svc.categoryDisplay || "General");

                const item = {
                    id: Date.now().toString() + Math.random().toString().substring(2, 6),
                    catId: svc.cat,
                    service: svc.title,
                    baseName: svc.title,
                    price: svc.price || "0",
                    duration: svc.duration || svc.time || 60,
                    img: svc.img,
                    category: catName,
                    date: '',
                    time: '',
                    specialist: ''
                };
                cart.push(item);
                countAdded++;
            }
        });
    }

    if (countAdded > 0) {
        updateCartBadge();
        renderCart();
        
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> ¡OFERTA! AGENDAR COMBO';
        }
        
        // Cerrar modal de inmediato
        closePromo();
        
        // Abrir carrito para confirmar
        setTimeout(() => {
            const cartPanel = document.getElementById('cart-drawer');
            if (cartPanel && !cartPanel.classList.contains('active')) {
                toggleCart();
            }
        }, 300);

        showToast(`¡Combo de ${countAdded} servicios listo!`, "success");
    } else {
        showToast("No se encontraron servicios para este combo.", "error");
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> ¡OFERTA! AGENDAR COMBO';
        }
    }
}

function startPromoCountdown(expiryDate) {
    if (promoInterval) clearInterval(promoInterval);
    
    function update() {
        const now = new Date().getTime();
        const distance = new Date(expiryDate).getTime() - now;
        const display = document.getElementById('promo-timer-display');
        
        if (!display) return;

        if (distance < 0) {
            clearInterval(promoInterval);
            display.innerHTML = "¡OFERTA FINALIZADA!";
            
            // Auto-deactivate promo in localStorage
            try {
                const promos = JSON.parse(localStorage.getItem('margarita_promos') || '{}');
                let changed = false;
                if (promos.discount && promos.discount.expiry && new Date(promos.discount.expiry).getTime() <= now) {
                    promos.discount.active = false;
                    changed = true;
                }
                if (promos.combo && promos.combo.expiry && new Date(promos.combo.expiry).getTime() <= now) {
                    promos.combo.active = false;
                    changed = true;
                }
                if (changed) {
                    localStorage.setItem('margarita_promos', JSON.stringify(promos));
                    if (window.saveDataToCloud) {
                        window.saveDataToCloud('config_v2', 'promos', promos);
                    }
                }
            } catch (e) {
                console.error("Error auto-deactivating promo:", e);
            }

            setTimeout(() => {
                closePromo(true); // Pasar true para indicar que es por expiración
            }, 2000);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        let timeHtml = '';
        if (days > 0) timeHtml += `<span>${days}d</span>:`;
        timeHtml += `<span>${hours.toString().padStart(2, '0')}h</span>:`;
        timeHtml += `<span>${minutes.toString().padStart(2, '0')}m</span>:`;
        timeHtml += `<span>${seconds.toString().padStart(2, '0')}s</span>`;
        
        display.innerHTML = timeHtml;
    }
    
    update();
    promoInterval = setInterval(update, 1000);
}

window.closePromo = function(isExpired = false) {
    console.log("Closing promo...");
    const overlay = document.getElementById('promo-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    if (promoInterval) clearInterval(promoInterval);
    
    // Registrar que el usuario lo cerró para evitar re-apertura inmediata por eventos de red
    window._lastPromoDismissTime = Date.now();
    
    // Mostrar burbuja recordatoria flotante SOLO si no es por expiración
    const reminder = document.getElementById('promo-reminder-btn');
    if (reminder) {
        if (isExpired) {
            reminder.style.display = 'none';
        } else {
            reminder.style.display = 'block';
        }
    }
}

window.reopenPromo = function() {
    // Abrir el modal de nuevo. checkPromotions se encargará de ocultar la burbuja SI TIENE éxito.
    checkPromotions(true, true); 
}

    function populateClientSpecialists() {
        const selectBtn = document.getElementById('specialist-select-btn');
        const overlay = document.getElementById('specialist-window-overlay');
        const listContainer = document.getElementById('specialist-window-list');
        if (!selectBtn || !overlay || !listContainer) return;
        
        let specialists = JSON.parse(localStorage.getItem('margarita_specialists'));
        if (!specialists || specialists.length === 0) {
            specialists = [{name: 'Keysi'}, {name: 'Franchez'}, {name: 'Luz'}];
        }
        
        // Render List in Window (Alineado)
        let html = '';
        specialists.forEach(s => {
            const name = typeof s === 'string' ? s : s.name;
            const active = typeof s === 'object' ? s.active !== false : true;
            
            html += `
                <div class="window-option ${active ? '' : 'disabled'}" onclick="selectWindowSpecialist('${name}', ${active})">
                    <span style="font-weight:600;">${name}</span>
                    <span class="opt-status">${active ? 'Disponible âœ…' : 'No disponible âŒ'}</span>
                </div>`;
        });
        
        // No preference option
        html += `
            <div class="window-option" onclick="selectWindowSpecialist('Sin preferencia', true)">
                <span style="font-weight:600;">Cualquier profesional</span>
                <span class="opt-status">Cualquiera</span>
            </div>`;
            
        listContainer.innerHTML = html;

        selectBtn.onclick = function() {
            overlay.style.display = 'flex';
        };
    }

    window.closeSpecialistWindow = function() {
        const overlay = document.getElementById('specialist-window-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    window.selectWindowSpecialist = function(name, active) {
        if (!active) return;
        const hiddenInput = document.getElementById('cart-specialist');
        const displayText = document.getElementById('selected-spec-name');
        
        if (hiddenInput) {
            hiddenInput.value = name;
            hiddenInput.dispatchEvent(new Event('change'));
        }
        
        // Solo el nombre en el botón
        if (displayText) displayText.innerText = name;
        
        window.closeSpecialistWindow();
    };

    // Gallery Carousel Navigation
    // Gallery Carousel Navigation
    window.scrollPublicGallery = function(direction) {
        const gallery = document.getElementById('public-gallery-list');
        if (gallery) {
            // Desplazamiento fijo por ancho de imagen o bloque
            const scrollAmount = 400; 
            gallery.scrollBy({
                left: direction * scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Global click to close dropdowns
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('active'));
        }
    });

    window.toggleNavDropdown = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const parent = e.target.closest('.nav-dropdown');
        if (parent) parent.classList.toggle('active');
    };

// ESCAPE Key to close all modals (Client Side)
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        const modalZoom = document.getElementById('image-zoom-modal');
        const modalSpecialist = document.getElementById('specialist-window-overlay');
        const modalPromo = document.getElementById('promo-modal-overlay');
        const cartDrawer = document.getElementById('cart-drawer');
        
        if (modalZoom && modalZoom.style.display === 'flex') {
            modalZoom.style.display = 'none';
        } else if (modalSpecialist && modalSpecialist.style.display === 'flex') {
            window.closeSpecialistWindow();
        } else if (modalPromo && modalPromo.style.display === 'flex') {
            // Ocultar burbuja de inmediato al agendar
    const reminder = document.getElementById('promo-reminder-btn');
    if (reminder) reminder.style.display = 'none';
    
    window.closePromo();
        } else if (cartDrawer && cartDrawer.style.display === 'block') {
            window.toggleCart();
        }
    }
});

// ----------------------------------------------------
// SERVICE GALLERY (MODELS PER SERVICE) MODAL LOGIC
// ----------------------------------------------------
let currentServiceGalleryKey = null;
let currentServiceBasePrice = null;
let selectedModelPhoto = null;

window.openServiceGallery = function(catId, serviceTitle, servicePrice) {
    currentServiceGalleryKey = `${catId}:::${serviceTitle}`;
    
    // Aplicar descuento activo (igual que en las tarjetas normales)
    let finalPrice = servicePrice || '$0';
    try {
        const saved = localStorage.getItem('margarita_promos') || localStorage.getItem('margarita_promo');
        if (saved) {
            const promos = JSON.parse(saved);
            const d = promos.discount || (promos.mode !== 'combo' ? promos : null);
            if (d && d.active) {
                const isSvcMatch = Array.isArray(d.services) && d.services.includes(serviceTitle);
                const isCatAll = d.category === 'all';
                const isCatMatch = Array.isArray(d.category) ? d.category.includes(catId) : (d.category === catId);
                if (isSvcMatch || isCatAll || isCatMatch) {
                    const discPercent = parseInt(d.percent) || 0;
                    if (discPercent > 0) {
                        const originalNum = parseInt((servicePrice || '0').toString().replace(/[^0-9]/g, '')) || 0;
                        if (originalNum > 0) {
                            const discounted = originalNum - Math.round((originalNum * discPercent) / 100);
                            finalPrice = window.formatCurrency ? window.formatCurrency(discounted) : ('$' + discounted.toLocaleString('es-CO') + ' COP');
                        }
                    }
                }
            }
        }
    } catch(e) { console.warn('Error aplicando descuento en galería:', e); }
    currentServiceBasePrice = servicePrice || '$0';
    selectedModelPhoto = null;
    galleryIsZoomed = false;
    resetZoomButton();
    
    const titleEl = document.getElementById('cat-gallery-title');
    if (titleEl) titleEl.innerText = `Galería: ${serviceTitle}`;
    
    renderServiceGallery();
    
    document.getElementById('category-gallery-overlay').style.display = 'flex';
    document.getElementById('cat-gallery-footer').style.display = 'none';
};

window.closeCategoryGallery = function() {
    document.getElementById('category-gallery-overlay').style.display = 'none';
};

function renderServiceGallery() {
    const body = document.getElementById('cat-gallery-body');
    if (!body) return;
    
    const allGalleries = JSON.parse(localStorage.getItem('margarita_service_galleries')) || {};
    const svcPhotos = allGalleries[currentServiceGalleryKey] || [];
    
    if (svcPhotos.length === 0) {
        body.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#999;">
                <i class="fas fa-camera" style="font-size:3rem; opacity:0.3; margin-bottom:15px; display:block;"></i>
                <p>Aún no hay fotos de modelos para este servicio.</p>
            </div>
        `;
        return;
    }

    // Detectar promo activa para mostrar badge en las fotos
    let promoBadge = '';
    let discPercent = 0;
    try {
        const parts = currentServiceGalleryKey.split(':::');
        const catId = parts[0];
        const serviceTitle = parts[1];
        const saved = localStorage.getItem('margarita_promos') || localStorage.getItem('margarita_promo');
        if (saved) {
            const promos = JSON.parse(saved);
            const d = promos.discount || (promos.mode !== 'combo' ? promos : null);
            if (d && d.active) {
                const isSvcMatch = Array.isArray(d.services) && d.services.includes(serviceTitle);
                const isCatAll = d.category === 'all';
                const isCatMatch = Array.isArray(d.category) ? d.category.includes(catId) : (d.category === catId);
                if (isSvcMatch || isCatAll || isCatMatch) {
                    discPercent = parseInt(d.percent) || 0;
                    if (discPercent > 0) {
                        promoBadge = `<div style="position:absolute; top:10px; left:10px; background:var(--color-accent); color:white; padding:5px 12px; border-radius:30px; font-size:0.72rem; font-weight:800; z-index:3; box-shadow:0 4px 10px rgba(184,115,129,0.4); letter-spacing:0.5px; animation: pulse-badge 1.8s ease-in-out infinite;">¡OFERTA -${discPercent}%!</div>`;
                    }
                }
            }
        }
    } catch(e) {}

    body.innerHTML = svcPhotos.map((photo, index) => {
        // Calcular precio con descuento para mostrarlo en la foto
        let rawPrice = photo.modelPrice || currentServiceBasePrice || '0';
        let priceDisplay = rawPrice;
        if (discPercent > 0 && rawPrice !== '0') {
            const rawNum = parseInt(rawPrice.toString().replace(/[^0-9]/g, '')) || 0;
            if (rawNum > 0) {
                const discounted = rawNum - Math.round((rawNum * discPercent) / 100);
                const formattedDiscount = window.formatCurrency ? window.formatCurrency(discounted) : ('$' + discounted.toLocaleString('es-CO') + ' COP');
                priceDisplay = `<span style="text-decoration:line-through; opacity:0.6; font-size:0.75rem; font-weight:500;">${rawPrice}</span> <span style="color:var(--color-accent); font-weight:900;">${formattedDiscount}</span>`;
            }
        }
        return `
        <div class="cat-gallery-item" onclick="selectGalleryModel(${photo.id})" id="gallery-photo-${photo.id}" style="box-sizing:border-box; position:relative; border-radius:18px; overflow:hidden; height:240px; display:flex; flex-direction:column; cursor:pointer; border:4px solid transparent; transition:all 0.3s ease; background:white; box-shadow:0 8px 20px rgba(0,0,0,0.08);">
            ${promoBadge}
            <img src="${photo.img}" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.5s;">
            <div style="position:absolute; bottom:0; left:0; right:0; padding:20px 15px 15px; background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); color:white;">
                <div style="font-weight:700; font-size:1rem; margin-bottom:2px; line-height:1.2;">${photo.modelName ? `${index + 1}. ${photo.modelName}` : `Modelo ${index + 1}`}</div>
                <div style="font-weight:800; font-size:0.9rem; margin-top:2px;">${priceDisplay}</div>
            </div>
            <div class="selected-indicator" style="position:absolute; top:12px; right:12px; width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center; border:2px solid var(--color-accent); transition:0.3s; opacity:0; transform:scale(0.5);">
                <i class="fas fa-check" style="color:var(--color-accent); font-size:0.9rem;"></i>
            </div>
        </div>
    `}).join('');
}

window.selectGalleryModel = function(photoId) {
    // Deselect previous
    const items = document.querySelectorAll('.cat-gallery-item');
    items.forEach(el => {
        el.style.borderColor = 'transparent';
        el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
        const ind = el.querySelector('.selected-indicator');
        if (ind) { ind.style.opacity = '0'; ind.style.transform = 'scale(0.5)'; }
        const img = el.querySelector('img');
        if (img) img.style.transform = 'scale(1)';
    });

    // Select current
    const selectedEl = document.getElementById(`gallery-photo-${photoId}`);
    if (selectedEl) {
        selectedEl.style.borderColor = 'var(--color-accent)';
        selectedEl.style.boxShadow = '0 0 0 2px var(--color-accent)';
        const img = selectedEl.querySelector('img');
        if (img) img.style.transform = 'scale(1.05)';
        const ind = selectedEl.querySelector('.selected-indicator');
        if (ind) { ind.style.opacity = '1'; ind.style.transform = 'scale(1)'; }
        
        const allGalleries = JSON.parse(localStorage.getItem('margarita_service_galleries')) || {};
        const svcPhotos = allGalleries[currentServiceGalleryKey] || [];
        selectedModelPhoto = svcPhotos.find(p => p.id === photoId);
        
        // Reset zoom if we were zoomed
        if (galleryIsZoomed) zoomGalleryImage(); 

        document.getElementById('cat-gallery-footer').style.display = 'flex';
        
        // Link result logic to the reserve button
        const reserveBtn = document.getElementById('cat-gallery-reserve-btn');
        reserveBtn.onclick = () => reserveGalleryModel();
    }
};

function reserveGalleryModel() {
    if (!selectedModelPhoto) return;
    
    // Create a virtual service object based on the photo
    const parts = currentServiceGalleryKey.split(':::');
    const catId = parts[0];
    const originalTitle = parts[1];
    
    const categoriesList = JSON.parse(localStorage.getItem('margarita_categories')) || [];
    const cat = categoriesList.find(c => c.id == catId);
    
    const virtualService = {
        name: `${originalTitle}${selectedModelPhoto.modelName ? ': ' + selectedModelPhoto.modelName : ' (Modelo Especial)'}`,
        price: selectedModelPhoto.modelPrice || currentServiceBasePrice, // Heredar precio base
        img: selectedModelPhoto.img,
        cat: catId,
        category: cat ? cat.name : 'Servicio'
    };
    
    // Use existing addToCart function
    if (window.addToCart) {
        window.addToCart(virtualService.name, virtualService.price, virtualService.img, virtualService.category, originalTitle, catId);
    }
    
    // Ensure modal explicitly hides immediately
    document.getElementById('category-gallery-overlay').style.display = 'none';
    
    // Open cart
    setTimeout(() => {
        const cartDrawer = document.getElementById('cart-drawer');
        if (cartDrawer && cartDrawer.style.display !== 'block') {
            if (window.toggleCart) window.toggleCart();
        }
    }, 200);
}

let galleryIsZoomed = false;

window.zoomGalleryImage = function() {
    if (!selectedModelPhoto) return;
    
    const body = document.getElementById('cat-gallery-body');
    const zoomBtn = document.getElementById('cat-gallery-zoom-btn');
    if (!body || !zoomBtn) return;

    galleryIsZoomed = !galleryIsZoomed;

    if (galleryIsZoomed) {
        body.classList.add('zoom-active');
        zoomBtn.innerHTML = '<i class="fas fa-search-minus"></i> REDUCIR IMAGEN';
        zoomBtn.style.background = 'var(--color-dark-pink)';
        zoomBtn.style.color = '#fff';
        zoomBtn.style.borderColor = 'var(--color-dark-pink)';
        
        // Hide other items
        document.querySelectorAll('.cat-gallery-item').forEach(el => {
            if (el.id !== `gallery-photo-${selectedModelPhoto.id}`) {
                el.style.display = 'none';
            } else {
                el.style.height = '100%';
                el.style.gridColumn = '1 / -1';
                el.querySelector('img').style.objectFit = 'contain';
                el.querySelector('img').style.background = '#333';
            }
        });
    } else {
        body.classList.remove('zoom-active');
        resetZoomButton();
        renderServiceGallery(); // Easiest way to restore grid
        // Re-apply selection visual
        setTimeout(() => selectGalleryModel(selectedModelPhoto.id), 10);
    }
};

function resetZoomButton() {
    const zoomBtn = document.getElementById('cat-gallery-zoom-btn');
    if (zoomBtn) {
        zoomBtn.innerHTML = '<i class="fas fa-search-plus"></i> AMPLIAR IMAGEN';
        zoomBtn.style.background = '#f5f5f5';
        zoomBtn.style.color = '#555';
        zoomBtn.style.borderColor = '#ddd';
    }
}

// Ejecutar chequeo de promos al final, con todo ya definido
if (typeof updatePromoBubbleUI === 'function') updatePromoBubbleUI();
if (typeof checkPromotions === 'function') checkPromotions(false);

// --- Global ESCAPE Handler for UI ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // 1. Close Cart if open
        const cartDrawer = document.getElementById('cart-drawer');
        if (cartDrawer && cartDrawer.classList.contains('active')) {
            if (window.toggleCart) window.toggleCart();
        }

        // 2. Close Static Modals/Overlays
        const modals = [
            { id: 'category-gallery-overlay', closeFn: () => { const m = document.getElementById('category-gallery-overlay'); if(m) m.style.display='none'; } },
            { id: 'cat-modal', closeFn: window.closeCatModal },
            { id: 'spec-modal', closeFn: window.closeSpecModal },
            { id: 'contact-modal', closeFn: window.closeContactModal },
            { id: 'fullscreen-gallery', closeFn: window.closeGallery }
        ];

        modals.forEach(m => {
            const el = document.getElementById(m.id);
            if (el && (el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('active'))) {
                if (typeof m.closeFn === 'function') m.closeFn();
            }
        });
        
        // 4. Close promo modal
        const promoOverlay = document.getElementById('promo-modal-overlay');
        if (promoOverlay && promoOverlay.style.display === 'flex') {
            if (window.closePromo) window.closePromo();
        }
        
        // 3. Close mobile menu
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
        }
    }
});

window.findAvailableSlots = function(dateInput) {
    const slotsGrid = document.getElementById('unified-slots-grid');
    if (!slotsGrid) return;
    
    if (!dateInput) {
        slotsGrid.innerHTML = '<p style="color:#aaa; font-size:0.8rem;">Elige una fecha primero...</p>';
        return;
    }

    const safeParse = (key, fallback) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch(e) { return fallback; }
    };

    const specialists = safeParse('margarita_specialists', []);
    const agendaData = safeParse('margarita_appointments', []);
    const dbServices = safeParse('margarita_services', []);
    
    // Calcular duración total del carrito
    let totalDuration = 0;
    cart.forEach(item => {
        const matchSvc = dbServices.find(s => s.title === item.service || s.title === item.baseName);
        totalDuration += matchSvc ? parseInt(matchSvc.duration || 60) : 60;
    });

    const timeToMins = (t) => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
    const minsToTime = (m) => { const h=Math.floor(m/60); const mm=m%60; return `${h.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`; };

    let availableSlots = [];
    const workStart = 7 * 60; // 7 AM
    const workEnd = 20 * 60; // 8 PM 

    // Escanear cada 30 minutos
    for (let currentStart = workStart; currentStart <= (workEnd - totalDuration); currentStart += 30) {
        const currentEnd = currentStart + totalDuration;
        
        // Un slot es disponible si AL MENOS un profesional está libre todo ese bloque
        const isAnySpecialistFree = specialists.some(spec => {
            const sName = typeof spec === 'string' ? spec : spec.name;
            const active = typeof spec === 'object' ? spec.active !== false : true;
            if (!active) return false;

            // --- FILTRO DE ESPECIALIDAD (Robusto) ---
            const specSpecialty = spec.specialty || 'Todos';
            const normPath = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
            const normC = (s) => normPath(s).replace(/[&\/\-,\.\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
            const cMatch = (a, b) => {
                const na = normC(a), nb = normC(b);
                if (na === nb || nb.includes(na) || na.includes(nb)) return true;
                const aw = na.split(' ').filter(w => w.length > 2);
                const bw = nb.split(' ').filter(w => w.length > 2);
                return aw.some(x => bw.some(y => x === y || x.includes(y) || y.includes(x)));
            };
            const specList = specSpecialty.split(',').map(s => s.trim());

            if (!specList.some(s => normPath(s) === 'todos')) {
                const currentCart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
                // Un especialista debe ser capaz de hacer TODOS los servicios en el carrito para estar libre
                const canDoAll = currentCart.every(item => specList.some(s => cMatch(s, item.category) || cMatch(s, item.catId) || cMatch(s, item.service)));
                if (!canDoAll) return false;
            }

            const isBusy = agendaData.some(a => {
                // REGLA DE ORO: Las citas 'accepted' (finalizadas) o 'cancelled' (canceladas) NO bloquean el tiempo
                if (a.date !== dateInput || a.specialist !== sName || a.status === 'cancelled' || a.status === 'rejected' || a.status === 'accepted') return false;
                const aStart = timeToMins(a.time);
                const aEnd = aStart + parseInt(a.duration || 60);
                return (currentStart < aEnd && currentEnd > aStart);
            });
            return !isBusy;
        });

        if (isAnySpecialistFree) {
            availableSlots.push(minsToTime(currentStart));
        }
    }

    if (availableSlots.length === 0) {
        slotsGrid.innerHTML = '<p style="color:#d9534f; font-size:0.8rem; font-weight:700;">Lo sentimos, no hay cupos para este día. Prueba con otra fecha.</p>';
    } else {
        slotsGrid.innerHTML = availableSlots.map(time => {
            return `<div class="slot-chip" onclick="selectSlot('${time}', '${dateInput}')">${window.formatTime12h(time)}</div>`;
        }).join('');
    }
}

window.selectSlot = function(time, date) {
    // Marcar visualmente
    document.querySelectorAll('.slot-chip').forEach(c => c.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    const safeParse = (key, fallback) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch(e) { return fallback; }
    };

    const dbServices = safeParse('margarita_services', []);
    const specialists = safeParse('margarita_specialists', []);
    const agendaData = safeParse('margarita_appointments', []);

    const timeToMins = (t) => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
    const minsToTime = (m) => { const h=Math.floor(m/60); const mm=m%60; return `${h.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`; };

    const businessName = localStorage.getItem('margarita_site_name') || "Margarita Studio";
    let chosenSpec = businessName;
    
    const currentCart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
    // Buscamos un profesional que pueda hacer todo el bloque
    let totalDur = 0;
    currentCart.forEach(i => {
        const m = dbServices.find(s => s.title === i.service || s.title === i.baseName);
        totalDur += m ? parseInt(m.duration || 60) : 60;
    });

    const currentStart = timeToMins(time);
    const currentEnd = currentStart + totalDur;

    const normPath = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    const normC = (s) => normPath(s).replace(/[&\/\-,\.\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
    const cMatch = (a, b) => {
        const na = normC(a), nb = normC(b);
        if (na === nb || nb.includes(na) || na.includes(nb)) return true;
        const aw = na.split(' ').filter(w => w.length > 2);
        const bw = nb.split(' ').filter(w => w.length > 2);
        return aw.some(x => bw.some(y => x === y || x.includes(y) || y.includes(x)));
    };

    for (let spec of specialists) {
        const sName = typeof spec === 'string' ? spec : spec.name;
        const active = typeof spec === 'object' ? spec.active !== false : true;
        if (!active) continue;

        // --- FILTRO DE ESPECIALIDAD (Robusto) ---
        const specSpecialty = spec.specialty || 'Todos';
        const specList = specSpecialty.split(',').map(s => s.trim());
        
        if (!specList.some(s => normPath(s) === 'todos')) {
            // Un especialista debe ser capaz de hacer TODOS los servicios en el carrito para estar libre
            const canDoAll = currentCart.every(item => specList.some(s => cMatch(s, item.category) || cMatch(s, item.catId) || cMatch(s, item.service)));
            if (!canDoAll) continue;
        }

        const isBusy = agendaData.some(a => {
            // REGLA DE ORO: Las citas 'accepted' (finalizadas) o 'cancelled' (canceladas) NO bloquean el tiempo
            if (a.date !== date || a.specialist !== sName || a.status === 'cancelled' || a.status === 'rejected' || a.status === 'accepted') return false;
            const aStart = timeToMins(a.time);
            const aEnd = aStart + parseInt(a.duration || 60);
            return (currentStart < aEnd && currentEnd > aStart);
        });

        if (!isBusy) {
            chosenSpec = sName;
            break;
        }
    }

    // Actualizar todos los items del carrito secuencialmente
    let nextTimeMins = currentStart;
    cart.forEach(item => {
        item.date = date;
        item.time = minsToTime(nextTimeMins);
        item.specialist = chosenSpec;
        
        const m = dbServices.find(s => s.title === item.service || s.title === item.baseName);
        const dur = m ? parseInt(m.duration || 60) : 60;
        nextTimeMins += dur;
    });

    renderCart();
    showToast(`Agenda ajustada para las ${window.formatTime12h(time)}`, "success");
}

/* --- AGENDA PÁšBLICA VISUAL (PROFESIONAL) --- */
window.renderPublicAgenda = function() {
    const container = document.getElementById('public-agenda-container');
    if (!container) return;

    const safeParse = (key, fallback) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch(e) { return fallback; }
    };

    const specialists = safeParse('margarita_specialists', []);
    const appointments = safeParse('margarita_appointments', []);
    
    // Fecha de hoy en formato local (YYYY-MM-DD)
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayStr = new Date(today.getTime() - (offset*60*1000)).toISOString().split('T')[0];

    // Configuración de horas (7 AM a 8 PM)
    const START_HOUR = 7;
    const END_HOUR = 20;
    const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

    const timeToMins = (t) => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };

    let html = `<div class="agenda-timeline-container">`;

    // 1. Generar encabezado de horas (Marcadores)
    let markersHtml = '';
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const leftPercent = ((h - START_HOUR) * 60 / TOTAL_MINS) * 100;
        markersHtml += `
            <div class="timeline-hour-marker" style="left: ${leftPercent}%;">
                <span class="timeline-hour-label">${h > 12 ? (h-12)+' PM' : h === 12 ? '12 PM' : h+' AM'}</span>
            </div>
        `;
    }

    // 2. Generar filas por especialista
    specialists.forEach(spec => {
        const sName = typeof spec === 'string' ? spec : spec.name;
        const sImg = spec.image || 'https://via.placeholder.com/100';
        const active = typeof spec === 'object' ? spec.active !== false : true;

        if (!active) return;

        // Filtrar citas de este profesional para HOY
        const dayAppts = appointments.filter(a => 
            a.date === todayStr && 
            a.specialist === sName && 
            a.status !== 'cancelled' && 
            a.status !== 'rejected'
        );

        let apptsHtml = '';
        dayAppts.forEach(appt => {
            const startMins = timeToMins(appt.time) - (START_HOUR * 60);
            const matchA = dbServices.find(s => s.title && appt.service && s.title.toLowerCase().trim() === appt.service.toLowerCase().trim());
            const duration = window.getDurationInMins(appt.duration || (matchA ? matchA.duration : null), appt.service);
            
            const left = (startMins / TOTAL_MINS) * 100;
            const width = (duration / TOTAL_MINS) * 100;

            // Solo mostrar si está dentro del rango visible
            if (left >= 0 && left < 100) {
                const endMins = timeToMins(appt.time) + duration;
                const endH = Math.floor(endMins / 60);
                const endM = String(endMins % 60).padStart(2, '0');
                const endAp = endH >= 12 ? 'PM' : 'AM';
                const endTimeStr = `${endH % 12 || 12}:${endM} ${endAp}`;
                apptsHtml += `
                    <div class="appointment-block" style="left: ${left}%; width: ${width}%;">
                        <p class="appointment-block-status">RESERVADO</p>
                        <p class="appointment-block-time">${window.formatTime12h(appt.time)} - ${endTimeStr}</p>
                    </div>
                `;
            }
        });

        html += `
            <div class="specialist-timeline-row">
                <div class="specialist-info-card">
                    <img src="${sImg}" class="specialist-mini-thumb" alt="${sName}">
                    <div class="specialist-mini-name">${sName}</div>
                </div>
                <div class="timeline-track">
                    ${markersHtml}
                    ${apptsHtml}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
};

// Iniciar renderizado al cargar
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que otros procesos terminen
    setTimeout(() => {
        if (window.renderCart) window.renderCart();
        if (window.updateCartBadge) window.updateCartBadge();
        if (window.renderPublicAgenda) window.renderPublicAgenda();
    }, 500);
});

// Sincronizar cuando hay cambios en el localStorage (por si el admin está en otra pestaña)
window.addEventListener('storage', (e) => {
    if (e.key === 'margarita_appointments' || e.key === 'margarita_specialists' || e.key === 'margarita_promos') {
        if (window.renderPublicAgenda) window.renderPublicAgenda(); // Dibujar por primera vez con los datos ya cargados
        if (window.renderCart) window.renderCart(); // Actualizar precios en el carrito si cambian las promociones
        if (document.getElementById('visual-agenda-modal').style.display === 'flex') {
            window.renderPublicVisualAgendaGrid();
        }
    }
});

// --- FUNCIONES PARA LA CUADRÁCULA DE TURNOS PÁšBLICA ---
let selectingForCartId = null;
window._pendingIndividualEdit_Public = null; // Flag para edición individual (Acrílicas se mueve sola)
let currentBookingDuration = 60;

window.openPublicVisualAgenda = function(cartId = null) {
    const modal = document.getElementById('visual-agenda-modal');
    if (modal) modal.style.display = 'flex';
    selectingForCartId = cartId;
    
    // Alerta protectora de agenda
    if (cartId) {
        const currentCart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
        const targetItem = currentCart.find(i => i.id == cartId);
        if (targetItem && targetItem.isAutoScheduled && targetItem.time) {
            showToast('Trata de elegir un horario que siga el orden de tu paquete para no descontrolar la agenda <i class="fas fa-info-circle" style="margin-left: 5px; color: var(--color-accent);"></i>', 'info-special');
        }
    }
    
    // NORMALIZADOR DE FECHA MAESTRO
    const normalizeAnyDate = (d) => {
        if (!d) return '';
        const parts = d.split(/[-/]/);
        if (parts.length < 3) return d;
        // Si ya está en YYYY-MM-DD
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
        // Si viene DD/MM/YYYY o DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    };

    const dateInput = document.getElementById('public-agenda-date');
    const currentCart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
    const dbServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
    
    currentBookingDuration = 60; 

    // LIMPIEZA MAESTRA: Forzamos que el input esté vacío para que NO herede fechas de la sesión anterior
    if (dateInput) {
        dateInput.value = ''; 
    }

    if (cartId) {
        const item = currentCart.find(i => i.id == cartId);
        if (item) {
            // Si el ítem YA tiene fecha, la ponemos. Si NO tiene, lo dejamos vacío para que salte a hoy/mañana abajo.
            let fechaPropuesta = item.date || '';
            
            const cartItemDateInput = document.querySelector(`.cart-item-date[data-id="${cartId}"]`);
            if (cartItemDateInput && cartItemDateInput.value) {
                fechaPropuesta = cartItemDateInput.value;
            }

            if (dateInput) {
                dateInput.value = normalizeAnyDate(fechaPropuesta);
            }
            // ... resto de lógica de duración ...

            const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
            const targetName = normalize(item.name || item.title || "");
            
            // BUSCADOR DE DURACIÁ“N
            let matchSvc = dbServices.find(s => normalize(s.name) === targetName);
            if (!matchSvc) {
                matchSvc = dbServices.find(s => {
                    const sName = normalize(s.name || "");
                    return sName.includes(targetName) || targetName.includes(sName);
                });
            }

            if (matchSvc && matchSvc.time) {
                const cleanTime = matchSvc.time.replace(/[^0-9]/g, '');
                let dNum = parseInt(cleanTime) || 60;
                if (matchSvc.time.toLowerCase().includes('hora')) dNum *= 60;
                currentBookingDuration = dNum;
            }
        }
    }

    // CONFIGURACIÁ“N DE FECHA MÁNIMA (Block past days)
    if (dateInput) {
        const minNow = new Date();
        // Si ya pasaron las 8 PM, la fecha mínima es MAÁ‘ANA
        if (minNow.getHours() >= 20) {
            minNow.setDate(minNow.getDate() + 1);
        }
        const minYear = minNow.getFullYear();
        const minMonth = String(minNow.getMonth() + 1).padStart(2, '0');
        const minDay = String(minNow.getDate()).padStart(2, '0');
        dateInput.min = `${minYear}-${minMonth}-${minDay}`;
    }

    // SI NO HAY FECHA, PONER LA DE HOY (O MAÁ‘ANA SI ES DESPUÁ‰S DE LAS 8:00 PM)
    if (dateInput && (!dateInput.value || dateInput.value === 'dd/mm/aaaa' || dateInput.value === '')) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Si ya cerraron (ej: después de las 8 pm), saltamos a mañana automáticamente
        if (currentHour >= 20) {
            now.setDate(now.getDate() + 1);
        }
        
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${y}-${m}-${d}`;
    }

    // SI VENIMOS DEL CARRITO: Mostramos el selector de fecha para que puedan cambiar el día si quieren
    const dateContainer = dateInput ? dateInput.parentElement : null;
    if (dateContainer) {
        dateContainer.style.display = 'flex'; // Siempre visible para mayor comodidad
    }
    
    // Activar bandera auto-scroll para enfocar el servicio editado al abrir
    window._shouldAutoFocusAgenda = true;
    
    // Dibujar al final cuando todo está listo
    window.renderPublicVisualAgendaGrid();
};

window.closePublicVisualAgenda = function() {
    const modal = document.getElementById('visual-agenda-modal');
    if (modal) modal.style.display = 'none';
    selectingForCartId = null;
    window._pendingIndividualEdit_Public = null;
};

window.handlePublicGridCellClick = function(time, specialist) {
    window.pickTimeFromAgenda(time, specialist);
};

window.togglePublicCartEditMode = function(cartId) {
    if (selectingForCartId == cartId && window._pendingIndividualEdit_Public) {
        // Toggle OFF
        window._pendingIndividualEdit_Public = null;
    } else {
        // Toggle ON
        selectingForCartId = cartId;
        window._pendingIndividualEdit_Public = cartId;
        window._shouldAutoFocusAgenda = true;
    }
    window.renderPublicVisualAgendaGrid();
};

window.pickTimeFromAgenda = function(time, specialist) {
    if (!selectingForCartId) return;
    
    const chosenDateInput = document.getElementById('public-agenda-date');
    if (!chosenDateInput) return;
    const chosenDate = chosenDateInput.value;

    // BLOQUEO RADICAL COMPLETO: Validar que el pack puede acomodarse en la jornada.
    // La búsqueda bidireccional (adelante + atrás) la hace autoScheduleCart.
    // Aquí solo bloqueamos casos físicamente imposibles.
    {
        const dbServicesPrev = JSON.parse(localStorage.getItem('margarita_services') || '[]');
        const normP = function(s){ return s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim() : ''; };
        const getMinsP = function(t){ if(!t) return 0; var p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
        const anchorMin = getMinsP(time);
        const OPEN  = 7  * 60; // 7:00 AM
        const CLOSE = 20 * 60; // 8:00 PM
        const anchorCartItem = cart.find(function(i){ return i.id == selectingForCartId; });

        if (anchorCartItem) {
            // 1. El servicio ancla debe caber individualmente antes de las 8 PM
            const svcMatch = dbServicesPrev.find(function(s){ return normP(s.title) === normP(anchorCartItem.service); });
            const anchorDur = window.getDurationInMins(anchorCartItem.duration || (svcMatch ? svcMatch.duration : null), anchorCartItem.service);
            if (anchorMin + anchorDur > CLOSE) {
                const isMob = window.innerWidth < 768;
                const isCombo = cart.some(i => i.promoType === 'combo');
                const isPack = cart.length > 1;
                const label = isCombo ? 'El combo' : (isPack ? 'El paquete' : 'El servicio');
                const msg = isMob ? (`\u26a0\ufe0f ${label} no cabe. Elige otro d\u00eda.`) : '\u26a0\ufe0f El servicio seleccionado no cabe antes de cerrar (8 PM). Por favor elige una hora m\u00e1s temprana o agenda para el d\u00eda siguiente.';
                showToast(msg, 'error');
                return;
            }

            // 2. La suma total de todos los servicios pendientes debe caber
            // dentro de la jornada completa (7 AM - 8 PM = 780 min).
            // Si ni en el mejor caso (toda la jornada libre) caben todos, es imposible.
            const pendingTotal = cart.reduce(function(sum, item) {
                if (item.time && item.date) return sum; // Ya agendado, no contar
                const m = dbServicesPrev.find(function(s){ return normP(s.title) === normP(item.service); });
                return sum + window.getDurationInMins(item.duration || (m ? m.duration : null), item.service);
            }, 0);

            if (pendingTotal > (CLOSE - OPEN)) {
                const isMob = window.innerWidth < 768;
                const isCombo = cart.some(i => i.promoType === 'combo');
                const isPack = cart.length > 1;
                const label = isCombo ? 'El combo' : (isPack ? 'El paquete' : 'El servicio');
                const msg = isMob ? (`\u26a0\ufe0f ${label} no cabe. Elige otro d\u00eda.`) : '\u26a0\ufe0f El conjunto de servicios pendientes supera la jornada laboral (7 AM\u20138 PM). Por favor reduce el paquete o divide en varios d\u00edas.';
                showToast(msg, 'error');
                return;
            }
            // Si pasa ambas verificaciones, continuamos. El auto-agendador buscará
            // espacio hacia adelante primero, y hacia atrás si no lo encuentra.
            // Solo si ninguna dirección funciona revertirá y mostrará un aviso.
        }
    }

    // Detectar si el usuario cambió el día en el calendario (esto siempre debe mover todo el paquete)
    const anchorCheck = cart.find(i => i.id == selectingForCartId);
    const dayChanged = anchorCheck && anchorCheck.date && anchorCheck.date !== chosenDate;

    // Si NO estamos en edición individual, O si cambiamos de día (el día manda sobre el modo individual), limpamos todo.
    if (!window._pendingIndividualEdit_Public || dayChanged) {
        // Si cambió el día, desactivamos el modo edición individual para que todo el pack se mueva junto
        if (dayChanged) window._pendingIndividualEdit_Public = null;

        cart.forEach(item => {
            if (item.id != selectingForCartId) {
                item.date = null;
                item.time = null;
                item.specialist = null;
                item.isAutoScheduled = false;
            }
        });
        localStorage.setItem('margarita_cart', JSON.stringify(cart));
        if (typeof window.margaritaCart !== 'undefined') window.margaritaCart = cart;
    }

    // 1. Actualizar el servicio actual (el ancla)
    updateCartItem(selectingForCartId, 'date', chosenDate);
    updateCartItem(selectingForCartId, 'time', time);
    updateCartItem(selectingForCartId, 'specialist', specialist);
    
    // 2. Si hay mas servicios en el carrito sin fecha/hora, intentar auto-agendar
    const currentCart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
    const pendingItems = currentCart.filter(function(i){ return i.id != selectingForCartId && (!i.time || !i.date); });
    
    if (currentCart.length >= 2 && pendingItems.length > 0 && !window._pendingIndividualEdit_Public) {
        const success = autoScheduleCart(selectingForCartId);
        // Si falla, ya el autoSchedule tira el toast y se queda en la agenda
        if (!success) return; 
    }

    // En lugar de cerrar, refrescamos la cuadrícula para ver los cambios en tiempo real
    window.renderPublicVisualAgendaGrid();
};

function autoScheduleCart(anchorId) {
    try {
        const anchor = cart.find(i => i.id == anchorId);
        if (!anchor || !anchor.time) return false;

        const dbServices = JSON.parse(localStorage.getItem('margarita_services') || '[]');
        const simultGroups = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');
        const specialists = JSON.parse(localStorage.getItem('margarita_specialists') || '[]');
        const appointments = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');

        const getMins = (t) => {
            if (!t) return 0;
            let [h, m] = t.split(':').map(val => parseInt(val));
            const low = t.toLowerCase();
            if (low.includes('pm') && h < 12) h += 12;
            if (low.includes('am') && h === 12) h = 0;
            return h * 60 + m;
        };
        const formatMins = (m) => {
            const hh = Math.floor(m / 60);
            const mm = String(m % 60).padStart(2, '0');
            return `${String(hh).padStart(2, '0')}:${mm}`;
        };

        const canDo = (spec, serviceName) => {
            const nSpec = normalizeSearch(spec.specialty || 'Todos');
            if (nSpec.includes('todos')) return true;
            
            const nSvc = normalizeSearch(serviceName);
            const svc = dbServices.find(s => normalizeSearch(s.title) === nSvc);
            if (!svc) return false;
            
            const catName = normalizeSearch(svc.categoryDisplay || svc.category || "");
            
            // Verificación simple y efectiva por palabras clave
            const keywords = nSpec.split(/[\s,]+/).filter(w => w.length > 2);
            return keywords.some(k => nSvc.includes(k) || catName.includes(k));
        };

        const isBusy = (specName, date, startM, duration) => {
            const endM = startM + duration;
            const normDateInternal = (d) => (d && d.includes('/')) ? d.split('/').reverse().join('-') : (d || '');
            const targetDate = normDateInternal(date);
            const nSpecLower = normalizeSearch(specName);
            
            const overlap = (s1, d1, s2, d2) => {
                const e1 = s1 + d1;
                const e2 = s2 + d2;
                return (s1 < e2 && e1 > s2); // Intersección real de minutos
            };

            const hasApt = appointments.some(a => {
                if (normDateInternal(a.date) !== targetDate || a.status === 'cancelled' || a.status === 'rejected' || a.status === 'accepted') return false;
                if (normalizeSearch(a.specialist) !== nSpecLower) return false;
                const aS = getMins(a.time);
                const matchA = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(a.service));
                const aD = window.getDurationInMins(a.duration || (matchA ? matchA.duration : null), a.service);
                return overlap(startM, duration, aS, aD);
            });
            if (hasApt) return true;

            const hasOther = cart.some(i => {
                const nI = normalizeSearch(i.specialist);
                if (!i.time || !i.date || i.id == "TEMP_CHECK" || nI !== nSpecLower || normDateInternal(i.date) !== targetDate) return false;
                const iS = getMins(i.time);
                const matchI = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(i.service));
                const iD = window.getDurationInMins(i.duration || i._realDuration || (matchI ? matchI.duration : null), i.service);
                return overlap(startM, duration, iS, iD);
            });

            return hasOther;
        };

        const normalizeSearch = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
        const matchAnchor = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(anchor.service));
        const anchorDur = window.getDurationInMins(anchor.duration || (matchAnchor ? matchAnchor.duration : null), anchor.service);
        
        let remaining = cart.filter(i => i.id != anchorId);
        
        // INTELIGENCIA "TETRIS": Primero agendar los del MISMO grupo que el ancla (simultáneos),
        // luego los de otros grupos (secuenciales). Dentro de cada grupo, los más largos primero.
        const anchorCatId = anchor.catId || (matchAnchor ? matchAnchor.category : null);
        const anchorGroup = (simultGroups[anchorCatId] || "").trim().toUpperCase();

        remaining.sort((a,b) => {
            const dA = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(a.service));
            const dB = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(b.service));
            const catA = a.catId || (dA ? dA.category : null);
            const catB = b.catId || (dB ? dB.category : null);
            const grpA = (simultGroups[catA] || "").trim().toUpperCase();
            const grpB = (simultGroups[catB] || "").trim().toUpperCase();
            // Mismo grupo que el ancla = prioridad alta (va PRIMERO = simultáneo)
            const aInGroup = anchorGroup && grpA === anchorGroup ? 0 : 1;
            const bInGroup = anchorGroup && grpB === anchorGroup ? 0 : 1;
            if (aInGroup !== bInGroup) return aInGroup - bInGroup;
            // Dentro del mismo nivel de prioridad, los más largos van primero
            const durA = window.getDurationInMins(a.duration || (dA ? dA.duration : null), a.service);
            const durB = window.getDurationInMins(b.duration || (dB ? dB.duration : null), b.service);
            return durB - durA;
        });


        anchor.isAutoScheduled = true;
        let successCount = 0;

        // ── Hora actual para no agendar en el pasado si la fecha es hoy ──────────
        const nowObj   = new Date();
        const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth()+1).padStart(2,'0')}-${String(nowObj.getDate()).padStart(2,'0')}`;
        const normDateForToday = (d) => d && d.includes('/') ? d.split('/').reverse().join('-') : (d || '');
        const isToday  = normDateForToday(anchor.date) === todayStr;
        const nowMin   = nowObj.getHours() * 60 + nowObj.getMinutes();
        
        for (const item of remaining) {
            if (item.time && item.date) continue; 

            const matchItem = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(item.service));
            const itemDur = window.getDurationInMins(item.duration || (matchItem ? matchItem.duration : null), item.service);

            const itemCatId = item.catId || (matchItem ? matchItem.category : null);
            const itemGroup = simultGroups[itemCatId] || "";

            let assigned = false;
            let foundTime = -1;
            let foundSpec = null;

            // BÚSQUEDA INTELIGENTE DE HUECOS (Adelante y atrás)
            const checkSlot = (t) => {
                if (t + itemDur > 20 * 60 || t < 7 * 60) return null;
                // --- NO PERMITIR HORAS PASADAS SI ES HOY ---
                if (isToday && t < nowMin) return null;

                const clientConflict = cart.some(other => {
                    if (other.id === item.id || !other.time || !other.date || (other.date !== anchor.date)) return false;
                    const otherS = getMins(other.time);
                    const matchO = dbServices.find(s => normalizeSearch(s.title) === normalizeSearch(other.service));
                    const otherD = window.getDurationInMins(other.duration || other._realDuration || (matchO ? matchO.duration : null), other.service);
                    const otherCatId = other.catId || (matchO ? matchO.category : null);
                    const otherGroup = simultGroups[otherCatId] || "";
                    const isCompatible = (itemGroup && otherGroup && itemGroup.trim().toUpperCase() === otherGroup.trim().toUpperCase());
                    if (isCompatible) return false; 
                    return (t < (otherS + otherD) && (t + itemDur) > otherS);
                });
                if (clientConflict) return null;
                return specialists.find(s => {
                    if (s.active === false) return false;
                    if (!canDo(s, item.service)) return false;
                    return !isBusy(s.name, anchor.date, t, itemDur);
                });
            };

            // A) BÚSQUEDA HACIA ADELANTE (Desde el ancla hasta el cierre)
            for (let t = getMins(anchor.time); (t + itemDur) <= 20 * 60; t += 30) {
                const availableSpec = checkSlot(t);
                if (availableSpec) {
                    foundTime = t; foundSpec = availableSpec; assigned = true; break;
                }
            }

            // B) BÚSQUEDA HACIA ATRÁS (Antes de la hora del ancla)
            if (!assigned) {
                for (let t = getMins(anchor.time) - 30; t >= 7 * 60; t -= 30) {
                    const availableSpec = checkSlot(t);
                    if (availableSpec) {
                        foundTime = t; foundSpec = availableSpec; assigned = true; break;
                    }
                }
            }
            
            if (assigned) {
                item.date = anchor.date;
                item.time = formatMins(foundTime);
                item.specialist = foundSpec.name;
                item.isAutoScheduled = true;
                successCount++;
            } else {
                // BLOQUEO RADICAL: Si un servicio del pack no cabe, revertir todo y avisar.
                let failedService = item.service;
                cart.forEach(function(i) {
                    if (i.isAutoScheduled) {
                        i.time = null; i.date = null; i.specialist = null; i.isAutoScheduled = false;
                    }
                });
                if (anchor) { anchor.time = null; anchor.date = null; anchor.isAutoScheduled = false; }
                localStorage.setItem('margarita_cart', JSON.stringify(cart));
                if (typeof renderCart === 'function') renderCart();
                const isMob = window.innerWidth < 768;
                const isCombo = cart.some(i => i.promoType === 'combo');
                const isPack = cart.length > 1;
                const label = isCombo ? 'El combo' : (isPack ? 'El paquete' : 'El servicio');
                const msg = isMob ? (`\u26a0\ufe0f ${label} no cabe. Elige otro d\u00eda.`) : ('\u26a0\ufe0f El horario no alcanza para: ' + failedService + '. Elige una hora m\u00e1s temprana o agenda al d\u00eda siguiente.');
                showToast(msg, 'error');
                return false; // SALIR SIN CERRAR AGENDA
            }
        }

        if (successCount > 0) {
            const isMob = window.innerWidth < 768;
            const msg = isMob ? `<i class="fas fa-magic"></i> ${successCount} servicios organizados` : `<i class="fas fa-magic"></i> ${successCount} serv. organizado(s) automaticamente`;
            showToast(msg, 'success');
            // CRÁTICO: Persistir los cambios del auto-agendador a localStorage
            // Sin esto, agendarCitas leera una version vieja sin especialista/hora de los servicios auto-agendados
            localStorage.setItem('margarita_cart', JSON.stringify(cart));
            if (typeof renderCart === 'function') renderCart();
        }
        return true; // ÉXITO: Cerrar agenda
    } catch(err) {
        showToast("Error de Sistema (AutoSchedule): " + err.message, "error");
        console.error(err);
        return false;
    }
}

window.highlightAgendaSlot = function(cell, isOver) {
    if (!cell) return;
    const preview = cell.querySelector('.booking-preview-block');
    if (preview) {
        preview.style.opacity = isOver ? '1' : '0';
    }
};

window.renderPublicVisualAgendaGrid = function() {
    const canvas = document.getElementById('public-grid-canvas');
    const selectedDateInput = document.getElementById('public-agenda-date');
    if (!canvas || !selectedDateInput) return;

    // --- 1. PRESERVAR SCROLL MANUALMENTE ---
    let preservedScrollLeft = 0;
    let preservedScrollTop = 0;
    if (canvas.firstElementChild) {
        preservedScrollLeft = canvas.firstElementChild.scrollLeft || 0;
        preservedScrollTop = canvas.firstElementChild.scrollTop || 0;
    }

    try {
        // Solo mostrar 'cargando' si el canvas no tiene la tabla ya dibujada, 
        // para evitar que el cambio temporal de Layout borre el scroll.
        if (!canvas.innerHTML.includes('<table')) {
            canvas.innerHTML = '<div style="text-align:center; padding:50px; color:#999;"><i class="fas fa-spinner fa-spin"></i> Cargando agenda...</div>';
        }
        const selectedDate = selectedDateInput.value;

    const normalize = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    // Normalizador robusto: quita &, /, -, y, etc. para comparar solo palabras clave
    const normCat = (s) => normalize(s).replace(/[&\/\-,\.\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
    const catMatch = (specStr, catStr) => {
        const a = normCat(specStr);
        const b = normCat(catStr);
        if (a === b) return true;
        if (b.includes(a) || a.includes(b)) return true;
        // Comparar palabras clave individuales (ej: "cejas" matchea con "cejas pestanas")
        const aWords = a.split(' ').filter(w => w.length > 2);
        const bWords = b.split(' ').filter(w => w.length > 2);
        return aWords.some(aw => bWords.some(bw => aw === bw || aw.includes(bw) || bw.includes(aw)));
    };

    const specialists = JSON.parse(localStorage.getItem('margarita_specialists') || '[]');
    const appointments = JSON.parse(localStorage.getItem('margarita_appointments') || '[]');
    const currentCart = JSON.parse(localStorage.getItem('margarita_cart') || '[]');
    const dbS = JSON.parse(localStorage.getItem('margarita_services') || '[]');

    if (specialists.length === 0 || dbS.length === 0) {
        canvas.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa; font-style:italic;">Inicializando datos... Por favor espera un momento.</div>';
        return;
    }

    const fM = (m) => { 
        const h = Math.floor(m / 60); 
        const mm = String(m % 60).padStart(2, '0'); 
        const ap = h >= 12 ? 'PM' : 'AM'; 
        return `${h % 12 || 12}:${mm} ${ap}`; 
    };
    
    // 1. Obtener especialistas activos
    let activeSpecs = specialists.filter(s => (typeof s === 'object' ? s.active !== false : true));

    // 2. Filtrar SOLO si estamos eligiendo para un item específico del carrito
    // Si no hay selectingForCartId, mostramos la agenda general con TODOS los profesionales activos
    if (typeof selectingForCartId !== 'undefined' && selectingForCartId) {
        const activeItem = currentCart.find(i => i.id == selectingForCartId);
        if (activeItem) {
            activeSpecs = activeSpecs.filter(spec => {
                const specSpecialty = spec.specialty || 'Todos';
                const specList = specSpecialty.split(',').map(s => s.trim());
                if (specList.some(s => normalize(s) === 'todos')) {
                    spec.canDoActive = true;
                    return true;
                }
                
                const canDoCurrent = specList.some(s => 
                    catMatch(s, activeItem.category) || 
                    catMatch(s, activeItem.catId || '') || 
                    catMatch(s, activeItem.service || activeItem.name || '')
                );
                
                spec.canDoActive = canDoCurrent;

                // Ver si puede hacer ALGÚN servicio de todo el carrito
                const canDoAny = currentCart.some(cartItem => {
                    return specList.some(s => 
                        catMatch(s, cartItem.category) || 
                        catMatch(s, cartItem.catId || '') || 
                        catMatch(s, cartItem.service || cartItem.name || '')
                    );
                });

                // También incluir si YA está asignado a otro item del carrito 
                const isAssigned = currentCart.some(cartItem => {
                    return cartItem.specialist && normalize(cartItem.specialist) === normalize(spec.name);
                });

                return canDoAny || isAssigned;
            });
        }
    } else {
        activeSpecs.forEach(s => s.canDoActive = true);
    }

    if (activeSpecs.length === 0) {
        canvas.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #a94442; background: #f2dede; border-radius: 15px; border: 1px dashed #ebccd1; font-family: 'Montserrat', sans-serif;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.8;"></i>
                <h3 style="margin: 0 0 10px 0; font-size: 1.2rem; font-weight: 800; text-transform: uppercase;">Sin Profesionales</h3>
                <p style="margin: 0; font-size: 0.95rem; font-weight: 500;">No tienes profesionales asignados para realizar el servicio seleccionado.</p>
            </div>
        `;
        return;
    }

    const getCleanDuration = (item) => {
        const tN = normalize(item.name || item.service || "");
        
        // Búsqueda flexible (Igual que en el carrito)
        let mS = dbS.find(s => normalize(s.name) === tN || normalize(s.title) === tN || (s.id && s.id == item.catId));
        if (!mS) {
            mS = dbS.find(s => {
                const sT = normalize(s.title || s.name);
                return sT.includes(tN) || tN.includes(sT);
            });
        }

        const tV = mS ? (mS.duration || mS.time) : null;
        return window.getDurationInMins(tV, item.name || item.service);
    };

            currentCart.forEach(item => {
                item._realDuration = getCleanDuration(item);
            });

            const simultGroups = JSON.parse(localStorage.getItem('margarita_simult_groups') || '{}');

            const normDate = (d) => {
        if(!d) return '';
        const p = d.split(/[-/]/);
        if(p.length < 3) return d;
        if(p[0].length === 4) return `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`;
        return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    };

    const getMin = (t) => {
        if(!t) return 0;
        const low = t.toLowerCase();
        let [hP, mP] = t.split(':');
        let h = parseInt(hP); let m = parseInt(mP || 0);
        if(low.includes('pm') && h < 12) h += 12;
        if(low.includes('am') && h === 12) h = 0;
        return h * 60 + m;
    };

    const calendarDate = normDate(selectedDate);
    
    // Check if the selected date is today to block past slots
    const nowObj = new Date();
    const todayStr = (nowObj.getFullYear() + '-' + String(nowObj.getMonth() + 1).padStart(2,'0') + '-' + String(nowObj.getDate()).padStart(2,'0'));
    const isToday = calendarDate === todayStr;
    const currentMins = nowObj.getHours() * 60 + nowObj.getMinutes();

    // 2. CITAS EXISTENTES (Solo bloquean la agenda si son 'pending' — citas activas futuras)
    // Las 'accepted' (ya realizadas), 'cancelled' y 'rejected' liberan el espacio.
    const dayApts = appointments.filter(a => {
        if (normDate(a.date) !== calendarDate || a.status === 'cancelled' || a.status === 'rejected' || a.status === 'accepted') return false;
        
        // Si es hoy, borrar visualmente las citas que YA TERMINARON (Pasado)
        if (isToday) {
            const aStart = getMin(a.time);
            const aDur = window.getDurationInMins(a.duration || a.time, a.service);
            if ((aStart + aDur) <= currentMins) return false;
        }
        return true;
    });
    
    // Volvemos a filas de 1 hora para que sea más claro visualmente. 
    // Si es hoy, acortamos el inicio de la agenda según la hora actual.
    let hours = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
    if (isToday) {
        const curH = nowObj.getHours();
        hours = hours.filter(h => parseInt(h.split(':')[0]) >= curH);
        // Asegurar que si ya es tarde noche no quede vacía, sino que muestre al menos el aviso de cierre o las últimas horas.
    }
    const rowH = 90; // Cada hora mide 90px

    let currentBookingDuration = 60;
    const activeItem = typeof selectingForCartId !== 'undefined' ? currentCart.find(i => i.id == selectingForCartId) : null;
    if(activeItem) {
        currentBookingDuration = window.getDurationInMins(activeItem.duration || activeItem._realDuration || activeItem.time, activeItem.service);
    }

    let html = `
    <div style="overflow-x:auto; border-radius:15px; background:white; box-shadow:0 10px 30px rgba(0,0,0,0.1); -webkit-overflow-scrolling:touch; overflow-anchor:none;">
        <table class="responsive-agenda-grid" style="width:100%; border-collapse:collapse; min-width:700px; font-family:'Montserrat', sans-serif; table-layout:fixed;">
            <thead style="background:#fdfdfd; border-bottom:2px solid #f0f0f0;">
                <tr>
                    <th style="width:80px; padding:20px; color:#555; text-transform:uppercase; font-size:0.75rem;">Hora</th>
                    ${activeSpecs.map(s => {
                        const name = typeof s === 'object' ? s.name : s;
                        const img = typeof s === 'object' && s.image ? s.image : '';
                        return `
                        <th style="padding:15px; color:#333; text-transform:uppercase; font-size:0.75rem; border-left:1px solid #eee;">
                            <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
                                ${img ? `<img src="${img}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--color-accent);">` : `<div style="width:40px; height:40px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; color:#999;"><i class="fas fa-user-circle"></i></div>`}
                                <span style="font-weight:800;">${name}</span>
                            </div>
                        </th>`;
                    }).join('')}
                </tr>
            </thead>
            <tbody>
                ${hours.map(hour => {
                    const hStart = parseInt(hour.split(':')[0]);
                    return `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="height:${rowH}px; text-align:center; color:#777; font-weight:700; background:#fafafa; border-right:1px solid #eee;">${window.formatTime12h(hour)}</td>
                        ${activeSpecs.map((spec, sIdx) => {
                            const sName = typeof spec === 'object' ? spec.name : spec;
                            const nSpec = normalize(sName);
                            const cols = [{bg:'#fdf2f5',b:'#e56a9e',t:'#d63384'},{bg:'#f6f1ff',b:'#a58eff',t:'#7b4fff'},{bg:'#f0f9ff',b:'#7cc2ff',t:'#0088ff'}];
                            const sCol = cols[sIdx % cols.length];

                            const slots = [`${hStart}:00`, `${hStart}:30`].map(timeStr => {
                                const t = timeStr.padStart(5, '0');
                                const slotMin = getMin(t);
                                
                                // 1. MI SELECCIÁ“N ACTUAL
                                let isYour = false;
                                if(activeItem && activeItem.date && activeItem.time && normDate(activeItem.date) === calendarDate && normalize(activeItem.specialist||"") === nSpec) {
                                    if(getMin(activeItem.time) === slotMin) isYour = true;
                                }

                                // 2. OTRO DEL CARRITO
                                let cartExt = null;
                                const cartOcc = currentCart.find(i => {
                                    if(i.id == selectingForCartId || !i.time || !i.date) return false;
                                    if(normDate(i.date) !== calendarDate || normalize(i.specialist||"") !== nSpec) return false;
                                    const iS = getMin(i.time);
                                    const iD = window.getDurationInMins(i.duration || i._realDuration || i.time, i.service);
                                    return (slotMin >= iS && slotMin < (iS + iD));
                                });
                                if(cartOcc) cartExt = cartOcc;

                                // 3. OCUPADO EN DB
                                const isActuallyOccupiedByApt = dayApts.some(a => {
                                    if (normalize(a.specialist||"") !== nSpec) return false;
                                    const aS = getMin(a.time);
                                    const aD = window.getDurationInMins(a.duration || a.time, a.service);
                                    return (slotMin >= aS && slotMin < (aS + aD));
                                });
                                const dayS = dayApts.filter(a => normalize(a.specialist||"") === nSpec && getMin(a.time) === slotMin);
                                const isEmpty = dayS.length === 0 && !isYour && !cartExt && !isActuallyOccupiedByApt;

                                // 4. CONFLICTOS
                                let conf = false;
                                let canStartHere = false;

                                if(typeof selectingForCartId !== 'undefined' && selectingForCartId && isEmpty) {
                                    // 4.1 Â¿Está la clienta ocupada EXACTAMENTE aquí? (Marcador visual de Cruce)
                                    const clientIsBusyHere = currentCart.some(i => {
                                        if(i.id == selectingForCartId || !i.time || !i.date || normDate(i.date) !== calendarDate) return false;
                                        const iS = getMin(i.time);
                                        const iD = window.getDurationInMins(i.duration || i._realDuration || i.time, i.service);
                                        const iGrp = simultGroups[i.catId || (dbS.find(s => normalize(s.title) === normalize(i.service)) || {}).category] || "";
                                        const activeGrp = simultGroups[activeItem.catId || (dbS.find(s => normalize(s.title) === normalize(activeItem.service)) || {}).category] || "";
                                        const isSimult = iGrp && activeGrp && iGrp.trim().toUpperCase() === activeGrp.trim().toUpperCase();
                                        return (slotMin >= iS && slotMin < (iS + iD) && !isSimult);
                                    });
                                    conf = clientIsBusyHere;

                                    // 4.2 Â¿Cabe el servicio completo empezando AQUÁ? (Lógica de click)
                                    const eMin = slotMin + currentBookingDuration;
                                    const overlapsSomeone = dayApts.some(a => {
                                        if(normalize(a.specialist||"") !== nSpec) return false;
                                        const aS = getMin(a.time);
                                        const aD = window.getDurationInMins(a.duration || a.time, a.service);
                                        return (slotMin < (aS + aD) && eMin > aS);
                                    }) || currentCart.some(i => {
                                        if(i.id == selectingForCartId || !i.time || !i.date || normDate(i.date) !== calendarDate) return false;
                                        const iS = getMin(i.time);
                                        const iD = window.getDurationInMins(i.duration || i._realDuration || i.time, i.service);
                                        const iGrp = simultGroups[i.catId || (dbS.find(s => normalize(s.title) === normalize(i.service)) || {}).category] || "";
                                        const activeGrp = simultGroups[activeItem.catId || (dbS.find(s => normalize(s.title) === normalize(activeItem.service)) || {}).category] || "";
                                        const isSimult = iGrp && activeGrp && iGrp.trim().toUpperCase() === activeGrp.trim().toUpperCase();
                                        
                                        const sameSpec = normalize(i.specialist||"") === nSpec;
                                        const overlaps = (slotMin < (iS + iD) && eMin > iS);
                                        if (sameSpec && overlaps) return true;
                                        if (!isSimult && overlaps) return true;
                                        return false;
                                    });
                                    canStartHere = !overlapsSomeone && (eMin <= 20*60);
                                    
                                    // Bloquear AQUÍ si el profesional no puede hacer la especialidad del item activo
                                    if (spec.canDoActive === false) {
                                        canStartHere = false;
                                        conf = true;
                                    }
                                }

                                const isPast = isToday && slotMin < currentMins;
                                const clickable = typeof selectingForCartId !== 'undefined' && selectingForCartId && isEmpty && canStartHere && !isPast && spec.canDoActive !== false;
                                return { time: t, isYour, cartExt, dayS, clickable, isPast, conf, canDoActive: spec.canDoActive };
                            });

                            return `
                            <td style="position:relative; height:${rowH}px; padding:0; border-left:1px solid #f0f0f0;">
                                <!-- Mitad Superior (:00) y Mitad Inferior (:30) -->
                                ${slots.map((sl, idx) => {
                                    const topOffset = idx * 45; // 45px es media celda (90/2)
                                    let content = "";

                                    // 1. ZONA CLICKABLE (TRIGGER)
                                    if (sl.clickable) {
                                        const sM = getMin(sl.time);
                                        const eM = sM + currentBookingDuration;
                                        const timeRangeStr = `${fM(sM)} - ${fM(eM)}`;
                                        
                                        const isCurrentEditStart = activeItem && activeItem.time === sl.time && normDate(activeItem.date) === calendarDate && normalize(activeItem.specialist||"") === nSpec;

                                        content += `
                                        <div onclick="event.preventDefault(); event.stopPropagation(); window.handlePublicGridCellClick('${sl.time}','${sName.replace(/'/g,"\\\\'")}')" 
                                             class="agenda-trigger-half"
                                             style="position:absolute; top:${topOffset}px; left:0; width:100%; height:45px; cursor:pointer; z-index:${isCurrentEditStart ? 1500 : 3000}; transition:0.3s; overflow-anchor:none;">
                                             <div class="hover-preview" style="position:absolute; top:2px; left:4px; right:4px; height:${(currentBookingDuration/60)*rowH-4}px; border:3px dashed var(--color-accent); border-radius:12px; opacity:0; transition:0.2s; pointer-events:none; background:rgba(229,106,158,0.1); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:2000; gap:2px; box-shadow:0 0 10px rgba(255,255,255,0.4); ${isCurrentEditStart ? 'display:none;' : ''}">
                                                <div style="font-size:0.65rem; font-weight:900; color:var(--color-dark-pink); text-transform:uppercase; letter-spacing:1px; background:rgba(255,255,255,0.85); padding:2px 6px; border-radius:4px;">Agendar +</div>
                                                <div style="font-size:0.55rem; font-weight:800; color:var(--color-dark-pink); background:rgba(255,255,255,0.85); padding:1px 5px; border-radius:3px;">${timeRangeStr}</div>
                                             </div>
                                        </div>`;
                                    } else if (sl.isPast && !sl.dayS.length && !sl.isYour && !sl.cartExt) {
                                        content += `
                                        <div style="position:absolute; top:${topOffset+2}px; left:4px; right:4px; height:41px; background:#f0f0f0; border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px solid #e5e5e5; pointer-events:none; z-index:5;">
                                             <span style="font-size:0.55rem; color:#888; font-weight:800; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:3px;">
                                                <i class="fas fa-history" style="font-size:0.6rem; opacity:0.6;"></i> Pasado
                                             </span>
                                        </div>`;
                                    } else if (sl.conf && !sl.clickable && !sl.isYour && !sl.cartExt && !sl.dayS.length && !sl.isPast) {
                                        // 1.6 MARCADOR "CRUCE" / "NO DISPONIBLE"
                                        const isNoCapable = sl.canDoActive === false;
                                        const blockText = isNoCapable ? "NO DISPONIBLE" : "CRUCE";
                                        const blockIcon = isNoCapable ? "fa-user-slash" : "fa-ban";
                                        content += `
                                        <div style="position:absolute; top:${topOffset+2}px; left:4px; right:4px; height:41px; background:rgba(0,0,0,0.03); border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px dashed #ccc; pointer-events:none; z-index:5; color:#aaa; flex-direction:column; gap:2px;">
                                             <i class="fas ${blockIcon}" style="font-size:0.6rem;"></i>
                                             <span style="font-size:0.5rem; font-weight:900; text-transform:uppercase; letter-spacing:1px;">${blockText}</span>
                                         </div>`;
                                    }

                                    // 2. MARCADOR "TU CITA"
                                    if(sl.isYour) {
                                        const d = currentBookingDuration; 
                                        const sM = getMin(sl.time);
                                        const eM = sM + d;
                                        const isShort = d <= 30;
                                        const isIndEdit = window._pendingIndividualEdit_Public == activeItem.id;
                                        const bGrad  = isIndEdit ? 'linear-gradient(135deg, #f39c12, #d35400)' : 'linear-gradient(135deg, #e91e63, #ad1457)';
                                        const labText = isIndEdit ? 'EDITANDO' : 'TU CITA';

                                        content += `<div class="public-selection-active ${isIndEdit ? 'pulse-edit' : ''}" onclick="window.togglePublicCartEditMode('${activeItem.id}'); event.stopPropagation();" style="position:absolute; top:${topOffset+2}px; left:8px; right:8px; height:${(d/60)*rowH-4}px; background:${bGrad}; border-radius:12px; z-index:2100; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; border:2.5px solid #fff; box-shadow:0 8px 25px rgba(233,30,99,0.5); pointer-events:auto; opacity:${isIndEdit ? '0.9' : '1'}; cursor:pointer; padding:${isShort ? '2px 8px' : '5px 10px'}; text-align:center;">
                                            ${!isShort ? `<div style="font-size:0.58rem; background:rgba(255,255,255,0.25); padding:1px 8px; border-radius:10px; text-transform:uppercase; margin-bottom:5px; font-weight:800; letter-spacing:0.5px;"><i class="fas ${isIndEdit ? 'fa-edit' : 'fa-magic'}"></i> ${labText}</div>` : ''}
                                            <div style="display:flex; align-items:center; justify-content:center; gap:6px; width:100%; flex-wrap:nowrap;">
                                                <div style="font-size:${isShort ? '0.8rem' : '0.9rem'}; font-weight:900; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isShort ? '<i class="fas fa-magic" style="font-size:0.6rem;"></i> ' : ''}${activeItem.service || activeItem.name}</div>
                                                <div style="font-size:${isShort ? '0.7rem' : '0.75rem'}; font-weight:700; background:rgba(0,0,0,0.2); padding:2px 6px; border-radius:5px; white-space:nowrap;">${fM(sM)} - ${fM(eM)}</div>
                                            </div>
                                        </div>`;
                                    }

                                    // 3. MARCADOR "TU OTRA RESERVA"
                                    if(sl.cartExt && getMin(sl.cartExt.time) === getMin(sl.time)) {
                                        const d = window.getDurationInMins(sl.cartExt.duration || 60, sl.cartExt.service);
                                        const oSM = getMin(sl.cartExt.time);
                                        const oEM = oSM + d;
                                        const isShortExt = d <= 30;
                                        content += `<div onclick="window.togglePublicCartEditMode('${sl.cartExt.id}'); event.stopPropagation();" style="position:absolute; top:${topOffset+2}px; left:8px; right:8px; height:${(d/60)*rowH-4}px; background:#c4888f; border:2px solid #b07078; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:2100; color:white; text-align:center; pointer-events:auto; cursor:pointer; box-shadow:0 8px 15px rgba(180,120,130,0.3); padding:${isShortExt ? '2px 8px' : '5px 10px'};">
                                            ${!isShortExt ? `<div style="font-size:0.58rem; opacity:0.95; text-transform:uppercase; font-weight:800; margin-bottom:5px; letter-spacing:0.5px; background:rgba(255,255,255,0.15); padding:1px 8px; border-radius:10px;">Tu Reserva</div>` : ''}
                                            <div style="display:flex; align-items:center; justify-content:center; gap:6px; width:100%; flex-wrap:nowrap;">
                                                <div style="font-size:${isShortExt ? '0.75rem' : '0.85rem'}; font-weight:900; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isShortExt ? '<i class="fas fa-shopping-bag" style="font-size:0.6rem;"></i> ' : ''}${sl.cartExt.service || sl.cartExt.name}</div>
                                                <div style="font-size:${isShortExt ? '0.65rem' : '0.65rem'}; font-weight:700; opacity:0.95; background:rgba(0,0,0,0.1); padding:1px 5px; border-radius:4px; white-space:nowrap;">${fM(oSM)} - ${fM(oEM)}</div>
                                            </div>
                                        </div>`;
                                    }

                                    // 4. MARCADOR "RESERVADO" (DB)
                                    if(sl.dayS.length > 0) {
                                        const dA = sl.dayS[0]; 
                                        const dur = parseInt(dA.duration || 60);
                                        const sM = getMin(dA.time); 
                                        const eM = sM + dur;
                                        
                                        // Detectar si está en curso (Hoy + Hora actual entre inicio y fin)
                                        const isInProgress = isToday && currentMins >= sM && currentMins < eM;
                                        
                                        const bgStyle = isInProgress 
                                            ? `repeating-linear-gradient(45deg, ${sCol.bg}, ${sCol.bg} 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)` 
                                            : sCol.bg;

                                        content += `<div style="position:absolute; top:${topOffset}px; left:0; width:100%; height:${(dur/60)*rowH}px; background:${bgStyle}; border:1.5px solid ${sCol.b}; border-radius:10px; z-index:500; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:5px; color:${sCol.t}; font-size:0.65rem; font-weight:800; text-align:center; pointer-events:none; box-shadow:0 4px 10px rgba(0,0,0,0.03); overflow:hidden;">
                                            <div style="text-transform:uppercase; font-size:0.6rem; display:flex; align-items:center; gap:4px;">
                                                <i class="fas ${isInProgress ? 'fa-spinner fa-spin' : 'fa-lock'}"></i> 
                                                ${isInProgress ? 'EN CURSO' : 'RESERVADO'}
                                            </div>
                                            <div style="font-size:0.55rem; opacity:0.8;">${fM(sM)} - ${fM(eM)}</div>
                                        </div>`;
                                    }

                                    return content;
                                }).join('')}
                            </td>`;
                        }).join('')}
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    <style>
        .agenda-trigger-half:hover .hover-preview {
            opacity: 1 !important;
        }
        .agenda-trigger-half:hover {
            background: rgba(229, 106, 158, 0.03);
        }
        @keyframes pulse-edit {
            0% { box-shadow: 0 0 0 0 rgba(233, 30, 99, 0.4); transform: scale(1); }
            50% { box-shadow: 0 0 0 15px rgba(233, 30, 99, 0); transform: scale(1.02); }
            100% { box-shadow: 0 0 0 0 rgba(233, 30, 99, 0); transform: scale(1); }
        }
        .pulse-edit {
            animation: pulse-edit 3s infinite ease-in-out;
            z-index: 3000 !important;
            border: 3px solid white !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
        }
        @media (max-width: 768px) {
            .responsive-agenda-grid { width: auto !important; min-width: auto !important; margin: 0 auto; border-left: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; }
            .responsive-agenda-grid th:not(:first-child) { width: 180px !important; min-width: 180px !important; overflow: hidden; }
        }
    </style>`;
        canvas.innerHTML = html;

        // --- 2. RESTAURAR SCROLL MANUALMENTE ---
        if (canvas.firstElementChild && preservedScrollLeft !== undefined) {
            // Un pequeño retraso para asegurar que el DOM interpretó la nueva tabla
            requestAnimationFrame(() => {
                // 1. RESTAURAR POSICIÓN PREVIAMENTE GUARDADA (INSTANTÁNEO)
                // Evita el salto brusco a la primera columna en redibujos de estado
                if (preservedScrollLeft !== undefined) canvas.firstElementChild.scrollLeft = preservedScrollLeft;
                if (preservedScrollTop !== undefined) canvas.firstElementChild.scrollTop = preservedScrollTop;

                // 2. AUTO-ENFOCAR CON SUAVE DESPLAZAMIENTO (SOLO SI SE SOLICITÓ)
                const activeEditTarget = canvas.querySelector('.pulse-edit') || canvas.querySelector('.public-selection-active');
                if (window._shouldAutoFocusAgenda && activeEditTarget) {
                    setTimeout(() => {
                        activeEditTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    }, 450);
                    window._shouldAutoFocusAgenda = false;
                }
            });
        }

    } catch(err) {
        console.error("âŒ Error en Agenda Visual:", err);
        canvas.innerHTML = `
            <div style="text-align:center; padding:40px; color:#d9534f; background:#f9f2f4; border-radius:15px; border:1px dashed #ebccd1;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px;"></i>
                <p style="font-weight:700;">Lo sentimos, hubo un problema al cargar la agenda.</p>
                <p style="font-size:0.8rem;">${err.message}</p>
                <button onclick="location.reload()" style="margin-top:10px; padding:8px 15px; background:#d9534f; color:white; border:none; border-radius:8px; cursor:pointer;">Refrescar todo</button>
            </div>
        `;
    }
};

// Escuchar cambios en tiempo real desde otras pestañas (mismo navegador) para re-renderizar sin refrescar
window.addEventListener('storage', (e) => {
    if (e.key === 'margarita_services' || e.key === 'margarita_categories' || e.key === 'margarita_promos') {
        console.log("♻️ [RealTime] Cambio detectado en base de datos. Actualizando...");
        if (window.renderDynamicContent) window.renderDynamicContent();
        if (window.populateManualCategories) window.populateManualCategories();
    }
    // Actualizar burbuja flotante cuando el admin cambia la configuración Pro
    if (e.key === 'margarita_promo_bubble_cfg') {
        if (typeof updatePromoBubbleUI === 'function') updatePromoBubbleUI();
    }
});

});

