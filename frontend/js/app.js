// ==========================================================================

const bizTypeTranslations = {
    'restaurant': 'Restaurante',
    'retail': 'Tienda',
    'services': 'Servicios',
    'salon': 'Belleza',
    'health': 'Salud',
    'education': 'Educación',
    'other': 'Otros'
};

// Premium Super Admin styles are loaded statically from style.css
function injectSuperAdminStyles() {}

// --- CUSTOM TABLE DRAWING (NO DEPENDENCIES) ---
function drawCustomTable(doc, headers, rows, startY, options = {}) {
    const margin = options.margin || 14;
    const cellPadding = options.cellPadding || 4;
    const fontSize = options.fontSize || 8.5;
    const lineSpacing = options.lineSpacing || 4.5;
    const pageHeight = (doc.internal.pageSize && typeof doc.internal.pageSize.getHeight === 'function') 
        ? doc.internal.pageSize.getHeight() 
        : (doc.internal.pageSize && doc.internal.pageSize.height) || 297;
    const pageWidth = (doc.internal.pageSize && typeof doc.internal.pageSize.getWidth === 'function') 
        ? doc.internal.pageSize.getWidth() 
        : (doc.internal.pageSize && doc.internal.pageSize.width) || 210;
    const tableWidth = pageWidth - (margin * 2);
    
    // Column widths calculation
    const columnsCount = headers[0].length;
    let colWidths = options.colWidths || [];
    if (colWidths.length === 0) {
        // Equal distribution by default
        for (let i = 0; i < columnsCount; i++) {
            colWidths.push(tableWidth / columnsCount);
        }
    }
    
    let currentY = startY;
    
    // Helper to draw Header
    function drawHeader() {
        doc.setFillColor(79, 70, 229); // Indigo Header
        doc.rect(margin, currentY, tableWidth, 10, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(fontSize);
        doc.setTextColor(255, 255, 255);
        
        let currentX = margin;
        headers[0].forEach((headerText, i) => {
            doc.text(String(headerText), currentX + cellPadding, currentY + 6.5);
            currentX += colWidths[i];
        });
        currentY += 10;
    }
    
    drawHeader();
    
    // Draw Rows
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    
    rows.forEach((row, rowIndex) => {
        // 1. Calculate row height based on text wrapping
        let maxLines = 1;
        const cellLines = row.map((cellText, i) => {
            const textStr = String(cellText || '');
            const lines = doc.splitTextToSize(textStr, colWidths[i] - (cellPadding * 2));
            if (lines.length > maxLines) maxLines = lines.length;
            return lines;
        });
        
        const rowHeight = (maxLines * lineSpacing) + (cellPadding * 2);
        
        // 2. Page break check
        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            currentY = 48; // Margin top under header overlay
            drawHeader();
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
        }
        
        // 3. Striped rows background
        if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 250, 252); // Alternating light gray
        } else {
            doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
        
        // 4. Row bottom border line
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, currentY + rowHeight, margin + tableWidth, currentY + rowHeight);
        
        // 5. Draw cell text
        let currentX = margin;
        cellLines.forEach((lines, i) => {
            let textY = currentY + cellPadding + 3; // base text offset
            lines.forEach((line) => {
                doc.text(line, currentX + cellPadding, textY);
                textY += lineSpacing;
            });
            currentX += colWidths[i];
        });
        
        currentY += rowHeight;
    });
    
    return currentY;
}

// --- PROMPT YEAR & MONTH (SWEETALERT2) ---
async function promptYearMonth(title) {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    
    const yearOptions = `<option value="all">Todos los años</option>` + 
        years.map(y => `<option value="${y}">${y}</option>`).join('');
        
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthOptions = `<option value="all">Todos los meses</option>` + 
        months.map((m, idx) => `<option value="${idx}">${m}</option>`).join('');
        
    const { value: formValues } = await Swal.fire({
        title: title || 'Seleccionar Período',
        html: `
            <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left; padding: 0.5rem;">
                <div>
                    <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">AÑO</label>
                    <select id="swal-year" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; background: var(--bg-surface-light); color: var(--text); border: 1px solid var(--border-color); border-radius: 8px; height: 40px; padding: 0 0.5rem; outline: none; font-family: inherit;">
                        ${yearOptions}
                    </select>
                </div>
                <div>
                    <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">MES</label>
                    <select id="swal-month" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; background: var(--bg-surface-light); color: var(--text); border: 1px solid var(--border-color); border-radius: 8px; height: 40px; padding: 0 0.5rem; outline: none; font-family: inherit;">
                        ${monthOptions}
                    </select>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Generar PDF',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5',
        background: 'var(--bg-surface, #1e293b)',
        color: 'var(--text, #f8fafc)',
        didOpen: () => {
            window.makeSwalSelect('swal-year');
            window.makeSwalSelect('swal-month');
        },
        preConfirm: () => {
            return {
                year: document.getElementById('swal-year').value,
                month: document.getElementById('swal-month').value
            }
        }
    });
    
    return formValues;
}

// --- UTILERIAS PREMIUM (NOTIFICACIONES & BUSQUEDA) ---
window.playMessageChime = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        console.warn('Audio Context not allowed or failed:', e);
    }
};

let titleFlashInterval = null;
let originalTitle = document.title || 'Panel Administración | AS Sierra Systems';
window.startTitleFlash = function() {
    if (document.hasFocus()) return;
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    let isOriginal = false;
    titleFlashInterval = setInterval(() => {
        document.title = isOriginal ? originalTitle : '💬 (1) Nuevo mensaje';
        isOriginal = !isOriginal;
    }, 1000);
};

window.stopTitleFlash = function() {
    if (titleFlashInterval) {
        clearInterval(titleFlashInterval);
        titleFlashInterval = null;
    }
    document.title = originalTitle;
};

window.addEventListener('focus', () => {
    window.stopTitleFlash();
});

window.handleChatSearch = function(query) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;
    const q = query.trim().toLowerCase();
    
    // Buscar en todas las burbujas que contengan texto usando la clase robusta
    const bubbles = container.querySelectorAll('.chat-message-text');
    
    let firstMatch = null;
    
    bubbles.forEach(bubble => {
        let text = bubble.getAttribute('data-original-text');
        if (text === null) {
            text = bubble.textContent || '';
            bubble.setAttribute('data-original-text', text);
        }
        const parent = bubble.parentElement;
        if (!parent) return;

        if (q === '') {
            bubble.textContent = text;
            parent.style.opacity = '1';
        } else {
            const normText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normQuery = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            if (normText.includes(normQuery)) {
                // Intentar resaltar la palabra buscada
                const escaped = text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
                try {
                    const regex = new RegExp(`(${q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
                    bubble.innerHTML = escaped.replace(regex, '<mark style="background:#f59e0b;color:black;border-radius:2px;padding:0 2px;">$1</mark>');
                } catch(e) {
                    bubble.textContent = text;
                }
                parent.style.opacity = '1';
                if (!firstMatch) {
                    firstMatch = bubble;
                }
            } else {
                bubble.textContent = text;
                parent.style.opacity = '0.35';
            }
        }
    });

    if (q === '') {
        // Al limpiar la búsqueda, ir al final del chat
        container.scrollTop = container.scrollHeight;
    } else if (firstMatch) {
        // Centrar el primer mensaje coincidente en el contenedor
        const containerRect = container.getBoundingClientRect();
        const elemRect = firstMatch.getBoundingClientRect();
        const relativeTop = elemRect.top - containerRect.top + container.scrollTop;
        
        container.scrollTo({
            top: relativeTop - (container.clientHeight / 2) + (elemRect.height / 2),
            behavior: 'smooth'
        });
    }
};


window.scrollCarousel = function(btn, direction) {
    const parent = btn.parentNode;
    if (!parent) return;
    const track = parent.querySelector('.carousel-scroll-container') || parent.querySelector('.carousel-track');
    if (!track) return;
    const cardWidth = track.firstElementChild ? track.firstElementChild.offsetWidth + 24 : 340;
    track.scrollBy({
        left: direction * cardWidth,
        behavior: 'smooth'
    });
};


// Helper para parsear fechas de facturación de manera segura (evitando Invalid Date si ya incluye T o zona horaria)
function parseBillingDate(dateStr) {
    if (!dateStr) return null;
    let dateObj;
    if (typeof dateStr !== 'string') {
        dateObj = new Date(dateStr);
    } else if (dateStr.includes('T') || dateStr.includes(' ') || dateStr.length > 10) {
        dateObj = new Date(dateStr);
    } else {
        dateObj = new Date(dateStr + 'T00:00:00');
    }
    return isNaN(dateObj.getTime()) ? null : dateObj;
}

// Helper para formatear fechas en español de Colombia de manera segura
function formatBillingDate(dateStr, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
    const parsed = parseBillingDate(dateStr);
    return parsed ? parsed.toLocaleDateString('es-CO', options) : '—';
}

// Helper para obtener la fecha de corte más cercana de todas las sedes activas de un negocio
function getClosestBillingDate(biz) {
    const billing = biz.billing || {};
    if (biz.moduleInstances && biz.moduleInstances.length > 0) {
        const activeDates = biz.moduleInstances
            .filter(inst => inst.status === 'active' && inst.renewalDate)
            .map(inst => parseBillingDate(inst.renewalDate))
            .filter(dObj => dObj !== null);
        if (activeDates.length > 0) {
            const minDateObj = new Date(Math.min(...activeDates.map(d => d.getTime())));
            return minDateObj.toISOString();
        }
    }
    return billing.next_billing_date;
}


// State Management
const appState = {
    theme: localStorage.getItem('as_theme') || 'light',
    sidebarCollapsed: localStorage.getItem('as_sidebar') === 'true',
    user: JSON.parse(localStorage.getItem('as_user') || 'null'),
    businesses: [],
    modules: [],
    users: [],
    config: {},
    notifications: [],
    isInitialized: false
};

// Helpers de autenticación admin
function getAdminToken() {
    return localStorage.getItem('as_admin_token') || '';
}
function getAdminHeaders(extra = {}) {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAdminToken()}`, ...extra };
}

window._isReauthenticating = false;
window._reauthQueue = [];

/**
 * adminFetch: igual que fetch() pero maneja 401 automáticamente.
 * Si el token expirado (servidor reiniciado), pide la contraseña
 * al admin, renueva el token en silencio y reintenta la petición.
 */
async function adminFetch(url, options = {}) {
    const headers = { ...getAdminHeaders(), ...(options.headers || {}) };
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    options.headers = headers;
    let resp = await fetch(url, options);

    if (resp.status === 401) {
        if (localStorage.getItem('as_auth') !== 'true') {
            return resp;
        }
        if (!appState.isInitialized) {
            // Si la aplicación aún no se ha inicializado completamente (es la primera carga/recarga)
            // y el token ya no es válido, cerramos la sesión silenciosamente y redirigimos al login.
            localStorage.removeItem('as_auth');
            localStorage.removeItem('as_user');
            localStorage.removeItem('as_admin_token');
            appState.user = null;
            appState.isInitialized = false;
            initTheme();
            showView('login-view');
            document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
            lucide.createIcons();
            return resp;
        }

        // Si ya hay un modal de reautenticación abierto, encolamos la petición
        if (window._isReauthenticating) {
            return new Promise((resolve) => {
                window._reauthQueue.push({ url, options, resolve });
            });
        }

        window._isReauthenticating = true;

        // Token vencido o servidor reiniciado — pedir credenciales
        const stored = appState.user;
        const result = await Swal.fire({
            title: 'Sesión expirada',
            html: `
                <p style="color:var(--text-muted);margin-bottom:1rem;">El servidor fue reiniciado. Ingrese tu contraseña para continuar.</p>
                <input type="password" id="swal-reauth-pass" class="swal2-input" placeholder="Tu contraseña" autofocus style="background:var(--bg-surface-light); color:var(--text-main); border:1px solid var(--border-color);">
            `,
            confirmButtonText: 'Renovar sesión',
            showCancelButton: true,
            cancelButtonText: 'Salir',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
            confirmButtonColor: '#6366f1',
            didOpen: (popup) => {
                const input = popup.querySelector('#swal-reauth-pass');
                if (input) {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            Swal.clickConfirm();
                        }
                    });
                }
            },
            preConfirm: async () => {
                const pass = document.getElementById('swal-reauth-pass').value;
                if (!pass) {
                    Swal.showValidationMessage('La contraseña es requerida');
                    return false;
                }
                try {
                    const refreshResp = await fetch('/api/admin/refresh-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user: stored?.user, pass })
                    });
                    const refreshData = await refreshResp.json();
                    if (refreshData.ok && refreshData.token) {
                        return refreshData.token;
                    } else {
                        Swal.showValidationMessage('❌ Credenciales incorrectas. Vuelve a intentarlo.');
                        return false;
                    }
                } catch {
                    Swal.showValidationMessage('❌ Error de red al renovar sesión.');
                    return false;
                }
            }
        });

        if (!result.isConfirmed) {
            // Usuario canceló (Salir) -> Cerrar sesión
            localStorage.removeItem('as_auth');
            localStorage.removeItem('as_user');
            localStorage.removeItem('as_admin_token');
            appState.user = null;
            appState.isInitialized = false;
            initTheme();
            showView('login-view');
            document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
            lucide.createIcons();
            showToast('Sesión cerrada.', 'info');

            // Resolver todas las peticiones encoladas con la respuesta original de 401
            const queue = window._reauthQueue;
            window._reauthQueue = [];
            window._isReauthenticating = false;
            queue.forEach(item => item.resolve(resp));

            return resp;
        }

        const newToken = result.value;
        localStorage.setItem('as_admin_token', newToken);
        showToast('✅ Sesión renovada. Reintentando...', 'success');

        // Reintentar todas las peticiones encoladas con el nuevo token
        const queue = window._reauthQueue;
        window._reauthQueue = [];
        window._isReauthenticating = false;
        queue.forEach(item => {
            if (item.options && item.options.headers) {
                item.options.headers['Authorization'] = `Bearer ${newToken}`;
            }
            item.resolve(fetch(item.url, item.options));
        });

        // Reintentar la petición original con el token nuevo
        options.headers['Authorization'] = `Bearer ${newToken}`;
        return await fetch(url, options);
    }
    return resp;
}

// Permission definitions per role
const ROLE_PERMISSIONS = {
    'Super Admin': {
        tabs: ['tab-dashboard', 'tab-businesses', 'tab-modules', 'tab-users', 'tab-billing', 'tab-settings', 'tab-promotions', 'tab-tickets'],
        canCreate: true,
        canEdit: true,
        canDelete: true
    },
    'Administrador': {
        tabs: ['tab-dashboard', 'tab-businesses', 'tab-modules', 'tab-promotions', 'tab-tickets'],
        canCreate: true,
        canEdit: true,
        canDelete: false
    },
    'Soporte': {
        tabs: ['tab-dashboard', 'tab-businesses', 'tab-tickets'],
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canTicketReply: true
    }
};

function getCurrentRole() {
    const role = appState.user?.role || 'Soporte';
    // Map legacy 'root' role to 'Super Admin'
    if (role === 'root') return 'Super Admin';
    return role;
}

function hasPermission(action) {
    const perms = ROLE_PERMISSIONS[getCurrentRole()];
    if (!perms) return false;
    return perms[action] === true;
}

function applyRolePermissions() {
    const role = getCurrentRole();
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['Soporte'];

    // Limpiar clases de rol anteriores para evitar que las reglas CSS del rol previo
    // sigan ocultando las opciones del nuevo rol (ej: al cambiar de Soporte a Super Admin)
    Array.from(document.documentElement.classList).forEach(cls => {
        if (cls.startsWith('role-')) {
            document.documentElement.classList.remove(cls);
        }
    });
    const roleClass = 'role-' + role.toLowerCase().replace(/\s+/g, '-');
    document.documentElement.classList.add(roleClass);

    // Show/hide ALL elements with data-roles (nav buttons, action buttons, etc.)
    document.querySelectorAll('[data-roles]').forEach(el => {
        const allowed = el.getAttribute('data-roles').split(',').map(r => r.trim());
        el.style.display = allowed.includes(role) ? '' : 'none';
    });

    // Hide/show the Gestión section label if no items visible
    const gestionLabel = document.getElementById('nav-label-gestion');
    const gestionVisible = ['tab-users', 'tab-billing', 'tab-payment-history', 'tab-tickets'].some(tab => {
        const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
        return btn && btn.style.display !== 'none';
    });
    if (gestionLabel) gestionLabel.style.display = gestionVisible ? '' : 'none';

    // Hide/show the Sistema section label if no items visible
    const sistemaLabel = document.getElementById('nav-label-sistema');
    const sistemaVisible = ['tab-settings'].some(tab => {
        const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
        return btn && btn.style.display !== 'none';
    });
    if (sistemaLabel) sistemaLabel.style.display = sistemaVisible ? '' : 'none';

    // Hide action buttons for roles without permission
    if (!perms.canCreate) {
        document.querySelectorAll('#btn-add-business, #btn-new-business, #btn-add-first-business, #btn-new-user').forEach(el => {
            if (el) el.style.display = 'none';
        });
        // Hide the add business button in the dashboard
        const addBizDash = document.getElementById('btn-add-business');
        if (addBizDash) addBizDash.style.display = 'none';
    }

    if (!perms.canDelete) {
        document.querySelectorAll('.delete-biz-btn, .delete-user-btn, .delete-ticket-btn').forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    // Update sidebar user info
    const nameEl = document.getElementById('sidebar-username');
    const roleEl = document.querySelector('.user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    const topbarAvatar = document.getElementById('topbar-avatar');
    const initials = (appState.user?.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    if (role === 'Super Admin') {
        document.documentElement.classList.add('is-super-admin');
        // Show the unified pill, hide the fallback
        const unifiedPill = document.getElementById('sa-unified-pill');
        const normalPill  = document.getElementById('user-pill-normal');
        const normalLogout = document.getElementById('logout-btn-normal');
        if (unifiedPill)  unifiedPill.style.display  = 'inline-flex';
        if (normalPill)   normalPill.style.display    = 'none';
        if (normalLogout) normalLogout.style.display  = 'none';
        // Hide sidebar-footer justify-content space-between when unified
        const footer = document.querySelector('.sidebar-footer');
        if (footer) {
            footer.style.justifyContent = 'center';
            footer.style.padding = '0.75rem 1rem';
            footer.classList.add('sa-footer-unified');
        }
    } else {
        document.documentElement.classList.remove('is-super-admin');
        // Hide unified pill, show normal layout
        const unifiedPill = document.getElementById('sa-unified-pill');
        const normalPill  = document.getElementById('user-pill-normal');
        const normalLogout = document.getElementById('logout-btn-normal');
        if (unifiedPill)  unifiedPill.style.display  = 'none';
        if (normalPill)   normalPill.style.display    = 'flex';
        if (normalLogout) normalLogout.style.display  = 'block';
        // Reset sidebar-footer styles back to default (space-between)
        const footer = document.querySelector('.sidebar-footer');
        if (footer) {
            footer.style.justifyContent = '';
            footer.style.padding = '';
            footer.classList.remove('sa-footer-unified');
        }

        if (nameEl) nameEl.textContent = appState.user?.name || 'Usuario';
        if (avatarEl) {
            avatarEl.textContent = initials;
            avatarEl.className = 'user-avatar';
        }
        if (roleEl) roleEl.textContent = role;
    }
    if (topbarAvatar) topbarAvatar.textContent = initials;


}


// ==========================================
// SSE REAL-TIME SYNC — Backoff Exponencial
// ==========================================
let _sseRetryDelay = 1000;
let _sseSource = null;
let _sseReconnectTimer = null;
let _sseReconnectToastShown = false;

function initRealTimeSync() {
    if (_sseSource) {
        _sseSource.close();
        _sseSource = null;
    }
    _sseSource = new EventSource('/api/stream');

    _sseSource.onopen = function() {
        _sseRetryDelay = 1000; // Reset delay on successful connection
        if (_sseReconnectToastShown) {
            showToast('✅ Conexión en tiempo real restaurada', 'success');
            _sseReconnectToastShown = false;
        }
    };

    _sseSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'update') {
                loadData();
                if (typeof loadAdminTickets === 'function') {
                    loadAdminTickets();
                }
                if (window.activeChatTicketId) {
                    fetchAndRenderChatMessages(window.activeChatTicketId, 'admin');
                }
            } else if (data.type === 'new_message') {
                console.log('New message received via SSE:', data);
                if (window.activeChatTicketId === data.ticketId) {
                    fetchAndRenderChatMessages(data.ticketId, 'admin');
                } else {
                    if (data.sender === 'client') {
                        if (typeof loadAdminTickets === 'function') {
                            loadAdminTickets();
                        }
                        if (typeof Swal !== 'undefined') {
                            const Toast = Swal.mixin({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 4500,
                                timerProgressBar: true,
                                background: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                                didOpen: (toast) => {
                                    toast.addEventListener('mouseenter', Swal.stopTimer);
                                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                                    toast.style.cursor = 'pointer';
                                    toast.addEventListener('click', () => {
                                        if (typeof viewTicketDetails === 'function') {
                                            viewTicketDetails(data.ticketId);
                                        }
                                    });
                                }
                            });
                            Toast.fire({
                                icon: 'info',
                                title: `Mensaje de ${data.senderName || 'Cliente'}`,
                                text: data.message.length > 55 ? data.message.substring(0, 55) + '...' : data.message
                            });
                        }
                    }
                }
            } else if (data.type === 'typing') {
                if (window.activeChatTicketId === data.ticketId && data.role !== 'admin') {
                    showChatTypingIndicator('El cliente está escribiendo...');
                }
            } else if (data.type === 'sessions_update') {
                console.log('[SSE-Admin] sessions_update recibido. Actualizando dispositivos...');
                const devicesTabBtn = document.querySelector('.config-nav-btn[data-config-tab="config-devices"]');
                const isDevicesTabActive = devicesTabBtn && devicesTabBtn.classList.contains('active');
                
                if (!isDevicesTabActive) {
                    const badge = document.getElementById('admin-devices-badge');
                    if (badge) badge.style.display = 'block';
                }
                
                if (typeof window.refreshAdminDevicesInline === 'function') {
                    window.refreshAdminDevicesInline();
                }
            } else if (data.type === 'force_logout') {
                if (window._isPerformingGlobalLogout) {
                    delete window._isPerformingGlobalLogout;
                    return;
                }
                console.log('[SSE-Admin] Cierre de sesión forzado recibido.');
                closeRealTimeSync();
                localStorage.removeItem('as_auth');
                localStorage.removeItem('as_user');
                localStorage.removeItem('as_admin_token');
                appState.user = null;
                appState.isInitialized = false;
                initTheme();
                showView('login-view');
                document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
                lucide.createIcons();
                Swal.close();
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión Cerrada',
                    text: 'Se ha cerrado la sesión globalmente en este dispositivo.',
                    background: 'var(--bg-surface)',
                    color: 'var(--text)',
                    confirmButtonColor: '#6366f1'
                });
            }
        } catch (err) {
            console.error('SSE parse error:', err);
        }
    };

    _sseSource.onerror = function() {
        if (!_sseSource) return;
        _sseSource.close();
        _sseSource = null;
        if (!_sseReconnectToastShown) {
            showToast(`⚡ Reconectando en ${Math.round(_sseRetryDelay / 1000)}s...`, 'info');
            _sseReconnectToastShown = true;
        }
        console.warn(`[SSE] Reconectando en ${_sseRetryDelay}ms...`);
        clearTimeout(_sseReconnectTimer);
        _sseReconnectTimer = setTimeout(() => {
            _sseRetryDelay = Math.min(_sseRetryDelay * 2, 30000); // Max 30s
            initRealTimeSync();
        }, _sseRetryDelay);
    };
}

function closeRealTimeSync() {
    clearTimeout(_sseReconnectTimer);
    _sseReconnectTimer = null;
    if (_sseSource) {
        _sseSource.close();
        _sseSource = null;
    }
    _sseReconnectToastShown = false;
}


// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Check Auth
    if (localStorage.getItem('as_auth') === 'true' && appState.user) {
        showView('dashboard-view');
        // Aplicar permisos INMEDIATAMENTE con el rol guardado en localStorage,
        // sin esperar a que loadData() termine su llamada async a la API.
        // Esto evita que el menú muestre opciones incorrectas al cargar la página.
        applyRolePermissions();
        loadData();
        initRealTimeSync();

        // Iniciar tracking de inactividad
        initInactivityTracker();

        // Verificar si la sesión estaba bloqueada
        if (localStorage.getItem('as_locked') === 'true') {
            showLockScreen();
        }
    } else {
        localStorage.removeItem('as_auth');
        localStorage.removeItem('as_user');
        localStorage.removeItem('as_admin_token');
        localStorage.removeItem('as_locked');
        appState.user = null;
        showView('login-view');
        lucide.createIcons();
    }

    // Fetch logo configuration unconditionally
    fetchPublicConfig();

    setupEventListeners();
});

// ====================== SECURITY GATEKEEPER (GLOBAL) ======================
// Must be global so saveModule(), saveUser(), saveSettings() can call it
function requestSecurityCheck(callback) {
    window._securityCallback = callback;
    document.getElementById('security-pass-input').value = '';
    document.getElementById('security-error-msg').classList.add('hidden');
    document.getElementById('security-modal').classList.remove('hidden');
    document.getElementById('security-pass-input').focus();
}

async function loadData() {
    try {
        const res = await adminFetch('/api/data');
        const data = await res.json();
        
        const oldBusinessesStr = JSON.stringify(appState.businesses);
        const oldModulesStr = JSON.stringify(appState.modules);
        const oldUsersStr = JSON.stringify(appState.users);
        const oldConfigStr = JSON.stringify(appState.config);

        appState.businesses = data.businesses || [];
        appState.modules = data.modules || [];
        appState.users = data.users || [];
        appState.config = data.config || {};

        if (appState.config.adminUser) {
            const input = document.getElementById('settings-admin-user');
            if (input) input.value = appState.config.adminUser;
        }
        if (appState.config.companyName) {
            const input = document.getElementById('settings-company-name');
            if (input) input.value = appState.config.companyName;
        }
        if (appState.config.sessionTimeout !== undefined) {
            const input = document.getElementById('settings-session-timeout');
            if (input) input.value = appState.config.sessionTimeout;
        }
        if (appState.config.supportEmail) {
            const input = document.getElementById('settings-support-email');
            if (input) input.value = appState.config.supportEmail;
        }
        if (appState.config.supportPhone) {
            const input = document.getElementById('settings-support-phone');
            if (input) input.value = appState.config.supportPhone;
        }
        if (appState.config.logo) {
            const logoPreview = document.getElementById('logo-preview-container');
            if (logoPreview) {
                logoPreview.innerHTML = `<img src="${appState.config.logo}" style="width:100%; height:100%; object-fit:contain;">`;
            }
            appState.customLogo = appState.config.logo;
        }

        let ticketsChanged = false;
        // Preload tickets if admin token is present to feed the charts
        if (getAdminToken()) {
            try {
                const resTickets = await adminFetch('/api/admin/tickets');
                const dataTickets = await resTickets.json();
                if (resTickets.ok && dataTickets.success) {
                    const oldTicketsStr = JSON.stringify(appState.adminTickets);
                    appState.adminTickets = dataTickets.tickets || [];
                    if (JSON.stringify(appState.adminTickets) !== oldTicketsStr) {
                        ticketsChanged = true;
                    }
                    if (typeof updateTicketBadge === 'function') updateTicketBadge();
                    if (typeof updateTicketKPIs === 'function') updateTicketKPIs();
                }
            } catch (err) {
                console.error('Error preloading tickets:', err);
            }
        }
        
        const businessesChanged = JSON.stringify(appState.businesses) !== oldBusinessesStr;
        const modulesChanged = JSON.stringify(appState.modules) !== oldModulesStr;
        const usersChanged = JSON.stringify(appState.users) !== oldUsersStr;
        const configChanged = JSON.stringify(appState.config) !== oldConfigStr;
        const anyDataChanged = businessesChanged || modulesChanged || usersChanged || configChanged || ticketsChanged;

        if (anyDataChanged) {
            initDashboard();
            if (!document.getElementById('tab-dashboard').classList.contains('hidden')) {
                initCharts();
                window.chartsNeedRebuild = false;
            } else {
                window.chartsNeedRebuild = true;
            }
        }
        
        applyRolePermissions();

        // Cargar notificaciones reales y arrancar polling cada 30s
        fetchNotifications();
        if (!window._notifPolling) {
            window._notifPolling = setInterval(fetchNotifications, 30000);
        }
        
        // Re-render active tabs if needed
        if (!document.getElementById('tab-businesses').classList.contains('hidden') && businessesChanged) {
            renderBusinessesGrid();
        }
        if (!document.getElementById('tab-modules').classList.contains('hidden') && modulesChanged) {
            // Evitar re-render completo si hay un toggle local activo (evita parpadeo doble por SSE)
            if (!window.activeModuleToggles || window.activeModuleToggles.size === 0) {
                renderModulesGrid();
            }
        }
        if (!document.getElementById('tab-users').classList.contains('hidden') && usersChanged) {
            renderUsersList();
        }
        if (!document.getElementById('tab-billing').classList.contains('hidden') && (businessesChanged || modulesChanged)) {
            renderBillingTab();
        }
        appState.isInitialized = true;
    } catch (err) {
        console.error(err);
        showToast('Error de conexión con el servidor', 'error');
    }
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    const dot = document.getElementById('notif-dot');
    if (!list) return;

    const count = appState.notifications ? appState.notifications.length : 0;

    if (count === 0) {
        list.innerHTML = `
            <div class="notif-empty">
                <i data-lucide="bell-off"></i>
                <p>No hay notificaciones nuevas</p>
            </div>
        `;
        if (dot) { dot.classList.add('hidden'); dot.textContent = ''; }
    } else {
        list.innerHTML = appState.notifications.map(n => {
            const timeLabel = formatNotifTime(n.time);
            return `
                <div class="notif-item">
                    <div class="notif-icon-box" style="background: ${n.color}20; color: ${n.color}">
                        <i data-lucide="${n.icon}"></i>
                    </div>
                    <div class="notif-content">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-desc">${n.desc}</div>
                        <div class="notif-time">${timeLabel}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Actualizar badge numérico solo si hay notificaciones nuevas (no vistas)
        const lastViewedId = parseInt(localStorage.getItem('as_last_notif_id') || '0', 10);
        const unseenCount = appState.notifications.filter(n => n.id > lastViewedId).length;
        if (dot && unseenCount > 0) {
            dot.classList.remove('hidden');
            dot.textContent = unseenCount > 9 ? '9+' : String(unseenCount);
        } else if (dot) {
            dot.classList.add('hidden');
            dot.textContent = '';
        }
    }
    lucide.createIcons();
}



function formatNotifTime(isoTime) {
    if (!isoTime) return '';
    const diff = Date.now() - new Date(isoTime).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        appState.notifications = data.notifications || [];
        renderNotifications();
    } catch (err) {
        console.warn('No se pudieron cargar las notificaciones');
    }
}

function getUserThemeKey() {
    return appState.user && appState.user.user ? `as_theme_${appState.user.user}` : 'as_theme';
}

function getUserAccentKey() {
    return appState.user && appState.user.user ? `as_accent_${appState.user.user}` : 'as_accent';
}

function initTheme() {
    const themeKey = getUserThemeKey();
    appState.theme = localStorage.getItem(themeKey) || 'light';
    document.documentElement.setAttribute('data-theme', appState.theme);
    updateThemeIcon();
    
    // Initialize Accent Color
    const accentKey = getUserAccentKey();
    let accent = localStorage.getItem(accentKey) || 'indigo';
    if (accent === 'rose' || accent === 'amber') {
        accent = 'indigo';
        localStorage.setItem(accentKey, 'indigo');
    }
    document.documentElement.setAttribute('data-accent', accent);
    document.querySelectorAll('.accent-option').forEach(opt => {
        if (opt.getAttribute('data-accent-val') === accent) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    const themeKey = getUserThemeKey();
    localStorage.setItem(themeKey, appState.theme);
    document.documentElement.setAttribute('data-theme', appState.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const iconEl = document.querySelector('#theme-toggle-btn i');
    if (iconEl) {
        iconEl.setAttribute('data-lucide', appState.theme === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    }
}

function showView(viewId) {
    if (viewId === 'dashboard-view') {
        document.documentElement.classList.remove('is-logged-out');
        document.documentElement.classList.add('is-logged-in');
    } else if (viewId === 'login-view') {
        document.documentElement.classList.remove('is-logged-in');
        document.documentElement.classList.add('is-logged-out');
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();

        const loginUser = document.getElementById('login-user');
        const loginPass = document.getElementById('login-pass');
        if (loginUser) loginUser.value = '';
        if (loginPass) loginPass.value = '';
        
        // Limpieza periódica para combatir el auto-completado automático de diversos navegadores
        let autofillClears = 0;
        const autofillInterval = setInterval(() => {
            autofillClears++;
            const activeEl = document.activeElement;
            if (activeEl === loginUser || activeEl === loginPass) {
                clearInterval(autofillInterval);
                return;
            }
            if (loginUser && loginUser.value !== '') {
                loginUser.value = '';
            }
            if (loginPass && loginPass.value !== '') {
                loginPass.value = '';
            }
            if (autofillClears >= 30) { // Detener después de 3 segundos (30 * 100ms)
                clearInterval(autofillInterval);
            }
        }, 100);

        const errorMsg = document.getElementById('login-error');
        if (errorMsg) errorMsg.classList.add('hidden');
    }
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
}

function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('login-user').value;
            const pass = document.getElementById('login-pass').value;
            
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user, pass })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('as_auth', 'true');
                    localStorage.setItem('as_user', JSON.stringify(data.user));
                    if (data.token) localStorage.setItem('as_admin_token', data.token);
                    appState.user = data.user;
                    initTheme(); // Initialize user-specific theme/accent
                    // Aplicar permisos del rol INMEDIATAMENTE para que el menú
                    // se reconstruya antes de que loadData() termine (bug: menú viejo)
                    applyRolePermissions();
                    showView('dashboard-view');
                    document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
                    loadData();
                    initRealTimeSync();

                    // Iniciar/reiniciar inactividad en login exitoso
                    localStorage.removeItem('as_locked');
                    initInactivityTracker();
                } else {
                    document.getElementById('login-error').classList.remove('hidden');
                }
            } catch (err) {
                showToast('Error de conexión con el servidor', 'error');
            }
        });
    }

    // Limpieza instantánea ante cualquier intento de autocompletar sin foco activo (evita credenciales residuales en otras pestañas)
    const clearAutofillIfUnfocused = (e) => {
        const loginUser = document.getElementById('login-user');
        const loginPass = document.getElementById('login-pass');
        const activeEl = document.activeElement;

        // Si el usuario está posicionado en cualquiera de los dos campos, permitimos el autocompletado (ya sea por tipeo o por selección de llavero)
        if (activeEl === loginUser || activeEl === loginPass) {
            return;
        }

        const input = e.target;
        if (input.value !== '') {
            input.value = '';
        }
    };
    const loginUser = document.getElementById('login-user');
    const loginPass = document.getElementById('login-pass');
    if (loginUser) {
        loginUser.addEventListener('input', clearAutofillIfUnfocused);
    }
    if (loginPass) {
        loginPass.addEventListener('input', clearAutofillIfUnfocused);
    }

    // Toggle Password
    document.getElementById('toggle-pass-btn')?.addEventListener('click', () => {
        const passInput = document.getElementById('login-pass');
        const icon = document.querySelector('#toggle-pass-btn i');
        if (passInput.type === 'password') {
            passInput.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            passInput.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    });

    // Logout
    const doLogout = () => {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: "Tendrás que volver a ingresar tus credenciales para acceder.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                closeRealTimeSync();
                localStorage.removeItem('as_auth');
                localStorage.removeItem('as_user');
                localStorage.removeItem('as_admin_token');
                appState.user = null;
                appState.isInitialized = false;
                initTheme(); // Revert to global/anonymous theme/accent
                showView('login-view');
                document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
                lucide.createIcons();
                showToast('Sesión cerrada correctamente', 'info');
            }
        });
    };
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);
    document.getElementById('logout-btn-normal')?.addEventListener('click', doLogout);

    // Theme Toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

    // Accent Color Selector
    const accentTrigger = document.getElementById('accent-trigger-btn');
    const accentDropdown = document.getElementById('accent-dropdown-menu');

    accentTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        accentDropdown?.classList.toggle('show');
    });

    document.querySelectorAll('.accent-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const val = opt.getAttribute('data-accent-val');
            document.documentElement.setAttribute('data-accent', val);
            const accentKey = getUserAccentKey();
            localStorage.setItem(accentKey, val);
            
            document.querySelectorAll('.accent-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            accentDropdown?.classList.remove('show');
        });
    });

    // Notifications
    const notifBtn = document.getElementById('notifications-btn');
    const notifDropdown = document.getElementById('notifications-dropdown');
    
    notifBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpening = notifDropdown?.classList.contains('hidden');
        notifDropdown?.classList.toggle('hidden');
        
        if (isOpening) {
            // Ocultamos el badge y guardamos el ID más reciente visto
            const dot = document.getElementById('notif-dot');
            if (dot) {
                dot.classList.add('hidden');
                const latestId = appState.notifications && appState.notifications.length > 0 
                    ? appState.notifications[0].id : 0;
                localStorage.setItem('as_last_notif_id', latestId);
            }
            renderNotifications();
        }
    });

    document.getElementById('notif-clear-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await adminFetch('/api/notifications', { method: 'DELETE' });
            appState.notifications = [];
            renderNotifications();
            showToast('Notificaciones borradas', 'info');
        } catch (err) {
            showToast('Error al limpiar notificaciones', 'error');
        }
    });

    // Close dropdowns on click outside
    document.addEventListener('click', (e) => {
        if (!notifBtn?.contains(e.target) && !notifDropdown?.contains(e.target)) {
            notifDropdown?.classList.add('hidden');
        }
        if (!accentTrigger?.contains(e.target) && !accentDropdown?.contains(e.target)) {
            accentDropdown?.classList.remove('show');
        }
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    if (appState.sidebarCollapsed) sidebar.classList.add('collapsed');
    
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('as_sidebar', sidebar.classList.contains('collapsed'));

        // Staggered text entrance animation when expanding
        if (isCollapsed) {
            // Was collapsed → now expanding: animate text in
            sidebar.classList.add('is-expanding');
            setTimeout(() => sidebar.classList.remove('is-expanding'), 500);
        }

        // Fix for Chart.js: Trigger resize after sidebar transition finishes
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 350);
    });

    // Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            
            btn.classList.add('active');
            const target = btn.getAttribute('data-tab');
            document.getElementById(target).classList.remove('hidden');
            
            const title = btn.querySelector('span').textContent;
            document.getElementById('topbar-page-name').textContent = title;
            
            if (target === 'tab-dashboard') {
                if (window.chartsNeedRebuild) {
                    initCharts();
                    window.chartsNeedRebuild = false;
                }
            }
            if (target === 'tab-businesses') renderBusinessesGrid();
            if (target === 'tab-modules') renderModulesGrid();
            if (target === 'tab-users') renderUsersList();
            if (target === 'tab-billing') renderBillingTab();
            if (target === 'tab-tickets') loadAdminTickets();
            if (target === 'tab-payment-history') loadGlobalPaymentsHistory();
            if (target === 'tab-promotions') loadPromotions();
        });
    });

    // Modal Events
    document.getElementById('business-modal-close')?.addEventListener('click', closeBusinessModal);
    document.getElementById('business-modal-cancel')?.addEventListener('click', closeBusinessModal);
    
    // Custom Multiselect for Modules
    const msTrigger = document.getElementById('biz-modules-select-trigger');
    const msDropdown = document.getElementById('biz-modules-dropdown');
    const msContainer = document.getElementById('biz-modules-multiselect');
    if (msTrigger && msDropdown && msContainer) {
        msTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            msContainer.classList.toggle('open');
            msDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!msContainer.contains(e.target)) {
                msContainer.classList.remove('open');
                msDropdown.classList.add('hidden');
            }
        });
    }
    
    document.getElementById('btn-new-promo')?.addEventListener('click', () => {
        openPromoFormModal();
    });
    
    document.body.addEventListener('click', async (e) => {
        // Abrir Modal Crear
        if (e.target.closest('#btn-add-business') || 
            e.target.closest('#btn-new-business') || 
            e.target.closest('#btn-add-first-business') || 
            e.target.closest('#btn-add-first-business-inner')) {
            openBusinessModal();
        }

        // Open User Modal
        if (e.target.closest('#btn-new-user')) {
            openUserModal();
        }

        // Edit User
        const editUserBtn = e.target.closest('.edit-user-btn');
        if (editUserBtn) {
            openUserModal(Number(editUserBtn.getAttribute('data-id')));
        }

        // Delete User
        const deleteUserBtn = e.target.closest('.delete-user-btn');
        if (deleteUserBtn) {
            deleteUser(Number(deleteUserBtn.getAttribute('data-id')));
        }

        // Configuración Marketplace Módulos
        const configModBtn = e.target.closest('#btn-config-modules');
        if (configModBtn) {
            openMarketplaceSettingsModal();
        }

        // Dropdowns Global Handler
        const toggleBtnDrop = e.target.closest('.dropdown-toggle');
        if (toggleBtnDrop) {
            const dropdown = toggleBtnDrop.closest('.dropdown');
            const isActive = dropdown.classList.contains('active');
            document.querySelectorAll('.dropdown.active').forEach(el => el.classList.remove('active'));
            if (!isActive) dropdown.classList.add('active');
        } else {
            if (!e.target.closest('.dropdown-menu')) {
                document.querySelectorAll('.dropdown.active').forEach(el => el.classList.remove('active'));
            }
        }

        // Toggle Negocio
        const toggleBizBtn = e.target.closest('.toggle-biz-btn');
        if (toggleBizBtn) {
            const id = toggleBizBtn.getAttribute('data-id');
            const newStatus = toggleBizBtn.getAttribute('data-status');
            try {
                const res = await adminFetch('/api/businesses/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status: newStatus })
                });
                if (res.ok) {
                    showToast(`Negocio ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
                    loadData();
                }
            } catch (err) { showToast('Error al cambiar estado', 'error'); }
            const dropdown = toggleBizBtn.closest('.dropdown');
            if (dropdown) dropdown.classList.remove('active');
        }

        // Edit Negocio
        const editBtn = e.target.closest('.edit-biz-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            openBusinessModal(id);
            const dropdown = editBtn.closest('.dropdown');
            if (dropdown) dropdown.classList.remove('active');
        }

        // Delete Negocio Trigger
        const deleteBtn = e.target.closest('.delete-biz-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            document.getElementById('delete-biz-id').value = id;
            document.getElementById('delete-modal').classList.remove('hidden');
            const dropdown = deleteBtn.closest('.dropdown');
            if (dropdown) dropdown.classList.remove('active');
        }

        // Credenciales Negocio
        const credBtn = e.target.closest('.cred-biz-btn');
        if (credBtn) {
            const id = credBtn.dataset.id;
            const biz = appState.businesses.find(b => b.id == id);
            
            const dropdown = credBtn.closest('.dropdown');
            if (dropdown) dropdown.classList.remove('active');
            
            requestSecurityCheck(() => {
                Swal.fire({
                    title: 'Credenciales de Cliente',
                    html: `
                        <div style="text-align: left; margin-top: 1rem;">
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Configura los datos de acceso para que este cliente (<b>${biz.name}</b>) ingrese a su panel.</p>
                            <div style="margin-bottom: 1rem;">
                                <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-main); display:block; margin-bottom: 0.3rem;">Correo Electrónico</label>
                                <input id="cred-email" type="email" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box; font-size:0.9rem;" value="${biz.clientEmail || ''}" placeholder="cliente@empresa.com">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-main); display:block; margin-bottom: 0.3rem;">Contraseña</label>
                                <input id="cred-pass" type="text" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box; font-size:0.9rem;" value="${biz.clientPass || ''}" placeholder="••••••••">
                            </div>
                        </div>
                    `,
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    showCancelButton: true,
                    confirmButtonText: 'Guardar Credenciales',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: 'var(--primary)',
                    didOpen: (popup) => {
                        const inputs = [popup.querySelector('#cred-email'), popup.querySelector('#cred-pass')];
                        inputs.forEach(input => {
                            if (input) {
                                input.addEventListener('keydown', (e) => {
                                    if (e.key === 'Enter') {
                                        Swal.clickConfirm();
                                    }
                                });
                            }
                        });
                    },
                    preConfirm: () => {
                        const email = document.getElementById('cred-email').value;
                        const pass = document.getElementById('cred-pass').value;
                        if (!email || !pass) {
                            Swal.showValidationMessage('El correo y la contraseña son obligatorios.');
                        }
                        return { email, pass };
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const res = await adminFetch(`/api/businesses/${id}/credentials`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ clientEmail: result.value.email, clientPass: result.value.pass })
                            });
                            const data = await res.json();
                            if (res.ok) {
                                showToast('Credenciales guardadas exitosamente', 'success');
                                loadData(); // Recargar para actualizar el estado
                            } else {
                                showToast(data.error || 'Error al guardar credenciales', 'error');
                            }
                        } catch (err) {
                            showToast('Error de conexión', 'error');
                        }
                    }
                });
            });
        }

        // Delete Modal Actions
        if (e.target.closest('#delete-modal-cancel')) {
            document.getElementById('delete-modal').classList.add('hidden');
        }
        if (e.target.closest('#delete-modal-confirm')) {
            const id = document.getElementById('delete-biz-id').value;
            deleteBusiness(id);
        }

        // Edit Módulo
        const editModBtn = e.target.closest('.edit-mod-btn');
        if (editModBtn) {
            const id = editModBtn.getAttribute('data-id');
            openModuleModal(id);
        }

        // Toggle Módulo
        const toggleModBtn = e.target.closest('.toggle-mod-btn');
        if (toggleModBtn) {
            const id = toggleModBtn.getAttribute('data-id');
            const newStatus = toggleModBtn.getAttribute('data-status');
            updateModuleState(id, { status: newStatus });
        }
    });

    // Module Form Submit
    document.getElementById('module-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveModule();
    });

    // User Form Submit
    document.getElementById('user-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveUser();
    });

    // Settings Form Submit (auth-settings-form is the correct ID in HTML)
    document.getElementById('auth-settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });

    document.getElementById('module-modal-close')?.addEventListener('click', closeModuleModal);
    document.getElementById('module-modal-cancel')?.addEventListener('click', closeModuleModal);

    // --- SEGURIDAD (LLAVE MAESTRA) ---
    document.getElementById('security-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('security-modal').classList.add('hidden');
        window._securityCallback = null;
    });

    document.getElementById('security-pass-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('security-confirm-btn')?.click();
        }
    });

    document.getElementById('security-confirm-btn')?.addEventListener('click', async () => {
        const passInput = document.getElementById('security-pass-input');
        const errorMsg = document.getElementById('security-error-msg');
        const pass = passInput.value;

        // Simulamos verificación con el backend o el estado actual
        // Para el demo, comparamos con la sesión o un valor fijo si no hay backend real
        const isAdmin = appState.user.role === 'Super Admin';
        // En una app real, esto se enviaría al servidor para validar hash
        // Aquí usamos una validación de seguridad simulada profesional
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: appState.user.user, pass: pass })
            });
            
            if (res.ok) {
                document.getElementById('security-modal').classList.add('hidden');
                passInput.value = '';
                errorMsg.classList.add('hidden');
                if (window._securityCallback) {
                    window._securityCallback();
                    window._securityCallback = null;
                }
            } else {
                errorMsg.classList.remove('hidden');
                passInput.style.borderColor = 'var(--danger)';
                setTimeout(() => passInput.style.borderColor = '', 2000);
            }
        } catch (e) {
            showToast('Error de conexión con seguridad', 'error');
        }
    });

    // Formateo de precio en tiempo real (Puntos de miles)
    const priceInput = document.getElementById('mod-price-input');
    priceInput?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Solo números
        if (value) {
            e.target.value = parseInt(value).toLocaleString('es-CO');
        } else {
            e.target.value = '';
        }
    });

    // Global form prevention (Removida para activar funcionalidad real)
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            // Ya no bloqueamos, cada form maneja su propio preventDefault
        });
    });

    // Mobile Menu
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
    });

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        if (window.innerWidth <= 768 && sidebar?.classList.contains('mobile-open')) {
            if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });

    document.querySelector('.notif-btn')?.addEventListener('click', () => { showToast('No tienes notificaciones', 'info'); });
    document.getElementById('topbar-avatar')?.addEventListener('click', () => { showToast('Perfil en desarrollo', 'info'); });

    document.querySelectorAll('[data-tab-link]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab-link');
            document.querySelector(`.nav-btn[data-tab="${targetTab}"]`)?.click();
        });
    });

    // Logo Upload & Settings
    const logoInput = document.getElementById('logo-upload-input');
    const logoPreview = document.getElementById('logo-preview-container');
    const btnSaveSettings = document.getElementById('btn-save-settings');

    logoInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const originalBase64 = event.target.result;
                // Redimensionar el logo a máx 300px antes de guardar
                const compressedBase64 = await resizeImageBase64(originalBase64, 300, 300);
                logoPreview.innerHTML = `<img src="${compressedBase64}" style="width:100%; height:100%; object-fit:contain;">`;
                appState.customLogo = compressedBase64;
            };
            reader.readAsDataURL(file);
        }
    });

    const modImageInput = document.getElementById('mod-image-input');
    modImageInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const originalBase64 = event.target.result;
                const compressedBase64 = await resizeImageBase64(originalBase64, 1200, 680);
                document.getElementById('mod-image-base64').value = compressedBase64;
                const preview = document.getElementById('mod-image-preview');
                if (preview) {
                    preview.src = compressedBase64;
                    preview.style.display = 'block';
                }
                const placeholder = document.getElementById('mod-image-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                const removeBtn = document.getElementById('mod-image-remove');
                if (removeBtn) removeBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Internal Config Tabs (Fixed bug: use config-nav-btn instead of nav-btn)
    document.querySelectorAll('.config-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-config-tab');
            document.querySelectorAll('.config-sub-tab').forEach(tab => tab.classList.add('hidden'));
            document.getElementById(target)?.classList.remove('hidden');
            
            document.querySelectorAll('.config-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Ocultar botón global de guardar en la sección de Copia de Seguridad y Dispositivos
            const saveSettingsContainer = document.getElementById('save-settings-container');
            if (saveSettingsContainer) {
                if (target === 'config-backup' || target === 'config-devices') {
                    saveSettingsContainer.classList.add('hidden');
                } else {
                    saveSettingsContainer.classList.remove('hidden');
                }
            }

            // Si es la pestaña de dispositivos, refrescar y ocultar badge
            if (target === 'config-devices') {
                const badge = document.getElementById('admin-devices-badge');
                if (badge) badge.style.display = 'none';
                if (typeof window.refreshAdminDevicesInline === 'function') {
                    window.refreshAdminDevicesInline();
                }
            }
        });
    });

    btnSaveSettings?.addEventListener('click', async (e) => {
        e.preventDefault();
        const adminUser = document.getElementById('settings-admin-user').value;
        const adminPass = document.getElementById('settings-admin-pass').value;
        const currentPass = document.getElementById('settings-current-pass').value;
        
        const companyName = document.getElementById('settings-company-name').value;
        const supportEmail = document.getElementById('settings-support-email').value;
        const supportPhone = document.getElementById('settings-support-phone').value;
        
        const currentAdminUser = appState.config?.adminUser || 'admin';
        const isChangingUser = adminUser && adminUser !== currentAdminUser;
        const isChangingPass = !!adminPass;

        if ((isChangingUser || isChangingPass) && !currentPass) {
            return showToast('Debes ingresar tu contraseña actual para cambiar credenciales', 'error');
        }

        const sessionTimeoutInput = document.getElementById('settings-session-timeout');
        const sessionTimeout = sessionTimeoutInput ? parseInt(sessionTimeoutInput.value) : 15;

        try {
            const res = await adminFetch('/api/settings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    logo: appState.customLogo || null,
                    companyName: companyName || null,
                    supportEmail: supportEmail || null,
                    supportPhone: supportPhone || null,
                    adminUser: adminUser || null,
                    adminPass: adminPass || null,
                    currentPass: currentPass || null,
                    sessionTimeout: !isNaN(sessionTimeout) ? sessionTimeout : null
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast('Configuración guardada exitosamente');
                if (appState.customLogo) updateAllLogos(appState.customLogo);
                
                // Si cambió usuario o clave, cerrar sesión
                if (isChangingUser || isChangingPass) {
                    showToast('Credenciales cambiadas. Cerrando sesión...', 'info');
                    setTimeout(() => {
                        localStorage.removeItem('as_auth');
                        location.reload();
                    }, 2000);
                } else {
                    document.getElementById('settings-current-pass').value = '';
                    document.getElementById('settings-admin-pass').value = '';
                    if (companyName) appState.config.companyName = companyName;
                    if (supportEmail) appState.config.supportEmail = supportEmail;
                    if (supportPhone) appState.config.supportPhone = supportPhone;
                    if (!isNaN(sessionTimeout)) {
                        appState.config.sessionTimeout = sessionTimeout;
                        resetInactivityTimer();
                    }
                }
            } else {
                showToast(data.error || 'Error al guardar', 'error');
            }
        } catch (err) { showToast('Error de conexión', 'error'); }
    });

    // ── Copias de Seguridad ──────────────────────────────────────────────
    async function exportSystemBackup() {
        try {
            const res = await adminFetch('/api/admin/backup');
            if (!res.ok) {
                const err = await res.json();
                return showToast('Error al exportar: ' + (err.error || res.statusText), 'error');
            }
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = `sierra_backup_${ts}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('✅ Copia de seguridad descargada correctamente', 'success');
        } catch (err) {
            showToast('Error de conexión al exportar backup', 'error');
        }
    }

    async function restoreSystemBackup(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            let backupData;
            try {
                backupData = JSON.parse(e.target.result);
            } catch {
                return showToast('El archivo seleccionado no es un JSON válido', 'error');
            }

            const confirm = await Swal.fire({
                title: '⚠️ ¿Restaurar base de datos?',
                html: `<p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6;">
                    Esto <strong style="color:#ef4444">reemplazará todo</strong> el contenido actual de la base de datos con el archivo:<br><br>
                    <code style="font-size:0.8rem; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px;">${file.name}</code><br><br>
                    <span style="color:#f59e0b; font-size:0.82rem;">📅 Backup de: ${backupData._meta?.exported_at ? new Date(backupData._meta.exported_at).toLocaleString('es-CO') : 'Desconocido'}</span>
                </p>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, restaurar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ef4444',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                reverseButtons: true
            });

            if (!confirm.isConfirmed) return;

            Swal.fire({
                title: 'Restaurando...',
                html: '<p style="color:var(--text-muted)">Importando datos a la base de datos. Por favor espera.</p>',
                allowOutsideClick: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await adminFetch('/api/admin/backup/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(backupData)
                });
                const data = await res.json();
                Swal.close();
                if (res.ok && data.success) {
                    await Swal.fire({
                        title: '✅ Restauración Completa',
                        text: 'La base de datos ha sido restaurada exitosamente.',
                        icon: 'success',
                        confirmButtonText: 'Recargar Panel',
                        confirmButtonColor: '#10b981',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    });
                    location.reload();
                } else {
                    showToast('Error: ' + (data.error || 'No se pudo restaurar'), 'error');
                }
            } catch (err) {
                Swal.close();
                showToast('Error de conexión al restaurar', 'error');
            }
        };
        reader.readAsText(file);
    }

    document.getElementById('btn-export-backup')?.addEventListener('click', exportSystemBackup);

    document.getElementById('btn-restore-backup')?.addEventListener('click', () => {
        document.getElementById('backup-restore-input')?.click();
    });

    document.getElementById('backup-restore-input')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            restoreSystemBackup(file);
            e.target.value = ''; // Reset so same file can be selected again
        }
    });

    // Filter Pills
    document.querySelectorAll('.filter-pills .pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            filterBusinesses(e.target.getAttribute('data-filter'), document.getElementById('business-search')?.value.toLowerCase());
        });
    });

    // Search Box
    document.getElementById('business-search')?.addEventListener('input', (e) => {
        filterBusinesses(document.querySelector('.filter-pills .pill.active')?.getAttribute('data-filter') || 'all', e.target.value.toLowerCase());
    });

    // Business Form Submit (Real API connect)
    const bizForm = document.getElementById('business-form');
    if (bizForm) {
        bizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('biz-name').value;
            const phone = document.getElementById('biz-phone')?.value || '';
            const ownerName = document.getElementById('biz-owner-name')?.value || '';
            const nit = document.getElementById('biz-nit')?.value || '';
            const city = document.getElementById('biz-city').value || 'Sin ciudad';
            const address = document.getElementById('biz-address')?.value || '';
            const isActive = document.getElementById('biz-active').checked;
            
            const email = document.getElementById('biz-email')?.value.trim() || '';
            const pass = document.getElementById('biz-pass')?.value || '';
            
            const selectedTypeEl = document.querySelector('.biz-type-option.selected');
            let type = selectedTypeEl ? selectedTypeEl.getAttribute('data-type') : 'retail';
            if (type === 'other') {
                const customVal = document.getElementById('biz-type-custom')?.value.trim();
                if (!customVal) {
                    return showToast('Por favor especifica el tipo de negocio en el campo de texto', 'error');
                }
                type = customVal;
            }
            
            const selectedModules = window.selectedBizModules || [];

            const id = document.getElementById('biz-id').value;
            
            // Buscar negocio existente para preservar sus fechas de renovación
            const existingBiz = appState.businesses.find(b => String(b.id) === String(id));
            const moduleDates = existingBiz?.moduleDates || {};

            // Inicializar fechas para módulos nuevos si no existen
            selectedModules.forEach(mid => {
                if (!moduleDates[mid]) {
                    // Si es nuevo, le damos 30 días de ciclo inicial
                    moduleDates[mid] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                }
            });

            if (!name) return showToast('El nombre es obligatorio', 'error');
            if (!email) return showToast('El correo electrónico de acceso es obligatorio', 'error');
            if (!id && !pass) return showToast('La contraseña es obligatoria para nuevos negocios', 'error');

            const bizData = {
                id: id ? Number(id) : Date.now(),
                name, type, city, phone, ownerName, nit, address,
                status: isActive ? 'active' : 'inactive',
                modules: selectedModules,
                moduleDates: moduleDates,
                clientEmail: email
            };

            if (pass) {
                bizData.clientPass = pass;
            }

            const method = id ? 'PUT' : 'POST';
            const endpoint = id ? `/api/businesses/${id}` : '/api/businesses/new';

            try {
                const res = await adminFetch(endpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bizData)
                });

                const data = await res.json();
                if (res.ok) {
                    closeBusinessModal();
                    showToast(`Negocio ${id ? 'actualizado' : 'creado'} exitosamente`);
                    bizForm.reset();
                    loadData(); // reload
                } else {
                    showToast(data.error || 'Error al guardar negocio', 'error');
                }
            } catch (err) {
                showToast('Error interno del servidor', 'error');
            }
        });
    }
    // Modal Users - Close buttons
    document.getElementById('user-modal-close')?.addEventListener('click', closeUserModal);
    document.getElementById('user-modal-cancel')?.addEventListener('click', closeUserModal);

    // User Search
    document.getElementById('user-search')?.addEventListener('input', (e) => {
        renderUsersList(e.target.value.toLowerCase());
    });

    // User Toggle Text
    document.getElementById('user-active')?.addEventListener('change', (e) => {
        const text = document.getElementById('user-status-text');
        if (text) text.textContent = e.target.checked ? 'Usuario Activo' : 'Usuario Inactivo';
    });

    // Limpieza de credenciales al recuperar foco de ventana (evitar autofill no deseado en pestaña inactiva)
    window.addEventListener('focus', () => {
        const loginView = document.getElementById('login-view');
        if (loginView && !loginView.classList.contains('hidden')) {
            const loginUser = document.getElementById('login-user');
            const loginPass = document.getElementById('login-pass');
            if (loginUser && document.activeElement !== loginUser && loginUser.value !== '') {
                loginUser.value = '';
            }
            if (loginPass && document.activeElement !== loginPass && loginPass.value !== '') {
                loginPass.value = '';
            }

            // Iniciar limpieza periódica corta por si el navegador autofillea justo después de enfocar la ventana
            let clears = 0;
            const interval = setInterval(() => {
                clears++;
                const activeEl = document.activeElement;
                if (loginUser && activeEl !== loginUser && loginUser.value !== '') {
                    loginUser.value = '';
                }
                if (loginPass && activeEl !== loginPass && loginPass.value !== '') {
                    loginPass.value = '';
                }
                if (clears >= 20) { // 2 segundos (20 * 100ms)
                    clearInterval(interval);
                }
            }, 100);
        }
    });
}

async function deleteBusiness(id) {
    try {
        const res = await adminFetch(`/api/businesses/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Negocio eliminado', 'success');
            document.getElementById('delete-modal').classList.add('hidden');
            loadData();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (err) {
        showToast('Error interno', 'error');
    }
}

function initDashboard() {
    document.getElementById('login-year').textContent = new Date().getFullYear();
    document.getElementById('badge-businesses').textContent = appState.businesses.length;
    
    // KPI: Negocios
    // KPI: Negocios activos (Negocios con estado activo que tienen al menos un módulo activo contratado)
    const activeBizCount = appState.businesses.filter(b => b.status === 'active' && (
        b.moduleInstances && b.moduleInstances.length > 0 ?
            b.moduleInstances.some(inst => inst.status === 'active') :
            (b.modules && b.modules.length > 0)
    )).length;
    const kpiBiz = document.getElementById('kpi-businesses');
    if (kpiBiz) kpiBiz.textContent = activeBizCount;

    // KPI: Módulos activos
    const activeMods = appState.modules.filter(m => m.status === 'active').length;
    const kpiMods = document.getElementById('kpi-modules');
    if (kpiMods) kpiMods.textContent = activeMods;

    // KPI: Negocios registrados (Total de cuentas registradas en el sistema)
    const totalRegisteredBiz = appState.businesses.length;
    const kpiUsers = document.getElementById('kpi-users');
    if (kpiUsers) kpiUsers.textContent = totalRegisteredBiz;

    // KPI: Ingresos del mes (suma real basada en módulos con precio y sedes activas)
    let totalIncome = 0;
    appState.businesses.forEach(biz => {
        if (biz.status !== 'active') return;
        
        let monthlyAmount = 0;
        if (biz.moduleInstances && biz.moduleInstances.length > 0) {
            biz.moduleInstances.forEach(inst => {
                if (inst.status === 'active') {
                    monthlyAmount += parseFloat(inst.priceApplied) || 0;
                }
            });
        } else {
            (biz.modules || []).forEach(mid => {
                const mod = appState.modules.find(m => m.id === mid);
                if (mod && mod.price) {
                    const price = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                    if (!isNaN(price)) monthlyAmount += price;
                }
            });
        }
        totalIncome += monthlyAmount;
    });
    const kpiIncome = document.getElementById('kpi-revenue');
    if (kpiIncome) kpiIncome.innerHTML = `<span style="white-space: nowrap;">$ ${totalIncome.toLocaleString('es-CO')} <span style="font-size: 0.65em; opacity: 0.8;">COP</span></span>`;
    
    renderDashboardBusinesses();
    renderQuickModules();
    setupMRRSimulator(totalIncome);
}

function setupMRRSimulator(currentMRR) {
    const slider = document.getElementById('mrr-growth-slider');
    const percentageVal = document.getElementById('simulator-percentage-val');
    const mrrCurrentEl = document.getElementById('sim-mrr-current');
    const mrrProjectedEl = document.getElementById('sim-mrr-projected');

    if (!slider) return;

    function updateSimulation() {
        const val = parseInt(slider.value, 10);
        const rate = val / 100;
        if (percentageVal) percentageVal.textContent = `+${val}% mensual`;
        
        if (mrrCurrentEl) {
            mrrCurrentEl.textContent = `$ ${currentMRR.toLocaleString('es-CO')}`;
        }
        
        // Compound growth formula over 12 months: P = C * (1 + r)^12
        const projectedMRR = Math.round(currentMRR * Math.pow(1 + rate, 12));
        if (mrrProjectedEl) {
            mrrProjectedEl.textContent = `$ ${projectedMRR.toLocaleString('es-CO')}`;
        }
    }

    if (!slider.dataset.listenerSet) {
        slider.addEventListener('input', updateSimulation);
        slider.dataset.listenerSet = 'true';
    }

    updateSimulation();
}

// ===================== USER MANAGEMENT =====================

function renderUsersList(searchQuery = '') {
    const list = document.getElementById('users-list');
    if (!list) return;

    let filtered = appState.users || [];

    if (searchQuery) {
        filtered = filtered.filter(u => 
            (u.name || '').toLowerCase().includes(searchQuery) || 
            (u.email || '').toLowerCase().includes(searchQuery) ||
            (u.user || '').toLowerCase().includes(searchQuery)
        );
    }

    list.innerHTML = filtered.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="user-avatar">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight: 600;">${user.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">@${user.user}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="pill" style="font-size: 0.7rem; background: rgba(99, 102, 241, 0.05); color: var(--primary); border-color: rgba(99, 102, 241, 0.1);">${user.role}</span></td>
            <td>
                <div class="status-badge ${user.status}">${user.status === 'active' ? 'Activo' : 'Inactivo'}</div>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn-icon edit-user-btn" data-id="${user.id}" title="Editar"><i data-lucide="edit-3" style="width:18px; height:18px;"></i></button>
                    <button class="btn-icon delete-user-btn" data-id="${user.id}" title="Eliminar" style="color: var(--danger);"><i data-lucide="trash-2" style="width:18px; height:18px;"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
    applyRolePermissions();
}

function openUserModal(id = null) {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    form.reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-modal-title').textContent = id ? 'Editar Miembro' : 'Nuevo Miembro';
    document.getElementById('pass-label').textContent = id ? 'Nueva Contraseña' : 'Contraseña *';
    document.getElementById('pass-hint').style.display = id ? 'block' : 'none';

    if (id) {
        const user = appState.users.find(u => u.id === id);
        if (user) {
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-username').value = user.user;
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-active').checked = user.status === 'active';
        }
    }
    modal.classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

async function saveUser() {
    requestSecurityCheck(async () => {
        const id = document.getElementById('user-id').value;
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        const username = document.getElementById('user-username').value;
        const pass = document.getElementById('user-pass').value;
        const role = document.getElementById('user-role').value;
        const status = document.getElementById('user-active').checked ? 'active' : 'inactive';

        const userData = { name, email, user: username, role, status };
        if (pass) userData.pass = pass;

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/users/${id}` : '/api/users/new';
            const res = await adminFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (res.ok) {
                showToast(id ? 'Usuario actualizado' : 'Usuario creado');
                closeUserModal();
                loadData();
            } else {
                showToast('Error al guardar usuario', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    });
}

async function saveSettings() {
    requestSecurityCheck(async () => {
        // Logo: se gestiona vía file upload (logo-upload-input). Si existe el campo legacy de URL, úsalo; si no, lee del localStorage
        const logoUrlInput = document.getElementById('settings-logo-url');
        const logo = logoUrlInput ? logoUrlInput.value : (localStorage.getItem('as_systems_logo_url') || '');
        const adminUser = document.getElementById('settings-admin-user')?.value || '';
        const adminPass = document.getElementById('settings-admin-pass')?.value || '';
        const currentPass = document.getElementById('security-pass-input')?.value || ''; // Usamos la que puso en el modal

        const settingsData = { logo, adminUser, adminPass, currentPass };

        try {
            const res = await adminFetch('/api/settings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });

            if (res.ok) {
                showToast('Configuración global actualizada');
                if (logo) updateAllLogos(logo);
            } else {
                const data = await res.json();
                showToast(data.error || 'Error al guardar configuración', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    });
}

async function deleteUser(id) {
    const user = appState.users.find(u => u.id === id);
    const result = await Swal.fire({
        title: '¿Eliminar usuario?',
        text: `"${user?.name || 'Este usuario'}" será eliminado permanentemente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6366f1',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;
    try {
        const res = await adminFetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Usuario eliminado', 'success');
            loadData();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (err) {
        showToast('Error al eliminar', 'error');
    }
}

// ===================== BILLING MANAGEMENT =====================

function renderBillingData() {
    const list = document.getElementById('billing-list');
    if (!list) return;
    let totalRev = 0;
    let activeSubs = 0;

    // Calcular próximos 30 días
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const html = appState.businesses.map(biz => {
        const bizModules = (biz.modules || [])
            .map(mid => appState.modules.find(m => m.id === mid))
            .filter(Boolean);

        // Parsear precio de forma segura, ignorar '-' o vacío
        const monthlyTotal = bizModules.reduce((sum, m) => {
            if (!m.price || m.price === '-') return sum;
            const price = parseInt(String(m.price).replace(/\D/g, ''));
            return sum + (isNaN(price) ? 0 : price);
        }, 0);

        if (biz.status === 'active') {
            totalRev += monthlyTotal;
            activeSubs += bizModules.length;
        }

        // Módulos con íconos o texto
        const modsDisplay = bizModules.length > 0
            ? bizModules.map(m => `<i data-lucide="${m.icon}" style="width:14px;height:14px;" title="${m.name}"></i>`).join('')
            : '<span style="color:var(--text-muted);font-size:0.75rem;">Sin módulos</span>';

        const precioDisplay = monthlyTotal > 0 ? `<span style="white-space: nowrap;">$ ${monthlyTotal.toLocaleString('es-CO')} <span style="font-size: 0.8em;">COP</span></span>` : '—';
        // Calcular la fecha de renovación más próxima basada en los moduleDates reales
        let closestDate = null;
        if (biz.moduleDates) {
            for (const modId in biz.moduleDates) {
                // Solo considerar módulos que el negocio realmente tiene activos
                if (biz.modules && biz.modules.includes(modId)) {
                    const d = new Date(biz.moduleDates[modId]);
                    if (!closestDate || d < closestDate) {
                        closestDate = d;
                    }
                }
            }
        }
        const renewalDate = closestDate ? closestDate.toLocaleDateString('es-CO') : 'Sin fecha';

        return `
            <tr>
                <td>
                    <div style="font-weight:600;">${biz.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${biz.city || '—'}</div>
                </td>
                <td style="text-align: center;">
                    <div style="display:flex;gap:0.25rem;flex-wrap:wrap;align-items:center;justify-content:center;">${modsDisplay}</div>
                </td>
                <td style="text-align: center;"><span class="pill" style="font-size:0.7rem;">SaaS Premium</span></td>
                <td style="text-align: center;"><div class="status-badge ${biz.status}">${biz.status === 'active' ? 'Al día' : 'Pendiente'}</div></td>
                <td style="text-align: center; font-size:0.875rem;">${renewalDate}</td>
                <td style="text-align: center; font-weight:700; color:var(--primary);">${precioDisplay}</td>
            </tr>
        `;
    }).join('');

    if (!html.trim()) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No hay negocios registrados.</td></tr>';
    } else {
        list.innerHTML = html;
    }

    const totalRevenueEl = document.getElementById('total-revenue');
    const activeSubsEl = document.getElementById('active-subscriptions');
    const upcomingEl = document.getElementById('upcoming-renewals');
    if (totalRevenueEl) totalRevenueEl.innerHTML = `<span style="white-space: nowrap;">$ ${totalRev.toLocaleString('es-CO')} <span style="font-size: 0.65em; opacity: 0.8;">COP</span></span>`;
    if (activeSubsEl) activeSubsEl.textContent = activeSubs;
    if (upcomingEl) upcomingEl.textContent = appState.businesses.filter(b => b.status === 'active').length;
    
    lucide.createIcons();
}

function renderDashboardBusinesses() {
    const container = document.getElementById('dash-businesses-list');
    if (!container) return;
    if (appState.businesses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i data-lucide="building-2"></i></div>
                <h4>Aún no hay negocios</h4>
                <button class="btn-primary" id="btn-add-first-business-inner"><i data-lucide="plus"></i> Agregar Primer Negocio</button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const recent = appState.businesses.slice(0, 3);
    let html = '<div class="businesses-quick-list">';
    recent.forEach(biz => {
        html += `
            <div class="biz-quick-item">
                <div class="biz-quick-info">
                    <div class="biz-quick-icon"><i data-lucide="building"></i></div>
                    <div>
                        <div class="biz-quick-name">${biz.name}</div>
                        <div class="biz-quick-city">${biz.city}</div>
                    </div>
                </div>
                <div class="status-badge ${biz.status}">${biz.status === 'active' ? 'Activo' : 'Inactivo'}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    lucide.createIcons();
}

function renderBusinessesGrid() {
    const grid = document.getElementById('businesses-grid');
    const filter = document.querySelector('.filter-pills .pill.active')?.getAttribute('data-filter') || 'all';
    const search = document.getElementById('business-search')?.value.toLowerCase() || '';
    filterBusinesses(filter, search);
}

function filterBusinesses(filterType, searchQuery = '') {
    const grid = document.getElementById('businesses-grid');
    let filtered = appState.businesses;
    
    if (filterType !== 'all') filtered = filtered.filter(b => b.status === filterType);
    if (searchQuery) filtered = filtered.filter(b => b.name.toLowerCase().includes(searchQuery) || b.city.toLowerCase().includes(searchQuery));
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">No se encontraron negocios.</div>';
        return;
    }

    grid.innerHTML = filtered.map(biz => `
        <div class="biz-list-item">
            <div class="biz-info-main">
                <div class="biz-name">${biz.name}</div>
                <span class="biz-type" style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:0.2rem;">${bizTypeTranslations[biz.type] || biz.type || 'Otros'}</span>
            </div>
            <div class="biz-info-client" style="flex:2; min-width:160px;">
                <div class="client-name" style="font-weight:600; font-size:0.95rem; color:var(--text-main); word-break:break-all;">${biz.ownerName || '-'}</div>
            </div>
            <div class="biz-info-phone" style="flex:1.5; min-width:140px; display:flex; align-items:center; gap:0.5rem; font-size:0.95rem;">
                ${biz.phone ? `
                    <a href="https://wa.me/${(() => {
                        let clean = String(biz.phone).replace(/[^0-9]/g, '');
                        if (clean.length === 10 && clean.startsWith('3')) clean = '57' + clean;
                        return clean;
                    })()}" target="_blank" style="color:#25d366; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; transition:color 0.2s;" onmouseover="this.style.color='#128c7e'" onmouseout="this.style.color='#25d366'" title="Chatear por WhatsApp">
                        <i data-lucide="phone" style="width:14px; height:14px; stroke-width:2.5px;"></i> ${biz.phone}
                    </a>
                ` : '<span style="color:var(--text-muted);">-</span>'}
            </div>
            <div class="biz-info-city" style="flex:1.2; min-width:110px; display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; color:var(--text-muted);">
                <i data-lucide="map-pin"></i> ${biz.city}
            </div>
            <div class="biz-info-modules">
                ${(() => {
                    const activeInsts = (biz.moduleInstances && biz.moduleInstances.length > 0)
                        ? biz.moduleInstances.filter(inst => inst.status === 'active')
                        : (biz.modules || []).map((mid, idx) => ({
                            moduleId: mid,
                            status: 'active'
                          }));
                    const activeCount = activeInsts.length;
                    return activeCount > 0 
                        ? `<span class="module-chip" style="font-weight:700;"><i data-lucide="package"></i> ${activeCount} Módulo${activeCount !== 1 ? 's' : ''}</span>` 
                        : '<span style="color:var(--text-muted);font-size:0.75rem;">Sin módulos</span>';
                })()}
                ${(() => {
                    const cancelledInsts = (biz.moduleInstances && biz.moduleInstances.length > 0)
                        ? biz.moduleInstances.filter(inst => inst.status === 'cancelled')
                        : (biz.cancelledModules || []).map(cm => ({
                            moduleId: cm.id || cm.moduleId,
                            status: 'cancelled'
                          }));
                    const cancelledCount = cancelledInsts.length;
                    return cancelledCount > 0 
                        ? `<span class="module-chip" style="background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.25); font-weight:700;"><i data-lucide="package"></i> ${cancelledCount} Suspendido${cancelledCount !== 1 ? 's' : ''}</span>` 
                        : '';
                })()}
            </div>
            <div class="biz-info-status" style="flex:1; min-width:90px; display:flex; justify-content:center; align-items:center;">
                <div class="status-badge ${biz.status}">${biz.status === 'active' ? 'Activo' : 'Inactivo'}</div>
            </div>
            <div class="biz-actions" style="flex:1; min-width:110px; display:flex; justify-content:flex-end; align-items:center;">
                <div class="dropdown">
                    <button class="btn-icon dropdown-toggle" title="Opciones">
                        <i data-lucide="more-vertical"></i>
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item cred-biz-btn" data-id="${biz.id}">
                            <i data-lucide="key"></i> Accesos
                        </button>
                        ${ROLE_PERMISSIONS[getCurrentRole()]?.canEdit ? `
                        <button class="dropdown-item edit-biz-btn" data-id="${biz.id}">
                            <i data-lucide="edit"></i> Editar
                        </button>
                        <button class="dropdown-item toggle-biz-btn" data-id="${biz.id}" data-status="${biz.status === 'active' ? 'inactive' : 'active'}">
                            ${biz.status === 'active' ? '<i data-lucide="power-off"></i> Desactivar' : '<i data-lucide="power" style="color:var(--success)"></i> Activar'}
                        </button>
                        ` : ''}
                        <button class="dropdown-item" onclick="downloadIndividualBusinessPDF('${biz.id}')">
                            <i data-lucide="file-text"></i> Descargar Ficha PDF
                        </button>
                        ${ROLE_PERMISSIONS[getCurrentRole()]?.canDelete ? `
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item text-danger delete-biz-btn" data-id="${biz.id}">
                            <i data-lucide="trash-2"></i> Eliminar
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
    applyRolePermissions();
}

function renderQuickModules() {
    const grid = document.getElementById('modules-quick-grid');
    if (!grid) return;
    const activeMods = appState.modules.filter(m => m.status === 'active');
    grid.innerHTML = activeMods.map(mod => `
        <div class="biz-card quick-module-card">
            <div class="quick-module-icon"><i data-lucide="${mod.icon}"></i></div>
            <div>
                <div class="quick-module-name">${mod.name}</div>
                <div class="quick-module-price">${!isNaN(parseInt(String(mod.price).replace(/\D/g, ''))) ? `<span style="white-space: nowrap;">$ ${parseInt(String(mod.price).replace(/\D/g, '')).toLocaleString('es-CO')} <span style="font-size: 0.8em;">COP</span></span>` : '—'}</div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderModulesGrid() {
    const grid = document.getElementById('modules-grid');
    if (!grid) return;
    grid.innerHTML = appState.modules.map(mod => {
        const priceNum = parseInt(String(mod.price).replace(/\D/g, ''));
        const priceDisplay = (mod.price && !isNaN(priceNum) && priceNum > 0) ? `<span style="white-space: nowrap;">$ ${priceNum.toLocaleString('es-CO')} <span style="font-size: 0.8em;">COP</span></span>` : 'Cotizar';
        
        const isRec = String(mod.id) === String(appState.config?.recommendedModuleId);
        const recBadgeHtml = isRec ? `<div style="margin-top: 0.4rem; display: inline-flex; align-items: center; gap: 4px; background: var(--primary-bg); color: var(--primary); border: 1px solid var(--primary-border); font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; width: fit-content;">✨ RECOMENDADO</div>` : '';

        return `
        <div class="biz-card" data-module-id="${mod.id}">
            <div class="module-card-header">
                <div class="module-icon-large"><i data-lucide="${mod.icon}"></i></div>
                <div class="status-badge ${mod.status === 'active' ? 'active' : (mod.status === 'maintenance' ? 'inactive' : 'neutral')}">
                    ${mod.status === 'active' ? 'Activo' : (mod.status === 'maintenance' ? 'En Mantenimiento' : (mod.status === 'hidden' ? 'Oculto' : 'Próximamente'))}
                </div>
            </div>
            <h3 class="module-title" style="display:flex; flex-direction:column; gap:4px;">
                <span>${mod.name}</span>
                ${recBadgeHtml}
            </h3>
            <p class="module-desc">${mod.desc}</p>
            <div class="module-price" style="font-weight: 800; color: var(--primary); margin-top: 0.75rem; font-size: 1.1rem;">
                ${priceDisplay}
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem;">
                <button class="btn-primary edit-mod-btn" data-id="${mod.id}" style="flex:2; justify-content: center;">
                    <i data-lucide="settings"></i> Configurar
                </button>
                <button class="btn-ghost toggle-mod-btn" data-id="${mod.id}" data-status="${mod.status === 'active' ? 'hidden' : 'active'}" 
                        style="flex:1; justify-content: center; padding: 0.5rem;" title="${mod.status === 'active' ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}">
                    <i data-lucide="${mod.status === 'active' ? 'eye-off' : 'eye'}"></i>
                </button>
            </div>
        </div>
    `}).join('');
    lucide.createIcons();
}

window.removeModuleImage = function() {
    const input = document.getElementById('mod-image-input');
    if (input) input.value = '';
    const base64 = document.getElementById('mod-image-base64');
    if (base64) base64.value = '';
    const preview = document.getElementById('mod-image-preview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    const placeholder = document.getElementById('mod-image-placeholder');
    if (placeholder) placeholder.style.display = 'block';
    const removeBtn = document.getElementById('mod-image-remove');
    if (removeBtn) removeBtn.style.display = 'none';
};


/**
 * makeSwalSelect(selectId)
 * Converts a native <select> inside a SweetAlert2 modal into a premium
 * glassmorphism custom dropdown. The original <select> stays hidden and
 * synced so preConfirm can still read .value normally.
 */
window.makeSwalSelect = function(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || sel.dataset.swalSelectInit) return;
    sel.dataset.swalSelectInit = '1';
    sel.style.display = 'none';

    const chevronSVG = `<svg class="swal-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    // Build wrap
    const wrap = document.createElement('div');
    wrap.className = 'swal-select-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swal-select-btn';

    const label = document.createElement('span');
    label.className = 'swal-select-label';

    btn.appendChild(label);
    btn.insertAdjacentHTML('beforeend', chevronSVG);

    const panel = document.createElement('div');
    panel.className = 'swal-select-panel hidden';

    const options = Array.from(sel.options);
    options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'swal-select-item';
        item.dataset.value = opt.value;
        item.textContent = opt.text;
        if (opt.selected) {
            item.classList.add('selected');
            label.textContent = opt.text;
        }
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            // Update native select
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            // Update UI
            label.textContent = opt.text;
            panel.querySelectorAll('.swal-select-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            // Close
            panel.classList.add('hidden');
            btn.classList.remove('open');
        });
        panel.appendChild(item);
    });

    // If nothing selected by default, show first option
    if (!label.textContent) {
        const first = options[0];
        if (first) {
            label.textContent = first.text;
            sel.value = first.value;
        }
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !panel.classList.contains('hidden');
        // Close all other swal panels
        document.querySelectorAll('.swal-select-panel').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.swal-select-btn').forEach(b => b.classList.remove('open'));
        if (!isOpen) {
            panel.classList.remove('hidden');
            btn.classList.add('open');
        }
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);

    // Close on outside click (inside popup)
    const popup = sel.closest('.swal2-popup');
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (!e.target.closest('.swal-select-wrap')) {
                panel.classList.add('hidden');
                btn.classList.remove('open');
            }
        });
    }
};

window.toggleCustomSelect = function(containerId) {

    const container = document.getElementById(containerId);
    if (!container) return;
    const trigger = container.querySelector('.custom-select-trigger');
    const dropdown = container.querySelector('.custom-select-dropdown');
    
    // Close other dropdowns
    document.querySelectorAll('.custom-select-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    document.querySelectorAll('.custom-select-trigger').forEach(t => {
        if (t !== trigger) t.classList.remove('active');
    });
    
    trigger.classList.toggle('active');
    dropdown.classList.toggle('active');
    
    if (window.event) window.event.stopPropagation();
};

window.selectCustomOption = function(containerId, value) {
    window.setCustomSelectValue(containerId, value);
    
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelector('.custom-select-trigger')?.classList.remove('active');
        container.querySelector('.custom-select-dropdown')?.classList.remove('active');
    }
    
    if (window.event) window.event.stopPropagation();
};

window.setCustomSelectValue = function(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const input = container.querySelector('input[type="hidden"]');
    const label = container.querySelector('.custom-select-label');
    const option = container.querySelector(`.custom-select-option[data-value="${value}"]`);
    
    if (input) input.value = value;
    if (label && option) {
        label.innerHTML = option.innerHTML;
    }
    
    // Update selected class
    container.querySelectorAll('.custom-select-option').forEach(opt => {
        if (opt.getAttribute('data-value') === value) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-container')) {
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
    }
});

function openModuleModal(id) {
    const mod = appState.modules.find(m => m.id == id);
    if (!mod) return;

    document.getElementById('mod-id-input').value = mod.id;
    document.getElementById('mod-name-input').value = mod.name;
    document.getElementById('mod-desc-input').value = mod.desc;
    document.getElementById('mod-icon-input').value = mod.icon;
    document.getElementById('mod-video-input').value = mod.videoUrl || '';
    
    window.setCustomSelectValue('custom-select-status', mod.status);
    window.setCustomSelectValue('custom-select-unit', mod.demoResetUnit || 'hours');
    document.getElementById('mod-demo-value-input').value = mod.demoResetValue !== undefined ? mod.demoResetValue : 4;
    
    const priceNum = parseInt(String(mod.price).replace(/\D/g, ''), 10);
    document.getElementById('mod-price-input').value = isNaN(priceNum) ? '' : priceNum.toLocaleString('es-CO');

    // Populate module image if exists
    if (mod.image) {
        document.getElementById('mod-image-base64').value = mod.image;
        const preview = document.getElementById('mod-image-preview');
        if (preview) {
            preview.src = mod.image;
            preview.style.display = 'block';
        }
        const placeholder = document.getElementById('mod-image-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        const removeBtn = document.getElementById('mod-image-remove');
        if (removeBtn) removeBtn.style.display = 'block';
    } else {
        window.removeModuleImage();
    }

    document.getElementById('module-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeModuleModal() {
    document.getElementById('module-modal').classList.add('hidden');
}

function saveModule() {
    requestSecurityCheck(async () => {
        const id = document.getElementById('mod-id-input').value;
        const name = document.getElementById('mod-name-input').value;
        const desc = document.getElementById('mod-desc-input').value;
        const rawPrice = document.getElementById('mod-price-input').value.replace(/\D/g, '');
        const icon = document.getElementById('mod-icon-input').value;
        const status = document.getElementById('mod-status-input').value;
        const videoUrl = document.getElementById('mod-video-input').value;
        const image = document.getElementById('mod-image-base64')?.value || '';
        const demoResetValue = parseInt(document.getElementById('mod-demo-value-input').value) || 4;
        const demoResetUnit = document.getElementById('mod-demo-unit-input').value || 'hours';

        const updatedMod = {
            id: id,
            name,
            desc,
            price: !rawPrice || rawPrice === '0' ? 'Cotizar' : `$ ${parseInt(rawPrice).toLocaleString('es-CO')}`,
            icon,
            status,
            videoUrl,
            image,
            demoResetValue,
            demoResetUnit
        };

        try {
            const res = await adminFetch(`/api/modules/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedMod)
            });
            
            if (res.ok) {
                // Actualizar en el estado global
                appState.modules = appState.modules.map(m => m.id == id ? { ...m, ...updatedMod } : m);
                
                closeModuleModal();
                renderModulesGrid();
                initDashboard(); // Actualizar KPIs e ingresos
                showToast('Módulo actualizado con éxito');
            } else {
                showToast('Error al actualizar el módulo en el servidor', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        }
    });
}

// Set para rastrear toggles locales activos y evitar re-renders SSE duplicados
if (!window.activeModuleToggles) window.activeModuleToggles = new Set();

async function updateModuleState(id, updates) {
    const mod = appState.modules.find(m => m.id == id);
    if (!mod) return;

    const updated = { ...mod, ...updates };
    const newStatus = updated.status;

    // Marcar toggle como activo ANTES del fetch para bloquear SSE re-render
    window.activeModuleToggles.add(String(id));

    try {
        // Usar POST /api/modules/toggle (acepta Administrador con requireWriteAccess)
        // en lugar de PUT /api/modules/:id (solo Super Admin)
        const res = await adminFetch('/api/modules/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });

        if (res.ok) {
            // 1. Actualizar estado local en memoria
            appState.modules = appState.modules.map(m => m.id == id ? updated : m);

            // 2. Actualización quirúrgica in-place de la tarjeta afectada (sin re-render del grid)
            const card = document.querySelector(`.biz-card[data-module-id="${id}"]`);
            if (card) {
                // Actualizar badge de estado
                const badge = card.querySelector('.status-badge');
                if (badge) {
                    badge.className = `status-badge ${newStatus === 'active' ? 'active' : (newStatus === 'maintenance' ? 'inactive' : 'neutral')}`;
                    badge.textContent = newStatus === 'active' ? 'Activo' : (newStatus === 'maintenance' ? 'En Mantenimiento' : (newStatus === 'hidden' ? 'Oculto' : 'Próximamente'));
                }
                // Actualizar botón toggle (data-status, title, icono)
                const toggleBtn = card.querySelector('.toggle-mod-btn');
                if (toggleBtn) {
                    const nextStatus = newStatus === 'active' ? 'hidden' : 'active';
                    const nextIcon  = newStatus === 'active' ? 'eye-off' : 'eye';
                    const nextTitle = newStatus === 'active' ? 'Ocultar de la tienda' : 'Mostrar en la tienda';
                    toggleBtn.setAttribute('data-status', nextStatus);
                    toggleBtn.setAttribute('title', nextTitle);
                    // Reemplazar el elemento <i> completo — Lucide no re-procesa elementos ya renderizados
                    toggleBtn.innerHTML = `<i data-lucide="${nextIcon}"></i>`;
                    if (window.lucide) lucide.createIcons();
                }
            } else {
                // Fallback: si la tarjeta no está en el DOM, re-render completo
                renderModulesGrid();
            }

            initDashboard();
            showToast(`Estado de ${mod.name} actualizado`);
        } else {
            showToast('Error al actualizar el estado del módulo', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    } finally {
        // Liberar el bloqueo después de que el SSE tenga tiempo de asentarse
        setTimeout(() => window.activeModuleToggles.delete(String(id)), 2000);
    }
}

function renderModulesMultiselect() {
    const optionsContainer = document.getElementById('biz-modules-options');
    const tagsContainer = document.getElementById('biz-modules-tags');
    const placeholder = document.getElementById('biz-modules-placeholder');
    
    if (!optionsContainer) return;
    
    const activeModules = appState.modules.filter(m => m.status === 'active');
    
    // Render dropdown options
    optionsContainer.innerHTML = activeModules.map(m => {
        const isSelected = window.selectedBizModules.includes(m.id);
        return `
            <div class="multiselect-option ${isSelected ? 'selected' : ''}" data-id="${m.id}">
                <div class="multiselect-option-checkbox">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <span>${m.name}</span>
            </div>
        `;
    }).join('');
    
    // Render selected tags
    if (window.selectedBizModules.length > 0) {
        if (placeholder) placeholder.style.display = 'none';
        tagsContainer.innerHTML = window.selectedBizModules.map(mid => {
            const m = appState.modules.find(mod => mod.id === mid);
            const name = m ? m.name : mid;
            return `
                <div class="multiselect-tag" data-id="${mid}">
                    <span>${name}</span>
                    <span class="multiselect-tag-remove">&times;</span>
                </div>
            `;
        }).join('');
    } else {
        if (placeholder) placeholder.style.display = 'block';
        tagsContainer.innerHTML = '';
    }
    
    // Add event listeners to options
    optionsContainer.querySelectorAll('.multiselect-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = option.getAttribute('data-id');
            const index = window.selectedBizModules.indexOf(id);
            if (index > -1) {
                window.selectedBizModules.splice(index, 1);
            } else {
                window.selectedBizModules.push(id);
            }
            renderModulesMultiselect();
        });
    });
    
    // Add event listeners to remove buttons on tags
    tagsContainer.querySelectorAll('.multiselect-tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.parentElement.getAttribute('data-id');
            const index = window.selectedBizModules.indexOf(id);
            if (index > -1) {
                window.selectedBizModules.splice(index, 1);
                renderModulesMultiselect();
            }
        });
    });
}

function openBusinessModal(id = null) {

    document.getElementById('business-modal').classList.remove('hidden');
    document.getElementById('business-form').reset();
    document.getElementById('biz-id').value = '';
    document.getElementById('business-modal-title').textContent = id ? 'Editar Negocio' : 'Nuevo Negocio';

    const biz = id ? appState.businesses.find(b => b.id == id) : null;

    const typeGrid = document.getElementById('biz-type-grid');
    const types = [
        { id: 'restaurant', icon: 'utensils', label: 'Restaurante' },
        { id: 'retail', icon: 'shopping-bag', label: 'Tienda' },
        { id: 'services', icon: 'briefcase', label: 'Servicios' },
        { id: 'salon', icon: 'sparkles', label: 'Belleza' },
        { id: 'health', icon: 'heart', label: 'Salud' },
        { id: 'education', icon: 'graduation-cap', label: 'Educación' },
        { id: 'other', icon: 'help-circle', label: 'Otros' }
    ];
    
    const standardTypeIds = types.map(t => t.id);
    const isCustomType = biz && biz.type && !standardTypeIds.includes(biz.type);
    const targetType = isCustomType ? 'other' : (biz ? biz.type : 'restaurant');
    
    typeGrid.innerHTML = types.map((t) => `
        <div class="biz-type-option ${t.id === targetType ? 'selected' : ''}" data-type="${t.id}">
            <span><i data-lucide="${t.icon}"></i></span>
            <div>${t.label}</div>
        </div>
    `).join('');

    const customGroup = document.getElementById('biz-type-custom-group');
    const customInput = document.getElementById('biz-type-custom');
    if (customGroup && customInput) {
        if (isCustomType) {
            customGroup.classList.remove('hidden');
            customInput.value = biz.type;
        } else {
            customGroup.classList.add('hidden');
            customInput.value = '';
        }
    }

    typeGrid.querySelectorAll('.biz-type-option').forEach(opt => {
        opt.addEventListener('click', () => {
            typeGrid.querySelectorAll('.biz-type-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            
            const typeId = opt.getAttribute('data-type');
            if (typeId === 'other') {
                if (customGroup) {
                    customGroup.classList.remove('hidden');
                }
                if (customInput) {
                    customInput.focus();
                }
            } else {
                if (customGroup) {
                    customGroup.classList.add('hidden');
                }
                if (customInput) {
                    customInput.value = '';
                }
            }
        });
    });

    // Cerrar dropdown si estaba abierto
    const msContainer = document.getElementById('biz-modules-multiselect');
    const msDropdown = document.getElementById('biz-modules-dropdown');
    if (msContainer) msContainer.classList.remove('open');
    if (msDropdown) msDropdown.classList.add('hidden');

    // Inicializar módulos seleccionados
    window.selectedBizModules = biz ? [...(biz.modules || [])] : [];
    renderModulesMultiselect();

    if (biz) {
        document.getElementById('biz-id').value = biz.id;
        document.getElementById('biz-name').value = biz.name || '';
        document.getElementById('biz-nit').value = biz.nit || '';
        document.getElementById('biz-phone').value = biz.phone || '';
        document.getElementById('biz-city').value = biz.city || '';
        document.getElementById('biz-address').value = biz.address || '';
        document.getElementById('biz-owner-name').value = biz.ownerName || '';
        document.getElementById('biz-active').checked = biz.status === 'active';

        // Credenciales
        const emailEl = document.getElementById('biz-email');
        const passEl = document.getElementById('biz-pass');
        const passLabel = document.getElementById('biz-pass-label');
        if (emailEl) emailEl.value = biz.clientEmail || '';
        if (passEl) {
            passEl.value = '';
            passEl.placeholder = '••••••••';
            passEl.required = false;
        }
        if (passLabel) passLabel.textContent = 'Contraseña (Dejar vacío para no cambiar)';
    } else {
        document.getElementById('biz-nit').value = '';
        document.getElementById('biz-phone').value = '';
        document.getElementById('biz-address').value = '';
        document.getElementById('biz-owner-name').value = '';

        // Credenciales
        const emailEl = document.getElementById('biz-email');
        const passEl = document.getElementById('biz-pass');
        const passLabel = document.getElementById('biz-pass-label');
        if (emailEl) emailEl.value = '';
        if (passEl) {
            passEl.value = '';
            passEl.placeholder = 'Ej: temporal123';
            passEl.required = true;
        }
        if (passLabel) passLabel.textContent = 'Contraseña *';
    }

    lucide.createIcons();
}

function closeBusinessModal() {
    document.getElementById('business-modal').classList.add('hidden');
}

function showDefaultLogos() {
    const svgs = document.querySelectorAll('.brand-icon svg, .logo-icon-wrap svg');
    svgs.forEach(svg => {
        svg.style.display = 'block';
    });
}

async function fetchPublicConfig() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            if (data.config && data.config.logo) {
                updateAllLogos(data.config.logo);
                return;
            }
        }
    } catch (e) {
        console.warn("No se pudo cargar config", e);
    }
    showDefaultLogos();
}

// Redimensionar base64 para evitar QuotaExceededError en localStorage y optimizar el Favicon
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
                resolve(base64Str);
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
            resolve(base64Str);
        };
    });
}

function updateAllLogos(logoSrc) {
    if (!logoSrc) return;

    // 1. Guardar en caché local para inmediatez en próximas recargas (con try-catch por si localStorage está lleno)
    try {
        localStorage.setItem('as_systems_logo_url', logoSrc);
    } catch (e) {
        console.warn("⚠️ No se pudo guardar el logo en localStorage (posiblemente excedió la cuota de 5MB):", e.message);
    }

    // 2. Actualizar favicon (icono de pestaña) — sin flash: solo actualizar href
    let link = document.getElementById('dynamic-favicon');
    if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-favicon';
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.type = logoSrc.startsWith('data:image/svg') || logoSrc.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    link.href = logoSrc;

    // 3. Optimización en segundo plano: si es demasiado grande (>120KB), comprimirlo y sanear la base de datos automáticamente
    if (logoSrc.length > 120000 && !window._isResizingLogo) {
        window._isResizingLogo = true;
        console.log("⚡ [Favicon] Logo grande detectado. Iniciando auto-compresión...");
        resizeImageBase64(logoSrc, 300, 300).then(resized => {
            if (resized && resized.length < logoSrc.length) {
                console.log("✅ [Favicon] Logo optimizado de", Math.round(logoSrc.length/1024), "KB a", Math.round(resized.length/1024), "KB.");
                try {
                    localStorage.setItem('as_systems_logo_url', resized);
                } catch(e) {}
                
                // Saneamiento automático en la base de datos del servidor
                if (typeof getAdminToken === 'function' && getAdminToken()) {
                    adminFetch('/api/settings/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ logo: resized })
                    }).then(res => {
                        if (res.ok) {
                            console.log("💾 [Favicon] Base de datos saneada con éxito con el logo comprimido.");
                        }
                    }).catch(err => console.error("Error al auto-guardar logo comprimido:", err));
                }
            }
            window._isResizingLogo = false;
        }).catch(() => { window._isResizingLogo = false; });
    }

    const logoHtml = `<img src="${logoSrc}" alt="Logo" style="width:100%; height:100%; object-fit:contain; object-position: center;">`;
    
    // Login Logo
    const loginLogo = document.querySelector('.logo-icon-wrap');
    if (loginLogo) {
        loginLogo.innerHTML = logoHtml;
        loginLogo.style.width = 'auto';
        loginLogo.style.minWidth = '80px';
        loginLogo.style.height = '60px';
        loginLogo.style.background = 'transparent';
    }
    
    // Asegurar que el texto sea visible (eliminando estilos inline previos si los hubiera)
    const loginText = document.querySelector('.login-brand');
    if (loginText) loginText.style.display = '';
    const loginTagline = document.querySelector('.login-tagline');
    if (loginTagline) loginTagline.style.display = '';
    
    // Sidebar Logo
    const sidebarLogo = document.querySelector('.brand-icon');
    if (sidebarLogo) {
        sidebarLogo.innerHTML = logoHtml;
        sidebarLogo.style.width = '60px';
        sidebarLogo.style.height = '40px';
    }
    
    // Asegurar que el texto del sidebar respete su estado (oculto si está colapsado)
    const sidebarText = document.querySelector('.brand-text');
    if (sidebarText) sidebarText.style.display = '';
    
    // Preview in settings
    const preview = document.getElementById('logo-preview-container');
    if (preview) preview.innerHTML = `<img src="${logoSrc}" alt="Logo" style="width:100%; height:100%; object-fit:contain;">`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Charts Initialization
let growthChart = null;
let modulesChart = null;
let revenueChart = null;
let ticketsChart = null;
window.chartsNeedRebuild = false;

function initCharts() {
    // Destruir instancias previas si existen para evitar solapamientos
    if (growthChart) growthChart.destroy();
    if (modulesChart) modulesChart.destroy();
    if (revenueChart) revenueChart.destroy();
    if (ticketsChart) ticketsChart.destroy();

    const ctxGrowth = document.getElementById('growthChart')?.getContext('2d');
    const ctxModules = document.getElementById('modulesChart')?.getContext('2d');
    const ctxRevenue = document.getElementById('revenueChart')?.getContext('2d');
    const ctxTickets = document.getElementById('ticketsChart')?.getContext('2d');

    if (ctxGrowth) {
        growthChart = new Chart(ctxGrowth, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Nuevos Negocios',
                    data: [2, 5, 3, 8, 4, 6],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    if (ctxModules) {
        // Calcular distribución de módulos REAL — iterar biz.modules[] y cruzar con módulos
        const moduleCounts = {};
        appState.businesses.forEach(biz => {
            (biz.modules || []).forEach(mid => {
                const mod = appState.modules.find(m => m.id === mid);
                const label = mod ? mod.name : mid;
                moduleCounts[label] = (moduleCounts[label] || 0) + 1;
            });
        });

        // Si no hay datos, mostrar placeholder
        const chartLabels = Object.keys(moduleCounts).length > 0 
            ? Object.keys(moduleCounts) 
            : ['Sin datos'];
        const chartData = Object.values(moduleCounts).length > 0 
            ? Object.values(moduleCounts) 
            : [1];
        const COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316'];

        modulesChart = new Chart(ctxModules, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartLabels.map((_, i) => COLORS[i % COLORS.length]),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#94a3b8', 
                            padding: 20, 
                            font: { family: 'Outfit', size: 12 },
                            boxWidth: 12,
                            borderRadius: 4
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // --- REVENUE CHART (GANANCIAS MENSUALES) ---
    if (ctxRevenue) {
        // KPI: Ingresos del mes (suma real basada en módulos con precio y sedes)
        let currentMonthlyRevenue = 0;
        appState.businesses.forEach(biz => {
            if (biz.status !== 'active') return;
            
            let monthlyAmount = 0;
            if (biz.moduleInstances && biz.moduleInstances.length > 0) {
                biz.moduleInstances.forEach(inst => {
                    if (inst.status === 'active') {
                        monthlyAmount += parseFloat(inst.priceApplied) || 0;
                    }
                });
            } else {
                (biz.modules || []).forEach(mid => {
                    const mod = appState.modules.find(m => m.id === mid);
                    if (mod && mod.price) {
                        const price = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                        if (!isNaN(price)) monthlyAmount += price;
                    }
                });
            }
            currentMonthlyRevenue += monthlyAmount;
        });

        const gradient = ctxRevenue.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.1)');

        revenueChart = new Chart(ctxRevenue, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ingresos Mensuales (MRR)',
                    data: [
                        Math.round(currentMonthlyRevenue * 0.55),
                        Math.round(currentMonthlyRevenue * 0.68),
                        Math.round(currentMonthlyRevenue * 0.72),
                        Math.round(currentMonthlyRevenue * 0.85),
                        Math.round(currentMonthlyRevenue * 0.92),
                        currentMonthlyRevenue
                    ],
                    backgroundColor: gradient,
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                    barPercentage: 0.55
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.dataset.label + ': $' + context.raw.toLocaleString('es-CO') + ' COP';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Outfit', size: 11 },
                            callback: function(value) {
                                return '$' + (value >= 1e6 ? (value/1e6).toFixed(1) + 'M' : (value/1e3).toFixed(0) + 'k');
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                    }
                }
            }
        });
    }

    // --- CITIES DISTRIBUTION CHART (NEGOCIOS POR CIUDAD) ---
    if (ctxTickets) {
        const cities = {};
        appState.businesses.forEach(biz => {
            const city = biz.city || 'Desconocido';
            cities[city] = (cities[city] || 0) + 1;
        });
        
        let labels = Object.keys(cities);
        let data = Object.values(cities);
        
        if (labels.length === 0) {
            labels = ['Maicao', 'Riohacha', 'Valledupar'];
            data = [0, 0, 0];
        }

        const COLORS = ['rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)'];
        const BORDERS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

        ticketsChart = new Chart(ctxTickets, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Negocios',
                    data: data,
                    backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
                    borderColor: labels.map((_, i) => BORDERS[i % BORDERS.length]),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Outfit', size: 11 },
                            stepSize: 1
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12, weight: 'bold' } }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// MÓDULO DE FACTURACIÓN — Gestión de Suscripciones y Pagos
// ==========================================================================

/**
 * Renderiza la tabla de facturación con el estado de cada negocio.
 * Se llama cada vez que se abre el tab de Facturación.
 */
function renderBillingTab() {
    const list = document.getElementById('billing-list');
    if (!list) return;

    const modules = appState.modules || [];
    const businesses = appState.businesses || [];

    // Calcular KPIs de TODOS los negocios (sin filtrar por buscador o pill de pestaña)
    let totalRevenue = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let upcomingCount = 0;
    const today = new Date().toISOString().slice(0, 10);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    businesses.forEach(biz => {
        const billing = biz.billing || {};
        const status = billing.subscription_status || 'pending';

        // Calcular monto mensual
        let monthlyAmount = 0;
        if (biz.moduleInstances && biz.moduleInstances.length > 0) {
            biz.moduleInstances.forEach(inst => {
                if (inst.status === 'active') {
                    monthlyAmount += parseFloat(inst.priceApplied) || 0;
                }
            });
        } else {
            (biz.modules || []).forEach(modId => {
                const mod = modules.find(m => m.id === modId);
                if (mod?.price) {
                    const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                    if (!isNaN(p)) monthlyAmount += p;
                }
            });
        }

        // Acumular KPIs
        if (status === 'active') {
            activeCount++;
            totalRevenue += monthlyAmount;
        }
        if (status === 'suspended') {
            suspendedCount++;
        }
        if (billing.next_billing_date && billing.next_billing_date <= in7Days && billing.next_billing_date >= today) {
            upcomingCount++;
        }
    });

    // Ahora filtramos para renderizar la tabla (solo incluimos negocios con al menos un módulo asignado)
    let filteredBusinesses = businesses.filter(biz => {
        return (biz.modules && biz.modules.length > 0) || (biz.moduleInstances && biz.moduleInstances.length > 0);
    });

    // Filtro por buscador (billing-search)
    const searchInput = document.getElementById('billing-search');
    if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase().trim();
        filteredBusinesses = filteredBusinesses.filter(b => 
            (b.name && b.name.toLowerCase().includes(term)) || 
            (b.clientEmail && b.clientEmail.toLowerCase().includes(term)) ||
            (b.city && b.city.toLowerCase().includes(term))
        );
    }

    // Filtro por pill de pestaña activa
    const filter = window._currentBillingFilter || 'all';
    if (filter === 'active') {
        filteredBusinesses = filteredBusinesses.filter(b => (b.billing?.subscription_status || 'pending') === 'active');
    } else if (filter === 'suspended') {
        filteredBusinesses = filteredBusinesses.filter(b => (b.billing?.subscription_status || 'pending') === 'suspended');
    } else if (filter === 'pending') {
        filteredBusinesses = filteredBusinesses.filter(b => {
            const billing = b.billing || {};
            const status = billing.subscription_status || 'pending';
            const isUpcoming = billing.next_billing_date && billing.next_billing_date <= in7Days && billing.next_billing_date >= today;
            return status === 'pending' || isUpcoming;
        });
    }

    // Renderizar la tabla de facturación con la lista filtrada
    list.innerHTML = filteredBusinesses.map(biz => {
        const billing = biz.billing || {};
        const status = billing.subscription_status || 'pending';

        // Calcular monto mensual del negocio específico
        let monthlyAmount = 0;
        if (biz.moduleInstances && biz.moduleInstances.length > 0) {
            biz.moduleInstances.forEach(inst => {
                if (inst.status === 'active') {
                    monthlyAmount += parseFloat(inst.priceApplied) || 0;
                }
            });
        } else {
            (biz.modules || []).forEach(modId => {
                const mod = modules.find(m => m.id === modId);
                if (mod?.price) {
                    const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                    if (!isNaN(p)) monthlyAmount += p;
                }
            });
        }

        // Contar suscripciones activas (moduleInstances o modules como fallback)
        const activeSubsCount = biz.moduleInstances && biz.moduleInstances.length > 0
            ? biz.moduleInstances.filter(inst => inst.status === 'active').length
            : (biz.modules || []).length;
        const subsLabel = activeSubsCount === 1 ? '1 Suscripción' : `${activeSubsCount} Suscripciones`;

        // Badge de estado
        let statusBadge = {
            active: '<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:700;">✓ Activo</span>',
            suspended: '<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:700;">⛔ Suspendido</span>',
            pending: '<span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:700;">⏳ Pendiente</span>',
            cancelled: '<span style="background:rgba(100,116,139,0.15);color:#64748b;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:700;">🚫 Cancelado</span>',
        }[status] || '<span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:700;">⏳ Pendiente</span>';

        if (activeSubsCount === 0) {
            statusBadge = '<span style="color:#64748b;font-weight:600;">—</span>';
        }

        // Info de tarjeta
        const cardInfo = billing.gateway_token
            ? `<span title="Token: ${billing.gateway_token}" style="font-size:0.8rem;">💳 ${billing.card_brand || ''} ···${billing.last_four || '****'}</span>`
            : `<span style="color:#94a3b8;font-size:0.8rem;">Sin tarjeta</span>`;

        // Próximo corte (fecha más cercana de todas las sedes activas)
        const nextCut = formatBillingDate(getClosestBillingDate(biz), { day: '2-digit', month: 'short', year: 'numeric' });

        const amountDisplay = monthlyAmount > 0
            ? `$${monthlyAmount.toLocaleString('es-CO')}`
            : '<span style="color:#64748b;">$0</span>';

        // Botones de acción
        const detailsBtn = `<button class="btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.7rem;color:#818cf8;border:1px solid rgba(99,102,241,0.25);border-radius:7px;" onclick="billingShowDetail(${biz.id})" title="Ver detalle de facturación"><i data-lucide="file-text" style="width:13px;height:13px;"></i> Detalle</button>`;

        // Botón Regalar días (siempre visible para el Admin)
        const giftDaysBtn = `<button class="btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.7rem;color:#10b981;border:1px solid rgba(16,185,129,0.25);border-radius:7px;" onclick="billingGiftDays(${biz.id})" title="Regalar días de suscripción"><i data-lucide="gift" style="width:13px;height:13px;"></i> Días</button>`;

        return `<tr>
            <td>
                <div style="font-weight:700; color:var(--text-main); font-size:0.95rem;">
                    ${biz.name}
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem; margin-top:0.3rem;">
                    <span style="font-size:0.7rem; color:var(--primary); text-transform:uppercase; letter-spacing:0.05em; font-weight:600; min-width:100px;">${subsLabel}</span>
                    <span style="font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; gap:0.2rem;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${biz.city || 'Sin ciudad'}</span>
                </div>
            </td>
            <td style="text-align:center;">${cardInfo}</td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="text-align:center;font-size:0.85rem;">${nextCut}</td>
            <td style="text-align:center;font-weight:600;">${amountDisplay}</td>
            <td style="text-align:center;">
                <div style="display:flex;gap:0.4rem;justify-content:center;flex-wrap:wrap;align-items:center;">
                    ${detailsBtn}${giftDaysBtn}
                </div>
            </td>
        </tr>`;
    }).join('');

    // Actualizar KPIs
    const fmtCOP = v => '$' + v.toLocaleString('es-CO');
    document.getElementById('total-revenue').textContent = fmtCOP(totalRevenue);
    document.getElementById('active-subscriptions').textContent = activeCount;
    document.getElementById('suspended-subscriptions').textContent = suspendedCount;
    document.getElementById('upcoming-renewals').textContent = upcomingCount;

    // Re-renderizar íconos Lucide en el nuevo contenido
    if (window.lucide) lucide.createIcons();
}

window.setBillingFilter = function(filter) {
    window._currentBillingFilter = filter;
    
    // Activar pill en la UI
    const pills = document.querySelectorAll('#billing-filters .pill');
    pills.forEach(p => {
        const action = p.getAttribute('onclick');
        if (action && action.includes(`'${filter}'`)) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });
    
    renderBillingTab();
};

/**
 * Muestra un modal con el detalle de facturación de un negocio.
 */
window.billingShowDetail = async function(bizId) {
    const biz = appState.businesses.find(b => b.id === bizId);
    if (!biz) return;
    const billing = biz.billing || {};
    const modules = appState.modules || [];

    // Calcular monto mensual
    let monthlyAmount = 0;
    const instLines = [];
    if (biz.moduleInstances && biz.moduleInstances.length > 0) {
        biz.moduleInstances.forEach(inst => {
            if (inst.status === 'active') {
                const p = parseFloat(inst.priceApplied) || 0;
                monthlyAmount += p;
                const mod = modules.find(m => String(m.id) === String(inst.moduleId));
                const renewal = formatBillingDate(inst.renewalDate || biz.billing?.next_billing_date, { day: '2-digit', month: 'short', year: 'numeric' });
                instLines.push(`<tr>
                    <td style="padding:0.4rem 0.5rem;color:var(--text-main);border-bottom:1px solid var(--border-color);">${mod ? mod.name : inst.moduleId}</td>
                    <td style="padding:0.4rem 0.5rem;color:var(--text-muted);font-size:0.75rem;border-bottom:1px solid var(--border-color);">${inst.branchName || inst.sedeName || 'Sede Principal'}</td>
                    <td style="padding:0.4rem 0.5rem;color:var(--text-muted);font-size:0.75rem;text-align:center;border-bottom:1px solid var(--border-color);">${renewal}</td>
                    <td style="padding:0.4rem 0.5rem;text-align:right;color:var(--text-main);font-weight:600;border-bottom:1px solid var(--border-color);">$${p.toLocaleString('es-CO')}</td>
                </tr>`);
            }
        });
    } else {
        (biz.modules || []).forEach(modId => {
            const mod = modules.find(m => m.id === modId);
            if (mod?.price) {
                const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                if (!isNaN(p)) { 
                    monthlyAmount += p; 
                    const renewal = formatBillingDate(biz.billing?.next_billing_date, { day: '2-digit', month: 'short', year: 'numeric' });
                    instLines.push(`<tr>
                        <td style="padding:0.4rem 0.5rem;color:var(--text-main);border-bottom:1px solid var(--border-color);">${mod.name}</td>
                        <td style="padding:0.4rem 0.5rem;color:var(--text-muted);font-size:0.75rem;border-bottom:1px solid var(--border-color);">Sede Principal</td>
                        <td style="padding:0.4rem 0.5rem;color:var(--text-muted);font-size:0.75rem;text-align:center;border-bottom:1px solid var(--border-color);">${renewal}</td>
                        <td style="padding:0.4rem 0.5rem;text-align:right;color:var(--text-main);font-weight:600;border-bottom:1px solid var(--border-color);">$${p.toLocaleString('es-CO')}</td>
                    </tr>`); 
                }
            }
        });
    }

    const activeSubsCount = biz.moduleInstances && biz.moduleInstances.length > 0
        ? biz.moduleInstances.filter(inst => inst.status === 'active').length
        : (biz.modules || []).length;

    const statusLabels = { active: '✓ Activo', suspended: '⛔ Suspendido', pending: '⏳ Pendiente', cancelled: '🚫 Cancelado' };
    const status = billing.subscription_status || 'pending';
    const displayStatus = activeSubsCount === 0 ? '—' : (statusLabels[status] || status);
    const nextCut = formatBillingDate(getClosestBillingDate(biz), { day: '2-digit', month: 'long', year: 'numeric' });
    const lastPayment = billing.last_payment_date
        ? new Date(billing.last_payment_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';

    await Swal.fire({
        title: `<span style="font-size:1.1rem;font-weight:800;color:var(--text-main);">📄 ${biz.name}</span>`,
        html: `
            <div style="text-align:left;font-size:0.88rem;color:var(--text-main);">
                <!-- Botón de descarga de PDF individual -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; background:rgba(99,102,241,0.05); padding:0.6rem 0.8rem; border-radius:10px; border:1px solid rgba(99,102,241,0.15);">
                    <div>
                        <div style="font-size:0.7rem; color:#818cf8; text-transform:uppercase; font-weight:700;">Ficha del Negocio</div>
                        <div style="font-weight:700; color:var(--text-main); font-size:0.85rem;">Exportar reporte actual</div>
                    </div>
                    <button class="btn-primary" style="font-size:0.75rem; padding:0.4rem 0.8rem; background:#6366f1; border:none; border-radius:6px; color:#fff; font-weight:600; display:flex; align-items:center; gap:0.3rem; cursor:pointer;" onclick="downloadIndividualBusinessPDF(${biz.id})">
                        <i data-lucide="download" style="width:13px;height:13px;"></i> Descargar PDF
                    </button>
                </div>

                <!-- Grilla de KPIs de Facturación -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
                    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);padding:0.75rem;border-radius:10px;">
                        <div style="font-size:0.7rem;color:#818cf8;text-transform:uppercase;font-weight:700;margin-bottom:0.3rem;">Estado</div>
                        <div style="font-weight:700;color:var(--text-main);">${displayStatus}</div>
                    </div>
                    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);padding:0.75rem;border-radius:10px;">
                        <div style="font-size:0.7rem;color:#10b981;text-transform:uppercase;font-weight:700;margin-bottom:0.3rem;">Monto/Mes</div>
                        <div style="font-weight:700;color:var(--text-main);">$${monthlyAmount.toLocaleString('es-CO')}</div>
                    </div>
                    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);padding:0.75rem;border-radius:10px;">
                        <div style="font-size:0.7rem;color:#f59e0b;text-transform:uppercase;font-weight:700;margin-bottom:0.3rem;">Próximo Corte</div>
                        <div style="font-weight:700;color:var(--text-main);">${nextCut}</div>
                    </div>
                    <div style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.15);padding:0.75rem;border-radius:10px;">
                        <div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-bottom:0.3rem;">Último Pago</div>
                        <div style="font-weight:700;color:var(--text-main);">${lastPayment}</div>
                    </div>
                </div>

                <!-- Datos del Cliente / Propietario -->
                <div style="font-size:0.72rem;color:#818cf8;text-transform:uppercase;font-weight:700;margin-bottom:0.5rem;">Información del Cliente</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.25rem;background:var(--bg-surface-light);padding:0.75rem;border-radius:10px;border:1px solid var(--border-color);">
                    <div>
                        <span style="color:var(--text-muted);font-size:0.75rem;display:block;">Propietario / Cliente</span>
                        <span style="color:var(--text-main);font-weight:600;">${biz.ownerName || '—'}</span>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);font-size:0.75rem;display:block;">NIT / CC</span>
                        <span style="color:var(--text-main);font-weight:600;">${biz.nit || '—'}</span>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);font-size:0.75rem;display:block;">Teléfono</span>
                        <span style="color:var(--text-main);font-weight:600;">${biz.phone || '—'}</span>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);font-size:0.75rem;display:block;">Email</span>
                        <span style="color:var(--text-main);font-weight:600;word-break:break-all;">${biz.clientEmail || '—'}</span>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);font-size:0.75rem;display:block;">Dirección</span>
                        <span style="color:var(--text-main);font-weight:600;word-break:break-all;">${biz.address || '—'} ${biz.city ? `(${biz.city})` : ''}</span>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);font-size:0.75rem;display:block;">Tarjeta Registrada</span>
                        <span style="color:var(--text-main);font-weight:600;display:flex;align-items:center;gap:4px;">
                            ${billing.gateway_token 
                                ? `💳 ${billing.card_brand || ''} ···${billing.last_four || '****'}` 
                                : '<span style="color:var(--text-muted);">Sin tarjeta</span>'}
                        </span>
                    </div>
                </div>

                <!-- Desglose de Módulos Activos -->
                ${instLines.length > 0 ? `
                    <div style="font-size:0.72rem;color:#818cf8;text-transform:uppercase;font-weight:700;margin-bottom:0.5rem;">Módulos / Sedes activas</div>
                    <div class="custom-scrollbar" style="max-height:190px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-surface-light); margin-bottom:0.75rem; padding:0 0.25rem;">
                        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                            <thead>
                                <tr style="border-bottom:1px solid var(--border-color); position:sticky; top:0; background:var(--bg-surface-light); z-index:10;">
                                    <th style="padding:0.4rem 0.5rem;text-align:left;color:var(--text-muted);font-weight:600;background:var(--bg-surface-light);">Módulo</th>
                                    <th style="padding:0.4rem 0.5rem;text-align:left;color:var(--text-muted);font-weight:600;background:var(--bg-surface-light);">Sede</th>
                                    <th style="padding:0.4rem 0.5rem;text-align:center;color:var(--text-muted);font-weight:600;background:var(--bg-surface-light);">Corte</th>
                                    <th style="padding:0.4rem 0.5rem;text-align:right;color:var(--text-muted);font-weight:600;background:var(--bg-surface-light);">Precio</th>
                                </tr>
                            </thead>
                            <tbody>${instLines.join('')}</tbody>
                        </table>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:0.6rem; font-size:0.85rem; font-weight:700;">
                        <span style="color:var(--text-main);">Total de Suscripciones</span>
                        <span style="color:#10b981; font-size:1.05rem; font-weight:800;">$${monthlyAmount.toLocaleString('es-CO')}</span>
                    </div>
                ` : '<span style="color:var(--text-muted);">Sin módulos asignados.</span>'}
            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#6366f1',
        width: '600px',
        didOpen: (popup) => {
            if (window.lucide) lucide.createIcons();
        }
    });
};

/**
 * Regala días adicionales de suscripción a un negocio, permitiendo elegir módulo y sede específicos.
 */
window.billingGiftDays = async function(bizId) {
    const biz = appState.businesses.find(b => b.id === bizId);
    if (!biz) return;

    const modules = appState.modules || [];

    // Obtener todas las instancias de módulos activos
    const activeInstances = [];
    if (biz.moduleInstances && biz.moduleInstances.length > 0) {
        biz.moduleInstances.forEach(inst => {
            if (inst.status === 'active') {
                const mod = modules.find(m => String(m.id) === String(inst.moduleId));
                activeInstances.push({
                    instanceId: inst.instanceId,
                    moduleId: inst.moduleId,
                    moduleName: mod ? mod.name : inst.moduleId,
                    branchName: inst.branchName || inst.sedeName || 'Sede Principal',
                    renewalDate: inst.renewalDate || biz.billing?.next_billing_date
                });
            }
        });
    } else {
        // Fallback legacy
        (biz.modules || []).forEach((modId, index) => {
            const mod = modules.find(m => String(m.id) === String(modId));
            activeInstances.push({
                instanceId: `${biz.id}-${modId}-${index}`,
                moduleId: modId,
                moduleName: mod ? mod.name : modId,
                branchName: 'Sede Principal',
                renewalDate: biz.billing?.next_billing_date
            });
        });
    }

    if (activeInstances.length === 0) {
        Swal.fire({
            title: 'Sin módulos activos',
            text: 'Este negocio no tiene módulos activos a los cuales regalarles días.',
            icon: 'warning',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
            confirmButtonColor: '#6366f1'
        });
        return;
    }

    // Agrupar por módulo único para el primer selector
    const uniqueModules = [];
    activeInstances.forEach(inst => {
        if (!uniqueModules.some(m => m.moduleId === inst.moduleId)) {
            uniqueModules.push({ moduleId: inst.moduleId, moduleName: inst.moduleName });
        }
    });

    // Construir el formulario HTML
    const htmlContent = `
        <div style="text-align:left; font-size:0.9rem; color:var(--text-main);">
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">
                Selecciona el módulo y la sede a la que deseas ajustar los días de suscripción.
            </p>
            
            <div style="margin-bottom:1rem; display: flex; gap: 0.5rem; background: var(--bg-surface-light); padding: 0.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <button type="button" id="toggle-action-add" class="toggle-action-btn active" style="flex: 1; padding: 0.5rem; border-radius: 6px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: var(--primary); color: white;">
                    ➕ Adicionar
                </button>
                <button type="button" id="toggle-action-remove" class="toggle-action-btn" style="flex: 1; padding: 0.5rem; border-radius: 6px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-muted);">
                    ➖ Quitar
                </button>
            </div>
            
            <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.75rem; color:#818cf8; text-transform:uppercase; font-weight:700; margin-bottom:0.4rem;">Módulo</label>
                <select id="gift-module-select" style="width:100%; padding:0.6rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface-light); color:var(--text-main); font-size:0.9rem;">
                    ${uniqueModules.map(m => `<option value="${m.moduleId}">${m.moduleName}</option>`).join('')}
                </select>
            </div>
            
            <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.75rem; color:#818cf8; text-transform:uppercase; font-weight:700; margin-bottom:0.4rem;">Sede</label>
                <select id="gift-branch-select" style="width:100%; padding:0.6rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface-light); color:var(--text-main); font-size:0.9rem;">
                    <!-- Se llena dinámicamente -->
                </select>
            </div>
            
            <div style="margin-bottom:1.25rem; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); padding:0.6rem; border-radius:8px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-muted);">Corte Actual:</span>
                <span id="current-expiry-display" style="color:#10b981; font-weight:700;">—</span>
            </div>

            <div style="margin-bottom:0.5rem;">
                <label id="gift-days-label" style="display:block; font-size:0.75rem; color:#818cf8; text-transform:uppercase; font-weight:700; margin-bottom:0.4rem;">Días Adicionales</label>
                <input type="number" id="gift-days-input" min="1" max="365" value="30" style="width:100%; padding:0.75rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-surface-light); color:var(--text-main); font-size:1.2rem; font-weight:700; text-align:center;">
            </div>
            <p id="gift-days-help" style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin:0.3rem 0 0;">días a regalar</p>
        </div>
    `;

    let selectedAction = 'add';

    const { value: result, isConfirmed } = await Swal.fire({
        title: `<span style="font-size:1rem;font-weight:800;color:var(--text-main);">🎁 Ajustar Días de Suscripción a</span><br><span style="color:var(--primary);font-size:1.1rem;">${biz.name}</span>`,
        html: htmlContent,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        confirmButtonText: '🎁 Regalar días',
        confirmButtonColor: '#10b981',
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#64748b',
        showCancelButton: true,
        didOpen: (popup) => {
            const moduleSelect = popup.querySelector('#gift-module-select');
            const branchSelect = popup.querySelector('#gift-branch-select');
            const expiryDisplay = popup.querySelector('#current-expiry-display');
            const daysInput = popup.querySelector('#gift-days-input');
            
            const btnAdd = popup.querySelector('#toggle-action-add');
            const btnRemove = popup.querySelector('#toggle-action-remove');
            const daysLabel = popup.querySelector('#gift-days-label');
            const daysHelp = popup.querySelector('#gift-days-help');
            const submitBtn = popup.querySelector('.swal2-confirm');

            const setAction = (action) => {
                selectedAction = action;
                if (action === 'add') {
                    btnAdd.style.background = 'var(--primary)';
                    btnAdd.style.color = 'white';
                    btnRemove.style.background = 'transparent';
                    btnRemove.style.color = 'var(--text-muted)';
                    if (daysLabel) daysLabel.textContent = 'Días Adicionales';
                    if (daysHelp) daysHelp.textContent = 'días a regalar';
                    if (submitBtn) {
                        submitBtn.innerHTML = '🎁 Regalar días';
                        submitBtn.style.backgroundColor = '#10b981';
                    }
                } else {
                    btnRemove.style.background = '#ef4444';
                    btnRemove.style.color = 'white';
                    btnAdd.style.background = 'transparent';
                    btnAdd.style.color = 'var(--text-muted)';
                    if (daysLabel) daysLabel.textContent = 'Días a Remover';
                    if (daysHelp) daysHelp.textContent = 'días a quitar';
                    if (submitBtn) {
                        submitBtn.innerHTML = '✂️ Quitar días';
                        submitBtn.style.backgroundColor = '#ef4444';
                    }
                }
            };

            btnAdd?.addEventListener('click', () => setAction('add'));
            btnRemove?.addEventListener('click', () => setAction('remove'));

            if (daysInput) {
                daysInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        Swal.clickConfirm();
                    }
                });
            }

            // Helper to refresh the branch custom dropdown after dynamic fill
            const refreshBranchCustom = () => {
                // Remove previous custom wrap if any
                const prev = branchSelect.parentNode.querySelector('.swal-select-wrap');
                if (prev) prev.remove();
                delete branchSelect.dataset.swalSelectInit;
                window.makeSwalSelect('gift-branch-select');
                // updateExpiry ya está vinculado al branchSelect nativo más abajo — no agregar duplicado
            };

            const updateBranches = () => {
                const selectedModule = moduleSelect.value;
                // Filtrar instancias activas de ese módulo
                const instancesForModule = activeInstances.filter(inst => String(inst.moduleId) === String(selectedModule));
                
                // Llenar el selector de sedes
                branchSelect.innerHTML = instancesForModule.map(inst => 
                    `<option value="${inst.instanceId}" data-expiry="${inst.renewalDate || ''}">${inst.branchName}</option>`
                ).join('');

                updateExpiry();
                refreshBranchCustom();
            };

            const updateExpiry = () => {
                const selectedOption = branchSelect.options[branchSelect.selectedIndex];
                if (selectedOption) {
                    const expiry = selectedOption.getAttribute('data-expiry');
                    if (expiry) {
                        expiryDisplay.textContent = formatBillingDate(expiry, { day: '2-digit', month: 'short', year: 'numeric' });
                    } else {
                        expiryDisplay.textContent = '—';
                    }
                } else {
                    expiryDisplay.textContent = '—';
                }
            };

            moduleSelect.addEventListener('change', updateBranches);
            branchSelect.addEventListener('change', updateExpiry);

            // Upgrade module select to premium dropdown
            window.makeSwalSelect('gift-module-select');

            // Inicializar por primera vez
            updateBranches();
        },
        preConfirm: () => {
            const moduleSelect = document.getElementById('gift-module-select');
            const branchSelect = document.getElementById('gift-branch-select');
            const daysInput = document.getElementById('gift-days-input');

            const instanceId = branchSelect.value;
            const daysVal = parseInt(daysInput.value, 10);

            if (!instanceId) {
                Swal.showValidationMessage('Selecciona una sede válida.');
                return false;
            }
            if (!daysVal || daysVal < 1 || daysVal > 365) {
                Swal.showValidationMessage('Ingresa un número de días entre 1 y 365.');
                return false;
            }

            const finalDays = selectedAction === 'remove' ? -daysVal : daysVal;

            return {
                instanceId,
                days: finalDays,
                action: selectedAction,
                moduleName: moduleSelect.options[moduleSelect.selectedIndex].text,
                branchName: branchSelect.options[branchSelect.selectedIndex].text
            };
        }
    });

    if (!isConfirmed || !result) return;

    try {
        const resp = await adminFetch(`/api/payment/extend-billing/${bizId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                days: result.days,
                instanceId: result.instanceId
            }),
        });
        const data = await resp.json();
        if (data.ok) {
            const successMsg = result.action === 'remove'
                ? `✂️ ${Math.abs(result.days)} día(s) removidos a ${result.moduleName} (${result.branchName}). Nuevo corte: ${data.newDate}`
                : `🎁 ${result.days} día(s) regalados a ${result.moduleName} (${result.branchName}). Nuevo corte: ${data.newDate}`;
            showToast(successMsg, 'success');
            await loadData();
            renderBillingTab();
        } else {
            showToast('❌ ' + (data.message || 'Error al ajustar días'), 'error');
        }
    } catch (e) {
        showToast('❌ Error de red al ajustar días.', 'error');
    }
};

/**
 * Asigna una tarjeta simulada a un negocio (modo prueba).
 */
async function billingAssignSimCard(bizId) {
    const brands = ['VISA', 'MASTERCARD'];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    const simToken = `sim_tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);

    try {
        const resp = await adminFetch('/api/payment/save-token', {
            method: 'POST',
            body: JSON.stringify({
                bizId,
                token: simToken,
                last_four: last4,
                card_brand: brand,
                next_billing_date: nextDate.toISOString().slice(0, 10),
            }),
        });
        const data = await resp.json();
        if (data.ok) {
            showToast(`✅ Tarjeta simulada ${brand} ···${last4} asignada correctamente.`, 'success');
            await loadData(); // Recargar datos
            renderBillingTab();
        } else {
            showToast('❌ Error: ' + (data.message || data.error || 'Error desconocido'), 'error');
        }
    } catch (e) {
        showToast('❌ Error de red al asignar tarjeta.', 'error');
    }
}

/**
 * Cobra manualmente la suscripción de un negocio.
 */
async function billingChargeNow(bizId) {
    const biz = appState.businesses.find(b => b.id === bizId);
    if (!biz) return;
    
    const result = await Swal.fire({
        title: '¿Cobrar suscripción?',
        html: `¿Estás seguro de cobrar la suscripción de <strong style="color:var(--primary)">${biz.name}</strong> ahora?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, cobrar ahora',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-surface)',
        color: 'var(--text-main)'
    });
    if (!result.isConfirmed) return;

    try {
        const resp = await adminFetch(`/api/payment/charge-subscription/${bizId}`, { method: 'POST' });
        const data = await resp.json();
        if (data.ok) {
            showToast(`✅ Cobro exitoso para ${biz.name}. TXN: ${data.result?.transactionId}`, 'success');
            await loadData();
            renderBillingTab();
        } else {
            showToast(`❌ Cobro fallido: ${data.message || data.error || 'Error desconocido'}`, 'error');
            await loadData();
            renderBillingTab();
        }
    } catch (e) {
        showToast('❌ Error de red al cobrar.', 'error');
    }
}

/**
 * Elimina la tarjeta guardada de un negocio.
 */
async function billingRemoveCard(bizId) {
    const biz = appState.businesses.find(b => b.id === bizId);
    if (!biz) return;

    const result = await Swal.fire({
        title: '¿Eliminar tarjeta?',
        html: `Vas a eliminar la tarjeta guardada de <strong style="color:#ef4444">${biz.name}</strong>. Tendrán que registrar una nueva para próximos cobros.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-surface)',
        color: 'var(--text-main)'
    });
    if (!result.isConfirmed) return;

    try {
        const resp = await adminFetch(`/api/payment/remove-card/${bizId}`, { method: 'DELETE' });
        const data = await resp.json();
        if (data.ok) {
            showToast('🗑️ Tarjeta eliminada.', 'success');
            await loadData();
            renderBillingTab();
        } else {
            showToast('❌ Error: ' + (data.message || data.error || 'Error desconocido'), 'error');
        }
    } catch (e) {
        showToast('❌ Error de red.', 'error');
    }
}

/**
 * Dispara el ciclo de facturación automática manualmente.
 */
async function billingTriggerCycle(dryRun = false) {
    const label = dryRun ? 'simulación (dry-run)' : 'ciclo de cobros REAL';
    
    if (!dryRun) {
        const result = await Swal.fire({
            title: '⚡ Ejecutar Ciclo de Cobros',
            html: `Esto procesará los pagos de <strong>todos los negocios</strong> con fecha de corte para hoy.<br><br><span style="color:#f59e0b;font-size:0.9rem;">Esta acción no se puede deshacer.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, iniciar cobros',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)'
        });
        if (!result.isConfirmed) return;
    }

    try {
        const resp = await adminFetch('/api/payment/trigger-billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dryRun }),
        });
        const data = await resp.json();
        if (data.ok) {
            const msg = dryRun
                ? `👁️ Dry-run completo: ${data.processed} negocios analizados (sin cobros reales).`
                : `⚡ Ciclo ejecutado: ${data.charged} cobros exitosos, ${data.failed} fallidos.`;
            showToast(msg, 'success');
            if (!dryRun) { await loadData(); renderBillingTab(); }
        } else {
            showToast('❌ Error ejecutando ciclo: ' + (data.message || data.error || 'Error desconocido'), 'error');
        }
    } catch (e) {
        showToast('❌ Error de red al disparar ciclo.', 'error');
    }
}


// ── Registrar event listeners del tab de facturación ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Re-renderizar cada vez que se activa el tab de Facturación
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'tab-billing') {
                setTimeout(renderBillingTab, 50);
            }
        });
    });

    // Botón "Disparar Ciclo"
    document.addEventListener('click', e => {
        if (e.target.closest('#btn-trigger-billing')) billingTriggerCycle(false);
        if (e.target.closest('#btn-trigger-billing-dry')) billingTriggerCycle(true);
    });
});


// ============================================================
// MODULO: GESTION DE TICKETS DE SOPORTE (ADMIN)
// ============================================================
appState.adminTickets = [];
window._currentTicketFilter = 'all';
window.selectedChatFile = null;

async function loadAdminTickets() {
    const tbody = document.getElementById('tickets-list');
    if (!tbody) return;
    
    const hasTickets = appState.adminTickets && appState.adminTickets.length > 0;
    if (!hasTickets) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
            <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:8px;"></span>
            Cargando tickets...
        </td></tr>`;
    }
    
    try {
        const res = await adminFetch('/api/admin/tickets');
        const data = await res.json();
        if (res.ok && data.success) {
            appState.adminTickets = data.tickets || [];
            renderAdminTickets();
            updateTicketBadge();
            updateTicketKPIs();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--danger);">Error: ${data.error || 'No se pudieron cargar los tickets'}</td></tr>`;
        }
    } catch (err) {
        console.error('Error cargando tickets de admin:', err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--danger);">Error al cargar los tickets. (${err.message})</td></tr>`;
    }
}

function updateTicketBadge() {
    const badgeOpen = document.getElementById('badge-tickets');
    const badgeUrgent = document.getElementById('badge-tickets-urgent');
    
    if (badgeOpen) {
        const openCount = appState.adminTickets.filter(t => t.status === 'abierto').length;
        if (openCount > 0) {
            badgeOpen.textContent = openCount;
            badgeOpen.classList.remove('hidden');
        } else {
            badgeOpen.classList.add('hidden');
        }
    }
    
    if (badgeUrgent) {
        const urgentCount = appState.adminTickets.filter(t => t.status !== 'cerrado' && t.status !== 'resuelto' && t.priority === 'urgente').length;
        if (urgentCount > 0) {
            badgeUrgent.textContent = urgentCount;
            badgeUrgent.classList.remove('hidden');
        } else {
            badgeUrgent.classList.add('hidden');
        }
    }
}

function updateTicketKPIs() {
    const all = appState.adminTickets || [];
    
    const openVal = all.filter(t => t.status === 'abierto').length;
    const progressVal = all.filter(t => t.status === 'en_proceso').length;
    const resolvedVal = all.filter(t => t.status === 'resuelto').length;
    const closedVal = all.filter(t => t.status === 'cerrado').length;
    const urgentVal = all.filter(t => t.status !== 'cerrado' && t.status !== 'resuelto' && t.priority === 'urgente').length;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setVal('dash-tickets-open', openVal);
    setVal('dash-tickets-progress', progressVal);
    setVal('dash-tickets-resolved', resolvedVal + closedVal);
    setVal('dash-tickets-urgent', urgentVal);

    setVal('ticket-kpi-open', openVal);
    setVal('ticket-kpi-in-progress', progressVal);
    setVal('ticket-kpi-resolved', resolvedVal + closedVal);
}

window.setTicketFilter = function(filter) {
    window._currentTicketFilter = filter;
    document.querySelectorAll('#ticket-filters .pill').forEach(p => p.classList.remove('active'));
    const activeBtn = document.querySelector(`#ticket-filters .pill[onclick="setTicketFilter('${filter}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
    renderAdminTickets();
};

const TICKET_STATUS_MAP = {
    abierto:    { label: 'Entrante',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: 'info' },
    en_proceso: { label: 'En Proceso',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'clock' },
    resuelto:   { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'check-circle' },
    cerrado:    { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'lock' }
};

const TICKET_PRIORITY_MAP = {
    baja:    { label: '🟢 Baja',         color: '#10b981' },
    normal:  { label: '🟠 Normal',       color: '#f59e0b' },
    urgente: { label: '🔴 Urgente',    color: '#ef4444' }
};

function renderAdminTickets() {
    const tbody = document.getElementById('tickets-list');
    if (!tbody) return;
    
    const search = (document.getElementById('ticket-search')?.value || '').toLowerCase().trim();
    const filter = window._currentTicketFilter || 'all';
    const priorityFilter = document.getElementById('ticket-priority-filter')?.value || 'all';
    const moduleFilter = document.getElementById('ticket-module-filter')?.value || 'all';
    
    let list = appState.adminTickets || [];
    
    // Apply status filter
    if (filter !== 'all') {
        if (filter === 'finalizado') {
            list = list.filter(t => t.status === 'resuelto' || t.status === 'cerrado');
        } else {
            list = list.filter(t => t.status === filter);
        }
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
        list = list.filter(t => t.priority === priorityFilter);
    }

    // Apply module filter
    if (moduleFilter !== 'all') {
        list = list.filter(t => {
            const targetMod = appState.modules.find(m => String(m.id) === String(t.module) || String(m.name) === String(t.module));
            const moduleDisplayName = targetMod ? targetMod.name : (t.module || '');
            return moduleDisplayName === moduleFilter || String(t.module) === moduleFilter;
        });
    }
    
    // Apply search filter
    if (search) {
        list = list.filter(t => {
            const targetMod = appState.modules.find(m => String(m.id) === String(t.module) || String(m.name) === String(t.module));
            const moduleDisplayName = targetMod ? targetMod.name : (t.module || '—');
            return (t.business_name || '').toLowerCase().includes(search) ||
                   moduleDisplayName.toLowerCase().includes(search) ||
                   (t.id || '').toLowerCase().includes(search) ||
                   (t.description || '').toLowerCase().includes(search);
        });
    }
    
    // Update KPI counters
    updateTicketKPIs();
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--text-muted);">No se encontraron tickets.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map(t => {
        const st = TICKET_STATUS_MAP[t.status] || TICKET_STATUS_MAP['abierto'];
        const pr = TICKET_PRIORITY_MAP[t.priority] || TICKET_PRIORITY_MAP['normal'];
        
        let dateStr = '—';
        if (t.created_at) {
            const d = new Date(t.created_at);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            dateStr = `${day}/${month}/${year}`;
        }
        
        const desc = t.description ? (t.description.length > 40 ? t.description.substring(0, 40) + '…' : t.description) : '—';
        const targetMod = appState.modules.find(m => String(m.id) === String(t.module) || String(m.name) === String(t.module));
        const moduleDisplayName = targetMod ? targetMod.name : (t.module || '—');
        
        return `
            <tr>
                <td style="padding:1rem 1.5rem; white-space:nowrap;">
                    <a href="javascript:void(0)" onclick="viewTicketDetails('${t.id}')" style="font-size:0.78rem; font-weight:800; color:var(--primary); font-family:monospace; text-decoration:none; border-bottom:1px dashed var(--primary-alpha); padding-bottom:1px;" title="Ver detalles del ticket">
                        #${String(t.id || '').substring(0, 8).toUpperCase()}
                    </a>
                </td>
                <td style="padding:1rem 1.5rem; font-weight:600; color:var(--text-main);">${t.business_name || '—'}</td>
                <td style="padding:1rem 1.5rem; color:var(--text-muted);">${moduleDisplayName}</td>
                <td style="padding:1rem 1.5rem;">
                    <span style="font-size:0.78rem; font-weight:700; padding:3px 10px; border-radius:20px; background:${pr.color}18; color:${pr.color}; white-space:nowrap;">
                        ${pr.label}
                    </span>
                </td>
                <td style="padding:1rem 1.5rem; font-size:0.85rem; color:var(--text-muted); max-width:220px;" title="${(t.description || '').replace(/"/g, '&quot;')}"><span style="white-space:pre-wrap;word-break:break-word;">${desc}</span></td>
                <td style="padding:1rem 1.5rem; text-align:center;">
                    <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; font-weight:700; padding:4px 12px; border-radius:20px; background:${st.bg}; color:${st.color}; white-space:nowrap;">
                        <i data-lucide="${st.icon}" style="width:12px;height:12px;"></i> ${st.label}
                    </span>
                </td>
                <td style="padding:1rem 1.5rem; font-size:0.82rem; color:var(--text-muted);">${dateStr}</td>
                <td style="padding:1rem 1.5rem; text-align:center;">
                    <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center;">
                        <button class="btn-ghost delete-ticket-btn" style="padding:0.35rem 0.5rem; font-size:0.8rem; border:1px solid rgba(239,68,68,0.25); color:#ef4444; border-radius:8px; cursor:pointer; background:rgba(239,68,68,0.05); display:inline-flex; align-items:center; justify-content:center;"
                            onclick="deleteTicket('${t.id}')" title="Eliminar ticket permanentemente">
                            <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    lucide.createIcons();
    applyRolePermissions();
}

async function updateTicketStatus(ticketId, currentStatus) {
    const { value: newStatus } = await Swal.fire({
        title: 'Actualizar Estado de la Solicitud',
        html: `
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.2rem;">
                Selecciona el nuevo estado para la solicitud <b style="font-family:monospace;">#${String(ticketId).substring(0,8).toUpperCase()}</b>.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.6rem;">
                ${Object.entries(TICKET_STATUS_MAP).filter(([key]) => key !== 'resuelto').map(([key, val]) => `
                    <label style="display:flex;align-items:center;gap:12px;padding:0.8rem 1rem;border-radius:10px;border:2px solid ${key === currentStatus ? val.color : 'var(--border-color)'};cursor:pointer;background:${key === currentStatus ? val.bg : 'var(--bg-surface-light)'};transition:all .2s;">
                        <input type="radio" name="ticket-status-pick" value="${key}" ${key === currentStatus ? 'checked' : ''} style="accent-color:${val.color};">
                        <span style="font-weight:700;color:${val.color};">${val.label}</span>
                    </label>
                `).join('')}
            </div>`,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary)',
        preConfirm: () => {
            const selected = document.querySelector('input[name="ticket-status-pick"]:checked');
            if (!selected) { Swal.showValidationMessage('Selecciona un estado'); return false; }
            return selected.value;
        }
    });

    if (!newStatus || newStatus === currentStatus) return;

    try {
        const res = await adminFetch(`/api/admin/tickets/${ticketId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const ticket = appState.adminTickets.find(t => t.id === ticketId);
            if (ticket) ticket.status = newStatus;
            renderAdminTickets();
            updateTicketBadge();
            showToast(`Solicitud actualizada a: ${TICKET_STATUS_MAP[newStatus]?.label || newStatus}`, 'success');
        } else {
            showToast(data.error || 'Error al actualizar la solicitud', 'error');
        }
    } catch (err) {
        console.error('Error actualizando solicitud:', err);
        showToast('Error de conexión', 'error');
    }
}

window.toggleChatStatusDropdown = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('chat-status-dropdown-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    
    // Cerrar el de respuestas rápidas si está abierto
    const cannedMenu = document.getElementById('canned-responses-dropdown');
    if (cannedMenu) cannedMenu.style.display = 'none';
    
    menu.style.display = isVisible ? 'none' : 'block';
};

window.selectChatStatusOption = function(newStatus) {
    window._selectedChatStatus = newStatus;
    
    // Actualizar visual del botón dropdown
    const st = TICKET_STATUS_MAP[newStatus] || TICKET_STATUS_MAP['abierto'];
    const btn = document.getElementById('chat-status-dropdown-btn');
    const dot = document.getElementById('chat-status-dot');
    const txt = document.getElementById('chat-status-text');
    if (btn && dot && txt) {
        btn.style.color = st.color;
        dot.style.background = st.color;
        txt.textContent = st.label;
    }
    
    // Cambiar el texto del botón Confirmar y Cerrar
    const actionBtn = document.getElementById('chat-modal-action-btn');
    if (actionBtn) {
        if (window._selectedChatStatus !== window._originalChatStatus) {
            actionBtn.textContent = 'Confirmar y cerrar chat';
            actionBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else {
            actionBtn.textContent = 'Cerrar';
            actionBtn.style.background = 'linear-gradient(135deg, var(--primary), #818cf8)';
        }
    }
    
    // Ocultar menú
    const menu = document.getElementById('chat-status-dropdown-menu');
    if (menu) menu.style.display = 'none';
};

window.handleChatModalAction = async function(ticketId) {
    if (window._selectedChatStatus !== window._originalChatStatus) {
        const newStatus = window._selectedChatStatus;
        try {
            const res = await adminFetch(`/api/admin/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const ticket = appState.adminTickets.find(t => t.id === ticketId);
                if (ticket) ticket.status = newStatus;
                renderAdminTickets();
                updateTicketBadge();
                showToast(`Solicitud actualizada a: ${TICKET_STATUS_MAP[newStatus]?.label || newStatus}`, 'success');
            } else {
                showToast(data.error || 'Error al actualizar la solicitud', 'error');
            }
        } catch (err) {
            console.error('Error actualizando solicitud desde chat:', err);
            showToast('Error de conexión', 'error');
        }
    }
    Swal.close();
};

window.deleteTicket = async function(ticketId) {
    const ticket = appState.adminTickets.find(t => t.id === ticketId);
    const label = ticket ? `#${String(ticket.id).substring(0, 8).toUpperCase()} - ${ticket.business_name}` : `#${String(ticketId).substring(0, 8).toUpperCase()}`;

    const result = await Swal.fire({
        title: '¿Eliminar Solicitud?',
        html: `Vas a eliminar permanentemente la solicitud <strong style="color:#ef4444">${label}</strong>, su historial de chat e imágenes asociadas.<br><br><span style="color:#ef4444; font-size:0.85rem; font-weight:700;">Esta acción es irreversible.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar permanentemente',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-surface)',
        color: 'var(--text-main)'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await adminFetch(`/api/admin/tickets/${ticketId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            appState.adminTickets = appState.adminTickets.filter(t => t.id !== ticketId);
            renderAdminTickets();
            updateTicketBadge();
            
            // Recargar gráficos del dashboard para reflejar la eliminación
            initCharts();
            
            showToast('🗑️ Solicitud de soporte eliminada exitosamente.', 'success');
        } else {
            showToast(data.error || 'Error al eliminar la solicitud', 'error');
        }
    } catch (err) {
        console.error('Error al eliminar solicitud:', err);
        showToast('Error de conexión', 'error');
    }
};

window.clearAllTickets = async function() {
    const result = await Swal.fire({
        title: '¿Eliminar TODOS los tickets?',
        html: `Vas a eliminar permanentemente <strong style="color:#ef4444">TODOS</strong> los tickets de soporte del sistema y sus chats asociados.<br><br><span style="color:#ef4444; font-size:0.85rem; font-weight:700;">Esta acción es irreversible y afectará a todos los clientes.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, borrar todo permanentemente',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-surface)',
        color: 'var(--text-main)'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await adminFetch('/api/admin/tickets-clear-all', {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            appState.adminTickets = [];
            renderAdminTickets();
            updateTicketBadge();
            
            // Recargar gráficos del dashboard
            initCharts();
            
            showToast('🗑️ Todos los tickets de soporte han sido eliminados.', 'success');
        } else {
            showToast(data.error || 'Error al vaciar los tickets', 'error');
        }
    } catch (err) {
        console.error('Error al vaciar tickets:', err);
        showToast('Error de conexión', 'error');
    }
};

window.viewTicketDetails = function(ticketId) {
    const ticket = appState.adminTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    window.activeChatTicketId = ticketId;

    const st = TICKET_STATUS_MAP[ticket.status] || TICKET_STATUS_MAP['abierto'];
    const pr = TICKET_PRIORITY_MAP[ticket.priority] || TICKET_PRIORITY_MAP['normal'];
    const d = ticket.created_at ? new Date(ticket.created_at) : null;
    
    // FORMAT DATE WITH / TO PREVENT WRAPPING ON WINDOWS
    let fullDate = '—';
    if (d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        fullDate = `${day}/${month}/${year} ${timeStr}`;
    }

    Swal.fire({
        title: '',
        html: `
            <style>
            @keyframes typingBounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-4px); }
            }
            .typing-dot {
                width: 6px;
                height: 6px;
                background-color: var(--text-muted);
                border-radius: 50%;
                display: inline-block;
                animation: typingBounce 1.4s infinite ease-in-out both;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
            </style>
            <div style="font-family:'Outfit',sans-serif; color:var(--text-main);">

                <!-- Header pill -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#818cf8);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">
                            <i data-lucide="ticket" style="width:18px;height:18px;color:white;"></i>
                        </div>
                        <div style="text-align:left;">
                            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Solicitud de Soporte</div>
                            <div style="font-family:monospace;font-size:0.95rem;font-weight:900;color:var(--primary);">#${ticket.id.toUpperCase()}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span style="font-size:0.68rem;font-weight:700;padding:3px 9px;border-radius:20px;background:${pr.color}18;color:${pr.color};border:1px solid ${pr.color}33;white-space:nowrap;">${pr.label}</span>
                        <span id="chat-ticket-status-badge" style="font-size:0.68rem;font-weight:700;padding:3px 9px;border-radius:20px;background:${st.bg};color:${st.color};border:1px solid ${st.color}33;white-space:nowrap;">${st.label}</span>
                    </div>
                </div>

                <!-- Meta chips row -->
                <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:120px;background:var(--chat-meta-bg);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Negocio</div>
                        <div style="font-weight:700;font-size:0.84rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ticket.business_name || '—'}</div>
                    </div>
                    <div style="flex:1;min-width:120px;background:var(--chat-meta-bg);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Módulo</div>
                        <div style="font-weight:700;font-size:0.84rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(() => {
                            const found = appState.modules.find(m => String(m.id) === String(ticket.module) || String(m.name) === String(ticket.module));
                            return found ? found.name : (ticket.module || '—');
                        })()}</div>
                    </div>
                    <div style="flex:1;min-width:100px;background:var(--chat-meta-bg);border:1px solid var(--border-color);border-radius:10px;padding:8px 12px;text-align:left;">
                        <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:2px;">Creado</div>
                        <div style="font-weight:600;font-size:0.78rem;color:var(--text-main);">${fullDate}</div>
                    </div>
                </div>

                <!-- Chat area -->
                <div style="border:1px solid var(--border-color);border-radius:14px;overflow:hidden;background:var(--chat-outer-bg);">
                    <!-- Chat header bar -->
                    <div style="padding:8px 14px;background:var(--chat-header-bg);border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;"></div>
                            <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);">Conversación de la Solicitud</span>
                        </div>
                        <div style="display:flex;align-items:center;background:var(--chat-search-bg);border:1px solid var(--border-color);border-radius:8px;padding:4px 10px;width:140px;transition:all 0.2s;" onfocusin="this.style.width='200px';this.style.borderColor='var(--primary)';" onfocusout="this.style.width='140px';this.style.borderColor='var(--border-color)';">
                            <i data-lucide="search" style="width:14px;height:14px;color:var(--text-muted);margin-right:6px;"></i>
                            <input type="text" id="chat-search-input" placeholder="Buscar..." oninput="handleChatSearch(this.value)" style="border:none;background:none;color:var(--text-main);font-size:0.8rem;outline:none;width:100%;font-family:'Outfit',sans-serif;" />
                        </div>
                    </div>
                    <!-- Messages -->
                    <div id="ticket-chat-container" class="custom-scrollbar" style="height:320px;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:6px;scroll-behavior:smooth;">
                        <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:30px 0;color:var(--text-muted);font-size:0.82rem;">
                            <span style="display:inline-block;width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>
                            Cargando conversación...
                        </div>
                    </div>
                    <!-- Input area -->
                    ${ticket.status === 'cerrado' ? `
                        <div class="chat-closed-banner">
                            <i data-lucide="lock" style="width:14px;height:14px;"></i>
                            Solicitud cerrada — Abre una nueva para continuar
                        </div>
                    ` : `
                        <div style="padding:10px 12px;background:var(--chat-input-bar-bg);border-top:1px solid var(--border-color);display:flex;align-items:center;gap:8px;position:relative;">
                            <input type="file" id="chat-image-input" accept="image/*" style="display:none;" onchange="handleTicketImageSelect(event)" />
                            
                            <button onclick="document.getElementById('chat-image-input').click()" title="Enviar imagen" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border-color);background:var(--chat-button-bg);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;" onmouseover="this.style.background='rgba(99,102,241,0.15)';this.style.color='var(--primary)'" onmouseout="this.style.background='var(--chat-button-bg)';this.style.color='var(--text-muted)'">
                                <i data-lucide="image" style="width:15px;height:15px;"></i>
                            </button>

                            <!-- Canned responses ray button -->
                            <button onclick="toggleCannedResponsesDropdown(event)" title="Respuestas rápidas" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border-color);background:var(--chat-button-bg);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;position:relative;" onmouseover="this.style.background='rgba(99,102,241,0.15)';this.style.color='var(--primary)'" onmouseout="this.style.background='var(--chat-button-bg)';this.style.color='var(--text-muted)'">
                                <i data-lucide="zap" style="width:15px;height:15px;"></i>
                            </button>

                            <!-- Custom Canned Responses Dropdown Menu -->
                            <div id="canned-responses-dropdown" style="display:none; position:absolute; bottom:48px; left:52px; z-index:9999; background:var(--chat-canned-bg); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid var(--chat-canned-border); border-radius:12px; width:280px; box-shadow:0 10px 25px rgba(0,0,0,0.3); padding:8px 0; animation: slideUp 0.15s ease;">
                                <div style="padding:6px 12px; font-size:0.65rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; border-bottom:1px solid var(--chat-canned-border); margin-bottom:4px; text-align:left;">Respuestas Rápidas</div>
                                <a href="javascript:void(0)" onclick="selectCannedResponse('¡Hola! Claro que sí, estamos revisando tu caso en este momento y te daremos respuesta a la brevedad.')" style="display:block; padding:8px 12px; font-size:0.8rem; color:var(--text-main); text-decoration:none; text-align:left; transition:background 0.15s; border-bottom:1px solid var(--border-color);" onmouseover="this.style.background='var(--chat-option-hover)'" onmouseout="this.style.background='none'">🕒 Revisando caso...</a>
                                <a href="javascript:void(0)" onclick="selectCannedResponse('Hemos verificado y solucionado el inconveniente con tu módulo. Por favor pruébalo y confírmanos.')" style="display:block; padding:8px 12px; font-size:0.8rem; color:var(--text-main); text-decoration:none; text-align:left; transition:background 0.15s; border-bottom:1px solid var(--border-color);" onmouseover="this.style.background='var(--chat-option-hover)'" onmouseout="this.style.background='none'">✅ Solucionado</a>
                                <a href="javascript:void(0)" onclick="selectCannedResponse('Para procesar esta solicitud de facturación, requerimos que verifiques el estado de tu medio de pago registrado.')" style="display:block; padding:8px 12px; font-size:0.8rem; color:var(--text-main); text-decoration:none; text-align:left; transition:background 0.15s; border-bottom:1px solid var(--border-color);" onmouseover="this.style.background='var(--chat-option-hover)'" onmouseout="this.style.background='none'">💳 Facturación</a>
                                <a href="javascript:void(0)" onclick="selectCannedResponse('¿Nos podrías proporcionar más detalles o capturas de pantalla del error que estás experimentando?')" style="display:block; padding:8px 12px; font-size:0.8rem; color:var(--text-main); text-decoration:none; text-align:left; transition:background 0.15s;" onmouseover="this.style.background='var(--chat-option-hover)'" onmouseout="this.style.background='none'">📸 Solicitar captura</a>
                            </div>

                            <input type="text" id="chat-message-input" placeholder="Escribe un mensaje..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--chat-input-bg);color:var(--text-main);font-size:0.85rem;outline:none;font-family:'Outfit',sans-serif;" />
                            
                            <button id="chat-send-btn" onclick="sendTicketMessage('${ticket.id}','admin')" style="width:34px;height:34px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--primary),#818cf8);color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i data-lucide="send" style="width:14px;height:14px;"></i>
                            </button>
                        </div>
                    `}
                </div>

                <!-- Modal Footer Actions -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px; position:relative;">
                    <!-- Dropdown next to Cerrar -->
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Estado:</span>
                        <div style="position:relative; display:inline-block;">
                            <button id="chat-status-dropdown-btn" onclick="toggleChatStatusDropdown(event)" style="background:var(--chat-status-btn-bg); border:1px solid var(--border-color); color:${st.color}; font-size:0.8rem; padding:6px 14px; border-radius:8px; outline:none; cursor:pointer; font-family:'Outfit',sans-serif; font-weight:700; display:inline-flex; align-items:center; gap:6px; transition:all 0.15s;" onmouseover="this.style.background='var(--chat-status-btn-hover)';" onmouseout="this.style.background='var(--chat-status-btn-bg)';">
                                <span id="chat-status-dot" style="width:7px; height:7px; border-radius:50%; background:${st.color}; display:inline-block;"></span>
                                <span id="chat-status-text">${st.label}</span>
                                <i data-lucide="chevron-down" style="width:12px; height:12px; opacity:0.7;"></i>
                            </button>
                            
                            <!-- Custom Dropdown Menu -->
                            <div id="chat-status-dropdown-menu" style="display:none; position:absolute; bottom:42px; left:0; z-index:9999; background:var(--chat-canned-bg); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid var(--chat-canned-border); border-radius:10px; width:160px; box-shadow:0 8px 20px rgba(0,0,0,0.4); padding:6px 0; animation: slideUp 0.15s ease;">
                                ${Object.entries(TICKET_STATUS_MAP).filter(([key]) => key !== 'resuelto').map(([key, val]) => `
                                    <a href="javascript:void(0)" onclick="selectChatStatusOption('${key}')" style="display:flex; align-items:center; gap:8px; padding:8px 12px; font-size:0.8rem; color:var(--text-main); text-decoration:none; text-align:left; transition:background 0.15s; font-weight:700;" onmouseover="this.style.background='var(--chat-option-hover)'" onmouseout="this.style.background='none'">
                                        <span style="width:6px; height:6px; border-radius:50%; background:${val.color};"></span>
                                        <span style="color:${val.color};">${val.label}</span>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <!-- Cerrar / Confirmar button -->
                    <button id="chat-modal-action-btn" class="btn-primary" onclick="handleChatModalAction('${ticket.id}')" style="padding:8px 24px; font-size:0.85rem; border:none; border-radius:8px; cursor:pointer; font-weight:700; background:linear-gradient(135deg,var(--primary),#818cf8); color:white; transition: all 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                        Cerrar
                    </button>
                </div>

            </div>
        `,
        background: 'var(--bg-surface)',
        color: 'var(--text-main)',
        width: '680px',
        padding: '1.5rem',
        showConfirmButton: false,
        didOpen: () => {
            window._originalChatStatus = ticket.status;
            window._selectedChatStatus = ticket.status;
            
            lucide.createIcons();
            fetchAndRenderChatMessages(ticketId, 'admin');

            const input = document.getElementById('chat-message-input');
            if (input) {
                // typing indicator trigger
                let lastTypingSent = 0;
                input.addEventListener('input', function() {
                    const now = Date.now();
                    if (now - lastTypingSent > 1500) {
                        lastTypingSent = now;
                        adminFetch(`/api/tickets/${ticketId}/typing`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: 'admin' })
                        }).catch(err => console.error('Error sending typing signal:', err));
                    }
                });

                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        sendTicketMessage(ticketId, 'admin');
                    }
                });
                setTimeout(() => input.focus(), 100);
            }
        },
        willClose: () => {
            window.activeChatTicketId = null;
            window.clearChatImageSelect();
        }
    });
};

window.handleTicketImageSelect = function(event) {
    const fileInput = event.target;
    if (!fileInput.files || !fileInput.files[0]) return;
    
    window.selectedChatFile = fileInput.files[0];
    
    let bar = document.getElementById('chat-image-preview-bar');
    if (!bar) {
        const inputArea = fileInput.closest('div');
        bar = document.createElement('div');
        bar.id = 'chat-image-preview-bar';
        bar.style.cssText = 'padding:6px 12px;background:rgba(255,255,255,0.03);border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:0.78rem;color:var(--text-muted);';
        inputArea.parentNode.insertBefore(bar, inputArea);
    }
    
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        bar.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <img src="${e.target.result}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;border:1px solid var(--border-color);" />
                <span style="font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${window.selectedChatFile.name}</span>
                <span style="font-size:0.7rem;opacity:0.6;">(${(window.selectedChatFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button onclick="window.clearChatImageSelect()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;transition:background 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">
                ✕
            </button>
        `;
    };
    fileReader.readAsDataURL(window.selectedChatFile);
};

window.clearChatImageSelect = function() {
    window.selectedChatFile = null;
    const fileInput = document.getElementById('chat-image-input');
    if (fileInput) fileInput.value = '';
    const bar = document.getElementById('chat-image-preview-bar');
    if (bar) bar.remove();
};

window.uploadSelectedTicketImage = async function(ticketId, role) {
    if (!window.selectedChatFile) return;

    const file = window.selectedChatFile;
    const formData = new FormData();
    formData.append('image', file);

    const container = document.getElementById('ticket-chat-container');
    const uploadingId = 'uploading-indicator-' + Date.now();
    if (container) {
        const el = document.createElement('div');
        el.id = uploadingId;
        el.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:0.75rem;color:var(--text-muted);margin:4px 0;';
        el.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid var(--text-muted);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> Enviando imagen...';
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
    }

    try {
        const fetchUrl = `/api/tickets/${ticketId}/messages/image`;
        const res = await (role === 'admin' ? adminFetch(fetchUrl, {
            method: 'POST',
            body: formData
        }) : clientFetch(fetchUrl, {
            method: 'POST',
            body: formData
        }));

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error al subir imagen');
        }

        window.clearChatImageSelect();
    } catch (err) {
        console.error('Error al enviar imagen:', err);
        throw err;
    } finally {
        const el = document.getElementById(uploadingId);
        if (el) el.remove();
    }
};

window.fetchAndRenderChatMessages = async function(ticketId, role) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;

    try {
        const fetchUrl = `/api/tickets/${ticketId}/messages`;
        const res = await (role === 'admin' ? adminFetch(fetchUrl) : clientFetch(fetchUrl));
        if (!res.ok) throw new Error('Error al obtener mensajes');
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error al obtener mensajes');

        const messages = data.messages || [];

        // --- DETECCION DE NUEVOS MENSAJES Y NOTIFICACION CHIME ---
        const prevCount = window.chatMessageCounts?.[ticketId];
        if (prevCount !== undefined && messages.length > prevCount) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender !== role) {
                if (typeof window.playMessageChime === 'function') window.playMessageChime();
                if (typeof window.startTitleFlash === 'function') window.startTitleFlash();
            }
        }
        window.chatMessageCounts = window.chatMessageCounts || {};
        window.chatMessageCounts[ticketId] = messages.length;

        if (messages.length === 0) {
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.82rem;gap:8px;padding:20px;">
                    <span style="font-size:2rem;">💬</span>
                    <span>Aún no hay mensajes en este chat.</span>
                </div>
            `;
            return;
        }

        let lastSender = null;
        container.innerHTML = messages.map((msg, idx) => {
            const isMe = (role === 'admin' && msg.sender === 'admin') || (role === 'client' && msg.sender === 'client');
            const sameAsPrev = lastSender === msg.sender;
            lastSender = msg.sender;

            const d = new Date(msg.created_at);
            const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/am/i, 'a.m.').replace(/pm/i, 'p.m.');
            const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

            const prevMsg = messages[idx - 1];
            let dateSeparator = '';
            const fullDateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            if (idx === 0) {
                dateSeparator = `<div style="text-align:center;margin:6px 0 10px;"><span style="font-size:0.65rem;font-weight:700;color:var(--chat-date-text);background:var(--chat-date-bg);padding:3px 10px;border-radius:20px;">${fullDateStr}</span></div>`;
            } else {
                const prevDate = new Date(prevMsg.created_at);
                if (prevDate.toDateString() !== d.toDateString()) {
                    dateSeparator = `<div style="text-align:center;margin:8px 0 10px;"><span style="font-size:0.65rem;font-weight:700;color:var(--chat-date-text);background:var(--chat-date-bg);padding:3px 10px;border-radius:20px;">${fullDateStr}</span></div>`;
                }
            }

            const isAdminMsg = msg.sender === 'admin';
            const nameLabel = msg.sender_name || (isAdminMsg ? 'Soporte' : 'Cliente');
            // Parse "Name · Role" to style role differently
            const nameParts = nameLabel.split('·').map(s => s.trim());
            const displayName = nameParts[0];
            const displayRole = nameParts[1] || '';

            const nameRow = (!sameAsPrev || dateSeparator) ? `
                <span style="font-size:0.63rem;font-weight:700;display:block;margin-bottom:2px;padding:0 4px;${isMe ? 'text-align:right;' : ''}">
                    <span style="color:${isAdminMsg ? 'rgba(129,140,248,0.95)' : 'var(--text-muted)'};">${displayName}</span>${displayRole ? ` <span style="color:${isAdminMsg ? 'rgba(129,140,248,0.55)' : 'var(--text-muted)'};font-weight:600;font-size:0.58rem;text-transform:uppercase;letter-spacing:0.04em;">· ${displayRole}</span>` : ''}
                </span>
            ` : '';

            const contentHtml = msg.image_url
                ? `<img src="${msg.image_url}" alt="imagen" onload="const c = document.getElementById('ticket-chat-container'); if(c) c.scrollTop = c.scrollHeight;" onclick="openChatImageLightbox('${msg.image_url}')" style="max-width:200px;max-height:200px;border-radius:8px;cursor:zoom-in;object-fit:cover;display:block;" />`
                : `<span class="chat-message-text" style="white-space:pre-wrap;word-break:break-word;">${msg.message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;

            const bubbleStyle = isMe
                ? `background:linear-gradient(135deg,rgba(99,102,241,0.28),rgba(129,140,248,0.18));border:1px solid rgba(99,102,241,0.35);border-radius:14px 14px 4px 14px;`
                : `background:var(--chat-bubble-incoming);border:1px solid var(--border-color);border-radius:14px 14px 14px 4px;`;

            return `
                ${dateSeparator}
                <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};">
                    ${nameRow}
                    <div style="max-width:75%;${bubbleStyle}padding:8px 12px;font-size:0.85rem;line-height:1.4;color:var(--text-main);position:relative;">
                        ${contentHtml}
                        <span style="display:block;text-align:right;font-size:0.58rem;color:${isMe ? 'rgba(199,210,254,0.6)' : 'var(--text-muted)'};margin-top:4px;margin-bottom:-2px;">${timeStr}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll immediately, and schedule follow-ups to ensure it scrolls to bottom after DOM layout/animations settle
        container.scrollTop = container.scrollHeight;
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 30);
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 300);
    } catch (err) {
        console.error('Error cargando chat:', err);
        container.innerHTML = `
            <div style="text-align:center;color:#ef4444;font-size:0.82rem;padding:20px 10px;">
                Error al cargar la conversación.
            </div>
        `;
    }
};

window.sendTicketMessage = async function(ticketId, role) {
    if (window._isSendingTicketMessage) return;

    const input = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    const message = input ? input.value.trim() : '';
    const hasImage = !!window.selectedChatFile;
    
    if (!message && !hasImage) return;

    window._isSendingTicketMessage = true;
    if (sendBtn) sendBtn.disabled = true;

    try {
        if (hasImage) {
            await window.uploadSelectedTicketImage(ticketId, role);
        }
        
        if (message) {
            const fetchUrl = `/api/tickets/${ticketId}/messages`;
            const res = await (role === 'admin' ? adminFetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            }) : clientFetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            }));

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al enviar el mensaje');
            }
            if (input) input.value = '';
        }
        
        await fetchAndRenderChatMessages(ticketId, role);
    } catch (err) {
        console.error('Error al enviar mensaje:', err);
        showToast(err.message || 'Error de conexión', 'error');
    } finally {
        window._isSendingTicketMessage = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }
};

window.openChatImageLightbox = function(src) {
    const overlay = document.createElement('div');
    overlay.id = 'chat-image-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;cursor:zoom-out;opacity:0;transition:opacity 0.2s ease;';
    
    overlay.innerHTML = `
        <div style="position:relative;max-width:90%;max-height:90%;display:flex;align-items:center;justify-content:center;">
            <img src="${src}" style="max-width:100%;max-height:90vh;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);object-fit:contain;cursor:default;" onclick="event.stopPropagation()" />
            <button style="position:absolute;top:-40px;right:-4px;background:none;border:none;color:white;font-size:2rem;cursor:pointer;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
        </div>
    `;
    
    overlay.onclick = function() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.style.opacity = '1', 50);
};

window.exportExecutiveReportPDF = async function() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { showToast('Librería PDF no disponible. Recarga la página.', 'error'); return; }
        
        const period = await promptYearMonth('Exportar Reporte Ejecutivo');
        if (!period) return; // Cancelado
        const { year, month } = period;
        
        const logoSrc = appState.customLogo || (appState.config && appState.config.logo);
        const logoPng = await getLogoAsPng(logoSrc);
        
        const yearVal = String(year);
        const monthVal = String(month);
        
        let filteredBiz = appState.businesses || [];
        if (yearVal !== 'all' || monthVal !== 'all') {
            filteredBiz = filteredBiz.filter(biz => {
                if (!biz.created_at) return true; // Sin fecha → siempre incluir
                const d = new Date(biz.created_at);

                // Calcular el último instante del período seleccionado
                let periodEnd;
                if (yearVal !== 'all' && monthVal !== 'all') {
                    // Mes y año concreto → fin de ese mes
                    periodEnd = new Date(Number(yearVal), Number(monthVal) + 1, 0, 23, 59, 59);
                } else if (yearVal !== 'all') {
                    // Solo año → fin del 31 de diciembre de ese año
                    periodEnd = new Date(Number(yearVal), 11, 31, 23, 59, 59);
                } else {
                    // Solo mes sin año → incluir todos hasta hoy
                    periodEnd = new Date();
                }

                // Incluir negocios que existían al final del período
                return d <= periodEnd;
            });
        }
        
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        let periodStr = 'Histórico Completo';
        let filePeriod = 'Historico';
        if (yearVal !== 'all' && monthVal !== 'all') {
            periodStr = `${monthNames[Number(monthVal)]} de ${yearVal}`;
            filePeriod = `${yearVal}_${monthNames[Number(monthVal)]}`;
        } else if (yearVal !== 'all') {
            periodStr = `Año ${yearVal}`;
            filePeriod = `${yearVal}`;
        } else if (monthVal !== 'all') {
            periodStr = `Mes de ${monthNames[Number(monthVal)]} (Todos los años)`;
            filePeriod = `Mes_${monthNames[Number(monthVal)]}`;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración de márgenes e inicio de tabla
        const startY = 48;
        
        // Contenido Principal
        doc.setTextColor(30, 41, 59); // DARK (#1e293b)
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text('Resumen Ejecutivo del Ecosistema SaaS', 14, startY);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Período: ${periodStr}`, 14, startY + 5);
        doc.line(14, startY + 7, 196, startY + 7);
        
        // KPIs Financieros y Operacionales
        const activeBizCount = filteredBiz.filter(b => b.status === 'active').length;
        const totalBizCount = filteredBiz.length;
        const activeModsCount = appState.modules.filter(m => m.status === 'active').length;
        
        let totalIncome = 0;
        filteredBiz.forEach(biz => {
            if (biz.status !== 'active') return;
            
            let monthlyAmount = 0;
            if (biz.moduleInstances && biz.moduleInstances.length > 0) {
                biz.moduleInstances.forEach(inst => {
                    if (inst.status === 'active') {
                        monthlyAmount += parseFloat(inst.priceApplied) || 0;
                    }
                });
            } else {
                (biz.modules || []).forEach(mid => {
                    const mod = appState.modules.find(m => m.id === mid);
                    if (mod && mod.price) {
                        const price = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                        if (!isNaN(price)) monthlyAmount += price;
                    }
                });
            }
            totalIncome += monthlyAmount;
        });
        
        // Renderizar mini-tarjetas de KPI usando rectángulos con bordes redondeados
        const cardWidth = 56;
        const cardHeight = 22;
        const gap = 8;
        
        // Tarjeta 1: MRR
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, startY + 12, cardWidth, cardHeight, 3, 3, 'FD');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Text muted
        doc.text('MRR PROYECTADO', 18, startY + 18);
        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229); // INDIGO
        doc.text('$' + totalIncome.toLocaleString('es-CO') + ' COP', 18, startY + 28);
        
        // Tarjeta 2: Negocios
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14 + cardWidth + gap, startY + 12, cardWidth, cardHeight, 3, 3, 'FD');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('NEGOCIOS REGISTRADOS', 14 + cardWidth + gap + 4, startY + 18);
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129); // GREEN
        doc.text(activeBizCount + ' / ' + totalBizCount + ' Activos', 14 + cardWidth + gap + 4, startY + 28);
        
        // Tarjeta 3: Módulos
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14 + (cardWidth + gap) * 2, startY + 12, cardWidth, cardHeight, 3, 3, 'FD');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('MODULOS ACTIVOS', 14 + (cardWidth + gap) * 2 + 4, startY + 18);
        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241); // VIOLET
        doc.text(activeModsCount + ' Módulos', 14 + (cardWidth + gap) * 2 + 4, startY + 28);
        
        // Listado Detallado de Negocios
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Detalle de Negocios Registrados', 14, startY + 44);
        
        const headers = [['Nombre del Negocio', 'Ciudad', 'Tipo', 'Estado', 'Módulos Activos']];
        const body = filteredBiz.map(biz => {
            const modulesNames = (biz.modules || []).map(mid => {
                const m = appState.modules.find(x => String(x.id) === String(mid));
                return m ? m.name : mid;
            }).join(', ');
            return [
                biz.name || '—',
                biz.city || '—',
                bizTypeTranslations[biz.type] || biz.type || '—',
                biz.status === 'active' ? 'ACTIVO' : 'INACTIVO',
                modulesNames || 'Ninguno'
            ];
        });
        
        drawCustomTable(doc, headers, body, startY + 48, {
            colWidths: [45, 25, 30, 25, 57],
            cellPadding: 2.5
        });
        
        // Aplicar cabecera, monograma "AS" y pie de página dinámico a todas las páginas
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Header bar
            doc.setFillColor(30, 41, 59); // DARK
            doc.rect(0, 0, 210, 32, 'F');
            
            // Logo o Monograma Fallback
            if (logoPng) {
                try {
                    doc.addImage(logoPng, 'PNG', 14, 6, 20, 20);
                } catch (e) {
                    console.error("Error al insertar la imagen del logo en el PDF:", e);
                    drawFallbackMonogram(doc);
                }
            } else {
                drawFallbackMonogram(doc);
            }
            
            // Títulos del Header
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.text('SIERRA SYSTEMS', 42, 15);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text('REPORTE EJECUTIVO DE ADMINISTRACION SAAS', 42, 22);
            
            // Timestamp
            const today = new Date();
            const dateStr = today.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Emisión: ' + dateStr, 140, 19);
            
            // Footer
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('AS Sierra Systems - Registro Corporativo Ecosistema. Confidencial.', 14, 287);
            doc.text(`Página ${i} de ${pageCount}`, 180, 287);
        }
        
        doc.save(`Reporte_Ejecutivo_AS_Sierra_${filePeriod}.pdf`);
        showToast('📄 Reporte ejecutivo exportado con éxito.', 'success');
    } catch (err) {
        console.error('Error exportando PDF:', err);
        showToast('Error al exportar el reporte PDF.', 'error');
    }
};

// ==========================================
// TYPING INDICATOR & CANNED RESPONSES HELPERS
// ==========================================
window._typingIndicatorTimeout = null;
window.showChatTypingIndicator = function(text) {
    const container = document.getElementById('ticket-chat-container');
    if (!container) return;

    let indicator = document.getElementById('chat-typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'chat-typing-indicator';
        indicator.style.cssText = 'display:flex; align-items:center; gap:8px; padding:6px 12px; margin-top:4px; font-size:0.78rem; color:var(--text-muted); align-self:flex-start; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border-color); animation: fadeIn 0.2s ease;';
        indicator.innerHTML = `
            <span id="typing-indicator-text">${text}</span>
            <div style="display:flex; gap:3px; align-items:center;">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        container.appendChild(indicator);
    } else {
        const textEl = document.getElementById('typing-indicator-text');
        if (textEl) textEl.textContent = text;
    }
    
    container.scrollTop = container.scrollHeight;

    if (window._typingIndicatorTimeout) clearTimeout(window._typingIndicatorTimeout);
    window._typingIndicatorTimeout = setTimeout(() => {
        const ind = document.getElementById('chat-typing-indicator');
        if (ind) ind.remove();
        window._typingIndicatorTimeout = null;
    }, 3000);
};

window.toggleCannedResponsesDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('canned-responses-dropdown');
    if (dropdown) {
        const isHidden = dropdown.style.display === 'none' || dropdown.style.display === '';
        dropdown.style.display = isHidden ? 'block' : 'none';
    }
};

window.selectCannedResponse = function(text) {
    const input = document.getElementById('chat-message-input');
    if (input) {
        input.value = text;
        input.focus();
        
        // Trigger input event to send typing signal
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
    }
    const dropdown = document.getElementById('canned-responses-dropdown');
    if (dropdown) dropdown.style.display = 'none';
};

// Document click to close canned responses dropdown on outside click
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('canned-responses-dropdown');
    if (dropdown && dropdown.style.display === 'block') {
        if (!dropdown.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    }
    const statusDropdown = document.getElementById('chat-status-dropdown-menu');
    if (statusDropdown && statusDropdown.style.display === 'block') {
        const toggleBtn = document.getElementById('chat-status-dropdown-btn');
        if (!statusDropdown.contains(event.target) && (!toggleBtn || !toggleBtn.contains(event.target))) {
            statusDropdown.style.display = 'none';
        }
    }
});

// ==========================================
// SUPER ADMIN GLOBAL PAYMENTS LEDGER
// ==========================================
window.loadGlobalPaymentsHistory = async function() {
    const tbody = document.getElementById('global-payments-list');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;">
            <span style="display:inline-block;width:24px;height:24px;border:3px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>
            <span>Cargando transacciones globales...</span>
        </div>
    </td></tr>`;
    lucide.createIcons();

    try {
        const res = await adminFetch('/api/payments/history');
        if (!res.ok) throw new Error('Error al consultar historial.');
        const data = await res.json();

        appState.globalPayments = data.history || [];
        window._currentGlobalPaymentFilter = 'all';

        renderGlobalPaymentsHistory();
    } catch (err) {
        console.error('Error cargando historial de pagos global:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--danger);">Error al cargar las transacciones. (${err.message})</td></tr>`;
    }
};

window.renderGlobalPaymentsHistory = function() {
    const tbody = document.getElementById('global-payments-list');
    if (!tbody) return;

    const filter = window._currentGlobalPaymentFilter || 'all';
    const search = (document.getElementById('global-payment-search')?.value || '').toLowerCase().trim();

    let list = appState.globalPayments || [];

    // Filtrar por estado
    if (filter !== 'all') {
        list = list.filter(p => p.status === filter);
    }

    // Filtrar por búsqueda
    if (search) {
        list = list.filter(p => {
            let desc = p.desc || '';
            appState.modules.forEach(m => {
                if (desc.includes(m.name)) return;
                desc = desc.replace(new RegExp(m.id, 'gi'), m.name);
            });
            return (p.business_name || '').toLowerCase().includes(search) ||
                   desc.toLowerCase().includes(search) ||
                   (p.transaction_id || '').toLowerCase().includes(search);
        });
    }

    window._filteredGlobalPayments = list; // Guardar para exportación PDF

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;">
                <i data-lucide="inbox" style="width:32px;height:32px;opacity:0.4;"></i>
                <span>No se encontraron transacciones.</span>
            </div>
        </td></tr>`;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = list.map(ph => {
        const d = new Date(ph.created_at);
        const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        const amountStr = `$ ${Number(ph.amount).toLocaleString('es-CO')} COP`;

        // Sincronizar descripciones de módulos con nombres actualizados
        let desc = ph.desc || '—';
        appState.modules.forEach(m => {
            if (desc.includes(m.name)) return;
            desc = desc.replace(new RegExp(m.id, 'gi'), m.name);
        });

        // Determinar si es Adquisición (primera vez) o Renovación
        let conceptType = 'Adquisición / Renovación';
        if (ph.desc && ph.desc.includes('Adquisición / Renovación de Módulo — ')) {
            const mod = appState.modules.find(m => 
                ph.desc.toLowerCase().includes(m.id.toLowerCase()) || 
                ph.desc.toLowerCase().includes(m.name.toLowerCase())
            );
            
            if (mod) {
                const allPayments = appState.globalPayments || [];
                const businessPaymentsForMod = allPayments
                    .filter(p => 
                        String(p.business_id) === String(ph.business_id) && 
                        p.desc && 
                        (p.desc.toLowerCase().includes(mod.id.toLowerCase()) || p.desc.toLowerCase().includes(mod.name.toLowerCase())) &&
                        p.status === 'APPROVED'
                    )
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                
                if (businessPaymentsForMod.length > 0 && String(businessPaymentsForMod[0].id) === String(ph.id)) {
                    conceptType = 'Adquisición';
                } else {
                    conceptType = 'Renovación';
                }
            }
        }

        // Formatear descripción larga para que no sea tan extensa en la UI
        let displayDesc = desc;
        if (desc.includes('Adquisición / Renovación de Módulo — ')) {
            const clean = desc.replace('Adquisición / Renovación de Módulo — ', '');
            const match = clean.match(/(.*)\s*\((.*)\)/);
            if (match) {
                const moduleName = match[1].trim();
                const branchName = match[2].trim();
                if (branchName.toLowerCase() === 'sede principal') {
                    displayDesc = `${conceptType}<br><span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">${moduleName}</span>`;
                } else {
                    displayDesc = `${conceptType}<br><span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">${moduleName}</span> <span style="font-size:0.72rem;color:var(--text-muted);opacity:0.8;">(${branchName})</span>`;
                }
            } else {
                displayDesc = `${conceptType}<br><span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">${clean}</span>`;
            }
        }

        // Badge de estado premium
        const badgeBg = ph.status === 'APPROVED' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
        const badgeColor = ph.status === 'APPROVED' ? '#10b981' : '#ef4444';
        const badgeBorder = ph.status === 'APPROVED' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
        const badgeLabel = ph.status === 'APPROVED' ? 'Aprobado' : 'Declinado';

        const isReductionOrAdjustment = String(ph.desc || '').toLowerCase().includes('reducción') || String(ph.desc || '').toLowerCase().includes('ajuste');
        const method = isReductionOrAdjustment
            ? 'Ajuste'
            : (parseFloat(ph.amount) === 0 || String(ph.transaction_id || '').includes('gift') || String(ph.desc || '').toLowerCase().includes('cortesía') || String(ph.desc || '').toLowerCase().includes('obsequio'))
                ? 'Cortesía'
                : 'Tarjeta de Crédito';

        return `
            <tr style="border-bottom:1px solid var(--border-color); color:var(--text-main); font-weight:500;">
                <td style="padding:1rem 1.5rem; font-family:monospace; font-size:0.82rem;">${dateStr}</td>
                <td style="padding:1rem 1.5rem; font-weight:700; color:var(--text-main);">${ph.business_name || '—'}</td>
                <td style="padding:1rem 1.5rem; font-weight:500; line-height:1.3;">${displayDesc}</td>
                <td style="padding:1rem 1.5rem; font-weight:800; color:var(--text-main); text-align:center;">${amountStr}</td>
                <td style="padding:1rem 1.5rem; text-align:center;">
                    <span style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; font-weight:700; font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:12px; white-space:nowrap;">${badgeLabel}</span>
                </td>
                <td style="padding:1rem 1.5rem; text-align:center; font-size:0.8rem; color:var(--text-muted);">${method}</td>
                <td style="padding:1rem 1.5rem; text-align:center; font-family:monospace; font-size:0.78rem; color:var(--text-muted);">${ph.transaction_id || '—'}</td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
};

window.setGlobalPaymentFilter = function(filterType) {
    window._currentGlobalPaymentFilter = filterType;
    
    // Activar pill
    const pills = document.querySelectorAll('#global-payment-filters .pill');
    pills.forEach(p => {
        const action = p.getAttribute('onclick');
        if (action && action.includes(`'${filterType}'`)) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    renderGlobalPaymentsHistory();
};

window.downloadGlobalPaymentsPDF = async function() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { showToast('Librería PDF no disponible. Recarga la página.', 'error'); return; }
        
        const period = await promptYearMonth('Exportar Ledger de Pagos');
        if (!period) return; // Cancelado
        const { year, month } = period;
        
        const yearVal = String(year);
        const monthVal = String(month);
        
        const payments = window._filteredGlobalPayments || appState.globalPayments || [];
        
        let filteredPayments = payments;
        if (yearVal !== 'all' || monthVal !== 'all') {
            filteredPayments = filteredPayments.filter(ph => {
                const d = new Date(ph.created_at);
                const yearMatch = yearVal === 'all' || String(d.getFullYear()) === yearVal;
                const monthMatch = monthVal === 'all' || String(d.getMonth()) === monthVal;
                return yearMatch && monthMatch;
            });
        }
        
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        let periodStr = 'Histórico Completo';
        let filePeriod = 'Historico';
        if (yearVal !== 'all' && monthVal !== 'all') {
            periodStr = `${monthNames[Number(monthVal)]} de ${yearVal}`;
            filePeriod = `${yearVal}_${monthNames[Number(monthVal)]}`;
        } else if (yearVal !== 'all') {
            periodStr = `Año ${yearVal}`;
            filePeriod = `${yearVal}`;
        } else if (monthVal !== 'all') {
            periodStr = `Mes de ${monthNames[Number(monthVal)]} (Todos los años)`;
            filePeriod = `Mes_${monthNames[Number(monthVal)]}`;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header bar
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 32, 'F');

        // Logo o Monograma Fallback
        const logoSrc = appState.customLogo || (appState.config && appState.config.logo);
        const logoPng = await getLogoAsPng(logoSrc);
        if (logoPng) {
            try {
                doc.addImage(logoPng, 'PNG', 14, 6, 20, 20);
            } catch (e) {
                console.error("Error al insertar la imagen del logo en el PDF:", e);
                drawFallbackMonogram(doc);
            }
        } else {
            drawFallbackMonogram(doc);
        }

        // Títulos
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        doc.text('AS SIERRA SYSTEMS', 42, 15);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('HISTORIAL DE TRANSACCIONES - LEDGER GLOBAL', 42, 22);
        
        const today = new Date();
        const dateStr = today.toLocaleDateString('es-CO') + ' ' + today.toLocaleTimeString('es-CO');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Fecha: ' + dateStr, 140, 19);
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text('Ledger de Pagos del Ecosistema', 14, 48);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Período: ${periodStr}`, 14, 53);
        doc.line(14, 55, 196, 55);
        
        const headers = [['Fecha', 'Negocio', 'Concepto', 'Monto', 'Estado', 'Referencia TXN']];
        
        const body = filteredPayments.map(ph => {
            const d = new Date(ph.created_at);
            const dateVal = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            const amountVal = `$ ${Number(ph.amount).toLocaleString('es-CO')} COP`;
            
            // Sincronizar nombre de módulos en descripciones relacionales si aplica
            let desc = ph.desc || '—';
            appState.modules.forEach(m => {
                if (desc.includes(m.name)) return;
                desc = desc.replace(new RegExp(m.id, 'gi'), m.name);
            });

            // Determinar si es Adquisición (primera vez) o Renovación
            let conceptType = 'Adquisición / Renovación';
            if (ph.desc && ph.desc.includes('Adquisición / Renovación de Módulo — ')) {
                const mod = appState.modules.find(m => 
                    ph.desc.toLowerCase().includes(m.id.toLowerCase()) || 
                    ph.desc.toLowerCase().includes(m.name.toLowerCase())
                );
                
                if (mod) {
                    const allPayments = appState.globalPayments || [];
                    const businessPaymentsForMod = allPayments
                        .filter(p => 
                            String(p.business_id) === String(ph.business_id) && 
                            p.desc && 
                            (p.desc.toLowerCase().includes(mod.id.toLowerCase()) || p.desc.toLowerCase().includes(mod.name.toLowerCase())) &&
                            p.status === 'APPROVED'
                        )
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    
                    if (businessPaymentsForMod.length > 0 && String(businessPaymentsForMod[0].id) === String(ph.id)) {
                        conceptType = 'Adquisición';
                    } else {
                        conceptType = 'Renovación';
                    }
                }
            }

            // Formatear descripción en el PDF para evitar textos excesivamente largos
            if (desc.includes('Adquisición / Renovación de Módulo — ')) {
                const clean = desc.replace('Adquisición / Renovación de Módulo — ', '');
                const match = clean.match(/(.*)\s*\((.*)\)/);
                if (match) {
                    const moduleName = match[1].trim();
                    const branchName = match[2].trim();
                    if (branchName.toLowerCase() === 'sede principal') {
                        desc = `${conceptType}\n${moduleName}`;
                    } else {
                        desc = `${conceptType}\n${moduleName} (${branchName})`;
                    }
                } else {
                    desc = `${conceptType}\n${clean}`;
                }
            }

            return [
                dateVal,
                ph.business_name || '—',
                desc,
                amountVal,
                ph.status === 'APPROVED' ? 'APROBADO' : 'DECLINADO',
                ph.transaction_id || '—'
            ];
        });
        
        const finalY = drawCustomTable(doc, headers, body, 60, {
            colWidths: [20, 32, 29, 30, 24, 47],
            cellPadding: 2.5
        });
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('AS Sierra Systems - Registro Histórico inalterable de transacciones.', 14, finalY + 20);
        
        doc.save(`Ledger_Pagos_AS_Sierra_${filePeriod}.pdf`);
        showToast('📄 Ledger de pagos exportado con éxito.', 'success');
    } catch (err) {
        console.error('Error exportando PDF de pagos:', err);
        showToast('Error al exportar el reporte de pagos.', 'error');
    }
};

// ============================================================
// PDF: REPORTE GLOBAL DE FACTURACIÓN
// ============================================================
window.downloadGlobalBillingPDF = async function() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { showToast('Librería PDF no disponible. Recarga la página.', 'error'); return; }
        
        const period = await promptYearMonth('Exportar Reporte de Facturación');
        if (!period) return; // Cancelado
        const { year, month } = period;
        
        const logoSrc = appState.customLogo || (appState.config && appState.config.logo);
        const logoPng = await getLogoAsPng(logoSrc);
        
        const yearVal = String(year);
        const monthVal = String(month);
        
        const businesses = appState.businesses || [];
        const modules = appState.modules || [];
        const today = new Date();
        const dateStr = today.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        let filteredBiz = businesses.filter(biz => {
            return (biz.modules && biz.modules.length > 0) || (biz.moduleInstances && biz.moduleInstances.length > 0);
        });
        if (yearVal !== 'all' || monthVal !== 'all') {
            filteredBiz = filteredBiz.filter(biz => {
                const billing = biz.billing || {};
                const d = parseBillingDate(billing.next_billing_date);
                if (!d) return false;
                const yearMatch = yearVal === 'all' || String(d.getFullYear()) === yearVal;
                const monthMatch = monthVal === 'all' || String(d.getMonth()) === monthVal;
                return yearMatch && monthMatch;
            });
        }

        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        let periodStr = 'Histórico Completo';
        let filePeriod = 'Historico';
        if (yearVal !== 'all' && monthVal !== 'all') {
            periodStr = `${monthNames[Number(monthVal)]} de ${yearVal}`;
            filePeriod = `${yearVal}_${monthNames[Number(monthVal)]}`;
        } else if (yearVal !== 'all') {
            periodStr = `Año ${yearVal}`;
            filePeriod = `${yearVal}`;
        } else if (monthVal !== 'all') {
            periodStr = `Mes de ${monthNames[Number(monthVal)]} (Todos los años)`;
            filePeriod = `Mes_${monthNames[Number(monthVal)]}`;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Construir datos de tabla
        const headers = [['Negocio', 'Ciudad', 'Estado', 'Próx. Corte', 'Monto/Mes', 'Módulos']];
        const body = filteredBiz.map(biz => {
            const billing = biz.billing || {};
            const status = billing.subscription_status || 'pending';
            const statusLabels = { active: 'ACTIVO', suspended: 'SUSPENDIDO', pending: 'PENDIENTE', cancelled: 'CANCELADO' };

            let monthlyAmount = 0;
            if (biz.moduleInstances && biz.moduleInstances.length > 0) {
                biz.moduleInstances.forEach(inst => {
                    if (inst.status === 'active') {
                        monthlyAmount += parseFloat(inst.priceApplied) || 0;
                    }
                });
            } else {
                (biz.modules || []).forEach(modId => {
                    const mod = modules.find(m => m.id === modId);
                    if (mod?.price) {
                        const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                        if (!isNaN(p)) monthlyAmount += p;
                    }
                });
            }

            const nextCut = formatDateSlash(getClosestBillingDate(biz));

            const modNames = (biz.modules || []).map(mid => {
                const m = modules.find(x => String(x.id) === String(mid));
                return m ? m.name : mid;
            }).join(', ') || 'Ninguno';

            const activeSubsCount = biz.moduleInstances && biz.moduleInstances.length > 0
                ? biz.moduleInstances.filter(inst => inst.status === 'active').length
                : (biz.modules || []).length;

            return [
                biz.name || '—',
                biz.city || '—',
                activeSubsCount === 0 ? '—' : (statusLabels[status] || status.toUpperCase()),
                nextCut,
                monthlyAmount > 0 ? '$ ' + monthlyAmount.toLocaleString('es-CO') + ' COP' : '$0',
                modNames
            ];
        });

        // KPIs
        const activeCount = filteredBiz.filter(b => (b.billing?.subscription_status || '') === 'active').length;
        const suspendedCount = filteredBiz.filter(b => (b.billing?.subscription_status || '') === 'suspended').length;
        let totalRevenue = 0;
        filteredBiz.forEach(biz => {
            if ((biz.billing?.subscription_status || '') === 'active') {
                totalRevenue += biz.billing?.last_payment_amount || 0;
            }
        });

        drawCustomTable(doc, headers, body, 55, {
            colWidths: [38, 35, 20, 23, 32, 34],
            cellPadding: 2.5
        });

        // Apply headers and footers to all pages after drawing the table
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Header bar
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 32, 'F');

            // Logo o Monograma Fallback
            if (logoPng) {
                try {
                    doc.addImage(logoPng, 'PNG', 14, 6, 20, 20);
                } catch (e) {
                    console.error("Error al insertar la imagen del logo en el PDF:", e);
                    drawFallbackMonogram(doc);
                }
            } else {
                drawFallbackMonogram(doc);
            }

            // Títulos
            doc.setFontSize(15);
            doc.setTextColor(255, 255, 255);
            doc.text('SIERRA SYSTEMS', 42, 13);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text('REPORTE GLOBAL DE FACTURACIÓN Y SUSCRIPCIONES', 42, 19);
            doc.setFontSize(8.5);
            doc.text(`Período: ${periodStr}`, 42, 25);

            // Timestamp y KPIs en el encabezado
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Emisión: ' + dateStr, 135, 13);
            doc.text(`Activos: ${activeCount} | Suspendidos: ${suspendedCount}`, 135, 19);
            doc.text(`Ingresos: $${totalRevenue.toLocaleString('es-CO')} COP`, 135, 25);

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('AS Sierra Systems — Reporte de Facturación. Confidencial.', 14, 287);
            doc.text(`Página ${i} de ${pageCount}`, 180, 287);
        }

        doc.save(`Facturacion_AS_Sierra_${filePeriod}.pdf`);
        showToast('📄 Reporte de facturación exportado con éxito.', 'success');
    } catch (err) {
        console.error('Error exportando PDF de facturación:', err);
        showToast('Error al exportar el reporte de facturación.', 'error');
    }
};

// Helper to convert base64 SVG or custom logo to PNG base64 for jsPDF
async function getLogoAsPng(logoSrc) {
    if (!logoSrc) return null;
    if (logoSrc.startsWith('data:image/png') || logoSrc.startsWith('data:image/jpeg')) {
        return logoSrc;
    }
    if (logoSrc.startsWith('data:image/svg+xml')) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = 300;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, 300, 300);
                    ctx.drawImage(img, 0, 0, 300, 300);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    console.error("Error convirtiendo logo SVG a PNG para PDF:", e);
                    resolve(null);
                }
            };
            img.onerror = () => {
                console.error("Error al cargar la imagen SVG del logo para PDF");
                resolve(null);
            };
            img.src = logoSrc;
        });
    }
    return logoSrc;
}

// Helper to draw the default AS monogram in PDF
function drawFallbackMonogram(doc) {
    doc.setFillColor(99, 102, 241);
    doc.rect(14, 6, 20, 20, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('AS', 24, 19, { align: 'center' });
}

// Helper to format date with slashes (DD/MM/YYYY)
function formatDateSlash(dateStr) {
    const parsed = parseBillingDate(dateStr);
    return parsed 
        ? `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`
        : '—';
}

// ============================================================
// PDF: FICHA INDIVIDUAL DE NEGOCIO
// ============================================================
window.downloadIndividualBusinessPDF = async function(bizId) {
    const biz = (appState.businesses || []).find(b => String(b.id) === String(bizId));
    if (!biz) { showToast('No se encontró el negocio.', 'error'); return; }

    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { showToast('Librería PDF no disponible. Recarga la página.', 'error'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const today = new Date();
        const dateStr = today.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        const modules = appState.modules || [];

        // Módulos y sedes activas del negocio
        const activeInstances = [];
        let mrr = 0;
        if (biz.moduleInstances && biz.moduleInstances.length > 0) {
            biz.moduleInstances.forEach(inst => {
                if (inst.status === 'active') {
                    const price = parseFloat(inst.priceApplied) || 0;
                    mrr += price;
                    const mod = modules.find(m => String(m.id) === String(inst.moduleId));
                    const renewal = formatDateSlash(inst.renewalDate || biz.billing?.next_billing_date);
                    activeInstances.push({
                        name: mod ? mod.name : inst.moduleId,
                        branch: inst.branchName || inst.sedeName || 'Sede Principal',
                        renewal: renewal,
                        price: price
                    });
                }
            });
        } else {
            (biz.modules || []).forEach(mid => {
                const m = modules.find(x => String(x.id) === String(mid));
                let price = 0;
                if (m?.price) {
                    price = parseInt(String(m.price).replace(/\D/g, ''), 10);
                    if (isNaN(price)) price = 0;
                }
                mrr += price;
                const renewal = formatDateSlash(biz.billing?.next_billing_date);
                activeInstances.push({
                    name: m ? m.name : mid,
                    branch: 'Sede Principal',
                    renewal: renewal,
                    price: price
                });
            });
        }

        const billing = biz.billing || {};
        const activeSubsCount = biz.moduleInstances && biz.moduleInstances.length > 0
            ? biz.moduleInstances.filter(inst => inst.status === 'active').length
            : (biz.modules || []).length;
        const statusLabel = activeSubsCount === 0
            ? '—'
            : ({ active: 'ACTIVO', suspended: 'SUSPENDIDO', pending: 'PENDIENTE', cancelled: 'CANCELADO' }[billing.subscription_status || 'pending'] || '—');
        const nextCut = formatDateSlash(getClosestBillingDate(biz));

        const pageCount = 1;

        // Header bar
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 32, 'F');

        // Logo o Monograma Fallback
        const logoSrc = appState.customLogo || (appState.config && appState.config.logo);
        const logoPng = await getLogoAsPng(logoSrc);
        if (logoPng) {
            try {
                doc.addImage(logoPng, 'PNG', 14, 6, 20, 20);
            } catch (e) {
                console.error("Error al insertar la imagen del logo en el PDF:", e);
                drawFallbackMonogram(doc);
            }
        } else {
            drawFallbackMonogram(doc);
        }

        // Títulos
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        doc.text('SIERRA SYSTEMS', 42, 15);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('FICHA DE CLIENTE', 42, 22);

        // Timestamp
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Emisión: ' + dateStr, 140, 19);

        // Nombre del negocio — sección principal
        doc.setTextColor(30, 41, 59);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(biz.name || 'Sin nombre', 14, 48);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text((biz.category || 'Negocio') + ' · ' + (biz.city || 'Sin ciudad'), 14, 55);
        doc.line(14, 58, 196, 58);

        // Info del negocio en dos columnas
        const infoRows = [
            ['Email cliente', biz.clientEmail || '—'],
            ['Teléfono', biz.phone || '—'],
            ['Tipo', bizTypeTranslations[biz.type] || biz.type || '—'],
            ['Estado negocio', biz.status === 'active' ? 'Activo' : 'Inactivo'],
            ['Estado suscripción', statusLabel],
            ['Próximo corte', nextCut],
            ['MRR proyectado', mrr > 0 ? '$ ' + mrr.toLocaleString('es-CO') + ' COP' : '$0'],
            ['Tarjeta registrada', billing.card_brand ? billing.card_brand + ' ···' + (billing.last_four || '****') : 'Sin tarjeta'],
        ];

        let yStart = 65;
        doc.setFontSize(9);
        for (let i = 0; i < 4; i++) {
            const rowY = yStart + (i * 8);
            
            // Columna Izquierda (0 a 3)
            const [labelL, valueL] = infoRows[i];
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(labelL + ':', 14, rowY);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(String(valueL), 46, rowY);
            
            // Columna Derecha (4 a 7)
            const [labelR, valueR] = infoRows[i + 4];
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(labelR + ':', 110, rowY);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(String(valueR), 144, rowY);
        }
        let yPos = yStart + (4 * 8);

        // Módulos activos
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229);
        doc.text('Módulos / Sedes Contratadas', 14, yPos + 8);
        doc.line(14, yPos + 10, 196, yPos + 10);

        if (activeInstances.length === 0) {
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text('Sin módulos activos contratados.', 14, yPos + 18);
        } else {
            const bodyData = activeInstances.map(inst => [
                inst.name,
                inst.branch,
                inst.renewal,
                `$ ${inst.price.toLocaleString('es-CO')} COP`
            ]);
            const finalY = drawCustomTable(doc, [['Módulo', 'Sede', 'Fecha de Corte', 'Precio Mensual']], bodyData, yPos + 14, {
                colWidths: [60, 42, 40, 40],
                cellPadding: 2.5
            });
            // Draw custom footer row for summary
            doc.setFillColor(30, 41, 59); // Dark grey background
            doc.rect(14, finalY, 182, 10, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text('TOTAL MRR', 14 + 4, finalY + 6.5);
            doc.text('$ ' + mrr.toLocaleString('es-CO') + ' COP', 14 + 60 + 42 + 40 + 4, finalY + 6.5);
        }

        // Footer
        const finalPageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= finalPageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('AS Sierra Systems — Ficha de Cliente. Documento Confidencial.', 14, 287);
            doc.text(`Página ${i} de ${finalPageCount}`, 180, 287);
        }

        const safeName = (biz.name || 'negocio').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        doc.save(`Ficha_${safeName}_AS_Sierra_${today.toISOString().split('T')[0]}.pdf`);
        showToast(`📄 Ficha de ${biz.name} exportada con éxito.`, 'success');
    } catch (err) {
        console.error('Error exportando ficha de negocio:', err);
        showToast('Error al exportar la ficha del negocio.', 'error');
    }
};

window.loadPromotions = async function() {
    const tbody = document.getElementById('promotions-list');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;">
            <div class="spinner-modern"></div>
            <span>Cargando campañas de promociones...</span>
        </div>
    </td></tr>`;
    
    try {
        const res = await adminFetch('/api/admin/promotions');
        if (!res.ok) throw new Error('Error en el servidor al obtener las promociones.');
        const data = await res.json();
        appState.promotions = data.promotions || [];
        
        window._currentPromoFilter = 'all';
        renderPromotionsList();
        updatePromoKPIs();
    } catch (err) {
        console.error('Error cargando promociones:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--danger);font-weight:600;">Error al cargar las promociones: ${err.message}</td></tr>`;
    }
};

window.updatePromoKPIs = function() {
    const list = appState.promotions || [];
    const now = new Date();
    
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    
    list.forEach(p => {
        if (p.status !== 'active') {
            expired++;
        } else {
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            if (now < start) {
                scheduled++;
            } else if (now > end) {
                expired++;
            } else {
                active++;
            }
        }
    });
    
    const activeEl = document.getElementById('promo-kpi-active');
    if (activeEl) activeEl.textContent = active;
    
    const scheduledEl = document.getElementById('promo-kpi-scheduled');
    if (scheduledEl) scheduledEl.textContent = scheduled;
    
    const expiredEl = document.getElementById('promo-kpi-expired');
    if (expiredEl) expiredEl.textContent = expired;
};

window.renderPromotionsList = function() {
    const tbody = document.getElementById('promotions-list');
    if (!tbody) return;
    
    const filter = window._currentPromoFilter || 'all';
    const search = (document.getElementById('promo-search')?.value || '').toLowerCase().trim();
    const now = new Date();
    
    let list = appState.promotions || [];
    
    // Filtrar por pill
    if (filter !== 'all') {
        list = list.filter(p => {
            const status = p.status;
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            if (filter === 'active') {
                return status === 'active' && now >= start && now <= end;
            } else if (filter === 'scheduled') {
                return status === 'active' && now < start;
            } else if (filter === 'expired') {
                return status !== 'active' || now > end;
            }
            return true;
        });
    }
    
    // Filtrar por buscador
    if (search) {
        list = list.filter(p => {
            const mod = appState.modules.find(m => String(m.id) === String(p.moduleId));
            const modName = mod ? mod.name.toLowerCase() : p.moduleId.toLowerCase();
            return modName.includes(search);
        });
    }
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;">
                <i data-lucide="inbox" style="width:32px;height:32px;opacity:0.4;"></i>
                <span>No se encontraron campañas promocionales.</span>
            </div>
        </td></tr>`;
        lucide.createIcons();
        return;
    }
    
    tbody.innerHTML = list.map(p => {
        const mod = appState.modules.find(m => String(m.id) === String(p.moduleId));
        const modName = mod ? mod.name : p.moduleId;
        const modIcon = mod ? mod.icon : 'tag';
        
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        
        const dateStr = `${start.toLocaleDateString('es-CO')} → ${end.toLocaleDateString('es-CO')}`;
        
        // Tipo de descuento y valor formateado
        let valueStr = '';
        let typeStr = '';
        if (p.discountType === 'percentage') {
            typeStr = 'Porcentaje de Descuento';
            valueStr = `<span style="font-weight:800;color:#ef4444;font-size:1.05rem;">-${parseInt(p.discountValue)}%</span>`;
        } else {
            typeStr = 'Precio Fijo Promocional';
            valueStr = `<span style="font-weight:800;color:#10b981;font-size:1.05rem;">$ ${parseInt(p.discountValue).toLocaleString('es-CO')}</span>`;
        }
        
        // Determinar estado actual
        let badgeBg = '';
        let badgeColor = '';
        let badgeBorder = '';
        let badgeLabel = '';
        
        if (p.status !== 'active') {
            badgeBg = 'rgba(100,116,139,0.12)';
            badgeColor = '#64748b';
            badgeBorder = 'rgba(100,116,139,0.25)';
            badgeLabel = 'Pausada';
        } else if (now < start) {
            badgeBg = 'rgba(59,130,246,0.12)';
            badgeColor = '#3b82f6';
            badgeBorder = 'rgba(59,130,246,0.25)';
            badgeLabel = 'Programada';
        } else if (now > end) {
            badgeBg = 'rgba(245,158,11,0.12)';
            badgeColor = '#f59e0b';
            badgeBorder = 'rgba(245,158,11,0.25)';
            badgeLabel = 'Expirada';
        } else {
            badgeBg = 'rgba(16,185,129,0.12)';
            badgeColor = '#10b981';
            badgeBorder = 'rgba(16,185,129,0.25)';
            badgeLabel = 'Activa';
        }
        
        const isExpired = now > end;
        let toggleIcon = 'play';
        let toggleTitle = 'Reactivar Campaña';
        let toggleColor = '#10b981';
        let toggleDisabled = '';

        if (isExpired) {
            toggleIcon = 'play';
            toggleTitle = 'Campaña Expirada (edita las fechas para reactivar)';
            toggleColor = 'var(--text-muted)';
            toggleDisabled = 'disabled style="opacity: 0.5; cursor: not-allowed;"';
        } else if (p.status === 'active') {
            toggleIcon = 'pause';
            toggleTitle = 'Pausar Campaña';
            toggleColor = '#f59e0b';
        } else {
            toggleIcon = 'play';
            toggleTitle = 'Reactivar Campaña';
            toggleColor = '#10b981';
        }
        
        return `
            <tr style="border-bottom:1px solid var(--border-color); color:var(--text-main); font-weight:500;">
                <td style="padding:1.25rem 1.5rem;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;background:rgba(99,102,241,0.12);color:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                            <i data-lucide="${modIcon}" style="width:18px;height:18px;"></i>
                        </div>
                        <span style="font-weight:700;">${modName}</span>
                    </div>
                </td>
                <td style="padding:1.25rem 1.5rem;color:var(--text-muted);font-size:0.9rem;">${typeStr}</td>
                <td style="padding:1.25rem 1.5rem;text-align:center;">${valueStr}</td>
                <td style="padding:1.25rem 1.5rem;text-align:center;font-size:0.88rem;color:var(--text-muted);">${dateStr}</td>
                <td style="padding:1.25rem 1.5rem;text-align:center;">
                    <span style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; font-weight:700; font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:12px; white-space:nowrap;">${badgeLabel}</span>
                </td>
                <td style="padding:1.25rem 1.5rem;text-align:center;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
                        <button class="btn-ghost" onclick="openPromoFormModal('${p.id}')" style="padding:6px;min-width:32px;height:32px;" title="Editar Campaña">
                            <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
                        </button>
                        <button class="btn-ghost" ${toggleDisabled} onclick="togglePromoStatus('${p.id}', '${p.status}')" style="padding:6px;min-width:32px;height:32px;color:${toggleColor};" title="${toggleTitle}">
                            <i data-lucide="${toggleIcon}" style="width:14px;height:14px;"></i>
                        </button>
                        <button class="btn-ghost" onclick="deletePromo('${p.id}')" style="padding:6px;min-width:32px;height:32px;color:#ef4444;" title="Eliminar Campaña">
                            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
};

window.setPromoFilter = function(filter) {
    window._currentPromoFilter = filter;
    
    // Activar pill
    const pills = document.querySelectorAll('#promo-filters .pill');
    pills.forEach(p => {
        const action = p.getAttribute('onclick');
        if (action && action.includes(`'${filter}'`)) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });
    
    renderPromotionsList();
};

window.togglePromoStatus = function(id, currentStatus) {
    requestSecurityCheck(async () => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const res = await adminFetch('/api/admin/promotions/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            
            if (res.ok) {
                showToast(`Campaña ${newStatus === 'active' ? 'reactivada' : 'pausada'} con éxito.`);
                loadPromotions();
            } else {
                showToast('Error al modificar el estado de la campaña.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error de red al actualizar estado.', 'error');
        }
    });
};

window.deletePromo = function(id) {
    requestSecurityCheck(async () => {
        Swal.fire({
            title: '¿Está seguro?',
            text: "Esta acción eliminará la promoción permanentemente y restaurará el precio original del módulo en el Marketplace.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await adminFetch(`/api/admin/promotions/${id}`, {
                        method: 'DELETE'
                    });
                    
                    if (res.ok) {
                        showToast('Campaña eliminada permanentemente.');
                        loadPromotions();
                    } else {
                        showToast('Error al eliminar la campaña del servidor.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error de conexión.', 'error');
                }
            }
        });
    });
};

window.openPromoFormModal = function(id = '') {
    const isEdit = !!id;
    const promo = isEdit ? appState.promotions.find(p => p.id === id) : null;
    
    // Generar opciones de módulos activos
    const activeModules = appState.modules.filter(m => m.status === 'active');
    if (activeModules.length === 0) {
        showToast('No hay módulos activos en el sistema para asociar promociones.', 'warning');
        return;
    }
    
    const optionsHtml = activeModules.map(m => `
        <option value="${m.id}" ${promo && promo.moduleId === m.id ? 'selected' : ''}>${m.name} (${m.price})</option>
    `).join('');
    
    const defaultStart = promo ? promo.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const defaultEnd = promo ? promo.endDate.split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const valValue = promo ? promo.discountValue : '';
    
    Swal.fire({
        title: isEdit ? 'Editar Campaña Promocional' : 'Nueva Campaña Promocional',
        html: `
            <div style="text-align:left;font-family:'Outfit',sans-serif;color:var(--text-main);display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="font-weight:700;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;">Módulo Relacionado</label>
                    <select id="swal-promo-module" class="swal2-input" style="width:100%;margin:4px 0 0;height:44px;font-size:0.9rem;border-radius:8px;border:1px solid var(--border-color);padding:0 10px;">
                        ${optionsHtml}
                    </select>
                </div>
                
                <div>
                    <label style="font-weight:700;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;">Tipo de Oferta</label>
                    <select id="swal-promo-type" class="swal2-input" style="width:100%;margin:4px 0 0;height:44px;font-size:0.9rem;border-radius:8px;border:1px solid var(--border-color);padding:0 10px;">
                        <option value="percentage" ${promo && promo.discountType === 'percentage' ? 'selected' : ''}>Porcentaje de Descuento (ej: -20%)</option>
                        <option value="fixed_price" ${promo && promo.discountType === 'fixed_price' ? 'selected' : ''}>Precio Fijo Promocional (ej: $ 80.000)</option>
                    </select>
                </div>
                
                <div>
                    <label style="font-weight:700;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;">Valor del Descuento / Precio</label>
                    <input id="swal-promo-value" class="swal2-input" type="number" placeholder="Ej: 20 para porcentaje o 80000 para precio fijo" value="${valValue}" style="width:100%;margin:4px 0 0;height:44px;font-size:0.9rem;border-radius:8px;border:1px solid var(--border-color);padding:0 10px;">
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="font-weight:700;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;">Fecha de Inicio</label>
                        <input id="swal-promo-start" class="swal2-input" type="date" value="${defaultStart}" style="width:100%;margin:4px 0 0;height:44px;font-size:0.9rem;border-radius:8px;border:1px solid var(--border-color);padding:0 10px;">
                    </div>
                    <div>
                        <label style="font-weight:700;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;">Fecha de Vencimiento</label>
                        <input id="swal-promo-end" class="swal2-input" type="date" value="${defaultEnd}" style="width:100%;margin:4px 0 0;height:44px;font-size:0.9rem;border-radius:8px;border:1px solid var(--border-color);padding:0 10px;">
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: isEdit ? 'Guardar Cambios' : 'Lanzar Campaña',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#64748b',
        didOpen: (popup) => {
            const valInput = popup.querySelector('#swal-promo-value');
            if (valInput) {
                valInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        Swal.clickConfirm();
                    }
                });
            }
            // Upgrade selects to premium custom dropdowns
            window.makeSwalSelect('swal-promo-module');
            window.makeSwalSelect('swal-promo-type');
        },
        preConfirm: () => {
            const moduleId = document.getElementById('swal-promo-module').value;
            const discountType = document.getElementById('swal-promo-type').value;
            const discountValue = parseFloat(document.getElementById('swal-promo-value').value);
            const startDate = document.getElementById('swal-promo-start').value;
            const endDate = document.getElementById('swal-promo-end').value;
            
            if (!moduleId || !discountType || isNaN(discountValue) || discountValue <= 0 || !startDate || !endDate) {
                Swal.showValidationMessage('Por favor rellene todos los campos con valores válidos y positivos.');
                return false;
            }
            
            if (startDate > endDate) {
                Swal.showValidationMessage('La fecha de inicio no puede ser posterior a la fecha de vencimiento.');
                return false;
            }
            
            return { moduleId, discountType, discountValue, startDate, endDate };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            requestSecurityCheck(async () => {
                const { moduleId, discountType, discountValue, startDate, endDate } = result.value;
                const body = { moduleId, discountType, discountValue, startDate, endDate };
                
                try {
                    const url = isEdit ? `/api/admin/promotions/${id}` : '/api/admin/promotions/new';
                    const method = isEdit ? 'PUT' : 'POST';
                    
                    const res = await adminFetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    
                    if (res.ok) {
                        showToast(isEdit ? 'Campaña actualizada con éxito.' : 'Nueva campaña promocional lanzada.');
                        loadPromotions();
                    } else {
                        const errData = await res.json();
                        showToast(errData.error || 'Error al procesar la campaña en el servidor.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error de red.', 'error');
                }
            });
        }
    });
};

// --- GLOBAL KEYBOARD NAVIGATION (ENTER & ESCAPE) ---
document.addEventListener('keydown', (e) => {
    // 1. Escape key handling
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (activeModal) {
            e.preventDefault();
            const cancelBtn = activeModal.querySelector('#business-modal-cancel, #user-modal-cancel, #module-modal-cancel, #security-modal-cancel, #delete-modal-cancel, .modal-close');
            if (cancelBtn) {
                cancelBtn.click();
            } else {
                activeModal.classList.add('hidden');
            }
        }
    }
    
    // 2. Enter key handling for inputs inside modals & SweetAlert2 custom inputs
    if (e.key === 'Enter') {
        // Handle SweetAlert2 if visible
        if (typeof Swal !== 'undefined' && Swal.isVisible()) {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
                if (activeEl.closest('.swal2-container')) {
                    e.preventDefault();
                    Swal.clickConfirm();
                }
            }
            return;
        }

        // Handle Custom HTML Modals
        const activeModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (activeModal) {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
                if (activeEl.closest('.modal-overlay:not(.hidden)')) {
                    const saveBtn = activeModal.querySelector('#business-modal-save, .btn-save-modern, #module-modal-save, #security-modal-save, #delete-modal-confirm, .btn-primary, .btn-danger, #security-confirm-btn');
                    if (saveBtn) {
                        e.preventDefault();
                        saveBtn.click();
                    }
                }
            }
        }
    }
});

async function openMarketplaceSettingsModal() {
    requestSecurityCheck(async () => {
        const currentPass = document.getElementById('security-pass-input').value;
        const config = appState.config || {};
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#8b5cf6';
        
        // Generar las opciones del selector de módulos activos
        const activeModules = appState.modules.filter(m => m.status === 'active');
        const moduleOptions = [
            `<option value="">-- Ninguno --</option>`,
            ...activeModules.map(m => `<option value="${m.id}" ${String(m.id) === String(config.recommendedModuleId) ? 'selected' : ''}>${m.name}</option>`)
        ].join('');

        const result = await Swal.fire({
            title: 'Ajustes de Marketplace',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column;">
                    <!-- Tab Bar -->
                    <div class="swal-tab-container" style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 1.25rem;">
                        <button type="button" id="swal-tab-market" class="swal-tab-btn active" style="flex: 1; padding: 8px 12px; border: none; background: transparent; color: var(--text-main); font-weight: 700; font-size: 0.88rem; cursor: pointer; border-radius: 8px; transition: all 0.2s; border-bottom: 3px solid ${primaryColor}; outline: none;">
                            🛒 Tienda
                        </button>
                        <button type="button" id="swal-tab-demo" class="swal-tab-btn" style="flex: 1; padding: 8px 12px; border: none; background: transparent; color: var(--text-muted); font-weight: 500; font-size: 0.88rem; cursor: pointer; border-radius: 8px; transition: all 0.2s; border-bottom: 3px solid transparent; outline: none;">
                            👤 Usuario Demo
                        </button>
                    </div>

                    <!-- Pane 1: Marketplace / Tienda -->
                    <div id="swal-pane-market" style="display: flex; flex-direction: column; gap: 1.25rem;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">⭐ Módulo Recomendado</label>
                            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">Módulo destacado con badge especial en la tienda del cliente.</p>
                            <select id="swal-rec-module" class="swal2-input" style="width: 100%; margin: 0; background: var(--bg-surface-light); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; height: 45px; font-family: inherit; font-size: 0.9rem;">
                                ${moduleOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">🏷️ Etiqueta de Recomendación</label>
                            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">Texto del badge destacado (ej. RECOMENDADO, MÁS COMPRADO, OFERTA).</p>
                            <input type="text" id="swal-rec-label" class="swal2-input" placeholder="RECOMENDADO" value="${config.recommendedLabel || 'RECOMENDADO'}" style="width: 100%; margin: 0; background: var(--bg-surface-light); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; height: 45px; font-family: inherit; font-size: 0.9rem; padding: 0 0.75rem; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">🏢 Descuento Segundas Sedes (%)</label>
                            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">Porcentaje de descuento permanente al adquirir el mismo módulo para una sucursal adicional.</p>
                            <input type="number" id="swal-multi-discount" class="swal2-input" min="0" max="100" placeholder="30" value="${config.multiSedeDiscount !== undefined ? config.multiSedeDiscount : 30}" style="width: 100%; margin: 0; background: var(--bg-surface-light); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; height: 45px; font-family: inherit; font-size: 0.9rem; padding: 0 0.75rem; box-sizing: border-box;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 0.25rem;">
                            <input type="checkbox" id="swal-sync-existing" style="width: 18px; height: 18px; cursor: pointer; accent-color: ${primaryColor};">
                            <label for="swal-sync-existing" style="font-size: 0.85rem; color: var(--text-main); cursor: pointer; font-weight: 500;">Actualizar precios de sedes secundarias existentes</label>
                        </div>
                    </div>

                    <!-- Pane 2: Demo User Config -->
                    <div id="swal-pane-demo" style="display: none; flex-direction: column; gap: 1.25rem;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">👤 Usuario del Demo</label>
                            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">Nombre de usuario que se mostrará y usará para ingresar a las demostraciones.</p>
                            <input type="text" id="swal-demo-user" class="swal2-input" placeholder="admin" value="${config.demoUser || 'admin'}" style="width: 100%; margin: 0; background: var(--bg-surface-light); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; height: 45px; font-family: inherit; font-size: 0.9rem; padding: 0 0.75rem; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">🔑 Clave del Demo</label>
                            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">Contraseña asociada para ingresar a las demostraciones.</p>
                            <input type="text" id="swal-demo-pass" class="swal2-input" placeholder="123456" value="${config.demoPass || '123456'}" style="width: 100%; margin: 0; background: var(--bg-surface-light); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; height: 45px; font-family: inherit; font-size: 0.9rem; padding: 0 0.75rem; box-sizing: border-box;">
                        </div>
                    </div>
                </div>
            `,
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
            confirmButtonColor: primaryColor,
            confirmButtonText: 'Guardar Ajustes',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            didOpen: (popup) => {
                const inputs = popup.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            Swal.clickConfirm();
                        }
                    });
                });

                // Upgrade selects to premium custom dropdowns
                window.makeSwalSelect('swal-rec-module');

                // Tab switching logic
                const tabMarket = popup.querySelector('#swal-tab-market');
                const tabDemo = popup.querySelector('#swal-tab-demo');
                const paneMarket = popup.querySelector('#swal-pane-market');
                const paneDemo = popup.querySelector('#swal-pane-demo');

                tabMarket.addEventListener('click', () => {
                    tabMarket.style.borderBottom = `3px solid ${primaryColor}`;
                    tabMarket.style.color = 'var(--text-main)';
                    tabMarket.style.fontWeight = '700';

                    tabDemo.style.borderBottom = '3px solid transparent';
                    tabDemo.style.color = 'var(--text-muted)';
                    tabDemo.style.fontWeight = '500';

                    paneMarket.style.display = 'flex';
                    paneDemo.style.display = 'none';
                });

                tabDemo.addEventListener('click', () => {
                    tabDemo.style.borderBottom = `3px solid ${primaryColor}`;
                    tabDemo.style.color = 'var(--text-main)';
                    tabDemo.style.fontWeight = '700';

                    tabMarket.style.borderBottom = '3px solid transparent';
                    tabMarket.style.color = 'var(--text-muted)';
                    tabMarket.style.fontWeight = '500';

                    paneMarket.style.display = 'none';
                    paneDemo.style.display = 'flex';
                });
            },
            preConfirm: () => {
                const recommendedModuleId = document.getElementById('swal-rec-module').value;
                const recommendedLabel = document.getElementById('swal-rec-label').value.trim();
                const multiSedeDiscountRaw = document.getElementById('swal-multi-discount').value;
                const multiSedeDiscount = parseInt(multiSedeDiscountRaw, 10);
                const syncExisting = document.getElementById('swal-sync-existing').checked;
                const demoUser = document.getElementById('swal-demo-user').value.trim();
                const demoPass = document.getElementById('swal-demo-pass').value.trim();

                if (isNaN(multiSedeDiscount) || multiSedeDiscount < 0 || multiSedeDiscount > 100) {
                    Swal.showValidationMessage('El descuento debe ser un número entre 0 y 100');
                    return false;
                }
                if (!demoUser) {
                    Swal.showValidationMessage('El usuario del demo no puede estar vacío');
                    return false;
                }
                if (!demoPass) {
                    Swal.showValidationMessage('La clave del demo no puede estar vacía');
                    return false;
                }

                return {
                    recommendedModuleId: recommendedModuleId || '',
                    recommendedLabel: recommendedLabel || 'RECOMENDADO',
                    multiSedeDiscount,
                    syncExisting,
                    demoUser,
                    demoPass,
                    currentPass
                };
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await adminFetch('/api/settings/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });
                
                if (res.ok) {
                    showToast('Ajustes de Marketplace actualizados.');
                    loadData();
                } else {
                    const errData = await res.json();
                    showToast(errData.error || 'Error al guardar los ajustes.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error de red al guardar ajustes.', 'error');
            }
        }
    });
}

// ============================================================
// DISPOSITIVOS ACTIVOS INLINE — PANEL ADMIN CONFIGURACIÓN
// ============================================================
window.refreshAdminDevicesInline = async function() {
    let sessions = [];
    try {
        const res = await adminFetch('/api/admin/active-sessions');
        if (res.ok) {
            const data = await res.json();
            sessions = data.sessions || [];
        }
    } catch (e) { /* silenciar error de red */ }

    const deviceIcon = (type) => {
        if (type === 'mobile') return 'smartphone';
        if (type === 'tablet') return 'tablet';
        return 'monitor';
    };

    const relTime = (isoStr) => {
        if (!isoStr) return 'Ahora';
        const diff = Date.now() - new Date(isoStr).getTime();
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);
        if (mins < 1) return 'Hace unos segundos';
        if (mins < 60) return `Hace ${mins} min`;
        if (hrs < 24) return `Hace ${hrs}h`;
        return new Date(isoStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const sessionCount = sessions.length;
    const sessionListHtml = sessionCount === 0
        ? `<p style="color:var(--text-muted);text-align:center;padding:2rem 0;font-size:0.875rem;">
               <i data-lucide="wifi-off" style="width:24px;height:24px;display:block;margin:0 auto 0.5rem;opacity:0.4;"></i>
               Sin sesiones de panel activas
           </p>`
        : sessions.map((s, idx) => `
            <div style="display:flex;align-items:center;gap:0.9rem;padding:0.85rem 0;${idx < sessionCount - 1 ? 'border-bottom:1px solid rgba(var(--border-color-rgb,148,163,184),0.15);' : ''}">
                <div style="flex-shrink:0;width:42px;height:42px;border-radius:10px;background:rgba(99,102,241,0.08);display:flex;align-items:center;justify-content:center;">
                    <i data-lucide="${deviceIcon(s.deviceType)}" style="width:20px;height:20px;color:#6366f1;"></i>
                </div>
                <div style="flex:1;min-width:0;text-align:left;">
                    <div style="font-size:0.875rem;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.browser}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${s.os} &nbsp;·&nbsp; IP: <code style="font-size:0.78rem;background:rgba(0,0,0,0.15);padding:1px 5px;border-radius:4px;">${s.ip}</code></div>
                </div>
                <div style="flex-shrink:0;text-align:right;">
                    <span style="font-size:0.75rem;color:var(--text-muted);display:block;">${relTime(s.connectedAt)}</span>
                    <span style="display:inline-flex;align-items:center;gap:3px;font-size:0.7rem;font-weight:600;color:#10b981;margin-top:3px;">
                        <span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span> Activa
                    </span>
                </div>
            </div>`).join('');

    const container = document.getElementById('admin-devices-container-inline');
    if (container) {
        container.innerHTML = `
            <div style="width:100%;padding:0 0.25rem;">
                <div style="display:flex;align-items:center;gap:0.65rem;margin-bottom:1.25rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i data-lucide="shield-check" style="width:20px;height:20px;color:#6366f1;"></i>
                    </div>
                    <div style="text-align:left;">
                        <div style="font-size:0.95rem;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:8px;">
                            Sesiones del Panel Admin
                            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;animation:admin-devices-pulse 2s infinite;" title="Actualizado en tiempo real"></span>
                        </div>
                        <div style="font-size:0.78rem;color:var(--text-muted);">${sessionCount === 1 ? '1 conexión detectada' : `${sessionCount} conexiones detectadas`}</div>
                    </div>
                </div>
                <div class="custom-scrollbar" style="background:rgba(0,0,0,0.12);border-radius:10px;padding:0 0.9rem;max-height:215px;overflow-y:auto;border:1px solid var(--border-color);">
                    ${sessionListHtml}
                </div>
                <p style="font-size:0.78rem;color:var(--text-muted);margin-top:1.25rem;text-align:center;line-height:1.5;margin-bottom:0;">
                    <i data-lucide="info" style="width:13px;height:13px;vertical-align:middle;opacity:0.6;"></i>
                    Muestra las conexiones SSE activas al panel administrativo. La lista se actualiza en tiempo real.
                </p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    const logoutArea = document.getElementById('admin-devices-global-logout-area');
    if (logoutArea) {
        logoutArea.style.display = sessionCount > 0 ? 'block' : 'none';
    }
};

window.triggerAdminGlobalLogout = async function() {
    const { value: password } = await Swal.fire({
        title: '🔒 Cierre global de sesiones',
        html: `
            <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.25rem;line-height:1.5;text-align:left;">
                Ingresa tu contraseña para confirmar el cierre de sesión en todos los dispositivos y navegadores activos (incluyendo esta pestaña).
            </p>
            <input type="password" id="swal-logout-pass" class="swal2-input" placeholder="Contraseña actual" autofocus style="background:var(--bg-surface-light); color:var(--text-main); border:1px solid var(--border-color); width: 100%; box-sizing: border-box; margin: 0;">
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Confirmar y Cerrar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        reverseButtons: true,
        preConfirm: () => {
            const pass = document.getElementById('swal-logout-pass').value;
            if (!pass) {
                Swal.showValidationMessage('Debes ingresar tu contraseña');
                return false;
            }
            return pass;
        },
        didOpen: (popup) => {
            const input = popup.querySelector('#swal-logout-pass');
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        Swal.clickConfirm();
                    }
                });
            }
        }
    });

    if (password) {
        window._isPerformingGlobalLogout = true;
        try {
            Swal.fire({
                title: 'Cerrando sesiones...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });

            const res = await adminFetch('/api/admin/logout-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                localStorage.removeItem('as_auth');
                localStorage.removeItem('as_user');
                localStorage.removeItem('as_admin_token');
                appState.user = null;
                initTheme();
                showView('login-view');
                document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
                lucide.createIcons();
                Swal.close();
                Swal.fire({
                    icon: 'success',
                    title: 'Sesiones Cerradas',
                    text: 'Todas las sesiones del panel administrativo han sido cerradas.',
                    background: 'var(--bg-surface)',
                    color: 'var(--text)',
                    confirmButtonColor: '#6366f1'
                });
            } else {
                const errData = await res.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errData.error || 'No se pudieron cerrar las sesiones.',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: '#6366f1'
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error de Red',
                text: 'Hubo un error de conexión con el servidor.',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                confirmButtonColor: '#6366f1'
            });
        }
    }
};

// Asegurar animación e inicialización
(function() {
    if (!document.getElementById('admin-devices-spin-style')) {
        const s = document.createElement('style');
        s.id = 'admin-devices-spin-style';
        s.textContent = `
            @keyframes admin-dev-spin { to { transform: rotate(360deg); } }
            @keyframes admin-devices-pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
        `;
        document.head.appendChild(s);
    }

    const btnLogoutAll = document.getElementById('btn-admin-devices-logout-all');
    if (btnLogoutAll) {
        btnLogoutAll.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.triggerAdminGlobalLogout === 'function') {
                window.triggerAdminGlobalLogout();
            }
        });
    }

    // Actualizar la lista en tiempo real cada 15 segundos si el usuario está en la pestaña de dispositivos
    setInterval(() => {
        if (localStorage.getItem('as_auth') !== 'true') return;
        const devicesTabBtn = document.querySelector('.config-nav-btn[data-config-tab="config-devices"]');
        const isDevicesTabActive = devicesTabBtn && devicesTabBtn.classList.contains('active');
        if (isDevicesTabActive && typeof window.refreshAdminDevicesInline === 'function') {
            window.refreshAdminDevicesInline();
        }
    }, 15000);

    // Sincronizar inicio/cierre de sesión entre pestañas en tiempo real (evita límites HTTP/1.1)
    window.addEventListener('storage', (e) => {
        if (e.key === 'as_auth') {
            if (e.newValue === 'true') {
                console.log('[Storage-Sync] Inicio de sesión detectado en otra pestaña.');
                const storedUser = localStorage.getItem('as_user');
                if (storedUser) {
                    appState.user = JSON.parse(storedUser);
                    initTheme();
                    applyRolePermissions();
                    showView('dashboard-view');
                    document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
                    loadData();
                    initRealTimeSync();
                }
            } else {
                console.log('[Storage-Sync] Cierre de sesión detectado en otra pestaña.');
                closeRealTimeSync();
                appState.user = null;
                appState.isInitialized = false;
                initTheme();
                showView('login-view');
                document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
                lucide.createIcons();
                Swal.close();
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión Cerrada',
                    text: 'Se ha cerrado la sesión en otro dispositivo o pestaña.',
                    background: 'var(--bg-surface)',
                    color: 'var(--text)',
                    confirmButtonColor: '#6366f1'
                });
            }
        }
    });
})();

// ====================== LOCK SCREEN AND INACTIVITY SYSTEM ======================
let lastActivityTime = Date.now();
let inactivityInterval = null;

function initInactivityTracker() {
    if (window._inactivityTrackerInitialized) return;
    window._inactivityTrackerInitialized = true;

    const updateActivity = () => {
        if (localStorage.getItem('as_locked') === 'true') return;
        lastActivityTime = Date.now();
    };

    let throttleTimer = null;
    const throttledUpdate = () => {
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
            throttleTimer = null;
            updateActivity();
        }, 1000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
        window.addEventListener(event, throttledUpdate, { passive: true });
    });

    if (inactivityInterval) clearInterval(inactivityInterval);
    inactivityInterval = setInterval(() => {
        if (localStorage.getItem('as_auth') !== 'true') return;
        if (localStorage.getItem('as_locked') === 'true') return;

        const timeoutMinutes = appState.config?.sessionTimeout !== undefined ? parseInt(appState.config.sessionTimeout) : 15;
        const timeoutMs = timeoutMinutes * 60 * 1000;

        if (Date.now() - lastActivityTime >= timeoutMs) {
            lockAdminSession();
        }
    }, 5000);
}

function resetInactivityTimer() {
    lastActivityTime = Date.now();
}

function lockAdminSession() {
    localStorage.setItem('as_locked', 'true');
    showLockScreen();
}

function showLockScreen() {
    const lockEl = document.getElementById('lock-screen');
    if (!lockEl) return;

    const userData = localStorage.getItem('as_user');
    const lockUsername = document.getElementById('lock-username');
    if (lockUsername && userData) {
        try {
            const parsed = JSON.parse(userData);
            lockUsername.textContent = parsed.name || parsed.user || 'Administrador';
        } catch(e) {
            lockUsername.textContent = 'Administrador';
        }
    }

    const lockPass = document.getElementById('lock-pass');
    if (lockPass) {
        lockPass.value = '';
        lockPass.type = 'password';
    }
    const lockError = document.getElementById('lock-error');
    if (lockError) lockError.style.display = 'none';

    const eyeIcon = document.querySelector('#lock-toggle-pass-btn i');
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye');

    lockEl.style.display = 'flex';
    lockEl.offsetHeight; // force reflow
    lockEl.classList.add('show');

    setTimeout(() => {
        if (lockPass) lockPass.focus();
    }, 200);

    setupLockScreenEventsOnce();
}

function hideLockScreen() {
    const lockEl = document.getElementById('lock-screen');
    if (!lockEl) return;

    lockEl.classList.remove('show');
    setTimeout(() => {
        lockEl.style.display = 'none';
    }, 400);
}

function setupLockScreenEventsOnce() {
    if (window._lockEventsInitialized) return;
    window._lockEventsInitialized = true;

    // Toggle password visibility
    document.getElementById('lock-toggle-pass-btn')?.addEventListener('click', () => {
        const passInput = document.getElementById('lock-pass');
        const icon = document.querySelector('#lock-toggle-pass-btn i');
        if (passInput) {
            if (passInput.type === 'password') {
                passInput.type = 'text';
                icon?.setAttribute('data-lucide', 'eye-off');
            } else {
                passInput.type = 'password';
                icon?.setAttribute('data-lucide', 'eye');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });

    // Submit lock form
    document.getElementById('lock-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passInput = document.getElementById('lock-pass');
        const pass = passInput ? passInput.value : '';
        const lockCard = document.getElementById('lock-card');
        const lockError = document.getElementById('lock-error');
        const btnSubmit = document.getElementById('btn-unlock-submit');

        if (!pass) return;

        if (btnSubmit) btnSubmit.disabled = true;
        if (lockError) lockError.style.display = 'none';

        const userData = localStorage.getItem('as_user');
        let username = 'admin';
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                username = parsed.user || 'admin';
            } catch(e) {}
        }

        try {
            const res = await fetch('/api/admin/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: username, pass })
            });
            const data = await res.json();

            if (res.ok && data.ok && data.token) {
                localStorage.setItem('as_admin_token', data.token);
                localStorage.setItem('as_auth', 'true');
                localStorage.removeItem('as_locked');

                resetInactivityTimer();
                hideLockScreen();
                showToast('Sesión desbloqueada con éxito', 'success');
            } else {
                if (lockError) lockError.style.display = 'block';
                if (lockCard) {
                    lockCard.classList.add('shake-animation');
                    setTimeout(() => lockCard.classList.remove('shake-animation'), 400);
                }
                if (passInput) {
                    passInput.value = '';
                    passInput.focus();
                }
            }
        } catch (err) {
            showToast('Error de red al intentar desbloquear', 'error');
        } finally {
            if (btnSubmit) btnSubmit.disabled = false;
        }
    });

    // Logout from lock screen
    document.getElementById('lock-logout-btn')?.addEventListener('click', () => {
        hideLockScreen();
        closeRealTimeSync();
        localStorage.removeItem('as_auth');
        localStorage.removeItem('as_user');
        localStorage.removeItem('as_admin_token');
        localStorage.removeItem('as_locked');
        appState.user = null;
        appState.isInitialized = false;
        initTheme();
        showView('login-view');
        document.querySelector('.nav-btn[data-tab="tab-dashboard"]')?.click();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        showToast('Sesión cerrada correctamente', 'info');
    });
}

