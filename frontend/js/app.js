// ==========================================================================
// AS Sierra Systems - Main Application JS (Backend Connected)
// ==========================================================================

// State Management
const appState = {
    theme: localStorage.getItem('as_theme') || 'light',
    sidebarCollapsed: localStorage.getItem('as_sidebar') === 'true',
    user: JSON.parse(localStorage.getItem('as_user') || 'null'),
    businesses: [],
    modules: [],
    users: [],
    config: {},
    notifications: []
};

// Helpers de autenticación admin
function getAdminToken() {
    return localStorage.getItem('as_admin_token') || '';
}
function getAdminHeaders(extra = {}) {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAdminToken()}`, ...extra };
}

/**
 * adminFetch: igual que fetch() pero maneja 401 automáticamente.
 * Si el token expirado (servidor reiniciado), pide la contraseña
 * al admin, renueva el token en silencio y reintenta la petición.
 */
async function adminFetch(url, options = {}) {
    options.headers = { ...getAdminHeaders(), ...(options.headers || {}) };
    let resp = await fetch(url, options);

    if (resp.status === 401) {
        // Token vencido o servidor reiniciado — pedir credenciales
        const stored = appState.user;
        const result = await Swal.fire({
            title: 'Sesión expirada',
            html: `
                <p style="color:#94a3b8;margin-bottom:1rem;">El servidor fue reiniciado. Ingresa tu contraseña para continuar.</p>
                <input type="password" id="swal-reauth-pass" class="swal2-input" placeholder="Tu contraseña" autofocus>
            `,
            confirmButtonText: 'Renovar sesión',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            background: '#1e293b',
            color: '#f8fafc',
            confirmButtonColor: '#6366f1',
            preConfirm: () => {
                const pass = document.getElementById('swal-reauth-pass').value;
                if (!pass) { Swal.showValidationMessage('La contraseña es requerida'); return false; }
                return pass;
            }
        });

        if (!result.isConfirmed) return resp; // Usuario canceló

        try {
            const refreshResp = await fetch('/api/admin/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: stored?.user, pass: result.value })
            });
            const refreshData = await refreshResp.json();
            if (refreshData.ok && refreshData.token) {
                localStorage.setItem('as_admin_token', refreshData.token);
                showToast('✅ Sesión renovada. Reintentando...', 'success');
                // Reintentar la petición original con el token nuevo
                options.headers['Authorization'] = `Bearer ${refreshData.token}`;
                return await fetch(url, options);
            } else {
                showToast('❌ Credenciales incorrectas. Vuelve a intentarlo.', 'error');
            }
        } catch {
            showToast('❌ Error de red al renovar sesión.', 'error');
        }
    }
    return resp;
}

// Permission definitions per role
const ROLE_PERMISSIONS = {
    'Super Admin': {
        tabs: ['tab-dashboard', 'tab-businesses', 'tab-modules', 'tab-users', 'tab-billing', 'tab-settings'],
        canCreate: true,
        canEdit: true,
        canDelete: true
    },
    'Administrador': {
        tabs: ['tab-dashboard', 'tab-businesses', 'tab-modules'],
        canCreate: true,
        canEdit: true,
        canDelete: false
    },
    'Soporte': {
        tabs: ['tab-dashboard', 'tab-businesses'],
        canCreate: false,
        canEdit: false,
        canDelete: false
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

    // Show/hide nav buttons
    document.querySelectorAll('.nav-btn[data-roles]').forEach(btn => {
        const allowed = btn.getAttribute('data-roles').split(',').map(r => r.trim());
        if (allowed.includes(role)) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });

    // Hide/show the Gestión section label if no items visible
    const gestionLabel = document.getElementById('nav-label-gestion');
    const gestionVisible = ['tab-users', 'tab-billing'].some(tab => {
        const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
        return btn && btn.style.display !== 'none';
    });
    if (gestionLabel) gestionLabel.style.display = gestionVisible ? '' : 'none';

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
        document.querySelectorAll('.delete-biz-btn, .delete-user-btn').forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    // Update sidebar user info
    const nameEl = document.getElementById('sidebar-username');
    const roleEl = document.querySelector('.user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    const topbarAvatar = document.getElementById('topbar-avatar');
    const initials = (appState.user?.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    if (nameEl) nameEl.textContent = appState.user?.name || 'Usuario';

    if (roleEl) {
        if (role === 'Super Admin') {
            if (nameEl) nameEl.style.display = 'none'; // Solo escondemos el de Super Admin para que no se repita
            roleEl.innerHTML = '<span style="color: #ffd700; font-weight: bold; font-size: 0.85rem; white-space: nowrap;">💎 Super Admin 💎</span>';
        } else {
            if (nameEl) nameEl.style.display = 'block'; // Para los demás roles, mostramos el nombre normal
            roleEl.textContent = role;
        }
    }
    if (avatarEl) avatarEl.textContent = initials;
    if (topbarAvatar) topbarAvatar.textContent = initials;

    // Show read-only banner for Soporte
    if (role === 'Soporte') {
        const existing = document.getElementById('readonly-banner');
        if (!existing) {
            const banner = document.createElement('div');
            banner.id = 'readonly-banner';
            banner.innerHTML = '<i data-lucide="eye" style="width:14px;height:14px;"></i> Modo solo lectura — Rol: Soporte';
            banner.style.cssText = 'position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:var(--warning);padding:0.5rem 1.25rem;border-radius:20px;font-size:0.78rem;font-weight:600;display:flex;align-items:center;gap:0.5rem;z-index:9000;backdrop-filter:blur(8px);';
            document.body.appendChild(banner);
            lucide.createIcons();
        }
    }
}


// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Check Auth
    if (localStorage.getItem('as_auth') === 'true' && appState.user) {
        showView('dashboard-view');
        loadData();

        // ==========================================
        // SSE REAL-TIME SYNC
        // ==========================================
        const evtSource = new EventSource('/api/stream');
        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update') {
                    console.log('Update received via SSE, reloading data...');
                    loadData();
                }
            } catch (err) {
                console.error('SSE Error:', err);
            }
        };
    } else {
        localStorage.removeItem('as_auth');
        localStorage.removeItem('as_user');
        localStorage.removeItem('as_admin_token');
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
        const res = await fetch('/api/data');
        const data = await res.json();
        appState.businesses = data.businesses || [];
        appState.modules = data.modules || [];
        appState.users = data.users || [];
        appState.config = data.config || {};
        
        appState.config = data.config || {};

        if (appState.config.adminUser) {
            const input = document.getElementById('settings-admin-user');
            if (input) input.value = appState.config.adminUser;
        }
        
        initDashboard();
        initCharts();
        applyRolePermissions();

        // Cargar notificaciones reales y arrancar polling cada 30s
        fetchNotifications();
        if (!window._notifPolling) {
            window._notifPolling = setInterval(fetchNotifications, 30000);
        }
        
        // Re-render active tabs if needed
        if (!document.getElementById('tab-businesses').classList.contains('hidden')) renderBusinessesGrid();
        if (!document.getElementById('tab-modules').classList.contains('hidden')) renderModulesGrid();
        if (!document.getElementById('tab-users').classList.contains('hidden')) renderUsersList();
        if (!document.getElementById('tab-billing').classList.contains('hidden')) renderBillingData();
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

function initTheme() {
    document.documentElement.setAttribute('data-theme', appState.theme);
    updateThemeIcon();
}

function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('as_theme', appState.theme);
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
                    showView('dashboard-view');
                    loadData();
                } else {
                    document.getElementById('login-error').classList.remove('hidden');
                }
            } catch (err) {
                showToast('Error de conexión con el servidor', 'error');
            }
        });
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
                localStorage.removeItem('as_auth');
                localStorage.removeItem('as_user');
                appState.user = null;
                showView('login-view');
                lucide.createIcons();
                showToast('Sesión cerrada correctamente', 'info');
            }
        });
    };
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);

    // Theme Toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

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
            await fetch('/api/notifications', { method: 'DELETE' });
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
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    if (appState.sidebarCollapsed) sidebar.classList.add('collapsed');
    
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('as_sidebar', sidebar.classList.contains('collapsed'));
        
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
            
            if (target === 'tab-businesses') renderBusinessesGrid();
            if (target === 'tab-modules') renderModulesGrid();
            if (target === 'tab-users') renderUsersList();
            if (target === 'tab-billing') renderBillingData();
        });
    });

    // Modal Events
    document.getElementById('business-modal-close')?.addEventListener('click', closeBusinessModal);
    document.getElementById('business-modal-cancel')?.addEventListener('click', closeBusinessModal);
    
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
                const res = await fetch('/api/businesses/toggle', {
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
                        const res = await fetch(`/api/businesses/${id}/credentials`, {
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
            const dropdown = credBtn.closest('.dropdown');
            if (dropdown) dropdown.classList.remove('active');
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

    // Settings Form Submit
    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
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
            reader.onload = (event) => {
                const base64 = event.target.result;
                logoPreview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:contain;">`;
                appState.customLogo = base64;
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
        });
    });

    btnSaveSettings?.addEventListener('click', async (e) => {
        e.preventDefault();
        const adminUser = document.getElementById('settings-admin-user').value;
        const adminPass = document.getElementById('settings-admin-pass').value;
        const currentPass = document.getElementById('settings-current-pass').value;
        
        if ((adminUser || adminPass) && !currentPass) {
            return showToast('Debes ingresar tu contraseña actual para cambiar credenciales', 'error');
        }

        try {
            const res = await fetch('/api/settings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    logo: appState.customLogo || null,
                    adminUser: adminUser || null,
                    adminPass: adminPass || null,
                    currentPass: currentPass || null
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast('Configuración guardada exitosamente');
                if (appState.customLogo) updateAllLogos(appState.customLogo);
                
                // Si cambió usuario o clave, cerrar sesión
                if (adminUser || adminPass) {
                    showToast('Credenciales cambiadas. Cerrando sesión...', 'info');
                    setTimeout(() => {
                        localStorage.removeItem('as_auth');
                        location.reload();
                    }, 2000);
                } else {
                    document.getElementById('settings-current-pass').value = '';
                    document.getElementById('settings-admin-pass').value = '';
                }
            } else {
                showToast(data.error || 'Error al guardar', 'error');
            }
        } catch (err) { showToast('Error de conexión', 'error'); }
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
            const city = document.getElementById('biz-city').value || 'Sin ciudad';
            const isActive = document.getElementById('biz-active').checked;
            
            const selectedTypeEl = document.querySelector('.biz-type-option.selected');
            const type = selectedTypeEl ? selectedTypeEl.getAttribute('data-type') : 'retail';
            
            const selectedModules = [];
            document.querySelectorAll('#module-checkboxes input:checked').forEach(cb => selectedModules.push(cb.value));

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

            const bizData = {
                id: id ? Number(id) : Date.now(),
                name, type, city,
                status: isActive ? 'active' : 'inactive',
                modules: selectedModules,
                moduleDates: moduleDates
            };

            const method = id ? 'PUT' : 'POST';
            const endpoint = id ? `/api/businesses/${id}` : '/api/businesses/new';

            try {
                const res = await fetch(endpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bizData)
                });

                if (res.ok) {
                    closeBusinessModal();
                    showToast(`Negocio ${id ? 'actualizado' : 'creado'} exitosamente`);
                    bizForm.reset();
                    loadData(); // reload
                } else {
                    showToast('Error al guardar negocio', 'error');
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
}

async function deleteBusiness(id) {
    try {
        const res = await fetch(`/api/businesses/${id}`, { method: 'DELETE' });
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
    const activeBizCount = appState.businesses.filter(b => b.status === 'active').length;
    const kpiBiz = document.getElementById('kpi-businesses');
    if (kpiBiz) kpiBiz.textContent = activeBizCount;

    // KPI: Módulos activos
    const activeMods = appState.modules.filter(m => m.status === 'active').length;
    const kpiMods = document.getElementById('kpi-modules');
    if (kpiMods) kpiMods.textContent = activeMods;

    // KPI: Usuarios totales
    const totalUsers = appState.users.length;
    const kpiUsers = document.getElementById('kpi-users');
    if (kpiUsers) kpiUsers.textContent = totalUsers;

    // KPI: Ingresos del mes (suma real basada en módulos con precio)
    let totalIncome = 0;
    appState.businesses.forEach(biz => {
        if (biz.status !== 'active') return;
        (biz.modules || []).forEach(mid => {
            const mod = appState.modules.find(m => m.id === mid);
            if (mod && mod.price) {
                const price = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                if (!isNaN(price)) totalIncome += price;
            }
        });
    });
    const kpiIncome = document.getElementById('kpi-revenue');
    if (kpiIncome) kpiIncome.innerHTML = `<span style="white-space: nowrap;">$ ${totalIncome.toLocaleString('es-CO')} <span style="font-size: 0.65em; opacity: 0.8;">COP</span></span>`;
    
    renderDashboardBusinesses();
    renderQuickModules();
}

// ===================== USER MANAGEMENT =====================

function renderUsersList(searchQuery = '') {
    const list = document.getElementById('users-list');
    let filtered = appState.users;

    if (searchQuery) {
        filtered = filtered.filter(u => 
            u.name.toLowerCase().includes(searchQuery) || 
            u.email.toLowerCase().includes(searchQuery) ||
            u.user.toLowerCase().includes(searchQuery)
        );
    }

    list.innerHTML = filtered.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="user-avatar">${user.name.charAt(0)}</div>
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
}

function openUserModal(id = null) {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    form.reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-modal-title').textContent = id ? 'Editar Usuario' : 'Nuevo Usuario';
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
            const res = await fetch(url, {
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
        const logo = document.getElementById('settings-logo-url').value;
        const adminUser = document.getElementById('settings-admin-user').value;
        const adminPass = document.getElementById('settings-admin-pass').value;
        const currentPass = document.getElementById('security-pass-input').value; // Usamos la que puso en el modal

        const settingsData = { logo, adminUser, adminPass, currentPass };

        try {
            const res = await fetch('/api/settings/save', {
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
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
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
                <div class="biz-type">${biz.type}</div>
            </div>
            <div class="biz-info-city">
                <i data-lucide="map-pin"></i> ${biz.city}
            </div>
            <div class="biz-info-modules">
                ${(biz.modules || []).map(mod => {
                    const m = appState.modules.find(x => String(x.id) === String(mod));
                    return m ? `<span class="module-chip"><i data-lucide="${m.icon}"></i> ${m.name}</span>` : '';
                }).join('')}
                ${(biz.cancelledModules || []).map(cm => {
                    const m = appState.modules.find(x => String(x.id) === String(cm.id));
                    if (!m) return '';
                    const accessUntilMs = new Date(cm.accessUntil).getTime();
                    const daysLeft = Math.max(0, Math.ceil((accessUntilMs - Date.now()) / (1000 * 60 * 60 * 24)));
                    return `<span class="module-chip" style="background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.25);" title="Suspendido · ${daysLeft} días de acceso restantes"><i data-lucide="${m.icon}"></i> ${m.name} <span style="font-size:0.65rem; opacity:0.8;">(${daysLeft}d)</span></span>`;
                }).join('')}
            </div>
            <div class="biz-info-status">
                <div class="status-badge ${biz.status}">${biz.status === 'active' ? 'Activo' : 'Inactivo'}</div>
            </div>
            <div class="biz-actions">
                <div class="dropdown">
                    <button class="btn-icon dropdown-toggle" title="Opciones">
                        <i data-lucide="more-vertical"></i>
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item cred-biz-btn" data-id="${biz.id}">
                            <i data-lucide="key"></i> Accesos
                        </button>
                        <button class="dropdown-item edit-biz-btn" data-id="${biz.id}">
                            <i data-lucide="edit"></i> Editar
                        </button>
                        <button class="dropdown-item toggle-biz-btn" data-id="${biz.id}" data-status="${biz.status === 'active' ? 'inactive' : 'active'}">
                            ${biz.status === 'active' ? '<i data-lucide="power-off"></i> Desactivar' : '<i data-lucide="power" style="color:var(--success)"></i> Activar'}
                        </button>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item text-danger delete-biz-btn" data-id="${biz.id}">
                            <i data-lucide="trash-2"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderQuickModules() {
    const grid = document.getElementById('modules-quick-grid');
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
    grid.innerHTML = appState.modules.map(mod => {
        const priceNum = parseInt(String(mod.price).replace(/\D/g, ''));
        const priceDisplay = (mod.price && !isNaN(priceNum) && priceNum > 0) ? `<span style="white-space: nowrap;">$ ${priceNum.toLocaleString('es-CO')} <span style="font-size: 0.8em;">COP</span></span>` : 'Cotizar';
        
        return `
        <div class="biz-card">
            <div class="module-card-header">
                <div class="module-icon-large"><i data-lucide="${mod.icon}"></i></div>
                <div class="status-badge ${mod.status === 'active' ? 'active' : (mod.status === 'maintenance' ? 'inactive' : 'neutral')}">
                    ${mod.status === 'active' ? 'Activo' : (mod.status === 'maintenance' ? 'Mantenimiento' : 'Próximamente')}
                </div>
            </div>
            <h3 class="module-title">${mod.name}</h3>
            <p class="module-desc">${mod.desc}</p>
            <div class="module-price" style="font-weight: 800; color: var(--primary); margin-top: 0.75rem; font-size: 1.1rem;">
                ${priceDisplay}
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem;">
                <button class="btn-primary edit-mod-btn" data-id="${mod.id}" style="flex:2; justify-content: center; background: #8b5cf6; border:none;">
                    <i data-lucide="settings"></i> Configurar
                </button>
                <button class="btn-ghost toggle-mod-btn" data-id="${mod.id}" data-status="${mod.status === 'active' ? 'maintenance' : 'active'}" 
                        style="flex:1; justify-content: center; padding: 0.5rem;" title="${mod.status === 'active' ? 'Desactivar' : 'Activar'}">
                    <i data-lucide="${mod.status === 'active' ? 'eye-off' : 'eye'}"></i>
                </button>
            </div>
        </div>
    `}).join('');
    lucide.createIcons();
}

function openModuleModal(id) {
    const mod = appState.modules.find(m => m.id == id);
    if (!mod) return;

    document.getElementById('mod-id-input').value = mod.id;
    document.getElementById('mod-name-input').value = mod.name;
    document.getElementById('mod-desc-input').value = mod.desc;
    document.getElementById('mod-icon-input').value = mod.icon;
    document.getElementById('mod-status-input').value = mod.status;
    document.getElementById('mod-video-input').value = mod.videoUrl || '';
    
    const priceNum = parseInt(String(mod.price).replace(/\D/g, ''), 10);
    document.getElementById('mod-price-input').value = isNaN(priceNum) ? '' : priceNum.toLocaleString('es-CO');

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

        const updatedMod = {
            id: id,
            name,
            desc,
            price: !rawPrice || rawPrice === '0' ? 'Cotizar' : `$ ${parseInt(rawPrice).toLocaleString('es-CO')}`,
            icon,
            status,
            videoUrl
        };

        try {
            const res = await fetch(`/api/modules/${id}`, {
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

async function updateModuleState(id, updates) {
    const mod = appState.modules.find(m => m.id == id);
    if (!mod) return;

    const updated = { ...mod, ...updates };
    
    try {
        const res = await fetch(`/api/modules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        
        if (res.ok) {
            // Actualizar localmente
            appState.modules = appState.modules.map(m => m.id == id ? updated : m);
            renderModulesGrid();
            initDashboard();
            showToast(`Estado de ${mod.name} actualizado`);
        } else {
            showToast('Error al actualizar el estado del módulo', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
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
        { id: 'services', icon: 'briefcase', label: 'Servicios' }
    ];
    
    const targetType = biz ? biz.type : 'restaurant';
    
    typeGrid.innerHTML = types.map((t) => `
        <div class="biz-type-option ${t.id === targetType ? 'selected' : ''}" data-type="${t.id}" onclick="document.querySelectorAll('.biz-type-option').forEach(el=>el.classList.remove('selected')); this.classList.add('selected');">
            <span><i data-lucide="${t.icon}"></i></span>
            <div>${t.label}</div>
        </div>
    `).join('');

    const modsContainer = document.getElementById('module-checkboxes');
    const bizMods = biz ? (biz.modules || []) : [];
    
    modsContainer.innerHTML = appState.modules.filter(m => m.status === 'active').map(m => `
        <label class="custom-checkbox-label">
            <input type="checkbox" value="${m.id}" ${bizMods.includes(m.id) ? 'checked' : ''}> ${m.name}
        </label>
    `).join('');

    if (biz) {
        document.getElementById('biz-id').value = biz.id;
        document.getElementById('biz-name').value = biz.name || '';
        document.getElementById('biz-city').value = biz.city || '';
        document.getElementById('biz-active').checked = biz.status === 'active';
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
        console.log("No se pudo cargar config", e);
    }
    showDefaultLogos();
}

function updateAllLogos(logoSrc) {
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

function initCharts() {
    // Destruir instancias previas si existen para evitar solapamientos
    if (growthChart) growthChart.destroy();
    if (modulesChart) modulesChart.destroy();

    const ctxGrowth = document.getElementById('growthChart')?.getContext('2d');
    const ctxModules = document.getElementById('modulesChart')?.getContext('2d');

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
}

// ==========================================================================
// MÓDULO DE FACTURACIÓN — Gestión de Suscripciones y Pagos
// ==========================================================================

/**
 * Renderiza la tabla de facturación con el estado de cada negocio.
 * Se llama cada vez que se abre el tab de Facturación.
 */
function renderBillingTab() {
    let businesses = appState.businesses || [];
    const modules = appState.modules || [];
    const list = document.getElementById('billing-list');
    if (!list) return;

    const searchInput = document.getElementById('billing-search');
    if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase();
        businesses = businesses.filter(b => 
            (b.name && b.name.toLowerCase().includes(term)) || 
            (b.clientEmail && b.clientEmail.toLowerCase().includes(term))
        );
    }

    // Calcular KPIs
    let totalRevenue = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let upcomingCount = 0;
    const today = new Date().toISOString().slice(0, 10);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    list.innerHTML = businesses.map(biz => {
        const billing = biz.billing || {};
        const status = billing.subscription_status || 'pending';

        // Calcular monto mensual
        let monthlyAmount = 0;
        (biz.modules || []).forEach(modId => {
            const mod = modules.find(m => m.id === modId);
            if (mod?.price) {
                const p = parseInt(String(mod.price).replace(/\D/g, ''), 10);
                if (!isNaN(p)) monthlyAmount += p;
            }
        });

        // Acumular KPIs
        if (status === 'active') { activeCount++; totalRevenue += billing.last_payment_amount || 0; }
        if (status === 'suspended') suspendedCount++;
        if (billing.next_billing_date && billing.next_billing_date <= in7Days && billing.next_billing_date >= today) upcomingCount++;

        // Badge de estado
        const statusBadge = {
            active: '<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:700;">✅ Activo</span>',
            suspended: '<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:700;">⛔ Suspendido</span>',
            pending: '<span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:700;">⏳ Pendiente</span>',
            cancelled: '<span style="background:rgba(100,116,139,0.15);color:#64748b;padding:0.2rem 0.7rem;border-radius:20px;font-size:0.75rem;font-weight:700;">🚫 Cancelado</span>',
        }[status] || statusBadge?.pending || '—';

        // Info de tarjeta
        const cardInfo = billing.gateway_token
            ? `<span title="Token: ${billing.gateway_token}" style="font-size:0.8rem;">💳 ${billing.card_brand || ''} ···${billing.last_four || '****'}</span>`
            : `<span style="color:#94a3b8;font-size:0.8rem;">Sin tarjeta</span>`;

        // Próximo corte
        const nextCut = billing.next_billing_date
            ? new Date(billing.next_billing_date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        const amountDisplay = monthlyAmount > 0
            ? `$${monthlyAmount.toLocaleString('es-CO')}`
            : '<span style="color:#64748b;">$0</span>';

        // Botones de acción
        const hasCard = !!billing.gateway_token;
        const chargeBtn = hasCard
            ? `<button class="btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.7rem;" onclick="billingChargeNow(${biz.id})" title="Cobrar suscripción ahora"><i data-lucide="credit-card" style="width:13px;height:13px;"></i> Cobrar</button>`
            : '';
        const removeCardBtn = hasCard
            ? `<button class="btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.7rem;color:#ef4444;" onclick="billingRemoveCard(${biz.id})" title="Eliminar tarjeta"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>`
            : '';
        const assignCardBtn = !hasCard
            ? `<button class="btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.7rem;color:#6366f1;" onclick="billingAssignSimCard(${biz.id})" title="Asignar tarjeta simulada"><i data-lucide="plus" style="width:13px;height:13px;"></i> Asignar tarjeta</button>`
            : '';

        return `<tr>
            <td>
                <div style="font-weight:700; color:#f8fafc; font-size:0.95rem; display:flex; align-items:center; gap:0.4rem;">
                    ${biz.name}
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem; margin-top:0.3rem;">
                    <span style="font-size:0.7rem; color:var(--primary); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">${biz.category || 'NEGOCIO'}</span>
                    <span style="font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; gap:0.2rem;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${biz.city || 'Sin ciudad'}</span>
                </div>
            </td>
            <td style="text-align:center;">${cardInfo}</td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="text-align:center;font-size:0.85rem;">${nextCut}</td>
            <td style="text-align:center;font-weight:600;">${amountDisplay}</td>
            <td style="text-align:center;">
                <div style="display:flex;gap:0.4rem;justify-content:center;flex-wrap:wrap;">
                    ${chargeBtn}${removeCardBtn}${assignCardBtn}
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
        cancelButtonColor: '#334155',
        confirmButtonText: 'Sí, cobrar ahora',
        cancelButtonText: 'Cancelar',
        background: '#1e293b',
        color: '#f8fafc'
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
        cancelButtonColor: '#334155',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: '#1e293b',
        color: '#f8fafc'
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
            cancelButtonColor: '#334155',
            confirmButtonText: 'Sí, iniciar cobros',
            cancelButtonText: 'Cancelar',
            background: '#1e293b',
            color: '#f8fafc'
        });
        if (!result.isConfirmed) return;
    }

    try {
        const resp = await adminFetch('/api/payment/trigger-billing', {
            method: 'POST',
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
